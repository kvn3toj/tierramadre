import { useState, useEffect, useMemo } from 'react';
import { TreasureItem } from '../types';
import { normalizeName, matchesAsesorName } from '../utils/asesorNameUtils';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { parseVaultCode } from '../utils/parseVaultCode';
import type { VaultCombination } from '../types/vault';

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
  ambassadorVaultCodes: Map<string, VaultCombination>;
}

const CACHE_KEY = 'tm-asesores';
const CACHE_TS_KEY = 'tm-asesores-ts';
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Shared in-flight promise — dedupes concurrent fetches from multiple hook mounts. */
let inflightFetch: Promise<Asesor[]> | null = null;

export function useAsesores(treasure?: TreasureItem[]): UseAsesoresReturn {
  const [asesores, setAsesores] = useState<Asesor[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
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
    return asesoresList.filter(asesor => {
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

      // Skip fetch if cache is fresh (unless forced).
      if (!force) {
        const tsRaw = localStorage.getItem(CACHE_TS_KEY);
        const ts = tsRaw ? Number(tsRaw) : 0;
        if (ts && Date.now() - ts < CACHE_TTL_MS && asesores.length > 0) {
          setIsLoading(false);
          return;
        }
      }

      // Deduplicate concurrent fetches across hook instances.
      if (!inflightFetch) {
        inflightFetch = (async () => {
          const response = await fetchWithRetry('/api/get-asesores', undefined, {
            retries: 3,
            notifyOnFailure: true,
            failureMessage: 'No se pudieron cargar los asesores. Intenta de nuevo.',
          });
          if (!response.ok) throw new Error('Failed to fetch asesores');
          const result = await response.json();
          if (!result.success || !result.asesores) {
            throw new Error('Invalid asesores response');
          }
          return dedupeAsesores(result.asesores);
        })().finally(() => {
          inflightFetch = null;
        });
      }

      const deduped = await inflightFetch;
      setAsesores(deduped);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(deduped));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
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

    return asesores.map(asesor => {
      // Match asesor name with treasure items (handles abbreviated names like "JM.Escobar")
      const matchingProducts = treasure.filter(item => {
        const isOriginalAsesor = item.asesor && matchesAsesorName(item.asesor, asesor.name);
        const isCurrentOwner = item.asesorActual?.trim() &&
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

  const ambassadorVaultCodes = useMemo(() => {
    const map = new Map<string, VaultCombination>();
    for (const a of asesores) {
      const combo = parseVaultCode(a.vaultCode ?? null);
      if (combo) map.set(a.slug, combo);
    }
    return map;
  }, [asesores]);

  return {
    asesores: enrichedAsesores,
    isLoading,
    error,
    refreshAsesores: () => loadAsesores(true),
    ambassadorVaultCodes,
  };
}

export default useAsesores;
