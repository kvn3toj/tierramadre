/**
 * Google Sheets Helper Functions
 *
 * Shared utilities for interacting with Google Sheets.
 */

import { SPREADSHEET_ID } from './constants.js';

/**
 * Get all sheet names from spreadsheet
 * @param {object} sheets - Google Sheets client
 * @returns {Promise<string[]>} Array of sheet names
 */
export async function getSheetNames(sheets) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  return metadata.data.sheets.map(s => s.properties.title);
}

/**
 * Find sheet by name pattern (case-insensitive partial match)
 * @param {string[]} sheetNames - Array of sheet names
 * @param {string[]} patterns - Patterns to match
 * @returns {string|null} Matching sheet name or null
 */
export function findSheetByPattern(sheetNames, patterns) {
  return sheetNames.find(name => {
    const lower = name.toLowerCase();
    return patterns.some(p => lower.includes(p.toLowerCase()));
  }) || null;
}

/**
 * Ensure a sheet exists, create if it doesn't
 * @param {object} sheets - Google Sheets client (with write access)
 * @param {string} sheetName - Name of sheet to ensure
 * @param {string[]} headers - Header row to add if creating
 * @returns {Promise<boolean>} True if sheet was created, false if existed
 */
export async function ensureSheet(sheets, sheetName, headers = []) {
  const sheetNames = await getSheetNames(sheets);

  if (sheetNames.includes(sheetName)) {
    return false;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        addSheet: { properties: { title: sheetName } },
      }],
    },
  });

  if (headers.length > 0) {
    const lastCol = String.fromCharCode(64 + headers.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:${lastCol}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }

  return true;
}

/**
 * Normalize a header string for comparison
 * @param {string} h - Header string
 * @returns {string} Normalized header
 */
export function normalizeHeader(h) {
  if (!h) return '';
  return String(h).toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Find column index by header name patterns
 * @param {string[]} headers - Array of header strings
 * @param {string[]} patterns - Patterns to match
 * @returns {number} Column index or -1 if not found
 */
export function findColumnIndex(headers, patterns) {
  const normalizedHeaders = headers.map(normalizeHeader);
  return normalizedHeaders.findIndex(header => {
    if (!header) return false;
    return patterns.some(pattern => {
      const p = pattern.toLowerCase();
      return header === p || header.includes(p);
    });
  });
}

/**
 * Get cell value safely with fallback
 * @param {Array} row - Row data array
 * @param {number} index - Column index
 * @param {*} fallback - Fallback value (default: '')
 * @returns {*} Cell value or fallback
 */
export function getCellValue(row, index, fallback = '') {
  if (index < 0 || !row || row[index] === undefined || row[index] === '') {
    return fallback;
  }
  return row[index];
}

/**
 * Parse price string to number
 * Handles formats like: $909,518 or $2,434,000 or 5000000
 * @param {string|number} price - Price value
 * @returns {number} Parsed price
 */
export function parsePrice(price) {
  if (!price || price === '') return 0;
  let cleaned = String(price).replace(/[$\s]/g, '');
  if (/,\d{3}/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  }
  return parseInt(cleaned, 10) || 0;
}

/**
 * Parse decimal number (handles both . and , as decimal separator)
 * @param {string|number} value - Value to parse
 * @returns {number} Parsed number
 */
export function parseDecimal(value) {
  if (!value || value === '') return 0;
  const cleaned = String(value).replace(/,/g, '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Format display name (clean whitespace)
 * @param {string} name - Name to format
 * @returns {string} Formatted name
 */
export function formatDisplayName(name) {
  return String(name || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a unique ID with prefix
 * @param {string} prefix - ID prefix (e.g., 'REQ', 'QUO', 'inv')
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Generate a random short code (6 characters, alphanumeric uppercase)
 * @returns {string} Short code
 */
export function generateShortCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
