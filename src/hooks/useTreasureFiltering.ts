/**
 * useTreasureFiltering Hook
 * Composition hook that combines filter options, sorting, filtering, and inactivity timeout.
 * Sub-hooks: useFilterOptions, useTreasureSort, useFilterInactivityTimeout.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { TreasureItem } from '../types';
import { fuzzyMatch } from '../utils/fuzzySearch';
import { normalizeQuality, normalizeColor } from '../constants/quality-and-colors';
import { useFilterOptions } from './useFilterOptions';
import { useTreasureSort, type SortOption } from './useTreasureSort';
import { useFilterInactivityTimeout } from './useFilterInactivityTimeout';
// Category filter now matches directly against item.categoria (Column K from inventory sheet)

// Sequential stock: same product listed multiple times.
// Only the first non-sold item in each group is shown; the rest are hidden.
const seq = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

const SEQUENTIAL_STOCK_GROUPS: number[][] = [
  [125, ...seq(135, 151)], // Same product, show one at a time
];

export type { SortOption } from './useTreasureSort';
export type TypeFilter = 'all' | 'loose' | 'jewelry';
export type StatusFilter = 'all' | 'available' | 'sold';
export type HeroCategoryFilter = 'all' | 'piedras' | 'gemas' | 'lotes' | 'joyas';

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
  categoriaFilter: string; // 'all' | main category name like 'joyas'
  coleccionFilter: string; // 'all' | specific collection name
  itemsFilter: number[]; // Filter by specific item numbers (for QR/quotation links)
  heroCategoryFilter: HeroCategoryFilter; // Hero tab pre-filter from home page
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
  setCategoriaFilter: (categoria: string) => void;
  setColeccionFilter: (coleccion: string) => void;
  setHeroCategoryFilter: (heroCategory: HeroCategoryFilter) => void;
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
    categorias: string[];
    priceMinMax: { min: number; max: number };
  };
}

export function useTreasureFiltering({
  treasure,
  initialFilters = {},
  inactivityTimeoutMinutes,
}: UseTreasureFilteringOptions): UseTreasureFilteringReturn {
  // Compute available filter options from treasure data
  const filterOptions = useFilterOptions(treasure);
  const { priceMinMax } = filterOptions;

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
  const [categoriaFilter, setCategoriaFilter] = useState(initialFilters.categoriaFilter || 'all');
  const [coleccionFilter, setColeccionFilter] = useState(initialFilters.coleccionFilter || 'all');
  const [heroCategoryFilter, setHeroCategoryFilter] = useState<HeroCategoryFilter>(initialFilters.heroCategoryFilter || 'all');
  const [itemsFilter] = useState<number[]>(initialFilters.itemsFilter || []);

  // Track if priceRange has been initialized to prevent re-syncing
  const priceRangeInitialized = useRef(!!initialFilters.priceRange);

  // Auto-clear heroCategory when user manually selects a conflicting filter.
  // Without this, heroCategory (hidden on mobile) silently AND-conflicts with
  // categoriaFilter/typeFilter/cantidadFilter, producing 0 results.
  const heroCategoryRef = useRef(heroCategoryFilter);
  heroCategoryRef.current = heroCategoryFilter;

  useEffect(() => {
    const hasManualOverride = categoriaFilter !== 'all' || typeFilter !== 'all' || cantidadFilter !== 'all';
    if (hasManualOverride && heroCategoryRef.current !== 'all') {
      setHeroCategoryFilter('all');
    }
  }, [categoriaFilter, typeFilter, cantidadFilter]);

  // Sync priceRange to full range when treasure loads (ensures all products shown by default)
  useEffect(() => {
    if (!priceRangeInitialized.current && treasure.length > 0 && priceMinMax.max > 0) {
      priceRangeInitialized.current = true;
      setPriceRange([priceMinMax.min, priceMinMax.max]);
    }
  }, [priceMinMax.min, priceMinMax.max, treasure.length]);

  // Hide sequential stock duplicates — keep only the first non-sold item per group
  const hiddenItems = useMemo(() => {
    const hidden = new Set<number>();
    for (const group of SEQUENTIAL_STOCK_GROUPS) {
      const groupSet = new Set(group);
      const groupItems = treasure
        .filter(t => groupSet.has(t.item))
        .sort((a, b) => a.item - b.item);

      const activeItem = groupItems.find(
        t => (t.estado?.toUpperCase() || '') !== 'VENDIDA'
      );

      for (const t of groupItems) {
        if (!activeItem || t.item !== activeItem.item) {
          hidden.add(t.item);
        }
      }
    }
    return hidden;
  }, [treasure]);

  // Hero category filter: maps hero tabs to Column K (categoria) + cantidad logic
  const matchesHeroCategory = useCallback((item: TreasureItem): boolean => {
    if (heroCategoryFilter === 'all') return true;
    const cat = (item.categoria || '').trim();
    switch (heroCategoryFilter) {
      case 'piedras':
        return cat === 'Piedras';
      case 'gemas':
        return cat === 'Gema' && item.cantidad === 1;
      case 'lotes':
        return cat === 'Lote de Gemas' || (cat === 'Gema' && item.cantidad > 1);
      case 'joyas':
        return !!item.isJewelry;
      default:
        return true;
    }
  }, [heroCategoryFilter]);

  // Filter treasure
  const filteredTreasure = useMemo(() => {
    return treasure.filter(item => {
      if (hiddenItems.has(item.item)) return false;
      const itemEstado = item.estado?.toUpperCase() || '';
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && itemEstado === 'DISPONIBLE') ||
        (statusFilter === 'sold' && itemEstado === 'VENDIDA');

      if (!matchesStatus) return false;
      if (!matchesHeroCategory(item)) return false;

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
      const matchesPrice = item.precioCOP === 0 || (item.precioCOP >= priceRange[0] && item.precioCOP <= priceRange[1]);
      const matchesCantidad =
        cantidadFilter === 'all' ||
        (cantidadFilter === '1' && item.cantidad === 1) ||
        (cantidadFilter === '2+' && item.cantidad > 1);
      const matchesCity = cityFilter === 'all' || item.city === cityFilter;
      const matchesCategoria = categoriaFilter === 'all' || item.categoria === categoriaFilter;
      const matchesColeccion = coleccionFilter === 'all' || item.coleccion === coleccionFilter;
      const matchesItems = itemsFilter.length === 0 || itemsFilter.includes(item.item);

      return matchesSearch && matchesColor && matchesQuality && matchesType && matchesShape && matchesPrice && matchesCantidad && matchesCity && matchesCategoria && matchesColeccion && matchesItems;
    });
  }, [treasure, hiddenItems, search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, cantidadFilter, cityFilter, categoriaFilter, coleccionFilter, itemsFilter, matchesHeroCategory]);

  // Sort using extracted hook
  const sortedTreasure = useTreasureSort(filteredTreasure, sortBy);

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
    setStatusFilter('available');
    setShapeFilter('all');
    setCantidadFilter('all');
    setCityFilter('all');
    setCategoriaFilter('all');
    setColeccionFilter('all');
    setHeroCategoryFilter('all');
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
      categoriaFilter !== 'all' ||
      coleccionFilter !== 'all' ||
      heroCategoryFilter !== 'all' ||
      priceRange[0] !== priceMinMax.min ||
      priceRange[1] !== priceMinMax.max
    );
  }, [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, cantidadFilter, cityFilter, categoriaFilter, coleccionFilter, heroCategoryFilter, priceRange, priceMinMax]);

  // Inactivity timeout — clears filters after idle period.
  // Pass hasUrlFilters so the mount effect doesn't clear intentional URL navigations
  // (e.g. hero category tabs from home page).
  const hasUrlFilters = Object.keys(initialFilters).length > 0;
  useFilterInactivityTimeout({
    hasFilters,
    clearFilters,
    inactivityTimeoutMinutes,
    hasUrlFilters,
  });

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
    categoriaFilter,
    cantidadFilter,
    cityFilter,
    coleccionFilter,
    heroCategoryFilter,
    itemsFilter,
  }), [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, sortBy, categoriaFilter, cantidadFilter, cityFilter, coleccionFilter, heroCategoryFilter, itemsFilter]);

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
    setCategoriaFilter,
    setColeccionFilter,
    setHeroCategoryFilter,
    clearFilters,
    hasFilters,
    filteredTreasure,
    sortedTreasure,
    filteredStats,
    filterOptions,
  };
}

export default useTreasureFiltering;
