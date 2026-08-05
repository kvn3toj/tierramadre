/**
 * useSheetsTreasure Hook
 *
 * Fetches treasure data from Google Sheets API with localStorage caching.
 * Falls back gracefully if the API is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { TreasureItem } from '../types';
import { LEGACY_KEYS } from '../constants/storage-keys';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { catalogRequestInit, catalogUrl } from '../utils/catalogAuthHeaders';
import { ensureAppSession } from '../utils/sessionToken';
import { useSyncCacheState } from './useSyncCache';
import { treasureCacheKey } from './treasureCacheKey';

// Pre-rename legacy cache key, predating this namespace entirely.
const OLD_SHEETS_CACHE_KEY = LEGACY_KEYS.INVENTORY_SHEETS_CACHE;

interface SheetsCache {
  data: TreasureItem[];
  timestamp: number;
}

interface UseSheetsTreasureReturn {
  /** Treasure data from Google Sheets (null if not loaded or unavailable) */
  sheetsTreasure: TreasureItem[] | null;
  /** Whether the data is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Force refresh from Google Sheets (ignores cache) */
  refresh: () => Promise<void>;
  /** Whether we're using Sheets data (vs fallback) */
  isUsingSheets: boolean;
}

/** @deprecated Use UseSheetsTreasureReturn instead */
export type UseSheetsInventoryReturn = UseSheetsTreasureReturn;

/**
 * Purge the pre-rename legacy cache key. It predates access control entirely
 * — unscoped by grant — so unlike a normal key-rename migration it cannot be
 * safely carried forward into any one grant's bucket; it is deleted instead.
 * clearTreasureCaches() (treasureCacheKey.ts) removes it again on logout as
 * a belt-and-suspenders guard, in case this purge hasn't run yet on a tab.
 */
function purgeLegacyCache(): void {
  try {
    localStorage.removeItem(OLD_SHEETS_CACHE_KEY);
  } catch (error) {
    console.warn('Error purging legacy sheets cache:', error);
  }
}

/**
 * Get cached data regardless of TTL (for instant initial render)
 */
function getCachedData(vitrinaToken?: string): TreasureItem[] | null {
  try {
    const cached = localStorage.getItem(treasureCacheKey(vitrinaToken));
    if (!cached) return null;

    const { data }: SheetsCache = JSON.parse(cached);
    return data;
  } catch (error) {
    console.warn('Error reading sheets cache:', error);
  }
  return null;
}

/** How recently the cached data was written (ms epoch), or 0 if missing/invalid. */
function getCachedTimestamp(vitrinaToken?: string): number {
  try {
    const cached = localStorage.getItem(treasureCacheKey(vitrinaToken));
    if (!cached) return 0;
    const { timestamp }: SheetsCache = JSON.parse(cached);
    return typeof timestamp === 'number' ? timestamp : 0;
  } catch {
    return 0;
  }
}

/** Skip background refetch if cache is newer than this. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Shared in-flight promises — dedupes concurrent calls from multiple hooks.
 * Keyed by the same grant identity as treasureCacheKey(), NOT just a single
 * shared slot: two hooks fetching for different vitrina tokens (e.g.
 * navigating back/forward between two vitrina links while VitrinaContent
 * stays mounted) must never be handed each other's in-flight promise — that
 * would be one client receiving another client's grant.
 */
const inflightFetches = new Map<string, Promise<TreasureItem[]>>();

/**
 * Save data to cache, under a cache key the CALLER computed — never
 * recomputed here from `vitrinaToken` (N2/N3, 2026-08 fix round 3).
 *
 * `treasureCacheKey()` reads the CURRENT session-token state, which can
 * change during the `await` a fetch spans (a fire-and-forget session mint
 * landing mid-request, or a sign-out's `clearTreasureCaches()` racing an
 * in-flight staff read). Recomputing the key at write time targets whatever
 * bucket is current NOW, not the one the request actually authenticated
 * as — writing an anon-projected payload into the `:staff` bucket (masking
 * missing prices for 5 minutes via `cacheIsFresh`), or a staff payload into
 * `:anon` after logout (painting priced data for the next visitor). Callers
 * must compute the key ONCE, before the request, and pass the same value
 * here.
 */
function setCachedData(data: TreasureItem[], cacheKey: string): void {
  try {
    const cache: SheetsCache = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch (error) {
    console.warn('Error writing sheets cache:', error);
  }
}

/**
 * Fetch treasure from Google Sheets API
 * @param notifyOnFailure - show snackbar if all retries fail (use true when user has no cache or forced refresh)
 * @param isRetry - internal: true only on the single session-refresh retry
 *   triggered by `tokenRejected` (see below). Guards against a permanently
 *   dead session looping forever.
 */
async function fetchFromSheets(
  notifyOnFailure = false,
  vitrinaToken?: string,
  isRetry = false,
): Promise<TreasureItem[]> {
  const response = await fetchWithRetry(
    catalogUrl('/api/get-treasure-sheets', vitrinaToken),
    catalogRequestInit(),
    {
      retries: 3,
      onRetry: (attempt) => console.warn(`[Sheets] Retry ${attempt}/3...`),
      notifyOnFailure,
      failureMessage: 'No se pudo cargar el inventario. Intenta de nuevo.',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch treasure from Google Sheets');
  }

  const result = await response.json();
  if (!result.success || !result.treasure) {
    throw new Error('Invalid response from Google Sheets API');
  }

  // The server saw a bearer token that failed to verify (session expired,
  // forged, or clock-skewed) — as opposed to no credential at all. Refresh
  // the session once and retry, so an asesor's price visibility recovers
  // silently instead of looking like the app is broken. isRetry stops this
  // from looping if the refresh doesn't fix it.
  if (result.tokenRejected && !isRetry) {
    await ensureAppSession(); // src/utils/sessionToken.ts
    return fetchFromSheets(notifyOnFailure, vitrinaToken, true);
  }

  // Auto-sync Drive product folders in background (fire-and-forget)
  fetch('/api/create-product-folders?sync=auto').catch(() => {});

  return result.treasure;
}

/**
 * Get initial sheets data synchronously to prevent URL changes causing image blinks
 */
function getInitialSheetsData(vitrinaToken?: string): TreasureItem[] | null {
  // Purge the legacy key first (synchronous) — see purgeLegacyCache().
  purgeLegacyCache();
  return getCachedData(vitrinaToken);
}

/**
 * Hook to fetch and manage treasure data from Google Sheets
 * @param vitrinaToken - stateful vitrina share token, so the server can
 *   resolve the grant and return curated prices (see catalogUrl).
 */
export function useSheetsTreasure(
  vitrinaToken?: string,
): UseSheetsTreasureReturn {
  const {
    value: sheetsTreasure,
    setValue: setSheetsTreasure,
    isLoading,
    setIsLoading,
  } = useSyncCacheState<TreasureItem[] | null>(
    () => getInitialSheetsData(vitrinaToken),
    (v) => v === null,
  );
  const [error, setError] = useState<string | null>(null);

  // Background-fetch only when the cache is missing or older than CACHE_TTL_MS.
  // Concurrent calls (multiple hooks mounting simultaneously) share a single
  // in-flight promise PER GRANT (see inflightFetches), so we never hammer the
  // Sheets API during navigation, and never hand one grant's response to a
  // caller waiting on a different one.
  useEffect(() => {
    const loadFromSheets = async () => {
      // N2 (2026-08 fix round 3): AWAIT the session mint before computing
      // the cache key or firing the request — not the fire-and-forget
      // `void ensureAppSession()` GoogleAuthContext's sign-in already
      // triggered. Without this, a staff member's first catalog read after
      // sign-in raced that mint: it read `anon` (no bearer offered yet, so
      // `tokenRejected` — the existing recovery path — never fires either),
      // and `cacheIsFresh` then hid the price-free result for 5 minutes.
      // Cheap when there's nothing to do: ensureAppSession() no-ops
      // synchronously-ish for a true anonymous visitor or an
      // already-fresh session.
      await ensureAppSession();

      // Computed ONCE, after the await above settles auth state, and
      // reused for both the fetch dedup key and the cache write below —
      // never recomputed after a later await (that recomputation was the
      // N2/N3 bug: it targets whatever bucket is current at write time,
      // not the one this fetch actually authenticated as).
      const cacheKey = treasureCacheKey(vitrinaToken);
      const hasCachedData = sheetsTreasure !== null;
      const cacheAge = Date.now() - getCachedTimestamp(vitrinaToken);
      const cacheIsFresh = hasCachedData && cacheAge < CACHE_TTL_MS;

      if (cacheIsFresh) {
        setIsLoading(false);
        return;
      }

      try {
        let promise = inflightFetches.get(cacheKey);
        if (!promise) {
          promise = fetchFromSheets(!hasCachedData, vitrinaToken).finally(
            () => {
              inflightFetches.delete(cacheKey);
            },
          );
          inflightFetches.set(cacheKey, promise);
        }
        const treasure = await promise;
        setCachedData(treasure, cacheKey);
        setSheetsTreasure((prev) => {
          if (!prev) return treasure;
          const prevJson = JSON.stringify(prev);
          const nextJson = JSON.stringify(treasure);
          return prevJson === nextJson ? prev : treasure;
        });
      } catch (err) {
        if (!hasCachedData) {
          console.warn('Could not load from Google Sheets:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFromSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitrinaToken]);

  // Force refresh (ignores cache)
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Same reasoning as the effect above: settle the session first, then
      // compute the cache key ONCE and reuse it for the write.
      await ensureAppSession();
      const cacheKey = treasureCacheKey(vitrinaToken);
      const treasure = await fetchFromSheets(true, vitrinaToken);
      setSheetsTreasure(treasure);
      setCachedData(treasure, cacheKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [vitrinaToken]);

  return {
    sheetsTreasure,
    isLoading,
    error,
    refresh,
    isUsingSheets: sheetsTreasure !== null,
  };
}

/** @deprecated Use useSheetsTreasure instead */
export function useSheetsInventory() {
  const result = useSheetsTreasure();
  return {
    ...result,
    // Backward-compatible alias
    sheetsInventory: result.sheetsTreasure,
  };
}

export default useSheetsTreasure;
