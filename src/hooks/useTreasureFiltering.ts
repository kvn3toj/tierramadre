/**
 * useTreasureFiltering Hook
 * Manages treasure filtering, sorting, and search state.
 * Extracted from TreasureBrowser.tsx for reusability.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { TreasureItem } from '../types';
import { fuzzyMatch } from '../utils/fuzzySearch';
import { getSearchHits } from '../lib/analytics/treasureAnalytics';

export type TypeFilter = 'all' | 'loose' | 'jewelry';
export type StatusFilter = 'all' | 'available' | 'sold';
export type SortOption =
  | 'price-desc'
  | 'price-asc'
  | 'name-asc'
  | 'name-desc'
  | 'quality-premium'
  | 'item-number'
  | 'newest'
  | 'most-searched';

export type CityFilter = 'all' | 'Cali' | 'Bogotá';

export interface TreasureFilters {
  search: string;
  colorFilter: string;
  qualityFilter: string;
  typeFilter: TypeFilter;
  statusFilter: StatusFilter;
  shapeFilter: string;
  priceRange: [number, number];
  sortBy: SortOption;
  cantidadFilter: string; // 'all' | '1' | '2+'
  cityFilter: CityFilter;
  coleccionFilter: string; // 'all' | specific collection name
  itemsFilter: number[]; // Filter by specific item numbers (for QR/quotation links)
}

export interface UseTreasureFilteringOptions {
  treasure: TreasureItem[];
  initialFilters?: Partial<TreasureFilters>;
  /** Clear filters after this many minutes of inactivity. Default: 5 minutes. Set to 0 to disable. */
  inactivityTimeoutMinutes?: number;
}

export interface UseTreasureFilteringReturn {
  // Filter state
  filters: TreasureFilters;
  setSearch: (search: string) => void;
  setColorFilter: (color: string) => void;
  setQualityFilter: (quality: string) => void;
  setTypeFilter: (type: TypeFilter) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setShapeFilter: (shape: string) => void;
  setPriceRange: (range: [number, number]) => void;
  setSortBy: (sort: SortOption) => void;
  setCantidadFilter: (cantidad: string) => void;
  setCityFilter: (city: CityFilter) => void;
  setColeccionFilter: (coleccion: string) => void;
  clearFilters: () => void;
  hasFilters: boolean;

  // Filtered data
  filteredTreasure: TreasureItem[];
  sortedTreasure: TreasureItem[];

  // Stats
  filteredStats: {
    count: number;
    totalValue: number;
  };

  // Filter options derived from treasure
  filterOptions: {
    colors: string[];
    shapes: string[];
    qualities: string[];
    cantidades: number[];
    colecciones: string[];
    priceMinMax: { min: number; max: number };
  };
}

const QUALITY_ORDER: Record<string, number> = {
  'SuperFina': 4,
  'Fina': 3,
  'Superior': 2,
  'Comercial': 1,
};

/**
 * Normalize quality strings to consistent format
 * Fixes typos and variations from Google Sheets data
 */
function normalizeQuality(quality: string): string {
  if (!quality) return '';
  const q = quality.trim();

  // Fix common typos and variations
  const normalizations: Record<string, string> = {
    'Comercial Standar': 'Comercial Estándar',
    'Comercial Estandar': 'Comercial Estándar',
    'Comercial Standard': 'Comercial Estándar',
  };

  return normalizations[q] || q;
}

/**
 * Normalize color strings to consistent format
 * Ensures colors from Google Sheets are properly formatted
 */
function normalizeColor(color: string): string {
  if (!color) return '';
  return color.trim();
}

const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 3;

// Session storage key to track filter activity
const FILTER_ACTIVITY_KEY = 'treasure-filter-activity';

export function useTreasureFiltering({
  treasure,
  initialFilters = {},
  inactivityTimeoutMinutes = DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
}: UseTreasureFilteringOptions): UseTreasureFilteringReturn {
  // Get price range from treasure
  const priceMinMax = useMemo(() => {
    const prices = treasure.map(item => item.precioCOP).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 100000000 };
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [treasure]);

  // Filter state
  const [search, setSearch] = useState(initialFilters.search || '');
  const [colorFilter, setColorFilter] = useState(initialFilters.colorFilter || 'all');
  const [qualityFilter, setQualityFilter] = useState(initialFilters.qualityFilter || 'all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialFilters.typeFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilters.statusFilter || 'available');
  const [shapeFilter, setShapeFilter] = useState(initialFilters.shapeFilter || 'all');
  const [priceRange, setPriceRange] = useState<[number, number]>(
    initialFilters.priceRange || [0, Number.MAX_SAFE_INTEGER]
  );
  const [sortBy, setSortBy] = useState<SortOption>(initialFilters.sortBy || 'newest');
  const [cantidadFilter, setCantidadFilter] = useState(initialFilters.cantidadFilter || 'all');
  const [cityFilter, setCityFilter] = useState<CityFilter>(initialFilters.cityFilter || 'all');
  const [coleccionFilter, setColeccionFilter] = useState(initialFilters.coleccionFilter || 'all');
  const [itemsFilter, setItemsFilter] = useState<number[]>(initialFilters.itemsFilter || []);

  // Track if priceRange has been initialized to prevent re-syncing
  const priceRangeInitialized = useRef(!!initialFilters.priceRange);

  // Sync priceRange to full range when treasure loads (ensures all products shown by default)
  // Only run once to prevent infinite loops
  useEffect(() => {
    if (!priceRangeInitialized.current && treasure.length > 0 && priceMinMax.max > 0) {
      priceRangeInitialized.current = true;
      setPriceRange([priceMinMax.min, priceMinMax.max]);
    }
  }, [priceMinMax.min, priceMinMax.max, treasure.length]);

  // Get unique filter options from treasure (with normalization)
  const filterOptions = useMemo(() => {
    const colors = new Set<string>();
    const shapes = new Set<string>();
    const qualities = new Set<string>();
    const cantidades = new Set<number>();
    const colecciones = new Set<string>();

    treasure.forEach(item => {
      const normalizedColor = normalizeColor(item.color);
      const normalizedQuality = normalizeQuality(item.calidad);

      if (normalizedColor) colors.add(normalizedColor);
      if (item.talla) shapes.add(item.talla);
      if (normalizedQuality) qualities.add(normalizedQuality);
      if (item.cantidad) cantidades.add(item.cantidad);
      if (item.coleccion) colecciones.add(item.coleccion);
    });

    return {
      colors: Array.from(colors).sort(),
      shapes: Array.from(shapes).sort(),
      qualities: Array.from(qualities).sort(),
      cantidades: Array.from(cantidades).sort((a, b) => a - b),
      colecciones: Array.from(colecciones).sort(),
      priceMinMax,
    };
  }, [treasure, priceMinMax]);

  // Filter treasure
  const filteredTreasure = useMemo(() => {
    return treasure.filter(item => {
      // Status filter (case-insensitive for robustness)
      const itemEstado = item.estado?.toUpperCase() || '';
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && itemEstado === 'DISPONIBLE') ||
        (statusFilter === 'sold' && itemEstado === 'VENDIDA');

      if (!matchesStatus) return false;

      // Smart search: exact/contains for short queries, fuzzy for longer with typos
      const matchesSearch =
        !search ||
        fuzzyMatch(item.nombre, search) ||
        fuzzyMatch(item.color, search) ||
        fuzzyMatch(item.calidad, search) ||
        item.item.toString().includes(search.trim());

      const matchesColor = colorFilter === 'all' || normalizeColor(item.color) === colorFilter;
      const matchesQuality = qualityFilter === 'all' || normalizeQuality(item.calidad) === qualityFilter;
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'loose' && !item.isJewelry) ||
        (typeFilter === 'jewelry' && item.isJewelry);
      const matchesShape = shapeFilter === 'all' || item.talla === shapeFilter;
      const matchesPrice = item.precioCOP >= priceRange[0] && item.precioCOP <= priceRange[1];
      const matchesCantidad =
        cantidadFilter === 'all' ||
        (cantidadFilter === '1' && item.cantidad === 1) ||
        (cantidadFilter === '2+' && item.cantidad > 1);
      const matchesCity = cityFilter === 'all' || item.city === cityFilter;
      const matchesColeccion = coleccionFilter === 'all' || item.coleccion === coleccionFilter;
      // Items filter - only show specific items if itemsFilter is set (used for QR/quotation links)
      const matchesItems = itemsFilter.length === 0 || itemsFilter.includes(item.item);

      return matchesSearch && matchesColor && matchesQuality && matchesType && matchesShape && matchesPrice && matchesCantidad && matchesCity && matchesColeccion && matchesItems;
    });
  }, [treasure, search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, cantidadFilter, cityFilter, coleccionFilter, itemsFilter]);

  // Sort treasure based on selected option, with image priority
  const sortedTreasure = useMemo(() => {
    const sorted = [...filteredTreasure];
    const searchHits = getSearchHits();

    // Define sort function based on user selection
    const sortFn = (a: TreasureItem, b: TreasureItem): number => {
      switch (sortBy) {
        case 'name-asc':
          return a.nombre.localeCompare(b.nombre);
        case 'name-desc':
          return b.nombre.localeCompare(a.nombre);
        case 'price-asc':
          return a.precioCOP - b.precioCOP;
        case 'price-desc':
          return b.precioCOP - a.precioCOP;
        case 'quality-premium': {
          const aScore = QUALITY_ORDER[a.calidad.split(' ').pop() || ''] || 0;
          const bScore = QUALITY_ORDER[b.calidad.split(' ').pop() || ''] || 0;
          return bScore - aScore;
        }
        case 'item-number':
          return a.item - b.item;
        case 'newest': {
          // Parse dates in format "20-nov-2025" (Spanish month abbreviations)
          const spanishMonths: Record<string, number> = {
            'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
          };
          const parseDate = (dateStr: string) => {
            if (!dateStr) return 0;
            const parts = dateStr.toLowerCase().split('-');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = spanishMonths[parts[1]];
              const year = parseInt(parts[2], 10);
              if (!isNaN(day) && month !== undefined && !isNaN(year)) {
                return new Date(year, month, day).getTime();
              }
            }
            // Fallback to native parsing
            return new Date(dateStr).getTime() || 0;
          };
          return parseDate(b.fechaIngreso) - parseDate(a.fechaIngreso);
        }
        case 'most-searched': {
          // Sort by search hit count (most searched first)
          const aHits = searchHits[a.item] || 0;
          const bHits = searchHits[b.item] || 0;
          // If equal hits, fallback to price desc
          if (bHits === aHits) {
            return b.precioCOP - a.precioCOP;
          }
          return bHits - aHits;
        }
        default:
          return b.precioCOP - a.precioCOP;
      }
    };

    // Helper to check if item has a valid image URL (not empty/placeholder)
    const hasValidImage = (item: TreasureItem): boolean => {
      const url = item.imagen || item.imageUrl;
      // Must be a non-empty string with actual content (not just whitespace)
      return typeof url === 'string' && url.trim().length > 0;
    };

    // Sort with image priority: items WITH images come first
    return sorted.sort((a, b) => {
      const aHasImage = hasValidImage(a);
      const bHasImage = hasValidImage(b);

      // If one has image and other doesn't, prioritize the one with image
      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;

      // Both have images or both don't - apply user's sort
      return sortFn(a, b);
    });
  }, [filteredTreasure, sortBy]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const totalValue = filteredTreasure.reduce((sum, i) => sum + i.precioCOP, 0);
    return { count: filteredTreasure.length, totalValue };
  }, [filteredTreasure]);

  // Clear all filters (reset to defaults, showing available items)
  const clearFilters = useCallback(() => {
    setSearch('');
    setColorFilter('all');
    setQualityFilter('all');
    setTypeFilter('all');
    setStatusFilter('available'); // Default to available items
    setShapeFilter('all');
    setCantidadFilter('all');
    setCityFilter('all');
    setColeccionFilter('all');
    setItemsFilter([]);
    setPriceRange([priceMinMax.min, priceMinMax.max]);
  }, [priceMinMax]);

  // Check if any filters are active (note: 'available' is the default status)
  const hasFilters = useMemo(() => {
    return (
      search !== '' ||
      colorFilter !== 'all' ||
      qualityFilter !== 'all' ||
      typeFilter !== 'all' ||
      statusFilter !== 'available' ||
      shapeFilter !== 'all' ||
      cantidadFilter !== 'all' ||
      cityFilter !== 'all' ||
      coleccionFilter !== 'all' ||
      priceRange[0] !== priceMinMax.min ||
      priceRange[1] !== priceMinMax.max
    );
  }, [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, cantidadFilter, cityFilter, coleccionFilter, priceRange, priceMinMax]);

  // Track last activity time for inactivity timeout (persisted to sessionStorage)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get last activity time from sessionStorage (survives page refreshes within session)
  const getLastActivity = useCallback((): number => {
    try {
      const stored = sessionStorage.getItem(FILTER_ACTIVITY_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data.lastActivity || Date.now();
      }
    } catch {
      // Ignore parse errors
    }
    return Date.now();
  }, []);

  // Save activity time to sessionStorage
  const saveActivity = useCallback((timestamp: number) => {
    try {
      sessionStorage.setItem(FILTER_ACTIVITY_KEY, JSON.stringify({
        lastActivity: timestamp,
      }));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Clear stored activity on filter clear
  const clearStoredActivity = useCallback(() => {
    try {
      sessionStorage.removeItem(FILTER_ACTIVITY_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Reset activity timer when user interacts
  const resetActivityTimer = useCallback(() => {
    saveActivity(Date.now());
  }, [saveActivity]);

  // Check if filters should be cleared on mount (new browser session = no sessionStorage)
  // sessionStorage is cleared when browser closes, so filters should reset
  useEffect(() => {
    // Check if this is a fresh session (no activity stored)
    const stored = sessionStorage.getItem(FILTER_ACTIVITY_KEY);
    if (!stored && hasFilters) {
      // Fresh session with URL filters - check if they're stale
      // This handles the case when user closed browser and reopened with URL params
      clearFilters();
      // Also clear URL params
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []); // Only run on mount

  // Clear filters after inactivity (only if filters are active)
  useEffect(() => {
    // Disabled if timeout is 0 or no filters active
    if (inactivityTimeoutMinutes <= 0 || !hasFilters) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      // Clear stored activity when no filters
      if (!hasFilters) {
        clearStoredActivity();
      }
      return;
    }

    // Reset timer on any filter change
    resetActivityTimer();

    // Set up inactivity check
    const checkInactivity = () => {
      const lastActivity = getLastActivity();
      const now = Date.now();
      const inactiveMs = now - lastActivity;
      const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;

      if (inactiveMs >= timeoutMs) {
        // User has been inactive, clear filters
        clearFilters();
        clearStoredActivity();
        // Also clear URL params
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        // Check again when timeout would expire
        const remainingMs = timeoutMs - inactiveMs;
        inactivityTimerRef.current = setTimeout(checkInactivity, remainingMs);
      }
    };

    // Start the timer - check based on stored activity time
    const lastActivity = getLastActivity();
    const now = Date.now();
    const inactiveMs = now - lastActivity;
    const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;

    if (inactiveMs >= timeoutMs) {
      // Already past timeout, clear immediately
      clearFilters();
      clearStoredActivity();
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      // Schedule check for remaining time
      const remainingMs = timeoutMs - inactiveMs;
      inactivityTimerRef.current = setTimeout(checkInactivity, remainingMs);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [hasFilters, inactivityTimeoutMinutes, clearFilters, resetActivityTimer, getLastActivity, clearStoredActivity]);

  // Track user activity on visibility change (but check for staleness when returning)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasFilters) {
        // User returned to the page - check if timeout expired while away
        const lastActivity = getLastActivity();
        const now = Date.now();
        const inactiveMs = now - lastActivity;
        const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;

        if (inactiveMs >= timeoutMs) {
          // Timeout expired while away, clear filters
          clearFilters();
          clearStoredActivity();
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
        // Don't reset timer on return - user needs to interact with filters
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasFilters, inactivityTimeoutMinutes, clearFilters, getLastActivity, clearStoredActivity]);

  // Memoize filters object to prevent infinite re-render loops in URL sync
  const filters = useMemo(() => ({
    search,
    colorFilter,
    qualityFilter,
    typeFilter,
    statusFilter,
    shapeFilter,
    priceRange,
    sortBy,
    cantidadFilter,
    cityFilter,
    coleccionFilter,
    itemsFilter,
  }), [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, sortBy, cantidadFilter, cityFilter, coleccionFilter, itemsFilter]);

  return {
    filters,
    setSearch,
    setColorFilter,
    setQualityFilter,
    setTypeFilter,
    setStatusFilter,
    setShapeFilter,
    setPriceRange,
    setSortBy,
    setCantidadFilter,
    setCityFilter,
    setColeccionFilter,
    clearFilters,
    hasFilters,
    filteredTreasure,
    sortedTreasure,
    filteredStats,
    filterOptions,
  };
}

export default useTreasureFiltering;
