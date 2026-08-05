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

/**
 * Removes every grant-scoped cache (staff, anon, and every vitrina token),
 * plus the pre-grant unscoped key and the pre-rename legacy key — both hold
 * the same full-fidelity data (prices, asesor, ubicación) and predate access
 * control entirely, so neither can be trusted to belong to any one grant.
 */
export function clearTreasureCaches(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (
        key === TREASURE_CACHE_BASE ||
        key.startsWith(`${TREASURE_CACHE_BASE}:`)
      ) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem(LEGACY_KEYS.INVENTORY_SHEETS_CACHE);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
