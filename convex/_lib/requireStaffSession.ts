/**
 * Server-side "is this caller staff" gate for INTERNAL-ONLY Convex `query`
 * functions — clients, providers, sales, lots, lotItems, asesorMovements,
 * fotosintesisAi, and the raw `products.list` — none of which are part of
 * the public catalog surface (see products.publishedCatalog et al, which
 * this file does NOT touch).
 *
 * Why not `requireAccessLevel` (./authz.ts): that verifies a Google ID token
 * against Google's `tokeninfo` endpoint via `fetch`, which only works inside
 * a Convex `action` — a `query` has no network access, so it would throw at
 * import/call time if used here.
 *
 * Why a bare signature check IS enough authorization: a valid `tms1` session
 * token is only ever minted by `/api/validate?action=mint-session`, and only
 * for a caller who already passed the Asesores/Proveedores roster check
 * there (see src/utils/sessionToken.ts, api/_lib/sessionToken.ts). So a
 * token that verifies (correct HMAC, not expired) already proves the caller
 * is staff — no separate roster lookup is needed, and none would be
 * possible from a query anyway.
 *
 * Fails closed: missing, malformed, tampered, expired, or unverifiable
 * (e.g. ADMIN_SYNC_TOKEN unset) all resolve to `false`. This function must
 * NEVER throw — callers use it as a plain boolean gate, and a query that
 * throws surfaces as a broken screen instead of an empty one.
 */

import { isSessionToken, verifySessionToken } from './sessionToken';

export async function isStaffSession(sessionToken?: string): Promise<boolean> {
  if (!sessionToken) return false;
  try {
    if (!isSessionToken(sessionToken)) return false;
    const payload = await verifySessionToken(sessionToken);
    return payload !== null;
  } catch {
    return false;
  }
}
