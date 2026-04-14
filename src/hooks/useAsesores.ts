import { useState, useEffect, useMemo } from 'react';
import { TreasureItem } from '../types';
import { normalizeName, matchesAsesorName } from '../utils/asesorNameUtils';
import { fetchWithRetry } from '../utils/fetchWithRetry';

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
}

interface UseAsesoresReturn {
  asesores: Asesor[];
  isLoading: boolean;
  error: string | null;
  refreshAsesores: () => Promise<void>;
}

const CACHE_KEY = 'tm-asesores';

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

  const loadAsesores = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithRetry('/api/get-asesores', undefined, {
        retries: 3,
        notifyOnFailure: true,
        failureMessage: 'No se pudieron cargar los asesores. Intenta de nuevo.',
      });
      if (!response.ok) throw new Error('Failed to fetch asesores');

      const result = await response.json();
      if (result.success && result.asesores) {
        const deduped = dedupeAsesores(result.asesores);
        setAsesores(deduped);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(deduped));
        } catch {
          // Storage full — non-critical
        }
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

  return {
    asesores: enrichedAsesores,
    isLoading,
    error,
    refreshAsesores: loadAsesores,
  };
}

export default useAsesores;
