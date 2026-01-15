/**
 * Feedback API
 *
 * Handles user feedback submission and management.
 * Stored in DEDICATED Feedback Google Sheet (not inventory sheet).
 * Screenshots stored in Google Drive: TM-Studio/feedback-app/screenshots/
 *
 * Endpoints:
 * - POST /api/feedback - Submit new feedback
 * - GET /api/feedback - List all feedback (optional ?status=X)
 * - PATCH /api/feedback - Update feedback status
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  getSharedDriveId,
  initApi,
  sendError,
  sendSuccess,
  setCacheHeaders,
  FEEDBACK_SPREADSHEET_ID,
  SHEETS,
  CACHE,
  DRIVE_FOLDERS,
} from './_lib/index.js';

import {
  isOAuthConfigured,
  getOAuthDriveClient,
} from './_lib/oauth-drive-client.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const FEEDBACK_HEADERS = [
  'id', 'timestamp', 'page', 'component', 'feature', 'category', 'priority',
  'severity', 'description', 'screenshotFileId', 'screenshotUrl', 'highlightBox',
  'deviceType', 'browser', 'os', 'adminEmail', 'adminName', 'status', 'notes',
  'resolvedAt', 'version', 'environment'
];

// =============================================================================
// HELPERS
// =============================================================================

function generateFeedbackId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FB-${datePart}-${randomPart}`;
}

function detectDevice(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  return 'Other';
}

function detectOS(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('win')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Other';
}

/**
 * Find or create a folder using OAuth Drive client
 */
async function getOrCreateFolderOAuth(drive, parentFolderId, folderName) {
  const escapedFolderName = folderName.replace(/'/g, "\\'");

  // Search for existing folder
  try {
    const searchResponse = await drive.files.list({
      q: `name='${escapedFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id;
    }
  } catch (searchError) {
    console.error(`[Feedback] Error searching for folder "${folderName}":`, searchError.message);
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  // Set public permissions for folder
  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  console.log(`[Feedback] Created folder "${folderName}": ${folder.data.id}`);
  return folder.data.id;
}

/**
 * Upload screenshot base64 to Google Drive
 * @returns {{ fileId: string, url: string } | null}
 */
async function uploadScreenshotToDrive(drive, base64Screenshot, feedbackId, sharedDriveId) {
  if (!base64Screenshot) return null;

  try {
    // Get or create feedback-app folder
    const feedbackAppFolderId = await getOrCreateFolderOAuth(
      drive,
      sharedDriveId,
      DRIVE_FOLDERS.FEEDBACK_APP
    );

    // Get or create screenshots subfolder
    const screenshotsFolderId = await getOrCreateFolderOAuth(
      drive,
      feedbackAppFolderId,
      DRIVE_FOLDERS.FEEDBACK_SCREENSHOTS
    );

    // Parse base64 data
    const matches = base64Screenshot.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.error('[Feedback] Invalid base64 screenshot format');
      return null;
    }

    const [, imageType, base64Data] = matches;
    const buffer = Buffer.from(base64Data, 'base64');
    const mimeType = `image/${imageType}`;
    const fileName = `${feedbackId}.${imageType}`;

    console.log(`[Feedback] Uploading screenshot: ${fileName} (${(buffer.length / 1024).toFixed(1)}KB)`);

    // Upload file using stream from buffer
    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const uploadedFile = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [screenshotsFolderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    // Set public permissions
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const fileId = uploadedFile.data.id;
    const url = `/api/serve-drive-image?fileId=${fileId}`;

    console.log(`[Feedback] Screenshot uploaded successfully: ${fileId}`);

    return { fileId, url };
  } catch (error) {
    console.error('[Feedback] Screenshot upload error:', error.message);
    return null;
  }
}

/**
 * Ensure the Feedback sheet exists with correct headers
 */
async function ensureFeedbackSheet(sheets) {
  try {
    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    });

    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);

    if (!sheetNames.includes(SHEETS.FEEDBACK)) {
      // Create sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: SHEETS.FEEDBACK } }
          }]
        }
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        range: `'${SHEETS.FEEDBACK}'!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [FEEDBACK_HEADERS] }
      });

      console.log(`[Feedback] Created sheet "${SHEETS.FEEDBACK}" with headers`);
    }
  } catch (error) {
    console.error('[Feedback] Error ensuring sheet exists:', error.message);
    throw error;
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function submitFeedback(sheets, drive, sharedDriveId, body, headers) {
  const {
    page, component, feature, category, priority, severity,
    description, screenshot, highlightBox, adminEmail, adminName,
    version, environment,
  } = body;

  if (!description || !category) {
    return { success: false, error: 'description and category are required' };
  }

  const id = generateFeedbackId();
  const userAgent = headers['user-agent'] || '';

  // Upload screenshot to Google Drive (if provided and OAuth is available)
  let screenshotData = { fileId: '', url: '' };
  if (screenshot && drive && sharedDriveId) {
    const uploaded = await uploadScreenshotToDrive(drive, screenshot, id, sharedDriveId);
    if (uploaded) {
      screenshotData = uploaded;
    }
  }

  const row = [
    id,
    new Date().toISOString(),
    page || '',
    component || '',
    feature || '',
    category,
    priority || 'medium',
    severity || '',
    description,
    screenshotData.fileId,  // Store file ID
    screenshotData.url,     // Store proxy URL
    highlightBox ? JSON.stringify(highlightBox) : '',
    detectDevice(userAgent),
    detectBrowser(userAgent),
    detectOS(userAgent),
    adminEmail || '',
    adminName || '',
    'open',
    '',
    '',
    version || '',
    environment || 'production',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:V`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return {
    success: true,
    id,
    timestamp: row[1],
    screenshotUploaded: !!screenshotData.fileId,
  };
}

async function listFeedback(sheets, status) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:V`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, data: [], total: 0 };
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  let feedback = dataRows.map((row, index) => {
    const item = {};
    headerRow.forEach((header, i) => {
      item[header] = row[i] || '';
    });
    item._rowIndex = index + 2; // Sheet row (1-indexed + header)

    // Determine if has screenshot based on fileId or URL
    item.hasScreenshot = !!(item.screenshotFileId || item.screenshotUrl);

    // For backwards compatibility with old data that used "[HAS_SCREENSHOT]"
    if (item.screenshot === '[HAS_SCREENSHOT]') {
      item.hasScreenshot = true;
    }

    return item;
  });

  // Filter by status if provided
  if (status && status !== 'all') {
    feedback = feedback.filter(item => item.status === status);
  }

  // Sort by timestamp descending (newest first)
  feedback.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { success: true, data: feedback, total: feedback.length };
}

async function updateFeedback(sheets, id, updates) {
  if (!id) {
    return { success: false, error: 'id is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:V`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: false, error: 'Feedback not found' };
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  // Find the row with matching ID
  const rowIndex = dataRows.findIndex(row => row[0] === id);
  if (rowIndex === -1) {
    return { success: false, error: 'Feedback not found' };
  }

  // Update the row
  const currentRow = dataRows[rowIndex];
  const updatedRow = [...currentRow];

  // Ensure row has enough columns
  while (updatedRow.length < headerRow.length) {
    updatedRow.push('');
  }

  // Apply updates
  if (updates.status) {
    const statusIndex = headerRow.indexOf('status');
    if (statusIndex >= 0) updatedRow[statusIndex] = updates.status;

    // Set resolvedAt if status is resolved
    if (updates.status === 'resolved') {
      const resolvedAtIndex = headerRow.indexOf('resolvedAt');
      if (resolvedAtIndex >= 0) updatedRow[resolvedAtIndex] = new Date().toISOString();
    }
  }

  if (updates.notes !== undefined) {
    const notesIndex = headerRow.indexOf('notes');
    if (notesIndex >= 0) updatedRow[notesIndex] = updates.notes;
  }

  // Write back to sheet (rowIndex + 2 because of header and 1-indexing)
  await sheets.spreadsheets.values.update({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A${rowIndex + 2}:V${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  });

  return { success: true, id, updated: true };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'PATCH', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  try {
    const sheets = getSheetsClient();

    // Ensure feedback sheet exists in dedicated spreadsheet
    await ensureFeedbackSheet(sheets);

    // Get OAuth Drive client for screenshot uploads (optional)
    let drive = null;
    let sharedDriveId = null;
    if (isOAuthConfigured()) {
      try {
        drive = await getOAuthDriveClient();
        sharedDriveId = getSharedDriveId();
      } catch (oauthError) {
        console.warn('[Feedback] OAuth not available, screenshots will not be uploaded:', oauthError.message);
      }
    }

    // POST - Submit new feedback
    if (req.method === 'POST') {
      const result = await submitFeedback(sheets, drive, sharedDriveId, req.body, req.headers);
      return result.success
        ? sendSuccess(res, result)
        : sendError(res, 400, result.error);
    }

    // GET - List feedback
    if (req.method === 'GET') {
      setCacheHeaders(res, CACHE.SHORT);
      const result = await listFeedback(sheets, req.query.status);
      return sendSuccess(res, result);
    }

    // PATCH - Update feedback
    if (req.method === 'PATCH') {
      const result = await updateFeedback(sheets, req.body.id, req.body);
      return result.success
        ? sendSuccess(res, result)
        : sendError(res, 400, result.error);
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('Feedback API error:', error);
    return sendError(res, 500, error.message);
  }
}
