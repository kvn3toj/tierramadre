/**
 * User Preferences API
 *
 * Stores and retrieves user preferences from Google Sheets.
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  initApi,
  sendError,
  sendSuccess,
  SPREADSHEET_ID,
  SHEETS,
} from './_lib/index.js';

const SHEET_NAME = SHEETS.USER_PREFERENCES;

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  try {
    const sheets = getSheetsClient();

    if (req.method === 'GET') {
      const { userId } = req.query;

      if (!userId) {
        return sendError(res, 400, 'userId required');
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:B`,
      });

      const rows = response.data.values || [];
      const userRow = rows.find(row => row[0] === userId);

      if (userRow && userRow[1]) {
        try {
          const preferences = JSON.parse(userRow[1]);
          return sendSuccess(res, { preferences });
        } catch {
          return sendSuccess(res, { preferences: {} });
        }
      }

      return sendSuccess(res, { preferences: {} });
    }

    if (req.method === 'POST') {
      const { userId, preferences } = req.body;

      if (!userId || !preferences) {
        return sendError(res, 400, 'userId and preferences required');
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:B`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === userId);
      const prefsJson = JSON.stringify(preferences);

      if (rowIndex >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A${rowIndex + 1}:B${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[userId, prefsJson]],
          },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:B`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[userId, prefsJson]],
          },
        });
      }

      return sendSuccess(res, {});
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('User prefs API error:', error);
    return sendError(res, 500, error.message);
  }
}
