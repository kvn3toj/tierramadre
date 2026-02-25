/**
 * useUrlFilterSync Hook
 *
 * Handles bidirectional sync between TreasureFilters and URL query params.
 * Extracted from TreasureBrowser for reusability and clarity.
 */
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { TreasureFilters, TypeFilter, StatusFilter, SortOption, CityFilter, HeroCategoryFilter } from './useTreasureFiltering';

export interface UseUrlFilterSyncOptions {
  filters: TreasureFilters;
  priceMinMax: { min: number; max: number };
  clearFilters: () => void;
}

export interface UseUrlFilterSyncReturn {
  initialFilters: Partial<TreasureFilters>;
  handleClearFilters: () => void;
}

/**
 * Parse URL query params into initial filter values.
 * Only runs once on mount to avoid infinite loops.
 */
export function parseUrlFilters(): Partial<TreasureFilters> {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const filters: Partial<TreasureFilters> = {};

  const search = params.get('search');
  if (search) filters.search = search;

  // Hero category filter (new canonical param from hero tabs)
  const heroCategory = params.get('heroCategory');
  const validHeroCategories: HeroCategoryFilter[] = ['piedras', 'gemas', 'lotes', 'joyas'];
  if (heroCategory && validHeroCategories.includes(heroCategory as HeroCategoryFilter)) {
    filters.heroCategoryFilter = heroCategory as HeroCategoryFilter;
  }

  const type = params.get('type');
  if (type === 'loose' || type === 'jewelry') {
    // Backward compat: ?type=jewelry → heroCategoryFilter 'joyas'
    if (type === 'jewelry' && !heroCategory) {
      filters.heroCategoryFilter = 'joyas';
    } else {
      filters.typeFilter = type as TypeFilter;
    }
  }

  const quality = params.get('quality');
  if (quality) filters.qualityFilter = quality;

  const city = params.get('city');
  if (city === 'Cali' || city === 'Bogotá') filters.cityFilter = city as CityFilter;

  const priceMin = params.get('priceMin');
  const priceMax = params.get('priceMax');
  if (priceMin || priceMax) {
    filters.priceRange = [
      priceMin ? parseInt(priceMin, 10) : 0,
      priceMax ? parseInt(priceMax, 10) : Number.MAX_SAFE_INTEGER
    ];
  }

  const status = params.get('status');
  if (status === 'all' || status === 'available' || status === 'sold') {
    filters.statusFilter = status as StatusFilter;
  }

  const sort = params.get('sort');
  if (sort) filters.sortBy = sort as SortOption;

  const shape = params.get('shape');
  if (shape) filters.shapeFilter = shape;

  const color = params.get('color');
  if (color) filters.colorFilter = color;

  const categoria = params.get('categoria');
  if (categoria) {
    // Backward compat: ?categoria=joyas → heroCategoryFilter 'joyas'
    if (categoria.toLowerCase() === 'joyas' && !heroCategory) {
      filters.heroCategoryFilter = 'joyas';
    } else {
      filters.categoriaFilter = categoria;
    }
  }

  const coleccion = params.get('coleccion');
  if (coleccion) filters.coleccionFilter = coleccion;

  const cantidad = params.get('cantidad');
  if (cantidad === '1' || cantidad === '2+' || cantidad === '2%2B') {
    filters.cantidadFilter = cantidad === '2%2B' ? '2+' : cantidad;
  }

  // Parse items filter (comma-separated item numbers for QR/quotation links)
  const items = params.get('items');
  if (items) {
    const itemNumbers = items.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    if (itemNumbers.length > 0) {
      filters.itemsFilter = itemNumbers;
    }
  }

  return filters;
}

/**
 * Sync filters to URL and provide clear functionality.
 */
export function useUrlFilterSync({
  filters,
  priceMinMax: _priceMinMax,
  clearFilters,
}: UseUrlFilterSyncOptions): UseUrlFilterSyncReturn {
  // Note: priceMinMax reserved for future URL sync of price range
  void _priceMinMax;
  // Parse URL params only on mount
  const initialFilters = useMemo(() => parseUrlFilters(), []);

  // Track if this is initial mount (skip first sync)
  const isInitialMount = useRef(true);
  // Track previous URL params string to avoid unnecessary updates
  const prevUrlParams = useRef('');

  // Sync filters to URL using history API (avoids React Router loops)
  useEffect(() => {
    // Skip initial mount - URL already has params from navigation
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevUrlParams.current = window.location.search.slice(1);
      return;
    }

    const params = new URLSearchParams();

    // Only add non-default values to URL
    if (filters.search) params.set('search', filters.search);
    if (filters.heroCategoryFilter !== 'all') params.set('heroCategory', filters.heroCategoryFilter);
    if (filters.typeFilter !== 'all') params.set('type', filters.typeFilter);
    if (filters.statusFilter !== 'available' && filters.statusFilter !== 'all') {
      params.set('status', filters.statusFilter);
    }
    if (filters.qualityFilter && filters.qualityFilter !== 'all') {
      params.set('quality', filters.qualityFilter);
    }
    if (filters.colorFilter && filters.colorFilter !== 'all') {
      params.set('color', filters.colorFilter);
    }
    if (filters.shapeFilter && filters.shapeFilter !== 'all') {
      params.set('shape', filters.shapeFilter);
    }
    if (filters.cityFilter !== 'all') params.set('city', filters.cityFilter);
    if (filters.categoriaFilter && filters.categoriaFilter !== 'all') {
      params.set('categoria', filters.categoriaFilter);
    }
    if (filters.coleccionFilter && filters.coleccionFilter !== 'all') {
      params.set('coleccion', filters.coleccionFilter);
    }
    if (filters.sortBy !== 'newest') params.set('sort', filters.sortBy);
    if (filters.cantidadFilter && filters.cantidadFilter !== 'all') {
      params.set('cantidad', filters.cantidadFilter);
    }

    // Price range - only if modified from defaults
    if (filters.priceRange[0] > 0) {
      params.set('priceMin', String(filters.priceRange[0]));
    }
    if (filters.priceRange[1] < Number.MAX_SAFE_INTEGER) {
      params.set('priceMax', String(filters.priceRange[1]));
    }

    const newParamsString = params.toString();

    // Only update if params actually changed
    if (newParamsString !== prevUrlParams.current) {
      prevUrlParams.current = newParamsString;
      const newUrl = newParamsString
        ? `${window.location.pathname}?${newParamsString}`
        : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, [filters]);

  // Clear filters and URL params
  const handleClearFilters = useCallback(() => {
    clearFilters();
    window.history.replaceState(null, '', window.location.pathname);
  }, [clearFilters]);

  return {
    initialFilters,
    handleClearFilters,
  };
}

export default useUrlFilterSync;
