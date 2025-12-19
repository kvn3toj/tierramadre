import { useState, useEffect, useMemo } from 'react';
import { InventoryItem } from '../types';

// Cache configuration - version bump invalidates old cache
const CACHE_VERSION = 'v3'; // Increment to invalidate old cache (now reading from sheet 3)
const ASESORES_CACHE_KEY = `tierramadre-asesores-cache-${CACHE_VERSION}`;
const ASESORES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes (reduced for fresher data)

export interface Asesor {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
  products?: InventoryItem[];
}

interface UseAsesoresReturn {
  asesores: Asesor[];
  isLoading: boolean;
  error: string | null;
  refreshAsesores: () => Promise<void>;
}

/**
 * Hook to fetch asesores from Google Sheets and link them with inventory
 */
// Normalize name for comparison (uppercase, keep only letters)
const normalizeName = (name: string): string => {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    // Keep only A-Z (65-90) and a-z (97-122)
    if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
      result += name[i].toUpperCase();
    }
  }
  return result;
};

export function useAsesores(inventory?: InventoryItem[]): UseAsesoresReturn {
  const [asesores, setAsesores] = useState<Asesor[]>([]);
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

      // Check cache first
      const cached = localStorage.getItem(ASESORES_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ASESORES_CACHE_TTL) {
          setAsesores(dedupeAsesores(data));
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API
      const response = await fetch('/api/get-asesores');
      if (!response.ok) throw new Error('Failed to fetch asesores');

      const result = await response.json();
      if (result.success && result.asesores) {
        const deduped = dedupeAsesores(result.asesores);
        setAsesores(deduped);
        // Cache the deduplicated result
        localStorage.setItem(ASESORES_CACHE_KEY, JSON.stringify({
          data: deduped,
          timestamp: Date.now()
        }));
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

  // Enrich asesores with inventory data
  const enrichedAsesores = useMemo(() => {
    if (!inventory || inventory.length === 0) return asesores;

    return asesores.map(asesor => {
      const normalizedAsesorName = normalizeName(asesor.name);

      // Match asesor name with inventory items using normalized comparison
      const matchingProducts = inventory.filter(item => {
        if (!item.asesor) return false;
        const normalizedItemAsesor = normalizeName(item.asesor);
        return normalizedItemAsesor === normalizedAsesorName;
      });

      return {
        ...asesor,
        productCount: matchingProducts.length,
        products: matchingProducts,
      };
    });
  }, [asesores, inventory]);

  return {
    asesores: enrichedAsesores,
    isLoading,
    error,
    refreshAsesores: loadAsesores,
  };
}

export default useAsesores;
