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
const SHEETS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
 * Check if cached data is still valid
 */
function getCachedData(): TreasureItem[] | null {
  try {
    const cached = localStorage.getItem(SHEETS_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp }: SheetsCache = JSON.parse(cached);
    if (Date.now() - timestamp < SHEETS_CACHE_TTL) {
      return data;
    }
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

  // Load from API only if cache was empty
  useEffect(() => {
    // Skip if we already have cached data
    if (sheetsTreasure !== null) return;

    const loadFromSheets = async () => {
      try {
        // Fetch from API (cache was empty)
        const treasure = await fetchFromSheets();
        setSheetsTreasure(treasure);
        setCachedData(treasure);
      } catch (err) {
        console.warn('Could not load from Google Sheets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
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
