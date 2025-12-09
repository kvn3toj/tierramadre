/**
 * useInventoryFiltering Hook
 * Manages inventory filtering, sorting, and search state.
 * Extracted from InventoryBrowser.tsx for reusability.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { InventoryItem } from '../types';
import { fuzzyMatch } from '../utils/fuzzySearch';

export type TypeFilter = 'all' | 'loose' | 'jewelry';
export type StatusFilter = 'all' | 'available' | 'sold';
export type SortOption =
  | 'price-desc'
  | 'price-asc'
  | 'name-asc'
  | 'name-desc'
  | 'quality-premium'
  | 'item-number'
  | 'newest';

export interface InventoryFilters {
  search: string;
  colorFilter: string;
  qualityFilter: string;
  typeFilter: TypeFilter;
  statusFilter: StatusFilter;
  shapeFilter: string;
  priceRange: [number, number];
  sortBy: SortOption;
}

export interface UseInventoryFilteringOptions {
  inventory: InventoryItem[];
  initialFilters?: Partial<InventoryFilters>;
}

export interface UseInventoryFilteringReturn {
  // Filter state
  filters: InventoryFilters;
  setSearch: (search: string) => void;
  setColorFilter: (color: string) => void;
  setQualityFilter: (quality: string) => void;
  setTypeFilter: (type: TypeFilter) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setShapeFilter: (shape: string) => void;
  setPriceRange: (range: [number, number]) => void;
  setSortBy: (sort: SortOption) => void;
  clearFilters: () => void;
  hasFilters: boolean;

  // Filtered data
  filteredInventory: InventoryItem[];
  sortedInventory: InventoryItem[];

  // Stats
  filteredStats: {
    count: number;
    totalValue: number;
  };

  // Filter options derived from inventory
  filterOptions: {
    colors: string[];
    shapes: string[];
    qualities: string[];
    priceMinMax: { min: number; max: number };
  };
}

const QUALITY_ORDER: Record<string, number> = {
  'SuperFina': 4,
  'Fina': 3,
  'Superior': 2,
  'Comercial': 1,
};

export function useInventoryFiltering({
  inventory,
  initialFilters = {},
}: UseInventoryFilteringOptions): UseInventoryFilteringReturn {
  // Get price range from inventory
  const priceMinMax = useMemo(() => {
    const prices = inventory.map(item => item.precioCOP).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 100000000 };
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [inventory]);

  // Filter state
  const [search, setSearch] = useState(initialFilters.search || '');
  const [colorFilter, setColorFilter] = useState(initialFilters.colorFilter || 'all');
  const [qualityFilter, setQualityFilter] = useState(initialFilters.qualityFilter || 'all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialFilters.typeFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilters.statusFilter || 'all');
  const [shapeFilter, setShapeFilter] = useState(initialFilters.shapeFilter || 'all');
  const [priceRange, setPriceRange] = useState<[number, number]>(
    initialFilters.priceRange || [priceMinMax.min, priceMinMax.max]
  );
  const [sortBy, setSortBy] = useState<SortOption>(initialFilters.sortBy || 'price-desc');

  // Sync priceRange when inventory loads/changes (ensures full range by default)
  useEffect(() => {
    if (!initialFilters.priceRange) {
      setPriceRange([priceMinMax.min, priceMinMax.max]);
    }
  }, [priceMinMax.min, priceMinMax.max, initialFilters.priceRange]);

  // Get unique filter options from inventory
  const filterOptions = useMemo(() => {
    const colors = new Set<string>();
    const shapes = new Set<string>();
    const qualities = new Set<string>();

    inventory.forEach(item => {
      if (item.color) colors.add(item.color);
      if (item.talla) shapes.add(item.talla);
      if (item.calidad) qualities.add(item.calidad);
    });

    return {
      colors: Array.from(colors).sort(),
      shapes: Array.from(shapes).sort(),
      qualities: Array.from(qualities).sort(),
      priceMinMax,
    };
  }, [inventory, priceMinMax]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
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

      return matchesSearch && matchesColor && matchesQuality && matchesType && matchesShape && matchesPrice;
    });
  }, [inventory, search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange]);

  // Sort inventory based on selected option
  const sortedInventory = useMemo(() => {
    const sorted = [...filteredInventory];

    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.nombre.localeCompare(b.nombre));
      case 'name-desc':
        return sorted.sort((a, b) => b.nombre.localeCompare(a.nombre));
      case 'price-asc':
        return sorted.sort((a, b) => a.precioCOP - b.precioCOP);
      case 'price-desc':
        return sorted.sort((a, b) => b.precioCOP - a.precioCOP);
      case 'quality-premium':
        return sorted.sort((a, b) => {
          const aScore = QUALITY_ORDER[a.calidad.split(' ').pop() || ''] || 0;
          const bScore = QUALITY_ORDER[b.calidad.split(' ').pop() || ''] || 0;
          return bScore - aScore;
        });
      case 'item-number':
        return sorted.sort((a, b) => a.item - b.item);
      case 'newest':
        return sorted.sort((a, b) => {
          // Parse dates in format "20-nov-2025"
          const parseDate = (dateStr: string) => {
            if (!dateStr) return 0;
            return new Date(dateStr).getTime();
          };
          return parseDate(b.fechaIngreso) - parseDate(a.fechaIngreso);
        });
      default:
        return sorted.sort((a, b) => b.precioCOP - a.precioCOP);
    }
  }, [filteredInventory, sortBy]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const totalValue = filteredInventory.reduce((sum, i) => sum + i.precioCOP, 0);
    return { count: filteredInventory.length, totalValue };
  }, [filteredInventory]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearch('');
    setColorFilter('all');
    setQualityFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setShapeFilter('all');
    setPriceRange([priceMinMax.min, priceMinMax.max]);
  }, [priceMinMax]);

  // Check if any filters are active
  const hasFilters = useMemo(() => {
    return (
      search !== '' ||
      colorFilter !== 'all' ||
      qualityFilter !== 'all' ||
      typeFilter !== 'all' ||
      statusFilter !== 'all' ||
      shapeFilter !== 'all' ||
      priceRange[0] !== priceMinMax.min ||
      priceRange[1] !== priceMinMax.max
    );
  }, [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, priceMinMax]);

  return {
    filters: {
      search,
      colorFilter,
      qualityFilter,
      typeFilter,
      statusFilter,
      shapeFilter,
      priceRange,
      sortBy,
    },
    setSearch,
    setColorFilter,
    setQualityFilter,
    setTypeFilter,
    setStatusFilter,
    setShapeFilter,
    setPriceRange,
    setSortBy,
    clearFilters,
    hasFilters,
    filteredInventory,
    sortedInventory,
    filteredStats,
    filterOptions,
  };
}

export default useInventoryFiltering;
