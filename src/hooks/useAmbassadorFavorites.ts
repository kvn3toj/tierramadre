/**
 * useAmbassadorFavorites Hook
 * Manages ambassador-curated favorite products with localStorage persistence.
 * Uses synchronous cache init (anti-blink pattern).
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_PREFIX = 'tm-ambassador-favorites-';

function getStorageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`;
}

function loadFavorites(slug: string): string[] {
  try {
    const stored = localStorage.getItem(getStorageKey(slug));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(slug: string, favorites: string[]): void {
  try {
    localStorage.setItem(getStorageKey(slug), JSON.stringify(favorites));
  } catch {
    // Storage full or unavailable
  }
}

interface UseAmbassadorFavoritesReturn {
  favorites: string[];
  addFavorite: (itemId: string) => void;
  removeFavorite: (itemId: string) => void;
  reorderFavorites: (newOrder: string[]) => void;
  isFavorite: (itemId: string) => boolean;
}

export function useAmbassadorFavorites(slug?: string): UseAmbassadorFavoritesReturn {
  // Synchronous cache loading (anti-blink)
  const [favorites, setFavorites] = useState<string[]>(() =>
    slug ? loadFavorites(slug) : []
  );

  // Reload when slug changes (e.g. navigating between profiles)
  useEffect(() => {
    setFavorites(slug ? loadFavorites(slug) : []);
  }, [slug]);

  const addFavorite = useCallback((itemId: string) => {
    if (!slug) return;
    setFavorites(prev => {
      if (prev.includes(itemId)) return prev;
      const next = [...prev, itemId];
      saveFavorites(slug, next);
      return next;
    });
  }, [slug]);

  const removeFavorite = useCallback((itemId: string) => {
    if (!slug) return;
    setFavorites(prev => {
      const next = prev.filter(id => id !== itemId);
      saveFavorites(slug, next);
      return next;
    });
  }, [slug]);

  const reorderFavorites = useCallback((newOrder: string[]) => {
    if (!slug) return;
    setFavorites(newOrder);
    saveFavorites(slug, newOrder);
  }, [slug]);

  const isFavorite = useCallback((itemId: string) => {
    return favorites.includes(itemId);
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, reorderFavorites, isFavorite };
}
