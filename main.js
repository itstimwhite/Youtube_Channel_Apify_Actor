require('dotenv').config();

const Apify = require('apify');
const { log, puppeteer } = Apify.utils;
const utils = require('./src/utility');
const handlePageFunction = require('./src/handlePageFunction');

Apify.main(async () => {
    const input = await Apify.getInput();

    if (!input)
        throw 'Invalid input. Check apify_storage/key_value_stores/default/INPUT.json file.';

    const {
        startUrls = [],
        proxyConfiguration
    } = input;

    if (process.env?.VERBOSE_LOG?.toLowerCase() === 'true') {
        log.setLevel(log.LEVELS.DEBUG);
    }

    const requestList = await Apify.openRequestList(null, startUrls);
    const requestQueue = await Apify.openRequestQueue();

    let req;
    while (req = await requestList.fetchNextRequest()) {
        await requestQueue.addRequest({ url: req.url += '/about' });
    }

    const proxyConfig = await utils.proxyConfiguration({
        proxyConfig: proxyConfiguration,
    });

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        handlePageFunction,
        handlePageTimeoutSecs: +process.env.HANDLE_PAGE_TIMEOUT_SECS || 30,
        maxRequestRetries: +process.env.MAX_REQUEST_RETRIES || 1,
        minConcurrency: +process.env.MIN_CONCURRENCY || 1,
        maxConcurrency: +process.env.MAX_CONCURRENCY || 1,
        maxRequestsPerCrawl: +process.env.MAX_REQUESTS_PER_CRAWL || 10,
        browserPoolOptions: { maxOpenPagesPerBrowser: 1 },
        useSessionPool: true,
        proxyConfiguration: proxyConfig,
        preNavigationHooks: [
            async ({ page }, gotoOptions) => {
                await puppeteer.blockRequests(page, {
                    urlPatterns: [
                        '.mp4',
                        '.webp',
                        '.jpeg',
                        '.jpg',
                        '.gif',
                        '.svg',
                        '.ico',
                        '.png',
                        'google-analytics',
                        'doubleclick.net',
                        'googletagmanager',
                        '/videoplayback',
                        '/adview',
                        '/stats/ads',
                        '/stats/watchtime',
                        '/stats/qoe',
                        '/log_event',
                    ],
                });
                gotoOptions.waitUntil = 'networkidle2';
            }
        ]
    });

    await crawler.run();
});