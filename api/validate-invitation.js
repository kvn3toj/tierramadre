/**
 * Vercel Serverless Function - Validate Invitation Token
 *
 * Validates an invitation token and activates the 1-hour timer on first access.
 * Returns validity status and remaining time.
 */

import { google } from 'googleapis';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const INVITATIONS_SHEET = 'Invitaciones';
const INVITATION_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get token from query params (GET) or body (POST)
  const token = req.method === 'GET' ? req.query.token : req.body?.token;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required',
    });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Google Service Account not configured',
    });
  }

  try {
    const sheets = getSheetsClient();

    // Check if Invitaciones sheet exists
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    if (!sheetNames.includes(INVITATIONS_SHEET)) {
      return res.status(404).json({
        success: false,
        isValid: false,
        error: 'Invitation not found',
      });
    }

    // Read invitations
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${INVITATIONS_SHEET}'!A:G`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return res.status(404).json({
        success: false,
        isValid: false,
        error: 'Invitation not found',
      });
    }

    // Find the invitation by token (column A)
    let invitationRowIndex = -1;
    let invitation = null;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === token) {
        invitationRowIndex = i + 1; // 1-indexed for Sheets API
        invitation = {
          token: rows[i][0],
          creatorEmail: rows[i][1],
          creatorName: rows[i][2],
          createdAt: rows[i][3],
          activatedAt: rows[i][4] || null,
          expiresAt: rows[i][5] || null,
          status: rows[i][6] || 'pending',
        };
        break;
      }
    }

    if (!invitation) {
      return res.status(404).json({
        success: false,
        isValid: false,
        error: 'Invitation not found',
      });
    }

    const now = new Date();

    // Check if already expired
    if (invitation.status === 'expired') {
      return res.status(200).json({
        success: true,
        isValid: false,
        status: 'expired',
        error: 'This invitation has expired',
      });
    }

    // If not activated yet, activate it now
    if (!invitation.activatedAt) {
      const activatedAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + INVITATION_DURATION_MS).toISOString();

      // Update the row with activation time
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${INVITATIONS_SHEET}'!E${invitationRowIndex}:G${invitationRowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[activatedAt, expiresAt, 'active']]
        }
      });

      return res.status(200).json({
        success: true,
        isValid: true,
        status: 'active',
        activatedAt,
        expiresAt,
        timeRemaining: INVITATION_DURATION_MS,
        timeRemainingMinutes: 60,
        createdBy: invitation.creatorName,
      });
    }

    // Already activated, check if still valid
    const expiresAtDate = new Date(invitation.expiresAt);
    const timeRemaining = expiresAtDate.getTime() - now.getTime();

    if (timeRemaining <= 0) {
      // Mark as expired
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${INVITATIONS_SHEET}'!G${invitationRowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [['expired']]
        }
      });

      return res.status(200).json({
        success: true,
        isValid: false,
        status: 'expired',
        error: 'This invitation has expired',
      });
    }

    // Still valid
    return res.status(200).json({
      success: true,
      isValid: true,
      status: 'active',
      activatedAt: invitation.activatedAt,
      expiresAt: invitation.expiresAt,
      timeRemaining,
      timeRemainingMinutes: Math.ceil(timeRemaining / 60000),
      createdBy: invitation.creatorName,
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
