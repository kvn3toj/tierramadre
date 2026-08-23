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
import { ConvexError } from 'convex/values';
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
import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';
import { extractBearer } from './_lib/bearer.js';
import { api } from '../convex/_generated/api.js';
import { puedeFijarMultiplicador } from '../src/utils/permisosMultiplicador.js';

/**
 * Verifies a `tms1` app session token from the `Authorization: Bearer …`
 * header and returns its email, or null. Exported for tests. Same contract
 * as `verifiedSessionEmail` in api/vitrina.ts — a raw Google ID token,
 * whatever its shape, is not a session token and returns null here, which
 * the `list-by-creator` handler below turns into a 401. (2026-08-06, PII
 * lockdown item 3.)
 */
export function verifiedSessionEmail(
  authHeader?: string | string[],
): string | null {
  const token = extractBearer(authHeader);
  if (!token || !isSessionToken(token)) return null;
  return verifySessionToken(token)?.email ?? null;
}

type Sheets = sheets_v4.Sheets;
/** POST bodies use loose JSON shapes */
type ApiBody = Record<string, unknown>;

const SHEET_NAME = SHEETS.INVITATIONS;
const HEADERS = [
  'invitationId',
  'shortCode',
  'creatorEmail',
  'creatorName',
  'creatorRole',
  'guestName',
  'guestContact',
  'contactType',
  'createdAt',
  'activatedAt',
  'expiresAt',
  'pricingMode',
  'durationHours',
  'status',
  'pin',
  'boundToken',
  'guestCurrencyMode',
  'guestMultiplier',
];

/**
 * Extract a human-readable message from an error thrown by a Convex call.
 *
 * Convex sanitizes plain `Error` throws to a generic "[Request ID: …] Server
 * Error" for production HTTP clients — only a `ConvexError`'s `.data` survives
 * intact. The authz layer (convex/_lib/authz.ts) throws `ConvexError` with the
 * real reason ("No autorizado…", "sesión inválida…", etc.), so reading
 * `err.message` here would surface the opaque "Server Error" the user saw
 * instead of the actionable cause. Prefer `.data`, mirroring ghl-create-order.ts.
 */
function convexErrorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    return typeof err.data === 'string' ? err.data : String(err.data);
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

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
  return (
    'tk_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 14)
  );
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
      return {
        success: true,
        isIpBlocked: true,
        error: 'Acceso restringido a otro dispositivo',
      };
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
      requestBody: {
        values: [['pin', 'boundToken', 'guestCurrencyMode', 'guestMultiplier']],
      },
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
    if (
      row[1] != null &&
      String(row[1]).toUpperCase() === shortCode.toUpperCase()
    ) {
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
          durationHours:
            parseInt(String(row[12] ?? ''), 10) || INVITATION_DURATION_HOURS,
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

/** A caller whose identity was verified server-side (see resolveInvitationCaller). */
interface VerifiedInvitationCaller {
  email: string;
  name: string;
  role: string;
  /** true when the roster access level is admin — allows editing others' invites. */
  isAdmin: boolean;
  /**
   * Raw roster `accessLevel` (admin/embajador/asesor/invitado_especial), or
   * `''` for a provider / an ADMIN_EMAILS-only admin with no roster row.
   * Feeds `puedeFijarMultiplicador` — the SAME predicate `api/vitrina.ts`
   * uses to decide who may set a markup. `isAdmin` already covers the admin
   * case (including the ADMIN_EMAILS fallback that doesn't map cleanly onto
   * a roster accessLevel), so callers checking "may set multiplier" should
   * test `caller.isAdmin || puedeFijarMultiplicador(caller.accessLevel)`.
   */
  accessLevel: string;
}

/** Fully-resolved invitation, ready to persist identically to Sheets + Convex. */
interface ResolvedInvitation {
  shortCode: string;
  pin: string;
  createdAt: string;
  creator: VerifiedInvitationCaller;
  pricingMode: string;
  guestName?: string;
  guestContact?: string;
  contactType?: string;
  guestCurrencyMode?: string;
  guestMultiplier: number | null;
}

/** Is this VERIFIED email listed in ADMIN_EMAILS? */
function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/**
 * Outcome of caller verification. Distinguishing these matters: a bad token
 * means "sign in again" (the UI can offer re-login), while a roster miss means
 * "your account may not invite" — collapsing both into one generic 403 hid
 * which was which.
 */
type CallerResolution =
  | { ok: true; caller: VerifiedInvitationCaller }
  | { ok: false; reason: 'invalid_token' | 'not_authorized' | 'lookup_failed' };

/**
 * Verify the caller's identity ON THE VERCEL SIDE (this layer owns the Google
 * OAuth client — Convex needs none), then resolve their authorization.
 * Accepts a fresh Google ID token or a 30-day app session token.
 *
 * Authorized to invite = ANY active member of the Asesores sheet (every
 * accessLevel: admin/embajador/asesor/invitado_especial), OR a registered
 * provider, OR an ADMIN_EMAILS admin. That last case matters because admins
 * are not necessarily rows in the Asesores sheet, so a sheet-only check locked
 * them out. No client-supplied email is ever trusted — identity comes only
 * from a cryptographically verified token.
 */
async function resolveInvitationCaller(
  idToken: string,
): Promise<CallerResolution> {
  // 1. Token → verified email.
  let email: string | null = null;
  if (isSessionToken(idToken)) {
    email = verifySessionToken(idToken)?.email ?? null;
  } else {
    email = await verifyGoogleIdTokenEmail(idToken);
  }
  if (!email) return { ok: false, reason: 'invalid_token' };

  const envAdmin = isAdminEmail(email);

  // 2. Verified email → roster role, via the same /api/validate the rest of the
  // app trusts as the source of truth (reuses its Sheets logic, no duplication).
  const appUrl = process.env.APP_URL || 'https://tierramadre.app';
  try {
    const res = await fetch(
      `${appUrl}/api/validate?email=${encodeURIComponent(email)}&type=both`,
    );
    if (!res.ok) {
      // Roster unreachable: an ADMIN_EMAILS admin still gets through; anyone
      // else is a transient failure, not a definitive "no".
      if (envAdmin) {
        return {
          ok: true,
          caller: {
            email,
            name: email.split('@')[0],
            role: 'Admin',
            isAdmin: true,
            accessLevel: 'admin',
          },
        };
      }
      return { ok: false, reason: 'lookup_failed' };
    }
    const data = (await res.json()) as {
      success?: boolean;
      isAuthorized?: boolean;
      isProvider?: boolean;
      user?: { name?: string; role?: string; accessLevel?: string };
      provider?: { name?: string };
    };
    if (data.success && data.isAuthorized) {
      return {
        ok: true,
        caller: {
          email,
          name: data.user?.name || email.split('@')[0],
          role: data.user?.role || 'Asesor',
          isAdmin: data.user?.accessLevel === 'admin' || envAdmin,
          accessLevel: envAdmin ? 'admin' : (data.user?.accessLevel ?? ''),
        },
      };
    }
    if (data.success && data.isProvider) {
      return {
        ok: true,
        caller: {
          email,
          name: data.provider?.name || email.split('@')[0],
          role: 'Proveedor',
          isAdmin: envAdmin,
          // Providers aren't a roster accessLevel and aren't in
          // `puedeFijarMultiplicador`'s allowlist — same exclusion as
          // asesor, only an ADMIN_EMAILS admin bypasses it.
          accessLevel: envAdmin ? 'admin' : '',
        },
      };
    }
    // Not on any roster — still allowed if they're a configured admin.
    if (envAdmin) {
      return {
        ok: true,
        caller: {
          email,
          name: email.split('@')[0],
          role: 'Admin',
          isAdmin: true,
          accessLevel: 'admin',
        },
      };
    }
    return { ok: false, reason: 'not_authorized' };
  } catch {
    if (envAdmin) {
      return {
        ok: true,
        caller: {
          email,
          name: email.split('@')[0],
          role: 'Admin',
          isAdmin: true,
          accessLevel: 'admin',
        },
      };
    }
    return { ok: false, reason: 'lookup_failed' };
  }
}

/** Map a failed resolution to an HTTP response with an actionable message. */
function sendCallerError(
  res: VercelResponse,
  reason: 'invalid_token' | 'not_authorized' | 'lookup_failed',
) {
  if (reason === 'invalid_token') {
    return sendError(
      res,
      401,
      'Tu sesión expiró. Vuelve a iniciar sesión con Google.',
    );
  }
  if (reason === 'lookup_failed') {
    return sendError(
      res,
      503,
      'No se pudo verificar tu rol en este momento. Intenta de nuevo.',
    );
  }
  return sendError(
    res,
    403,
    'Tu cuenta no está autorizada para generar invitaciones. Verifica que tu correo esté activo en la hoja de Asesores.',
  );
}

/**
 * Verify a Google ID token → verified lowercase email, or null. Same
 * google-auth-library pattern as api/validate.ts / api/vitrina.ts (lazy import
 * so cold starts of other paths pay nothing).
 */
async function verifyGoogleIdTokenEmail(token: string): Promise<string | null> {
  const audiences = [
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.VITE_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ].filter((a): a is string => !!a && a.trim().length > 0);
  if (audiences.length === 0) return null;
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    return payload?.email && payload.email_verified
      ? payload.email.toLowerCase().trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * Append the invitation row to the Google Sheet. Uses the SAME shortCode/pin
 * as the Convex copy so both stores stay consistent.
 */
async function writeInvitationToSheet(
  sheets: Sheets,
  inv: ResolvedInvitation,
): Promise<void> {
  const invitationId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const row = [
    invitationId,
    inv.shortCode,
    inv.creator.email,
    inv.creator.name,
    inv.creator.role || 'Asesor',
    inv.guestName || '',
    inv.guestContact || '',
    inv.contactType || '',
    inv.createdAt,
    '',
    '',
    inv.pricingMode,
    INVITATION_DURATION_HOURS,
    'pending',
    inv.pin,
    '',
    inv.guestCurrencyMode || '',
    inv.guestMultiplier != null ? String(inv.guestMultiplier) : '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:R`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

/**
 * Validate an invitation (GET ?code=X)
 */
async function validateInvitation(sheets: Sheets, shortCode: string) {
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
    const expiresAt = new Date(
      now.getTime() + data.durationHours * 60 * 60 * 1000,
    ).toISOString();

    await sheets.spreadsheets.values.update({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!J${rowIndex}:N${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            activatedAt,
            expiresAt,
            data.pricingMode,
            data.durationHours,
            'active',
          ],
        ],
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
      guestName: data.guestName || null,
      guestContact: data.guestContact || null,
      contactType: data.contactType || null,
      isPinBound: !!data.boundToken,
      guestCurrencyMode: data.guestCurrencyMode || null,
      guestMultiplier: data.guestMultiplier,
    };
  }

  // If active, return as valid (no time limit)
  if (data.status === 'active') {
    return {
      success: true,
      isValid: true,
      status: 'active',
      invitationId: data.invitationId,
      activatedAt: data.activatedAt,
      expiresAt: data.expiresAt,
      timeRemaining: null,
      timeRemainingMinutes: null,
      durationHours: data.durationHours,
      pricingMode: data.pricingMode,
      createdBy: data.creatorName,
      creatorEmail: data.creatorEmail,
      shortCode: data.shortCode,
      guestName: data.guestName || null,
      guestContact: data.guestContact || null,
      contactType: data.contactType || null,
      isPinBound: !!data.boundToken,
      guestCurrencyMode: data.guestCurrencyMode || null,
      guestMultiplier: data.guestMultiplier,
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

  const uniqueCreators = new Set(
    matchingInvitations.map((inv) => inv.creatorEmail),
  );

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
    if (
      rowCreatorEmail === normalizedEmail &&
      (status === 'active' || status === 'pending')
    ) {
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
  invitations.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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
  const { invitationId, guestName, guestContact, contactType } =
    body as ApiBody & {
      invitationId?: string;
      guestName?: string;
      guestContact?: string;
      contactType?: string;
    };

  if (!invitationId || !guestName) {
    return {
      success: false,
      error: 'Invitation ID and guest name are required',
    };
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
    String(invitation.data.creatorEmail ?? '')
      .toLowerCase()
      .trim() !== creatorEmail.toLowerCase().trim()
  ) {
    return {
      success: false,
      error: 'No tienes permiso para editar esta invitación',
    };
  }

  // Only active/pending can be edited
  if (
    invitation.data.status !== 'active' &&
    invitation.data.status !== 'pending'
  ) {
    return {
      success: false,
      error: 'Solo se pueden editar invitaciones activas o pendientes',
    };
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
    String(invitation.data.creatorEmail ?? '')
      .toLowerCase()
      .trim() !== creatorEmail.toLowerCase().trim()
  ) {
    return {
      success: false,
      error: 'No tienes permiso para expirar esta invitación',
    };
  }

  // Already expired is a no-op success
  if (invitation.data.status === 'expired') {
    return { success: true };
  }

  // Only active/pending can be expired
  if (
    invitation.data.status !== 'active' &&
    invitation.data.status !== 'pending'
  ) {
    return {
      success: false,
      error: 'Solo se pueden expirar invitaciones activas o pendientes',
    };
  }

  // Update K:N atomically (expiresAt, pricingMode, durationHours, status)
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!K${invitation.rowIndex}:N${invitation.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        [
          now,
          invitation.data.pricingMode,
          invitation.data.durationHours,
          'expired',
        ],
      ],
    },
  });

  return { success: true };
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    context: Record<string, unknown>,
  ) => {
    const sheets = context.sheets as Sheets;
    const action =
      (req.query.action as string) ||
      (req.body as ApiBody | undefined)?.action ||
      'validate';

    await ensureSheet(sheets, SHEET_NAME, HEADERS, APP_SPREADSHEET_ID);

    // Auto-migrate: add pin + boundToken headers if missing on existing sheet
    await ensureHeaders(sheets);

    // POST - Generate invitation
    //
    // Identity is verified HERE, on the Vercel side (this layer owns the Google
    // OAuth client) — Convex requires no OAuth config of its own. The resolved
    // creator/guest data is then persisted to BOTH stores with the same
    // shortCode/pin: Convex (the read/validation path when enabled) and Google
    // Sheets (the mirror). creatorEmail/name/role come only from the verified
    // token → roster lookup, never from the request body.
    if (req.method === 'POST' && action === 'generate') {
      const body = (req.body as ApiBody) || {};
      const idToken = body.idToken as string | undefined;
      if (!idToken) return sendError(res, 401, 'idToken is required');

      const resolution = await resolveInvitationCaller(String(idToken));
      if (!resolution.ok) return sendCallerError(res, resolution.reason);
      const creator = resolution.caller;

      // Unique short code (collision-checked against the sheet).
      let shortCode = generateShortCode();
      let attempts = 0;
      while ((await findInvitationByCode(sheets, shortCode)) && attempts < 5) {
        shortCode = generateShortCode();
        attempts++;
      }

      const resolved: ResolvedInvitation = {
        shortCode,
        pin: generatePin(),
        createdAt: new Date().toISOString(),
        creator,
        pricingMode: (body.pricingMode as string) || 'with_prices',
        guestName: body.guestName ? String(body.guestName) : undefined,
        guestContact: body.guestContact ? String(body.guestContact) : undefined,
        contactType: body.contactType ? String(body.contactType) : undefined,
        guestCurrencyMode: body.guestCurrencyMode
          ? String(body.guestCurrencyMode)
          : undefined,
        guestMultiplier: sanitizeMultiplier(body.guestMultiplier),
      };

      // 1) Convex — the validation path reads from here when enabled, so this
      // write must succeed for the guest link to work. Identity is already
      // verified above, so the mutation is gated only by the shared secret.
      if (isConvexEnabled && convexClient) {
        try {
          await convexClient.mutation(api.invitations.createFromServer, {
            secret: process.env.ADMIN_SYNC_TOKEN ?? '',
            creatorEmail: creator.email,
            creatorName: creator.name,
            creatorRole: creator.role,
            pricingMode: resolved.pricingMode,
            guestName: resolved.guestName,
            guestContact: resolved.guestContact,
            contactType: resolved.contactType,
            guestCurrencyMode: resolved.guestCurrencyMode,
            guestMultiplier: resolved.guestMultiplier ?? undefined,
            pin: resolved.pin,
            shortCode: resolved.shortCode,
          });
        } catch (err: unknown) {
          return sendError(res, 502, convexErrorMessage(err));
        }
      }

      // 2) Google Sheets — the mirror. When Convex is enabled it already holds
      // the record the link validates against, so a Sheets hiccup shouldn't
      // fail an otherwise-working link; log and continue. When Convex is
      // disabled, Sheets IS the source of truth, so surface any failure.
      try {
        await writeInvitationToSheet(sheets, resolved);
      } catch (err) {
        if (!isConvexEnabled) throw err;
        console.error(
          '[Invitations] Sheets mirror failed:',
          err instanceof Error ? err.message : err,
        );
      }

      const baseUrl = 'https://tierramadre.app';
      return res.status(200).json({
        success: true,
        invitation: {
          token: resolved.shortCode,
          url: `${baseUrl}/invite/${resolved.shortCode}`,
          shortCode: resolved.shortCode,
          shortUrl: null,
          pin: resolved.pin,
          createdAt: resolved.createdAt,
          durationHours: INVITATION_DURATION_HOURS,
          pricingMode: resolved.pricingMode,
          guestCurrencyMode: resolved.guestCurrencyMode || null,
          guestMultiplier: resolved.guestMultiplier,
          createdBy: {
            email: creator.email,
            name: creator.name,
            role: creator.role,
          },
        },
      });
    }

    // POST - Verify PIN + device token binding
    if (req.method === 'POST' && action === 'verify-pin') {
      if (isConvexEnabled && convexClient) {
        const { shortCode, pin, deviceToken } = (req.body as ApiBody) || {};
        if (!shortCode || !pin)
          return sendError(res, 400, 'shortCode and pin are required');
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
        const { invitationId, guestName, guestContact, contactType } =
          (req.body as ApiBody) || {};
        if (!invitationId || !guestName)
          return sendError(
            res,
            400,
            'Invitation ID and guest name are required',
          );
        try {
          const result = await convexClient.mutation(
            api.invitations.registerGuest,
            {
              invitationId: String(invitationId),
              guestName: String(guestName),
              guestContact: guestContact ? String(guestContact) : undefined,
              contactType: contactType ? String(contactType) : undefined,
            },
          );
          return res.status(200).json(result);
        } catch (err: unknown) {
          const msg = convexErrorMessage(err);
          return res.status(200).json({ success: false, error: msg });
        }
      }
      const result = await registerGuest(sheets, (req.body as ApiBody) || {});
      return res.status(200).json(result);
    }

    // POST - Update invitation (multiplier, etc.)
    // Identity + admin status verified on the Vercel side; the Convex mutation
    // is gated only by the shared secret (no Convex-side Google OAuth).
    if (req.method === 'POST' && action === 'update') {
      const body = (req.body as ApiBody) || {};
      const shortCode = body.shortCode as string | undefined;
      const idToken = body.idToken as string | undefined;
      const fields = body.fields as { guestMultiplier?: unknown } | undefined;
      if (!shortCode || !idToken)
        return sendError(res, 400, 'shortCode and idToken are required');
      if (fields?.guestMultiplier === undefined)
        return res
          .status(200)
          .json({ success: false, error: 'No fields to update' });

      const resolution = await resolveInvitationCaller(String(idToken));
      if (!resolution.ok) return sendCallerError(res, resolution.reason);
      const caller = resolution.caller;
      const multiplier = Number(fields.guestMultiplier);

      // Role gate (final whole-branch review, checkout-in-app): the check
      // below this comment used to be ownership + admin ONLY — any invite
      // owner, asesor included, could fix a `guestMultiplier` on their own
      // invitation, and `createOrder` charges that multiplier. `vitrinas`
      // (the sibling price-authority record) is gated by
      // `puedeFijarMultiplicador`, which deliberately excludes asesor; this
      // path answered the identical question ("who may set a markup?") with
      // a different, more permissive rule. Same predicate here, ADDED to —
      // not replacing — the ownership check Convex still enforces below.
      if (!caller.isAdmin && !puedeFijarMultiplicador(caller.accessLevel)) {
        return sendError(
          res,
          403,
          'No autorizado para fijar un multiplicador.',
        );
      }

      // Convex — authoritative read/validation path; ownership + admin bypass
      // enforced inside against the VERIFIED caller (never a client email).
      if (isConvexEnabled && convexClient) {
        try {
          await convexClient.mutation(
            api.invitations.updateMultiplierFromServer,
            {
              secret: process.env.ADMIN_SYNC_TOKEN ?? '',
              shortCode: String(shortCode),
              creatorEmail: caller.email,
              isAdmin: caller.isAdmin,
              guestMultiplier: multiplier,
            },
          );
        } catch (err: unknown) {
          return res
            .status(200)
            .json({ success: false, error: convexErrorMessage(err) });
        }
      }

      // Sheets mirror (best-effort when Convex is enabled; authoritative when
      // it isn't). Passes the VERIFIED caller email, never the request body's.
      try {
        const sheetResult = await updateInvitation(sheets, {
          shortCode: String(shortCode),
          creatorEmail: caller.email,
          fields: { guestMultiplier: multiplier },
        });
        if (!isConvexEnabled) return res.status(200).json(sheetResult);
      } catch (err) {
        if (!isConvexEnabled) throw err;
        console.error(
          '[Invitations] Sheets update mirror failed:',
          err instanceof Error ? err.message : err,
        );
      }

      return res.status(200).json({
        success: true,
        invitation: {
          shortCode: String(shortCode),
          guestMultiplier: sanitizeMultiplier(multiplier),
        },
      });
    }

    // POST - Expire/revoke invitation
    if (req.method === 'POST' && action === 'expire') {
      const body = (req.body as ApiBody) || {};
      const shortCode = body.shortCode as string | undefined;
      const idToken = body.idToken as string | undefined;
      if (!shortCode || !idToken)
        return sendError(res, 400, 'shortCode and idToken are required');

      const resolution = await resolveInvitationCaller(String(idToken));
      if (!resolution.ok) return sendCallerError(res, resolution.reason);
      const caller = resolution.caller;

      if (isConvexEnabled && convexClient) {
        try {
          await convexClient.mutation(api.invitations.expireFromServer, {
            secret: process.env.ADMIN_SYNC_TOKEN ?? '',
            shortCode: String(shortCode),
            creatorEmail: caller.email,
            isAdmin: caller.isAdmin,
          });
        } catch (err: unknown) {
          return res
            .status(200)
            .json({ success: false, error: convexErrorMessage(err) });
        }
      }

      // Sheets mirror (best-effort when Convex enabled; authoritative otherwise).
      try {
        const sheetResult = await expireInvitationAction(sheets, {
          shortCode: String(shortCode),
          creatorEmail: caller.email,
        });
        if (!isConvexEnabled) return res.status(200).json(sheetResult);
      } catch (err) {
        if (!isConvexEnabled) throw err;
        console.error(
          '[Invitations] Sheets expire mirror failed:',
          err instanceof Error ? err.message : err,
        );
      }

      return res.status(200).json({ success: true });
    }

    // GET - Validate invitation
    if (req.method === 'GET' && (action === 'validate' || req.query.code)) {
      const rawCode = req.query.code ?? req.query.shortCode;
      const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
      if (!code || typeof code !== 'string') {
        return sendError(res, 400, 'Code is required');
      }
      if (isConvexEnabled && convexClient) {
        const inv = await convexClient.query(api.invitations.getByShortCode, {
          shortCode: code,
        });
        if (!inv)
          return res.status(200).json({
            success: false,
            isValid: false,
            status: 'expired',
            error: 'Invitacion no encontrada',
          });
        if (inv.status === 'expired')
          return res.status(200).json({
            success: true,
            isValid: false,
            status: 'expired',
            error: 'Esta invitacion ha expirado',
          });
        if (inv.status === 'pending') {
          const activated = await convexClient.mutation(
            api.invitations.activate,
            { shortCode: code },
          );
          if (!activated)
            return res
              .status(200)
              .json({ success: false, isValid: false, status: 'expired' });
          return res.status(200).json({
            success: true,
            isValid: true,
            status: 'active',
            invitationId: activated.invitationId,
            activatedAt: activated.activatedAt,
            expiresAt: activated.expiresAt,
            timeRemaining: null,
            timeRemainingMinutes: null,
            durationHours: activated.durationHours,
            pricingMode: activated.pricingMode,
            createdBy: activated.creatorName,
            creatorEmail: activated.creatorEmail,
            shortCode: activated.shortCode,
            guestName: activated.guestName ?? null,
            guestContact: activated.guestContact ?? null,
            contactType: activated.contactType ?? null,
            isPinBound: activated.isPinBound,
            guestCurrencyMode: activated.guestCurrencyMode ?? null,
            guestMultiplier: activated.guestMultiplier ?? null,
          });
        }
        return res.status(200).json({
          success: true,
          isValid: true,
          status: 'active',
          invitationId: inv.invitationId,
          activatedAt: inv.activatedAt,
          expiresAt: inv.expiresAt,
          timeRemaining: null,
          timeRemainingMinutes: null,
          durationHours: inv.durationHours,
          pricingMode: inv.pricingMode,
          createdBy: inv.creatorName,
          creatorEmail: inv.creatorEmail,
          shortCode: inv.shortCode,
          guestName: inv.guestName ?? null,
          guestContact: inv.guestContact ?? null,
          contactType: inv.contactType ?? null,
          isPinBound: inv.isPinBound,
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
        // Server-to-server secret, not a browser credential — this REST
        // action stays intentionally public (a guest checks their own
        // history pre-registration, before they have any session). The
        // secret proves to CONVEX that this Vercel layer is the trusted
        // proxy, closing direct internet access to the deployment URL. See
        // convex/invitations.ts's checkGuestHistory doc comment.
        const result = await convexClient.query(
          api.invitations.checkGuestHistory,
          { guestContact, secret: process.env.ADMIN_SYNC_TOKEN ?? '' },
        );
        return res.status(200).json({ success: true, ...result });
      }
      const result = await checkGuestHistory(sheets, guestContact);
      return res.status(200).json(result);
    }

    // GET - List invitations by creator
    if (req.method === 'GET' && action === 'list-by-creator') {
      // Session-token gated (2026-08-06, PII lockdown item 3): this endpoint
      // used to return `guestName`/`guestContact` (customer phone numbers
      // and emails) to ANY request, unauthenticated — confirmed returning
      // HTTP 200 to an anonymous request in production. A `tms1` session
      // token (same as api/vitrina.ts's `verifiedSessionEmail`) is required
      // now; it does not need to match `creatorEmail` — any authenticated
      // staff member may look up any advisor's invitations, consistent with
      // convex/invitations.ts's `listByCreator` gate.
      const email = verifiedSessionEmail(req.headers['authorization']);
      if (!email) {
        return sendError(res, 401, 'Inicia sesión para ver invitaciones.');
      }
      const rawCreator = req.query.creatorEmail;
      const creatorEmail = Array.isArray(rawCreator)
        ? rawCreator[0]
        : rawCreator;
      if (!creatorEmail || typeof creatorEmail !== 'string') {
        return sendError(res, 400, 'creatorEmail is required');
      }
      if (isConvexEnabled && convexClient) {
        const sessionToken =
          extractBearer(req.headers['authorization']) ?? undefined;
        const invitations = await convexClient.query(
          api.invitations.listByCreator,
          { creatorEmail, sessionToken },
        );
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
  },
  {
    methods: ['GET', 'POST', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'Invitations',
  },
);
