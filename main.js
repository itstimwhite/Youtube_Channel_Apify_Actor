import { Actor, log } from 'apify';
import { PuppeteerCrawler, RequestList, RequestQueue, ProxyConfiguration } from 'crawlee';
import ytsr from 'ytsr';
import handlePageFunction from './src/handlePageFunction.js';
import { parseCSV } from './src/csvHandler.js';
import { withRetryHandler } from './src/retryHandler.js';
import { AdaptiveRateLimiter, createRateLimitHook, createRateLimitRecorder } from './src/rateLimiter.js';
import { validateInput, logValidationResults } from './src/inputValidator.js';

/**
 * Searches YouTube for channels based on keywords
 * @param {string[]} keywords - Array of search keywords
 * @param {number} limit - Maximum results per keyword
 * @param {Array} existingUrls - Already collected URLs
 * @returns {Promise<Array>} Array of channel URLs
 */
async function searchChannels(keywords, limit, existingUrls) {
    const channels = [];
    
    for (const keyword of keywords) {
        try {
            log.info(`Searching for channels with keyword: ${keyword}`);
            const results = await ytsr(keyword, { limit });
            
            const newChannels = results?.items
                ?.filter(item => item?.author?.url)
                ?.map(item => ({ url: item.author.url }))
                ?.filter(channel => !existingUrls.some(existing => existing.url === channel.url))
                || [];
            
            channels.push(...newChannels);
            log.info(`Found ${newChannels.length} new channels for keyword: ${keyword}`);
        } catch (error) {
            log.error(`Failed to search for keyword "${keyword}": ${error.message}`);
        }
    }
    
    return channels;
}

/**
 * Prepares channel URLs for crawling by adding /about suffix
 * @param {RequestList} requestList - Apify RequestList instance
 * @param {RequestQueue} requestQueue - Apify RequestQueue instance
 */
async function prepareChannelUrls(requestList, requestQueue) {
    let request;
    let count = 0;
    
    while ((request = await requestList.fetchNextRequest())) {
        const cleanUrl = request.url.replace(/\/+$/, '');
        // Try main channel page instead of /about for better data availability
        await requestQueue.addRequest({ 
            url: cleanUrl,
            userData: { channelUrl: cleanUrl }
        });
        count++;
    }
    
    log.info(`Prepared ${count} channel URLs for crawling`);
}

/**
 * Creates proxy configuration
 * @param {Object} proxyConfig - Proxy configuration from input
 * @returns {Promise<ProxyConfiguration>} Configured proxy instance
 */
async function createProxyConfiguration(proxyConfig) {
    if (!proxyConfig || (!proxyConfig.useApifyProxy && !proxyConfig.proxyUrls?.length)) {
        return null;
    }
    
    // Map old config format to new format
    const config = {};
    
    if (proxyConfig.useApifyProxy) {
        // Using Apify proxy
        config.groups = proxyConfig.apifyProxyGroups || ['RESIDENTIAL'];
        config.countryCode = proxyConfig.apifyProxyCountry;
    } else if (proxyConfig.proxyUrls?.length > 0) {
        // Using custom proxy URLs
        config.proxyUrls = proxyConfig.proxyUrls;
    }
    
    return new ProxyConfiguration(config);
}

/**
 * Creates pre-navigation hook for blocking unnecessary resources
 * @returns {Function} Pre-navigation hook function
 */
function createResourceBlocker() {
    return async ({ page }, gotoOptions) => {
        const blockedPatterns = [
            // Media files
            '.mp4', '.webp', '.jpeg', '.jpg', '.gif', '.svg', '.ico', '.png',
            // Analytics and tracking
            'google-analytics', 'doubleclick.net', 'googletagmanager',
            // YouTube specific
            '/videoplayback', '/adview', '/stats/ads', 
            '/stats/watchtime', '/stats/qoe', '/log_event',
        ];
        
        await page.setRequestInterception(true);
        
        page.on('request', (request) => {
            const url = request.url();
            const shouldBlock = blockedPatterns.some(pattern => url.includes(pattern));
            
            if (shouldBlock) {
                request.abort();
            } else {
                request.continue();
            }
        });
        
        gotoOptions.waitUntil = 'networkidle2';
    };
}

/**
 * Main actor function
 */
Actor.main(async () => {
    log.info('Starting YouTube Channel Scraper...');
    log.info('Debug mode: Checking subscriber count extraction');
    
    // Get and validate input
    let rawInput = await Actor.getInput();
    log.debug('Raw input received:', rawInput);
    
    if (!rawInput) {
        log.warning('No input provided. Using default configuration.');
        // Use empty defaults if no input provided
        rawInput = {
            keywords: [],
            startUrls: [],
            limit: 5,
            maxRequestsPerCrawl: 100,
            minConcurrency: 1,
            maxConcurrency: 1
        };
    }
    
    // Validate and sanitize input
    const validation = validateInput(rawInput);
    logValidationResults(validation);
    
    if (!validation.valid) {
        throw new Error(`Invalid input configuration: ${validation.errors.join(', ')}`);
    }
    
    const input = validation.sanitizedInput;
    
    // Destructure input with defaults
    const {
        keywords = [],
        limit = 5,
        startUrls = [],
        requestHandlerTimeoutSecs = 30,
        maxRequestRetries = 3,
        minConcurrency = 1,
        maxConcurrency = 1,
        maxRequestsPerCrawl = 100,
        proxyConfiguration,
        csvContent,
        maxChannelsPerRun = 1000,
        savePartialResults = true,
        resumeFromChannel
    } = input;
    
    // Configure logging level
    if (process.env.VERBOSE_LOG?.toLowerCase() === 'true') {
        log.setLevel(log.LEVELS.DEBUG);
    }
    
    // Log configuration
    log.info('Configuration:', {
        keywordsCount: keywords.length,
        startUrlsCount: startUrls.length,
        limit,
        maxRequestsPerCrawl,
        concurrency: { min: minConcurrency, max: maxConcurrency }
    });
    
    try {
        // Search for channels if keywords provided
        let allChannelUrls = [...startUrls];
        
        // Process CSV content if provided
        if (csvContent) {
            log.info('Processing CSV content...');
            try {
                const csvUrls = parseCSV(csvContent);
                allChannelUrls.push(...csvUrls);
                log.info(`Added ${csvUrls.length} channels from CSV`);
            } catch (error) {
                log.error('Failed to process CSV content:', error.message);
            }
        }
        
        // Search for channels if keywords provided
        if (keywords.length > 0) {
            const searchResults = await searchChannels(keywords, limit, allChannelUrls);
            allChannelUrls.push(...searchResults);
        }
        
        if (allChannelUrls.length === 0) {
            log.warning('No channel URLs to process. Please provide keywords, start URLs, or import a file.');
            return;
        }
        
        // Apply max channels limit
        if (allChannelUrls.length > maxChannelsPerRun) {
            log.warning(`Found ${allChannelUrls.length} channels, limiting to ${maxChannelsPerRun}`);
            allChannelUrls = allChannelUrls.slice(0, maxChannelsPerRun);
        }
        
        // Handle resume functionality
        if (resumeFromChannel) {
            const resumeIndex = allChannelUrls.findIndex(item => 
                (typeof item === 'string' ? item : item.url).includes(resumeFromChannel)
            );
            if (resumeIndex > 0) {
                log.info(`Resuming from channel: ${resumeFromChannel} (skipping ${resumeIndex} channels)`);
                allChannelUrls = allChannelUrls.slice(resumeIndex);
            }
        }
        
        // Initialize request management
        const requestList = await RequestList.open('channel-list', allChannelUrls);
        const requestQueue = await RequestQueue.open();
        
        // Prepare URLs for crawling
        await prepareChannelUrls(requestList, requestQueue);
        
        // Configure proxy
        const proxyConfig = await createProxyConfiguration(proxyConfiguration);
        if (proxyConfig) {
            log.info('Proxy configuration enabled');
        }
        
        // Set up progress tracking
        let processedCount = 0;
        const queueInfo = await requestQueue.getInfo();
        const totalCount = queueInfo?.totalRequestCount || allChannelUrls.length;
        
        // Initialize rate limiter
        const rateLimiter = new AdaptiveRateLimiter({
            minDelay: 1000,  // Minimum 1 second between requests
            maxDelay: 15000, // Maximum 15 seconds between requests
            targetSuccessRate: 0.95,
            windowSize: 100
        });
        
        const recordRateLimit = createRateLimitRecorder(rateLimiter);
        
        // Create and configure crawler
        const crawler = new PuppeteerCrawler({
            requestQueue,
            requestHandler: withRetryHandler(async (context) => {
                const startTime = Date.now();
                let success = false;
                
                try {
                    // Call the original handler
                    await handlePageFunction(context);
                    success = true;
                    
                    // Update progress
                    processedCount++;
                    const progress = Math.round((processedCount / totalCount) * 100);
                    log.info(`Progress: ${processedCount}/${totalCount} channels (${progress}%)`);
                    
                    // Save progress state for resume capability - more frequent saves
                    if (savePartialResults && processedCount % 5 === 0) {
                        await Actor.setValue('PROGRESS_STATE', {
                            processedCount,
                            totalCount,
                            lastProcessedUrl: context.request.url,
                            timestamp: new Date().toISOString(),
                            rateLimiterMetrics: rateLimiter.getMetrics()
                        });
                    }
                } finally {
                    // Record request for rate limiting
                    const responseTime = Date.now() - startTime;
                    const statusCode = context.response?.status() || 0;
                    const rateLimited = statusCode === 429;
                    recordRateLimit(success, responseTime, rateLimited);
                }
            }),
            
            // Timeouts and retries
            requestHandlerTimeoutSecs,
            maxRequestRetries,
            
            // Concurrency settings
            minConcurrency,
            maxConcurrency,
            maxRequestsPerCrawl,
            
            // Browser settings - optimized for stability
            browserPoolOptions: { 
                maxOpenPagesPerBrowser: 1,
                retireBrowserAfterPageCount: 5,  // More frequent browser recycling to prevent memory leaks
                operationTimeoutSecs: 60,
                closeInactiveBrowserAfterSecs: 120
            },
            
            // Session pool for handling failures
            useSessionPool: true,
            sessionPoolOptions: {
                maxPoolSize: 100,
                sessionOptions: {
                    maxUsageCount: 5
                }
            },
            
            // Proxy configuration (only set if not null)
            ...(proxyConfig && { proxyConfiguration: proxyConfig }),
            
            // Pre-navigation hooks
            preNavigationHooks: [
                createResourceBlocker(),
                createRateLimitHook(rateLimiter)
            ],
            
            
            // Launch options - optimized for stability and performance
            launchContext: {
                launchOptions: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage', // Use /tmp instead of /dev/shm
                        '--disable-gpu',
                        '--disable-web-security',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--disable-blink-features=AutomationControlled',
                        '--window-size=1920,1080'
                    ]
                }
            }
        });
        
        // Run the crawler
        log.info('Starting crawler...');
        await crawler.run();
        
        // Log completion message with summary
        const dataset = await Actor.openDataset();
        const datasetInfo = await dataset.getInfo();
        const itemCount = datasetInfo?.itemCount || 0;
        
        log.info('='.repeat(50));
        log.info('SCRAPING COMPLETED!');
        log.info(`Total channels processed: ${processedCount}`);
        log.info(`Total results saved: ${itemCount}`);
        log.info(`Success rate: ${processedCount > 0 ? Math.round((itemCount / processedCount) * 100) : 0}%`);
        
        // Save final state
        await Actor.setValue('FINAL_STATE', {
            processedCount,
            totalCount,
            successCount: itemCount,
            completedAt: new Date().toISOString()
        });
        
        log.info('='.repeat(50));
        
    } catch (error) {
        log.error('Actor failed with error:', error);
        throw error;
    }
});