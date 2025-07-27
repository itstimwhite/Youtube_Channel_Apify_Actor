/**
 * Page handler for YouTube Channel Scraper
 * Extracts channel information from YouTube about pages
 */

import { Actor, log } from 'apify';
import { social } from 'crawlee';
import * as constants from './constants.js';
import * as utils from './utility.js';

/**
 * Extracts data from YouTube's ytInitialData object
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<Object>} Extracted data from ytInitialData
 */
async function extractYouTubeData(page) {
    try {
        const ytData = await page.evaluate(() => {
            // Try multiple possible locations for YouTube's data
            return window.ytInitialData || 
                   window.ytInitialPlayerResponse || 
                   window.ytcfg?.data_ || 
                   {};
        });
        
        return ytData;
    } catch (error) {
        log.debug('Failed to extract YouTube data object:', error.message);
        return {};
    }
}

/**
 * Extracts channel metadata from ytInitialData
 * @param {Object} ytData - YouTube's initial data object
 * @returns {Object} Extracted channel metadata
 */
function extractChannelMetadata(ytData) {
    const metadata = {
        channelName: '',
        subscriberCount: '',
        videoCount: '',
        description: '',
        joinedDate: '',
        viewCount: '',
        location: '',
        links: []
    };
    
    try {
        // Try to find channel header data
        const header = ytData?.header?.c4TabbedHeaderRenderer || 
                      ytData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
        
        if (header) {
            // Extract channel name from various possible locations
            metadata.channelName = header.title || 
                                 header.title?.simpleText || 
                                 header.dynamicTextViewModel?.text?.content ||
                                 '';
            
            // Extract subscriber count
            metadata.subscriberCount = header.subscriberCountText?.simpleText || 
                                     header.subscriberCountText?.runs?.[0]?.text ||
                                     '';
            
            // Extract video count
            metadata.videoCount = header.videosCountText?.runs?.[0]?.text || 
                                header.videosCount?.simpleText ||
                                '';
        }
        
        // Try to find about page data
        const tabs = ytData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        const aboutTab = tabs.find(tab => tab?.tabRenderer?.title === 'About' || tab?.tabRenderer?.selected);
        
        if (aboutTab) {
            const aboutData = aboutTab?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
                ?.itemSectionRenderer?.contents?.[0]?.channelAboutFullMetadataRenderer;
            
            if (aboutData) {
                metadata.description = aboutData.description?.simpleText || '';
                metadata.location = aboutData.country?.simpleText || '';
                metadata.joinedDate = aboutData.joinedDateText?.runs?.[1]?.text || '';
                metadata.viewCount = aboutData.viewCountText?.simpleText || '';
                
                // Extract links
                const primaryLinks = aboutData.primaryLinks || [];
                const otherLinks = aboutData.otherLinks || [];
                metadata.links = [...primaryLinks, ...otherLinks].map(link => ({
                    title: link.title?.simpleText || '',
                    url: link.navigationEndpoint?.urlEndpoint?.url || ''
                }));
            }
        }
        
    } catch (error) {
        log.debug('Error parsing YouTube data structure:', error.message);
    }
    
    return metadata;
}

/**
 * Checks for CAPTCHA presence on the page
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if CAPTCHA detected
 */
async function checkForCaptcha(page) {
    const captchaFrame = await page.frames().find(f => f.name().startsWith('a-'));
    if (!captchaFrame) return false;
    
    const hasCaptcha = await captchaFrame
        .waitForSelector(constants.CSS_SELECTORS.CAPTCHA_FRAME, { 
            timeout: constants.TIMEOUTS.CAPTCHA_CHECK 
        })
        .catch(() => null);
    
    return !!hasCaptcha;
}

/**
 * Handles consent dialog if present
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if consent was handled
 */
async function handleConsentDialog(page) {
    if (!page.url().includes('consent')) return false;
    
    log.debug('Handling consent dialog');
    
    try {
        await Promise.all([
            page.$eval(constants.CSS_SELECTORS.CONSENT_FORM, (form) => {
                const button = form.querySelector('button');
                if (button) button.click();
            }),
            page.waitForNavigation({ 
                waitUntil: 'networkidle2',
                timeout: constants.TIMEOUTS.NAVIGATION 
            }),
        ]);
        return true;
    } catch (error) {
        log.warning('Failed to handle consent dialog:', error.message);
        return false;
    }
}

/**
 * Dismisses upsell dialog if present
 * @param {Object} page - Puppeteer page instance
 */
async function dismissUpsellDialog(page) {
    const upsellDialog = await page.$(constants.CSS_SELECTORS.UPSELL_DIALOG);
    if (!upsellDialog) return;
    
    await page.evaluate(() => {
        const buttons = document.querySelectorAll('.yt-upsell-dialog-renderer [role="button"]');
        for (const button of buttons) {
            if (button.textContent?.includes('No thanks')) {
                button.click();
                break;
            }
        }
    });
}

/**
 * Waits for page content to be fully loaded
 * @param {Object} page - Puppeteer page instance
 */
async function waitForContent(page) {
    try {
        // Wait for any of these key elements to appear
        await Promise.race([
            page.waitForSelector(constants.CSS_SELECTORS.CHANNEL_NAME, { timeout: constants.TIMEOUTS.ELEMENT_WAIT }),
            page.waitForSelector(constants.CSS_SELECTORS.ABOUT_SECTION, { timeout: constants.TIMEOUTS.ELEMENT_WAIT }),
            page.waitForSelector('#content', { timeout: constants.TIMEOUTS.ELEMENT_WAIT }),
        ]);
        
        // Additional wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        log.warning('Timeout waiting for content to load');
    }
}

/**
 * Extracts basic channel information with multiple fallback strategies
 * @param {Object} page - Puppeteer page instance
 * @param {Object} ytData - YouTube's data object
 * @returns {Promise<Object>} Channel basic info
 */
async function extractBasicInfo(page, ytData) {
    const metadata = extractChannelMetadata(ytData);
    
    // Try DOM selectors as fallback
    const [channelName, subscriberCount, avatarUrl] = await Promise.all([
        // Channel name
        utils.getDataFromSelector(page, constants.CSS_SELECTORS.CHANNEL_NAME, 'innerText', 3000)
            .then(name => name || metadata.channelName)
            .catch(() => metadata.channelName),
        
        // Subscriber count
        utils.getDataFromSelector(page, constants.CSS_SELECTORS.SUBSCRIBER_COUNT, 'innerText', 3000)
            .then(count => count || metadata.subscriberCount)
            .catch(() => metadata.subscriberCount),
        
        // Avatar image
        utils.getDataFromSelector(page, constants.CSS_SELECTORS.AVATAR_IMAGE, 'src', 3000)
            .catch(() => null),
    ]);
    
    // Clean up channel name if it's an object
    let cleanChannelName = channelName || metadata.channelName;
    if (typeof cleanChannelName === 'object') {
        cleanChannelName = cleanChannelName?.dynamicTextViewModel?.text?.content || 
                          cleanChannelName?.simpleText || 
                          cleanChannelName?.text || 
                          'Unknown Channel';
    }
    
    return {
        channelName: cleanChannelName || 'Unknown Channel',
        channelSubscriberCount: subscriberCount ? utils.unformatNumbers(subscriberCount) : 0,
        channelVideosCount: metadata.videoCount ? utils.unformatNumbers(metadata.videoCount) : 0,
        channelProfileImageURL: avatarUrl || '',
        metadata // Include raw metadata for additional processing
    };
}

/**
 * Extracts detailed channel information
 * @param {Object} page - Puppeteer page instance
 * @param {Object} metadata - Metadata from ytInitialData
 * @returns {Promise<Object>} Channel detailed info
 */
async function extractDetailedInfo(page, metadata) {
    // Use metadata first, then try DOM selectors as fallback
    const [joinedDate, totalViewCount, channelLocation, channelDescription] = await Promise.all([
        // Joined date
        metadata.joinedDate || 
        utils.getDataFromXpath(page, constants.XPATH_SELECTORS.JOINED_DATE, 'innerText', 3000)
            .catch(() => ''),
        
        // Total view count
        metadata.viewCount ||
        utils.getDataFromXpath(page, constants.XPATH_SELECTORS.TOTAL_VIEW_COUNT, 'innerText', 3000)
            .catch(() => ''),
        
        // Location
        metadata.location ||
        utils.getDataFromDetailsTable(page, constants.XPATH_SELECTORS.CHANNEL_DETAILS_TABLE, 'Location')
            .catch(() => ''),
        
        // Description
        metadata.description ||
        utils.getDataFromXpath(page, constants.XPATH_SELECTORS.CHANNEL_DESCRIPTION, 'innerText', 3000)
            .catch(() => ''),
    ]);
    
    return {
        joinedDate: joinedDate || '',
        totalViewCount: totalViewCount ? utils.unformatNumbers(totalViewCount) : 0,
        channelLocation: channelLocation || '',
        channelDescription: channelDescription || '',
        channelLinks: metadata.links || []
    };
}

/**
 * Extracts all URLs from the page
 * @param {Object} page - Puppeteer page instance
 * @param {Array} metadataLinks - Links from metadata
 * @returns {Promise<string[]>} Array of URLs
 */
async function extractAllUrls(page, metadataLinks = []) {
    try {
        const pageUrls = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors
                .map(anchor => anchor.href)
                .filter(href => href && href.startsWith('http'));
        });
        
        // Combine with metadata links
        const metadataUrls = metadataLinks.map(link => link.url).filter(url => url);
        return [...new Set([...pageUrls, ...metadataUrls])];
    } catch (error) {
        log.debug('Error extracting URLs:', error.message);
        return [];
    }
}

/**
 * Processes and categorizes social media URLs
 * @param {string[]} allUrls - All URLs found on page
 * @returns {Object} Categorized social media URLs
 */
function categorizeSocialUrls(allUrls) {
    // Extract redirect URLs with 'q' parameter
    const redirectUrls = utils.extractUrlParameters(allUrls, 'q');
    
    // Include direct URLs that aren't YouTube redirects
    const directUrls = allUrls.filter(url => 
        !url.includes('youtube.com/redirect') && 
        !url.includes('youtube.com/@')
    );
    
    const uniqueUrls = Array.from(new Set([...redirectUrls, ...directUrls]));
    
    // Categorize URLs by platform
    const socialUrls = {
        youtubeUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.YOUTUBE),
        instagramUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.INSTAGRAM),
        twitterUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.TWITTER),
        facebookUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.FACEBOOK),
        linkedinUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.LINKEDIN),
        pinterestUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.PINTEREST),
        redditUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.REDDIT),
        tumblrUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.TUMBLR),
        twitchUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.TWITCH),
        onlyfansUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.ONLYFANS),
        soundcloudUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.SOUNDCLOUD),
        discordUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.DISCORD),
        patreonUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.PATREON),
        githubUrls: utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.GITHUB),
    };
    
    // Special handling for TikTok (remove query params)
    socialUrls.tiktokUrls = utils.filterUrlsByDomain(uniqueUrls, constants.SOCIAL_MEDIA_PATTERNS.TIKTOK)
        .map(url => utils.cleanUrl(url));
    
    // Special handling for Spotify (must contain user or artist)
    socialUrls.spotifyUrls = uniqueUrls.filter(url => 
        constants.SOCIAL_MEDIA_PATTERNS.SPOTIFY.domains.some(domain => url.includes(domain)) &&
        constants.SOCIAL_MEDIA_PATTERNS.SPOTIFY.requiredPaths.some(path => url.includes(path))
    );
    
    // Generic websites (non-social media)
    socialUrls.websiteUrls = uniqueUrls.filter(url => {
        const isSocial = Object.keys(constants.SOCIAL_MEDIA_PATTERNS)
            .filter(key => key !== 'WEBSITE')
            .some(platform => {
                const patterns = constants.SOCIAL_MEDIA_PATTERNS[platform];
                if (Array.isArray(patterns)) {
                    return patterns.some(pattern => url.includes(pattern));
                } else if (patterns.domains) {
                    return patterns.domains.some(domain => url.includes(domain));
                }
                return false;
            });
        return !isSocial && !url.includes('youtube.com');
    });
    
    return socialUrls;
}

/**
 * Extracts channel verification status
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<string|null>} Verification category or null
 */
async function extractVerificationStatus(page) {
    try {
        // Try multiple methods to find verification badge
        const verifiedBadge = await page.evaluate(() => {
            // Look for verified badge tooltip
            const badges = document.querySelectorAll('ytd-badge-supported-renderer');
            for (const badge of badges) {
                const tooltip = badge.querySelector('tp-yt-paper-tooltip div');
                if (tooltip && tooltip.textContent) {
                    return tooltip.textContent.trim();
                }
            }
            
            // Look for aria-label on badges
            const ariaLabels = document.querySelectorAll('[aria-label*="Verified"]');
            if (ariaLabels.length > 0) {
                return 'Verified';
            }
            
            return null;
        });
        
        return verifiedBadge;
    } catch (error) {
        log.debug('Error checking verification status:', error.message);
        return null;
    }
}

/**
 * Extracts contact information from channel description
 * @param {string} description - Channel description text
 * @returns {Object} Contact information
 */
function extractContactInfo(description) {
    if (!description) {
        return { emails: [], phones: [] };
    }
    
    return {
        emails: social.emailsFromText(description),
        phones: social.phonesFromText(description),
    };
}

/**
 * Main page handler function
 * @param {Object} context - Crawlee context object
 */
const handlePageFunction = async ({ page, request, session, response }) => {
    const startTime = Date.now();
    log.info(`Processing channel: ${request.url}`);
    
    try {
        // Check for CAPTCHA
        if (await checkForCaptcha(page)) {
            session.retire();
            throw new Error(constants.ERROR_MESSAGES.CAPTCHA_DETECTED);
        }
        
        // Validate response status
        const statusCode = response.status();
        if (statusCode >= 400) {
            session.retire();
            throw new Error(`${constants.ERROR_MESSAGES.INVALID_RESPONSE}: ${statusCode} ${response.statusText()}`);
        }
        
        // Handle consent dialog
        if (await handleConsentDialog(page)) {
            session.retire();
            return; // Page will be retried after consent
        }
        
        // Dismiss any upsell dialogs
        await dismissUpsellDialog(page);
        
        // Wait for content to load
        await waitForContent(page);
        
        // Extract YouTube's data object first
        const ytData = await extractYouTubeData(page);
        
        // Extract all data with fallback strategies
        const basicInfo = await extractBasicInfo(page, ytData);
        const detailedInfo = await extractDetailedInfo(page, basicInfo.metadata);
        const allUrls = await extractAllUrls(page, detailedInfo.channelLinks);
        const verifiedCategory = await extractVerificationStatus(page);
        
        // Process URLs and extract contact info
        const socialUrls = categorizeSocialUrls(allUrls);
        const contactInfo = extractContactInfo(detailedInfo.channelDescription);
        
        // Prepare final data object
        const channelData = {
            // Basic information
            channelURL: request.url.replace('/about', ''),
            channelName: basicInfo.channelName,
            channelSubscriberCount: basicInfo.channelSubscriberCount,
            channelVideosCount: basicInfo.channelVideosCount,
            
            // Detailed information
            joinedDate: detailedInfo.joinedDate,
            totalViewCount: detailedInfo.totalViewCount,
            channelLocation: detailedInfo.channelLocation,
            channelDescription: detailedInfo.channelDescription,
            channelProfileImageURL: basicInfo.channelProfileImageURL,
            
            // Contact information
            channelEmail: contactInfo.emails,
            channelPhone: contactInfo.phones,
            
            // Social media links
            ...socialUrls,
            
            // Verification status
            verifiedCategory,
            
            // Metadata
            scrapedAt: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            dataSource: ytData ? 'ytInitialData' : 'DOM',
        };
        
        // Save to dataset
        await Actor.pushData(channelData);
        
        log.info(`Successfully scraped channel: ${basicInfo.channelName}`, {
            subscribers: basicInfo.channelSubscriberCount,
            videos: basicInfo.channelVideosCount,
            processingTime: channelData.processingTime,
            dataSource: channelData.dataSource,
        });
        
    } catch (error) {
        log.error(`Failed to process ${request.url}: ${error.message}`);
        
        // Take screenshot for debugging
        try {
            await utils.saveSnapshot(page, `ERROR-${request.id}-${Date.now()}`);
        } catch (screenshotError) {
            log.debug('Failed to save error screenshot:', screenshotError.message);
        }
        
        throw error;
    }
};

export default handlePageFunction;