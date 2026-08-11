/**
 * useTreasureFiltering Hook
 * Composition hook that combines filter options, sorting, filtering, and inactivity timeout.
 * Sub-hooks: useFilterOptions, useTreasureSort, useFilterInactivityTimeout.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { isPurchasable } from '../utils/productOffer';
import { useResaleOffers } from './useResaleOffers';
import { TreasureItem } from '../types';
import { fuzzyMatch } from '../utils/fuzzySearch';
import { normalizeCollection } from '../utils/formatting';
import {
  normalizeQuality,
  normalizeColor,
} from '../constants/quality-and-colors';
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
export type HeroCategoryFilter =
  | 'all'
  | 'piedras'
  | 'gemas'
  | 'lotes'
  | 'joyas';

export type CityFilter = 'all' | 'Cali' | 'Bogotá';

export interface TreasureFilters {
  search: string;
  colorFilter: string;
  qualityFilter: string;
  typeFilter: TypeFilter;
  statusFilter: StatusFilter;
  shapeFilter: string;
  priceRange: [number, number];
  caratRange: [number, number];
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
  setCaratRange: (range: [number, number]) => void;
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
    /** Sum of the filtered rows whose price is KNOWN (withheld prices are skipped). */
    totalValue: number;
    /** How many filtered rows `totalValue` covers. 0 → show no total at all. */
    pricedCount: number;
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
    caratMinMax: { min: number; max: number };
  };
}

export function useTreasureFiltering({
  treasure,
  initialFilters = {},
  inactivityTimeoutMinutes,
}: UseTreasureFilteringOptions): UseTreasureFilteringReturn {
  const { resaleIndex } = useResaleOffers();
  // Compute available filter options from treasure data
  const filterOptions = useFilterOptions(treasure);
  const { priceMinMax, caratMinMax } = filterOptions;

  // Filter state
  const [search, setSearch] = useState(initialFilters.search || '');
  const [colorFilter, setColorFilter] = useState(
    initialFilters.colorFilter || 'all',
  );
  const [qualityFilter, setQualityFilter] = useState(
    initialFilters.qualityFilter || 'all',
  );
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    initialFilters.typeFilter || 'all',
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialFilters.statusFilter || 'all',
  );
  const [shapeFilter, setShapeFilter] = useState(
    initialFilters.shapeFilter || 'all',
  );
  const [priceRange, setPriceRangeRaw] = useState<[number, number]>(
    initialFilters.priceRange || [0, Number.MAX_SAFE_INTEGER],
  );
  const [caratRange, setCaratRangeRaw] = useState<[number, number]>(
    initialFilters.caratRange || [0, Number.MAX_SAFE_INTEGER],
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    initialFilters.sortBy || 'newest',
  );
  const [cantidadFilter, setCantidadFilter] = useState(
    initialFilters.cantidadFilter || 'all',
  );
  const [cityFilter, setCityFilter] = useState<CityFilter>(
    initialFilters.cityFilter || 'all',
  );
  const [categoriaFilter, setCategoriaFilter] = useState(
    initialFilters.categoriaFilter || 'all',
  );
  const [coleccionFilter, setColeccionFilter] = useState(
    initialFilters.coleccionFilter || 'all',
  );
  const [heroCategoryFilter, setHeroCategoryFilter] =
    useState<HeroCategoryFilter>(initialFilters.heroCategoryFilter || 'all');
  const [itemsFilter] = useState<number[]>(initialFilters.itemsFilter || []);

  // Whether the user (or a deep-link URL) has explicitly narrowed the range.
  // While false, the range tracks the data's full extent so a late min/max
  // recompute never masquerades as an applied filter (the phantom chip bug).
  const priceUserNarrowed = useRef(!!initialFilters.priceRange);
  const caratUserNarrowed = useRef(!!initialFilters.caratRange);

  const setPriceRange = useCallback((range: [number, number]) => {
    priceUserNarrowed.current = true;
    setPriceRangeRaw(range);
  }, []);
  const setCaratRange = useCallback((range: [number, number]) => {
    caratUserNarrowed.current = true;
    setCaratRangeRaw(range);
  }, []);

  // Auto-clear heroCategory when user manually selects a conflicting filter.
  // Without this, heroCategory (hidden on mobile) silently AND-conflicts with
  // categoriaFilter/typeFilter/cantidadFilter, producing 0 results.
  const heroCategoryRef = useRef(heroCategoryFilter);
  heroCategoryRef.current = heroCategoryFilter;

  useEffect(() => {
    const hasManualOverride =
      categoriaFilter !== 'all' ||
      typeFilter !== 'all' ||
      cantidadFilter !== 'all';
    if (hasManualOverride && heroCategoryRef.current !== 'all') {
      setHeroCategoryFilter('all');
    }
  }, [categoriaFilter, typeFilter, cantidadFilter]);

  // Keep priceRange pinned to the data's full extent until the user narrows it,
  // so staged min/max recomputes never surface as a phantom "active" filter.
  useEffect(() => {
    if (
      priceUserNarrowed.current ||
      treasure.length === 0 ||
      priceMinMax.max <= 0
    )
      return;
    setPriceRangeRaw((prev) =>
      prev[0] === priceMinMax.min && prev[1] === priceMinMax.max
        ? prev
        : [priceMinMax.min, priceMinMax.max],
    );
  }, [priceMinMax.min, priceMinMax.max, treasure.length]);

  // Same for caratRange.
  useEffect(() => {
    if (
      caratUserNarrowed.current ||
      treasure.length === 0 ||
      caratMinMax.max <= 0
    )
      return;
    setCaratRangeRaw((prev) =>
      prev[0] === caratMinMax.min && prev[1] === caratMinMax.max
        ? prev
        : [caratMinMax.min, caratMinMax.max],
    );
  }, [caratMinMax.min, caratMinMax.max, treasure.length]);

  // Hide sequential stock duplicates — keep only the first non-sold item per group
  const hiddenItems = useMemo(() => {
    const hidden = new Set<number>();
    for (const group of SEQUENTIAL_STOCK_GROUPS) {
      const groupSet = new Set(group);
      const groupItems = treasure
        .filter((t) => groupSet.has(t.item))
        .sort((a, b) => a.item - b.item);

      const activeItem = groupItems.find(
        (t) => (t.estado?.toUpperCase() || '') !== 'VENDIDA',
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
  const matchesHeroCategory = useCallback(
    (item: TreasureItem): boolean => {
      if (heroCategoryFilter === 'all') return true;
      const cat = (item.categoria || '').trim();
      switch (heroCategoryFilter) {
        case 'piedras':
          return cat === 'Piedras';
        case 'gemas':
          return cat === 'Gema' && item.cantidad === 1;
        case 'lotes':
          return (
            cat === 'Lote de Gemas' || (cat === 'Gema' && item.cantidad > 1)
          );
        case 'joyas':
          return !!item.isJewelry;
        default:
          return true;
      }
    },
    [heroCategoryFilter],
  );

  // Filter treasure
  const filteredTreasure = useMemo(() => {
    // Match collections by normalized key so a selection covers all duplicate
    // spellings (prefix/case/accent) that collapsed into one filter option.
    const coleccionKey =
      coleccionFilter === 'all' ? '' : normalizeCollection(coleccionFilter);
    return treasure.filter((item) => {
      if (hiddenItems.has(item.item)) return false;

      // Items explicitly referenced by number (QR/quotation link, e.g. a
      // client's saved ?items= URL) always pass the status check, even if
      // they've since sold. That link is the client's reference to their
      // order — it shouldn't go blank just because the item is no longer
      // available.
      const isExplicitItem =
        itemsFilter.length > 0 && itemsFilter.includes(item.item);

      // `precioCOP` is absent (not zero — `typeof` is not `'number'`) for a
      // catalog read the server withheld the price on: an anonymous/guest
      // visitor (control-de-acceso-al-catalogo, api/_lib/catalogProjection.ts
      // — TreasureItem's non-optional `precioCOP: number` type does not
      // survive a projection that never sends the key). Withheld is not the
      // same claim as "priced at zero" below, and must not be treated the
      // same: a guest's whole catalog is priceless by design, and gating
      // display on that would render an empty grid for every invited guest
      // (an asesor's invitation link landing the client on a blank browser).
      const priceKnown = typeof item.precioCOP === 'number';

      // Hide priceless rows from the browse grid (2026-07-23).
      //
      // The SOT v3 inventory deliberately zeroes the cost of parent records so
      // the same money isn't counted twice: a lote's parent row (#339 "Jardín
      // Secreto", lote C-006) and a pair that was split into stones (#363
      // "Igualdad" → #467-470) are RETIRED to 0, with the live cost sitting on
      // the individual pieces. Those parents are correctly hidden from the
      // Convex catalog (`mostrarEnCatalogo: false`), but that flag gates ONLY
      // the Convex path — the Sheets reader returns every row — so they used to
      // surface here rendering "$ 0".
      //
      // The gate is the PRICE, not `mostrarEnCatalogo`: that flag means
      // "published through the Fotosíntesis wizard" and is false for the whole
      // legacy catalog (#1 Rey Midas, #50, #150 …), so filtering on it would
      // hide 397 of 513 items. A row with no price cannot be sold or compared,
      // and self-heals the moment a cost is captured.
      //
      // `isExplicitItem` still wins, so a QR/quotation deep link to a priceless
      // item resolves instead of going blank. `priceKnown` also wins — this
      // gate only applies when the server actually told us the price was
      // zero, not when it withheld the price entirely.
      if (!isExplicitItem && priceKnown && !(item.precioCOP > 0)) return false;

      // Same priceKnown-style distinction as above, for `estado` (N4,
      // 2026-08 fix round 3): withheld for anon/guest (undefined) is not
      // the same claim as "no estado value on this staff row" (`''`, rare
      // legacy rows). Without `estadoKnown`, any statusFilter other than
      // 'all' silently dropped every row for a guest — including
      // src/components/ios/MoreSheetSearch.tsx, which hard-codes
      // `statusFilter: 'available'` for the global search sheet, so a
      // guest's search always returned zero results, for any query.
      const estadoKnown = typeof item.estado === 'string';
      const matchesStatus =
        isExplicitItem ||
        statusFilter === 'all' ||
        !estadoKnown ||
        // Not `itemEstado === 'DISPONIBLE'`. Sellability is no longer one
        // field: CONSIGNACION is TM's stock an ambassador merely holds, and a
        // piece an ambassador bought is purchasable again the moment they
        // offer it for resale. getOffer owns that decision now.
        (statusFilter === 'available' &&
          isPurchasable(item, resaleIndex.get(item.item))) ||
        (statusFilter === 'sold' &&
          !isPurchasable(item, resaleIndex.get(item.item)));

      if (!matchesStatus) return false;
      if (!matchesHeroCategory(item)) return false;

      const matchesSearch =
        !search ||
        fuzzyMatch(item.nombre, search) ||
        fuzzyMatch(item.color, search) ||
        fuzzyMatch(item.calidad, search) ||
        item.item.toString().includes(search.trim());

      const matchesColor =
        colorFilter === 'all' || normalizeColor(item.color) === colorFilter;
      const matchesQuality =
        qualityFilter === 'all' ||
        normalizeQuality(item.calidad) === qualityFilter;
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'loose' && !item.isJewelry) ||
        (typeFilter === 'jewelry' && item.isJewelry);
      const matchesShape = shapeFilter === 'all' || item.talla === shapeFilter;
      // Same `priceKnown` reasoning as the priceless-row gate above: a
      // withheld price can't be compared against a numeric range at all
      // (every comparison against `undefined` is false), so a price-range
      // filter must not exclude what it cannot evaluate.
      const matchesPrice =
        !priceKnown ||
        item.precioCOP === 0 ||
        (item.precioCOP >= priceRange[0] && item.precioCOP <= priceRange[1]);
      const itemCarats =
        typeof item.peso === 'number'
          ? item.peso
          : parseFloat(String(item.peso));
      const matchesCarat =
        isNaN(itemCarats) ||
        itemCarats === 0 ||
        (itemCarats >= caratRange[0] && itemCarats <= caratRange[1]);
      // Same withheld-vs-known distinction as `priceKnown`/`estadoKnown`
      // above, for the last two WITHHELD_KEYS this filter reads. Both are
      // absent for an anon/guest read, and both comparisons against
      // `undefined` are unconditionally false — so before this guard, picking
      // ANY cantidad or city emptied a guest's catalog outright.
      const cantidadKnown = typeof item.cantidad === 'number';
      const matchesCantidad =
        cantidadFilter === 'all' ||
        !cantidadKnown ||
        (cantidadFilter === '1' && item.cantidad === 1) ||
        (cantidadFilter === '2+' && item.cantidad > 1);
      // NOTE: `city` is optional even on a staff row (nothing in the current
      // pipeline populates it — no producer in api/, convex/ or src/ ever
      // assigns it), so `!cityKnown` currently makes the city filter a no-op
      // for everyone rather than only for guests. That is the deliberate
      // reading of the rule: an unknown city cannot be judged, so the row
      // survives. It replaces the previous behaviour, which was to return an
      // empty catalog for every caller the moment a city was picked.
      const cityKnown = typeof item.city === 'string';
      const matchesCity =
        cityFilter === 'all' || !cityKnown || item.city === cityFilter;
      const matchesCategoria =
        categoriaFilter === 'all' || item.categoria === categoriaFilter;
      const matchesColeccion =
        coleccionFilter === 'all' ||
        normalizeCollection(item.coleccion) === coleccionKey;
      const matchesItems =
        itemsFilter.length === 0 || itemsFilter.includes(item.item);

      return (
        matchesSearch &&
        matchesColor &&
        matchesQuality &&
        matchesType &&
        matchesShape &&
        matchesPrice &&
        matchesCarat &&
        matchesCantidad &&
        matchesCity &&
        matchesCategoria &&
        matchesColeccion &&
        matchesItems
      );
    });
  }, [
    treasure,
    hiddenItems,
    search,
    colorFilter,
    qualityFilter,
    typeFilter,
    statusFilter,
    shapeFilter,
    priceRange,
    caratRange,
    cantidadFilter,
    cityFilter,
    categoriaFilter,
    coleccionFilter,
    itemsFilter,
    matchesHeroCategory,
  ]);

  // Sort using extracted hook
  const sortedTreasure = useTreasureSort(filteredTreasure, sortBy);

  // Calculate filtered stats.
  //
  // `precioCOP` is withheld (absent, so `undefined`) for an anon/guest read —
  // adding it poisoned the accumulator and every consumer rendered "$ NaN".
  // Only numeric prices are summed, and `pricedCount` says how many rows the
  // sum actually covers, so callers can tell a REAL total from a total that
  // simply had nothing to add. The deliberate ruling: a total of 0 across 500
  // priceless rows is a lie, so when `pricedCount === 0` the UI must show no
  // total at all rather than "$ 0" (see MoreSheetSearch.tsx). A partial total
  // (some rows priced, some not — a vitrina grant, where only the shared items
  // carry prices) is still shown: it is the true sum of what the caller was
  // allowed to see.
  const filteredStats = useMemo(() => {
    let totalValue = 0;
    let pricedCount = 0;
    for (const i of filteredTreasure) {
      if (typeof i.precioCOP === 'number' && Number.isFinite(i.precioCOP)) {
        totalValue += i.precioCOP;
        pricedCount += 1;
      }
    }
    return { count: filteredTreasure.length, totalValue, pricedCount };
  }, [filteredTreasure]);

  // Clear all filters (reset to defaults, showing all items)
  const clearFilters = useCallback(() => {
    setSearch('');
    setColorFilter('all');
    setQualityFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setShapeFilter('all');
    setCantidadFilter('all');
    setCityFilter('all');
    setCategoriaFilter('all');
    setColeccionFilter('all');
    setHeroCategoryFilter('all');
    priceUserNarrowed.current = false;
    caratUserNarrowed.current = false;
    setPriceRangeRaw([priceMinMax.min, priceMinMax.max]);
    setCaratRangeRaw([caratMinMax.min, caratMinMax.max]);
  }, [priceMinMax, caratMinMax]);

  // Check if any filters are active (note: 'all' is the default status)
  const hasFilters = useMemo(() => {
    return (
      search !== '' ||
      colorFilter !== 'all' ||
      qualityFilter !== 'all' ||
      typeFilter !== 'all' ||
      statusFilter !== 'all' ||
      shapeFilter !== 'all' ||
      cantidadFilter !== 'all' ||
      cityFilter !== 'all' ||
      categoriaFilter !== 'all' ||
      coleccionFilter !== 'all' ||
      heroCategoryFilter !== 'all' ||
      // A range that still encompasses the full data extent is not a filter —
      // only treat it as active once the user has narrowed either bound.
      priceRange[0] > priceMinMax.min ||
      priceRange[1] < priceMinMax.max ||
      caratRange[0] > caratMinMax.min ||
      caratRange[1] < caratMinMax.max
    );
  }, [
    search,
    colorFilter,
    qualityFilter,
    typeFilter,
    statusFilter,
    shapeFilter,
    cantidadFilter,
    cityFilter,
    categoriaFilter,
    coleccionFilter,
    heroCategoryFilter,
    priceRange,
    priceMinMax,
    caratRange,
    caratMinMax,
  ]);

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
  const filters = useMemo(
    () => ({
      search,
      colorFilter,
      qualityFilter,
      typeFilter,
      statusFilter,
      shapeFilter,
      priceRange,
      caratRange,
      sortBy,
      categoriaFilter,
      cantidadFilter,
      cityFilter,
      coleccionFilter,
      heroCategoryFilter,
      itemsFilter,
    }),
    [
      search,
      colorFilter,
      qualityFilter,
      typeFilter,
      statusFilter,
      shapeFilter,
      priceRange,
      caratRange,
      sortBy,
      categoriaFilter,
      cantidadFilter,
      cityFilter,
      coleccionFilter,
      heroCategoryFilter,
      itemsFilter,
    ],
  );

  return {
    filters,
    setSearch,
    setColorFilter,
    setQualityFilter,
    setTypeFilter,
    setStatusFilter,
    setShapeFilter,
    setPriceRange,
    setCaratRange,
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
