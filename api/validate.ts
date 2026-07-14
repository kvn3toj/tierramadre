/**
 * Vercel Serverless Function - Unified Validation API
 *
 * Validates users against Asesores or Proveedores sheets.
 * Also provides list endpoints for providers.
 */

import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withApiHandler,
  sendError,
  sendSuccess,
  SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  findColumnIndex,
} from './_lib/index.js';
import {
  mintSessionToken,
  verifySessionToken,
  SESSION_TTL_SECONDS,
} from './_lib/sessionToken.js';

type Sheets = sheets_v4.Sheets;

/**
 * Verify a Google ID token → verified lowercase email, or null. Same
 * google-auth-library pattern as api/vitrina.ts / api/fotosintesis-ai.ts
 * (lazy import so the common validate path pays no cold-start cost).
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
    // Invalid or expired token — treat as unauthenticated.
    return null;
  }
}

interface ValidatedUser {
  name: string;
  email: string;
  role: string;
  accessLevel: string;
}

interface ProviderRow {
  id: string;
  name: string;
  email: string;
  contactPerson: string;
  whatsapp: string;
  specialty: string;
  status: string;
  registeredAt: string;
}

/**
 * Validate user against Asesores sheet
 */
async function validateUser(
  sheets: Sheets,
  normalizedEmail: string,
  sheetNames: string[],
): Promise<ValidatedUser | null> {
  // Pattern-based lookup only — robust against sheet reordering. A positional
  // fallback (sheetNames[2]/[0]) can silently point at the WRONG sheet, which
  // yields a false "unauthorized" and force-logs the user out. If the Asesores
  // sheet can't be resolved by name, treat it as a transient failure (throw →
  // HTTP 500) so the client retries instead of assuming the account is gone.
  const asesoresSheet = findSheetByPattern(sheetNames, ['asesor', 'embajador']);

  if (!asesoresSheet) {
    throw new Error('Asesores sheet not found by pattern');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${asesoresSheet}'!A:Z`,
  });

  const rows = response.data.values || [];
  // Zero rows is an anomaly (throttle/quota/timeout/empty read), NOT proof the
  // user is absent — a real sheet always has at least a header row. Throw so
  // the client can retry rather than misreading this as "account removed".
  if (rows.length === 0) {
    throw new Error('Asesores sheet read returned no rows');
  }

  const headers = rows[0] as string[];
  const nameColumnIndex = findColumnIndex(headers, [
    'nombre',
    'name',
    'asesor',
  ]);
  const roleIndex = findColumnIndex(headers, ['datos', 'rol', 'role', 'tipo']);
  // An "instagram" column is NOT an email column — an IG handle never equals a
  // login email, so treating it as one produces false negatives → logouts.
  // Resolve a real email/correo column first; only fall back to instagram if no
  // email/correo column exists at all.
  let emailIndex = findColumnIndex(headers, ['email', 'correo']);
  if (emailIndex === -1) {
    emailIndex = findColumnIndex(headers, ['instagram']);
  }
  const estadoIndex = findColumnIndex(headers, ['estado', 'status']);

  const dataRows = rows.slice(1);

  for (const row of dataRows) {
    if (estadoIndex !== -1) {
      const estado = String(row[estadoIndex] || '').toLowerCase();
      if (estado === 'inactivo' || estado === 'inactive') continue;
    }

    const userEmail =
      emailIndex !== -1
        ? String(row[emailIndex] || '')
            .toLowerCase()
            .trim()
        : '';

    if (userEmail === normalizedEmail) {
      const name = nameColumnIndex !== -1 ? row[nameColumnIndex] : '';
      const role =
        roleIndex !== -1 ? String(row[roleIndex] || 'Asesor').trim() : 'Asesor';

      let accessLevel = 'asesor';
      const roleLower = role.toLowerCase();

      if (roleLower.includes('admin') || roleLower.includes('administrador')) {
        accessLevel = 'admin';
      } else if (
        roleLower.includes('proveedor') ||
        roleLower.includes('provider')
      ) {
        accessLevel = 'provider';
      } else if (
        roleLower.includes('embajador') ||
        roleLower.includes('ambassador')
      ) {
        accessLevel = 'embajador';
      } else if (
        // "Special guest" — can browse + share Vitrinas like staff, but no
        // editing/admin powers. Activation is enforced by the estado check
        // above (rows marked inactivo are skipped, so they never reach here).
        roleLower.includes('invitado especial') ||
        roleLower.includes('invitado_especial') ||
        roleLower.includes('special guest') ||
        roleLower.includes('especial')
      ) {
        accessLevel = 'invitado_especial';
      }

      return {
        name: String(name || normalizedEmail.split('@')[0]),
        email: normalizedEmail,
        role,
        accessLevel,
      };
    }
  }

  return null;
}

/**
 * List all active providers
 */
async function listProviders(
  sheets: Sheets,
  sheetNames: string[],
): Promise<ProviderRow[]> {
  const proveedoresSheet = findSheetByPattern(sheetNames, [
    'proveedores',
    'proveedor',
  ]);

  if (!proveedoresSheet) {
    return [];
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${proveedoresSheet}'!A:H`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0] as string[];
  const idIndex = findColumnIndex(headers, ['id']);
  const nombreIndex = findColumnIndex(headers, ['nombre', 'name']);
  const emailIndex = findColumnIndex(headers, ['email', 'correo']);
  const contactoIndex = findColumnIndex(headers, ['contacto', 'contact']);
  const whatsappIndex = findColumnIndex(headers, ['whatsapp', 'telefono']);
  const especialidadIndex = findColumnIndex(headers, [
    'especialidad',
    'specialty',
  ]);
  const estadoIndex = findColumnIndex(headers, ['estado', 'status']);
  const fechaIndex = findColumnIndex(headers, ['fecha', 'registeredat']);

  return rows
    .slice(1)
    .map((row) => ({
      id: idIndex !== -1 ? String(row[idIndex] ?? '') : '',
      name: nombreIndex !== -1 ? String(row[nombreIndex] ?? '') : '',
      email: emailIndex !== -1 ? String(row[emailIndex] ?? '') : '',
      contactPerson:
        contactoIndex !== -1 ? String(row[contactoIndex] ?? '') : '',
      whatsapp: whatsappIndex !== -1 ? String(row[whatsappIndex] ?? '') : '',
      specialty:
        especialidadIndex !== -1 ? String(row[especialidadIndex] ?? '') : '',
      status:
        estadoIndex !== -1 ? String(row[estadoIndex] ?? 'ACTIVO') : 'ACTIVO',
      registeredAt: fechaIndex !== -1 ? String(row[fechaIndex] ?? '') : '',
    }))
    .filter((p) => p.email && p.status?.toUpperCase() === 'ACTIVO');
}

/**
 * Validate user against Proveedores sheet
 */
async function validateProvider(
  sheets: Sheets,
  normalizedEmail: string,
  sheetNames: string[],
): Promise<ProviderRow | null> {
  // Resolve by pattern only. If the Proveedores sheet can't be found by name we
  // can't produce a definitive negative — throw (→ HTTP 500) so the client
  // retries rather than logging a provider out. A genuine "provider not found"
  // is only returned below, once the sheet WAS resolved and read.
  const proveedoresSheet = findSheetByPattern(sheetNames, [
    'proveedores',
    'proveedor',
  ]);

  if (!proveedoresSheet) {
    throw new Error('Proveedores sheet not found by pattern');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${proveedoresSheet}'!A:H`,
  });

  const rows = response.data.values || [];
  // Zero rows is an anomaly (failed/throttled read), not a real absence — throw
  // to allow retry. One row (header only, no data) IS a genuine empty list.
  if (rows.length === 0) {
    throw new Error('Proveedores sheet read returned no rows');
  }
  if (rows.length <= 1) return null;

  const headers = rows[0] as string[];
  const idIndex = findColumnIndex(headers, ['id']);
  const nombreIndex = findColumnIndex(headers, ['nombre', 'name']);
  const emailIndex = findColumnIndex(headers, ['email', 'correo']);
  const contactoIndex = findColumnIndex(headers, ['contacto', 'contact']);
  const whatsappIndex = findColumnIndex(headers, ['whatsapp', 'telefono']);
  const especialidadIndex = findColumnIndex(headers, [
    'especialidad',
    'specialty',
  ]);
  const estadoIndex = findColumnIndex(headers, ['estado', 'status']);
  const fechaIndex = findColumnIndex(headers, ['fecha', 'registeredat']);

  const dataRows = rows.slice(1);

  for (const row of dataRows) {
    const providerEmail =
      emailIndex !== -1
        ? String(row[emailIndex] || '')
            .toLowerCase()
            .trim()
        : '';

    if (providerEmail === normalizedEmail) {
      if (estadoIndex !== -1) {
        const estado = String(row[estadoIndex] || '').toUpperCase();
        if (estado === 'INACTIVO' || estado === 'INACTIVE') return null;
      }

      return {
        id: idIndex !== -1 ? String(row[idIndex] ?? '') : '',
        name: nombreIndex !== -1 ? String(row[nombreIndex] ?? '') : '',
        email: normalizedEmail,
        contactPerson:
          contactoIndex !== -1 ? String(row[contactoIndex] ?? '') : '',
        whatsapp: whatsappIndex !== -1 ? String(row[whatsappIndex] ?? '') : '',
        specialty:
          especialidadIndex !== -1 ? String(row[especialidadIndex] ?? '') : '',
        status:
          estadoIndex !== -1 ? String(row[estadoIndex] ?? 'ACTIVO') : 'ACTIVO',
        registeredAt: fechaIndex !== -1 ? String(row[fechaIndex] ?? '') : '',
      };
    }
  }

  return null;
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    context: Record<string, unknown>,
  ) => {
    const sheets = context.sheets as Sheets;
    const action =
      (req.query.action as string) || req.body?.action || 'validate';
    const email = req.method === 'GET' ? req.query.email : req.body?.email;
    const type = (req.query.type as string) || req.body?.type || 'both';

    if (action === 'list-providers') {
      const sheetNames = await getSheetNames(sheets);
      const providers = await listProviders(sheets, sheetNames);
      return sendSuccess(res, { providers });
    }

    // Exchange a fresh Google ID token (or a still-valid app session token,
    // for rolling refresh) for a 30-day app session token. This is what keeps
    // invitation/vitrina/admin mutations working after the ~1h Google
    // credential dies — see api/_lib/sessionToken.ts for the full rationale.
    // Identity comes ONLY from a cryptographically verified token (never a
    // client-supplied email), and only roster members (Asesores/Proveedores)
    // get a token, so guests can't obtain one.
    if (action === 'mint-session') {
      if (req.method !== 'POST') {
        return sendError(res, 405, 'POST required');
      }
      const body = (req.body ?? {}) as {
        idToken?: unknown;
        sessionToken?: unknown;
      };

      let verifiedEmail: string | null = null;
      if (typeof body.idToken === 'string' && body.idToken) {
        verifiedEmail = await verifyGoogleIdTokenEmail(body.idToken);
      } else if (typeof body.sessionToken === 'string' && body.sessionToken) {
        verifiedEmail = verifySessionToken(body.sessionToken)?.email ?? null;
      }
      if (!verifiedEmail) {
        return sendError(res, 401, 'Token inválido o expirado');
      }

      const sheetNames = await getSheetNames(sheets);
      const rosterUser = await validateUser(sheets, verifiedEmail, sheetNames);
      if (!rosterUser) {
        const provider = await validateProvider(
          sheets,
          verifiedEmail,
          sheetNames,
        );
        if (!provider) {
          return sendError(res, 403, 'No autorizado');
        }
      }

      const sessionToken = mintSessionToken(verifiedEmail);
      if (!sessionToken) {
        return sendError(res, 500, 'Sesión no disponible en el servidor');
      }
      return sendSuccess(res, {
        sessionToken,
        expiresInSeconds: SESSION_TTL_SECONDS,
      });
    }

    if (!email || typeof email !== 'string') {
      return sendError(res, 400, 'Email is required');
    }

    const sheetNames = await getSheetNames(sheets);
    const normalizedEmail = email.toLowerCase().trim();

    if (type === 'user') {
      const user = await validateUser(sheets, normalizedEmail, sheetNames);
      return sendSuccess(res, {
        isAuthorized: !!user,
        user: user || undefined,
        error: user ? undefined : 'Email not found in authorized users list',
      });
    }

    if (type === 'provider') {
      const provider = await validateProvider(
        sheets,
        normalizedEmail,
        sheetNames,
      );
      return sendSuccess(res, {
        isProvider: !!provider,
        provider: provider || undefined,
        error: provider ? undefined : 'Email not found in providers list',
      });
    }

    const user = await validateUser(sheets, normalizedEmail, sheetNames);
    if (user) {
      return sendSuccess(res, {
        isAuthorized: true,
        user,
        accountType: 'user',
      });
    }

    const provider = await validateProvider(
      sheets,
      normalizedEmail,
      sheetNames,
    );
    if (provider) {
      return sendSuccess(res, {
        isProvider: true,
        provider,
        accountType: 'provider',
      });
    }

    // Genuine negative: both sheets were resolved + read successfully and the
    // email matched no active row. `reason` lets the client distinguish this
    // real "not in sheet" from a transient failure (which now returns 500) and
    // stay conservative instead of force-logging the user out. Additive field.
    return sendSuccess(res, {
      isAuthorized: false,
      isProvider: false,
      reason: 'not_in_sheet',
      error: 'Email not found in any authorized list',
    });
  },
  {
    methods: ['GET', 'POST', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'Validate',
  },
);
