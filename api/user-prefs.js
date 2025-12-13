/**
 * User Preferences API
 *
 * Stores and retrieves user preferences from Google Sheets.
 * Uses a shared Google Sheet as a simple database.
 *
 * Environment Variables Required:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_PRIVATE_KEY
 * - GOOGLE_SHEETS_USER_PREFS_ID
 */

const { google } = require('googleapis');

// Initialize Google Sheets API
const getAuth = () => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!privateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('Missing Google credentials');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_USER_PREFS_ID;
const SHEET_NAME = 'UserPreferences';

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    if (req.method === 'GET') {
      // Get user preferences
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId required' });
      }

      // Get all data from sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME + '!A:B',
      });

      const rows = response.data.values || [];

      // Find user row
      const userRow = rows.find(row => row[0] === userId);

      if (userRow && userRow[1]) {
        try {
          const preferences = JSON.parse(userRow[1]);
          return res.status(200).json({ success: true, preferences });
        } catch {
          return res.status(200).json({ success: true, preferences: {} });
        }
      }

      return res.status(200).json({ success: true, preferences: {} });
    }

    if (req.method === 'POST') {
      // Save user preferences
      const { userId, preferences } = req.body;

      if (!userId || !preferences) {
        return res.status(400).json({ error: 'userId and preferences required' });
      }

      // Get all data to find existing row
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME + '!A:B',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === userId);

      const prefsJson = JSON.stringify(preferences);

      if (rowIndex >= 0) {
        // Update existing row
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: SHEET_NAME + '!A' + (rowIndex + 1) + ':B' + (rowIndex + 1),
          valueInputOption: 'RAW',
          requestBody: {
            values: [[userId, prefsJson]],
          },
        });
      } else {
        // Append new row
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: SHEET_NAME + '!A:B',
          valueInputOption: 'RAW',
          requestBody: {
            values: [[userId, prefsJson]],
          },
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('User prefs API error:', error);
    return res.status(500).json({ error: error.message });
  }
};
