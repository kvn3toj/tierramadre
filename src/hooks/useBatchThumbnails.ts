/**
 * useBatchThumbnails Hook
 *
 * Fetches and caches thumbnails for all products from Google Drive.
 * Returns a map of itemNumber -> proxyUrl for efficient grid rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { useSyncCacheState } from './useSyncCache';

// Cache configuration
const CACHE_KEY = STORAGE_KEYS.BATCH_THUMBNAILS;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (hard expiry)
const SOFT_TTL = 30 * 60 * 1000; // 30 minutes (triggers background refresh)

export interface ThumbnailInfo {
  url: string;
  isVideoThumbnail: boolean;
  /** Tiny 20px Google thumbnail URL for LQIP blur-up placeholder */
  tinyThumb?: string;
}

interface ThumbnailCache {
  thumbnails: Record<number, ThumbnailInfo>;
  timestamp: number;
}

interface UseBatchThumbnailsReturn {
  thumbnails: Record<number, ThumbnailInfo>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Load cached thumbnails (valid within CACHE_TTL)
 */
function getCachedThumbnails(): Record<number, ThumbnailInfo> | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { thumbnails, timestamp }: ThumbnailCache = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return thumbnails;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Check if cache is past soft TTL (still valid, but should refresh in background)
 */
function isCacheStale(): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const { timestamp }: ThumbnailCache = JSON.parse(cached);
    return Date.now() - timestamp >= SOFT_TTL;
  } catch {
    return false;
  }
}

/**
 * Save thumbnails to cache
 */
function setCachedThumbnails(thumbnails: Record<number, ThumbnailInfo>): void {
  try {
    const cache: ThumbnailCache = {
      thumbnails,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Fetch thumbnails from API
 * @param notifyOnFailure - toast when all retries fail (off for silent background refresh)
 */
async function fetchThumbnails(notifyOnFailure = false): Promise<Record<number, ThumbnailInfo>> {
  const response = await fetchWithRetry('/api/get-batch-thumbnails', undefined, {
    retries: 3,
    onRetry: (attempt) => console.warn(`[Thumbnails] Retry ${attempt}/3...`),
    notifyOnFailure,
    failureMessage: 'No se pudieron cargar las miniaturas. Intenta de nuevo.',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch thumbnails');
  }

  const data = await response.json();
  if (!data.success || !data.thumbnails) {
    throw new Error('Invalid response from thumbnails API');
  }

  // Handle both old format (string) and new format (object)
  const thumbnails: Record<number, ThumbnailInfo> = {};
  for (const [key, value] of Object.entries(data.thumbnails)) {
    const itemNumber = parseInt(key, 10);
    if (typeof value === 'string') {
      // Old format: just a URL string
      thumbnails[itemNumber] = { url: value, isVideoThumbnail: false };
    } else if (value && typeof value === 'object') {
      // New format: { url, isVideoThumbnail, tinyThumb? }
      const obj = value as { url: string; isVideoThumbnail: boolean; tinyThumb?: string };
      const info: ThumbnailInfo = { url: obj.url, isVideoThumbnail: obj.isVideoThumbnail };
      if (obj.tinyThumb) info.tinyThumb = obj.tinyThumb;
      thumbnails[itemNumber] = info;
    }
  }

  return thumbnails;
}

/**
 * Get initial thumbnails synchronously to prevent URL changes causing image blinks
 */
function getInitialThumbnails(): Record<number, ThumbnailInfo> {
  const cached = getCachedThumbnails();
  return cached && Object.keys(cached).length > 0 ? cached : {};
}

export function useBatchThumbnails(): UseBatchThumbnailsReturn {
  const {
    value: thumbnails,
    setValue: setThumbnails,
    isLoading,
    setIsLoading,
  } = useSyncCacheState<Record<number, ThumbnailInfo>>(
    getInitialThumbnails,
    (v) => Object.keys(v).length === 0
  );
  const [error, setError] = useState<string | null>(null);

  const loadThumbnails = useCallback(async (skipCache = false) => {
    try {
      // Check cache first
      if (!skipCache) {
        const cached = getCachedThumbnails();
        if (cached && Object.keys(cached).length > 0) {
          setThumbnails(cached);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API (user is waiting or explicitly refreshing — notify on hard failure)
      const data = await fetchThumbnails(true);
      setThumbnails(data);
      setCachedThumbnails(data);
      setError(null);
    } catch (err) {
      console.warn('Could not load batch thumbnails:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load - fetch from API if cache was empty, or background-refresh if stale
  useEffect(() => {
    const hasInitialCache = Object.keys(thumbnails).length > 0;
    if (!hasInitialCache) {
      loadThumbnails(true); // No cache — fetch with loading state
    } else if (isCacheStale()) {
      // Cache is valid but stale — refresh silently in background (no loading state)
      fetchThumbnails(false)
        .then((data) => {
          setThumbnails(data);
          setCachedThumbnails(data);
        })
        .catch((err) => console.warn('[Thumbnails] Background refresh failed:', err));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Force refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadThumbnails(true);
  }, [loadThumbnails]);

  return {
    thumbnails,
    isLoading,
    error,
    refresh,
  };
}

export default useBatchThumbnails;
