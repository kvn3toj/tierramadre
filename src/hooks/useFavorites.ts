/**
 * useFavorites Hook
 * Manages favorite items with localStorage persistence.
 * Part of the engagement features for Tierra Madre treasure browser.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'tierramadre-favorites';

interface FavoritesData {
  items: number[]; // Item IDs
  lastUpdated: string;
}

interface UseFavoritesReturn {
  favorites: number[];
  isFavorite: (itemId: number) => boolean;
  toggleFavorite: (itemId: number) => void;
  addFavorite: (itemId: number) => void;
  removeFavorite: (itemId: number) => void;
  clearFavorites: () => void;
  favoritesCount: number;
}

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: FavoritesData = JSON.parse(stored);
        return data.items || [];
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
    return [];
  });

  // Persist to localStorage whenever favorites change
  useEffect(() => {
    try {
      const data: FavoritesData = {
        items: favorites,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, [favorites]);

  // Check if an item is favorited
  const isFavorite = useCallback(
    (itemId: number) => favorites.includes(itemId),
    [favorites]
  );

  // Toggle favorite status
  const toggleFavorite = useCallback((itemId: number) => {
    setFavorites((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      }
      return [...prev, itemId];
    });
  }, []);

  // Add to favorites
  const addFavorite = useCallback((itemId: number) => {
    setFavorites((prev) => {
      if (prev.includes(itemId)) return prev;
      return [...prev, itemId];
    });
  }, []);

  // Remove from favorites
  const removeFavorite = useCallback((itemId: number) => {
    setFavorites((prev) => prev.filter((id) => id !== itemId));
  }, []);

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  // Count of favorites
  const favoritesCount = useMemo(() => favorites.length, [favorites]);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
    favoritesCount,
  };
}

export default useFavorites;
