/**
 * Treasure Analytics Module
 * Tracks user interactions with the treasure browser.
 * Stores analytics locally and can be extended for remote reporting.
 */
import { STORAGE_KEYS, SESSION_KEYS, LEGACY_KEYS } from '../../constants/storage-keys';

// Storage keys (new treasure namespace)
const STORAGE_KEY = STORAGE_KEYS.TREASURE_ANALYTICS;
const SESSION_KEY = SESSION_KEYS.SESSION_ID;
const SEARCH_HITS_KEY = STORAGE_KEYS.SEARCH_HITS;
const MAX_EVENTS = 1000;

// Old storage keys for migration
const OLD_STORAGE_KEY = LEGACY_KEYS.INVENTORY_ANALYTICS;
const OLD_SEARCH_HITS_KEY = STORAGE_KEYS.SEARCH_HITS_LEGACY;

// Event types
export type AnalyticsEventType =
  | 'item_view'
  | 'item_favorite'
  | 'item_unfavorite'
  | 'item_compare_add'
  | 'item_compare_remove'
  | 'comparison_open'
  | 'filter_apply'
  | 'filter_clear'
  | 'filter_preset_save'
  | 'filter_preset_apply'
  | 'search_query'
  | 'view_mode_change'
  | 'pagination_load_more'
  | 'session_start'
  | 'session_end';

// Event data structure
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: string;
  sessionId: string;
  data: Record<string, unknown>;
}

// Session data
export interface SessionData {
  id: string;
  startTime: string;
  endTime?: string;
  itemsViewed: number;
  filtersApplied: number;
  comparisonsOpened: number;
  favoritesToggled: number;
  searchQueries: number;
}

// Aggregated analytics
export interface AnalyticsAggregates {
  totalSessions: number;
  totalItemsViewed: number;
  totalComparisons: number;
  totalFavorites: number;
  averageSessionDuration: number; // in seconds
  mostViewedItems: Array<{ itemId: number; views: number }>;
  popularFilters: Array<{ filter: string; value: string; count: number }>;
  popularSearchTerms: Array<{ term: string; count: number }>;
}

// Storage structure
interface AnalyticsStorage {
  events: AnalyticsEvent[];
  sessions: SessionData[];
  lastUpdated: string;
}

// =============================================================================
// STORAGE MIGRATION
// =============================================================================

/**
 * Migrate data from old storage key to new one (run once)
 */
function migrateStorageKey(oldKey: string, newKey: string): void {
  try {
    const oldData = localStorage.getItem(oldKey);
    if (oldData && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldData);
      localStorage.removeItem(oldKey);
      console.log(`Migrated storage: ${oldKey} → ${newKey}`);
    }
  } catch (error) {
    console.warn('Storage migration error:', error);
  }
}

// Run migrations on module load
migrateStorageKey(OLD_STORAGE_KEY, STORAGE_KEY);
migrateStorageKey(OLD_SEARCH_HITS_KEY, SEARCH_HITS_KEY);

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// Load analytics from storage
function loadAnalytics(): AnalyticsStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
  return {
    events: [],
    sessions: [],
    lastUpdated: new Date().toISOString(),
  };
}

// Save analytics to storage
function saveAnalytics(data: AnalyticsStorage): void {
  try {
    // Trim events if too many
    if (data.events.length > MAX_EVENTS) {
      data.events = data.events.slice(-MAX_EVENTS);
    }
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving analytics:', error);
  }
}

// Track an event
export function trackEvent(
  type: AnalyticsEventType,
  data: Record<string, unknown> = {}
): void {
  const analyticsData = loadAnalytics();
  const sessionId = getSessionId();

  const event: AnalyticsEvent = {
    id: generateId(),
    type,
    timestamp: new Date().toISOString(),
    sessionId,
    data,
  };

  analyticsData.events.push(event);

  // Update session data
  let session = analyticsData.sessions.find(s => s.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      startTime: new Date().toISOString(),
      itemsViewed: 0,
      filtersApplied: 0,
      comparisonsOpened: 0,
      favoritesToggled: 0,
      searchQueries: 0,
    };
    analyticsData.sessions.push(session);
  }

  // Update session counters based on event type
  switch (type) {
    case 'item_view':
      session.itemsViewed++;
      break;
    case 'filter_apply':
      session.filtersApplied++;
      break;
    case 'comparison_open':
      session.comparisonsOpened++;
      break;
    case 'item_favorite':
    case 'item_unfavorite':
      session.favoritesToggled++;
      break;
    case 'search_query':
      session.searchQueries++;
      break;
  }

  saveAnalytics(analyticsData);
}

// Specific tracking functions for convenience
export const analytics = {
  // Item interactions
  trackItemView: (itemId: number, itemName: string) =>
    trackEvent('item_view', { itemId, itemName }),

  trackFavorite: (itemId: number, isFavorite: boolean) =>
    trackEvent(isFavorite ? 'item_favorite' : 'item_unfavorite', { itemId }),

  trackCompareAdd: (itemId: number) =>
    trackEvent('item_compare_add', { itemId }),

  trackCompareRemove: (itemId: number) =>
    trackEvent('item_compare_remove', { itemId }),

  trackComparisonOpen: (itemIds: number[]) =>
    trackEvent('comparison_open', { itemIds, count: itemIds.length }),

  // Filter interactions
  trackFilterApply: (filterType: string, value: string) =>
    trackEvent('filter_apply', { filterType, value }),

  trackFilterClear: () =>
    trackEvent('filter_clear', {}),

  trackPresetSave: (presetName: string, filterCount: number) =>
    trackEvent('filter_preset_save', { presetName, filterCount }),

  trackPresetApply: (presetId: string, presetName: string) =>
    trackEvent('filter_preset_apply', { presetId, presetName }),

  // Search
  trackSearch: (query: string, resultsCount: number) =>
    trackEvent('search_query', { query, resultsCount }),

  // UI interactions
  trackViewModeChange: (mode: 'grid' | 'list') =>
    trackEvent('view_mode_change', { mode }),

  trackLoadMore: (currentCount: number, totalCount: number) =>
    trackEvent('pagination_load_more', { currentCount, totalCount }),

  // Session
  trackSessionStart: () =>
    trackEvent('session_start', {}),

  trackSessionEnd: (duration: number) =>
    trackEvent('session_end', { durationSeconds: duration }),
};

// Get aggregated analytics
export function getAggregates(): AnalyticsAggregates {
  const data = loadAnalytics();

  // Count item views
  const itemViews = new Map<number, number>();
  const filterUsage = new Map<string, number>();
  const searchTerms = new Map<string, number>();

  data.events.forEach(event => {
    switch (event.type) {
      case 'item_view': {
        const itemId = event.data.itemId as number;
        itemViews.set(itemId, (itemViews.get(itemId) || 0) + 1);
        break;
      }
      case 'filter_apply': {
        const key = `${event.data.filterType}:${event.data.value}`;
        filterUsage.set(key, (filterUsage.get(key) || 0) + 1);
        break;
      }
      case 'search_query': {
        const query = (event.data.query as string).toLowerCase();
        if (query) {
          searchTerms.set(query, (searchTerms.get(query) || 0) + 1);
        }
        break;
      }
    }
  });

  // Calculate session duration
  const sessionDurations = data.sessions
    .filter(s => s.endTime)
    .map(s => {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime!).getTime();
      return (end - start) / 1000;
    });

  const avgDuration = sessionDurations.length > 0
    ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
    : 0;

  // Sort and get top items
  const mostViewedItems = Array.from(itemViews.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([itemId, views]) => ({ itemId, views }));

  const popularFilters = Array.from(filterUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [filter, value] = key.split(':');
      return { filter, value, count };
    });

  const popularSearchTerms = Array.from(searchTerms.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));

  return {
    totalSessions: data.sessions.length,
    totalItemsViewed: data.events.filter(e => e.type === 'item_view').length,
    totalComparisons: data.events.filter(e => e.type === 'comparison_open').length,
    totalFavorites: data.events.filter(e => e.type === 'item_favorite').length,
    averageSessionDuration: Math.round(avgDuration),
    mostViewedItems,
    popularFilters,
    popularSearchTerms,
  };
}

// Clear all analytics data
export function clearAnalytics(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

// Export analytics data for debugging/reporting
export function exportAnalytics(): AnalyticsStorage {
  return loadAnalytics();
}

// Search hits tracking - tracks which products appear in search results
interface SearchHitsStorage {
  hits: Record<number, number>; // itemId -> count of times appeared in search results
  lastUpdated: string;
}

function loadSearchHits(): SearchHitsStorage {
  try {
    const stored = localStorage.getItem(SEARCH_HITS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading search hits:', error);
  }
  return {
    hits: {},
    lastUpdated: new Date().toISOString(),
  };
}

function saveSearchHits(data: SearchHitsStorage): void {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(SEARCH_HITS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving search hits:', error);
  }
}

// Track products that appear in a search result
export function trackSearchHits(itemIds: number[]): void {
  const data = loadSearchHits();
  itemIds.forEach(itemId => {
    data.hits[itemId] = (data.hits[itemId] || 0) + 1;
  });
  saveSearchHits(data);
}

// Get search hit counts for all products
export function getSearchHits(): Record<number, number> {
  return loadSearchHits().hits;
}

// Get search hit count for a specific product
export function getSearchHitCount(itemId: number): number {
  return loadSearchHits().hits[itemId] || 0;
}

// Clear search hits data
export function clearSearchHits(): void {
  localStorage.removeItem(SEARCH_HITS_KEY);
}
