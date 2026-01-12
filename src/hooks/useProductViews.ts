/**
 * useProductViews - Fetch product view counts from the API
 *
 * Provides view counts for all products with caching.
 * Data is refreshed on mount and can be manually refetched.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

interface ViewerInfo {
  name: string;
  email: string | null;
  role: string;
  views: number;
  lastSeen: string;
}

interface RecentActivity {
  timestamp: string;
  itemId: number;
  productName: string;
  userName: string | null;
  userEmail: string | null;
  userRole: string;
}

interface ViewStats {
  views: Record<number, number>;
  topProducts: Array<{
    itemId: number;
    productName: string;
    views: number;
  }>;
  topViewers: ViewerInfo[];
  recentActivity: RecentActivity[];
  totalViews: number;
  todayViews: number;
  weekViews: number;
  guestViews: number;
  loggedInViews: number;
  uniqueProducts: number;
  uniqueViewers: number;
}

interface UseProductViewsResult {
  /** View count for a specific product */
  getViewCount: (itemId: number) => number;
  /** All view stats */
  stats: ViewStats | null;
  /** Top viewed products */
  topProducts: ViewStats['topProducts'];
  /** Top viewers (logged in users) */
  topViewers: ViewerInfo[];
  /** Recent view activity */
  recentActivity: RecentActivity[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch view data */
  refetch: () => Promise<void>;
}

// Cache view data in memory to avoid repeated fetches
let cachedStats: ViewStats | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute (reduced for fresher data)

/**
 * Hook to fetch and access product view counts
 */
export function useProductViews(): UseProductViewsResult {
  const [stats, setStats] = useState<ViewStats | null>(cachedStats);
  const [isLoading, setIsLoading] = useState(!cachedStats);
  const [error, setError] = useState<string | null>(null);

  const fetchViews = useCallback(async (forceRefresh = false) => {
    // Use cache if still valid (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && cachedStats && now - cacheTimestamp < CACHE_DURATION) {
      setStats(cachedStats);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add cache-busting timestamp for force refresh to bypass Vercel edge cache
      const url = forceRefresh
        ? `/api/product-views?action=stats&_t=${Date.now()}`
        : '/api/product-views?action=stats';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch view stats');
      }
      const data = await response.json();
      if (data.success) {
        const fetchedStats: ViewStats = {
          views: data.views || {},
          topProducts: data.topProducts || [],
          topViewers: data.topViewers || [],
          recentActivity: data.recentActivity || [],
          totalViews: data.totalViews || 0,
          todayViews: data.todayViews || 0,
          weekViews: data.weekViews || 0,
          guestViews: data.guestViews || 0,
          loggedInViews: data.loggedInViews || 0,
          uniqueProducts: data.uniqueProducts || 0,
          uniqueViewers: data.uniqueViewers || 0,
        };
        cachedStats = fetchedStats;
        cacheTimestamp = Date.now();
        setStats(fetchedStats);
      }
    } catch (err) {
      setError('Error fetching view data');
      console.error('useProductViews error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  // Helper to get view count for a specific product
  const getViewCount = useCallback(
    (itemId: number): number => {
      return stats?.views[itemId] || 0;
    },
    [stats]
  );

  // Memoized top products
  const topProducts = useMemo(() => stats?.topProducts || [], [stats]);

  // Memoized top viewers
  const topViewers = useMemo(() => stats?.topViewers || [], [stats]);

  // Memoized recent activity
  const recentActivity = useMemo(() => stats?.recentActivity || [], [stats]);

  // Force refresh function that bypasses all caches
  const forceRefetch = useCallback(() => fetchViews(true), [fetchViews]);

  return {
    getViewCount,
    stats,
    topProducts,
    topViewers,
    recentActivity,
    isLoading,
    error,
    refetch: forceRefetch,
  };
}

export default useProductViews;
