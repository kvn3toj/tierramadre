/**
 * Builds the RequestInit for catalog reads.
 *
 * Returns `undefined` when there is nothing to send, so anonymous requests
 * stay byte-identical to what they were before access control landed.
 *
 * Sends the `tms1` APP session token ONLY — never the raw Google ID token.
 * `api/_lib/catalogGrant.ts` stopped accepting Google ID tokens for the
 * catalog's staff grant (2026-08 fix round: a Google token only proves "some
 * Gmail account", not roster membership, since the OAuth client ID is public
 * and ships in this bundle). Sending it here would just mean the server
 * silently degrades every asesor to `anon` until their session token mints.
 * `ensureAppSession()` mints/refreshes that session token; the `tokenRejected`
 * retry path in useSheetsTreasure.ts is what closes the gap for a caller who
 * currently only has a fresh Google token.
 */
import { readFreshSessionToken } from './sessionToken';

export function catalogRequestInit(): RequestInit | undefined {
  const token = readFreshSessionToken();
  if (!token) return undefined;
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * Mirrors ID_LIST_RE in VitrinaPage.tsx:57 — id-lists prove nothing.
 * Exported so treasureCacheKey() (hooks/treasureCacheKey.ts) applies the
 * exact same rule for what counts as a vitrina token: an id-list must map
 * to the same cache bucket it fetches from (anon), not a bucket of its own.
 */
export const ID_LIST_RE = /^\d+([-,]\d+)*$/;

/**
 * Appends `?vitrina=<token>` for stateful share tokens only. Filtering
 * id-lists here saves a pointless round trip; the server rejects them too.
 */
export function catalogUrl(path: string, vitrinaToken?: string): string {
  if (!vitrinaToken || ID_LIST_RE.test(vitrinaToken)) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}vitrina=${encodeURIComponent(vitrinaToken)}`;
}
