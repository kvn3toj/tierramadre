/**
 * useAllActivity Hook
 *
 * Combines activity from multiple sources (product views, cotizaciones)
 * into a unified activity feed for all users.
 *
 * Features:
 * - Merges product views and cotizaciones
 * - Supports filtering by type and time range
 * - Server-side data (not localStorage)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Activity types
export type ActivityType = 'view' | 'cotizacion';

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string;
  // For views
  itemId?: number;
  productName?: string;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string;
  inviterName?: string | null;
  // For cotizaciones
  quotationNumber?: string;
  asesorName?: string;
  asesorEmail?: string;
  clientName?: string;
  productsCount?: number;
  total?: number;
}

export type TimeFilter = 'today' | 'week' | 'month' | 'all';
export type TypeFilter = 'all' | 'view' | 'cotizacion';

export interface ActivityFilters {
  type: TypeFilter;
  time: TimeFilter;
}

export interface UseAllActivityReturn {
  activities: Activity[];
  filteredActivities: Activity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  filters: ActivityFilters;
  setFilters: (filters: ActivityFilters) => void;
  totalCount: number;
}

// Time filter boundaries
function getTimeFilterBoundary(filter: TimeFilter): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  switch (filter) {
    case 'today':
      return todayStart;
    case 'week':
      return todayStart - 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return todayStart - 30 * 24 * 60 * 60 * 1000;
    case 'all':
    default:
      return 0;
  }
}

export function useAllActivity(): UseAllActivityReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({
    type: 'all',
    time: 'week',
  });

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch both sources in parallel
      const [viewsResponse, cotizacionResponse] = await Promise.all([
        fetch('/api/product-views?action=recent&limit=100'),
        fetch('/api/cotizacion-save?action=stats'),
      ]);

      const combined: Activity[] = [];

      // Process product views
      if (viewsResponse.ok) {
        const viewsData = await viewsResponse.json();
        if (viewsData.success && viewsData.activity) {
          for (const view of viewsData.activity) {
            combined.push({
              id: `view-${view.timestamp}-${view.itemId}`,
              type: 'view',
              timestamp: view.timestamp,
              itemId: parseInt(view.itemId),
              productName: view.productName || `Producto ${view.itemId}`,
              userName: view.userName || null,
              userEmail: view.userEmail || null,
              userRole: view.userRole || 'guest',
              inviterName: view.inviterName || null,
            });
          }
        }
      }

      // Process cotizaciones
      if (cotizacionResponse.ok) {
        const cotizacionData = await cotizacionResponse.json();
        if (cotizacionData.success && cotizacionData.recentCotizaciones) {
          for (const cot of cotizacionData.recentCotizaciones) {
            combined.push({
              id: `cot-${cot.id || cot.quotationNumber}`,
              type: 'cotizacion',
              timestamp: cot.createdAt,
              quotationNumber: cot.quotationNumber,
              asesorName: cot.asesorName || 'Asesor',
              asesorEmail: cot.asesorEmail,
              clientName: cot.clientName || 'Cliente',
              productsCount: cot.productsCount || 0,
              total: cot.total || 0,
            });
          }
        }
      }

      // Sort by timestamp descending (newest first)
      combined.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(combined);
    } catch (err) {
      console.error('[useAllActivity] Error:', err);
      setError('Error al cargar la actividad');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Apply filters
  const filteredActivities = useMemo(() => {
    const timeBoundary = getTimeFilterBoundary(filters.time);

    return activities.filter((activity) => {
      // Type filter
      if (filters.type !== 'all' && activity.type !== filters.type) {
        return false;
      }

      // Time filter
      const activityTime = new Date(activity.timestamp).getTime();
      if (activityTime < timeBoundary) {
        return false;
      }

      return true;
    });
  }, [activities, filters]);

  return {
    activities,
    filteredActivities,
    isLoading,
    error,
    refetch: fetchActivity,
    filters,
    setFilters,
    totalCount: activities.length,
  };
}

export default useAllActivity;
