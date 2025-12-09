import { useState, useEffect, useMemo } from 'react';
import { InventoryItem } from '../types';

// Cache configuration
const ASESORES_CACHE_KEY = 'tierramadre-asesores-cache';
const ASESORES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
export function useAsesores(inventory?: InventoryItem[]): UseAsesoresReturn {
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAsesores = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cached = localStorage.getItem(ASESORES_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ASESORES_CACHE_TTL) {
          setAsesores(data);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API
      const response = await fetch('/api/get-asesores');
      if (!response.ok) throw new Error('Failed to fetch asesores');

      const result = await response.json();
      if (result.success && result.asesores) {
        setAsesores(result.asesores);
        // Cache the result
        localStorage.setItem(ASESORES_CACHE_KEY, JSON.stringify({
          data: result.asesores,
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
      // Match asesor name with inventory items (case-insensitive, partial match)
      const asesorNameLower = asesor.name.toLowerCase();
      const matchingProducts = inventory.filter(item => {
        if (!item.asesor) return false;
        const itemAsesor = item.asesor.toLowerCase();
        // Match if names contain each other (handles "M.CAMPUZANO" vs "M. Campuzano")
        return itemAsesor.includes(asesorNameLower) ||
               asesorNameLower.includes(itemAsesor) ||
               // Also match by removing dots and spaces
               itemAsesor.replace(/[.\s]/g, '') === asesorNameLower.replace(/[.\s]/g, '');
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
