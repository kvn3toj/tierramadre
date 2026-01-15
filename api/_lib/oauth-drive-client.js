/**
 * OAuth-based Google Drive Client
 *
 * Uses OAuth2 refresh token to create a Drive client authenticated
 * as a real user account (not Service Account). This allows uploads
 * to personal Google Drive with the user's storage quota.
 *
 * Required Environment Variables:
 * - GOOGLE_OAUTH_CLIENT_ID
 * - GOOGLE_OAUTH_CLIENT_SECRET
 * - GOOGLE_OAUTH_REFRESH_TOKEN
 */

import { OAuth2Client } from 'google-auth-library';
import { drive_v3 } from '@googleapis/drive';

// Cache the OAuth client to avoid recreating on every request
let cachedOAuthClient = null;
let cachedAccessToken = null;
let tokenExpirationTime = 0;

/**
 * Check if OAuth is properly configured
 * @returns {boolean}
 */
export function isOAuthConfigured() {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

/**
 * Clean environment variable value (remove quotes, newlines, whitespace)
 */
function cleanEnvValue(value) {
  if (!value) return value;
  return value
    .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
    .replace(/\\n/g, '')          // Remove literal \n
    .replace(/[\r\n]/g, '')       // Remove actual newlines
    .trim();
}

/**
 * Get OAuth2 client with fresh access token
 * @returns {Promise<OAuth2Client>}
 */
async function getOAuthClient() {
  const clientId = cleanEnvValue(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanEnvValue(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = cleanEnvValue(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('OAuth credentials not configured. Missing GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, or GOOGLE_OAUTH_REFRESH_TOKEN');
  }

  // Create OAuth client if not cached (always recreate to pick up env changes)
  cachedOAuthClient = new OAuth2Client(clientId, clientSecret);
  cachedOAuthClient.setCredentials({
    refresh_token: refreshToken,
  });

  // Check if we need to refresh the access token
  const now = Date.now();
  if (!cachedAccessToken || now >= tokenExpirationTime - 60000) {
    // Refresh token 1 minute before expiration
    console.log('[OAuth] Refreshing access token...');

    try {
      const { credentials } = await cachedOAuthClient.refreshAccessToken();
      cachedAccessToken = credentials.access_token;
      // Google access tokens typically expire in 1 hour (3600 seconds)
      tokenExpirationTime = credentials.expiry_date || (now + 3500000);

      cachedOAuthClient.setCredentials({
        access_token: cachedAccessToken,
        refresh_token: refreshToken,
        expiry_date: tokenExpirationTime,
      });

      console.log('[OAuth] Access token refreshed successfully');
    } catch (error) {
      console.error('[OAuth] Failed to refresh access token:', error.message);
      // Reset cache on error
      cachedOAuthClient = null;
      cachedAccessToken = null;
      tokenExpirationTime = 0;
      throw new Error(`OAuth token refresh failed: ${error.message}`);
    }
  }

  return cachedOAuthClient;
}

/**
 * Get Google Drive client authenticated via OAuth
 * This uses YOUR personal Google account, not a Service Account
 * @returns {Promise<drive_v3.Drive>}
 */
export async function getOAuthDriveClient() {
  const auth = await getOAuthClient();
  return new drive_v3.Drive({ auth });
}

/**
 * Get the email of the authenticated OAuth user
 * Useful for verifying which account is being used
 * @returns {Promise<string>}
 */
export async function getOAuthUserEmail() {
  const auth = await getOAuthClient();

  try {
    const response = await auth.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });
    return response.data.email;
  } catch (error) {
    console.error('[OAuth] Failed to get user info:', error.message);
    return null;
  }
}

/**
 * Verify OAuth configuration by attempting token refresh
 * @returns {Promise<{valid: boolean, email?: string, error?: string}>}
 */
export async function verifyOAuthConfig() {
  if (!isOAuthConfigured()) {
    return {
      valid: false,
      error: 'OAuth not configured. Missing environment variables.',
    };
  }

  try {
    // Force a fresh token refresh
    cachedAccessToken = null;
    tokenExpirationTime = 0;

    await getOAuthClient();
    const email = await getOAuthUserEmail();

    return {
      valid: true,
      email,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}
