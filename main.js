// This is the main Node.js source code file of your actor.
// It is referenced from the "scripts" section of the package.json file,
// so that it can be started by running "npm start".

// Import Apify SDK. For more information, see https://sdk.apify.com/

const Apify = require('apify');
const CONSTS = require('./consts');
const utils = require('./utility');
const url = require('url');
const {
    getInitialRequests,
    executeCustomDataFunction,
    getInfoStringFromResults,
    createSerpRequest,
    logAsciiArt,
    createDebugInfo,
    ensureAccessToSerpProxy,
} = require('./tools');
/* const crawler = require('./crawler_utils'); */

const { log, puppeteer } = Apify.utils;



Apify.main(async() => {
    // Get input of the actor (here only for demonstration purposes).
    // If you'd like to have your input checked and have Apify display
    // a user interface for it, add INPUT_SCHEMA.json file to your actor.
    // For more information, see https://docs.apify.com/actors/development/input-schema
    /**
     * @type {any}
     */
    const input = await Apify.getInput();
    console.log('Input:');
    console.dir(input);

    const {
        /*   verboseLog, */
        startUrls = [],
            /*     proxyConfiguration,
                handlePageTimeoutSecs = 3600, */
    } = input;

    /*  if (verboseLog) {
         log.setLevel(log.LEVELS.DEBUG);
     } */

    const kvStore = await Apify.openKeyValueStore();
    const requestQueue = await Apify.openRequestQueue();
    /* const proxyConfig = await utils.proxyConfiguration({
        proxyConfig: proxyConfiguration,
    }); */

    //take the array startUrls and put them in the request queue
    for (const startUrl of startUrls) {
        await requestQueue.addRequest({ url: startUrl });
    }

    //take the first url from the request queue and start the crawler
    // Create initial request list and queue.
    const initialRequests = getInitialRequests(input);
    if (!initialRequests.length) throw new Error('The input must contain at least one search query or URL.');
    const requestList = await Apify.openRequestList('initial-requests', initialRequests);
    const requestQueue = await Apify.openRequestQueue();
    const dataset = await Apify.openDataset();
    const keyValueStore = await Apify.openKeyValueStore();

    if (!input || !input.url) throw new Error('Input must be a JSON object with the "url" field!');

    const inputModified = utils.appendAbout(input.url);
    console.log(`Modified input is "${inputModified}".`);

    console.log('Launching Puppeteer...');
    const browser = await Apify.launchPuppeteer();

    console.log(`Opening page ${inputModified}...`);
    const page = await browser.newPage();
    await page.goto(inputModified);

    const title = await page.title();
    console.log(`Title of the page "${inputModified}" is "${title}".`);


    //Set Xpaths
    channelNameXp = CONSTS.SELECTORS.channelNameXp;
    channelSubscriberCountXp = CONSTS.SELECTORS.channelSubscriberCountXp;
    joinedDateXp = CONSTS.SELECTORS.joinedDateXp;
    totalViewCountXp = CONSTS.SELECTORS.totalViewCountXp;
    channelLocationXp = CONSTS.SELECTORS.channelLocationXp;
    channelDescriptionXp = CONSTS.SELECTORS.channelDescriptionXp;
    channelProfileImageXp = CONSTS.SELECTORS.channelProfileImageXp;
    channelVerifiedXp = CONSTS.SELECTORS.channelVerifiedXp;
    channelWebsiteXp = CONSTS.SELECTORS.channelWebsiteXp;
    channelLink1Xp = CONSTS.SELECTORS.channelLink1Xp;
    channelLink2Xp = CONSTS.SELECTORS.channelLink2Xp;
    channelLink3Xp = CONSTS.SELECTORS.channelLink3Xp;
    channelLink4Xp = CONSTS.SELECTORS.channelLink4Xp;
    channelLinksXp = CONSTS.SELECTORS.channelLinksXp;
    socialLinksXp = CONSTS.SELECTORS.socialLinksXp;
    leftColumnXp = CONSTS.SELECTORS.leftColumnXp;

    console.log('Begining data extraction')

    console.log(`searching for channel Name at ${channelNameXp}`);
    const channelName = await utils.getDataFromXpath(page, channelNameXp, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelName-failed'));
    console.log(`got channelName as ${channelName}`);

    console.log(`searching for channel Subscriber Count at ${channelSubscriberCountXp}`);
    const channelSubscriberCountStr = await utils.getDataFromXpath(page, channelSubscriberCountXp, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelSubscriberCount-failed'));
    const channelSubscriberCount = utils.unformatNumbers(channelSubscriberCountStr);
    console.log(`got channelSubscriberCount as ${channelSubscriberCount}`);

    console.log('searching for Total View Count at ${totalViewCountXp}');
    const totalViewCountStr = await utils.getDataFromXpath(page, totalViewCountXp, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-totalViewCount-failed'));
    const totalViewCount = utils.unformatNumbers(totalViewCountStr);
    console.log(`got totalViewCount as ${totalViewCount}`);

    console.log(`searching for joined Date at ${joinedDateXp}`);
    const joinedDate = await utils.getDataFromXpath(page, joinedDateXp, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-joinedDate-failed'));
    console.log(`got joinedDate as ${joinedDate}`);

    console.log(`searching for channel Location at ${channelLocationXp}`);
    const channelLocation = await utils.getDataFromXpath(page, channelLocationXp, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelLocation-failed'));
    console.log(`got channelLocation as ${channelLocation}`);

    console.log(`searching for channel Description at ${channelDescriptionXp}`);
    const channelDescription = await utils.getDataFromXpath(page, channelDescriptionXp, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelDescription-failed'));
    console.log(`got channelDescription as ${channelDescription}`);

    console.log(`searching for channel Profile Image at ${channelProfileImageXp}`);
    const channelProfileImage = await utils.getDataFromXpath(page, channelProfileImageXp, 'src')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelProfileImage-failed'));
    console.log(`got channelProfileImage as ${channelProfileImage}`);



    //get all urls from the page
    const allUrls = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(anchor => anchor.href);
    });
    console.log(`got allUrls as ${allUrls}`);

    const redirectUrls = Array.from(allUrls);
    console.log(`got redirectUrls as ${redirectUrls}`);
    //search for 'q' in the url in the array allUrls and output it to redirectUrls2
    const redirectUrls2 = redirectUrls.filter(url => url.includes('q='));
    console.log(`got redirectUrls2 as ${redirectUrls2}`);

    //get the value of the 'q' parameter from the url in the array redirectUrls2
    const redirectUrls3 = redirectUrls2.map(url => url.split('q=')[1]);
    console.log(`got redirectUrls3 as ${redirectUrls3}`);

    //decode the urls in the array redirectUrls3 and output it to redirectUrls4
    const redirectUrls4 = redirectUrls3.map(url => decodeURIComponent(url));
    console.log(`got redirectUrls4 as ${redirectUrls4}`);

    //dedupe the urls in the array redirectUrls4 and output it to redirectUrls5
    const redirectUrls5 = Array.from(new Set(redirectUrls4));
    console.log(`got redirectUrls5 as ${redirectUrls5}`);



    //if a url in the array redirectUrls5 contains 'youtube' put it in a new array called youtubeUrls else put it in a new array called otherUrls
    const youtubeUrls = redirectUrls5.filter(url => url.includes('youtube')); //youtubeUrls is an array of urls that contain 'youtube'
    console.log(`got youtubeUrls as ${youtubeUrls}`);

    //if a url in the array redirectUrls5 contains 'instagram' put it in a new array called instagramUrls
    const instagramUrls = redirectUrls5.filter(url => url.includes('instagram')); //instagramUrls is an array of urls that contain 'instagram'

    //if a url in the array redirectUrls5 contains 'twitter' put it in a new array called twitterUrls
    const twitterUrls = redirectUrls5.filter(url => url.includes('twitter')); //twitterUrls is an array of urls that contain 'twitter'

    //if a url in the array redirectUrls5 contains 'facebook' put it in a new array called facebookUrls
    const facebookUrls = redirectUrls5.filter(url => url.includes('facebook')); //facebookUrls is an array of urls that contain 'facebook'

    //if a url in the array redirectUrls5 contains 'linkedin' put it in a new array called linkedinUrls
    const linkedinUrls = redirectUrls5.filter(url => url.includes('linkedin')); //linkedinUrls is an array of urls that contain 'linkedin'

    //if a url in the array redirectUrls5 contains 'pinterest' put it in a new array called pinterestUrls
    const pinterestUrls = redirectUrls5.filter(url => url.includes('pinterest')); //pinterestUrls is an array of urls that contain 'pinterest'

    //if a url in the array redirectUrls5 contains 'reddit' put it in a new array called redditUrls
    const redditUrls = redirectUrls5.filter(url => url.includes('reddit')); //redditUrls is an array of urls that contain 'reddit'

    //if a url in the array redirectUrls5 contains 'tumblr' put it in a new array called tumblrUrls
    const tumblrUrls = redirectUrls5.filter(url => url.includes('tumblr')); //tumblrUrls is an array of urls that contain 'tumblr'

    //if a url in the array contains 'tiktok' put it in a new array called tiktokUrls
    const tiktokUrls = redirectUrls5.filter(url => url.includes('tiktok')); //tiktokUrls is an array of urls that contain 'tiktok'

    //if a url in the array contains 'tiktok' trim the url to remove the '?*" part and put it in a new array called tiktokUrls2"
    const tiktokUrls2 = tiktokUrls.map(url => url.split('?')[0]); //tiktokUrls2 is an array of urls that contain 'tiktok'

    //if a url in the array contains 'twitch' put it in a new array called twitchUrls
    const twitchUrls = redirectUrls5.filter(url => url.includes('twitch')); //twitchUrls is an array of urls that contain 'twitch'

    //if a url in the array contains 'onlyfans' trim put it in a new array called onlyfansUrls
    const onlyfansUrls = redirectUrls5.filter(url => url.includes('onlyfans')); //onlyfansUrls is an array of urls that contain 'onlyfans'

    //if a url in the array contains 'spotify' and ('user' or 'artist') put it in a new array called spotifyUrls
    const spotifyUrls = redirectUrls5.filter(url => url.includes('spotify') && (url.includes('user') || url.includes('artist'))); //spotifyUrls is an array of urls that contain 'spotify' and ('user' or 'artist')

    //if a url in the array contains 'soundcloud' put it in a new array called soundcloudUrls
    const soundcloudUrls = redirectUrls5.filter(url => url.includes('soundcloud')); //soundcloudUrls is an array of urls that contain 'soundcloud'






    //look for 'xpathCategory' on the page. If not found, set category to null
    //if found, get the textContent of the element and set it as category
    const verifiedCategory = await page.evaluate(() => {
        const xpathCategory = document.evaluate('//*[@id="header"]/div[2]/div[2]/div/div[1]/div/div[1]/ytd-channel-name/ytd-badge-supported-renderer/div/tp-yt-paper-tooltip/div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (xpathCategory === null) {
            return null;
        } else {
            return xpathCategory.textContent;
        }
    });
    console.log(`got verifiedCategory as ${verifiedCategory}`);






    //if the channel is verified return true else return false



    const channelURL = await input.url;
    const channelProfileImageURL = await channelProfileImage.url;

    console.log(`Searching for channel Email in description`);
    const channelEmail = await Apify.utils.social.emailsFromText(channelDescription);
    console.log(`Got email as ${channelEmail}`);

    console.log(`Searching for channel Phone in description`);
    const channelPhone = await Apify.utils.social.phonesFromText(channelDescription);
    console.log(`Got phone as ${channelPhone}`);


    console.log('Finished data extraction')


    console.log('Saving output...');
    await Apify.setValue('OUTPUT', {
        channelURL,
        channelName,
        channelEmail,
        channelPhone,
        channelSubscriberCount,
        joinedDate,
        totalViewCount,
        channelLocation,
        channelDescription,
        channelProfileImageURL,
        youtubeUrls,
        instagramUrls,
        twitterUrls,
        facebookUrls,
        linkedinUrls,
        pinterestUrls,
        redditUrls,
        tumblrUrls,
        tiktokUrls,
        twitchUrls,
        onlyfansUrls,
        verifiedCategory,

    });

    console.log('Closing Puppeteer...');
    await browser.close();

    console.log('Done.');
});