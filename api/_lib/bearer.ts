/**
 * Bearer-token auth for the GHL-facing endpoints (api/ghl-*.ts) and the
 * catalog grant's service-token check (api/_lib/catalogGrant.ts).
 *
 * GoHighLevel's bot/workflows call our endpoints with
 * `Authorization: Bearer <GHL_API_SECRET>` (the spec's INTERNAL_API_SECRET,
 * exposed in GHL as Custom Value `internal_api_secret`). Pure + unit-tested
 * (tests/bearer.test.ts) — the handlers wrap it with sendError(401).
 *
 * NOTE: the Mercado Pago webhook does NOT use this — it is authenticated by
 * HMAC signature (api/_lib/mp-signature.ts).
 */

import crypto from 'node:crypto';

export function extractBearer(authHeader?: string | string[]): string | null {
  const h = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/**
 * True only when a non-empty bearer token exactly matches the configured
 * secret — compared with `crypto.timingSafeEqual` (2026-08 fix round 3, N6),
 * not `===`. `ADMIN_SYNC_TOKEN` (the secret this gates for the catalog's
 * service grant) is also the HMAC secret signing every session token
 * (api/_lib/sessionToken.ts), so recovering it via a timing side-channel
 * would forge any identity, not just this one check.
 *
 * `timingSafeEqual` throws on a LENGTH mismatch rather than returning false,
 * so lengths are compared first — that comparison depends only on the
 * SECRET's length (public/constant, not attacker-influenced content), not
 * its bytes, so it leaks nothing a length check doesn't already.
 */
export function bearerMatches(
  authHeader: string | string[] | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  const token = extractBearer(authHeader);
  if (token == null || token.length === 0) return false;
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);
  if (tokenBuf.length !== secretBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, secretBuf);
}
