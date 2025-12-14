/**
 * useSheetsInventory Hook
 *
 * Fetches inventory data from Google Sheets API with localStorage caching.
 * Falls back gracefully if the API is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types';

// Cache configuration
const SHEETS_CACHE_KEY = 'tierramadre-inventory-sheets-cache';
const SHEETS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface SheetsCache {
  data: InventoryItem[];
  timestamp: number;
}

interface UseSheetsInventoryReturn {
  /** Inventory data from Google Sheets (null if not loaded or unavailable) */
  sheetsInventory: InventoryItem[] | null;
  /** Whether the data is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Force refresh from Google Sheets (ignores cache) */
  refresh: () => Promise<void>;
  /** Whether we're using Sheets data (vs fallback) */
  isUsingSheets: boolean;
}

/**
 * Check if cached data is still valid
 */
function getCachedData(): InventoryItem[] | null {
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
function setCachedData(data: InventoryItem[]): void {
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
 * Fetch inventory from Google Sheets API
 */
async function fetchFromSheets(): Promise<InventoryItem[]> {
  const response = await fetch('/api/get-inventory-sheets');
  if (!response.ok) {
    throw new Error('Failed to fetch inventory from Google Sheets');
  }

  const result = await response.json();
  if (!result.success || !result.inventory) {
    throw new Error('Invalid response from Google Sheets API');
  }

  return result.inventory;
}

/**
 * Hook to fetch and manage inventory data from Google Sheets
 */
export function useSheetsInventory(): UseSheetsInventoryReturn {
  const [sheetsInventory, setSheetsInventory] = useState<InventoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load with cache check
  useEffect(() => {
    const loadFromSheets = async () => {
      try {
        // Check cache first
        const cachedData = getCachedData();
        if (cachedData) {
          setSheetsInventory(cachedData);
          setIsLoading(false);
          return;
        }

        // Fetch from API
        const inventory = await fetchFromSheets();
        setSheetsInventory(inventory);
        setCachedData(inventory);
      } catch (err) {
        console.warn('Could not load from Google Sheets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadFromSheets();
  }, []);

  // Force refresh (ignores cache)
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const inventory = await fetchFromSheets();
      setSheetsInventory(inventory);
      setCachedData(inventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sheetsInventory,
    isLoading,
    error,
    refresh,
    isUsingSheets: sheetsInventory !== null,
  };
}

export default useSheetsInventory;
