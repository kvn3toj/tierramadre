/**
 * Google API Client Factories
 *
 * Centralized initialization for Google Sheets and Drive clients.
 * Reduces duplication across API files.
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { drive_v3 } from '@googleapis/drive';

/**
 * Parse and return Google Service Account credentials from environment
 * @returns {object} Parsed credentials object
 * @throws {Error} If credentials are missing or invalid
 */
export function getCredentials() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable not configured');
  }

  try {
    const cleanKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/[\s"]+/g, '');
    return JSON.parse(Buffer.from(cleanKey, 'base64').toString());
  } catch (error) {
    console.error('Error parsing Google credentials:', error);
    throw new Error('Failed to parse Google Service Account credentials');
  }
}

/**
 * Initialize Google Sheets API client
 * @param {boolean} readonly - If true, use readonly scope (default: false)
 * @returns {sheets_v4.Sheets} Sheets client instance
 */
export function getSheetsClient(readonly = false) {
  const credentials = getCredentials();

  const auth = new GoogleAuth({
    credentials,
    scopes: [
      readonly
        ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
        : 'https://www.googleapis.com/auth/spreadsheets'
    ],
  });

  return new sheets_v4.Sheets({ auth });
}

/**
 * Initialize Google Drive API client
 * @param {boolean} readonly - If true, use readonly scope (default: true)
 * @returns {drive_v3.Drive} Drive client instance
 */
export function getDriveClient(readonly = true) {
  const credentials = getCredentials();

  const auth = new GoogleAuth({
    credentials,
    scopes: [
      readonly
        ? 'https://www.googleapis.com/auth/drive.readonly'
        : 'https://www.googleapis.com/auth/drive.file'
    ],
  });

  return new drive_v3.Drive({ auth });
}

/**
 * Check if Google Service Account is configured
 * @returns {boolean}
 */
export function isGoogleConfigured() {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
}

/**
 * Get Shared Drive ID from environment
 * @returns {string|null}
 */
export function getSharedDriveId() {
  return process.env.GOOGLE_SHARED_DRIVE_ID?.trim() || null;
}
