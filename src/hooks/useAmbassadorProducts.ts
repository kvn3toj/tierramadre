/**
 * useAmbassadorProducts
 *
 * Asks the server which pieces belong to an ambassador, because the browser
 * can no longer work it out for itself.
 *
 * The profile decides ownership by filtering the catalog on `asesor` /
 * `asesorActual` (utils/asesorProductOwnership.ts:67). The 2026-08 access
 * control round made both of those staff-only, so for every non-staff visitor
 * the filter matches nothing and the profile renders empty — 0 pieces, $0, no
 * categories — while still offering a share button. Measured against
 * production 2026-08-11: 523 anonymous catalog rows, `asesor` present in 0.
 *
 * `/api/ambassador-products` answers in item numbers, which carry no PII, and
 * the caller joins them against the public catalog it already has.
 *
 * Staff do NOT need this: their catalog rows still carry the fields, so the
 * local computation stays the source of truth for them and keeps prices,
 * transfer state and everything else this endpoint deliberately omits. See
 * AsesorProfilePage's `allProducts`.
 */
import { useEffect, useState } from 'react';
import { createLogger } from '../utils/logger';

const log = createLogger('useAmbassadorProducts');

export interface AmbassadorProductCounts {
  total: number;
  disponible: number;
  vendida: number;
  loose: number;
  jewelry: number;
}

export interface AmbassadorProductsData {
  itemIds: number[];
  availableItemIds: number[];
  counts: AmbassadorProductCounts;
}

export interface UseAmbassadorProductsReturn {
  data: AmbassadorProductsData | null;
  isLoading: boolean;
}

export function useAmbassadorProducts(
  slug: string | undefined,
  /**
   * Skip the request entirely when the caller can already resolve ownership
   * locally (staff). Avoids a pointless round trip on every staff profile view.
   */
  skip = false,
): UseAmbassadorProductsReturn {
  const [data, setData] = useState<AmbassadorProductsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!slug || skip) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/ambassador-products?slug=${encodeURIComponent(slug)}`,
        );
        if (cancelled) return;
        // 404 (unknown slug) and any other failure land in the same place:
        // the roster lookup that produced `asesor` already decides whether
        // the page shows a profile at all, so there is nothing extra to say.
        if (!res.ok) {
          setData(null);
          return;
        }
        const body = await res.json();
        if (cancelled) return;
        const payload = body?.data ?? body;
        if (Array.isArray(payload?.itemIds)) {
          setData({
            itemIds: payload.itemIds,
            availableItemIds: payload.availableItemIds ?? [],
            counts: payload.counts,
          });
        }
      } catch (err) {
        // Non-fatal: the profile falls back to whatever it can resolve
        // locally, which for staff is everything.
        if (!cancelled) log.debug('Failed to load ambassador products', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, skip]);

  return { data, isLoading };
}

export default useAmbassadorProducts;
