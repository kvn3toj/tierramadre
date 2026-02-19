import { useState, useEffect, useMemo } from 'react';
import { TreasureItem } from '../types';

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

/**
 * Smart asesor name matching that handles abbreviated names.
 * Handles patterns like "JM.Escobar" matching "Juan Manuel Escobar Ramirez"
 */
export const matchesAsesorName = (itemAsesor: string, asesorFullName: string): boolean => {
  if (!itemAsesor || !asesorFullName) return false;

  // 1. Exact normalized match
  const normalizedItem = normalizeName(itemAsesor);
  const normalizedFull = normalizeName(asesorFullName);
  if (normalizedItem === normalizedFull) return true;

  // 2. Flexible match for abbreviated names (e.g., "JM.Escobar" → "Juan Manuel Escobar Ramirez")
  const itemParts = itemAsesor.replace(/\./g, ' ').trim().split(/\s+/).filter(Boolean);
  const fullParts = asesorFullName.trim().split(/\s+/).filter(Boolean);
  if (itemParts.length < 1 || fullParts.length < 2) return false;

  // Extract surname from abbreviated name (last word)
  const itemSurname = normalizeName(itemParts[itemParts.length - 1]);
  if (itemSurname.length < 3) return false;

  // Check if surname exists in any part of the full name
  const fullPartsNorm = fullParts.map(p => normalizeName(p));
  if (!fullPartsNorm.some(part => part === itemSurname)) return false;

  // If there's a prefix before the surname, verify it matches initials or first name
  if (itemParts.length > 1) {
    const prefix = normalizeName(itemParts[0]);

    if (prefix.length <= 3) {
      // Initials mode: "JM" → check J matches "Juan"[0], M matches "Manuel"[0]
      for (let i = 0; i < prefix.length; i++) {
        if (i >= fullParts.length) return false;
        if (normalizeName(fullParts[i])[0] !== prefix[i]) return false;
      }
    } else {
      // Full first name: check it matches the first part of the full name
      if (fullPartsNorm[0] !== prefix) return false;
    }
  }

  return true;
};

export function useAsesores(treasure?: TreasureItem[]): UseAsesoresReturn {
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

      // Always fetch fresh from API - no cache
      const response = await fetch('/api/get-asesores');
      if (!response.ok) throw new Error('Failed to fetch asesores');

      const result = await response.json();
      if (result.success && result.asesores) {
        const deduped = dedupeAsesores(result.asesores);
        setAsesores(deduped);
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
        if (!item.asesor) return false;
        return matchesAsesorName(item.asesor, asesor.name);
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
