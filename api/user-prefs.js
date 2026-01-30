/**
 * User Preferences API
 *
 * Handles user preferences storage and retrieval.
 * Stored in Google Sheets "UserPreferences" sheet.
 *
 * Endpoints:
 * - GET /api/user-prefs?userId=X - Get user preferences
 * - POST /api/user-prefs - Save user preferences
 *
 * Note: Feedback and Product Requests have been moved to separate APIs:
 * - /api/feedback
 * - /api/product-requests
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  SPREADSHEET_ID,
  SHEETS,
  ensureSheet,
} from './_lib/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const USER_PREFERENCES_HEADERS = ['userId', 'preferences'];

// =============================================================================
// HANDLERS
// =============================================================================

async function getPreferences(sheets, userId) {
  if (!userId) {
    return { success: false, error: 'userId required' };
  }

  // Ensure sheet exists before reading
  await ensureSheet(sheets, SHEETS.USER_PREFERENCES, USER_PREFERENCES_HEADERS);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.USER_PREFERENCES}'!A:B`,
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

  // Ensure sheet exists before writing
  await ensureSheet(sheets, SHEETS.USER_PREFERENCES, USER_PREFERENCES_HEADERS);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.USER_PREFERENCES}'!A:B`,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === userId);
  const prefsJson = JSON.stringify(preferences);

  if (rowIndex >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEETS.USER_PREFERENCES}'!A${rowIndex + 1}:B${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[userId, prefsJson]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEETS.USER_PREFERENCES}'!A:B`,
      valueInputOption: 'RAW',
      requestBody: { values: [[userId, prefsJson]] },
    });
  }

  return { success: true };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default withApiHandler(async (req, res, { sheets }) => {
  // GET - Get preferences
  if (req.method === 'GET') {
    const result = await getPreferences(sheets, req.query.userId);
    return result.success
      ? sendSuccess(res, result)
      : sendError(res, 400, result.error);
  }

  // POST - Set preferences
  if (req.method === 'POST') {
    const result = await setPreferences(sheets, req.body.userId, req.body.preferences);
    return result.success
      ? sendSuccess(res, result)
      : sendError(res, 400, result.error);
  }

  return sendError(res, 405, 'Method not allowed');
}, { methods: ['GET', 'POST', 'OPTIONS'], provideSheets: true, errorPrefix: 'UserPrefs' });
