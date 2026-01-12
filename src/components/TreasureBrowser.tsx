import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import {
  LayoutGrid,
  List,
  Search,
  SearchX,
  Heart,
  X,
  Gem,
  Crown,
  SlidersHorizontal,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useTreasure } from '../hooks/useTreasure';
import { useTreasureFiltering, type StatusFilter, type TypeFilter, type SortOption } from '../hooks/useTreasureFiltering';
import { useGuestCanSeePrices } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { usePagination } from '../hooks/usePagination';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useSavedFilters } from '../hooks/useSavedFilters';
// TODO: Re-enable keyboard nav when adapted for virtualized grid (react-window)
// import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useTreasureAnalytics } from '../hooks/useTreasureAnalytics';
import { useTracking } from '../contexts/TrackingContext';
import { useProductViews } from '../hooks/useProductViews';
import { TreasureItem } from '../types';
import CertificationUpload from './CertificationUpload';
import { formatCurrency, formatFullCurrency, getColorDot } from '../utils/formatting';
import { createLogger } from '../utils/logger';
// Design System Tokens

const log = createLogger('Treasure');
import { emeraldCore, goldAccent, surfacesLight, surfacesDark, semanticColors } from '../design-system/tokens/colors';
// Treasure components
import { GridCard, ListRow, VirtualGrid, FilterContent, type FilterContentProps } from './treasure';
import RecentlyViewedCarousel from './RecentlyViewedCarousel';
import SavedFiltersDropdown from './SavedFiltersDropdown';
import IOSFilterSheet from './ios/IOSFilterSheet';
// Keyboard shortcuts disabled - target devices are mobile (iPhone 12+, iPad)
// import KeyboardShortcutsHelp, { KeyboardShortcutsButton } from './KeyboardShortcutsHelp';

export default function TreasureBrowser() {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { accessLevel } = useAuthContext();
  const isAdmin = accessLevel === 'admin';
  const isLight = mode === 'light';
  const navigate = useNavigate();
  // Note: We read URL params directly from window.location.search for reliable initial values
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_searchParams] = useSearchParams(); // Keep hook for React Router integration

  // Parse URL query params for initial filters - ONLY ON MOUNT
  // This prevents infinite loops where URL sync triggers re-parsing
  const initialFiltersFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return {};

    const filters: Record<string, any> = {};
    const urlParams = new URLSearchParams(window.location.search);

    const search = urlParams.get('search');
    if (search) filters.search = search;

    const type = urlParams.get('type');
    if (type === 'loose' || type === 'jewelry') filters.typeFilter = type;

    const quality = urlParams.get('quality');
    if (quality) filters.qualityFilter = quality;

    const city = urlParams.get('city');
    if (city === 'Cali' || city === 'Bogotá') filters.cityFilter = city;

    const priceMin = urlParams.get('priceMin');
    const priceMax = urlParams.get('priceMax');
    if (priceMin || priceMax) {
      filters.priceRange = [
        priceMin ? parseInt(priceMin, 10) : 0,
        priceMax ? parseInt(priceMax, 10) : Number.MAX_SAFE_INTEGER
      ];
    }

    const status = urlParams.get('status');
    if (status === 'all' || status === 'available' || status === 'sold') {
      filters.statusFilter = status;
    }

    const sort = urlParams.get('sort');
    if (sort) filters.sortBy = sort;

    const shape = urlParams.get('shape');
    if (shape) filters.shapeFilter = shape;

    const color = urlParams.get('color');
    if (color) filters.colorFilter = color;

    const coleccion = urlParams.get('coleccion');
    if (coleccion) filters.coleccionFilter = coleccion;

    return filters;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = only parse URL on mount, prevents infinite loop

  // Get treasure with media from hook
  const { treasure: treasureData } = useTreasure();

  // Filtering hook - handles all filter state and computed values
  const {
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
    // setCityFilter, // Reserved for future city filter feature
    setColeccionFilter,
    clearFilters,
    hasFilters,
    sortedTreasure,
    filteredStats,
    filterOptions,
  } = useTreasureFiltering({
    treasure: treasureData,
    initialFilters: initialFiltersFromUrl,
  });

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    clearFilters();
    // Clear URL params using history API directly
    window.history.replaceState(null, '', window.location.pathname);
  }, [clearFilters]);

  // Ref to track if this is initial mount (skip first sync)
  const isInitialMount = useRef(true);
  // Ref to track previous URL params string to avoid unnecessary updates
  const prevUrlParams = useRef('');

  // Sync filters to URL for persistence (using history API to avoid React Router loops)
  useEffect(() => {
    // Skip initial mount - URL already has params from navigation
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Initialize ref with current URL params
      prevUrlParams.current = window.location.search.slice(1);
      return;
    }

    const params = new URLSearchParams();

    // Only add non-default values to URL (default status is 'available')
    if (filters.search) params.set('search', filters.search);
    if (filters.typeFilter !== 'all') params.set('type', filters.typeFilter);
    if (filters.statusFilter !== 'available' && filters.statusFilter !== 'all') params.set('status', filters.statusFilter);
    if (filters.qualityFilter && filters.qualityFilter !== 'all') params.set('quality', filters.qualityFilter);
    if (filters.colorFilter && filters.colorFilter !== 'all') params.set('color', filters.colorFilter);
    if (filters.shapeFilter && filters.shapeFilter !== 'all') params.set('shape', filters.shapeFilter);
    if (filters.cityFilter !== 'all') params.set('city', filters.cityFilter);
    if (filters.coleccionFilter && filters.coleccionFilter !== 'all') params.set('coleccion', filters.coleccionFilter);
    if (filters.sortBy !== 'price-desc') params.set('sort', filters.sortBy);

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
  }, [filters]); // Only depend on filters - no React Router deps

  // Favorites hook
  const { isFavorite, toggleFavorite, favoritesCount } = useFavorites();

  // Pagination hook (24 items per page)
  const pagination = usePagination({
    totalItems: sortedTreasure.length,
    itemsPerPage: 24,
  });

  // Recently viewed hook
  const { addToRecent, recentItems, clearRecent } = useRecentlyViewed();

  // Saved filters hook
  const savedFilters = useSavedFilters();

  // Analytics hook
  const analyticsHook = useTreasureAnalytics();

  // Funnel tracking hook
  const { track, checkAchievements } = useTracking();

  // Guest pricing hook - determines if price filters should be hidden
  const guestCanSeePrices = useGuestCanSeePrices();

  // Product view counts for badges
  const { getViewCount } = useProductViews();

  // Track treasure view on mount
  useEffect(() => {
    track('treasure_view', {
      total_items: treasureData.length,
      view_mode: viewMode,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Search input ref for keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hide recently viewed carousel when scrolling down in grid
  const [hideRecentlyViewed, setHideRecentlyViewed] = useState(false);
  const handleScrollDirectionChange = useCallback((direction: 'up' | 'down') => {
    setHideRecentlyViewed(direction === 'down');
  }, []);

  // Get visible items based on pagination
  const visibleTreasure = useMemo(
    () => pagination.getVisibleItems(sortedTreasure),
    [pagination, sortedTreasure]
  );

  // Destructure filter values for convenience
  const { search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, sortBy, cantidadFilter, coleccionFilter } = filters;

  // Mobile detection
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // UI-only state (not part of filtering)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  // Keyboard shortcuts disabled - target devices are mobile
  // const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  // iOS filter sheet state (mobile only)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Filter by favorites if enabled
  const displayTreasure = useMemo(() => {
    if (!showFavoritesOnly) return visibleTreasure;
    return visibleTreasure.filter(item => isFavorite(item.item));
  }, [visibleTreasure, showFavoritesOnly, isFavorite]);

  // Map recent item IDs to actual treasure items
  const recentlyViewedItems = useMemo(() => {
    const itemMap = new Map(treasureData.map(item => [item.item, item]));
    return recentItems
      .map(id => itemMap.get(id))
      .filter((item): item is TreasureItem => item !== undefined);
  }, [treasureData, recentItems]);

  // TODO: Re-enable keyboard navigation when adapted for virtualized grid
  // Currently disabled because react-window only renders visible DOM items
  // const keyboardNav = useKeyboardNavigation({
  //   items: displayInventory,
  //   columns: gridColumns,
  //   onSelect: (item) => handleProductClick(item),
  //   onToggleFavorite: (itemId) => {
  //     toggleFavorite(itemId);
  //     analyticsHook.trackFavorite(itemId, !isFavorite(itemId));
  //   },
  //   onToggleComparison: (item) => {
  //     comparison.toggleComparison(item);
  //     if (comparison.isSelected(item.item)) {
  //       analyticsHook.trackCompareRemove(item.item);
  //     } else {
  //       analyticsHook.trackCompareAdd(item.item);
  //     }
  //   },
  //   onFocusSearch: () => searchInputRef.current?.focus(),
  //   enabled: viewMode === 'grid',
  // });

  // Certification dialog state
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TreasureItem | null>(null);

  // Stats for header - calculated from actual treasure data (not static)
  const stats = useMemo(() => {
    const available = treasureData.filter(i => i.estado?.toUpperCase() === 'DISPONIBLE');
    return {
      totalItems: available.length,
      looseStones: available.filter(i => !i.isJewelry).length,
      jewelry: available.filter(i => i.isJewelry).length,
    };
  }, [treasureData]);

  // Filter options from hook for convenience
  const { colors, shapes, qualities, colecciones, priceMinMax } = filterOptions;

  // Handle opening certification dialog
  const handleCertClick = useCallback((item: TreasureItem) => {
    setSelectedItem(item);
    setCertDialogOpen(true);
  }, []);

  const handleProductClick = useCallback((item: TreasureItem, positionInList: number = 0) => {
    // Add to recently viewed
    addToRecent(item.item);
    // Track analytics
    analyticsHook.trackItemView(item.item, item.nombre);

    // Track funnel event
    track('product_clicked', {
      item_id: item.item,
      item_name: item.nombre || 'Sin nombre',
      position_in_list: positionInList,
      filters_active: hasFilters,
      view_mode: viewMode,
    });

    // Navigate to product detail
    navigate(`/product/${item.item}`);
  }, [navigate, addToRecent, analyticsHook, track, hasFilters, viewMode]);

  // Handle saving certifications
  const handleSaveCertifications = useCallback((certifications: TreasureItem['certifications']) => {
    if (selectedItem) {
      // In a real app, this would update the database
      // For now, we'll just update the local state
      log.info('Saving certifications for item:', selectedItem.item, certifications);
      // TODO: Persist to localStorage or API
    }
    setCertDialogOpen(false);
    setSelectedItem(null);
  }, [selectedItem]);

  // Note: filteredTreasure, sortedTreasure, filteredStats, clearFilters, hasFilters
  // are now provided by useTreasureFiltering hook

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.colorFilter !== 'all') count++;
    if (filters.qualityFilter !== 'all') count++;
    if (filters.typeFilter !== 'all') count++;
    if (filters.statusFilter !== 'available') count++;
    if (filters.shapeFilter !== 'all') count++;
    if (filters.cantidadFilter !== 'all') count++;
    if (filters.coleccionFilter !== 'all') count++;
    if (filters.priceRange[0] !== priceMinMax.min || filters.priceRange[1] !== priceMinMax.max) count++;
    return count;
  }, [filters, priceMinMax]);

  // Previous filters for comparison (to detect changes)
  const prevFiltersRef = useRef(filters);

  // Track filter changes
  useEffect(() => {
    const prev = prevFiltersRef.current;

    // Detect which filter changed
    if (prev.colorFilter !== filters.colorFilter && filters.colorFilter !== 'all') {
      track('treasure_filter_applied', {
        filter_type: 'color',
        filter_value: filters.colorFilter,
        filters_count: activeFilterCount,
        results_count: sortedTreasure.length,
      });
    }
    if (prev.qualityFilter !== filters.qualityFilter && filters.qualityFilter !== 'all') {
      track('treasure_filter_applied', {
        filter_type: 'quality',
        filter_value: filters.qualityFilter,
        filters_count: activeFilterCount,
        results_count: sortedTreasure.length,
      });
    }
    if (prev.shapeFilter !== filters.shapeFilter && filters.shapeFilter !== 'all') {
      track('treasure_filter_applied', {
        filter_type: 'shape',
        filter_value: filters.shapeFilter,
        filters_count: activeFilterCount,
        results_count: sortedTreasure.length,
      });
    }
    if (prev.typeFilter !== filters.typeFilter && filters.typeFilter !== 'all') {
      track('treasure_filter_applied', {
        filter_type: 'type',
        filter_value: filters.typeFilter,
        filters_count: activeFilterCount,
        results_count: sortedTreasure.length,
      });
    }
    if (prev.coleccionFilter !== filters.coleccionFilter && filters.coleccionFilter !== 'all') {
      track('treasure_filter_applied', {
        filter_type: 'coleccion',
        filter_value: filters.coleccionFilter,
        filters_count: activeFilterCount,
        results_count: sortedTreasure.length,
      });
    }
    if (prev.cantidadFilter !== filters.cantidadFilter && filters.cantidadFilter !== 'all') {
      track('treasure_filter_applied', {
        filter_type: 'cantidad',
        filter_value: filters.cantidadFilter,
        filters_count: activeFilterCount,
        results_count: sortedTreasure.length,
      });
    }
    // Track price range changes (skip initial sync)
    if (
      JSON.stringify(prev.priceRange) !== JSON.stringify(filters.priceRange) &&
      filters.priceRange[0] !== priceMinMax.min
    ) {
      track('treasure_filter_applied', {
        filter_type: 'price',
        filter_value: `${filters.priceRange[0]}-${filters.priceRange[1]}`,
        filters_count: activeFilterCount,
        results_count: sortedTreasure.length,
      });
    }

    // Check for achievements after filter changes
    checkAchievements();

    prevFiltersRef.current = filters;
  }, [filters, track, activeFilterCount, sortedTreasure.length, checkAchievements, priceMinMax.min]);

  // Props for the memoized FilterContent component
  const filterContentProps: FilterContentProps = {
    // Filter values
    search,
    statusFilter,
    sortBy: filters.sortBy,
    typeFilter,
    cantidadFilter,
    colorFilter,
    shapeFilter,
    qualityFilter,
    coleccionFilter,
    priceRange,
    // Setters
    setSearch,
    setStatusFilter,
    setSortBy,
    setTypeFilter,
    setCantidadFilter,
    setColorFilter,
    setShapeFilter,
    setQualityFilter,
    setColeccionFilter,
    setPriceRange,
    // UI state
    showAdvancedFilters,
    setShowAdvancedFilters,
    // Actions
    hasFilters,
    handleClearFilters,
    // Data
    searchInputRef,
    sortedTreasure,
    analyticsHook,
    // Filter options
    colors,
    shapes,
    qualities,
    colecciones,
    priceMinMax,
    // Theme
    isLight,
    theme,
    // Guest pricing - hide price filter for guests who can't see prices
    hidePriceFilter: !guestCanSeePrices,
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 2, md: 0 } }}>
      {/* Mobile: Compact filter bar + inline filter panel */}
      {isMobile ? (
        <>
          {/* Search Bar Row - Sticky on mobile so it's always visible when scrolling grid */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mb: 1,
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
              py: 1,
              mx: -1,
              px: 1,
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar esmeraldas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color={theme.palette.text.secondary} />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  height: 44,
                  bgcolor: isLight
                    ? surfacesLight.background.primary
                    : surfacesDark.background.secondary,
                  '& fieldset': {
                    borderColor: isLight
                      ? surfacesLight.border.light
                      : surfacesDark.border.light,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: emeraldCore.primary,
                  },
                },
              }}
            />
            {/* Filter toggle button with badge */}
            <IconButton
              onClick={() => setFilterSheetOpen(!filterSheetOpen)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                bgcolor: filterSheetOpen || hasFilters
                  ? alpha(emeraldCore.primary, 0.15)
                  : isLight
                    ? surfacesLight.background.secondary
                    : surfacesDark.background.tertiary,
                border: '1px solid',
                borderColor: filterSheetOpen || hasFilters
                  ? emeraldCore.primary
                  : isLight
                    ? surfacesLight.border.light
                    : surfacesDark.border.light,
                position: 'relative',
              }}
            >
              <SlidersHorizontal
                size={20}
                color={filterSheetOpen || hasFilters ? emeraldCore.primary : theme.palette.text.secondary}
              />
              {activeFilterCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: emeraldCore.primary,
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {activeFilterCount}
                </Box>
              )}
            </IconButton>
          </Box>

          {/* Inline Filter Panel (below search bar) */}
          <IOSFilterSheet
            open={filterSheetOpen}
            onClose={() => setFilterSheetOpen(false)}
            statusFilter={statusFilter}
            sortBy={sortBy}
            typeFilter={typeFilter}
            colorFilter={colorFilter}
            shapeFilter={shapeFilter}
            qualityFilter={qualityFilter}
            priceRange={priceRange}
            cantidadFilter={cantidadFilter}
            setStatusFilter={setStatusFilter}
            setSortBy={setSortBy}
            setTypeFilter={setTypeFilter}
            setColorFilter={setColorFilter}
            setShapeFilter={setShapeFilter}
            setQualityFilter={setQualityFilter}
            setPriceRange={setPriceRange}
            setCantidadFilter={setCantidadFilter}
            colors={colors}
            shapes={shapes}
            qualities={qualities}
            priceMinMax={priceMinMax}
            hasFilters={hasFilters}
            onClearFilters={handleClearFilters}
            hidePriceFilter={!guestCanSeePrices}
          />

          {/* Quick info row with active filters - only show when filters are closed */}
          {!filterSheetOpen && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
              {/* Favorites toggle */}
              <Box
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '16px',
                  bgcolor: showFavoritesOnly
                    ? alpha('#ef4444', 0.15)
                    : isLight
                      ? surfacesLight.background.secondary
                      : surfacesDark.background.tertiary,
                  border: showFavoritesOnly ? '1px solid #ef4444' : 'none',
                  flexShrink: 0,
                }}
              >
                <Heart
                  size={14}
                  fill={showFavoritesOnly ? '#ef4444' : 'none'}
                  color={showFavoritesOnly ? '#ef4444' : theme.palette.text.secondary}
                />
                <Typography
                  sx={{
                    color: showFavoritesOnly ? '#ef4444' : theme.palette.text.secondary,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                >
                  {favoritesCount}
                </Typography>
              </Box>

              {/* Active filter chips - inline */}
              {(priceRange[0] !== priceMinMax.min || priceRange[1] !== priceMinMax.max) && (
                <Chip
                  label={`${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`}
                  size="small"
                  onDelete={() => setPriceRange([priceMinMax.min, priceMinMax.max])}
                  deleteIcon={<X size={12} />}
                  sx={{
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.dark,
                    height: 24,
                    '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
                    '& .MuiChip-label': { px: 1, fontSize: '0.7rem' },
                  }}
                />
              )}
              {colorFilter !== 'all' && (
                <Chip
                  icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getColorDot(colorFilter), ml: 0.5 }} />}
                  label={colorFilter.replace('Verde ', '')}
                  size="small"
                  onDelete={() => setColorFilter('all')}
                  deleteIcon={<X size={12} />}
                  sx={{
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.dark,
                    height: 24,
                    '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
                    '& .MuiChip-label': { px: 1, fontSize: '0.7rem' },
                  }}
                />
              )}
              {qualityFilter !== 'all' && (
                <Chip
                  label={qualityFilter}
                  size="small"
                  onDelete={() => setQualityFilter('all')}
                  deleteIcon={<X size={12} />}
                  sx={{
                    bgcolor: alpha(goldAccent.primary, 0.15),
                    color: goldAccent.dark,
                    height: 24,
                    '& .MuiChip-deleteIcon': { color: goldAccent.dark },
                    '& .MuiChip-label': { px: 1, fontSize: '0.7rem' },
                  }}
                />
              )}
              {typeFilter !== 'all' && (
                <Chip
                  label={typeFilter === 'loose' ? 'Gemas' : 'Joyería'}
                  size="small"
                  onDelete={() => setTypeFilter('all')}
                  deleteIcon={<X size={12} />}
                  sx={{
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.dark,
                    height: 24,
                    '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
                    '& .MuiChip-label': { px: 1, fontSize: '0.7rem' },
                  }}
                />
              )}
              {shapeFilter !== 'all' && (
                <Chip
                  label={shapeFilter}
                  size="small"
                  onDelete={() => setShapeFilter('all')}
                  deleteIcon={<X size={12} />}
                  sx={{
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.dark,
                    height: 24,
                    '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
                    '& .MuiChip-label': { px: 1, fontSize: '0.7rem' },
                  }}
                />
              )}
              {cantidadFilter !== 'all' && (
                <Chip
                  label={cantidadFilter === '2+' ? 'Lotes' : cantidadFilter}
                  size="small"
                  onDelete={() => setCantidadFilter('all')}
                  deleteIcon={<X size={12} />}
                  sx={{
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.dark,
                    height: 24,
                    '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
                    '& .MuiChip-label': { px: 1, fontSize: '0.7rem' },
                  }}
                />
              )}

              {/* Stats - pushed to the right */}
              <Typography
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.75rem',
                  ml: 'auto',
                  flexShrink: 0,
                }}
              >
                {sortedTreasure.length} items
              </Typography>
            </Box>
          )}
        </>
      ) : (
        <>
          {/* Desktop: Full filters */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 1.5,
              borderRadius: 2,
              bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
              border: '1px solid',
              borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
            }}
          >
            <FilterContent {...filterContentProps} />
            {/* View toggle, stats and keyboard shortcuts - Desktop only */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default }}>
              {/* Compact Stats */}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Chip
                  size="small"
                  icon={<Gem size={12} />}
                  label={stats.looseStones}
                  sx={{
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.primary,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 24,
                    '& .MuiChip-icon': { color: emeraldCore.primary },
                  }}
                />
                <Chip
                  size="small"
                  icon={<Crown size={12} />}
                  label={stats.jewelry}
                  sx={{
                    bgcolor: alpha(goldAccent.primary, 0.15),
                    color: goldAccent.dark,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 24,
                    '& .MuiChip-icon': { color: goldAccent.dark },
                  }}
                />
              </Box>
              <SavedFiltersDropdown
                presets={savedFilters.presets}
                onSavePreset={(name) => savedFilters.savePreset(name, {
                  search,
                  colorFilter,
                  qualityFilter,
                  typeFilter,
                  statusFilter,
                  shapeFilter,
                  priceRange,
                  sortBy,
                  cantidadFilter,
                })}
                onApplyPreset={(preset) => {
                  setSearch(preset.filters.search);
                  setColorFilter(preset.filters.colorFilter);
                  setQualityFilter(preset.filters.qualityFilter);
                  setTypeFilter(preset.filters.typeFilter as TypeFilter);
                  setStatusFilter(preset.filters.statusFilter as StatusFilter);
                  setShapeFilter(preset.filters.shapeFilter);
                  setPriceRange(preset.filters.priceRange);
                  setSortBy(preset.filters.sortBy as SortOption);
                  if (preset.filters.cantidadFilter) {
                    setCantidadFilter(preset.filters.cantidadFilter);
                  }
                }}
                onDeletePreset={savedFilters.deletePreset}
                hasActiveFilters={hasFilters}
              />
              <Box sx={{ flex: 1 }} />
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, value) => {
                  if (value) {
                    setViewMode(value);
                    analyticsHook.trackViewModeChange(value);
                  }
                }}
                size="small"
              >
                <ToggleButton value="grid" sx={{ px: 1.5 }}>
                  <LayoutGrid size={18} />
                </ToggleButton>
                <ToggleButton value="list" sx={{ px: 1.5 }}>
                  <List size={18} />
                </ToggleButton>
              </ToggleButtonGroup>
              {/* Keyboard shortcuts hidden - target devices are mobile (iPhone 12+, iPad) */}
            </Box>
          </Paper>
        </>
      )}

      {/* Active Filter Chips - Individual removal (Desktop only, mobile shows inline above) */}
      {!isMobile && hasFilters && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {search && (
            <Chip
              label={`Búsqueda: "${search}"`}
              size="small"
              onDelete={() => setSearch('')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {colorFilter !== 'all' && (
            <Chip
              icon={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getColorDot(colorFilter), ml: 1 }} />}
              label={colorFilter.replace('Verde ', '')}
              size="small"
              onDelete={() => setColorFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {qualityFilter !== 'all' && (
            <Chip
              label={`Calidad: ${qualityFilter}`}
              size="small"
              onDelete={() => setQualityFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(goldAccent.primary, 0.15),
                color: goldAccent.dark,
                '& .MuiChip-deleteIcon': { color: goldAccent.dark },
              }}
            />
          )}
          {typeFilter !== 'all' && (
            <Chip
              label={typeFilter === 'loose' ? 'Gemas' : 'Joyería'}
              size="small"
              onDelete={() => setTypeFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {statusFilter !== 'available' && statusFilter !== 'all' && (
            <Chip
              label={statusFilter === 'sold' ? 'Vendidas' : 'Todas'}
              size="small"
              onDelete={() => setStatusFilter('available')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(semanticColors.error.main, 0.1),
                color: semanticColors.error.main,
                '& .MuiChip-deleteIcon': { color: semanticColors.error.main },
              }}
            />
          )}
          {shapeFilter !== 'all' && (
            <Chip
              label={`Talla: ${shapeFilter}`}
              size="small"
              onDelete={() => setShapeFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {cantidadFilter !== 'all' && (
            <Chip
              label={`Cantidad: ${cantidadFilter === '2+' ? 'Lotes' : cantidadFilter}`}
              size="small"
              onDelete={() => setCantidadFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {(priceRange[0] !== priceMinMax.min || priceRange[1] !== priceMinMax.max) && (
            <Chip
              label={`${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`}
              size="small"
              onDelete={() => setPriceRange([priceMinMax.min, priceMinMax.max])}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
        </Box>
      )}

      {/* Results info - Desktop only (mobile has elegant stats row above) */}
      {!isMobile && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {sortedTreasure.length === treasureData.length ? (
                <>
                  <strong style={{ color: theme.palette.text.primary }}>{treasureData.length}</strong> esmeraldas en total
                </>
              ) : (
                <>
                  Mostrando <strong style={{ color: theme.palette.text.primary }}>{displayTreasure.length}</strong> de {sortedTreasure.length} esmeraldas
                </>
              )}
            </Typography>
            {/* Favorites toggle */}
            <Chip
              icon={<Heart size={14} fill={showFavoritesOnly ? '#ef4444' : 'none'} color={showFavoritesOnly ? '#ef4444' : '#6b7280'} />}
              label={`Favoritos (${favoritesCount})`}
              size="small"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              sx={{
                cursor: 'pointer',
                bgcolor: showFavoritesOnly ? alpha('#ef4444', 0.1) : 'transparent',
                color: showFavoritesOnly ? '#ef4444' : theme.palette.text.secondary,
                border: '1px solid',
                borderColor: showFavoritesOnly ? '#ef4444' : isLight ? surfacesLight.border.light : surfacesDark.border.default,
                fontWeight: showFavoritesOnly ? 600 : 400,
                '&:hover': {
                  bgcolor: alpha('#ef4444', 0.1),
                },
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
            {formatFullCurrency(filteredStats.totalValue)} total
          </Typography>
        </Box>
      )}

      {/* Recently Viewed Carousel - Hidden when scrolling down in grid */}
      {recentlyViewedItems.length > 0 && !hideRecentlyViewed && (
        <RecentlyViewedCarousel
          items={recentlyViewedItems}
          onItemClick={handleProductClick}
          onClear={clearRecent}
        />
      )}

      {/* Treasure Grid/List */}
      {viewMode === 'grid' ? (
        <VirtualGrid
          items={showFavoritesOnly ? displayTreasure : sortedTreasure}
          favorites={treasureData.map(i => i.item).filter(id => isFavorite(id))}
          onItemClick={handleProductClick}
          onCertClick={handleCertClick}
          onToggleFavorite={toggleFavorite}
          onScrollDirectionChange={handleScrollDirectionChange}
          renderCard={(props) => (
            <GridCard
              item={props.item}
              onItemClick={props.onItemClick}
              isMobile={props.isMobile}
              viewCount={getViewCount(props.item.item)}
              isAdmin={isAdmin}
            />
          )}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {displayTreasure.map((item) => (
            <ListRow
              key={item.item}
              item={item}
              isFavorite={isFavorite(item.item)}
              onCertClick={() => handleCertClick(item)}
              onItemClick={() => handleProductClick(item)}
              onToggleFavorite={() => toggleFavorite(item.item)}
            />
          ))}
        </Box>
      )}

      {/* Load More Button - Only for list view (grid uses virtualization) */}
      {viewMode === 'list' && pagination.hasMore && !showFavoritesOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              pagination.loadMore();
              analyticsHook.trackLoadMore(pagination.visibleCount, sortedTreasure.length);
            }}
            sx={{
              borderColor: emeraldCore.primary,
              color: emeraldCore.primary,
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              '&:hover': {
                bgcolor: alpha(emeraldCore.primary, 0.08),
                borderColor: emeraldCore.dark,
              },
            }}
          >
            Cargar más ({sortedTreasure.length - pagination.visibleCount} restantes)
          </Button>
        </Box>
      )}

      {/* Empty State - Enhanced with guidance */}
      {(displayTreasure.length === 0 || (showFavoritesOnly && favoritesCount === 0)) && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 4,
            border: '2px dashed',
            borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
            textAlign: 'center',
            bgcolor: isLight ? alpha(surfacesLight.background.secondary, 0.5) : alpha(surfacesDark.background.secondary, 0.5),
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <SearchX size={32} color={isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.5 }}>
            Sin resultados
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2, maxWidth: 300, mx: 'auto' }}>
            No encontramos esmeraldas con los filtros seleccionados. Prueba ajustando los criterios de búsqueda.
          </Typography>
          {hasFilters && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearFilters}
              sx={{
                borderColor: emeraldCore.primary,
                color: emeraldCore.primary,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: alpha(emeraldCore.primary, 0.08),
                  borderColor: emeraldCore.dark,
                },
              }}
            >
              Limpiar {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''}
            </Button>
          )}
        </Paper>
      )}

      {/* Certification Upload Dialog */}
      {selectedItem && (
        <CertificationUpload
          open={certDialogOpen}
          onClose={() => {
            setCertDialogOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onSave={handleSaveCertifications}
        />
      )}

      {/* Keyboard Shortcuts Help Dialog - Disabled for mobile-first (iPhone 12+, iPad) */}
    </Box>
  );
}
