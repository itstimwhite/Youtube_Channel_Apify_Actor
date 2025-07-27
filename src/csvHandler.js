/**
 * CSV Handler for YouTube Channel Scraper
 * Handles CSV file parsing and channel URL extraction
 */

import { log } from 'apify';
import { parse } from 'csv-parse/sync';

/**
 * Parses CSV content and extracts YouTube channel URLs
 * @param {string} csvContent - Raw CSV file content
 * @param {Object} options - Parsing options
 * @returns {Array} Array of channel URL objects
 */
export function parseCSV(csvContent, options = {}) {
    try {
        // Parse CSV with flexible options
        const records = parse(csvContent, {
            columns: true,  // Use first row as headers
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
            skip_records_with_error: true,
            ...options
        });
        
        const channelUrls = [];
        const urlPatterns = [
            /youtube\.com\/@[\w-]+/i,
            /youtube\.com\/channel\/[\w-]+/i,
            /youtube\.com\/c\/[\w-]+/i,
            /youtube\.com\/user\/[\w-]+/i
        ];
        
        // Extract URLs from each record
        records.forEach((record, index) => {
            // Look for YouTube URLs in any column
            Object.values(record).forEach(value => {
                if (typeof value === 'string') {
                    // Direct URL match
                    if (urlPatterns.some(pattern => pattern.test(value))) {
                        channelUrls.push({
                            url: normalizeChannelUrl(value),
                            metadata: { 
                                row: index + 2, // +2 because of header row and 0-index
                                source: 'csv'
                            }
                        });
                    }
                    // Handle @username format
                    else if (value.startsWith('@') && !value.includes(' ')) {
                        channelUrls.push({
                            url: `https://www.youtube.com/${value}`,
                            metadata: { 
                                row: index + 2,
                                source: 'csv'
                            }
                        });
                    }
                }
            });
        });
        
        // Remove duplicates
        const uniqueUrls = Array.from(
            new Map(channelUrls.map(item => [item.url, item])).values()
        );
        
        log.info(`Parsed ${records.length} CSV rows, found ${uniqueUrls.length} unique channel URLs`);
        return uniqueUrls;
        
    } catch (error) {
        log.error('Failed to parse CSV:', error.message);
        throw new Error(`CSV parsing failed: ${error.message}`);
    }
}

/**
 * Normalizes YouTube channel URLs to a consistent format
 * @param {string} url - Raw YouTube URL
 * @returns {string} Normalized URL
 */
function normalizeChannelUrl(url) {
    // Ensure URL has protocol
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }
    
    // Remove trailing slashes and parameters
    url = url.split('?')[0].replace(/\/+$/, '');
    
    // Ensure it's a valid YouTube URL
    if (!url.includes('youtube.com')) {
        throw new Error(`Invalid YouTube URL: ${url}`);
    }
    
    return url;
}

/**
 * Validates CSV structure and content
 * @param {string} csvContent - Raw CSV content
 * @returns {Object} Validation result
 */
export function validateCSV(csvContent) {
    try {
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            info: true
        });
        
        return {
            isValid: true,
            rowCount: records.length,
            columnCount: records[0] ? Object.keys(records[0]).length : 0,
            columns: records[0] ? Object.keys(records[0]) : []
        };
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
}

/**
 * Generates CSV template for users
 * @returns {string} CSV template content
 */
export function generateCSVTemplate() {
    return `channel_url,channel_name,notes
https://www.youtube.com/@MrBeast,MrBeast,Main channel
https://www.youtube.com/@PewDiePie,PewDiePie,Gaming channel
@Markiplier,Markiplier,Can use @ format
https://www.youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw,Another format,Channel ID format`;
}