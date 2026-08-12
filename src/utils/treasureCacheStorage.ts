/**
 * Deliberately dependency-free leaf module for clearing the catalog cache.
 *
 * Why this file exists (and isn't just part of treasureCacheKey.ts):
 * treasureCacheKey.ts imports readFreshAuthToken from sessionToken.ts. If
 * sessionToken.ts's handleSessionExpired() needed clearTreasureCaches() from
 * treasureCacheKey.ts, that would close an import cycle
 * (sessionToken -> treasureCacheKey -> sessionToken). Both sides instead
 * import the clearing logic from here, which depends on nothing but the
 * storage key constants — so the cycle never forms.
 *
 * treasureCacheKey.ts re-exports clearTreasureCaches from this module, so
 * existing callers (AuthContext.tsx, GoogleAuthContext.tsx) keep importing
 * it from '../hooks/treasureCacheKey' unchanged; only sessionToken.ts needs
 * to reach in here directly.
 */
import { STORAGE_KEYS, LEGACY_KEYS } from '../constants/storage-keys';

export const TREASURE_CACHE_BASE = STORAGE_KEYS.TREASURE_SHEETS_CACHE;
// useAsesorCollection's /c/:folder cache (F6, 2026-08 fix round) — same
// grant-scoping and same clear-on-logout requirement as the main treasure
// cache, so it's purged by the same function rather than needing its own
// wiring into AuthContext/GoogleAuthContext/sessionToken's sign-out paths.
export const ASESOR_COLLECTION_CACHE_BASE =
  STORAGE_KEYS.ASESOR_COLLECTION_CACHE;
// useAsesores' roster cache — same reasoning, found alongside F6.
export const ASESORES_CACHE_BASE = STORAGE_KEYS.ASESORES_CACHE;
export const ASESORES_CACHE_TS_BASE = STORAGE_KEYS.ASESORES_CACHE_TS;
// The published-catalog cache introduced by Fix 1C (2026-08-12). Unscoped by
// design — it mirrors the anonymous `products.publishedCatalog` query, so there
// is no grant to scope it by — but purged here all the same: it carries the
// same price / asesor / ubicación payload as its neighbours above.
export const PUBLISHED_CATALOG_CACHE_KEY = STORAGE_KEYS.PUBLISHED_CATALOG_CACHE;

/**
 * Removes every grant-scoped cache (staff, anon, and every vitrina token),
 * plus the pre-grant unscoped key and the pre-rename legacy key — both hold
 * the same full-fidelity data (prices, asesor, ubicación) and predate access
 * control entirely, so neither can be trusted to belong to any one grant.
 * Also removes every grant-scoped asesor-collection and asesores-roster
 * cache (F6), AND their pre-fix unscoped forms (N7, 2026-08 fix round 3):
 * `tm-asesores` / `tm-asesores-ts` (full roster, including email and
 * vaultCode) and `collection_v2_<folder>` (priced) predate grant-scoping
 * exactly like `LEGACY_KEYS.INVENTORY_SHEETS_CACHE` does for the main
 * treasure cache — without this, those two families would sit on every
 * device that used the app before this fix landed and survive logout
 * forever, since a `:`-suffix match alone never touches them.
 */
export function clearTreasureCaches(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (
        key === TREASURE_CACHE_BASE ||
        key.startsWith(`${TREASURE_CACHE_BASE}:`) ||
        key.startsWith(`${ASESOR_COLLECTION_CACHE_BASE}:`) ||
        // Pre-fix unscoped format: `collection_v2_<folder>` (underscore,
        // no grant segment) — see useAsesorCollection.ts's history.
        key.startsWith(`${ASESOR_COLLECTION_CACHE_BASE}_`) ||
        key === ASESORES_CACHE_BASE ||
        key.startsWith(`${ASESORES_CACHE_BASE}:`) ||
        key === ASESORES_CACHE_TS_BASE ||
        key.startsWith(`${ASESORES_CACHE_TS_BASE}:`)
      ) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem(LEGACY_KEYS.INVENTORY_SHEETS_CACHE);
    localStorage.removeItem(PUBLISHED_CATALOG_CACHE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
