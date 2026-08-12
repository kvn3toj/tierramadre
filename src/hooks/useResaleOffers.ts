/**
 * useResaleOffers — pieces ambassadors are currently offering for resale.
 *
 * Kept out of the catalog payload on purpose. The offers are a short,
 * deliberately-published list; the ownership map is not published at all.
 * Folding "who owns this" into the catalog projection to serve a handful of
 * offers would hand every anonymous caller the whole map, which is exactly
 * what `asesor` / `asesorActual` were withheld to prevent.
 *
 * One request per page load, shared: several independent consumers ask for
 * this (the browser controller's stats, the filter hook, the search sheet's
 * count), and they must all agree. A module-level promise means they see one
 * answer from one request rather than three racing ones.
 */
import { useEffect, useState } from 'react';
import {
  buildResaleIndex,
  type ResaleIndex,
  type ResaleOffer,
} from '../utils/productOffer';
import { catalogRequestInit } from '../utils/catalogAuthHeaders';
import { createLogger } from '../utils/logger';

const log = createLogger('useResaleOffers');

const EMPTY: ResaleIndex = new Map();

let inFlight: Promise<ResaleOffer[]> | null = null;
let cached: ResaleOffer[] | null = null;

/** Exposed for tests — resets the shared request between cases. */
export function __resetResaleOffersCache(): void {
  inFlight = null;
  cached = null;
}

async function fetchOffers(): Promise<ResaleOffer[]> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch('/api/resale-offers', catalogRequestInit());
      if (!res.ok) return [];
      const body = await res.json();
      const payload = body?.data ?? body;
      const offers = Array.isArray(payload?.offers) ? payload.offers : [];
      cached = offers;
      return offers;
    } catch (err) {
      // Non-fatal: no offers just means the catalog shows house stock, which
      // is what it did before this feature existed.
      log.debug('Failed to load resale offers', err);
      return [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function useResaleOffers(): { resaleIndex: ResaleIndex } {
  const [resaleIndex, setResaleIndex] = useState<ResaleIndex>(() =>
    cached ? buildResaleIndex(cached) : EMPTY,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchOffers().then((offers) => {
      if (!cancelled && offers.length > 0) {
        setResaleIndex(buildResaleIndex(offers));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { resaleIndex };
}

export default useResaleOffers;
