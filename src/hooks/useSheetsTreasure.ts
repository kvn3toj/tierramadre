/**
 * useSheetsTreasure Hook
 *
 * Fetches treasure data from Google Sheets API with localStorage caching.
 * Falls back gracefully if the API is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { TreasureItem } from '../types';
import { STORAGE_KEYS, LEGACY_KEYS } from '../constants/storage-keys';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { catalogRequestInit } from '../utils/catalogAuthHeaders';
import { useSyncCacheState } from './useSyncCache';

// Cache configuration (new treasure namespace)
const SHEETS_CACHE_KEY = STORAGE_KEYS.TREASURE_SHEETS_CACHE;

// Old cache key for migration
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
 * Migrate data from old storage key to new one (run once)
 */
function migrateStorageKey(oldKey: string, newKey: string): void {
  try {
    const oldData = localStorage.getItem(oldKey);
    if (oldData && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldData);
      localStorage.removeItem(oldKey);
      // Migration complete
    }
  } catch (error) {
    console.warn('Storage migration error:', error);
  }
}

/**
 * Get cached data regardless of TTL (for instant initial render)
 */
function getCachedData(): TreasureItem[] | null {
  try {
    const cached = localStorage.getItem(SHEETS_CACHE_KEY);
    if (!cached) return null;

    const { data }: SheetsCache = JSON.parse(cached);
    return data;
  } catch (error) {
    console.warn('Error reading sheets cache:', error);
  }
  return null;
}

/** How recently the cached data was written (ms epoch), or 0 if missing/invalid. */
function getCachedTimestamp(): number {
  try {
    const cached = localStorage.getItem(SHEETS_CACHE_KEY);
    if (!cached) return 0;
    const { timestamp }: SheetsCache = JSON.parse(cached);
    return typeof timestamp === 'number' ? timestamp : 0;
  } catch {
    return 0;
  }
}

/** Skip background refetch if cache is newer than this. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Shared in-flight promise — dedupes concurrent calls from multiple hooks. */
let inflightFetch: Promise<TreasureItem[]> | null = null;

/**
 * Save data to cache
 */
function setCachedData(data: TreasureItem[]): void {
  try {
    const cache: SheetsCache = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(SHEETS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Error writing sheets cache:', error);
  }
}

/**
 * Fetch treasure from Google Sheets API
 * @param notifyOnFailure - show snackbar if all retries fail (use true when user has no cache or forced refresh)
 */
async function fetchFromSheets(
  notifyOnFailure = false,
): Promise<TreasureItem[]> {
  const response = await fetchWithRetry(
    '/api/get-treasure-sheets',
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

  // Auto-sync Drive product folders in background (fire-and-forget)
  fetch('/api/create-product-folders?sync=auto').catch(() => {});

  return result.treasure;
}

/**
 * Get initial sheets data synchronously to prevent URL changes causing image blinks
 */
function getInitialSheetsData(): TreasureItem[] | null {
  // Run storage migration first (synchronous)
  migrateStorageKey(OLD_SHEETS_CACHE_KEY, SHEETS_CACHE_KEY);
  return getCachedData();
}

/**
 * Hook to fetch and manage treasure data from Google Sheets
 */
export function useSheetsTreasure(): UseSheetsTreasureReturn {
  const {
    value: sheetsTreasure,
    setValue: setSheetsTreasure,
    isLoading,
    setIsLoading,
  } = useSyncCacheState<TreasureItem[] | null>(
    getInitialSheetsData,
    (v) => v === null,
  );
  const [error, setError] = useState<string | null>(null);

  // Background-fetch only when the cache is missing or older than CACHE_TTL_MS.
  // Concurrent calls (multiple hooks mounting simultaneously) share a single in-flight
  // promise, so we never hammer the Sheets API during navigation.
  useEffect(() => {
    const hasCachedData = sheetsTreasure !== null;
    const cacheAge = Date.now() - getCachedTimestamp();
    const cacheIsFresh = hasCachedData && cacheAge < CACHE_TTL_MS;

    if (cacheIsFresh) {
      setIsLoading(false);
      return;
    }

    const loadFromSheets = async () => {
      try {
        if (!inflightFetch) {
          inflightFetch = fetchFromSheets(!hasCachedData).finally(() => {
            inflightFetch = null;
          });
        }
        const treasure = await inflightFetch;
        setCachedData(treasure);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Force refresh (ignores cache)
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const treasure = await fetchFromSheets(true);
      setSheetsTreasure(treasure);
      setCachedData(treasure);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
