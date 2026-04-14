/**
 * useGuestDetail Hook
 *
 * All productViews of a specific guest belonging to a specific inviter,
 * plus computed metrics for the guest detail page.
 */

import { useMemo } from 'react';
import { useConvexQuery, convexApi, convexReady } from '../lib/convex-safe';

export interface GuestView {
  timestamp: string;
  itemId: number;
  productName: string;
  sessionId: string | null;
  referrer: string | null;
  deviceType: string | null;
  browser: string | null;
  country: string | null;
}

export interface TopProduct {
  itemId: number;
  productName: string;
  viewCount: number;
  lastViewedAt: string;
}

export interface GuestMetrics {
  totalViews: number;
  uniqueProducts: number;
  sessionCount: number;
  firstVisit: string | null;
  lastVisit: string | null;
  /** Convenience: top 5 products by views */
  topProducts: TopProduct[];
}

interface UseGuestDetailReturn {
  views: GuestView[];
  metrics: GuestMetrics;
  isLoading: boolean;
}

const EMPTY_METRICS: GuestMetrics = {
  totalViews: 0,
  uniqueProducts: 0,
  sessionCount: 0,
  firstVisit: null,
  lastVisit: null,
  topProducts: [],
};

export function useGuestDetail(
  inviterName: string | null | undefined,
  guestName: string | null | undefined,
): UseGuestDetailReturn {
  const shouldQuery = Boolean(convexReady && inviterName && guestName);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const convexData = convexReady && useConvexQuery
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useConvexQuery(
        convexApi.productViews.byInviterAndGuest,
        shouldQuery ? { inviterName: inviterName!, guestName: guestName!, limit: 500 } : 'skip',
      )
    : undefined;

  const views: GuestView[] = useMemo(() => {
    if (!Array.isArray(convexData)) return [];
    return (convexData as Record<string, unknown>[]).map((doc) => ({
      timestamp: String(doc.timestamp ?? ''),
      itemId: parseInt(String(doc.itemId ?? '0'), 10),
      productName: String(doc.productName ?? ''),
      sessionId: (doc.sessionId as string) ?? null,
      referrer: (doc.referrer as string) ?? null,
      deviceType: (doc.deviceType as string) ?? null,
      browser: (doc.browser as string) ?? null,
      country: (doc.country as string) ?? null,
    }));
  }, [convexData]);

  const metrics: GuestMetrics = useMemo(() => {
    if (!views.length) return EMPTY_METRICS;

    const productMap = new Map<number, TopProduct>();
    const sessionSet = new Set<string>();
    let firstTs = views[0].timestamp;
    let lastTs = views[0].timestamp;

    for (const v of views) {
      if (v.sessionId) sessionSet.add(v.sessionId);
      if (v.timestamp < firstTs) firstTs = v.timestamp;
      if (v.timestamp > lastTs) lastTs = v.timestamp;

      const existing = productMap.get(v.itemId);
      if (existing) {
        existing.viewCount++;
        if (v.timestamp > existing.lastViewedAt) existing.lastViewedAt = v.timestamp;
      } else {
        productMap.set(v.itemId, {
          itemId: v.itemId,
          productName: v.productName,
          viewCount: 1,
          lastViewedAt: v.timestamp,
        });
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    return {
      totalViews: views.length,
      uniqueProducts: productMap.size,
      sessionCount: sessionSet.size,
      firstVisit: firstTs,
      lastVisit: lastTs,
      topProducts,
    };
  }, [views]);

  const isLoading = shouldQuery && convexData === undefined;

  return { views, metrics, isLoading };
}
