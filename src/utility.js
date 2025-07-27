/**
 * Utility functions for YouTube Channel Scraper
 * Provides helper functions for data extraction, formatting, and error handling
 */

import { Actor, log } from 'apify';
import { ProxyConfiguration } from 'crawlee';
import { TIMEOUTS, NUMBER_MULTIPLIERS, REGEX_PATTERNS, ERROR_MESSAGES } from './constants.js';

/**
 * Waits for an element and extracts data using CSS selector
 * @param {Object} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {string} attribute - DOM attribute to extract (e.g., 'innerText', 'src')
 * @param {number} timeout - Wait timeout in milliseconds
 * @returns {Promise<string|null>} Extracted data or null
 */
export async function getDataFromSelector(page, selector, attribute, timeout = TIMEOUTS.SELECTOR_WAIT) {
    try {
        await page.waitForSelector(selector, { timeout });
        const element = await page.$(selector);
        
        if (!element) {
            log.warning(`Selector not found: ${selector}`);
            return null;
        }
        
        return await page.evaluate((el, attr) => {
            if (!el) return null;
            if (attr === 'innerText') return el.innerText?.trim() || null;
            if (attr === 'textContent') return el.textContent?.trim() || null;
            return el[attr] || null;
        }, element, attribute);
    } catch (error) {
        log.debug(`Failed to get data from selector ${selector}: ${error.message}`);
        return null;
    }
}

/**
 * Waits for an element and extracts data using XPath
 * @param {Object} page - Puppeteer page instance
 * @param {string} xpath - XPath expression
 * @param {string} attribute - DOM attribute to extract
 * @param {number} timeout - Wait timeout in milliseconds
 * @returns {Promise<string|null>} Extracted data or null
 */
export async function getDataFromXpath(page, xpath, attribute, timeout = TIMEOUTS.SELECTOR_WAIT) {
    try {
        await page.waitForXPath(xpath, { timeout });
        const [element] = await page.$x(xpath);
        
        if (!element) {
            log.warning(`XPath not found: ${xpath}`);
            return null;
        }
        
        return await page.evaluate((el, attr) => {
            if (!el) return null;
            if (attr === 'innerText') return el.innerText?.trim() || null;
            if (attr === 'textContent') return el.textContent?.trim() || null;
            return el[attr] || null;
        }, element, attribute);
    } catch (error) {
        log.debug(`Failed to get data from xpath ${xpath}: ${error.message}`);
        return null;
    }
}

/**
 * Extracts data from a table by matching row labels
 * @param {Object} page - Puppeteer page instance
 * @param {string} tableXpath - XPath to table rows
 * @param {string} labelText - Label text to match
 * @returns {Promise<string>} Extracted value or empty string
 */
export async function getDataFromDetailsTable(page, tableXpath, labelText) {
    try {
        const rows = await page.$x(tableXpath);
        
        for (const row of rows) {
            const columns = await row.$$('td:not([hidden])');
            
            for (let i = 0; i < columns.length - 1; i += 2) {
                const label = await page.evaluate(el => el?.textContent?.trim(), columns[i]);
                
                if (label?.startsWith(labelText)) {
                    const value = await page.evaluate(el => el?.textContent?.trim(), columns[i + 1]);
                    return value || '';
                }
            }
        }
        
        return '';
    } catch (error) {
        log.debug(`Failed to extract from details table: ${error.message}`);
        return '';
    }
}

/**
 * Converts formatted number strings (1.5K, 2M, etc.) to actual numbers
 * @param {string} numStr - Formatted number string
 * @returns {number} Parsed number
 */
export function unformatNumbers(numStr) {
    if (!numStr || typeof numStr !== 'string') return 0;
    
    // Extract numeric part
    const cleanedStr = numStr.replace(REGEX_PATTERNS.NUMBER_EXTRACTION, '');
    if (!cleanedStr) return 0;
    
    // Parse the number
    const number = parseFloat(cleanedStr.replace(/,/g, ''));
    if (isNaN(number)) return 0;
    
    // Find multiplier (K, M, B, etc.)
    const multiplierMatch = numStr.match(REGEX_PATTERNS.MULTIPLIER_EXTRACTION);
    const multiplierKey = multiplierMatch?.[0]?.toUpperCase();
    
    if (multiplierKey && NUMBER_MULTIPLIERS[multiplierKey]) {
        return Math.round(number * NUMBER_MULTIPLIERS[multiplierKey]);
    }
    
    return Math.round(number);
}

/**
 * Handles errors by taking a screenshot and throwing a descriptive error
 * @param {Object} page - Puppeteer page instance
 * @param {Error} error - Original error
 * @param {string} context - Error context description
 * @throws {Error} Enhanced error with context
 */
export async function handleErrorAndScreenshot(page, error, context) {
    const screenshotKey = `ERROR-${context}-${Date.now()}`;
    
    try {
        await saveSnapshot(page, screenshotKey);
        log.error(`Error in ${context}: ${error.message}`, { screenshotKey });
    } catch (screenshotError) {
        log.error(`Failed to save error screenshot: ${screenshotError.message}`);
    }
    
    throw new Error(`${context}: ${error.message}`);
}

/**
 * Saves a full-page screenshot to Apify key-value store
 * @param {Object} page - Puppeteer page instance
 * @param {string} key - Storage key for the screenshot
 * @returns {Promise<void>}
 */
export async function saveSnapshot(page, key) {
    try {
        const screenshot = await page.screenshot({ 
            fullPage: true,
            type: 'png',
            encoding: 'binary'
        });
        
        await Actor.setValue(key, screenshot, { 
            contentType: 'image/png' 
        });
        
        log.info(`Screenshot saved: ${key}`);
    } catch (error) {
        log.error(`Failed to save screenshot ${key}: ${error.message}`);
        throw error;
    }
}

/**
 * Creates and validates proxy configuration
 * @param {Object} options - Proxy configuration options
 * @returns {Promise<ProxyConfiguration|null>} Configured proxy or null
 */
export async function createValidatedProxyConfiguration({
    proxyConfig,
    required = true,
    force = Actor.isAtHome(),
    blacklist = [],
    hint = [],
}) {
    try {
        // Return null if no proxy config provided
        if (!proxyConfig) {
            if (required && Actor.isAtHome()) {
                throw new Error(ERROR_MESSAGES.PROXY_REQUIRED);
            }
            return null;
        }
        
        // Create proxy configuration
        const configuration = await ProxyConfiguration.create(proxyConfig);
        
        // Validate configuration
        if (Actor.isAtHome() && required) {
            const hasValidProxy = configuration && (
                configuration.usesApifyProxy ||
                (configuration.proxyUrls && configuration.proxyUrls.length > 0)
            );
            
            if (!hasValidProxy || !configuration.newUrl()) {
                throw new Error(ERROR_MESSAGES.PROXY_REQUIRED);
            }
        }
        
        // Check blacklisted groups
        if (force && configuration?.usesApifyProxy && configuration.groups) {
            const blacklistedGroups = blacklist.filter(group => 
                configuration.groups.includes(group)
            );
            
            if (blacklistedGroups.length > 0) {
                throw new Error(
                    `These proxy groups cannot be used: ${blacklistedGroups.join(', ')}`
                );
            }
            
            // Suggest recommended groups
            if (hint.length > 0) {
                const hasRecommendedGroup = hint.some(group => 
                    configuration.groups.includes(group)
                );
                
                if (!hasRecommendedGroup) {
                    log.info(
                        `Consider using these proxy groups for better results: ${hint.join(', ')}`
                    );
                }
            }
        }
        
        return configuration;
    } catch (error) {
        log.error(`Proxy configuration error: ${error.message}`);
        throw error;
    }
}

/**
 * Extracts URLs with query parameters
 * @param {string[]} urls - Array of URLs to process
 * @param {string} paramName - Query parameter name to extract
 * @returns {string[]} Array of decoded parameter values
 */
export function extractUrlParameters(urls, paramName = 'q') {
    if (!Array.isArray(urls)) return [];
    
    return urls
        .map(url => {
            try {
                const urlObj = new URL(url);
                const paramValue = urlObj.searchParams.get(paramName);
                return paramValue ? decodeURIComponent(paramValue) : null;
            } catch {
                return null;
            }
        })
        .filter(value => value !== null);
}

/**
 * Filters URLs by domain patterns
 * @param {string[]} urls - Array of URLs to filter
 * @param {string[]} patterns - Domain patterns to match
 * @returns {string[]} Filtered URLs
 */
export function filterUrlsByDomain(urls, patterns) {
    if (!Array.isArray(urls) || !Array.isArray(patterns)) return [];
    
    return urls.filter(url => 
        patterns.some(pattern => url.includes(pattern))
    );
}

/**
 * Cleans URL by removing query parameters and fragments
 * @param {string} url - URL to clean
 * @returns {string} Cleaned URL
 */
export function cleanUrl(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
        return url.split('?')[0].split('#')[0];
    }
}

/**
 * Validates if a string is a valid URL
 * @param {string} str - String to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

// Legacy export for backward compatibility
export const proxyConfiguration = createValidatedProxyConfiguration;