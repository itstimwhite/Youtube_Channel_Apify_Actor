const Apify = require('apify');

exports.getDataFromSelector = async (page, selector, attrib) => {
    await page.waitForSelector(selector, { timeout: 120 });
    const element = await page.$(selector);
    return page.evaluate((el, key) => el[key], element, attrib);
};

exports.getDataFromXpath = async (page, xPath, attrib) => {
    await page.waitForXPath(xPath, { timeout: 120 });
    const xElement = await page.$x(xPath);
    return page.evaluate((el, key) => el[key], xElement[0], attrib);
};

exports.getDataFromDetailsTable = async (page, detailsTableXpath, attrib) => {
    let value = '';

    const rows = await page.$x(detailsTableXpath);
    for (const row of rows) {
        const columns = await row.$$('td:not([hidden])');
        for (let i = 0; i <= columns.length; i += 2) {
            const label = await page.evaluate(el => el?.textContent?.trim(), columns[i]);

            if (label?.startsWith(attrib)) {
                value = await page.evaluate(el => el?.textContent?.trim(), columns[i + 1]);
                break;
            }
        }
    }

    return (value);
};

exports.unformatNumbers = (numStr) => {
    const numberMatch = numStr.replace(/[^0-9,.]/ig, '');
    if (numberMatch) {
        const number = parseFloat(numberMatch.replace(/,/g, ''));
        const multiplierMatch = numStr.match(/(?<=[0-9 ])[mkb]/ig);

        if (multiplierMatch) {
            const multiplier = multiplierMatch[0].toUpperCase();
            switch (multiplier) {
                case 'K': {
                    return Math.round(number * 1000);
                }
                case 'M': {
                    return Math.round(number * 1000000);
                }
                case 'B': {
                    return Math.round(number * 1000000000);
                }
                case 'T': {
                    return Math.round(number * 1000000000000);
                }
                case 'Q': {
                    return Math.round(number * 1000000000000000);
                }
                default:
                    throw new Error('Unhandled multiplier in getExpandedNumbers');
            }
        }

        return number;
    }

    // Some videos may not have likes, views or channel subscribers
    return 0;
};

exports.handleErrorAndScreenshot = async (page, e, errorName) => {
    await Apify.utils.puppeteer.saveSnapshot(page, { key: `ERROR-${errorName}-${Math.random()}` });
    throw `Error: ${errorName} - Raw error: ${e.message}`;
};

module.exports.proxyConfiguration = async ({
                                               proxyConfig,
                                               required = true,
                                               force = Apify.isAtHome(),
                                               blacklist = [''],
                                               hint = [],
                                           }) => {
    const configuration = await Apify.createProxyConfiguration(proxyConfig);

    // This works for custom proxyUrls
    if (Apify.isAtHome() && required) {
        if (!configuration
            || (!configuration.usesApifyProxy
                && (!configuration.proxyUrls || !configuration.proxyUrls.length)) || !configuration.newUrl()) {
            throw '\n=======\nWrong Input! You must use Apify proxy or custom proxies with this scraper!\n\n=======';
        }
    }

    // Check when running on the platform by default
    if (force) {
        // Only when actually using Apify proxy it needs to be checked for the groups
        if (configuration && configuration.usesApifyProxy) {
            if (blacklist.some((blacklisted) => (configuration.groups || []).includes(blacklisted))) {
                throw '\n=======\nThese proxy groups cannot be used in this actor.'
                + `Choose other group or contact support@apify.com to give you proxy trial:\n\n*  ${blacklist.join('\n*  ')}\n\n=======`;
            }

            // Specific non-automatic proxy groups like RESIDENTIAL, not an error, just a hint
            if (hint.length && !hint.some((group) => (configuration.groups || []).includes(group))) {
                Apify.utils.log.info(`\n=======\nYou can pick specific proxy groups for better experience:\n\n*  ${hint.join('\n*  ')}\n\n=======`);
            }
        }
    }

    return configuration;
};
