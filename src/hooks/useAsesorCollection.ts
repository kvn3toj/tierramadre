/**
 * useAsesorCollection
 * Fetches an exclusive product collection from Google Drive for a specific asesor.
 * Uses localStorage caching with synchronous initialization (anti-blink pattern).
 */

import { useState, useEffect, useCallback } from 'react';
import { TreasureItem } from '../types';

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

function getCacheKey(folder: string) {
  return `collection_${folder}`;
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

export function useAsesorCollection(collectionFolder: string | null): UseAsesorCollectionReturn {
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
      const response = await fetch(`/api/get-collection?folder=${encodeURIComponent(folder)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch collection (${response.status})`);
      }
      const json = await response.json();
      const cache: CollectionCache = {
        collection: json.data.collection,
        products: json.data.products,
        timestamp: Date.now(),
      };
      localStorage.setItem(getCacheKey(folder), JSON.stringify(cache));
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
