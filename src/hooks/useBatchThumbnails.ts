/**
 * useBatchThumbnails Hook
 *
 * Fetches and caches thumbnails for all products from Google Drive.
 * Returns a map of itemNumber -> proxyUrl for efficient grid rendering.
 */

import { useState, useEffect, useCallback } from 'react';

// Cache configuration
const CACHE_KEY = 'tierramadre-batch-thumbnails-v2'; // v2 for new format
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export interface ThumbnailInfo {
  url: string;
  isVideoThumbnail: boolean;
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
 * Load cached thumbnails
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
 */
async function fetchThumbnails(): Promise<Record<number, ThumbnailInfo>> {
  const response = await fetch('/api/get-batch-thumbnails');

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
      // New format: { url, isVideoThumbnail }
      const obj = value as { url: string; isVideoThumbnail: boolean };
      thumbnails[itemNumber] = { url: obj.url, isVideoThumbnail: obj.isVideoThumbnail };
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
  // Initialize with cached data synchronously to prevent image URL changes (blinking)
  const [thumbnails, setThumbnails] = useState<Record<number, ThumbnailInfo>>(getInitialThumbnails);
  const [isLoading, setIsLoading] = useState(() => Object.keys(getInitialThumbnails()).length === 0);
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

      // Fetch from API
      const data = await fetchThumbnails();
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

  // Initial load - only fetch from API if cache was empty (already loaded synchronously)
  useEffect(() => {
    const hasInitialCache = Object.keys(thumbnails).length > 0;
    if (!hasInitialCache) {
      loadThumbnails(true); // Skip cache check, go directly to API
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
