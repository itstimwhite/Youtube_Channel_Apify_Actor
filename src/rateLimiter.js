/**
 * Rate Limiter for YouTube Channel Scraper
 * Implements adaptive rate limiting based on response patterns
 */

import { log } from 'apify';

export class AdaptiveRateLimiter {
    constructor(options = {}) {
        // Configuration
        this.minDelay = options.minDelay || 1000; // Minimum delay between requests (ms)
        this.maxDelay = options.maxDelay || 10000; // Maximum delay between requests (ms)
        this.targetSuccessRate = options.targetSuccessRate || 0.95; // Target success rate
        this.windowSize = options.windowSize || 100; // Number of requests to track
        this.adaptationRate = options.adaptationRate || 0.1; // How quickly to adapt
        
        // State
        this.currentDelay = this.minDelay;
        this.requestHistory = [];
        this.lastRequestTime = 0;
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            rateLimitHits: 0,
            averageResponseTime: 0,
            currentSuccessRate: 1.0
        };
    }
    
    /**
     * Records request outcome and adapts rate limit
     * @param {boolean} success - Whether request was successful
     * @param {number} responseTime - Response time in ms
     * @param {boolean} rateLimited - Whether request hit rate limit
     */
    recordRequest(success, responseTime, rateLimited = false) {
        const now = Date.now();
        
        // Update metrics
        this.metrics.totalRequests++;
        if (success) this.metrics.successfulRequests++;
        if (rateLimited) this.metrics.rateLimitHits++;
        
        // Update request history
        this.requestHistory.push({
            timestamp: now,
            success,
            responseTime,
            rateLimited
        });
        
        // Keep only recent history
        if (this.requestHistory.length > this.windowSize) {
            this.requestHistory.shift();
        }
        
        // Calculate current success rate
        const recentRequests = this.requestHistory.slice(-20); // Last 20 requests
        const recentSuccesses = recentRequests.filter(r => r.success).length;
        this.metrics.currentSuccessRate = recentSuccesses / recentRequests.length;
        
        // Calculate average response time
        const responseTimes = this.requestHistory
            .filter(r => r.responseTime)
            .map(r => r.responseTime);
        if (responseTimes.length > 0) {
            this.metrics.averageResponseTime = 
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }
        
        // Adapt delay based on performance
        this.adaptDelay(rateLimited);
    }
    
    /**
     * Adapts the delay based on current performance
     * @param {boolean} rateLimited - Whether last request was rate limited
     */
    adaptDelay(rateLimited) {
        if (rateLimited) {
            // Immediately increase delay if rate limited
            this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay);
            log.warning(`Rate limit hit! Increasing delay to ${this.currentDelay}ms`);
        } else if (this.metrics.currentSuccessRate < this.targetSuccessRate) {
            // Increase delay if success rate is too low
            const adjustment = 1 + this.adaptationRate;
            this.currentDelay = Math.min(this.currentDelay * adjustment, this.maxDelay);
            log.info(`Success rate low (${(this.metrics.currentSuccessRate * 100).toFixed(1)}%), increasing delay to ${this.currentDelay}ms`);
        } else if (this.metrics.currentSuccessRate >= this.targetSuccessRate && 
                   this.currentDelay > this.minDelay) {
            // Decrease delay if performing well
            const adjustment = 1 - (this.adaptationRate * 0.5); // Decrease more slowly
            this.currentDelay = Math.max(this.currentDelay * adjustment, this.minDelay);
            log.debug(`Success rate good, decreasing delay to ${this.currentDelay}ms`);
        }
        
        // Adjust based on response time
        if (this.metrics.averageResponseTime > 5000) {
            // If responses are slow, increase delay
            this.currentDelay = Math.min(this.currentDelay * 1.1, this.maxDelay);
        }
    }
    
    /**
     * Waits for the appropriate delay before next request
     * @returns {Promise<number>} Actual delay applied
     */
    async waitForNextRequest() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const remainingDelay = this.currentDelay - timeSinceLastRequest;
        
        if (remainingDelay > 0) {
            // Add small random jitter (±10%)
            const jitter = (Math.random() - 0.5) * 0.2 * remainingDelay;
            const actualDelay = Math.max(0, remainingDelay + jitter);
            
            log.debug(`Waiting ${actualDelay}ms before next request`);
            await new Promise(resolve => setTimeout(resolve, actualDelay));
            
            this.lastRequestTime = Date.now();
            return actualDelay;
        }
        
        this.lastRequestTime = now;
        return 0;
    }
    
    /**
     * Gets current metrics
     * @returns {Object} Current rate limiter metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            currentDelay: this.currentDelay,
            requestsInWindow: this.requestHistory.length
        };
    }
    
    /**
     * Resets the rate limiter state
     */
    reset() {
        this.currentDelay = this.minDelay;
        this.requestHistory = [];
        this.lastRequestTime = 0;
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            rateLimitHits: 0,
            averageResponseTime: 0,
            currentSuccessRate: 1.0
        };
    }
}

/**
 * Creates a pre-navigation hook for rate limiting
 * @param {AdaptiveRateLimiter} rateLimiter - Rate limiter instance
 * @returns {Function} Pre-navigation hook
 */
export function createRateLimitHook(rateLimiter) {
    return async ({ request }, gotoOptions) => {
        // Wait for rate limit
        const delay = await rateLimiter.waitForNextRequest();
        
        // Add delay info to request for tracking
        if (request.userData) {
            request.userData.rateLimitDelay = delay;
        }
    };
}

/**
 * Creates a function for recording request results
 * @param {AdaptiveRateLimiter} rateLimiter - Rate limiter instance
 * @returns {Function} Function to be called after request handling
 */
export function createRateLimitRecorder(rateLimiter) {
    return (success = true, responseTime = 0, rateLimited = false) => {
        rateLimiter.recordRequest(success, responseTime, rateLimited);
        
        // Log metrics periodically
        if (rateLimiter.metrics.totalRequests % 50 === 0) {
            log.info('Rate limiter metrics:', rateLimiter.getMetrics());
        }
    };
}