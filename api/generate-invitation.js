/**
 * Vercel Serverless Function - Generate Invitation Link
 *
 * Creates a JWT invitation token for Embajadores/Admins to share.
 * The timer starts when the guest opens the link, not when created.
 * Duration is fixed at 24 hours.
 *
 * Also stores invitation data in Google Sheets for tracking and analytics.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'InvitacionesGuest';

const HEADERS = [
  'InvitationId',
  'ShortCode',
  'CreatorEmail',
  'CreatorName',
  'GuestName',
  'GuestContact',
  'CreatedAt',
  'ActivatedAt',
  'ExpiresAt',
  'PricingMode',
  'DurationHours',
  'Status',
];

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

/**
 * Generate a random short code (6 chars, alphanumeric, no confusing chars)
 */
function generateShortCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function ensureSheetExists(sheets) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetNames = metadata.data.sheets.map((s) => s.properties.title);

  if (!sheetNames.includes(SHEET_NAME)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: SHEET_NAME },
            },
          },
        ],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A1:L1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [HEADERS],
      },
    });
  }
}

async function getUniqueShortCode(sheets) {
  let shortCode = generateShortCode();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!B:B`,
    });

    const existingCodes = (response.data.values || []).flat();
    let attempts = 0;
    while (existingCodes.includes(shortCode) && attempts < 10) {
      shortCode = generateShortCode();
      attempts++;
    }
  } catch {
    // If we can't check, just use the generated code
  }

  return shortCode;
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, pricingMode = 'with_prices', guestName, guestContact, contactType } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: 'JWT_SECRET not configured',
    });
  }

  // Fixed 24-hour duration
  const duration = 24;

  // Validate pricing mode
  const validPricingModes = ['with_prices', 'no_prices'];
  const pricing = validPricingModes.includes(pricingMode) ? pricingMode : 'with_prices';

  try {
    const sheets = getSheetsClient();
    let shortCode = null;
    let shortUrl = null;

    // Generate short code and store in sheets if available
    if (sheets) {
      await ensureSheetExists(sheets);
      shortCode = await getUniqueShortCode(sheets);
    }

    const invitationId = crypto.randomUUID();
    const creatorName = email.split('@')[0];
    const createdAt = new Date().toISOString();

    // Create token payload
    const payload = {
      id: invitationId,
      creatorEmail: email,
      creatorName,
      createdAt,
      durationHours: duration,
      pricingMode: pricing,
      shortCode,
      // activatedAt and expiresAt will be set when guest first opens the link
    };

    // Sign token (7 days max lifetime for unused invitations)
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Generate the invitation URLs
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://tierra-madre-studio.vercel.app';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    if (shortCode) {
      shortUrl = `${baseUrl}/g/${shortCode}`;
    }

    // Format guest contact with type prefix if provided
    const formattedContact = guestContact
      ? (contactType === 'phone' ? `tel:${guestContact}` : guestContact)
      : '';

    // Store in Google Sheets for tracking
    if (sheets && shortCode) {
      const newRow = [
        invitationId,
        shortCode,
        email,
        creatorName,
        guestName || '', // GuestName - from creator form
        formattedContact, // GuestContact - from creator form
        createdAt,
        '', // ActivatedAt - filled on first access
        '', // ExpiresAt - calculated on activation
        pricing,
        duration,
        'pending',
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:L`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [newRow],
        },
      });
    }

    return res.status(200).json({
      success: true,
      token,
      url: inviteUrl,
      shortCode,
      shortUrl,
      createdAt,
      durationHours: duration,
      pricingMode: pricing,
      createdBy: {
        email,
        name: creatorName,
        role: 'embajador',
      },
    });

  } catch (error) {
    console.error('Error generating invitation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate invitation',
      message: error.message,
    });
  }
}
