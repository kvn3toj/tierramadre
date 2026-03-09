/**
 * useGuestActivity Hook
 *
 * Fetches recent product views and filters for views
 * from guests invited by the current user.
 * Uses synchronous cache init pattern (anti-blink).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

const CACHE_KEY = 'tm-guest-activity';
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export interface GuestView {
  timestamp: string;
  itemId: number;
  productName: string;
  userName: string | null;
  userEmail: string | null;
  userRole: string;
  inviterName: string | null;
}

interface UseGuestActivityReturn {
  guestViews: GuestView[];
  topProducts: { itemId: number; productName: string; viewCount: number }[];
  isLoading: boolean;
  refresh: () => void;
}

export function useGuestActivity(inviterName: string | null | undefined): UseGuestActivityReturn {
  const [allActivity, setAllActivity] = useState<GuestView[]>(() => {
    if (!inviterName) return [];
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (!inviterName) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/product-views?action=recent&limit=500');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.success && data.activity) {
        setAllActivity(data.activity);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.activity));
        } catch { /* storage full */ }
      }
    } catch {
      // Keep cached data
    } finally {
      setIsLoading(false);
    }
  }, [inviterName]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Filter for views from this inviter's guests (90-day window, top 50)
  // The inviterName field in product-views stores the inviter's display name
  // (set from sessionStorage INVITER_NAME when a guest views via invitation)
  const guestViews = useMemo(() => {
    if (!inviterName || !allActivity.length) return [];
    const cutoff = Date.now() - NINETY_DAYS_MS;
    const normalizedName = inviterName.toLowerCase().trim();

    return allActivity
      .filter(view => {
        if (!view.inviterName) return false;
        const viewTime = new Date(view.timestamp).getTime();
        if (isNaN(viewTime) || viewTime < cutoff) return false;
        // Match by inviter display name (data isolation: only own guests)
        return view.inviterName.toLowerCase().trim() === normalizedName;
      })
      .slice(0, 50);
  }, [allActivity, inviterName]);

  // Aggregate top products by guest view count
  const topProducts = useMemo(() => {
    if (!guestViews.length) return [];
    const counts: Record<string, { itemId: number; productName: string; viewCount: number }> = {};
    for (const view of guestViews) {
      const key = String(view.itemId);
      if (!counts[key]) {
        counts[key] = { itemId: view.itemId, productName: view.productName, viewCount: 0 };
      }
      counts[key].viewCount++;
    }
    return Object.values(counts)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);
  }, [guestViews]);

  return { guestViews, topProducts, isLoading, refresh: fetchActivity };
}
