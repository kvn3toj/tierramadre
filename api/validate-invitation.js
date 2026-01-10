/**
 * Vercel Serverless Function - Validate Invitation Token
 *
 * Validates a JWT invitation token and activates the timer on first access.
 * Duration is fixed at 24 hours.
 * Returns validity status, remaining time, and pricing mode.
 *
 * Also updates Google Sheets status on activation.
 */

import jwt from 'jsonwebtoken';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'InvitacionesGuest';

function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return null;
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

async function updateSheetOnActivation(invitationId, activatedAt, expiresAt) {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:L`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === invitationId);

    if (rowIndex === -1) return;

    // Update ActivatedAt (H), ExpiresAt (I), Status (L)
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
  } catch (error) {
    console.error('Error updating sheet on activation:', error);
  }
}

async function updateSheetOnExpiration(invitationId) {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:L`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === invitationId);

    if (rowIndex === -1) return;

    // Update Status to expired
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!L${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['expired']] },
    });
  } catch (error) {
    console.error('Error updating sheet on expiration:', error);
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

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: 'JWT_SECRET not configured',
    });
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const now = Date.now();

    // Fixed 24-hour duration (use token value for backward compatibility if present)
    const durationHours = decoded.durationHours || 24;
    const INVITATION_DURATION_MS = durationHours * 60 * 60 * 1000;

    // Get pricing mode from token (default to 'with_prices' for legacy tokens)
    const pricingMode = decoded.pricingMode || 'with_prices';

    // Check if token is already activated (has activatedAt)
    if (decoded.activatedAt) {
      const expiresAt = new Date(decoded.expiresAt).getTime();
      const timeRemaining = expiresAt - now;

      if (timeRemaining <= 0) {
        // Token has expired - update sheet
        updateSheetOnExpiration(decoded.id);

        return res.status(200).json({
          success: true,
          isValid: false,
          status: 'expired',
          error: 'This invitation has expired',
        });
      }

      // Token is still valid
      return res.status(200).json({
        success: true,
        isValid: true,
        status: 'active',
        invitationId: decoded.id,
        activatedAt: decoded.activatedAt,
        expiresAt: decoded.expiresAt,
        timeRemaining,
        timeRemainingMinutes: Math.ceil(timeRemaining / 60000),
        durationHours,
        pricingMode,
        createdBy: decoded.creatorName || decoded.creatorEmail,
        shortCode: decoded.shortCode,
      });
    }

    // First access - activate the token
    const activatedAt = new Date().toISOString();
    const expiresAt = new Date(now + INVITATION_DURATION_MS).toISOString();

    // Update Google Sheets with activation info
    updateSheetOnActivation(decoded.id, activatedAt, expiresAt);

    // Create a new token with activation info
    // Remove iat and exp from decoded to avoid conflicts
    const { iat, exp, ...payloadWithoutTiming } = decoded;

    // Set token expiry with buffer (duration + 1 hour)
    const tokenExpiryHours = durationHours + 1;

    const activatedToken = jwt.sign(
      {
        ...payloadWithoutTiming,
        activatedAt,
        expiresAt,
      },
      process.env.JWT_SECRET,
      { expiresIn: `${tokenExpiryHours}h` }
    );

    return res.status(200).json({
      success: true,
      isValid: true,
      status: 'active',
      invitationId: decoded.id,
      activatedAt,
      expiresAt,
      timeRemaining: INVITATION_DURATION_MS,
      timeRemainingMinutes: durationHours * 60,
      durationHours,
      pricingMode,
      createdBy: decoded.creatorName || decoded.creatorEmail,
      shortCode: decoded.shortCode,
      activatedToken, // Client should use this token for subsequent validations
    });

  } catch (error) {
    console.error('Error validating invitation:', error);

    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(200).json({
        success: true,
        isValid: false,
        status: 'expired',
        error: 'This invitation has expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(200).json({
        success: true,
        isValid: false,
        status: 'expired',
        error: 'Invalid invitation link',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to validate invitation',
      message: error.message,
    });
  }
}
