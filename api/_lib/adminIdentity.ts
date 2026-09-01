/**
 * Identidad de administrador para las consolas: token → correo VERIFICADO → roster.
 *
 * Mismo patrón que `api/invitations.ts` (que no exporta sus helpers): acepta un ID token
 * de Google fresco o el session token de 30 días, y el correo solo puede salir de un
 * token verificado criptográficamente — nunca del body. `ADMIN_EMAILS` es la lista.
 *
 * Distinguir `invalid_token` de `not_admin` importa: el primero es "volvé a iniciar
 * sesión" (la UI ofrece re-login), el segundo es "esta cuenta no opera la campaña".
 */

import { isSessionToken, verifySessionToken } from './sessionToken.js';

export function isAdminEmail(email: string): boolean {
  const lista = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.trim().toLowerCase());
}

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
    const ticket = await client.verifyIdToken({ idToken: token, audience: audiences });
    const payload = ticket.getPayload();
    return payload?.email && payload.email_verified ? payload.email.toLowerCase().trim() : null;
  } catch {
    return null;
  }
}

export type AdminResolution =
  | { ok: true; email: string }
  | { ok: false; reason: 'invalid_token' | 'not_admin' };

export async function resolveAdminEmail(idToken: unknown): Promise<AdminResolution> {
  if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > 4096) {
    return { ok: false, reason: 'invalid_token' };
  }
  const email = isSessionToken(idToken)
    ? (verifySessionToken(idToken)?.email ?? null)
    : await verifyGoogleIdTokenEmail(idToken);
  if (!email) return { ok: false, reason: 'invalid_token' };
  if (!isAdminEmail(email)) return { ok: false, reason: 'not_admin' };
  return { ok: true, email };
}
