/**
 * Vercel Serverless Function - Validate Invitation
 *
 * Validates an invitation by short code using Google Sheets.
 * Activates the 24-hour timer on first access.
 * NO JWT - Google Sheets is the single source of truth.
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'InvitacionesGuest';
const DURATION_HOURS = 24;
const DURATION_MS = DURATION_HOURS * 60 * 60 * 1000;

function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return new sheets_v4.Sheets({ auth });
}

/**
 * Parse invitation row from sheet
 */
function parseInvitationRow(row) {
  return {
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
    durationHours: parseInt(row[10]) || DURATION_HOURS,
    status: row[11] || 'pending',
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get short code from query (GET) or body (POST)
  const code = req.method === 'GET'
    ? req.query.code || req.query.token // Support both 'code' and legacy 'token' param
    : req.body?.code || req.body?.token;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Short code is required',
    });
  }

  try {
    const sheets = getSheetsClient();
    const now = Date.now();

    // Find invitation by short code
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:L`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[1] === code);

    if (rowIndex === -1) {
      return res.status(200).json({
        success: true,
        isValid: false,
        status: 'expired',
        error: 'Invitation not found',
      });
    }

    const invitation = parseInvitationRow(rows[rowIndex]);

    // Check if already expired
    if (invitation.status === 'expired') {
      return res.status(200).json({
        success: true,
        isValid: false,
        status: 'expired',
        error: 'This invitation has expired',
      });
    }

    // Check if activated and expired by time
    if (invitation.activatedAt && invitation.expiresAt) {
      const expiresAt = new Date(invitation.expiresAt).getTime();
      const timeRemaining = expiresAt - now;

      if (timeRemaining <= 0) {
        // Update status to expired
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!L${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['expired']] },
        });

        return res.status(200).json({
          success: true,
          isValid: false,
          status: 'expired',
          error: 'This invitation has expired',
        });
      }

      // Already activated and still valid
      return res.status(200).json({
        success: true,
        isValid: true,
        status: 'active',
        invitationId: invitation.invitationId,
        shortCode: invitation.shortCode,
        activatedAt: invitation.activatedAt,
        expiresAt: invitation.expiresAt,
        timeRemaining,
        timeRemainingMinutes: Math.ceil(timeRemaining / 60000),
        durationHours: DURATION_HOURS,
        pricingMode: invitation.pricingMode,
        createdBy: invitation.creatorName || invitation.creatorEmail,
        guestName: invitation.guestName,
      });
    }

    // First access - activate the invitation
    const activatedAt = new Date().toISOString();
    const expiresAt = new Date(now + DURATION_MS).toISOString();

    // Update sheet with activation info
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          {
            range: `'${SHEET_NAME}'!H${rowIndex + 1}`,
            values: [[activatedAt]],
          },
          {
            range: `'${SHEET_NAME}'!I${rowIndex + 1}`,
            values: [[expiresAt]],
          },
          {
            range: `'${SHEET_NAME}'!L${rowIndex + 1}`,
            values: [['active']],
          },
        ],
      },
    });

    return res.status(200).json({
      success: true,
      isValid: true,
      status: 'active',
      invitationId: invitation.invitationId,
      shortCode: invitation.shortCode,
      activatedAt,
      expiresAt,
      timeRemaining: DURATION_MS,
      timeRemainingMinutes: DURATION_HOURS * 60,
      durationHours: DURATION_HOURS,
      pricingMode: invitation.pricingMode,
      createdBy: invitation.creatorName || invitation.creatorEmail,
      guestName: invitation.guestName,
    });

  } catch (error) {
    console.error('Error validating invitation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate invitation',
      message: error.message,
    });
  }
}
