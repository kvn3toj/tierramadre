/**
 * Orchestrates all state and side-effects for the treasure catalog (TreasureBrowser).
 * Keeps the page component declarative and easier to test.
 */

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useDeferredValue,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import { useThemeMode } from "../contexts/ThemeContext";
import { useAuthContext } from "../contexts/AuthContext";
import { usePriceShare } from "../contexts/PriceShareContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTreasure } from "./useTreasure";
import {
  useTreasureFiltering,
  type TypeFilter,
  type StatusFilter,
  type SortOption,
} from "./useTreasureFiltering";
import { useUrlFilterSync, parseUrlFilters } from "./useUrlFilterSync";
import { useFilterTracking } from "./useFilterTracking";
import { useFavorites } from "./useFavorites";
import { usePagination } from "./usePagination";
import { useRecentlyViewed } from "./useRecentlyViewed";
import { useSavedFilters } from "./useSavedFilters";
import { useTreasureAnalytics } from "./useTreasureAnalytics";
import { useTrackingDispatch } from "../contexts/TrackingContext";
import { useProductViews } from "./useProductViews";
import { useComparison } from "./useComparison";
import type { FilterPreset } from "./useSavedFilters";
import type { TreasureItem } from "../types";
import { useCurrencyFormat } from "../contexts/CurrencyContext";
import { createLogger } from "../utils/logger";
import { readLoadedPages, saveLoadedPages } from "../utils/scrollMemory";
import { useLiveRegion } from "../components/shared/LiveRegion";
import type { FilterContentProps } from "../components/treasure/FilterContent";
import GridCard from "../components/treasure/GridCard";

const log = createLogger("Treasure");

export interface TreasureBrowserControllerOptions {
  isProviderMode?: boolean;
  defaultViewMode?: "grid" | "list";
}

export function useTreasureBrowserController({
  isProviderMode = false,
  defaultViewMode,
}: TreasureBrowserControllerOptions = {}) {
  const { t } = useLanguage();
  const { formatFullCurrency } = useCurrencyFormat();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { accessLevel } = useAuthContext();
  const { shouldShowPrices } = usePriceShare();
  const isAdmin = accessLevel === "admin";
  const isLight = mode === "light";
  const navigate = useNavigate();
  const location = useLocation();

  const {
    treasure: allTreasure,
    isLoadingThumbnails,
    sheetsError,
    refreshFromSheets,
    isLoadingSheets,
  } = useTreasure();

  const initialFilters = useMemo(() => parseUrlFilters(location.search), []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteringResult = useTreasureFiltering({
    treasure: allTreasure,
    initialFilters,
  });

  const {
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
    setCategoriaFilter,
    setColeccionFilter,
    setHeroCategoryFilter,
    clearFilters,
    hasFilters,
    sortedTreasure: filteredTreasure,
    filteredStats,
    filterOptions,
  } = filteringResult;

  const urlSync = useUrlFilterSync({
    filters,
    priceMinMax: filterOptions.priceMinMax,
    caratMinMax: filterOptions.caratMinMax,
    clearFilters,
  });

  const { track, checkAchievements } = useTrackingDispatch();

  const { activeFilterCount } = useFilterTracking({
    filters,
    priceMinMax: filterOptions.priceMinMax,
    caratMinMax: filterOptions.caratMinMax,
    resultsCount: filteredTreasure.length,
    track,
    checkAchievements,
  });

  const { isFavorite, toggleFavorite, favoritesCount } = useFavorites();

  // Persist "Load More" progress per history entry so returning to the list
  // (back nav) re-renders the same number of items, letting page-scroll
  // restoration land at the right offset instead of a truncated list.
  const pagesKey = `treasure-pages:${location.key}`;
  const pagination = usePagination({
    totalItems: filteredTreasure.length,
    itemsPerPage: 24,
    initialLoadedPages: readLoadedPages(pagesKey) ?? 1,
  });

  useEffect(() => {
    saveLoadedPages(pagesKey, pagination.loadedPages);
  }, [pagesKey, pagination.loadedPages]);

  const { addToRecent, recentItems, clearRecent } = useRecentlyViewed();

  const savedFilters = useSavedFilters();

  const analyticsHook = useTreasureAnalytics();

  const { getViewCount } = useProductViews();

  const getViewCountRef = useRef(getViewCount);
  getViewCountRef.current = getViewCount;

  const comparison = useComparison();

  const comparisonIds = useMemo(
    () => comparison.selectedItems.map((i) => i.item),
    [comparison.selectedItems],
  );

  const favoriteIds = useMemo(
    () => allTreasure.map((i) => i.item).filter((id) => isFavorite(id)),
    [allTreasure, isFavorite],
  );

  const deferredFilteredTreasure = useDeferredValue(filteredTreasure);

  const { announce } = useLiveRegion();
  const prevFilteredCount = useRef(filteredTreasure.length);
  useEffect(() => {
    if (prevFilteredCount.current !== filteredTreasure.length && hasFilters) {
      announce(`${filteredTreasure.length} ${t.treasure.resultsFound}`);
    }
    prevFilteredCount.current = filteredTreasure.length;
  }, [filteredTreasure.length, hasFilters, announce, t]);

  const [viewMode, setViewMode] = useState<"grid" | "list">(
    defaultViewMode ?? (isProviderMode ? "list" : "grid"),
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const handleScrollDirectionChange = useCallback(
    (_direction: "up" | "down") => {},
    [],
  );

  useEffect(() => {
    track("treasure_view", {
      total_items: allTreasure.length,
      view_mode: viewMode,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const searchInputRef = useRef<HTMLInputElement>(null);

  const paginatedItems = useMemo(
    () => pagination.getVisibleItems(filteredTreasure),
    [pagination, filteredTreasure],
  );

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const visibleItems = useMemo(() => {
    if (!showFavoritesOnly) return paginatedItems;
    return paginatedItems.filter((item) => isFavorite(item.item));
  }, [paginatedItems, showFavoritesOnly, isFavorite]);

  const treasureMap = useMemo(
    () => new Map(allTreasure.map((item) => [item.item, item])),
    [allTreasure],
  );

  const recentlyViewedItems = useMemo(() => {
    return recentItems
      .map((id) => treasureMap.get(id))
      .filter((item): item is TreasureItem => item !== undefined);
  }, [treasureMap, recentItems]);

  const favoriteMappedItems = useMemo(() => {
    return favoriteIds
      .map((id) => treasureMap.get(id))
      .filter((item): item is TreasureItem => item !== undefined);
  }, [treasureMap, favoriteIds]);

  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TreasureItem | null>(null);

  const stats = useMemo(() => {
    const available = allTreasure.filter(
      (i) => i.estado?.toUpperCase() === "DISPONIBLE",
    );
    return {
      totalItems: available.length,
      looseStones: available.filter((i) => !i.isJewelry).length,
      jewelry: available.filter((i) => i.isJewelry).length,
    };
  }, [allTreasure]);

  const {
    colors,
    shapes,
    qualities,
    colecciones,
    categorias,
    priceMinMax,
    caratMinMax,
  } = filterOptions;

  const {
    search,
    colorFilter,
    qualityFilter,
    typeFilter,
    statusFilter,
    shapeFilter,
    priceRange,
    sortBy,
    cantidadFilter,
    coleccionFilter,
    categoriaFilter,
  } = filters;

  const handleCertClick = useCallback((item: TreasureItem) => {
    setSelectedItem(item);
    setCertDialogOpen(true);
  }, []);

  const handleItemClick = useCallback(
    (item: TreasureItem, positionInList: number = 0) => {
      addToRecent(item.item);
      analyticsHook.trackItemView(item.item, item.nombre);
      track("product_clicked", {
        item_id: item.item,
        item_name: item.nombre || t.treasure.noName,
        position_in_list: positionInList,
        filters_active: hasFilters,
        view_mode: viewMode,
      });
      navigate(
        item.isLote && item.groupId
          ? `/grupo/${item.groupId}`
          : `/product/${item.item}`,
      );
    },
    [navigate, addToRecent, analyticsHook, track, hasFilters, viewMode, t],
  );

  const handleSaveCertifications = useCallback(
    (certifications: TreasureItem["certifications"]) => {
      if (selectedItem) {
        log.info(
          "Saving certifications for item:",
          selectedItem.item,
          certifications,
        );
      }
      setCertDialogOpen(false);
      setSelectedItem(null);
    },
    [selectedItem],
  );

  const { toggleComparison, canAddMore: canAddToComparison } = comparison;

  const renderCard = useCallback(
    (props: {
      item: TreasureItem;
      isFavorite: boolean;
      onItemClick: (item: TreasureItem) => void;
      onCertClick: (item: TreasureItem) => void;
      onToggleFavorite: (itemId: number) => void;
      isMobile: boolean;
      priority?: boolean;
      isSelectedForComparison?: boolean;
      canAddToComparison?: boolean;
    }) => (
      <GridCard
        item={props.item}
        isFavorite={props.isFavorite}
        onItemClick={props.onItemClick}
        onCertClick={props.onCertClick}
        onToggleFavorite={props.onToggleFavorite}
        isMobile={props.isMobile}
        priority={props.priority}
        viewCount={getViewCountRef.current(props.item.item)}
        isAdmin={isAdmin}
        isLoadingThumbnails={isLoadingThumbnails}
        isSelectedForComparison={props.isSelectedForComparison ?? false}
        onToggleComparison={toggleComparison}
        canAddToComparison={props.canAddToComparison ?? false}
      />
    ),
    [isAdmin, isLoadingThumbnails, toggleComparison],
  );

  const applySavedPreset = useCallback(
    (preset: FilterPreset) => {
      setSearch(preset.filters.search);
      setColorFilter(preset.filters.colorFilter);
      setQualityFilter(preset.filters.qualityFilter);
      setTypeFilter(preset.filters.typeFilter as TypeFilter);
      setStatusFilter(preset.filters.statusFilter as StatusFilter);
      setShapeFilter(preset.filters.shapeFilter);
      setPriceRange(preset.filters.priceRange);
      if (preset.filters.caratRange) setCaratRange(preset.filters.caratRange);
      setSortBy(preset.filters.sortBy as SortOption);
      if (preset.filters.cantidadFilter)
        setCantidadFilter(preset.filters.cantidadFilter);
      savedFilters.incrementUsage(preset.id);
    },
    [
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
      savedFilters,
    ],
  );

  const filterContentProps: FilterContentProps = {
    search,
    statusFilter,
    sortBy,
    typeFilter,
    cantidadFilter,
    colorFilter,
    shapeFilter,
    qualityFilter,
    coleccionFilter,
    categoriaFilter,
    priceRange,
    caratRange: filters.caratRange,
    setSearch,
    setStatusFilter,
    setSortBy,
    setTypeFilter,
    setCantidadFilter,
    setColorFilter,
    setShapeFilter,
    setQualityFilter,
    setColeccionFilter,
    setCategoriaFilter,
    setPriceRange,
    setCaratRange,
    showAdvancedFilters,
    setShowAdvancedFilters,
    hasFilters,
    handleClearFilters: urlSync.handleClearFilters,
    searchInputRef,
    sortedTreasure: filteredTreasure,
    analyticsHook,
    colors,
    shapes,
    qualities,
    colecciones,
    categorias,
    priceMinMax,
    caratMinMax,
    isLight,
    theme,
  };

  return {
    t,
    formatFullCurrency,
    theme,
    isLight,
    shouldShowPrices,
    isProviderMode,
    isAdmin,
    isMobile,
    allTreasure,
    isLoadingThumbnails,
    sheetsError,
    refreshFromSheets,
    isLoadingSheets,
    filters,
    filteredTreasure,
    filteredStats,
    deferredFilteredTreasure,
    visibleItems,
    hasFilters,
    activeFilterCount,
    filterOptions,
    filterContentProps,
    urlSync,
    savedFilters,
    analyticsHook,
    pagination,
    comparison,
    comparisonIds,
    favoriteIds,
    toggleFavorite,
    isFavorite,
    favoritesCount,
    recentlyViewedItems,
    favoriteMappedItems,
    clearRecent,
    stats,
    priceMinMax,
    caratMinMax,
    certDialogOpen,
    setCertDialogOpen,
    selectedItem,
    setSelectedItem,
    handleCertClick,
    handleItemClick,
    handleSaveCertifications,
    renderCard,
    viewMode,
    setViewMode,
    showFavoritesOnly,
    setShowFavoritesOnly,
    filterSheetOpen,
    setFilterSheetOpen,
    handleScrollDirectionChange,
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
    setCategoriaFilter,
    setHeroCategoryFilter,
    setColeccionFilter,
    canAddToComparison,
    getViewCountRef,
    applySavedPreset,
  };
}
