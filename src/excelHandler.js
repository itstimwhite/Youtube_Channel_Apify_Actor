/**
 * Excel Handler for YouTube Channel Scraper
 * Handles Excel file parsing and channel URL extraction
 */

import { log } from 'apify';
import XLSX from 'xlsx';

/**
 * Parses Excel content and extracts YouTube channel URLs
 * @param {Buffer} excelBuffer - Excel file buffer
 * @param {Object} options - Parsing options
 * @returns {Array} Array of channel URL objects
 */
export function parseExcel(excelBuffer, options = {}) {
    try {
        // Read the workbook
        const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
        
        // Get the first sheet by default, or specified sheet
        const sheetName = options.sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
            throw new Error(`Sheet "${sheetName}" not found in Excel file`);
        }
        
        // Convert to JSON
        const records = XLSX.utils.sheet_to_json(worksheet, {
            header: options.header || 1,  // Use first row as header by default
            defval: '',  // Default value for empty cells
            blankrows: false  // Skip blank rows
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
                if (typeof value === 'string' && value.trim()) {
                    const trimmedValue = value.trim();
                    
                    // Direct URL match
                    if (urlPatterns.some(pattern => pattern.test(trimmedValue))) {
                        channelUrls.push({
                            url: normalizeChannelUrl(trimmedValue),
                            metadata: { 
                                row: index + 2,  // +2 for header and 0-index
                                sheet: sheetName,
                                source: 'excel'
                            }
                        });
                    }
                    // Handle @username format
                    else if (trimmedValue.startsWith('@') && !trimmedValue.includes(' ')) {
                        channelUrls.push({
                            url: `https://www.youtube.com/${trimmedValue}`,
                            metadata: { 
                                row: index + 2,
                                sheet: sheetName,
                                source: 'excel'
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
        
        log.info(`Parsed ${records.length} Excel rows from sheet "${sheetName}", found ${uniqueUrls.length} unique channel URLs`);
        return uniqueUrls;
        
    } catch (error) {
        log.error('Failed to parse Excel:', error.message);
        throw new Error(`Excel parsing failed: ${error.message}`);
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
 * Validates Excel structure and content
 * @param {Buffer} excelBuffer - Excel file buffer
 * @returns {Object} Validation result
 */
export function validateExcel(excelBuffer) {
    try {
        const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
        const sheets = workbook.SheetNames;
        const sheetInfo = {};
        
        sheets.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            const rowCount = range.e.r - range.s.r + 1;
            const colCount = range.e.c - range.s.c + 1;
            
            sheetInfo[sheetName] = {
                rowCount,
                colCount,
                hasData: rowCount > 0 && colCount > 0
            };
        });
        
        return {
            isValid: true,
            sheetCount: sheets.length,
            sheets: sheets,
            sheetInfo: sheetInfo
        };
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
}

/**
 * Generates Excel template for users
 * @returns {Buffer} Excel file buffer
 */
export function generateExcelTemplate() {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Create sample data
    const data = [
        ['channel_url', 'channel_name', 'notes'],
        ['https://www.youtube.com/@MrBeast', 'MrBeast', 'Main channel'],
        ['https://www.youtube.com/@PewDiePie', 'PewDiePie', 'Gaming channel'],
        ['@Markiplier', 'Markiplier', 'Can use @ format'],
        ['https://www.youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw', 'Another format', 'Channel ID format']
    ];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'YouTube Channels');
    
    // Write to buffer
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}