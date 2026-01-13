/**
 * User Preferences & Feedback API
 *
 * Unified API for user preferences and feedback management.
 *
 * Actions (via query param):
 * - prefs.get: Get user preferences (GET, ?userId=X)
 * - prefs.set: Save user preferences (POST)
 * - feedback.submit: Submit new feedback (POST)
 * - feedback.list: List all feedback (GET, optional ?status=X)
 * - feedback.update: Update feedback status (POST)
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  initApi,
  sendError,
  sendSuccess,
  setCacheHeaders,
  SPREADSHEET_ID,
  SHEETS,
  CACHE,
  ensureSheet,
} from './_lib/index.js';

// =============================================================================
// FEEDBACK CONFIGURATION
// =============================================================================

const FEEDBACK_HEADERS = [
  'id', 'timestamp', 'page', 'component', 'feature', 'category', 'priority',
  'severity', 'description', 'screenshot', 'highlightBox', 'deviceType',
  'browser', 'os', 'adminEmail', 'adminName', 'status', 'notes',
  'resolvedAt', 'version', 'environment'
];

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

// =============================================================================
// USER PREFERENCES HANDLERS
// =============================================================================

async function getPreferences(sheets, userId) {
  if (!userId) {
    return { success: false, error: 'userId required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.USER_PREFERENCES}!A:B`,
  });

  const rows = response.data.values || [];
  const userRow = rows.find(row => row[0] === userId);

  if (userRow && userRow[1]) {
    try {
      const preferences = JSON.parse(userRow[1]);
      return { success: true, preferences };
    } catch {
      return { success: true, preferences: {} };
    }
  }

  return { success: true, preferences: {} };
}

async function setPreferences(sheets, userId, preferences) {
  if (!userId || !preferences) {
    return { success: false, error: 'userId and preferences required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.USER_PREFERENCES}!A:B`,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === userId);
  const prefsJson = JSON.stringify(preferences);

  if (rowIndex >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.USER_PREFERENCES}!A${rowIndex + 1}:B${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[userId, prefsJson]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.USER_PREFERENCES}!A:B`,
      valueInputOption: 'RAW',
      requestBody: { values: [[userId, prefsJson]] },
    });
  }

  return { success: true };
}

// =============================================================================
// FEEDBACK HANDLERS
// =============================================================================

async function submitFeedback(sheets, body, headers) {
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

  // Store screenshot indicator only (base64 too large for sheets)
  const hasScreenshot = screenshot ? '[HAS_SCREENSHOT]' : '';

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
    hasScreenshot,
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
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:U`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { success: true, id, timestamp: row[1] };
}

async function listFeedback(sheets, status) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:U`,
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
    item.hasScreenshot = item.screenshot === '[HAS_SCREENSHOT]';
    delete item.screenshot; // Don't send screenshot placeholder to client
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
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:U`,
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
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A${rowIndex + 2}:U${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  });

  return { success: true, id, updated: true };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  const action = req.query.action || req.body?.action || 'prefs.get';

  try {
    const sheets = getSheetsClient();

    // =========================
    // USER PREFERENCES
    // =========================

    // GET preferences
    if (req.method === 'GET' && (action === 'prefs.get' || req.query.userId)) {
      const result = await getPreferences(sheets, req.query.userId);
      return result.success ? sendSuccess(res, result) : sendError(res, 400, result.error);
    }

    // POST preferences
    if (req.method === 'POST' && action === 'prefs.set') {
      const result = await setPreferences(sheets, req.body.userId, req.body.preferences);
      return result.success ? sendSuccess(res, result) : sendError(res, 400, result.error);
    }

    // =========================
    // FEEDBACK
    // =========================

    // Ensure feedback sheet exists
    if (action.startsWith('feedback.')) {
      await ensureSheet(sheets, SHEETS.FEEDBACK, FEEDBACK_HEADERS);
    }

    // POST feedback submission
    if (req.method === 'POST' && action === 'feedback.submit') {
      const result = await submitFeedback(sheets, req.body, req.headers);
      return result.success
        ? res.status(200).json(result)
        : sendError(res, 400, result.error);
    }

    // GET feedback list
    if (req.method === 'GET' && action === 'feedback.list') {
      setCacheHeaders(res, CACHE.SHORT);
      const result = await listFeedback(sheets, req.query.status);
      return res.status(200).json(result);
    }

    // POST feedback update
    if (req.method === 'POST' && action === 'feedback.update') {
      const result = await updateFeedback(sheets, req.body.id, req.body);
      return result.success
        ? res.status(200).json(result)
        : sendError(res, 400, result.error);
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('User prefs/feedback API error:', error);
    return sendError(res, 500, error.message);
  }
}
