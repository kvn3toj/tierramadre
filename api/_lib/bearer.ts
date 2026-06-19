/**
 * Bearer-token auth for the GHL-facing endpoints (api/ghl-*.ts).
 *
 * GoHighLevel's bot/workflows call our endpoints with
 * `Authorization: Bearer <GHL_API_SECRET>` (the spec's INTERNAL_API_SECRET,
 * exposed in GHL as Custom Value `internal_api_secret`). Pure + unit-tested
 * (tests/bearer.test.ts) — the handlers wrap it with sendError(401).
 *
 * NOTE: the Mercado Pago webhook does NOT use this — it is authenticated by
 * HMAC signature (api/_lib/mp-signature.ts).
 */

export function extractBearer(authHeader?: string | string[]): string | null {
  const h = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/** True only when a non-empty bearer token exactly matches the configured secret. */
export function bearerMatches(
  authHeader: string | string[] | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  const token = extractBearer(authHeader);
  return token != null && token.length > 0 && token === secret;
}
