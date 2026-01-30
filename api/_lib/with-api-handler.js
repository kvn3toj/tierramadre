/**
 * API Handler Wrapper
 *
 * Higher-order function that eliminates boilerplate across all API endpoints.
 * Handles: CORS/preflight (initApi), Google config validation, shared Drive ID
 * check, cache headers, and try/catch error responses.
 *
 * Usage:
 *   import { withApiHandler } from './_lib/with-api-handler.js';
 *
 *   export default withApiHandler(async (req, res, { sheets, drive, sharedDriveId }) => {
 *     // your logic here
 *     return sendSuccess(res, { data });
 *   }, {
 *     methods: ['GET', 'POST', 'OPTIONS'],
 *     cache: CACHE.SHORT,
 *     requireGoogle: true,        // default: true
 *     requireDriveId: false,      // default: false
 *     provideSheets: true,        // default: false — pre-creates sheets client
 *     provideDrive: false,        // default: false — pre-creates drive client
 *     provideOAuthDrive: false,   // default: false — pre-creates OAuth drive client
 *     errorPrefix: 'MyEndpoint',  // for console.error prefix (default: 'API')
 *   });
 */

import {
  getSheetsClient,
  getDriveClient,
  isGoogleConfigured,
  getSharedDriveId,
  initApi,
  sendError,
  setCacheHeaders,
} from './index.js';

import {
  isOAuthConfigured,
  getOAuthDriveClient,
} from './oauth-drive-client.js';

/**
 * @param {Function} handlerFn - async (req, res, context) => Response
 * @param {object} options - Configuration
 * @returns {Function} Vercel serverless handler
 */
export function withApiHandler(handlerFn, options = {}) {
  const {
    methods = ['GET', 'OPTIONS'],
    cache = null,
    requireGoogle = true,
    requireDriveId = false,
    provideSheets = false,
    provideDrive = false,
    provideOAuthDrive = false,
    errorPrefix = 'API',
  } = options;

  return async function handler(req, res) {
    // 1. CORS, preflight, method check
    if (initApi(req, res, { methods })) return;

    // 2. Cache headers (if specified in options)
    if (cache) {
      setCacheHeaders(res, cache);
    }

    // 3. Google config check
    if (requireGoogle && !isGoogleConfigured()) {
      return sendError(res, 500, 'Google OAuth not configured');
    }

    // 4. Shared Drive ID check
    if (requireDriveId) {
      const driveId = getSharedDriveId();
      if (!driveId) {
        return sendError(res, 500, 'Google Shared Drive ID not configured');
      }
    }

    // 5. Build context with pre-created clients
    const context = {};
    if (provideSheets) {
      context.sheets = getSheetsClient();
    }
    if (provideDrive) {
      context.drive = getDriveClient();
    }
    if (provideOAuthDrive) {
      if (isOAuthConfigured()) {
        try {
          context.oauthDrive = await getOAuthDriveClient();
        } catch (err) {
          console.warn(`[${errorPrefix}] OAuth Drive not available:`, err.message);
          context.oauthDrive = null;
        }
      } else {
        context.oauthDrive = null;
      }
    }
    context.sharedDriveId = getSharedDriveId();

    // 6. Execute handler with try/catch
    try {
      return await handlerFn(req, res, context);
    } catch (error) {
      console.error(`[${errorPrefix}] Error:`, error);
      return sendError(res, 500, 'Internal server error', error.message);
    }
  };
}
