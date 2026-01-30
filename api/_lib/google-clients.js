/**
 * Google API Client Factories
 *
 * Centralized initialization for Google Sheets and Drive clients.
 * Uses OAuth2 (personal account) for authentication.
 *
 * Required Environment Variables:
 * - GOOGLE_OAUTH_CLIENT_ID
 * - GOOGLE_OAUTH_CLIENT_SECRET
 * - GOOGLE_OAUTH_REFRESH_TOKEN
 */

import { OAuth2Client } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { drive_v3 } from '@googleapis/drive';

/**
 * Clean environment variable value (remove quotes, newlines, whitespace)
 */
function cleanEnvValue(value) {
  if (!value) return value;
  return value
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '')
    .replace(/[\r\n]/g, '')
    .trim();
}

/**
 * Create OAuth2 client with refresh token credentials.
 * The OAuth2Client auto-refreshes the access token when API calls are made.
 * @returns {OAuth2Client}
 */
function getAuth() {
  const clientId = cleanEnvValue(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanEnvValue(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = cleanEnvValue(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);

  const auth = new OAuth2Client(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

/**
 * Initialize Google Sheets API client
 * @returns {sheets_v4.Sheets} Sheets client instance
 */
export function getSheetsClient() {
  return new sheets_v4.Sheets({ auth: getAuth() });
}

/**
 * Initialize Google Drive API client
 * @returns {drive_v3.Drive} Drive client instance
 */
export function getDriveClient() {
  return new drive_v3.Drive({ auth: getAuth() });
}

/**
 * Check if Google OAuth is configured
 * @returns {boolean}
 */
export function isGoogleConfigured() {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

/**
 * Get Drive parent folder ID from environment
 * For personal Drive: the folder ID containing the 'products' folder
 * @returns {string|null}
 */
export function getSharedDriveId() {
  return process.env.GOOGLE_SHARED_DRIVE_ID?.trim() || null;
}
