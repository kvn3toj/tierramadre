/**
 * useTreasureAnalytics Hook
 * React hook wrapper for treasure analytics.
 * Provides convenient tracking methods for components.
 */
import { useCallback, useEffect, useRef } from 'react';
import { analytics, getAggregates, trackSearchHits, getSearchHits, type AnalyticsAggregates } from '../lib/analytics/treasureAnalytics';

interface UseTreasureAnalyticsReturn {
  // Item tracking
  trackItemView: (itemId: number, itemName: string) => void;
  trackFavorite: (itemId: number, isFavorite: boolean) => void;
  trackCompareAdd: (itemId: number) => void;
  trackCompareRemove: (itemId: number) => void;
  trackComparisonOpen: (itemIds: number[]) => void;

  // Filter tracking
  trackFilterApply: (filterType: string, value: string) => void;
  trackFilterClear: () => void;
  trackPresetSave: (presetName: string, filterCount: number) => void;
  trackPresetApply: (presetId: string, presetName: string) => void;

  // Search tracking
  trackSearch: (query: string, resultsCount: number) => void;
  trackSearchHits: (itemIds: number[]) => void;

  // UI tracking
  trackViewModeChange: (mode: 'grid' | 'list') => void;
  trackLoadMore: (currentCount: number, totalCount: number) => void;

  // Aggregates
  getAggregates: () => AnalyticsAggregates;
  getSearchHits: () => Record<number, number>;
}

export function useTreasureAnalytics(): UseTreasureAnalyticsReturn {
  const sessionStartRef = useRef<number>(Date.now());

  // Track session start on mount
  useEffect(() => {
    sessionStartRef.current = Date.now();
    analytics.trackSessionStart();

    // Track session end on unmount
    return () => {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      analytics.trackSessionEnd(duration);
    };
  }, []);

  // Memoized tracking functions
  const trackItemView = useCallback((itemId: number, itemName: string) => {
    analytics.trackItemView(itemId, itemName);
  }, []);

  const trackFavorite = useCallback((itemId: number, isFavorite: boolean) => {
    analytics.trackFavorite(itemId, isFavorite);
  }, []);

  const trackCompareAdd = useCallback((itemId: number) => {
    analytics.trackCompareAdd(itemId);
  }, []);

  const trackCompareRemove = useCallback((itemId: number) => {
    analytics.trackCompareRemove(itemId);
  }, []);

  const trackComparisonOpen = useCallback((itemIds: number[]) => {
    analytics.trackComparisonOpen(itemIds);
  }, []);

  const trackFilterApply = useCallback((filterType: string, value: string) => {
    analytics.trackFilterApply(filterType, value);
  }, []);

  const trackFilterClear = useCallback(() => {
    analytics.trackFilterClear();
  }, []);

  const trackPresetSave = useCallback((presetName: string, filterCount: number) => {
    analytics.trackPresetSave(presetName, filterCount);
  }, []);

  const trackPresetApply = useCallback((presetId: string, presetName: string) => {
    analytics.trackPresetApply(presetId, presetName);
  }, []);

  const trackSearch = useCallback((query: string, resultsCount: number) => {
    analytics.trackSearch(query, resultsCount);
  }, []);

  const trackSearchHitsCallback = useCallback((itemIds: number[]) => {
    trackSearchHits(itemIds);
  }, []);

  const trackViewModeChange = useCallback((mode: 'grid' | 'list') => {
    analytics.trackViewModeChange(mode);
  }, []);

  const trackLoadMore = useCallback((currentCount: number, totalCount: number) => {
    analytics.trackLoadMore(currentCount, totalCount);
  }, []);

  return {
    trackItemView,
    trackFavorite,
    trackCompareAdd,
    trackCompareRemove,
    trackComparisonOpen,
    trackFilterApply,
    trackFilterClear,
    trackPresetSave,
    trackPresetApply,
    trackSearch,
    trackSearchHits: trackSearchHitsCallback,
    trackViewModeChange,
    trackLoadMore,
    getAggregates,
    getSearchHits,
  };
}

export default useTreasureAnalytics;
