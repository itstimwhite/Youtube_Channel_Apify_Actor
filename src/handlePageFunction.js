const Apify = require('apify');
const { log } = Apify.utils;
const constants = require('./constants');
const utils = require('./utility');

module.exports = async ({ page, request, session, response }) => {
    log.info(`Starting data extraction for ${request.url}`);

    const captchaFrame = await page.frames().find(f => f.name().startsWith('a-'));
    if (captchaFrame) {
        const hasCaptcha = await captchaFrame.waitForSelector('div.recaptcha-checkbox-border');
        if (hasCaptcha) {
            session.retire();
            throw 'Got captcha, page will be retried. If this happens often, consider increasing number of proxies';
        }
    }

    const statusCode = +response.status();
    if (statusCode >= 400) {
        session.retire();
        throw `Response status is: ${response.status()} msg: ${response.statusText()}`;
    }

    if (await page.$('.yt-upsell-dialog-renderer')) {
        await page.evaluate(async () => {
            const noThanks = document.querySelectorAll('.yt-upsell-dialog-renderer [role="button"]');

            for (const button of noThanks) {
                if (button.textContent && button.textContent.includes('No thanks')) {
                    button.click();
                    break;
                }
            }
        });
    }

    if (page.url().includes('consent')) {
        log.debug('Clicking consent dialog');

        await Promise.all([
            page.$eval('form[action*="consent"]', (el) => {
                el.querySelector('button')?.click();
            }),
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        session.retire();
    }

    const {
        CHANNEL_NAME_SELECTOR,
        CHANNEL_SUBSCRIBER_COUNT_SELECTOR,
        JOINED_DATE_XP,
        TOTAL_VIEW_COUNT_XP,
        CHANNEL_DETAILS_XP,
        CHANNEL_DESCRIPTION_XP,
        CHANNEL_PROFILE_IMAGE_XP,
    } = constants.SELECTORS_XP;

    const channelName = await utils.getDataFromSelector(page, CHANNEL_NAME_SELECTOR, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelName-failed'));
    log.debug(`Got channelName as ${channelName}`);

    const channelSubscriberCount = await utils.getDataFromSelector(page, CHANNEL_SUBSCRIBER_COUNT_SELECTOR, 'innerHTML')
        .then(str => utils.unformatNumbers(str))
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelSubscriberCount-failed'));
    log.debug(`Got channelSubscriberCount as ${channelSubscriberCount}`);

    const totalViewCount = await utils.getDataFromXpath(page, TOTAL_VIEW_COUNT_XP, 'innerHTML')
        .then(str => utils.unformatNumbers(str))
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-totalViewCount-failed'));
    log.debug(`Got totalViewCountStr as ${totalViewCount}`);

    const joinedDate = await utils.getDataFromXpath(page, JOINED_DATE_XP, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-joinedDate-failed'));
    log.debug(`Got joinedDate as ${joinedDate}`);

    /*
    * @TODO This is a fragile way to get the location, since if another attribute is added to the details section,
    *   it will broke. A better approach is to get a array of attribute name / value.
    * */
    const channelLocation = await utils.getDataFromDetailsTable(page, CHANNEL_DETAILS_XP, 'Location')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelLocation-failed'));
    log.debug(`Got channelLocation as ${channelLocation}`);

    const channelDescription = await utils.getDataFromXpath(page, CHANNEL_DESCRIPTION_XP, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelDescription-failed'));
    log.debug(`Got channelDescription as ${channelDescription}`);

    const channelProfileImageURL = await utils.getDataFromXpath(page, CHANNEL_PROFILE_IMAGE_XP, 'src')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelProfileImage-failed'));
    log.debug(`Got channelProfileImage as ${channelProfileImageURL}`);

    const allUrls = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(anchor => anchor.href);
    });

    // Search for 'q' in the url in the array allUrls and output it to redirectUrls2
    const redirectUrls2 = allUrls.filter(url => url.includes('q='));
    if (redirectUrls2) log.debug(`Got redirectUrls2 as ${redirectUrls2.join(',')}`);

    // Get the value of the 'q' parameter from the url in the array redirectUrls2
    const redirectUrls3 = redirectUrls2.map(url => url.split('q=')[1]);
    if (redirectUrls3) log.debug(`Got redirectUrls3 as ${redirectUrls3.join(',')}`);

    // Decode the urls in the array redirectUrls3 and output it to redirectUrls4
    const redirectUrls4 = redirectUrls3.map(url => decodeURIComponent(url));
    if (redirectUrls4) log.debug(`Got redirectUrls4 as ${redirectUrls4.join(',')}`);

    // Dedupe the urls in the array redirectUrls4 and output it to redirectUrls5
    const redirectUrls5 = Array.from(new Set(redirectUrls4));
    if (redirectUrls5) log.debug(`Got redirectUrls5 as ${redirectUrls5.join(',')}`);

    // If a url in the array redirectUrls5 contains 'youtube' put it in a new array called youtubeUrls else put it in a new array called otherUrls
    const youtubeUrls = redirectUrls5.filter(url => url.includes('youtube.com'));
    if (youtubeUrls) log.debug(`Got youtubeUrls as ${youtubeUrls.join(',')}`);

    // If a url in the array redirectUrls5 contains 'instagram' put it in a new array called instagramUrls
    const instagramUrls = redirectUrls5.filter(url => url.includes('instagram.com'));
    if (instagramUrls) log.debug(`Got instagramUrls as ${instagramUrls.join(',')}`);

    // If a url in the array redirectUrls5 contains 'twitter' put it in a new array called twitterUrls
    const twitterUrls = redirectUrls5.filter(url => url.includes('twitter.com'));
    if (twitterUrls) log.debug(`Got twitterUrls as ${twitterUrls.join(',')}`);

    // If a url in the array redirectUrls5 contains 'facebook' put it in a new array called facebookUrls
    const facebookUrls = redirectUrls5.filter(url => url.includes('facebook.com' || 'fb.com'));
    if (facebookUrls) log.debug(`Got facebookUrls as ${facebookUrls.join(',')}`);

    // If a url in the array redirectUrls5 contains 'linkedin' put it in a new array called linkedinUrls
    const linkedinUrls = redirectUrls5.filter(url => url.includes('linkedin.com'));
    if (linkedinUrls) log.debug(`Got linkedinUrls as ${linkedinUrls.join(',')}`);

    // If a url in the array redirectUrls5 contains 'pinterest' put it in a new array called pinterestUrls
    const pinterestUrls = redirectUrls5.filter(url => url.includes('pinterest.com'));
    if (pinterestUrls) log.debug(`Got pinterestUrls as ${pinterestUrls.join(',')}`);

    // If a url in the array redirectUrls5 contains 'reddit' put it in a new array called redditUrls
    const redditUrls = redirectUrls5.filter(url => url.includes('reddit.com'));
    if (redditUrls) log.debug(`Got redditUrls as ${redditUrls.join(',')}`);

    // If a url in the array redirectUrls5 contains 'tumblr' put it in a new array called tumblrUrls
    const tumblrUrls = redirectUrls5.filter(url => url.includes('tumblr.com'));
    if (tumblrUrls) log.debug(`Got tumblrUrls as ${tumblrUrls.join(',')}`);

    // If a url in the array contains 'tiktok' put it in a new array called tiktokUrls
    const tiktokUrls = redirectUrls5.filter(url => url.includes('tiktok.com'));
    if (tiktokUrls) log.debug(`Got tiktokUrls as ${tiktokUrls.join(',')}`);

    // If a url in the array contains 'tiktok' trim the url to remove the '?*" part and put it in a new array called tiktokUrls2"
    const tiktokUrls2 = tiktokUrls.map(url => url.split('?')[0]);
    if (tiktokUrls2) log.debug(`Got tiktokUrls2 as ${tiktokUrls2.join(',')}`);

    // If a url in the array contains 'twitch' put it in a new array called twitchUrls
    const twitchUrls = redirectUrls5.filter(url => url.includes('twitch'));
    if (twitchUrls) log.debug(`Got twitchUrls as ${twitchUrls.join(',')}`);

    // If a url in the array contains 'onlyfans' trim put it in a new array called onlyfansUrls
    const onlyfansUrls = redirectUrls5.filter(url => url.includes('onlyfans'));
    if (onlyfansUrls) log.debug(`Got onlyfansUrls as ${onlyfansUrls.join(',')}`);

    // If a url in the array contains 'spotify' and ('user' or 'artist') put it in a new array called spotifyUrls
    const spotifyUrls = redirectUrls5.filter(url => url.includes('spotify') && (url.includes('user') || url.includes('artist')));
    if (spotifyUrls) log.debug(`Got spotifyUrls as ${spotifyUrls.join(',')}`);

    // If a url in the array contains 'soundcloud' put it in a new array called soundcloudUrls
    const soundcloudUrls = redirectUrls5.filter(url => url.includes('soundcloud'));
    if (soundcloudUrls) log.debug(`Got soundcloudUrls as ${soundcloudUrls.join(',')}`);

    /*  Look for 'xpathCategory' on the page. If not found, set category to null
     *  If found, get the textContent of the element and set it as category
     */
    const verifiedCategory = await page.evaluate(() => {
        const xpathCategory = document.evaluate('//*[@id="header"]/div[2]/div[2]/div/div[1]/div/div[1]/ytd-channel-name/ytd-badge-supported-renderer/div/tp-yt-paper-tooltip/div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (xpathCategory === null) {
            return null;
        } else {
            return xpathCategory.textContent.trim();
        }
    });
    log.debug(`Got verifiedCategory as ${verifiedCategory}`);


    const channelURL = request.url.replace('/about', '');

    const channelEmail = Apify.utils.social.emailsFromText(channelDescription);
    log.debug(`Got email as ${channelEmail}`);

    const channelPhone = Apify.utils.social.phonesFromText(channelDescription);
    log.debug(`Got phone as ${channelPhone}`);

    log.debug('Pushing item to dataset');
    await Apify.pushData({
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
        spotifyUrls,
        soundcloudUrls,
        verifiedCategory
    });

    log.info(`Finished data extraction for ${request.url}`);
};