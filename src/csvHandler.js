/**
 * Batch Import Handler for YouTube Channel Scraper
 * Handles multiple text formats for channel URL extraction:
 * - Simple text files (one URL per line)
 * - CSV files (with or without headers)
 * - Tab-separated values (TSV)
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
        const channelUrls = [];
        const urlPatterns = [
            /youtube\.com\/@[\w-]+/i,
            /youtube\.com\/channel\/[\w-]+/i,
            /youtube\.com\/c\/[\w-]+/i,
            /youtube\.com\/user\/[\w-]+/i
        ];
        
        // First, try to detect if this is a simple text file (one URL per line)
        const lines = csvContent.trim().split('\n').map(line => line.trim());
        const isSimpleTextFile = lines.every(line => {
            // Check if each line is either empty or contains a single URL/username
            if (!line) return true;
            const hasComma = line.includes(',');
            const hasTab = line.includes('\t');
            return !hasComma && !hasTab;
        });
        
        if (isSimpleTextFile) {
            // Handle simple text file format (one URL per line)
            log.info('Detected simple text file format');
            lines.forEach((line, index) => {
                if (line) {
                    // Direct URL match
                    if (urlPatterns.some(pattern => pattern.test(line))) {
                        channelUrls.push({
                            url: normalizeChannelUrl(line),
                            metadata: { 
                                row: index + 1,
                                source: 'text'
                            }
                        });
                    }
                    // Handle @username format
                    else if (line.startsWith('@') && !line.includes(' ')) {
                        channelUrls.push({
                            url: `https://www.youtube.com/${line}`,
                            metadata: { 
                                row: index + 1,
                                source: 'text'
                            }
                        });
                    }
                }
            });
        } else {
            // Try to parse as CSV
            // Detect delimiter
            const firstLine = lines[0];
            const delimiter = firstLine.includes('\t') ? '\t' : ',';
            
            // First attempt: with headers
            let records;
            try {
                records = parse(csvContent, {
                    columns: true,  // Use first row as headers
                    skip_empty_lines: true,
                    trim: true,
                    relax_column_count: true,
                    skip_records_with_error: true,
                    delimiter: delimiter,
                    ...options
                });
            } catch (e) {
                // If parsing with headers fails, try without headers
                records = parse(csvContent, {
                    columns: false,  // No headers
                    skip_empty_lines: true,
                    trim: true,
                    relax_column_count: true,
                    skip_records_with_error: true,
                    delimiter: delimiter,
                    ...options
                });
            }
            
            // Check if first row contains URLs (indicating no headers)
            const hasUrlInFirstLine = urlPatterns.some(pattern => pattern.test(firstLine)) || 
                                       (firstLine.includes('@') && firstLine.split(',')[0].trim().startsWith('@'));
            
            // If we're parsing without headers or first line has URLs, process it
            if (hasUrlInFirstLine) {
                // Detect delimiter (comma or tab)
                const delimiter = firstLine.includes('\t') ? '\t' : ',';
                const firstLineValues = firstLine.split(delimiter).map(v => v.trim());
                firstLineValues.forEach(value => {
                    if (urlPatterns.some(pattern => pattern.test(value))) {
                        channelUrls.push({
                            url: normalizeChannelUrl(value),
                            metadata: { 
                                row: 1,
                                source: 'csv'
                            }
                        });
                    } else if (value.startsWith('@') && !value.includes(' ')) {
                        channelUrls.push({
                            url: `https://www.youtube.com/${value}`,
                            metadata: { 
                                row: 1,
                                source: 'csv'
                            }
                        });
                    }
                });
            }
            
            // Process remaining records
            records.forEach((record, index) => {
                const rowIndex = hasUrlInFirstLine ? index + 2 : index + 2;
                const values = Array.isArray(record) ? record : Object.values(record);
                
                values.forEach(value => {
                    if (typeof value === 'string' && value) {
                        // Direct URL match
                        if (urlPatterns.some(pattern => pattern.test(value))) {
                            channelUrls.push({
                                url: normalizeChannelUrl(value),
                                metadata: { 
                                    row: rowIndex,
                                    source: 'csv'
                                }
                            });
                        }
                        // Handle @username format
                        else if (value.startsWith('@') && !value.includes(' ')) {
                            channelUrls.push({
                                url: `https://www.youtube.com/${value}`,
                                metadata: { 
                                    row: rowIndex,
                                    source: 'csv'
                                }
                            });
                        }
                    }
                });
            });
        }
        
        // Remove duplicates
        const uniqueUrls = Array.from(
            new Map(channelUrls.map(item => [item.url, item])).values()
        );
        
        log.info(`Processed ${lines.length} lines, found ${uniqueUrls.length} unique channel URLs`);
        return uniqueUrls;
        
    } catch (error) {
        log.error('Failed to parse input:', error.message);
        throw new Error(`Parsing failed: ${error.message}`);
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