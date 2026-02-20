/**
 * useSheetsTreasure Hook
 *
 * Fetches treasure data from Google Sheets API with localStorage caching.
 * Falls back gracefully if the API is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { TreasureItem } from '../types';
import { STORAGE_KEYS, LEGACY_KEYS } from '../constants/storage-keys';

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
 */
async function fetchFromSheets(): Promise<TreasureItem[]> {
  const response = await fetch('/api/get-treasure-sheets');

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
  // Initialize with cached data synchronously to prevent treasure changes (image blinking)
  const [sheetsTreasure, setSheetsTreasure] = useState<TreasureItem[] | null>(getInitialSheetsData);
  const [isLoading, setIsLoading] = useState(() => getInitialSheetsData() === null);
  const [error, setError] = useState<string | null>(null);

  // Always background-fetch fresh data from API.
  // If cache existed, we show it instantly (no blink), then silently update if data changed.
  useEffect(() => {
    const hasCachedData = sheetsTreasure !== null;

    const loadFromSheets = async () => {
      try {
        const treasure = await fetchFromSheets();
        setCachedData(treasure);
        // Only trigger re-render if data actually changed
        setSheetsTreasure(prev => {
          if (!prev) return treasure;
          const prevJson = JSON.stringify(prev);
          const nextJson = JSON.stringify(treasure);
          return prevJson === nextJson ? prev : treasure;
        });
      } catch (err) {
        // If we have cached data, silently ignore the error
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
      const treasure = await fetchFromSheets();
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
