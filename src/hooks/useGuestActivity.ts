/**
 * useGuestActivity Hook
 *
 * Fetches recent product views from guests invited by the current user.
 * Uses Convex reactive query when available — falls back to empty state when
 * Convex is not ready.
 */

import { useMemo, useCallback } from 'react';
import { useConvexQuery, convexApi, convexReady } from '../lib/convex-safe';

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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const convexData = convexReady && useConvexQuery
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useConvexQuery(convexApi.productViews.guestActivity, inviterName ? { inviterName, limit: 50 } : 'skip')
    : undefined;

  const guestViews: GuestView[] = useMemo(() => {
    if (!Array.isArray(convexData)) return [];
    return (convexData as Record<string, unknown>[]).map((doc) => ({
      timestamp: String(doc.timestamp ?? ''),
      itemId: parseInt(String(doc.itemId ?? '0'), 10),
      productName: String(doc.productName ?? ''),
      userName: (doc.userName as string) ?? null,
      userEmail: (doc.userEmail as string) ?? null,
      userRole: String(doc.userRole ?? 'guest'),
      inviterName: (doc.inviterName as string) ?? null,
    }));
  }, [convexData]);

  const isLoading = convexReady && convexData === undefined && !!inviterName;

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

  const refresh = useCallback(() => {
    // No-op with Convex reactive queries
  }, []);

  return { guestViews, topProducts, isLoading, refresh };
}
