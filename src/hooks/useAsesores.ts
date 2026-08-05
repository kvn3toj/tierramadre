import { useState, useEffect, useMemo } from 'react';
import { TreasureItem } from '../types';
import { normalizeName, matchesAsesorName } from '../utils/asesorNameUtils';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { catalogRequestInit } from '../utils/catalogAuthHeaders';
import { readFreshSessionToken } from '../utils/sessionToken';
import { STORAGE_KEYS } from '../constants/storage-keys';

// Re-export for backwards compatibility
export { matchesAsesorName } from '../utils/asesorNameUtils';

export interface Asesor {
  id: string;
  name: string;
  slug: string;
  role?: string;
  whatsapp?: string | null;
  especialidad?: string | null;
  email?: string | null;
  photoFileId?: string;
  photoUrl?: string;
  productCount?: number;
  products?: TreasureItem[];
  vaultCode?: string | null;
}

interface UseAsesoresReturn {
  asesores: Asesor[];
  isLoading: boolean;
  error: string | null;
  refreshAsesores: () => Promise<void>;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Grant-scoped cache keys (discovered alongside F6, 2026-08 fix round: same
 * leak class as useAsesorCollection's cache — get-asesores.ts now withholds
 * email/vaultCode from anon, so a staff device's full roster cache must not
 * survive logout to paint for the next anonymous visitor). Cleared by
 * clearTreasureCaches() (treasureCacheStorage.ts). readFreshSessionToken(),
 * not readFreshAuthToken() — must mirror catalogRequestInit()'s
 * session-token-only signal.
 */
function cacheKeys(): { data: string; ts: string } {
  const grant = readFreshSessionToken() ? 'staff' : 'anon';
  return {
    data: `${STORAGE_KEYS.ASESORES_CACHE}:${grant}`,
    ts: `${STORAGE_KEYS.ASESORES_CACHE_TS}:${grant}`,
  };
}

/**
 * Shared in-flight promises — dedupes concurrent fetches from multiple hook
 * mounts. Keyed by the SAME cache key the response will be written under, not
 * a single shared slot (same shape as useSheetsTreasure.ts's `inflightFetches`).
 *
 * A single slot handed whatever grant started the fetch to whoever awaited it
 * next: sign-out doesn't reload the page (GoogleAuthContext.signOut() only
 * clears caches), so a staff roster fetch can still be in flight when a public
 * consumer mounts this hook (useWhatsAppContact, AmbassadorDirectory,
 * VitrinaPage's useSenderPhone). That consumer computed the `:anon` key,
 * awaited the STAFF promise, and wrote the full roster — `email`, `vaultCode` —
 * into the `:anon` bucket, which every later anonymous visitor then reads.
 */
const inflightFetches = new Map<string, Promise<Asesor[]>>();

export function useAsesores(treasure?: TreasureItem[]): UseAsesoresReturn {
  const [asesores, setAsesores] = useState<Asesor[]>(() => {
    try {
      const cached = localStorage.getItem(cacheKeys().data);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deduplicate asesores on frontend (backup in case API doesn't dedupe properly)
  const dedupeAsesores = (asesoresList: Asesor[]): Asesor[] => {
    const seen = new Set<string>();
    return asesoresList.filter((asesor) => {
      const normalized = normalizeName(asesor.name);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };

  const loadAsesores = async (force = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const keys = cacheKeys();

      // Skip fetch if cache is fresh (unless forced).
      if (!force) {
        const tsRaw = localStorage.getItem(keys.ts);
        const ts = tsRaw ? Number(tsRaw) : 0;
        if (ts && Date.now() - ts < CACHE_TTL_MS && asesores.length > 0) {
          setIsLoading(false);
          return;
        }
      }

      // Deduplicate concurrent fetches across hook instances — per grant, so a
      // caller only ever awaits a request made under its OWN grant.
      let promise = inflightFetches.get(keys.data);
      if (!promise) {
        promise = (async () => {
          const response = await fetchWithRetry(
            '/api/get-asesores',
            catalogRequestInit(),
            {
              retries: 3,
              notifyOnFailure: true,
              failureMessage:
                'No se pudieron cargar los asesores. Intenta de nuevo.',
            },
          );
          if (!response.ok) throw new Error('Failed to fetch asesores');
          const result = await response.json();
          if (!result.success || !result.asesores) {
            throw new Error('Invalid asesores response');
          }
          return dedupeAsesores(result.asesores);
        })().finally(() => {
          // Released on success AND failure, so a rejected fetch can't wedge
          // the key permanently.
          inflightFetches.delete(keys.data);
        });
        inflightFetches.set(keys.data, promise);
      }

      const deduped = await promise;
      setAsesores(deduped);
      try {
        localStorage.setItem(keys.data, JSON.stringify(deduped));
        localStorage.setItem(keys.ts, String(Date.now()));
      } catch {
        // Storage full — non-critical
      }
    } catch (err) {
      console.warn('Could not load asesores from Google Sheets:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAsesores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enrich asesores with treasure data
  const enrichedAsesores = useMemo(() => {
    if (!treasure || treasure.length === 0) return asesores;

    return asesores.map((asesor) => {
      // Match asesor name with treasure items (handles abbreviated names like "JM.Escobar")
      const matchingProducts = treasure.filter((item) => {
        const isOriginalAsesor =
          item.asesor && matchesAsesorName(item.asesor, asesor.name);
        const isCurrentOwner =
          item.asesorActual?.trim() &&
          matchesAsesorName(item.asesorActual.trim(), asesor.name);
        return isOriginalAsesor || isCurrentOwner;
      });

      return {
        ...asesor,
        productCount: matchingProducts.length,
        products: matchingProducts,
      };
    });
  }, [asesores, treasure]);

  // Ambassador-specific vault combinations used to be derived here (a
  // `Map<slug, VaultCombination>` built from every asesor's raw
  // `vaultCode`), consumed only by VaultPage.tsx. Removed (N5, 2026-08 fix
  // round 3): get-asesores.ts withholds `vaultCode` from anon/guest callers
  // now (shipping every code to every visitor WAS the leak), and
  // verification moved server-side to api/vault-unlock.ts, which never
  // returns the code list at all.

  return {
    asesores: enrichedAsesores,
    isLoading,
    error,
    refreshAsesores: () => loadAsesores(true),
  };
}

export default useAsesores;
