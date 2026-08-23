/**
 * useCotizacionStats Hook
 *
 * Fetches aggregate cotización statistics from the server.
 * Used in analytics dashboards to show real (server-side) data.
 */

import { useState, useEffect, useCallback } from 'react';
import { readFreshSessionToken } from '../utils/sessionToken';

export interface TopProduct {
  itemNumber: number;
  name: string;
  count: number;
  totalValue: number;
}

export interface AsesorProductStats {
  email: string;
  topProducts: TopProduct[];
}

export interface CotizacionStats {
  totalCotizaciones: number;
  totalValue: number;
  todayCotizaciones: number;
  weekCotizaciones: number;
  uniqueAsesores: number;
  uniqueClients: number;
  topAsesores: Array<{ email: string; count: number; name?: string }>;
  recentCotizaciones: Array<{
    id: string;
    quotationNumber: string;
    asesorEmail: string;
    asesorName: string;
    clientName: string;
    productsCount: number;
    total: number;
    createdAt: string;
  }>;
  topProducts: TopProduct[];
  productsByAsesor: AsesorProductStats[];
}

export interface UseCotizacionStatsReturn {
  stats: CotizacionStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultStats: CotizacionStats = {
  totalCotizaciones: 0,
  totalValue: 0,
  todayCotizaciones: 0,
  weekCotizaciones: 0,
  uniqueAsesores: 0,
  uniqueClients: 0,
  topAsesores: [],
  recentCotizaciones: [],
  topProducts: [],
  productsByAsesor: [],
};

export function useCotizacionStats(): UseCotizacionStatsReturn {
  const [stats, setStats] = useState<CotizacionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Candado del 2026-08-21 (hallazgo #2): `?action=stats` ya no contesta
      // sin sesión. Se lee fresco en cada llamada, nunca a nivel de módulo.
      const sessionToken = readFreshSessionToken();
      const response = await fetch('/api/cotizacion-save?action=stats', {
        headers: sessionToken
          ? { Authorization: `Bearer ${sessionToken}` }
          : undefined,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStats(data);
      } else {
        throw new Error(data.error || 'Failed to fetch cotización stats');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error fetching cotización stats';
      console.error('[useCotizacionStats]', message);
      setError(message);
      setStats(defaultStats);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

export default useCotizacionStats;
