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

import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withApiHandler,
  sendError,
  APP_SPREADSHEET_ID,
  SHEETS,
  INVITATION_DURATION_HOURS,
  ensureSheet,
  generateShortCode,
} from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { api } from '../convex/_generated/api.js';

type Sheets = sheets_v4.Sheets;
/** POST bodies use loose JSON shapes */
type ApiBody = Record<string, unknown>;

const SHEET_NAME = SHEETS.INVITATIONS;
const HEADERS = [
  'invitationId', 'shortCode', 'creatorEmail', 'creatorName', 'creatorRole',
  'guestName', 'guestContact', 'contactType', 'createdAt', 'activatedAt',
  'expiresAt', 'pricingMode', 'durationHours', 'status', 'pin', 'boundToken',
  'guestCurrencyMode', 'guestMultiplier'
];

/**
 * Generate a 4-digit PIN code
 */
function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Generate a random device token
 */
function generateDeviceToken() {
  return 'tk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14);
}

/**
 * Sanitize guest multiplier from request body or Sheets cell.
 * Sheets returns '' for empty cells — must not coerce to 1.0.
 * Range [1.0, 4.0] must stay in sync with CurrencyContext MIN/MAX_MULTIPLIER.
 */
function sanitizeMultiplier(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(4.0, Math.max(1.0, n));
  return Math.round(clamped * 10) / 10;
}

/**
 * Verify PIN and enforce device-token binding
 */
async function verifyPin(sheets: Sheets, _req: VercelRequest, body: ApiBody) {
  const shortCode = body.shortCode as string | undefined;
  const pin = body.pin as string | number | undefined;
  const clientToken = body.deviceToken as string | undefined;

  if (!shortCode || !pin) {
    return { success: false, error: 'shortCode and pin are required' };
  }

  const invitation = await findInvitationByCode(sheets, shortCode);
  if (!invitation) {
    return { success: false, error: 'Invitación no encontrada' };
  }

  const { data, rowIndex } = invitation;

  // PIN must exist and match
  if (!data.pin || data.pin !== String(pin)) {
    return { success: true, isPinWrong: true, error: 'PIN incorrecto' };
  }

  // If token already bound, enforce match
  if (data.boundToken) {
    if (!clientToken || clientToken !== data.boundToken) {
      return { success: true, isIpBlocked: true, error: 'Acceso restringido a otro dispositivo' };
    }
  }

  // First verification — generate and bind token
  let tokenToReturn = clientToken;
  if (!data.boundToken) {
    tokenToReturn = generateDeviceToken();
    await sheets.spreadsheets.values.update({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!P${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[tokenToReturn]] },
    });
  }

  return {
    success: true,
    pinVerified: true,
    deviceToken: tokenToReturn,
    guestName: data.guestName || null,
    guestContact: data.guestContact || null,
  };
}

/**
 * Ensure pin + boundToken headers exist (auto-migration for existing sheets)
 */
async function ensureHeaders(sheets: Sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A1:R1`,
  });

  const headerRow = (res.data.values && res.data.values[0]) || [];

  // If column O (index 14) is missing or not 'pin', write pin + boundToken headers
  if (!headerRow[14] || headerRow[14] !== 'pin') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!O1:R1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['pin', 'boundToken', 'guestCurrencyMode', 'guestMultiplier']] },
    });
  }
  // If column Q (index 16) is missing, add currency columns
  else if (!headerRow[16] || headerRow[16] !== 'guestCurrencyMode') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!Q1:R1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['guestCurrencyMode', 'guestMultiplier']] },
    });
  }
}

/**
 * Find invitation by short code
 */
async function findInvitationByCode(sheets: Sheets, shortCode: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:R`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as (string | number | undefined)[];
    if (row[1] != null && String(row[1]).toUpperCase() === shortCode.toUpperCase()) {
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
          durationHours: parseInt(String(row[12] ?? ''), 10) || INVITATION_DURATION_HOURS,
          status: row[13] || 'pending',
          pin: row[14] || null,
          boundToken: row[15] || null,
          guestCurrencyMode: row[16] || null,
          guestMultiplier: sanitizeMultiplier(row[17]),
        },
      };
    }
  }

  return null;
}

/**
 * Generate a new invitation (POST)
 */
async function generateInvitation(sheets: Sheets, body: ApiBody) {
  const {
    creatorEmail,
    creatorName,
    creatorRole,
    pricingMode = 'with_prices',
    guestName,
    guestContact,
    contactType,
    guestCurrencyMode,
    guestMultiplier,
  } = body as ApiBody & {
    creatorEmail?: string;
    creatorName?: string;
    creatorRole?: string;
    pricingMode?: string;
    guestName?: string;
    guestContact?: string;
    contactType?: string;
    guestCurrencyMode?: string;
    guestMultiplier?: unknown;
  };

  if (!creatorEmail || !creatorName) {
    return { success: false, error: 'Creator email and name are required' };
  }

  let shortCode = generateShortCode();
  let attempts = 0;
  while (await findInvitationByCode(sheets, shortCode) && attempts < 5) {
    shortCode = generateShortCode();
    attempts++;
  }

  const invitationId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const createdAt = new Date().toISOString();
  const pin = generatePin();
  const safeMultiplier = sanitizeMultiplier(guestMultiplier);

  const row = [
    invitationId, shortCode, creatorEmail, creatorName,
    creatorRole || 'Asesor', guestName || '', guestContact || '',
    contactType || '', createdAt, '', '',
    pricingMode, INVITATION_DURATION_HOURS, 'pending', pin, '',
    guestCurrencyMode || '', safeMultiplier != null ? String(safeMultiplier) : '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:R`,
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
      pin,
      createdAt,
      durationHours: INVITATION_DURATION_HOURS,
      pricingMode,
      guestCurrencyMode: guestCurrencyMode || null,
      guestMultiplier: safeMultiplier,
      createdBy: { email: creatorEmail, name: creatorName, role: creatorRole || 'Asesor' },
    },
  };
}

/**
 * Validate an invitation (GET ?code=X)
 */
async function validateInvitation(sheets: Sheets, shortCode: string) {
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
      spreadsheetId: APP_SPREADSHEET_ID,
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
      guestName: data.guestName || null,
      guestContact: data.guestContact || null,
      contactType: data.contactType || null,
      isPinBound: !!(data.boundToken),
      guestCurrencyMode: data.guestCurrencyMode || null,
      guestMultiplier: data.guestMultiplier,
    };
  }

  // If active, return as valid (no time limit)
  if (data.status === 'active') {
    return {
      success: true, isValid: true, status: 'active',
      invitationId: data.invitationId,
      activatedAt: data.activatedAt, expiresAt: data.expiresAt,
      timeRemaining: null, timeRemainingMinutes: null,
      durationHours: data.durationHours, pricingMode: data.pricingMode,
      createdBy: data.creatorName, creatorEmail: data.creatorEmail,
      shortCode: data.shortCode,
      guestName: data.guestName || null,
      guestContact: data.guestContact || null,
      contactType: data.contactType || null,
      isPinBound: !!(data.boundToken),
      guestCurrencyMode: data.guestCurrencyMode || null,
      guestMultiplier: data.guestMultiplier,
    };
  }

  return { success: false, isValid: false, status: data.status || 'expired', error: 'Estado de invitación desconocido' };
}

/**
 * Check if a guest contact has previous invitations
 */
async function checkGuestHistory(sheets: Sheets, guestContact: string) {
  if (!guestContact) {
    return { success: false, error: 'Guest contact is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:R`,
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
async function listByCreator(sheets: Sheets, creatorEmail: string) {
  if (!creatorEmail) {
    return { success: false, error: 'creatorEmail is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:R`,
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
        guestCurrencyMode: row[16] || null,
        guestMultiplier: sanitizeMultiplier(row[17]),
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
async function registerGuest(sheets: Sheets, body: ApiBody) {
  const { invitationId, guestName, guestContact, contactType } = body as ApiBody & {
    invitationId?: string;
    guestName?: string;
    guestContact?: string;
    contactType?: string;
  };

  if (!invitationId || !guestName) {
    return { success: false, error: 'Invitation ID and guest name are required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:R`,
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
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!F${rowIndex}:H${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[guestName, guestContact || '', contactType || '']],
    },
  });

  return { success: true, message: 'Guest registered successfully', guestName };
}

/**
 * Update invitation fields (POST action=update)
 * Currently supports: guestMultiplier
 */
async function updateInvitation(sheets: Sheets, body: ApiBody) {
  const { shortCode, creatorEmail, fields } = body as ApiBody & {
    shortCode?: string;
    creatorEmail?: string;
    fields?: { guestMultiplier?: unknown };
  };

  if (!shortCode || !creatorEmail) {
    return { success: false, error: 'shortCode and creatorEmail are required' };
  }

  const invitation = await findInvitationByCode(sheets, shortCode);
  if (!invitation) {
    return { success: false, error: 'Invitación no encontrada' };
  }

  // Ownership check (case-insensitive)
  if (
    String(invitation.data.creatorEmail ?? '').toLowerCase().trim() !==
    creatorEmail.toLowerCase().trim()
  ) {
    return { success: false, error: 'No tienes permiso para editar esta invitación' };
  }

  // Only active/pending can be edited
  if (invitation.data.status !== 'active' && invitation.data.status !== 'pending') {
    return { success: false, error: 'Solo se pueden editar invitaciones activas o pendientes' };
  }

  // Update multiplier if provided
  if (fields?.guestMultiplier !== undefined) {
    const safe = sanitizeMultiplier(fields.guestMultiplier);
    if (safe == null) {
      return { success: false, error: 'Multiplicador inválido' };
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!R${invitation.rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(safe)]] },
    });

    return {
      success: true,
      invitation: { shortCode, guestMultiplier: safe },
    };
  }

  return { success: false, error: 'No fields to update' };
}

/**
 * Expire/revoke an invitation (POST action=expire)
 */
async function expireInvitationAction(sheets: Sheets, body: ApiBody) {
  const { shortCode, creatorEmail } = body as ApiBody & {
    shortCode?: string;
    creatorEmail?: string;
  };

  if (!shortCode || !creatorEmail) {
    return { success: false, error: 'shortCode and creatorEmail are required' };
  }

  const invitation = await findInvitationByCode(sheets, shortCode);
  if (!invitation) {
    return { success: false, error: 'Invitación no encontrada' };
  }

  // Ownership check (case-insensitive)
  if (
    String(invitation.data.creatorEmail ?? '').toLowerCase().trim() !==
    creatorEmail.toLowerCase().trim()
  ) {
    return { success: false, error: 'No tienes permiso para expirar esta invitación' };
  }

  // Already expired is a no-op success
  if (invitation.data.status === 'expired') {
    return { success: true };
  }

  // Only active/pending can be expired
  if (invitation.data.status !== 'active' && invitation.data.status !== 'pending') {
    return { success: false, error: 'Solo se pueden expirar invitaciones activas o pendientes' };
  }

  // Update K:N atomically (expiresAt, pricingMode, durationHours, status)
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!K${invitation.rowIndex}:N${invitation.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[now, invitation.data.pricingMode, invitation.data.durationHours, 'expired']] },
  });

  return { success: true };
}

export default withApiHandler(async (req: VercelRequest, res: VercelResponse, context: Record<string, unknown>) => {
  const sheets = context.sheets as Sheets;
  const action = (req.query.action as string) || (req.body as ApiBody | undefined)?.action || 'validate';

  await ensureSheet(sheets, SHEET_NAME, HEADERS, APP_SPREADSHEET_ID);

  // Auto-migrate: add pin + boundToken headers if missing on existing sheet
  await ensureHeaders(sheets);

  // POST - Generate invitation
  if (req.method === 'POST' && action === 'generate') {
    if (isConvexEnabled && convexClient) {
      const body = (req.body as ApiBody) || {};
      const { creatorEmail, creatorName, creatorRole, pricingMode, guestName, guestContact, contactType, guestCurrencyMode, guestMultiplier } = body as Record<string, unknown>;
      if (!creatorEmail || !creatorName) return sendError(res, 400, 'Creator email and name are required');
      const shortCode = generateShortCode();
      const pin = generatePin();
      const safeMultiplier = sanitizeMultiplier(guestMultiplier);
      await convexClient.mutation(api.invitations.generate, {
        creatorEmail: String(creatorEmail),
        creatorName: String(creatorName),
        creatorRole: creatorRole ? String(creatorRole) : undefined,
        pricingMode: pricingMode ? String(pricingMode) : undefined,
        guestName: guestName ? String(guestName) : undefined,
        guestContact: guestContact ? String(guestContact) : undefined,
        contactType: contactType ? String(contactType) : undefined,
        guestCurrencyMode: guestCurrencyMode ? String(guestCurrencyMode) : undefined,
        guestMultiplier: safeMultiplier ?? undefined,
        pin,
        shortCode,
      });
      const baseUrl = 'https://tierra-madre-studio.vercel.app';
      return res.status(200).json({
        success: true,
        invitation: {
          token: shortCode,
          url: `${baseUrl}/invite/${shortCode}`,
          shortCode,
          shortUrl: null,
          pin,
          createdAt: new Date().toISOString(),
          durationHours: INVITATION_DURATION_HOURS,
          pricingMode: pricingMode || 'with_prices',
          guestCurrencyMode: guestCurrencyMode || null,
          guestMultiplier: safeMultiplier,
          createdBy: { email: creatorEmail, name: creatorName, role: creatorRole || 'Asesor' },
        },
      });
    }
    const result = await generateInvitation(sheets, (req.body as ApiBody) || {});
    return res.status(200).json(result);
  }

  // POST - Verify PIN + device token binding
  if (req.method === 'POST' && action === 'verify-pin') {
    if (isConvexEnabled && convexClient) {
      const { shortCode, pin, deviceToken } = (req.body as ApiBody) || {};
      if (!shortCode || !pin) return sendError(res, 400, 'shortCode and pin are required');
      const result = await convexClient.mutation(api.invitations.verifyPin, {
        shortCode: String(shortCode),
        pin: String(pin),
        deviceToken: deviceToken ? String(deviceToken) : undefined,
      });
      return res.status(200).json(result);
    }
    const result = await verifyPin(sheets, req, (req.body as ApiBody) || {});
    return res.status(200).json(result);
  }

  // POST - Register guest
  if (req.method === 'POST' && action === 'register') {
    if (isConvexEnabled && convexClient) {
      const { invitationId, guestName, guestContact, contactType } = (req.body as ApiBody) || {};
      if (!invitationId || !guestName) return sendError(res, 400, 'Invitation ID and guest name are required');
      try {
        const result = await convexClient.mutation(api.invitations.registerGuest, {
          invitationId: String(invitationId),
          guestName: String(guestName),
          guestContact: guestContact ? String(guestContact) : undefined,
          contactType: contactType ? String(contactType) : undefined,
        });
        return res.status(200).json(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return res.status(200).json({ success: false, error: msg });
      }
    }
    const result = await registerGuest(sheets, (req.body as ApiBody) || {});
    return res.status(200).json(result);
  }

  // POST - Update invitation (multiplier, etc.)
  if (req.method === 'POST' && action === 'update') {
    if (isConvexEnabled && convexClient) {
      const body = (req.body as ApiBody) || {};
      const shortCode = body.shortCode as string | undefined;
      const creatorEmail = body.creatorEmail as string | undefined;
      const fields = body.fields as { guestMultiplier?: unknown } | undefined;
      if (!shortCode || !creatorEmail) return sendError(res, 400, 'shortCode and creatorEmail are required');
      if (fields?.guestMultiplier !== undefined) {
        try {
          const result = await convexClient.mutation(api.invitations.updateMultiplier, {
            shortCode: String(shortCode),
            creatorEmail: String(creatorEmail),
            guestMultiplier: Number(fields.guestMultiplier),
          });
          return res.status(200).json({ success: true, invitation: result });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          return res.status(200).json({ success: false, error: msg });
        }
      }
      return res.status(200).json({ success: false, error: 'No fields to update' });
    }
    const result = await updateInvitation(sheets, (req.body as ApiBody) || {});
    return res.status(200).json(result);
  }

  // POST - Expire/revoke invitation
  if (req.method === 'POST' && action === 'expire') {
    if (isConvexEnabled && convexClient) {
      const body = (req.body as ApiBody) || {};
      const shortCode = body.shortCode as string | undefined;
      const creatorEmail = body.creatorEmail as string | undefined;
      if (!shortCode || !creatorEmail) return sendError(res, 400, 'shortCode and creatorEmail are required');
      try {
        const result = await convexClient.mutation(api.invitations.expire, {
          shortCode: String(shortCode),
          creatorEmail: String(creatorEmail),
        });
        return res.status(200).json(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return res.status(200).json({ success: false, error: msg });
      }
    }
    const result = await expireInvitationAction(sheets, (req.body as ApiBody) || {});
    return res.status(200).json(result);
  }

  // GET - Validate invitation
  if (req.method === 'GET' && (action === 'validate' || req.query.code)) {
    const rawCode = req.query.code ?? req.query.shortCode;
    const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
    if (!code || typeof code !== 'string') {
      return sendError(res, 400, 'Code is required');
    }
    if (isConvexEnabled && convexClient) {
      const inv = await convexClient.query(api.invitations.getByShortCode, { shortCode: code });
      if (!inv) return res.status(200).json({ success: false, isValid: false, status: 'expired', error: 'Invitacion no encontrada' });
      if (inv.status === 'expired') return res.status(200).json({ success: true, isValid: false, status: 'expired', error: 'Esta invitacion ha expirado' });
      if (inv.status === 'pending') {
        const activated = await convexClient.mutation(api.invitations.activate, { shortCode: code });
        if (!activated) return res.status(200).json({ success: false, isValid: false, status: 'expired' });
        return res.status(200).json({
          success: true, isValid: true, status: 'active',
          invitationId: activated.invitationId, activatedAt: activated.activatedAt, expiresAt: activated.expiresAt,
          timeRemaining: null, timeRemainingMinutes: null,
          durationHours: activated.durationHours, pricingMode: activated.pricingMode,
          createdBy: activated.creatorName, creatorEmail: activated.creatorEmail,
          shortCode: activated.shortCode,
          guestName: activated.guestName ?? null, guestContact: activated.guestContact ?? null,
          contactType: activated.contactType ?? null,
          isPinBound: !!activated.boundToken,
          guestCurrencyMode: activated.guestCurrencyMode ?? null,
          guestMultiplier: activated.guestMultiplier ?? null,
        });
      }
      return res.status(200).json({
        success: true, isValid: true, status: 'active',
        invitationId: inv.invitationId, activatedAt: inv.activatedAt, expiresAt: inv.expiresAt,
        timeRemaining: null, timeRemainingMinutes: null,
        durationHours: inv.durationHours, pricingMode: inv.pricingMode,
        createdBy: inv.creatorName, creatorEmail: inv.creatorEmail,
        shortCode: inv.shortCode,
        guestName: inv.guestName ?? null, guestContact: inv.guestContact ?? null,
        contactType: inv.contactType ?? null,
        isPinBound: !!inv.boundToken,
        guestCurrencyMode: inv.guestCurrencyMode ?? null,
        guestMultiplier: inv.guestMultiplier ?? null,
      });
    }
    const result = await validateInvitation(sheets, code);
    return res.status(200).json(result);
  }

  // GET - Check guest history
  if (req.method === 'GET' && action === 'check-guest') {
    const rawGuest = req.query.guestContact;
    const guestContact = Array.isArray(rawGuest) ? rawGuest[0] : rawGuest;
    if (!guestContact || typeof guestContact !== 'string') {
      return sendError(res, 400, 'guestContact is required');
    }
    if (isConvexEnabled && convexClient) {
      const result = await convexClient.query(api.invitations.checkGuestHistory, { guestContact });
      return res.status(200).json({ success: true, ...result });
    }
    const result = await checkGuestHistory(sheets, guestContact);
    return res.status(200).json(result);
  }

  // GET - List invitations by creator
  if (req.method === 'GET' && action === 'list-by-creator') {
    const rawCreator = req.query.creatorEmail;
    const creatorEmail = Array.isArray(rawCreator) ? rawCreator[0] : rawCreator;
    if (!creatorEmail || typeof creatorEmail !== 'string') {
      return sendError(res, 400, 'creatorEmail is required');
    }
    if (isConvexEnabled && convexClient) {
      const invitations = await convexClient.query(api.invitations.listByCreator, { creatorEmail });
      return res.status(200).json({
        success: true,
        invitations: invitations.map((inv) => ({
          invitationId: inv.invitationId,
          shortCode: inv.shortCode,
          guestName: inv.guestName ?? null,
          guestContact: inv.guestContact ?? null,
          contactType: inv.contactType ?? null,
          status: inv.status,
          createdAt: inv.createdAt,
          activatedAt: inv.activatedAt ?? null,
          expiresAt: inv.expiresAt ?? null,
          pricingMode: inv.pricingMode,
          guestCurrencyMode: inv.guestCurrencyMode ?? null,
          guestMultiplier: inv.guestMultiplier ?? null,
        })),
        total: invitations.length,
      });
    }
    const result = await listByCreator(sheets, creatorEmail);
    return res.status(200).json(result);
  }

  return sendError(res, 405, 'Method not allowed');
}, {
  methods: ['GET', 'POST', 'OPTIONS'],
  provideSheets: true,
  errorPrefix: 'Invitations',
});
