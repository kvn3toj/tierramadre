/**
 * Verifies the HMAC-signed GHL contactId embedded in vitrina `?cid=` links.
 *
 * Signed by convex/_lib/cidSigning.ts (`signContactId`) when
 * `ghl.searchProducts` mints a vitrina link for a specific GHL contact.
 * api/vitrina-select.ts is intentionally public/no-auth (called from an
 * anonymous client's browser), so without this check any caller who obtained
 * ANY valid-shaped contactId (their own, or one scraped from a forwarded
 * link) could POST it here and write `producto_seleccionado_sku` + fire the
 * live WF-06 escalation tags on an ARBITRARY contact. Verifying the
 * signature proves the id was actually minted by us for this exact contact.
 *
 * Runs on Vercel's Node runtime — Node `crypto` + `timingSafeEqual` for a
 * constant-time compare, same secret (ADMIN_SYNC_TOKEN) and truncation (16
 * bytes / 32 hex chars) as the Convex side.
 */

import crypto from 'node:crypto';

const SIG_HEX_LEN = 32; // 16 bytes, hex-encoded — must match convex/_lib/cidSigning.ts.

function hmacHex(secret: string, message: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')
    .slice(0, SIG_HEX_LEN);
}

/**
 * Splits `signedCid` on its last `.`, recomputes the HMAC over the id
 * portion, and returns the id only if the signature matches. Returns null on
 * any malformed input, missing secret, or mismatch (never throws) — the
 * caller should treat null exactly like "no contactId supplied".
 */
export function verifySignedContactId(signedCid: string): string | null {
  const secret = process.env.ADMIN_SYNC_TOKEN;
  if (!secret) return null;

  const dot = signedCid.lastIndexOf('.');
  if (dot <= 0 || dot === signedCid.length - 1) return null;
  const contactId = signedCid.slice(0, dot);
  const providedSig = signedCid.slice(dot + 1);
  if (providedSig.length !== SIG_HEX_LEN) return null;

  const expectedSig = hmacHex(secret, contactId);
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
  return contactId;
}
