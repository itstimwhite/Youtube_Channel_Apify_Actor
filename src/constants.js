/**
 * YouTube Channel Scraper Constants
 * Contains all selectors, patterns, and configuration constants
 */

// CSS Selectors for channel information
export const CSS_SELECTORS = {
    // Channel header elements
    CHANNEL_NAME: 'yt-formatted-string.ytd-channel-name',
    CHANNEL_NAME_TEXT: '#text.ytd-channel-name',
    SUBSCRIBER_COUNT: '#owner-sub-count',
    
    // Navigation and tabs
    VIDEOS_TAB: 'yt-tab-shape[tab-title="Videos"]',
    ABOUT_TAB: 'yt-tab-shape[tab-title="About"]',
    
    // Channel avatar
    AVATAR_IMAGE: 'yt-img-shadow#avatar img',
    CHANNEL_HEADER_IMAGE: '#channel-header-container img',
    
    // Dialog and consent
    UPSELL_DIALOG: '.yt-upsell-dialog-renderer',
    CONSENT_FORM: 'form[action*="consent"]',
    CAPTCHA_FRAME: 'div.recaptcha-checkbox-border',
    
    // About page specific
    ABOUT_SECTION: 'ytd-channel-about-metadata-renderer',
    DESCRIPTION_CONTAINER: '#description-container',
    DETAILS_CONTAINER: '#details-container',
    LINKS_CONTAINER: '#links-container',
    
    // Stats elements
    STATS_CONTAINER: '#right-column',
    VIEW_COUNT_CONTAINER: 'yt-formatted-string.view-count',
    JOIN_DATE_CONTAINER: 'yt-formatted-string:not(.view-count)',
};

// XPath selectors for more complex elements
export const XPATH_SELECTORS = {
    // Channel name with multiple fallbacks
    CHANNEL_NAME: '//yt-formatted-string[@class="style-scope ytd-channel-name"]//text()',
    
    // Stats in the about section
    JOINED_DATE: '//div[@id="right-column"]//yt-formatted-string[contains(text(), "Joined")]',
    TOTAL_VIEW_COUNT: '//div[@id="right-column"]//yt-formatted-string[contains(text(), "view")]',
    
    // Description
    CHANNEL_DESCRIPTION: '//div[@id="description-container"]//yt-formatted-string',
    
    // Details table
    CHANNEL_DETAILS_TABLE: '//div[@id="details-container"]//table//tr',
    
    // Profile image
    CHANNEL_PROFILE_IMAGE: '//yt-img-shadow[@id="avatar"]//img',
    
    // Verification badge
    VERIFIED_BADGE: '//ytd-badge-supported-renderer[@class="style-scope ytd-channel-name"]//tp-yt-paper-tooltip//div[@class="tp-yt-paper-tooltip"]',
    
    // Links section
    CHANNEL_LINKS: '//div[@id="links-container"]//a',
    PRIMARY_LINKS: '//div[@id="primary-links"]//a',
    SECONDARY_LINKS: '//div[@id="secondary-links"]//a',
};

// YouTube Data API selectors (from ytInitialData)
export const YT_DATA_PATHS = {
    // Paths to data in ytInitialData object
    CHANNEL_ID: 'header.c4TabbedHeaderRenderer.channelId',
    CHANNEL_NAME: 'header.c4TabbedHeaderRenderer.title',
    SUBSCRIBER_TEXT: 'header.c4TabbedHeaderRenderer.subscriberCountText.simpleText',
    VIDEOS_COUNT_TEXT: 'header.c4TabbedHeaderRenderer.videosCountText.runs[0].text',
    AVATAR_URL: 'header.c4TabbedHeaderRenderer.avatar.thumbnails[2].url',
    BANNER_URL: 'header.c4TabbedHeaderRenderer.banner.thumbnails[0].url',
    
    // About page metadata
    DESCRIPTION: 'metadata.channelMetadataRenderer.description',
    KEYWORDS: 'metadata.channelMetadataRenderer.keywords',
    COUNTRY: 'metadata.channelMetadataRenderer.country',
    
    // About tab specific
    ABOUT_DESCRIPTION: 'contents.twoColumnBrowseResultsRenderer.tabs[*].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].channelAboutFullMetadataRenderer.description.simpleText',
    ABOUT_COUNTRY: 'contents.twoColumnBrowseResultsRenderer.tabs[*].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].channelAboutFullMetadataRenderer.country.simpleText',
    ABOUT_JOIN_DATE: 'contents.twoColumnBrowseResultsRenderer.tabs[*].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].channelAboutFullMetadataRenderer.joinedDateText.runs[1].text',
    ABOUT_VIEW_COUNT: 'contents.twoColumnBrowseResultsRenderer.tabs[*].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].channelAboutFullMetadataRenderer.viewCountText.simpleText',
    ABOUT_LINKS: 'contents.twoColumnBrowseResultsRenderer.tabs[*].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].channelAboutFullMetadataRenderer.primaryLinks',
};

// Social media patterns for URL detection
export const SOCIAL_MEDIA_PATTERNS = {
    YOUTUBE: ['youtube.com'],
    INSTAGRAM: ['instagram.com'],
    TWITTER: ['twitter.com', 'x.com'],
    FACEBOOK: ['facebook.com', 'fb.com'],
    LINKEDIN: ['linkedin.com'],
    PINTEREST: ['pinterest.com'],
    REDDIT: ['reddit.com'],
    TUMBLR: ['tumblr.com'],
    TIKTOK: ['tiktok.com'],
    TWITCH: ['twitch.tv'],
    ONLYFANS: ['onlyfans.com'],
    SPOTIFY: {
        domains: ['spotify.com'],
        requiredPaths: ['user', 'artist']
    },
    SOUNDCLOUD: ['soundcloud.com'],
    DISCORD: ['discord.gg', 'discord.com/invite'],
    PATREON: ['patreon.com'],
    GITHUB: ['github.com'],
    WEBSITE: ['http', 'https'], // Generic website
};

// Resource patterns to block during page load
export const BLOCKED_RESOURCE_PATTERNS = [
    // Media files
    '.mp4', '.webm', '.avi', '.mov', '.flv',
    '.webp', '.jpeg', '.jpg', '.gif', '.svg', '.ico', '.png', '.bmp',
    '.woff', '.woff2', '.ttf', '.eot',
    
    // Analytics and tracking
    'google-analytics.com',
    'googletagmanager.com',
    'doubleclick.net',
    'facebook.com/tr',
    'analytics.',
    'gtag/',
    
    // YouTube specific resources
    '/videoplayback',
    '/adview',
    '/stats/ads',
    '/stats/watchtime',
    '/stats/qoe',
    '/log_event',
    '/youtubei/v1/log_event',
    '/api/stats',
    '/ptracking',
    
    // Ads
    'googlesyndication.com',
    'googleadservices.com',
    'google-analytics.com',
    'doubleclick.net',
    
    // Comments and unnecessary features
    '/comment',
    '/get_video_info',
    '/get_midroll_info',
];

// Timeout configurations (in milliseconds)
export const TIMEOUTS = {
    SELECTOR_WAIT: 10000,  // 10 seconds - reduced from 120
    CAPTCHA_CHECK: 5000,   // 5 seconds
    NAVIGATION: 30000,     // 30 seconds
    PAGE_LOAD: 60000,      // 1 minute
    ELEMENT_WAIT: 5000,    // 5 seconds for individual elements
};

// Error messages
export const ERROR_MESSAGES = {
    NO_INPUT: 'No input provided. Please check your input configuration.',
    CAPTCHA_DETECTED: 'Got captcha, page will be retried. If this happens often, consider increasing number of proxies',
    INVALID_RESPONSE: 'Invalid response status from YouTube',
    SELECTOR_NOT_FOUND: 'Required selector not found on page',
    PROXY_REQUIRED: 'You must use Apify proxy or custom proxies with this scraper!',
    DATA_EXTRACTION_FAILED: 'Failed to extract data from page',
    NAVIGATION_FAILED: 'Failed to navigate to page',
};

// Regular expressions
export const REGEX_PATTERNS = {
    TRAILING_SLASHES: /\/+$/,
    NUMBER_EXTRACTION: /[^0-9,.]/g,
    MULTIPLIER_EXTRACTION: /(?<=[0-9 ])[mkbtq]/i,
    URL_QUERY_PARAM: /[?&]q=([^&]+)/,
    YOUTUBE_CHANNEL_URL: /youtube\.com\/@?([^\/]+)/,
    SUBSCRIBER_COUNT: /([0-9,.]+[KMB]?)\s*subscriber/i,
    VIEW_COUNT: /([0-9,.]+)\s*view/i,
    VIDEO_COUNT: /([0-9,.]+)\s*video/i,
};

// Number multipliers for view/subscriber counts
export const NUMBER_MULTIPLIERS = {
    K: 1e3,     // Thousand
    M: 1e6,     // Million
    B: 1e9,     // Billion
    T: 1e12,    // Trillion
    Q: 1e15,    // Quadrillion
};

// Crawler configuration defaults
export const CRAWLER_DEFAULTS = {
    REQUEST_HANDLER_TIMEOUT: 30,
    MAX_REQUEST_RETRIES: 3,
    MIN_CONCURRENCY: 1,
    MAX_CONCURRENCY: 1,
    MAX_REQUESTS_PER_CRAWL: 100,
    MAX_OPEN_PAGES_PER_BROWSER: 1,
    RETIRE_BROWSER_AFTER_PAGE_COUNT: 10,
    SESSION_MAX_USAGE_COUNT: 5,
    SESSION_POOL_MAX_SIZE: 100,
};

// Browser launch arguments
export const BROWSER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1920,1080',
];

// Legacy selector export for backward compatibility
export const SELECTORS_XP = {
    CHANNEL_NAME_SELECTOR: CSS_SELECTORS.CHANNEL_NAME,
    CHANNEL_SUBSCRIBER_COUNT_SELECTOR: CSS_SELECTORS.SUBSCRIBER_COUNT,
    CHANNEL_VIDEOS_COUNT_SELECTOR: CSS_SELECTORS.VIDEOS_TAB,
    JOINED_DATE_XP: XPATH_SELECTORS.JOINED_DATE,
    TOTAL_VIEW_COUNT_XP: XPATH_SELECTORS.TOTAL_VIEW_COUNT,
    CHANNEL_DESCRIPTION_XP: XPATH_SELECTORS.CHANNEL_DESCRIPTION,
    CHANNEL_DETAILS_XP: XPATH_SELECTORS.CHANNEL_DETAILS_TABLE,
    CHANNEL_PROFILE_IMAGE_XP: XPATH_SELECTORS.CHANNEL_PROFILE_IMAGE,
};