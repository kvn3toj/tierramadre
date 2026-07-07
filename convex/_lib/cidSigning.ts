/**
 * HMAC-signs the GHL contactId embedded in vitrina `?cid=` links.
 *
 * `?cid=<ghlContactId>` (minted by `ghl.searchProducts`, read by
 * api/vitrina-select.ts) used to be the raw, unsigned contact id — any
 * caller who obtained ANY valid-shaped id (their own, or one scraped from a
 * forwarded link) could POST it to /api/vitrina-select and write
 * `producto_seleccionado_sku` + fire the live WF-06 escalation tags on an
 * ARBITRARY GHL contact, since that endpoint is intentionally public (no
 * auth — called from an anonymous client's browser). Signing the id here
 * and verifying the signature there (api/vitrina-select.ts, Node
 * `crypto.createHmac`, same secret + same truncation) closes that without
 * adding a stateful token store.
 *
 * Uses ADMIN_SYNC_TOKEN as the signing secret — already provisioned on both
 * Convex and Vercel for the Sheets-sync / GHL-mutation hops (see
 * `requireServerSecret` above in ghl.ts).
 */

const SIG_BYTES = 16; // 128-bit truncation — ample forgery resistance for a short-lived, low-value capability, keeps the cid short for a WhatsApp link.

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  const bytes = new Uint8Array(sigBuf).slice(0, SIG_BYTES);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Returns `${contactId}.${signature}`, or null if ADMIN_SYNC_TOKEN isn't
 * configured on this Convex deployment (fail closed — callers should then
 * omit the cid rather than embed an unsigned/forgeable one).
 *
 * `searchProducts` (the bot's product-recommendation tool) is on the live
 * conversation's critical path and the cid is an optional enhancement — see
 * its own "links minted without it simply skip that deterministic write"
 * comment — so a crypto failure here degrades to "no cid" instead of
 * breaking product search for the whole conversation.
 */
export async function signContactId(contactId: string): Promise<string | null> {
  const secret = process.env.ADMIN_SYNC_TOKEN;
  if (!secret) return null;
  try {
    const sig = await hmacHex(secret, contactId);
    return `${contactId}.${sig}`;
  } catch (err) {
    console.error('[cidSigning] Failed to sign contactId:', err);
    return null;
  }
}
