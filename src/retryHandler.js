/**
 * Retry Handler for YouTube Channel Scraper
 * Implements smart retry logic with exponential backoff
 */

import { log } from 'apify';

// Error categories that determine retry behavior
export const ERROR_TYPES = {
    RATE_LIMIT: 'RATE_LIMIT',
    TIMEOUT: 'TIMEOUT',
    NETWORK: 'NETWORK',
    CAPTCHA: 'CAPTCHA',
    NOT_FOUND: 'NOT_FOUND',
    CONSENT: 'CONSENT',
    TEMPORARY: 'TEMPORARY',
    PERMANENT: 'PERMANENT'
};

// Retry configuration per error type
export const RETRY_CONFIG = {
    [ERROR_TYPES.RATE_LIMIT]: {
        maxRetries: 5,
        initialDelay: 5000,
        maxDelay: 60000,
        backoffFactor: 2
    },
    [ERROR_TYPES.TIMEOUT]: {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        backoffFactor: 1.5
    },
    [ERROR_TYPES.NETWORK]: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffFactor: 1.5
    },
    [ERROR_TYPES.CAPTCHA]: {
        maxRetries: 0, // Don't retry, needs session rotation
        initialDelay: 0,
        maxDelay: 0,
        backoffFactor: 0
    },
    [ERROR_TYPES.NOT_FOUND]: {
        maxRetries: 0, // Don't retry 404s
        initialDelay: 0,
        maxDelay: 0,
        backoffFactor: 0
    },
    [ERROR_TYPES.CONSENT]: {
        maxRetries: 1, // Retry once after handling consent
        initialDelay: 1000,
        maxDelay: 1000,
        backoffFactor: 1
    },
    [ERROR_TYPES.TEMPORARY]: {
        maxRetries: 2,
        initialDelay: 3000,
        maxDelay: 10000,
        backoffFactor: 2
    }
};

/**
 * Classifies error type based on error message and response
 * @param {Error} error - The error object
 * @param {Object} response - HTTP response object
 * @returns {string} Error type constant
 */
export function classifyError(error, response) {
    const message = error.message?.toLowerCase() || '';
    const statusCode = response?.status?.() || 0;
    
    // Check status codes first
    if (statusCode === 429) {
        return ERROR_TYPES.RATE_LIMIT;
    }
    if (statusCode === 404) {
        return ERROR_TYPES.NOT_FOUND;
    }
    if (statusCode >= 500) {
        return ERROR_TYPES.TEMPORARY;
    }
    
    // Check error messages
    if (message.includes('captcha')) {
        return ERROR_TYPES.CAPTCHA;
    }
    if (message.includes('consent')) {
        return ERROR_TYPES.CONSENT;
    }
    if (message.includes('timeout') || message.includes('navigation timeout')) {
        return ERROR_TYPES.TIMEOUT;
    }
    if (message.includes('net::') || message.includes('network') || message.includes('connection')) {
        return ERROR_TYPES.NETWORK;
    }
    if (message.includes('too many requests') || message.includes('rate limit')) {
        return ERROR_TYPES.RATE_LIMIT;
    }
    
    // Default to temporary error
    return ERROR_TYPES.TEMPORARY;
}

/**
 * Calculates retry delay with exponential backoff
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
export function calculateRetryDelay(attempt, config) {
    const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
}

/**
 * Determines if error should be retried
 * @param {Error} error - The error object
 * @param {Object} response - HTTP response object
 * @param {number} attempt - Current attempt number
 * @returns {Object} Retry decision with delay
 */
export function shouldRetry(error, response, attempt = 0) {
    const errorType = classifyError(error, response);
    const config = RETRY_CONFIG[errorType];
    
    if (!config || attempt >= config.maxRetries) {
        return { 
            retry: false, 
            errorType,
            reason: !config ? 'No retry config' : 'Max retries reached'
        };
    }
    
    const delay = calculateRetryDelay(attempt, config);
    
    return {
        retry: true,
        errorType,
        delay,
        attempt: attempt + 1,
        maxRetries: config.maxRetries
    };
}

/**
 * Handles request retry with logging
 * @param {Object} request - The request object
 * @param {Error} error - The error that occurred
 * @param {Object} response - HTTP response object
 * @returns {Object} Retry instructions
 */
export function handleRequestRetry(request, error, response) {
    const retryCount = request.retryCount || 0;
    const decision = shouldRetry(error, response, retryCount);
    
    if (decision.retry) {
        log.warning(`Error on ${request.url}: ${error.message}`, {
            errorType: decision.errorType,
            attempt: decision.attempt,
            maxRetries: decision.maxRetries,
            retryDelay: decision.delay
        });
        
        return {
            ...request,
            retryCount: decision.attempt,
            uniqueKey: `${request.url}-retry-${decision.attempt}`,
            userData: {
                ...request.userData,
                lastError: error.message,
                lastErrorType: decision.errorType,
                retryAt: new Date(Date.now() + decision.delay).toISOString()
            }
        };
    } else {
        log.error(`Failed permanently on ${request.url}: ${error.message}`, {
            errorType: decision.errorType,
            reason: decision.reason,
            attempts: retryCount + 1
        });
        
        return null; // Don't retry
    }
}

/**
 * Creates a retry-aware request handler wrapper
 * @param {Function} handler - Original request handler
 * @returns {Function} Wrapped handler with retry logic
 */
export function withRetryHandler(handler) {
    return async (context) => {
        const { request, response, crawler } = context;
        
        try {
            await handler(context);
        } catch (error) {
            const retryRequest = handleRequestRetry(request, error, response);
            
            if (retryRequest && retryRequest.userData.retryAt) {
                // Calculate delay
                const delay = new Date(retryRequest.userData.retryAt) - Date.now();
                
                // Add request back to queue after delay
                setTimeout(async () => {
                    try {
                        await crawler.requestQueue.addRequest(retryRequest, { forefront: true });
                        log.info(`Retrying ${retryRequest.url} after ${delay}ms delay`);
                    } catch (queueError) {
                        log.error(`Failed to re-queue request: ${queueError.message}`);
                    }
                }, delay);
            } else {
                // Log final failure
                await logFailedRequest(request, error);
            }
            
            // Don't throw the error to prevent default retry behavior
            // The request will be handled by our custom retry logic
        }
    };
}

/**
 * Logs failed requests for analysis
 * @param {Object} request - The failed request
 * @param {Error} error - The final error
 */
async function logFailedRequest(request, error) {
    const failedRequest = {
        url: request.url,
        error: error.message,
        errorType: classifyError(error),
        attempts: (request.retryCount || 0) + 1,
        timestamp: new Date().toISOString(),
        userData: request.userData
    };
    
    // Save to key-value store for analysis
    try {
        const store = await Actor.openKeyValueStore();
        const failedRequests = await store.getValue('FAILED_REQUESTS') || [];
        failedRequests.push(failedRequest);
        await store.setValue('FAILED_REQUESTS', failedRequests);
    } catch (storeError) {
        log.error('Failed to log failed request:', storeError.message);
    }
}