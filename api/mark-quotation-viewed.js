/**
 * Vercel Serverless Function - Mark Quotation as Viewed
 *
 * Marks a provider quotation as viewed by admin.
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'CotizacionesProveedor';

function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return new sheets_v4.Sheets({ auth });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Google Service Account not configured',
    });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Quotation ID is required',
    });
  }

  try {
    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:P`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Quotation not found',
      });
    }

    // Mark as viewed
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!O${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['TRUE']] },
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error marking quotation as viewed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark quotation as viewed',
      message: error.message,
    });
  }
}
