/**
 * Input Validator for YouTube Channel Scraper
 * Validates and sanitizes user inputs
 */

import { log } from 'apify';

// Valid YouTube URL patterns
const YOUTUBE_URL_PATTERNS = [
    /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+\/?$/i,
    /^https?:\/\/(www\.)?youtube\.com\/channel\/[\w-]+\/?$/i,
    /^https?:\/\/(www\.)?youtube\.com\/c\/[\w-]+\/?$/i,
    /^https?:\/\/(www\.)?youtube\.com\/user\/[\w-]+\/?$/i,
    /^@[\w-]+$/i  // Handle shorthand @username
];

/**
 * Validates a YouTube channel URL
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
export function validateChannelUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL must be a non-empty string' };
    }
    
    const trimmedUrl = url.trim();
    
    // Check if it matches any valid pattern
    const isValid = YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(trimmedUrl));
    
    if (!isValid) {
        return { 
            valid: false, 
            error: `Invalid YouTube channel URL format: ${trimmedUrl}` 
        };
    }
    
    return { valid: true, url: normalizeChannelUrl(trimmedUrl) };
}

/**
 * Normalizes a YouTube channel URL
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeChannelUrl(url) {
    let normalized = url.trim();
    
    // Handle @username format
    if (normalized.startsWith('@') && !normalized.includes('youtube.com')) {
        normalized = `https://www.youtube.com/${normalized}`;
    }
    
    // Ensure HTTPS
    if (normalized.startsWith('http://')) {
        normalized = normalized.replace('http://', 'https://');
    }
    
    // Ensure URL has protocol
    if (!normalized.startsWith('http')) {
        normalized = 'https://' + normalized;
    }
    
    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');
    
    return normalized;
}

/**
 * Validates the entire input configuration
 * @param {Object} input - Input configuration
 * @returns {Object} Validation result with sanitized input
 */
export function validateInput(input) {
    const errors = [];
    const warnings = [];
    const sanitized = { ...input };
    
    // Validate keywords
    if (sanitized.keywords) {
        if (!Array.isArray(sanitized.keywords)) {
            errors.push('keywords must be an array');
        } else {
            sanitized.keywords = sanitized.keywords
                .filter(k => typeof k === 'string' && k.trim())
                .map(k => k.trim())
                .slice(0, 100); // Limit to 100 keywords
                
            if (sanitized.keywords.length === 0 && input.keywords.length > 0) {
                warnings.push('All keywords were invalid and removed');
            }
        }
    }
    
    // Validate start URLs
    if (sanitized.startUrls) {
        if (!Array.isArray(sanitized.startUrls)) {
            errors.push('startUrls must be an array');
        } else {
            const validatedUrls = [];
            sanitized.startUrls.forEach((urlItem, index) => {
                const url = typeof urlItem === 'string' ? urlItem : urlItem?.url;
                const validation = validateChannelUrl(url);
                
                if (validation.valid) {
                    validatedUrls.push({ url: validation.url });
                } else {
                    warnings.push(`Invalid URL at index ${index}: ${validation.error}`);
                }
            });
            
            sanitized.startUrls = validatedUrls.slice(0, 10000); // Limit to 10k URLs
            
            if (validatedUrls.length > 10000) {
                warnings.push(`Start URLs limited to 10,000 (provided ${validatedUrls.length})`);
            }
        }
    }
    
    // Validate numeric parameters
    const numericParams = {
        limit: { min: 1, max: 1000, default: 5 },
        maxRequestRetries: { min: 0, max: 10, default: 3 },
        requestHandlerTimeoutSecs: { min: 10, max: 300, default: 30 },
        minConcurrency: { min: 1, max: 100, default: 1 },
        maxConcurrency: { min: 1, max: 100, default: 1 },
        maxRequestsPerCrawl: { min: 1, max: 100000, default: 100 },
        maxChannelsPerRun: { min: 1, max: 10000, default: 1000 }
    };
    
    Object.entries(numericParams).forEach(([param, config]) => {
        if (sanitized[param] !== undefined) {
            const value = Number(sanitized[param]);
            if (isNaN(value)) {
                errors.push(`${param} must be a number`);
                sanitized[param] = config.default;
            } else if (value < config.min || value > config.max) {
                warnings.push(`${param} clamped to range [${config.min}, ${config.max}]`);
                sanitized[param] = Math.max(config.min, Math.min(config.max, value));
            } else {
                sanitized[param] = value;
            }
        }
    });
    
    // Validate concurrency settings
    if (sanitized.minConcurrency > sanitized.maxConcurrency) {
        warnings.push('minConcurrency cannot be greater than maxConcurrency, swapping values');
        [sanitized.minConcurrency, sanitized.maxConcurrency] = 
            [sanitized.maxConcurrency, sanitized.minConcurrency];
    }
    
    // Validate boolean parameters
    const booleanParams = ['savePartialResults'];
    booleanParams.forEach(param => {
        if (sanitized[param] !== undefined && typeof sanitized[param] !== 'boolean') {
            sanitized[param] = Boolean(sanitized[param]);
            warnings.push(`${param} converted to boolean`);
        }
    });
    
    // Validate proxy configuration
    if (sanitized.proxyConfiguration) {
        const proxy = sanitized.proxyConfiguration;
        
        if (proxy.useApifyProxy && proxy.proxyUrls?.length > 0) {
            warnings.push('Both Apify proxy and custom proxy URLs provided, using Apify proxy');
            delete proxy.proxyUrls;
        }
        
        if (proxy.proxyUrls && !Array.isArray(proxy.proxyUrls)) {
            errors.push('proxyUrls must be an array');
            delete proxy.proxyUrls;
        }
    }
    
    // Validate CSV content
    if (sanitized.csvContent && typeof sanitized.csvContent !== 'string') {
        errors.push('csvContent must be a string');
        delete sanitized.csvContent;
    }
    
    // Check for at least one input source
    const hasKeywords = sanitized.keywords?.length > 0;
    const hasStartUrls = sanitized.startUrls?.length > 0;
    const hasCsvContent = !!sanitized.csvContent;
    
    if (!hasKeywords && !hasStartUrls && !hasCsvContent) {
        errors.push('At least one input source required (keywords, startUrls, or csvContent)');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        sanitizedInput: sanitized
    };
}

/**
 * Logs validation results
 * @param {Object} validation - Validation result
 */
export function logValidationResults(validation) {
    if (validation.errors.length > 0) {
        log.error('Input validation errors:', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
        log.warning('Input validation warnings:', validation.warnings);
    }
    
    if (validation.valid) {
        log.info('Input validation passed');
    }
}