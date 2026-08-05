/**
 * useAsesorCollection
 * Fetches an exclusive product collection from Google Drive for a specific asesor.
 * Uses localStorage caching with synchronous initialization (anti-blink pattern).
 */

import { useState, useEffect, useCallback } from 'react';
import { TreasureItem } from '../types';
import { catalogRequestInit } from '../utils/catalogAuthHeaders';
import { readFreshSessionToken, ensureAppSession } from '../utils/sessionToken';
import { STORAGE_KEYS } from '../constants/storage-keys';

interface CollectionInfo {
  name: string;
  description: string;
  asesorEmail: string;
}

interface CollectionCache {
  collection: CollectionInfo;
  products: TreasureItem[];
  timestamp: number;
}

interface UseAsesorCollectionReturn {
  products: TreasureItem[];
  collectionInfo: CollectionInfo | null;
  isLoading: boolean;
  error: string | null;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Grant-scoped (F6, 2026-08 fix round): the un-scoped `collection_v2_<folder>`
 * key predates access control and let a staff device's cached collection
 * payload survive logout to paint for the next anonymous visitor on that
 * device — the same leak Task 5 closed for the main treasure cache
 * (treasureCacheKey.ts), reopened here because this cache was never
 * touched. Cleared alongside the others by clearTreasureCaches()
 * (treasureCacheStorage.ts). `readFreshSessionToken()`, not
 * readFreshAuthToken() — must mirror catalogRequestInit()'s session-token-
 * only signal, same reasoning as treasureCacheKey.ts.
 */
function getCacheKey(folder: string) {
  const grant = readFreshSessionToken() ? 'staff' : 'anon';
  return `${STORAGE_KEYS.ASESOR_COLLECTION_CACHE}:${grant}:${folder}`;
}

function readCache(folder: string): CollectionCache | null {
  try {
    const raw = localStorage.getItem(getCacheKey(folder));
    if (!raw) return null;
    const parsed: CollectionCache = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useAsesorCollection(
  collectionFolder: string | null,
): UseAsesorCollectionReturn {
  const [data, setData] = useState<CollectionCache | null>(() => {
    if (!collectionFolder) return null;
    return readCache(collectionFolder);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = useCallback(async (folder: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Settle the session BEFORE reading the cache key or firing the
      // request, same reasoning as useSheetsTreasure.ts (N2, 2026-08 fix
      // round 3) — a fire-and-forget session mint landing mid-request must
      // not leave the cache key computed at write time out of sync with
      // what the request actually authenticated as.
      await ensureAppSession();
      const cacheKey = getCacheKey(folder);
      const response = await fetch(
        `/api/get-collection?folder=${encodeURIComponent(folder)}`,
        catalogRequestInit(),
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch collection (${response.status})`);
      }
      const json = await response.json();
      const cache: CollectionCache = {
        collection: json.collection,
        products: json.products,
        timestamp: Date.now(),
      };
      // `cacheKey` computed ONCE, above — never recomputed after the awaits
      // this function spans (N3: the same write-after-await bug that could
      // paint a staff-cached, priced payload for the next anonymous
      // visitor after a sign-out race).
      localStorage.setItem(cacheKey, JSON.stringify(cache));
      setData(cache);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading collection');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collectionFolder) {
      setData(null);
      return;
    }

    // Always fetch fresh data in background, even if we have cache
    fetchCollection(collectionFolder);
  }, [collectionFolder, fetchCollection]);

  return {
    products: data?.products ?? [],
    collectionInfo: data?.collection ?? null,
    isLoading: isLoading && !data, // Only show loading if no cached data
    error,
  };
}
