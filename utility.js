const Apify = require('apify');
const CONSTS = require('./consts');
const utils = require('./utility.js');


exports.getDataFromXpath = async(page, xPath, attrib) => {
    await page.waitForXPath(xPath, { timeout: 120000 });
    const xElement = await page.$x(xPath);
    return page.evaluate((el, key) => el[key], xElement[0], attrib);
};

exports.getDataFromSelector = async(page, slctr, attrib) => {
    const slctrElem = await page.waitForSelector(slctr, { visible: true, timeout: 60000 });
    return page.evaluate((el, key) => el[key], slctrElem, attrib);
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
    throw `Error: ${errorName} - Raw error: ${e.message}`;
};