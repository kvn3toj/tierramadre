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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch and access product view counts
 */
export function useProductViews(): UseProductViewsResult {
  const [stats, setStats] = useState<ViewStats | null>(cachedStats);
  const [isLoading, setIsLoading] = useState(!cachedStats);
  const [error, setError] = useState<string | null>(null);

  const fetchViews = useCallback(async () => {
    // Use cache if still valid
    const now = Date.now();
    if (cachedStats && now - cacheTimestamp < CACHE_DURATION) {
      setStats(cachedStats);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // API endpoint temporarily disabled - return empty stats
      const emptyStats: ViewStats = {
        views: {},
        topProducts: [],
        topViewers: [],
        recentActivity: [],
        totalViews: 0,
        todayViews: 0,
        weekViews: 0,
        guestViews: 0,
        loggedInViews: 0,
        uniqueProducts: 0,
        uniqueViewers: 0,
      };
      cachedStats = emptyStats;
      cacheTimestamp = Date.now();
      setStats(emptyStats);
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

  return {
    getViewCount,
    stats,
    topProducts,
    topViewers,
    recentActivity,
    isLoading,
    error,
    refetch: fetchViews,
  };
}

export default useProductViews;
