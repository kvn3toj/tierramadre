/**
 * Health Check API
 *
 * Simple health check endpoint for monitoring and CI/CD verification.
 *
 * Endpoints:
 * - GET /api/health - Quick health check
 * - GET /api/health?detailed=true - Detailed status with service checks
 *
 * Returns:
 * - status: 'healthy' | 'degraded' | 'unhealthy'
 * - version: App version from environment
 * - timestamp: Current server time
 * - services: Connection status for Google Sheets & Drive (if detailed=true)
 */

import {
  getSheetsClient,
  getDriveClient,
  isGoogleConfigured,
  getSharedDriveId,
  initApi,
  sendSuccess,
  SPREADSHEET_ID,
} from './_lib/index.js';

// =============================================================================
// VERSION INFO
// =============================================================================

const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.APP_VERSION ||
  '2026.01.15';

// =============================================================================
// SERVICE CHECKS
// =============================================================================

async function checkSheetsConnection() {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'properties.title',
    });
    return {
      status: 'connected',
      spreadsheetTitle: response.data.properties?.title,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
}

async function checkDriveConnection() {
  try {
    const drive = getDriveClient();
    const sharedDriveId = getSharedDriveId();

    if (!sharedDriveId) {
      return {
        status: 'not_configured',
        error: 'GOOGLE_SHARED_DRIVE_ID not set',
      };
    }

    // Try to access the configured drive/folder
    try {
      // First try as Shared Drive
      await drive.drives.get({
        driveId: sharedDriveId,
        fields: 'id, name',
      });
      return {
        status: 'connected',
        type: 'shared_drive',
      };
    } catch {
      // Try as regular folder
      const folderData = await drive.files.get({
        fileId: sharedDriveId,
        fields: 'id, name',
        supportsAllDrives: true,
      });
      return {
        status: 'connected',
        type: 'folder',
        folderName: folderData.data.name,
      };
    }
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'OPTIONS'] })) return;

  const detailed = req.query.detailed === 'true';

  const response = {
    status: 'healthy',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development',
  };

  // Quick health check
  if (!detailed) {
    // Just verify Google is configured
    if (!isGoogleConfigured()) {
      response.status = 'degraded';
      response.warning = 'Google OAuth not configured';
    }
    return sendSuccess(res, response);
  }

  // Detailed health check with service connections
  response.services = {};

  // Check Google configuration
  if (!isGoogleConfigured()) {
    response.services.google = { status: 'not_configured' };
    response.status = 'degraded';
  } else {
    // Check Sheets connection
    response.services.sheets = await checkSheetsConnection();
    if (response.services.sheets.status === 'error') {
      response.status = 'degraded';
    }

    // Check Drive connection
    response.services.drive = await checkDriveConnection();
    if (response.services.drive.status === 'error') {
      response.status = 'degraded';
    }
  }

  // Overall status
  const serviceStatuses = Object.values(response.services);
  const hasError = serviceStatuses.some(s => s.status === 'error');
  const hasWarning = serviceStatuses.some(s => s.status === 'not_configured');

  if (hasError) {
    response.status = 'unhealthy';
  } else if (hasWarning) {
    response.status = 'degraded';
  }

  return sendSuccess(res, response);
}
