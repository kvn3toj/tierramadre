/**
 * Vercel Serverless Function - Invitations API
 *
 * Unified API for guest invitation management.
 *
 * Actions (via query param or POST body):
 * - generate: Create a new invitation (POST)
 * - validate: Validate an invitation code (GET ?code=X)
 * - register: Register a guest with an invitation (POST)
 * - check-guest: Check if guest contact has previous invitations (GET ?guestContact=X)
 * - list-by-creator: List active/pending invitations by creator email (GET ?creatorEmail=X)
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  initApi,
  sendError,
  SPREADSHEET_ID,
  SHEETS,
  INVITATION_DURATION_HOURS,
  ensureSheet,
  generateShortCode,
} from './_lib/index.js';

const SHEET_NAME = SHEETS.INVITATIONS;
const HEADERS = [
  'invitationId', 'shortCode', 'creatorEmail', 'creatorName', 'creatorRole',
  'guestName', 'guestContact', 'contactType', 'createdAt', 'activatedAt',
  'expiresAt', 'pricingMode', 'durationHours', 'status'
];

/**
 * Find invitation by short code
 */
async function findInvitationByCode(sheets, shortCode) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:N`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] && row[1].toUpperCase() === shortCode.toUpperCase()) {
      return {
        rowIndex: i + 1,
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
    creatorEmail, creatorName, creatorRole,
    pricingMode = 'with_prices',
    guestName, guestContact, contactType,
  } = body;

  if (!creatorEmail || !creatorName) {
    return { success: false, error: 'Creator email and name are required' };
  }

  let shortCode = generateShortCode();
  let attempts = 0;
  while (await findInvitationByCode(sheets, shortCode) && attempts < 5) {
    shortCode = generateShortCode();
    attempts++;
  }

  const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();

  const row = [
    invitationId, shortCode, creatorEmail, creatorName,
    creatorRole || 'Asesor', guestName || '', guestContact || '',
    contactType || '', createdAt, '', '',
    pricingMode, INVITATION_DURATION_HOURS, 'pending',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:N`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  // Always use production URL for invitation links (not preview URLs)
  const baseUrl = 'https://tierra-madre-studio.vercel.app';

  return {
    success: true,
    invitation: {
      token: shortCode,
      url: `${baseUrl}/invite/${shortCode}`,
      shortCode,
      shortUrl: null,
      createdAt,
      durationHours: INVITATION_DURATION_HOURS,
      pricingMode,
      createdBy: { email: creatorEmail, name: creatorName, role: creatorRole || 'Asesor' },
    },
  };
}

/**
 * Validate an invitation (GET ?code=X)
 */
async function validateInvitation(sheets, shortCode) {
  if (!shortCode || shortCode.length !== 6) {
    return {
      success: false, isValid: false, status: 'expired',
      error: 'Código de invitación inválido',
    };
  }

  const invitation = await findInvitationByCode(sheets, shortCode);

  if (!invitation) {
    return {
      success: false, isValid: false, status: 'expired',
      error: 'Invitación no encontrada',
    };
  }

  const { data, rowIndex } = invitation;
  const now = new Date();

  if (data.status === 'expired') {
    return { success: true, isValid: false, status: 'expired', error: 'Esta invitación ha expirado' };
  }

  // If pending, activate it now
  if (data.status === 'pending') {
    const activatedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + data.durationHours * 60 * 60 * 1000).toISOString();

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!J${rowIndex}:N${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[activatedAt, expiresAt, data.pricingMode, data.durationHours, 'active']],
      },
    });

    const timeRemaining = data.durationHours * 60 * 60 * 1000;

    return {
      success: true, isValid: true, status: 'active',
      invitationId: data.invitationId, activatedAt, expiresAt,
      timeRemaining, timeRemainingMinutes: Math.floor(timeRemaining / 60000),
      durationHours: data.durationHours, pricingMode: data.pricingMode,
      createdBy: data.creatorName, creatorEmail: data.creatorEmail,
      shortCode: data.shortCode,
    };
  }

  // If active, check if still valid
  if (data.status === 'active' && data.expiresAt) {
    const expiresAt = new Date(data.expiresAt);
    if (now > expiresAt) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!N${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['expired']] },
      });

      return { success: true, isValid: false, status: 'expired', error: 'Esta invitación ha expirado' };
    }

    const timeRemaining = expiresAt.getTime() - now.getTime();

    return {
      success: true, isValid: true, status: 'active',
      invitationId: data.invitationId,
      activatedAt: data.activatedAt, expiresAt: data.expiresAt,
      timeRemaining, timeRemainingMinutes: Math.floor(timeRemaining / 60000),
      durationHours: data.durationHours, pricingMode: data.pricingMode,
      createdBy: data.creatorName, creatorEmail: data.creatorEmail,
      shortCode: data.shortCode,
    };
  }

  return { success: false, isValid: false, status: data.status || 'expired', error: 'Estado de invitación desconocido' };
}

/**
 * Check if a guest contact has previous invitations
 */
async function checkGuestHistory(sheets, guestContact) {
  if (!guestContact) {
    return { success: false, error: 'Guest contact is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:N`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, hasMultipleInviters: false, invitations: [] };
  }

  const normalizedContact = guestContact.toLowerCase().trim();
  const matchingInvitations = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowContact = (row[6] || '').toLowerCase().trim();

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
 * List invitations by creator email
 * Returns active/pending invitations for cotizacion client validation
 */
async function listByCreator(sheets, creatorEmail) {
  if (!creatorEmail) {
    return { success: false, error: 'creatorEmail is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:N`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, invitations: [], total: 0 };
  }

  const normalizedEmail = creatorEmail.toLowerCase().trim();
  const invitations = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowCreatorEmail = (row[2] || '').toLowerCase().trim();
    const status = row[13] || 'pending';

    // Only include invitations from this creator that are active or pending
    if (rowCreatorEmail === normalizedEmail && (status === 'active' || status === 'pending')) {
      invitations.push({
        invitationId: row[0],
        shortCode: row[1],
        guestName: row[5] || null,
        guestContact: row[6] || null,
        contactType: row[7] || null,
        status,
        createdAt: row[8],
        activatedAt: row[9] || null,
        expiresAt: row[10] || null,
        pricingMode: row[11] || 'with_prices',
      });
    }
  }

  // Sort by createdAt descending (newest first)
  invitations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    success: true,
    invitations,
    total: invitations.length,
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

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:N`,
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

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!F${rowIndex}:H${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[guestName, guestContact || '', contactType || '']],
    },
  });

  return { success: true, message: 'Guest registered successfully', guestName };
}

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google OAuth not configured');
  }

  const action = req.query.action || req.body?.action || 'validate';

  try {
    const sheets = getSheetsClient();
    await ensureSheet(sheets, SHEET_NAME, HEADERS);

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
        return sendError(res, 400, 'Code is required');
      }
      const result = await validateInvitation(sheets, code);
      return res.status(200).json(result);
    }

    // GET - Check guest history
    if (req.method === 'GET' && action === 'check-guest') {
      const guestContact = req.query.guestContact;
      if (!guestContact) {
        return sendError(res, 400, 'guestContact is required');
      }
      const result = await checkGuestHistory(sheets, guestContact);
      return res.status(200).json(result);
    }

    // GET - List invitations by creator
    if (req.method === 'GET' && action === 'list-by-creator') {
      const creatorEmail = req.query.creatorEmail;
      if (!creatorEmail) {
        return sendError(res, 400, 'creatorEmail is required');
      }
      const result = await listByCreator(sheets, creatorEmail);
      return res.status(200).json(result);
    }

    return sendError(res, 405, 'Method not allowed');

  } catch (error) {
    console.error('Error in invitations:', error);
    return sendError(res, 500, 'Failed to process request', error.message);
  }
}
