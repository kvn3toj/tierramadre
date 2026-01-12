/**
 * Vercel Serverless Function - Invitations API
 *
 * Unified API for guest invitation management.
 * Replaces: generate-invitation.js, validate-invitation.js, register-guest.js
 *
 * Actions (via query param or POST body):
 * - generate: Create a new invitation (POST)
 * - validate: Validate an invitation code (GET ?code=X)
 * - register: Register a guest with an invitation (POST)
 * - check-guest: Check if guest contact has previous invitations (GET ?guestContact=X)
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const INVITATIONS_SHEET = 'Invitations';

// Fixed 24-hour duration for all invitations
const INVITATION_DURATION_HOURS = 24;

// Headers for the Invitations sheet
const HEADERS = [
  'invitationId', 'shortCode', 'creatorEmail', 'creatorName', 'creatorRole',
  'guestName', 'guestContact', 'contactType', 'createdAt', 'activatedAt',
  'expiresAt', 'pricingMode', 'durationHours', 'status'
];

/**
 * Initialize Google Sheets API
 */
function getSheetsClient(readonly = false) {
  try {
    const cleanKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/[\s"]+/g, '');
    const credentials = JSON.parse(Buffer.from(cleanKey, 'base64').toString());

    const auth = new GoogleAuth({
      credentials,
      scopes: [readonly
        ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
        : 'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    return new sheets_v4.Sheets({ auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Generate a random short code (6 characters, alphanumeric uppercase)
 */
function generateShortCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Ensure Invitations sheet exists
 */
async function ensureSheet(sheets) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetNames = metadata.data.sheets.map(s => s.properties.title);

  if (!sheetNames.includes(INVITATIONS_SHEET)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: INVITATIONS_SHEET } },
        }],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${INVITATIONS_SHEET}'!A1:N1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }

  return true;
}

/**
 * Find invitation by short code
 */
async function findInvitationByCode(sheets, shortCode) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVITATIONS_SHEET}'!A:N`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] && row[1].toUpperCase() === shortCode.toUpperCase()) {
      return {
        rowIndex: i + 1, // 1-based for Sheets
        data: {
          invitationId: row[0],
          shortCode: row[1],
          creatorEmail: row[2],
          creatorName: row[3],
          creatorRole: row[4],
          guestName: row[5] || null,
          guestContact: row[6] || null,
          contactType: row[7] || null,
          createdAt: row[8],
          activatedAt: row[9] || null,
          expiresAt: row[10] || null,
          pricingMode: row[11] || 'with_prices',
          durationHours: parseInt(row[12]) || INVITATION_DURATION_HOURS,
          status: row[13] || 'pending',
        },
      };
    }
  }

  return null;
}

/**
 * Generate a new invitation (POST)
 */
async function generateInvitation(sheets, body) {
  const {
    creatorEmail,
    creatorName,
    creatorRole,
    pricingMode = 'with_prices',
    guestName,
    guestContact,
    contactType,
  } = body;

  if (!creatorEmail || !creatorName) {
    return { success: false, error: 'Creator email and name are required' };
  }

  // Generate unique short code
  let shortCode = generateShortCode();
  let attempts = 0;
  while (await findInvitationByCode(sheets, shortCode) && attempts < 5) {
    shortCode = generateShortCode();
    attempts++;
  }

  const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();

  const row = [
    invitationId,
    shortCode,
    creatorEmail,
    creatorName,
    creatorRole || 'Asesor',
    guestName || '',
    guestContact || '',
    contactType || '',
    createdAt,
    '', // activatedAt
    '', // expiresAt
    pricingMode,
    INVITATION_DURATION_HOURS,
    'pending',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVITATIONS_SHEET}'!A:N`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://tierra-madre-studio.vercel.app';

  return {
    success: true,
    invitation: {
      token: shortCode,
      url: `${baseUrl}/guest/${shortCode}`,
      shortCode,
      shortUrl: null, // Short URL generation could be added later
      createdAt,
      durationHours: INVITATION_DURATION_HOURS,
      pricingMode,
      createdBy: {
        email: creatorEmail,
        name: creatorName,
        role: creatorRole || 'Asesor',
      },
    },
  };
}

/**
 * Validate an invitation (GET ?code=X)
 */
async function validateInvitation(sheets, shortCode) {
  if (!shortCode || shortCode.length !== 6) {
    return {
      success: false,
      isValid: false,
      status: 'expired',
      error: 'Código de invitación inválido',
    };
  }

  const invitation = await findInvitationByCode(sheets, shortCode);

  if (!invitation) {
    return {
      success: false,
      isValid: false,
      status: 'expired',
      error: 'Invitación no encontrada',
    };
  }

  const { data, rowIndex } = invitation;
  const now = new Date();

  // Check if already expired by status
  if (data.status === 'expired') {
    return {
      success: true,
      isValid: false,
      status: 'expired',
      error: 'Esta invitación ha expirado',
    };
  }

  // If pending, activate it now
  if (data.status === 'pending') {
    const activatedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + data.durationHours * 60 * 60 * 1000).toISOString();

    // Update the row with activation time and expiry
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${INVITATIONS_SHEET}'!J${rowIndex}:N${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[activatedAt, expiresAt, data.pricingMode, data.durationHours, 'active']],
      },
    });

    const timeRemaining = data.durationHours * 60 * 60 * 1000;

    return {
      success: true,
      isValid: true,
      status: 'active',
      invitationId: data.invitationId,
      activatedAt,
      expiresAt,
      timeRemaining,
      timeRemainingMinutes: Math.floor(timeRemaining / 60000),
      durationHours: data.durationHours,
      pricingMode: data.pricingMode,
      createdBy: data.creatorName,
      creatorEmail: data.creatorEmail,
      shortCode: data.shortCode,
    };
  }

  // If active, check if still valid
  if (data.status === 'active' && data.expiresAt) {
    const expiresAt = new Date(data.expiresAt);
    if (now > expiresAt) {
      // Expired - update status
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${INVITATIONS_SHEET}'!N${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['expired']] },
      });

      return {
        success: true,
        isValid: false,
        status: 'expired',
        error: 'Esta invitación ha expirado',
      };
    }

    const timeRemaining = expiresAt.getTime() - now.getTime();

    return {
      success: true,
      isValid: true,
      status: 'active',
      invitationId: data.invitationId,
      activatedAt: data.activatedAt,
      expiresAt: data.expiresAt,
      timeRemaining,
      timeRemainingMinutes: Math.floor(timeRemaining / 60000),
      durationHours: data.durationHours,
      pricingMode: data.pricingMode,
      createdBy: data.creatorName,
      creatorEmail: data.creatorEmail,
      shortCode: data.shortCode,
    };
  }

  return {
    success: false,
    isValid: false,
    status: data.status || 'expired',
    error: 'Estado de invitación desconocido',
  };
}

/**
 * Check if a guest contact has previous invitations from different creators (GET ?guestContact=X)
 * Used to detect if a guest was invited by multiple users
 */
async function checkGuestHistory(sheets, guestContact) {
  if (!guestContact) {
    return { success: false, error: 'Guest contact is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVITATIONS_SHEET}'!A:N`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return {
      success: true,
      hasMultipleInviters: false,
      invitations: [],
    };
  }

  // Normalize contact for comparison (lowercase, trim)
  const normalizedContact = guestContact.toLowerCase().trim();

  // Find all invitations with matching guestContact
  const matchingInvitations = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowContact = (row[6] || '').toLowerCase().trim(); // Column G: guestContact

    if (rowContact === normalizedContact) {
      matchingInvitations.push({
        invitationId: row[0],
        creatorName: row[3],
        creatorEmail: row[2],
        creatorRole: row[4],
        createdAt: row[8],
        status: row[13] || 'unknown',
      });
    }
  }

  // Check for multiple unique creators
  const uniqueCreators = new Set(matchingInvitations.map(inv => inv.creatorEmail));

  return {
    success: true,
    hasMultipleInviters: uniqueCreators.size > 1,
    totalInvitations: matchingInvitations.length,
    uniqueCreators: uniqueCreators.size,
    invitations: matchingInvitations,
  };
}

/**
 * Register a guest with an invitation (POST)
 */
async function registerGuest(sheets, body) {
  const { invitationId, guestName, guestContact, contactType } = body;

  if (!invitationId || !guestName) {
    return { success: false, error: 'Invitation ID and guest name are required' };
  }

  // Find the invitation by ID
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVITATIONS_SHEET}'!A:N`,
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === invitationId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Invitación no encontrada' };
  }

  // Update guest info
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVITATIONS_SHEET}'!F${rowIndex}:H${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[guestName, guestContact || '', contactType || '']],
    },
  });

  return {
    success: true,
    message: 'Guest registered successfully',
    guestName,
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({ success: false, error: 'Google Service Account not configured' });
  }

  const action = req.query.action || req.body?.action || 'validate';

  try {
    // Always use write scope since ensureSheet may need to create the sheet
    const sheets = getSheetsClient(false);
    await ensureSheet(sheets);

    // POST - Generate invitation
    if (req.method === 'POST' && action === 'generate') {
      const result = await generateInvitation(sheets, req.body);
      return res.status(200).json(result);
    }

    // POST - Register guest
    if (req.method === 'POST' && action === 'register') {
      const result = await registerGuest(sheets, req.body);
      return res.status(200).json(result);
    }

    // GET - Validate invitation
    if (req.method === 'GET' && (action === 'validate' || req.query.code)) {
      const code = req.query.code || req.query.shortCode;
      if (!code) {
        return res.status(400).json({ success: false, error: 'Code is required' });
      }
      const result = await validateInvitation(sheets, code);
      return res.status(200).json(result);
    }

    // GET - Check guest history for duplicate invitations
    if (req.method === 'GET' && action === 'check-guest') {
      const guestContact = req.query.guestContact;
      if (!guestContact) {
        return res.status(400).json({ success: false, error: 'guestContact is required' });
      }
      const result = await checkGuestHistory(sheets, guestContact);
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in invitations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: error.message,
    });
  }
}
