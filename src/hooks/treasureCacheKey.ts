/**
 * The catalog cache is keyed by grant, and cleared on logout/sign-out.
 *
 * Without both, the server-side projection is defeated locally: the
 * full-fidelity payload an asesor cached would still be sitting in
 * localStorage for the next person to use this device.
 *
 * The key is also scoped by vitrina token, not just staff/anon. A vitrina
 * visitor has no auth token, so a two-way split would land them on the same
 * `anon` bucket as any other anonymous visitor — meaning their payload
 * (which legitimately contains prices for that vitrina's items) would get
 * cached under `anon` and served to the very next plain anonymous visitor on
 * that device. Two different vitrina tokens get two different buckets too,
 * so one vitrina's grant never leaks into another's.
 *
 * An id-list token (e.g. "368" or "368,412") is NOT a vitrina grant — it
 * doesn't prove anything, and catalogUrl() (catalogAuthHeaders.ts) already
 * treats it as anonymous and never sends it to the server. treasureCacheKey
 * imports the same ID_LIST_RE so an id-list maps to the `anon` bucket too;
 * otherwise it would get its own `:vitrina:<idlist>` bucket holding data
 * that is, in fact, anonymous — two functions silently disagreeing about
 * the same input.
 *
 * Uses readFreshSessionToken(), NOT readFreshAuthToken() (2026-08 fix round,
 * alongside catalogAuthHeaders.ts's identical change): catalogRequestInit()
 * — what actually decides what the SERVER sees — now sends only the `tms1`
 * session token, never the raw Google ID token (api/_lib/catalogGrant.ts
 * stopped accepting it for the staff grant). If this cache key used
 * readFreshAuthToken() it could read `:staff` from a fresh Google token
 * while the request that filled the cache was actually sent anonymous
 * (no session token yet) — caching an `anon`-projected payload under the
 * `:staff` bucket, then serving it to that bucket's next reader as if it
 * were the full-fidelity response.
 */
import { readFreshSessionToken } from '../utils/sessionToken';
import { ID_LIST_RE } from '../utils/catalogAuthHeaders';
import {
  TREASURE_CACHE_BASE,
  clearTreasureCaches,
} from '../utils/treasureCacheStorage';

const BASE = TREASURE_CACHE_BASE;

export function treasureCacheKey(vitrinaToken?: string): string {
  if (readFreshSessionToken()) return `${BASE}:staff`;
  if (vitrinaToken && !ID_LIST_RE.test(vitrinaToken)) {
    return `${BASE}:vitrina:${vitrinaToken}`;
  }
  return `${BASE}:anon`;
}

// Re-exported so existing callers (AuthContext.tsx, GoogleAuthContext.tsx)
// keep importing it from here. The implementation lives in
// treasureCacheStorage.ts — a leaf module with no dependency on
// sessionToken.ts — so that sessionToken.ts's handleSessionExpired() can
// import it directly without closing an import cycle
// (sessionToken -> treasureCacheKey -> sessionToken). See that module's
// top comment for the full explanation.
export { clearTreasureCaches };
