const Apify = require('apify');
const CONSTS = require('./consts');
const utils = require('./utility.js');



exports.getDataFromXpath = async(page, xPath, attrib) => {
    await page.waitForXPath(xPath, { timeout: 120 });
    const xElement = await page.$x(xPath);
    return page.evaluate((el, key) => el[key], xElement[0], attrib);
};

exports.getDataFromSelector = async(page, slctr, attrib) => {
    const slctrElem = await page.waitForSelector(slctr, { visible: true, timeout: 120 });
    return page.evaluate((el, key) => el[key], slctrElem, attrib);
};

//extract an email address from the page
//use a regex to extract the email
exports.extractEmail = (text) => {
    const numberMatch = numStr.replace(/[^0-9,.]/ig, '');
    te(/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g)
};

exports.unformatNumbers = (numStr) => {
    const numberMatch = numStr.replace(/[^0-9,.]/ig, '');
    if (numberMatch) {
        const number = parseFloat(numberMatch.replace(/,/g, ''));
        const multiplierMatch = numStr.match(/(?<=[0-9 ])[mkb]/ig);

        if (multiplierMatch) {
            const multiplier = multiplierMatch[0].toUpperCase();
            switch (multiplier) {
                case 'K':
                    {
                        return Math.round(number * 1000);
                    }
                case 'M':
                    {
                        return Math.round(number * 1000000);
                    }
                case 'B':
                    {
                        return Math.round(number * 1000000000);
                    }
                case 'T':
                    {
                        return Math.round(number * 1000000000000);
                    }
                case 'Q':
                    {
                        return Math.round(number * 1000000000000000);
                    }
                default:
                    throw new Error('Unhandled multiplier in getExpandedNumbers');
            }
        }

        return number;
    }

    // some videos may not have likes, views or channel subscribers
    return 0;
};

exports.handleErrorAndScreenshot = async(page, e, errorName) => {
    await Apify.utils.puppeteer.saveSnapshot(page, { key: `ERROR-${errorName}-${Math.random()}` });
    //throw `Error: ${errorName} - Raw error: ${e.message}`;
};




//extract an instagram url from the page
//use a regex to extract the url
exports.extractInstagramUrl = async(page) => {
    const html = await page.content();
    const instagramUrl = html.match(/https:\/\/www\.instagram\.com\/[^/]+/g);
    return instagramUrl;
};

//extract a youtube url from the page
//use a regex to extract the url
exports.extractYoutubeUrl = async(page) => {
    const html = await page.content();
    const youtubeUrl = html.match(/https:\/\/www\.youtube\.com\/[^/]+/g);
    return youtubeUrl;
};

//extract a twitter url from the page
//use a regex to extract the url
exports.extractTwitterUrl = async(page) => {
    const html = await page.content();
    const twitterUrl = html.match(/https:\/\/twitter\.com\/[^/]+/g);
    return twitterUrl;
};

//extract a facebook url from the page
//use a regex to extract the url
exports.extractFacebookUrl = async(page) => {
    const html = await page.content();
    const facebookUrl = html.match(/https:\/\/www\.facebook\.com\/[^/]+/g);
    return facebookUrl;
};

//extract a linkedin url from the page
//use a regex to extract the url
exports.extractLinkedinUrl = async(page) => {
    const html = await page.content();
    const linkedinUrl = html.match(/https:\/\/www\.linkedin\.com\/[^/]+/g);
    return linkedinUrl;
};

//extract a pinterest url from the page
//use a regex to extract the url
exports.extractPinterestUrl = async(page) => {
    const html = await page.content();
    const pinterestUrl = html.match(/https:\/\/www\.pinterest\.com\/[^/]+/g);
    return pinterestUrl;
};

//extract a tumblr url from the page
//use a regex to extract the url
exports.extractTumblrUrl = async(page) => {
    const html = await page.content();
    const tumblrUrl = html.match(/https:\/\/www\.tumblr\.com\/[^/]+/g);
    return tumblrUrl;
};

//extract a reddit url from the page
//use a regex to extract the url
exports.extractRedditUrl = async(page) => {
    const html = await page.content();
    const redditUrl = html.match(/https:\/\/www\.reddit\.com\/[^/]+/g);
    return redditUrl;
};

//extract a vimeo url from the page
//use a regex to extract the url
exports.extractVimeoUrl = async(page) => {
    const html = await page.content();
    const vimeoUrl = html.match(/https:\/\/vimeo\.com\/[^/]+/g);
    return vimeoUrl;
};

//extract a tiktok url from the page
//use a regex to extract the url
exports.extractTiktokUrl = async(page) => {
    const html = await page.content();
    const tiktokUrl = html.match(/https:\/\/tiktok\.com\/[^/]+/g);
    return tiktokUrl;
};

//decode URI
exports.decodeURI = (uri) => {
    return decodeURI(uri);
};

// take input.url and append '/about' to it
exports.appendAbout = (url) => {
    return url + '/about';
};

//decode date into a date object
exports.decodeDate = (date) => {
    const dateObj = new Date(date);
    return dateObj;
};