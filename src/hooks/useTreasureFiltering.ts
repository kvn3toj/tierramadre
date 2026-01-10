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
}

export interface UseTreasureFilteringOptions {
  treasure: TreasureItem[];
  initialFilters?: Partial<TreasureFilters>;
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

export function useTreasureFiltering({
  treasure,
  initialFilters = {},
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
  const [sortBy, setSortBy] = useState<SortOption>(initialFilters.sortBy || 'price-desc');
  const [cantidadFilter, setCantidadFilter] = useState(initialFilters.cantidadFilter || 'all');
  const [cityFilter, setCityFilter] = useState<CityFilter>(initialFilters.cityFilter || 'all');
  const [coleccionFilter, setColeccionFilter] = useState(initialFilters.coleccionFilter || 'all');

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

  // Get unique filter options from treasure
  const filterOptions = useMemo(() => {
    const colors = new Set<string>();
    const shapes = new Set<string>();
    const qualities = new Set<string>();
    const cantidades = new Set<number>();
    const colecciones = new Set<string>();

    treasure.forEach(item => {
      if (item.color) colors.add(item.color);
      if (item.talla) shapes.add(item.talla);
      if (item.calidad) qualities.add(item.calidad);
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

      const matchesColor = colorFilter === 'all' || item.color === colorFilter;
      const matchesQuality = qualityFilter === 'all' || item.calidad === qualityFilter;
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

      return matchesSearch && matchesColor && matchesQuality && matchesType && matchesShape && matchesPrice && matchesCantidad && matchesCity && matchesColeccion;
    });
  }, [treasure, search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, cantidadFilter, cityFilter, coleccionFilter]);

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
          // Parse dates in format "20-nov-2025"
          const parseDate = (dateStr: string) => {
            if (!dateStr) return 0;
            return new Date(dateStr).getTime();
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

    // Sort with image priority: items WITH images come first
    return sorted.sort((a, b) => {
      const aHasImage = Boolean(a.imagen || a.imageUrl);
      const bHasImage = Boolean(b.imagen || b.imageUrl);

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
    setPriceRange([priceMinMax.min, priceMinMax.max]);
  }, [priceMinMax]);

  // Check if any filters are active (note: 'available' is the default status, not a filter)
  const hasFilters = useMemo(() => {
    return (
      search !== '' ||
      colorFilter !== 'all' ||
      qualityFilter !== 'all' ||
      typeFilter !== 'all' ||
      (statusFilter !== 'all' && statusFilter !== 'available') ||
      shapeFilter !== 'all' ||
      cantidadFilter !== 'all' ||
      cityFilter !== 'all' ||
      coleccionFilter !== 'all' ||
      priceRange[0] !== priceMinMax.min ||
      priceRange[1] !== priceMinMax.max
    );
  }, [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, cantidadFilter, cityFilter, coleccionFilter, priceRange, priceMinMax]);

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
  }), [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, sortBy, cantidadFilter, cityFilter, coleccionFilter]);

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
