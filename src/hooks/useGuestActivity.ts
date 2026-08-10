/**
 * useGuestActivity Hook
 *
 * Fetches recent product views from guests invited by the current user.
 * Primary: Convex reactive query (real-time, new views).
 * Fallback: REST /api/product-views?action=by-inviter (historical Sheets data).
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useConvexQuery, convexApi, convexReady } from '../lib/convex-safe';
import { readFreshSessionToken } from '../utils/sessionToken';

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

export function useGuestActivity(
  inviterName: string | null | undefined,
  limit = 500,
): UseGuestActivityReturn {
  const [restViews, setRestViews] = useState<GuestView[]>([]);
  const [restLoading, setRestLoading] = useState(false);
  const [restFetched, setRestFetched] = useState(false);

  // Convex reactive query (only when ready)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const convexData =
    convexReady && useConvexQuery
      ? // eslint-disable-next-line react-hooks/rules-of-hooks
        useConvexQuery(
          convexApi.productViews.guestActivity,
          inviterName
            ? {
                inviterName,
                limit,
                sessionToken: readFreshSessionToken() ?? undefined,
              }
            : 'skip',
        )
      : undefined;

  const convexViews: GuestView[] = useMemo(() => {
    if (!Array.isArray(convexData)) return [];
    return (convexData as Record<string, unknown>[]).map((doc) => ({
      timestamp: String(doc.timestamp ?? ''),
      itemId: parseInt(String(doc.itemId ?? '0'), 10),
      productName: String(doc.productName ?? ''),
      userName: (doc.userName as string) ?? null,
      userEmail: (doc.userEmail as string) ?? null,
      userRole: String(doc.userRole ?? 'Invitado'),
      inviterName: (doc.inviterName as string) ?? null,
    }));
  }, [convexData]);

  // REST fallback: always fetch from Sheets API for historical data
  const fetchRest = useCallback(() => {
    if (!inviterName) return;
    setRestLoading(true);
    fetch(
      `/api/product-views?action=by-inviter&inviterName=${encodeURIComponent(inviterName)}&limit=${limit}`,
    )
      .then((r) => r.json())
      .then((data) => {
        const views: GuestView[] = (data.views ?? []).map(
          (v: Record<string, unknown>) => ({
            timestamp: String(v.timestamp ?? ''),
            itemId: Number(v.itemId ?? 0),
            productName: String(v.productName ?? ''),
            userName: (v.userName as string) ?? null,
            userEmail: (v.userEmail as string) ?? null,
            userRole: String(v.userRole ?? 'Invitado'),
            inviterName: (v.inviterName as string) ?? null,
          }),
        );
        setRestViews(views);
      })
      .catch(() => setRestViews([]))
      .finally(() => {
        setRestLoading(false);
        setRestFetched(true);
      });
  }, [inviterName, limit]);

  useEffect(() => {
    if (inviterName) fetchRest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviterName]);

  // Merge: prefer Convex (real-time), augment with REST (historical)
  const guestViews: GuestView[] = useMemo(() => {
    const convexIds = new Set(
      convexViews.map((v) => `${v.timestamp}|${v.itemId}|${v.userName}`),
    );
    const restOnly = restViews.filter(
      (v) => !convexIds.has(`${v.timestamp}|${v.itemId}|${v.userName}`),
    );
    return [...convexViews, ...restOnly].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [convexViews, restViews]);

  const convexLoading =
    convexReady && convexData === undefined && !!inviterName;
  const isLoading = convexLoading || (restLoading && !restFetched);

  const topProducts = useMemo(() => {
    if (!guestViews.length) return [];
    const counts: Record<
      string,
      { itemId: number; productName: string; viewCount: number }
    > = {};
    for (const view of guestViews) {
      const key = String(view.itemId);
      if (!counts[key]) {
        counts[key] = {
          itemId: view.itemId,
          productName: view.productName,
          viewCount: 0,
        };
      }
      counts[key].viewCount++;
    }
    return Object.values(counts)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);
  }, [guestViews]);

  const refresh = useCallback(() => {
    fetchRest();
  }, [fetchRest]);

  return { guestViews, topProducts, isLoading, refresh };
}
