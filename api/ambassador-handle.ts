/**
 * Ambassador Handle API
 *
 * Owns the vanity handle that fronts an ambassador profile:
 *   andres.tierramadre.app → /ambassadors/andres-mauricio-escobar-ramirez
 *
 * Stored in the "AmbassadorHandles" sheet as email → handle, keyed by email
 * because that is the identity the profile edit screen already holds
 * (`asesor.email` from /api/get-asesores). The slug is deliberately NOT
 * stored: slugs are derived from the display name and change when the name
 * is edited, so binding a public URL to one would rot. Resolution happens
 * at request time in `ambassador-subdomain.ts`.
 *
 * Endpoints:
 * - GET  /api/ambassador-handle              → { handles: { [handle]: email } }
 * - GET  /api/ambassador-handle?email=x      → { handle: string | null }
 * - POST /api/ambassador-handle { handle }   → set (validated + unique)
 *
 * GET is public by design — the handle→email map is exactly what the vanity
 * subdomains resolve through. POST requires a bearer token (Google ID token or
 * app session token): the row is keyed by the VERIFIED email, never by a
 * client-supplied one, so nobody can move or squat another ambassador's URL.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withApiHandler,
  sendError,
  sendSuccess,
  APP_SPREADSHEET_ID,
  SHEETS,
  ensureSheet,
} from './_lib/index.js';
import { extractBearer } from './_lib/bearer.js';
import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';
import {
  normalizeHandle,
  validateHandle,
  HANDLE_REJECTION_MESSAGES,
} from '../src/utils/ambassadorHandle.js';

const HANDLE_HEADERS = ['email', 'handle', 'updatedAt'];

/**
 * Verify the caller's bearer token → verified lowercase email, or null.
 * Accepts either a raw Google ID token (dies ~1h after sign-in) or an
 * app-issued "tms1" session token (30 days) — same dual-form verifier as
 * api/vitrina.ts, so a profile edit days after sign-in still works.
 */
async function verifyBearerEmail(
  authHeader?: string | string[],
): Promise<string | null> {
  const token = extractBearer(authHeader);
  if (!token) return null;
  if (isSessionToken(token)) {
    return verifySessionToken(token)?.email ?? null;
  }
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

interface HandleRow {
  email: string;
  handle: string;
  rowIndex: number;
}

/** Read every mapping. Rows without both fields are skipped, not fatal. */
async function readHandleRows(sheets: unknown): Promise<HandleRow[]> {
  await ensureSheet(
    sheets,
    SHEETS.AMBASSADOR_HANDLES,
    HANDLE_HEADERS,
    APP_SPREADSHEET_ID,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (sheets as any).spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEETS.AMBASSADOR_HANDLES}'!A:C`,
  });

  const rows: string[][] = response.data.values || [];
  const out: HandleRow[] = [];

  // Row 0 is the header written by ensureSheet.
  for (let i = 1; i < rows.length; i++) {
    const email = String(rows[i]?.[0] ?? '')
      .trim()
      .toLowerCase();
    const handle = String(rows[i]?.[1] ?? '')
      .trim()
      .toLowerCase();
    if (!email || !handle) continue;
    out.push({ email, handle, rowIndex: i });
  }

  return out;
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse, { sheets }) => {
    if (req.method === 'GET') {
      const rows = await readHandleRows(sheets);

      const email = String(req.query.email ?? '')
        .trim()
        .toLowerCase();
      if (email) {
        const match = rows.find((r) => r.email === email);
        return sendSuccess(res, { handle: match?.handle ?? null });
      }

      // Map form is what the subdomain resolver wants: handle → email.
      const handles: Record<string, string> = {};
      for (const row of rows) handles[row.handle] = row.email;
      return sendSuccess(res, { handles, count: rows.length });
    }

    if (req.method === 'POST') {
      // Identity comes ONLY from the verified token. A client-supplied email
      // would let anyone rebind (or squat) any ambassador's public URL.
      const email = await verifyBearerEmail(req.headers.authorization);
      if (!email) {
        return sendError(
          res,
          401,
          'Tu sesión expiró. Inicia sesión de nuevo.',
          'unauthorized',
        );
      }

      // Legacy clients sent { email } in the body. Accept it only when it
      // agrees with the verified identity — a mismatch is a spoof attempt or
      // a drifted client, and silently writing to the token's row instead of
      // the requested one would be more confusing than failing loudly.
      const bodyEmail = String(req.body?.email ?? '')
        .trim()
        .toLowerCase();
      if (bodyEmail && bodyEmail !== email) {
        return sendError(res, 403, 'No puedes editar ese perfil.', 'forbidden');
      }

      // Normalize before validating so "Andrés M." is judged in the shape
      // it will actually be stored and served as.
      const handle = normalizeHandle(String(req.body?.handle ?? ''));
      const validation = validateHandle(handle);
      if (!validation.valid) {
        return sendError(
          res,
          400,
          HANDLE_REJECTION_MESSAGES[validation.reason],
          validation.reason,
        );
      }

      const rows = await readHandleRows(sheets);

      // Uniqueness: the handle may only be held by this email.
      const owner = rows.find((r) => r.handle === handle);
      if (owner && owner.email !== email) {
        return sendError(res, 409, 'Ese enlace ya está tomado.', 'taken');
      }

      const existing = rows.find((r) => r.email === email);
      const values = [[email, handle, new Date().toISOString()]];

      if (existing) {
        // rowIndex is 0-based over the sheet including the header, so the
        // A1 row number is rowIndex + 1.
        const rowNumber = existing.rowIndex + 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sheets as any).spreadsheets.values.update({
          spreadsheetId: APP_SPREADSHEET_ID,
          range: `'${SHEETS.AMBASSADOR_HANDLES}'!A${rowNumber}:C${rowNumber}`,
          valueInputOption: 'RAW',
          requestBody: { values },
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sheets as any).spreadsheets.values.append({
          spreadsheetId: APP_SPREADSHEET_ID,
          range: `'${SHEETS.AMBASSADOR_HANDLES}'!A:C`,
          valueInputOption: 'RAW',
          requestBody: { values },
        });
      }

      return sendSuccess(res, { handle });
    }

    return sendError(res, 405, 'Method not allowed');
  },
  {
    methods: ['GET', 'POST', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'AmbassadorHandle',
  },
);
