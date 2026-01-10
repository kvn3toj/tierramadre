/**
 * Vercel Serverless Function - Short Link Lookup
 *
 * Simple lookup endpoint for short codes.
 * Used by ShortLinkRedirect to verify the code exists before redirect.
 *
 * NO JWT - Google Sheets is the single source of truth.
 */

import { google } from 'googleapis';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'InvitacionesGuest';

function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Short code is required',
    });
  }

  try {
    const sheets = getSheetsClient();

    // Find invitation by short code
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:L`,
    });

    const rows = response.data.values || [];
    const row = rows.find((r, i) => i > 0 && r[1] === code);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found',
      });
    }

    const invitation = {
      invitationId: row[0],
      shortCode: row[1],
      creatorEmail: row[2],
      creatorName: row[3],
      guestName: row[4] || null,
      guestContact: row[5] || null,
      createdAt: row[6],
      activatedAt: row[7] || null,
      expiresAt: row[8] || null,
      pricingMode: row[9] || 'with_prices',
      durationHours: 24,
      status: row[11] || 'pending',
    };

    // Check if expired
    const isExpired = invitation.status === 'expired' ||
      (invitation.expiresAt && new Date(invitation.expiresAt).getTime() < Date.now());

    return res.status(200).json({
      success: true,
      invitation,
      isExpired,
    });

  } catch (error) {
    console.error('Error in short-link lookup:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to lookup short link',
      message: error.message,
    });
  }
}
