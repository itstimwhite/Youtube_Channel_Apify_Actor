import { Actor, log } from 'apify';
import { PuppeteerCrawler, RequestList, RequestQueue, ProxyConfiguration } from 'crawlee';
import ytsr from 'ytsr';
import handlePageFunction from './src/handlePageFunction.js';

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
        await requestQueue.addRequest({ 
            url: `${cleanUrl}/about`,
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
    log.info('Starting YouTube Channel Scraper');
    
    // Get and validate input
    let input = await Actor.getInput();
    log.debug('Raw input received:', input);
    
    if (!input) {
        log.warning('No input provided. Using default configuration.');
        // Use empty defaults if no input provided
        input = {
            keywords: [],
            startUrls: [],
            limit: 5,
            maxRequestsPerCrawl: 100,
            minConcurrency: 1,
            maxConcurrency: 1
        };
    }
    
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
        proxyConfiguration
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
        if (keywords.length > 0) {
            const searchResults = await searchChannels(keywords, limit, allChannelUrls);
            allChannelUrls.push(...searchResults);
        }
        
        if (allChannelUrls.length === 0) {
            log.warning('No channel URLs to process. Please provide keywords or start URLs.');
            return;
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
        
        // Create and configure crawler
        const crawler = new PuppeteerCrawler({
            requestQueue,
            requestHandler: handlePageFunction,
            
            // Timeouts and retries
            requestHandlerTimeoutSecs,
            maxRequestRetries,
            
            // Concurrency settings
            minConcurrency,
            maxConcurrency,
            maxRequestsPerCrawl,
            
            // Browser settings
            browserPoolOptions: { 
                maxOpenPagesPerBrowser: 1,
                retireBrowserAfterPageCount: 10
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
            preNavigationHooks: [createResourceBlocker()],
            
            // Launch options
            launchContext: {
                launchOptions: {
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
            }
        });
        
        // Run the crawler
        log.info('Starting crawler...');
        await crawler.run();
        
        // Log completion message
        log.info('Crawl completed successfully!');
        
    } catch (error) {
        log.error('Actor failed with error:', error);
        throw error;
    }
});