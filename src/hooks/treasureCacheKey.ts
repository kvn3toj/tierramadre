/**
 * The catalog cache is keyed by grant, and cleared on logout.
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
 */
import { readFreshAuthToken } from '../utils/sessionToken';
import { STORAGE_KEYS, LEGACY_KEYS } from '../constants/storage-keys';

const BASE = STORAGE_KEYS.TREASURE_SHEETS_CACHE;

export function treasureCacheKey(vitrinaToken?: string): string {
  if (readFreshAuthToken()) return `${BASE}:staff`;
  if (vitrinaToken) return `${BASE}:vitrina:${vitrinaToken}`;
  return `${BASE}:anon`;
}

/**
 * Removes every grant-scoped cache (staff, anon, and every vitrina token),
 * plus the pre-grant unscoped key and the pre-rename legacy key — both hold
 * the same full-fidelity data (prices, asesor, ubicación) and predate access
 * control entirely, so neither can be trusted to belong to any one grant.
 */
export function clearTreasureCaches(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === BASE || key.startsWith(`${BASE}:`)) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem(LEGACY_KEYS.INVENTORY_SHEETS_CACHE);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
