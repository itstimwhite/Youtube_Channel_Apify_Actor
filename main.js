// This is the main Node.js source code file of your actor.
// It is referenced from the "scripts" section of the package.json file,
// so that it can be started by running "npm start".

// Import Apify SDK. For more information, see https://sdk.apify.com/
const Apify = require('apify');
const CONSTS = require('./consts');
const utils = require('./utility.js');



Apify.main(async() => {
    // Get input of the actor (here only for demonstration purposes).
    // If you'd like to have your input checked and have Apify display
    // a user interface for it, add INPUT_SCHEMA.json file to your actor.
    // For more information, see https://docs.apify.com/actors/development/input-schema
    const input = await Apify.getInput();
    console.log('Input:');
    console.dir(input);

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

    console.log(`searching for verified at ${channelVerifiedXp}`);
    const channelVerified = await utils.getDataFromXpath(page, channelVerifiedXp, 'innerHTML')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-verified-failed'));
    console.log(`got channelVerified as ${channelVerified}`);

    if (await (channelVerified) !==
        null) console.log('Channel is verified');
    else console.log('Channel is not verified');

    if (await (channelVerified) !== null) { verified = true }


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

    console.log(`searching for channel Links at ${channelLinksXp}`);
    const channelLinks = await utils.getDataFromXpath(page, channelLinksXp, 'href')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelLinks-failed'));
    console.log(`got channelLinks as ${channelLinks}`);

    console.log(`searching for channel Website at ${channelWebsiteXp}`);
    const channelWebsite = await utils.getDataFromXpath(page, channelWebsiteXp, 'href')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelWebsite-failed'));
    console.log(`got channelWebsite as ${channelWebsite}`);

    //  console.log(`searching for channel Link 1 at ${channelLink1Xp}`);
    //const channelLink1 = await utils.getDataFromXpath(page, channelLink1Xp, 'href')
    //  .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelLink1-failed'));
    //console.log(`got channelLink1 as ${channelLink1}`);

    console.log(`searching for channel Link 1 at ${channelLink1Xp}`);
    const channelLink1Str = await utils.getDataFromXpath(page, channelLink1Xp, 'href')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelLink1-failed'));
    const channelLink1 = decodeURI(channelLink1Str);
    console.log(`got channelLink1 as ${channelLink1}`);

    console.log(`searching for channel Link 2 at ${channelLink2Xp}`);
    const channelLink2 = await utils.getDataFromXpath(page, channelLink2Xp, 'href')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelLink2-failed'));
    console.log(`got channelLink2 as ${channelLink2}`);

    console.log(`searching for channel Link 3 at ${channelLink3Xp}`);
    const channelLink3 = await utils.getDataFromXpath(page, channelLink3Xp, 'href')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelLink3-failed'));
    console.log(`got channelLink3 as ${channelLink3}`);

    console.log(`searching for channel Link 4 at ${channelLink4Xp}`);
    const channelLink4 = await utils.getDataFromXpath(page, channelLink4Xp, 'href')
        .catch((e) => utils.handleErrorAndScreenshot(page, e, 'Getting-channelLink4-failed'));
    console.log(`got channelLink4 as ${channelLink4}`);

    const channelURL = await input.url;
    const channelProfileImageURL = channelProfileImage.url;

    console.log('Finished data extraction')


    console.log('Saving output...');
    await Apify.setValue('OUTPUT', {
        channelURL,
        //title,
        channelName,
        channelSubscriberCount,
        joinedDate,
        totalViewCount,
        channelLocation,
        channelDescription,
        channelProfileImageURL,
        channelVerified,
        channelWebsite,
        channelLink1,
        channelLink2,
        channelLink3,
        channelLink4,
        verified,
    });

    console.log('Closing Puppeteer...');
    await browser.close();

    console.log('Done.');
});