/**
 * Vercel Serverless Function - Register Guest Contact Information
 *
 * Records guest contact info (name, email/phone) when they first access an invitation.
 * Updates the InvitacionesGuest sheet with guest details.
 */

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

  const { invitationId, guestName, guestContact, contactType } = req.body;

  if (!invitationId) {
    return res.status(400).json({
      success: false,
      error: 'invitationId is required',
    });
  }

  if (!guestName || !guestName.trim()) {
    return res.status(400).json({
      success: false,
      error: 'guestName is required',
    });
  }

  if (!guestContact || !guestContact.trim()) {
    return res.status(400).json({
      success: false,
      error: 'guestContact (email or phone) is required',
    });
  }

  // Validate email format if contactType is email
  if (contactType === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestContact)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }
  }

  // Validate phone format if contactType is phone (basic validation)
  if (contactType === 'phone') {
    const phoneRegex = /^[\d\s\-+()]{7,20}$/;
    if (!phoneRegex.test(guestContact)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone format',
      });
    }
  }

  const sheets = getSheetsClient();

  if (!sheets) {
    return res.status(500).json({
      success: false,
      error: 'Google Service Account not configured',
    });
  }

  try {
    // Find the invitation row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:L`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === invitationId);

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found',
      });
    }

    // Format contact with type prefix for clarity
    const formattedContact = contactType === 'phone'
      ? `Tel: ${guestContact}`
      : guestContact;

    // Update GuestName (E) and GuestContact (F)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          {
            range: `'${SHEET_NAME}'!E${rowIndex + 1}`,
            values: [[guestName.trim()]],
          },
          {
            range: `'${SHEET_NAME}'!F${rowIndex + 1}`,
            values: [[formattedContact]],
          },
        ],
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Guest registered successfully',
    });

  } catch (error) {
    console.error('Error registering guest:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register guest',
      message: error.message,
    });
  }
}
