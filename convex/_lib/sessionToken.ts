/**
 * Verifies app-issued "tms1" session tokens on the Convex runtime.
 *
 * MIRROR of api/_lib/sessionToken.ts (which also mints) — same prefix,
 * context string, payload shape, and secret (ADMIN_SYNC_TOKEN, provisioned on
 * both Vercel and Convex, same choice as cidSigning.ts). Uses crypto.subtle
 * because the Convex runtime has no Node `crypto`; `crypto.subtle.verify`
 * performs the constant-time signature comparison for us.
 *
 * Why these tokens exist: the Google ID token proves identity but dies ~1h
 * after the last real sign-in and can't be silently renewed on iOS/Safari, so
 * invitation/vitrina/admin mutations failed with "session expired" while the
 * rest of the app stayed logged in. /api/validate?action=mint-session
 * exchanges a fresh Google ID token (after a roster check) for one of these
 * 30-day tokens; authz.ts accepts either. Authorization is unchanged — every
 * call still re-checks the caller's role against the Sheets roster.
 */

const PREFIX = 'tms1';
const CONTEXT = 'tm-session-v1';

export interface SessionTokenPayload {
  email: string;
  iat: number;
  exp: number;
}

/** Cheap shape check so authz can route session tokens vs Google ID tokens. */
export function isSessionToken(token: string): boolean {
  return token.startsWith(`${PREFIX}.`);
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64UrlToUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Verifies signature + expiry and returns the payload, or null on ANY problem
 * (malformed, tampered, expired, secret missing) — never throws. Callers
 * should treat null exactly like an invalid Google ID token.
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionTokenPayload | null> {
  const secret = process.env.ADMIN_SYNC_TOKEN;
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, b64, sigHex] = parts;
  if (!b64 || !sigHex) return null;
  // HMAC-SHA256 is exactly 32 bytes / 64 hex chars — reject anything else
  // before handing it to crypto.subtle.
  const sigBytes = hexToBytes(sigHex);
  if (!sigBytes || sigBytes.length !== 32) return null;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(`${CONTEXT}.${b64}`),
    );
    if (!ok) return null;

    const payload = JSON.parse(base64UrlToUtf8(b64)) as SessionTokenPayload;
    if (
      typeof payload.email !== 'string' ||
      !payload.email ||
      typeof payload.exp !== 'number' ||
      payload.exp * 1000 <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
