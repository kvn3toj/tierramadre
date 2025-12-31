/**
 * Vercel Serverless Function - Update Feedback Status
 *
 * Updates the status and notes of a feedback entry.
 */

import { google } from 'googleapis';

const FEEDBACK_SPREADSHEET_ID = process.env.FEEDBACK_SPREADSHEET_ID || '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';
const FEEDBACK_SHEET_NAME = 'Feedback';

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  try {
    const { id, status, notes } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Missing feedback ID',
      });
    }

    const sheets = getSheetsClient();

    // Get all rows to find the one with matching ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!A:N`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return res.status(404).json({
        error: 'Feedback not found',
      });
    }

    // Find the row with matching ID (column B = index 1)
    const headers = rows[0];
    const idIndex = headers.indexOf('id');
    const statusIndex = headers.indexOf('status');
    const resolvedAtIndex = headers.indexOf('resolvedAt');
    const notesIndex = headers.indexOf('notes');

    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] === id) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return res.status(404).json({
        error: 'Feedback not found',
        id,
      });
    }

    // Prepare updates
    const updates = [];

    if (status) {
      // Update status (column L = 12, 1-indexed)
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${String.fromCharCode(65 + statusIndex)}${targetRowIndex + 1}`,
        values: [[status]],
      });

      // If resolved, set resolvedAt timestamp
      if (status === 'resolved' || status === 'wontfix') {
        updates.push({
          range: `${FEEDBACK_SHEET_NAME}!${String.fromCharCode(65 + resolvedAtIndex)}${targetRowIndex + 1}`,
          values: [[new Date().toISOString()]],
        });
      }
    }

    if (notes !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${String.fromCharCode(65 + notesIndex)}${targetRowIndex + 1}`,
        values: [[notes]],
      });
    }

    // Apply updates
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        resource: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });
    }

    console.log(`Feedback ${id} updated: status=${status}, notes=${notes ? 'updated' : 'unchanged'}`);

    return res.status(200).json({
      success: true,
      id,
      message: 'Feedback updated successfully',
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return res.status(500).json({
      error: 'Failed to update feedback',
      message: error.message,
    });
  }
}
