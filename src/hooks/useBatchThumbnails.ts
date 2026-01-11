/**
 * useBatchThumbnails Hook
 *
 * Fetches and caches thumbnails for all products from Google Drive.
 * Returns a map of itemNumber -> proxyUrl for efficient grid rendering.
 */

import { useState, useEffect, useCallback } from 'react';

// Cache configuration
const CACHE_KEY = 'tierramadre-batch-thumbnails';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface ThumbnailCache {
  thumbnails: Record<number, string>;
  timestamp: number;
}

interface UseBatchThumbnailsReturn {
  thumbnails: Record<number, string>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Load cached thumbnails
 */
function getCachedThumbnails(): Record<number, string> | null {
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
function setCachedThumbnails(thumbnails: Record<number, string>): void {
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
async function fetchThumbnails(): Promise<Record<number, string>> {
  const response = await fetch('/api/get-batch-thumbnails');

  if (!response.ok) {
    throw new Error('Failed to fetch thumbnails');
  }

  const data = await response.json();
  if (!data.success || !data.thumbnails) {
    throw new Error('Invalid response from thumbnails API');
  }

  return data.thumbnails;
}

export function useBatchThumbnails(): UseBatchThumbnailsReturn {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
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

  // Initial load
  useEffect(() => {
    loadThumbnails();
  }, [loadThumbnails]);

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
