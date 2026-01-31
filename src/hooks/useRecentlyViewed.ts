/**
 * useRecentlyViewed Hook
 * Tracks the last N items viewed by the user.
 * Provides a "recently viewed" section for quick access.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { STORAGE_KEYS } from '../constants/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.RECENTLY_VIEWED;
const MAX_RECENT_ITEMS = 10;

interface RecentlyViewedData {
  items: number[]; // Item IDs in order (most recent first)
  lastUpdated: string;
}

interface UseRecentlyViewedReturn {
  recentItems: number[];
  addToRecent: (itemId: number) => void;
  removeFromRecent: (itemId: number) => void;
  clearRecent: () => void;
  isRecent: (itemId: number) => boolean;
  recentCount: number;
}

export function useRecentlyViewed(): UseRecentlyViewedReturn {
  const [recentItems, setRecentItems] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: RecentlyViewedData = JSON.parse(stored);
        return data.items || [];
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
    return [];
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      const data: RecentlyViewedData = {
        items: recentItems,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving recently viewed:', error);
    }
  }, [recentItems]);

  // Add item to recent (moves to front if already exists)
  const addToRecent = useCallback((itemId: number) => {
    setRecentItems(prev => {
      // Remove if exists (to move to front)
      const filtered = prev.filter(id => id !== itemId);
      // Add to front
      const next = [itemId, ...filtered];
      // Keep only MAX_RECENT_ITEMS
      return next.slice(0, MAX_RECENT_ITEMS);
    });
  }, []);

  // Remove specific item from recent
  const removeFromRecent = useCallback((itemId: number) => {
    setRecentItems(prev => prev.filter(id => id !== itemId));
  }, []);

  // Clear all recent items
  const clearRecent = useCallback(() => {
    setRecentItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Check if item is in recent list
  const isRecent = useCallback((itemId: number) => {
    return recentItems.includes(itemId);
  }, [recentItems]);

  // Count of recent items
  const recentCount = useMemo(() => recentItems.length, [recentItems]);

  return {
    recentItems,
    addToRecent,
    removeFromRecent,
    clearRecent,
    isRecent,
    recentCount,
  };
}

export default useRecentlyViewed;
