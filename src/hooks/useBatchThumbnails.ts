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
 * Normalize raw thumbnails payload (from API or seed JSON) into ThumbnailInfo map.
 * Accepts both legacy string URLs and the new {url, isVideoThumbnail, tinyThumb?} shape.
 */
function normalizeThumbnails(raw: Record<string, unknown>): Record<number, ThumbnailInfo> {
  const thumbnails: Record<number, ThumbnailInfo> = {};
  for (const [key, value] of Object.entries(raw)) {
    const itemNumber = parseInt(key, 10);
    if (typeof value === 'string') {
      thumbnails[itemNumber] = { url: value, isVideoThumbnail: false };
    } else if (value && typeof value === 'object') {
      const obj = value as { url: string; isVideoThumbnail: boolean; tinyThumb?: string };
      const info: ThumbnailInfo = { url: obj.url, isVideoThumbnail: obj.isVideoThumbnail };
      if (obj.tinyThumb) info.tinyThumb = obj.tinyThumb;
      thumbnails[itemNumber] = info;
    }
  }
  return thumbnails;
}

/**
 * Fetch the static seed snapshot generated at build time.
 * Returns null on any failure or if the seed is empty — the hook then falls
 * back to the live API. Uses default browser cache so repeat visits are free.
 */
async function fetchSeed(): Promise<Record<number, ThumbnailInfo> | null> {
  try {
    const response = await fetch('/thumbnails-seed.json', { cache: 'default' });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.thumbnails || typeof data.thumbnails !== 'object') return null;
    const normalized = normalizeThumbnails(data.thumbnails);
    return Object.keys(normalized).length > 0 ? normalized : null;
  } catch {
    return null;
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

  return normalizeThumbnails(data.thumbnails);
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

  // Initial load:
  //   1. localStorage cache → use it, background-refresh if stale (existing path)
  //   2. No cache → try static seed (instant from CDN), then refresh from API
  //   3. No seed either → fall back to blocking API fetch with loading state
  useEffect(() => {
    const hasInitialCache = Object.keys(thumbnails).length > 0;
    if (hasInitialCache) {
      if (isCacheStale()) {
        fetchThumbnails(false)
          .then((data) => {
            setThumbnails(data);
            setCachedThumbnails(data);
          })
          .catch((err) => console.warn('[Thumbnails] Background refresh failed:', err));
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const seed = await fetchSeed();
      if (cancelled) return;

      if (seed) {
        // Instant first paint from the build-time seed.
        setThumbnails(seed);
        setCachedThumbnails(seed);
        setIsLoading(false);
        // Background refresh to pick up anything added since the seed.
        fetchThumbnails(false)
          .then((data) => {
            if (cancelled) return;
            setThumbnails(data);
            setCachedThumbnails(data);
          })
          .catch((err) => console.warn('[Thumbnails] Seed refresh failed:', err));
      } else {
        // No seed available — original blocking load path.
        loadThumbnails(true);
      }
    })();

    return () => {
      cancelled = true;
    };
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
