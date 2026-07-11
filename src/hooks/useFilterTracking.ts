/**
 * useFilterTracking Hook
 *
 * Handles analytics tracking for filter changes and calculates active filter count.
 * Consolidates repetitive tracking logic into a single reusable hook.
 */
import { useMemo, useEffect, useRef } from 'react';
import { TreasureFilters } from './useTreasureFiltering';

export interface UseFilterTrackingOptions {
  filters: TreasureFilters;
  priceMinMax: { min: number; max: number };
  caratMinMax: { min: number; max: number };
  resultsCount: number;
  track: (event: string, data: Record<string, unknown>) => void;
  checkAchievements: () => void;
}

export interface UseFilterTrackingReturn {
  activeFilterCount: number;
}

/** Filter keys that should be tracked for analytics */
const TRACKED_FILTERS = [
  'colorFilter',
  'qualityFilter',
  'shapeFilter',
  'typeFilter',
  'coleccionFilter',
  'cantidadFilter',
] as const;

type TrackedFilterKey = (typeof TRACKED_FILTERS)[number];

/**
 * Track filter changes and count active filters.
 */
export function useFilterTracking({
  filters,
  priceMinMax,
  caratMinMax,
  resultsCount,
  track,
  checkAchievements,
}: UseFilterTrackingOptions): UseFilterTrackingReturn {
  // Count active filters for badge display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.colorFilter !== 'all') count++;
    if (filters.qualityFilter !== 'all') count++;
    if (filters.typeFilter !== 'all') count++;
    if (filters.statusFilter !== 'all') count++;
    if (filters.shapeFilter !== 'all') count++;
    if (filters.cantidadFilter !== 'all') count++;
    if (filters.coleccionFilter !== 'all') count++;
    if (filters.heroCategoryFilter !== 'all') count++;
    if (
      filters.priceRange[0] !== priceMinMax.min ||
      filters.priceRange[1] !== priceMinMax.max
    ) {
      count++;
    }
    if (
      filters.caratRange[0] !== caratMinMax.min ||
      filters.caratRange[1] !== caratMinMax.max
    ) {
      count++;
    }
    return count;
  }, [filters, priceMinMax, caratMinMax]);

  // Previous filters for comparison
  const prevFiltersRef = useRef(filters);

  // Track filter changes
  useEffect(() => {
    const prev = prevFiltersRef.current;

    // Track standard filters using loop instead of repetitive if blocks
    TRACKED_FILTERS.forEach((key: TrackedFilterKey) => {
      const prevValue = prev[key];
      const currentValue = filters[key];

      if (prevValue !== currentValue && currentValue !== 'all') {
        track('treasure_filter_applied', {
          filter_type: key.replace('Filter', ''),
          filter_value: currentValue,
          filters_count: activeFilterCount,
          results_count: resultsCount,
        });
      }
    });

    // Track price range changes separately (needs special handling)
    if (
      JSON.stringify(prev.priceRange) !== JSON.stringify(filters.priceRange) &&
      filters.priceRange[0] !== priceMinMax.min
    ) {
      track('treasure_filter_applied', {
        filter_type: 'price',
        filter_value: `${filters.priceRange[0]}-${filters.priceRange[1]}`,
        filters_count: activeFilterCount,
        results_count: resultsCount,
      });
    }

    // Track carat range changes
    if (
      JSON.stringify(prev.caratRange) !== JSON.stringify(filters.caratRange) &&
      filters.caratRange[0] !== caratMinMax.min
    ) {
      track('treasure_filter_applied', {
        filter_type: 'carat',
        filter_value: `${filters.caratRange[0]}-${filters.caratRange[1]}`,
        filters_count: activeFilterCount,
        results_count: resultsCount,
      });
    }

    // Check for achievements after filter changes
    checkAchievements();

    prevFiltersRef.current = filters;
  }, [
    filters,
    track,
    activeFilterCount,
    resultsCount,
    checkAchievements,
    priceMinMax.min,
    caratMinMax.min,
  ]);

  return {
    activeFilterCount,
  };
}

export default useFilterTracking;
