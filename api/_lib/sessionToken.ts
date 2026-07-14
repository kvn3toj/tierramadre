/**
 * App-issued session tokens ("tms1") — mint + verify on Vercel's Node runtime.
 *
 * Root problem this closes: the app's own session (localStorage profile,
 * re-validated by email on load) lives for days/weeks, but every privileged
 * mutation (invitations, vitrina share, admin edits) proved identity with the
 * raw Google ID token, which hard-expires ~1h after the last real Google
 * sign-in and cannot be silently renewed on iOS/Safari. Staff were "logged in"
 * everywhere except the two features that mint client links.
 *
 * Fix: when the client DOES hold a fresh, Google-verified ID token,
 * /api/validate?action=mint-session exchanges it (after a Sheets-roster check)
 * for one of these HMAC-signed session tokens (30 days, rolling refresh).
 * Server endpoints that used to accept only Google ID tokens now accept either.
 * Authorization is unchanged — every privileged call still re-checks the
 * caller's role against the Sheets roster; this token only proves identity,
 * exactly like the Google ID token it replaces, so removing someone from the
 * roster still locks them out immediately.
 *
 * Format: `tms1.<base64url(JSON payload)>.<hex HMAC-SHA256>`
 *   payload = { email, iat, exp }  (ASCII only — deliberately no display name,
 *   so the payload never needs unicode-safe base64 handling; callers get the
 *   canonical name from the roster lookup they already do).
 *   signature = HMAC-SHA256(ADMIN_SYNC_TOKEN, "tm-session-v1.<payloadB64>")
 *
 * Secret: ADMIN_SYNC_TOKEN — already provisioned on BOTH Vercel and Convex
 * (same choice as cidSigning.ts, see its rationale). The "tm-session-v1"
 * context string domain-separates these signatures from the vitrina cid
 * signatures computed with the same secret.
 *
 * MIRROR: convex/_lib/sessionToken.ts verifies this exact format with
 * crypto.subtle — keep prefix/context/shape in sync.
 */

import crypto from 'node:crypto';

const PREFIX = 'tms1';
const CONTEXT = 'tm-session-v1';

/** 30 days — matches the app's own "stay signed in" session model. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface SessionTokenPayload {
  email: string;
  iat: number;
  exp: number;
}

function hmacHex(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/** Cheap shape check so callers can route session tokens vs Google ID tokens. */
export function isSessionToken(token: string): boolean {
  return token.startsWith(`${PREFIX}.`);
}

/**
 * Mints a session token for an ALREADY-VERIFIED email. Callers must verify
 * identity (Google ID token or a still-valid session token) AND roster
 * membership before calling. Returns null when ADMIN_SYNC_TOKEN isn't
 * configured (fail closed).
 */
export function mintSessionToken(email: string): string | null {
  const secret = process.env.ADMIN_SYNC_TOKEN;
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = {
    email: email.toLowerCase().trim(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );
  const sig = hmacHex(secret, `${CONTEXT}.${b64}`);
  return `${PREFIX}.${b64}.${sig}`;
}

/**
 * Verifies signature + expiry and returns the payload, or null on ANY problem
 * (malformed, tampered, expired, secret missing) — never throws. Callers
 * should treat null exactly like an invalid Google ID token (401).
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
  const secret = process.env.ADMIN_SYNC_TOKEN;
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, b64, providedSig] = parts;
  if (!b64 || !providedSig) return null;

  const expectedSig = hmacHex(secret, `${CONTEXT}.${b64}`);
  if (providedSig.length !== expectedSig.length) return null;
  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(providedSig, 'hex'),
        Buffer.from(expectedSig, 'hex'),
      )
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(b64, 'base64url').toString('utf8'),
    ) as SessionTokenPayload;
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
