/**
 * Server-side caller verification for admin/staff-only Convex actions.
 *
 * Root problem this closes: Convex mutations/queries have no native session —
 * every one of them is directly callable by any client holding the (public)
 * deployment URL. Before this helper, admin-only mutations (product edits,
 * invitation issuance) trusted a client-supplied `editorEmail`/`creatorEmail`
 * string with no proof the caller actually is that person, so a guest could
 * call them directly (bypassing the React `AdminRoute`/`StaffRoute` UI gates,
 * which only hide buttons — they don't protect the backend).
 *
 * Fix: verify the caller's real Google ID token (the one Google Sign-In
 * already hands the frontend) against Google's tokeninfo endpoint — this
 * proves the request came from that Google account, not just a claimed email
 * string. Then look up that VERIFIED email's role via the same Sheets-backed
 * `/api/validate` endpoint the rest of the app already trusts as the role
 * source of truth. Only usable from `action`s (needs `fetch`); mutations that
 * need this call an authorizing action wrapper first (see products.ts /
 * invitations.ts for the internalMutation + action-wrapper pattern).
 */

import { ConvexError } from 'convex/values';
import { isSessionToken, verifySessionToken } from './sessionToken';

export type AccessLevel =
  'admin' | 'asesor' | 'embajador' | 'provider' | 'invitado_especial' | 'guest';

/**
 * Los roles que pueden ver DATOS DE COSTO: el gasto fijo vigente, el conteo de
 * lotes activos, K, el piso real y el margen.
 *
 * No es lo mismo que «puede ver el precio». Un asesor cotiza y vende: necesita
 * el precio final, no la estructura que lo produce. Mostrarle K y el margen le
 * dice exactamente cuánto hay para descontar — es la misma frontera que
 * `_lib/saleSafe.ts` ya defiende del lado del inventario.
 *
 * Hoy solo `admin`. Si aparece un rol financiero propio, se agrega ACÁ y no en
 * cada endpoint, para que la frontera siga teniendo un solo dueño.
 */
export const ROLES_COSTOS: readonly AccessLevel[] = ['admin'];

/**
 * La decisión pura de autorización, extraída de `requireAccessLevel` para poder
 * testearla sin red. La verificación de identidad (Google / sesión de app)
 * sigue necesitando `fetch` y por eso vive en la action.
 */
export function esAutorizado(
  accessLevel: AccessLevel,
  allowed: readonly AccessLevel[],
): boolean {
  return allowed.includes(accessLevel);
}

export interface VerifiedCaller {
  email: string;
  /** Display name from the Google ID token (falls back name for audit logs). */
  name?: string;
  accessLevel: AccessLevel;
  /** Canonical name/role from the Sheets roster, when available (invitations). */
  rosterName?: string;
  rosterRole?: string;
}

interface GoogleTokenInfo {
  aud?: string;
  iss?: string;
  email?: string;
  email_verified?: string;
  exp?: string;
  name?: string;
}

async function verifyGoogleIdToken(
  idToken: string,
): Promise<{ email: string; name?: string }> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new ConvexError(
      'No autorizado: GOOGLE_OAUTH_CLIENT_ID no configurado en Convex.',
    );
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    throw new ConvexError(
      'No autorizado: token de Google inválido o expirado.',
    );
  }
  const payload = (await res.json()) as GoogleTokenInfo;

  if (payload.aud !== clientId) {
    throw new ConvexError('No autorizado: token no emitido para esta app.');
  }
  if (
    payload.iss !== 'accounts.google.com' &&
    payload.iss !== 'https://accounts.google.com'
  ) {
    throw new ConvexError('No autorizado: emisor de token inválido.');
  }
  if (payload.email_verified !== 'true' || !payload.email) {
    throw new ConvexError('No autorizado: email de Google no verificado.');
  }
  const exp = Number(payload.exp);
  if (!exp || exp * 1000 < Date.now()) {
    throw new ConvexError('No autorizado: token de Google expirado.');
  }

  return { email: payload.email.toLowerCase().trim(), name: payload.name };
}

async function fetchRosterEntry(email: string): Promise<{
  accessLevel: AccessLevel;
  rosterName?: string;
  rosterRole?: string;
}> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new ConvexError('No autorizado: APP_URL no configurado en Convex.');
  }

  const res = await fetch(
    `${appUrl}/api/validate?email=${encodeURIComponent(email)}&type=both`,
  );
  if (!res.ok) {
    throw new ConvexError('No se pudo validar el rol del usuario.');
  }
  const data = (await res.json()) as {
    success?: boolean;
    isAuthorized?: boolean;
    isProvider?: boolean;
    user?: { accessLevel?: string; name?: string; role?: string };
  };

  if (data.success && data.isAuthorized && data.user?.accessLevel) {
    return {
      accessLevel: data.user.accessLevel as AccessLevel,
      rosterName: data.user.name,
      rosterRole: data.user.role,
    };
  }
  if (data.success && data.isProvider) return { accessLevel: 'provider' };
  return { accessLevel: 'guest' };
}

/**
 * Verifies the caller's identity token. Accepts either a raw Google ID token
 * (fresh sign-in, dies ~1h after issue) or an app-issued "tms1" session token
 * (30 days, minted by /api/validate?action=mint-session from a verified
 * Google token — see _lib/sessionToken.ts). Both prove the caller controls
 * that email; authorization always comes from the roster lookup afterwards.
 */
async function verifyCallerIdentity(
  idToken: string,
): Promise<{ email: string; name?: string }> {
  if (isSessionToken(idToken)) {
    const payload = await verifySessionToken(idToken);
    if (!payload) {
      throw new ConvexError(
        'No autorizado: sesión inválida o expirada. Vuelve a iniciar sesión.',
      );
    }
    return { email: payload.email };
  }
  return verifyGoogleIdToken(idToken);
}

/**
 * Verifies `idToken` server-side and requires the verified caller's role to
 * be one of `allowed`. Throws (fail closed) otherwise. Only call from an
 * `action` — needs network access. `idToken` may be a Google ID token or an
 * app session token (see verifyCallerIdentity above).
 */
export async function requireAccessLevel(
  idToken: string,
  allowed: AccessLevel[],
): Promise<VerifiedCaller> {
  const { email, name } = await verifyCallerIdentity(idToken);
  const { accessLevel, rosterName, rosterRole } = await fetchRosterEntry(email);
  if (!esAutorizado(accessLevel, allowed)) {
    throw new ConvexError('No autorizado para esta acción.');
  }
  return { email, name, accessLevel, rosterName, rosterRole };
}
