import { useState, useMemo, useCallback, useRef } from 'react';
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
  Button,
  Badge,
  IconButton,
  SwipeableDrawer,
} from '@mui/material';
import {
  LayoutGrid,
  List,
  SearchX,
  Heart,
  X,
  Filter,
  Gem,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useInventory } from '../hooks/useInventory';
import { useInventoryFiltering, type StatusFilter, type TypeFilter, type SortOption } from '../hooks/useInventoryFiltering';
import { useFavorites } from '../hooks/useFavorites';
import { usePagination } from '../hooks/usePagination';
import { useBrowsingProgress } from '../hooks/useBrowsingProgress';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useComparison } from '../hooks/useComparison';
import { useSavedFilters } from '../hooks/useSavedFilters';
// TODO: Re-enable keyboard nav when adapted for virtualized grid (react-window)
// import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useInventoryAnalytics } from '../hooks/useInventoryAnalytics';
import { InventoryItem, TrustScoreBreakdown } from '../types';
import CertificationUpload from './CertificationUpload';
import { calculateTrustScore } from '../utils/trustScore';
import { formatCurrency, formatFullCurrency, getColorDot } from '../utils/formatting';
// Design System Tokens
import { emeraldCore, goldAccent, surfacesLight, surfacesDark, semanticColors } from '../design-system/tokens/colors';
// Inventory components
import { GridCard, ListRow, VirtualGrid, FilterContent, type FilterContentProps } from './inventory';
import ProgressBadge from './ProgressBadge';
import ComparisonBar from './ComparisonBar';
import ComparisonModal from './ComparisonModal';
import RecentlyViewedCarousel from './RecentlyViewedCarousel';
import SavedFiltersDropdown from './SavedFiltersDropdown';
// Keyboard shortcuts disabled - target devices are mobile (iPhone 12+, iPad)
// import KeyboardShortcutsHelp, { KeyboardShortcutsButton } from './KeyboardShortcutsHelp';

export default function InventoryBrowser() {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Parse URL query params for initial filters
  const initialFiltersFromUrl = useMemo(() => {
    const filters: Record<string, any> = {};

    const search = searchParams.get('search');
    if (search) filters.search = search;

    const type = searchParams.get('type');
    if (type === 'loose' || type === 'jewelry') filters.typeFilter = type;

    const quality = searchParams.get('quality');
    if (quality) filters.qualityFilter = quality;

    const city = searchParams.get('city');
    if (city === 'Cali' || city === 'Bogotá') filters.cityFilter = city;

    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    if (priceMin || priceMax) {
      filters.priceRange = [
        priceMin ? parseInt(priceMin, 10) : 0,
        priceMax ? parseInt(priceMax, 10) : Number.MAX_SAFE_INTEGER
      ];
    }

    const status = searchParams.get('status');
    if (status === 'all' || status === 'available' || status === 'sold') {
      filters.statusFilter = status;
    }

    const sort = searchParams.get('sort');
    if (sort) filters.sortBy = sort;

    const shape = searchParams.get('shape');
    if (shape) filters.shapeFilter = shape;

    const color = searchParams.get('color');
    if (color) filters.colorFilter = color;

    const coleccion = searchParams.get('coleccion');
    if (coleccion) filters.coleccionFilter = coleccion;

    return filters;
  }, [searchParams]);

  // Get inventory with media from hook
  const { inventory: inventoryData } = useInventory();

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
    setCityFilter,
    setColeccionFilter,
    clearFilters,
    hasFilters,
    sortedInventory,
    filteredStats,
    filterOptions,
  } = useInventoryFiltering({
    inventory: inventoryData,
    initialFilters: initialFiltersFromUrl,
  });

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Favorites hook
  const { isFavorite, toggleFavorite, favoritesCount } = useFavorites();

  // Pagination hook (24 items per page)
  const pagination = usePagination({
    totalItems: sortedInventory.length,
    itemsPerPage: 24,
  });

  // Browsing progress hook (gamification)
  const totalAvailable = useMemo(() =>
    inventoryData.filter(i => i.estado?.toUpperCase() === 'DISPONIBLE').length,
    [inventoryData]
  );
  const browsingProgress = useBrowsingProgress(totalAvailable);

  // Recently viewed hook
  const { addToRecent, recentItems, clearRecent } = useRecentlyViewed();

  // Comparison hook
  const comparison = useComparison();

  // Saved filters hook
  const savedFilters = useSavedFilters();

  // Analytics hook
  const analyticsHook = useInventoryAnalytics();

  // Search input ref for keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get visible items based on pagination
  const visibleInventory = useMemo(
    () => pagination.getVisibleItems(sortedInventory),
    [pagination, sortedInventory]
  );

  // Destructure filter values for convenience
  const { search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, sortBy, cantidadFilter, cityFilter, coleccionFilter } = filters;

  // Mobile detection
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // UI-only state (not part of filtering)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  // Keyboard shortcuts disabled - target devices are mobile
  // const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter by favorites if enabled
  const displayInventory = useMemo(() => {
    if (!showFavoritesOnly) return visibleInventory;
    return visibleInventory.filter(item => isFavorite(item.item));
  }, [visibleInventory, showFavoritesOnly, isFavorite]);

  // Compute trust scores for comparison (only for selected items)
  const trustScoresMap = useMemo(() => {
    const map = new Map<number, TrustScoreBreakdown>();
    comparison.selectedItems.forEach(item => {
      const score = calculateTrustScore(item);
      map.set(item.item, score);
    });
    return map;
  }, [comparison.selectedItems]);

  // Map recent item IDs to actual inventory items
  const recentlyViewedItems = useMemo(() => {
    const itemMap = new Map(inventoryData.map(item => [item.item, item]));
    return recentItems
      .map(id => itemMap.get(id))
      .filter((item): item is InventoryItem => item !== undefined);
  }, [inventoryData, recentItems]);

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
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Stats for header - calculated from actual inventory data (not static)
  const stats = useMemo(() => {
    const available = inventoryData.filter(i => i.estado?.toUpperCase() === 'DISPONIBLE');
    return {
      totalItems: available.length,
      looseStones: available.filter(i => !i.isJewelry).length,
      jewelry: available.filter(i => i.isJewelry).length,
    };
  }, [inventoryData]);

  // Filter options from hook for convenience
  const { colors, shapes, qualities, colecciones, priceMinMax } = filterOptions;

  // Calculate trust scores for all items (memoized)
  const itemTrustScores = useMemo(() => {
    const scores = new Map<number, TrustScoreBreakdown>();
    inventoryData.forEach(item => {
      scores.set(item.item, calculateTrustScore(item));
    });
    return scores;
  }, [inventoryData]);

  // Handle opening certification dialog
  const handleCertClick = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setCertDialogOpen(true);
  }, []);

  const handleProductClick = useCallback((item: InventoryItem) => {
    // Track browsing progress
    browsingProgress.markViewed(item.item);
    // Add to recently viewed
    addToRecent(item.item);
    // Track analytics
    analyticsHook.trackItemView(item.item, item.nombre);
    // Navigate to product detail
    navigate(`/product/${item.item}`);
  }, [navigate, browsingProgress, addToRecent, analyticsHook]);

  // Handle saving certifications
  const handleSaveCertifications = useCallback((certifications: InventoryItem['certifications']) => {
    if (selectedItem) {
      // In a real app, this would update the database
      // For now, we'll just update the local state
      console.log('Saving certifications for item:', selectedItem.item, certifications);
      // TODO: Persist to localStorage or API
    }
    setCertDialogOpen(false);
    setSelectedItem(null);
  }, [selectedItem]);

  // Note: filteredInventory, sortedInventory, filteredStats, clearFilters, hasFilters
  // are now provided by useInventoryFiltering hook

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (colorFilter !== 'all') count++;
    if (qualityFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'available') count++;
    if (shapeFilter !== 'all') count++;
    if (cantidadFilter !== 'all') count++;
    if (coleccionFilter !== 'all') count++;
    if (priceRange[0] !== priceMinMax.min || priceRange[1] !== priceMinMax.max) count++;
    return count;
  }, [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, cantidadFilter, coleccionFilter, priceRange, priceMinMax]);

  // Props for the memoized FilterContent component
  const filterContentProps: FilterContentProps = {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    typeFilter,
    setTypeFilter,
    cantidadFilter,
    setCantidadFilter,
    colorFilter,
    setColorFilter,
    shapeFilter,
    setShapeFilter,
    qualityFilter,
    setQualityFilter,
    coleccionFilter,
    setColeccionFilter,
    priceRange,
    setPriceRange,
    showAdvancedFilters,
    setShowAdvancedFilters,
    hasFilters,
    handleClearFilters,
    searchInputRef,
    sortedInventory,
    analyticsHook,
    colors,
    shapes,
    qualities,
    colecciones,
    priceMinMax,
    isLight,
    theme,
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 0 } }}>
      {/* Mobile: Compact header with quick filters */}
      {isMobile ? (
        <>
          {/* Quick Stats + Filter Button Row */}
          <Box
            sx={{
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            {/* Stats chips */}
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

            {/* Filter button with badge */}
            <Badge
              badgeContent={activeFilterCount}
              color="primary"
              invisible={activeFilterCount === 0}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: emeraldCore.primary,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.6rem',
                  minWidth: 16,
                  height: 16,
                },
              }}
            >
              <Button
                size="small"
                variant="outlined"
                onClick={() => setMobileFiltersOpen(true)}
                startIcon={<Filter size={16} />}
                sx={{
                  borderColor: activeFilterCount > 0 ? emeraldCore.primary : isLight ? surfacesLight.border.default : surfacesDark.border.default,
                  color: activeFilterCount > 0 ? emeraldCore.primary : theme.palette.text.secondary,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: 2,
                  px: 1.5,
                }}
              >
                Filtros
              </Button>
            </Badge>
          </Box>

          {/* Horizontal Quick Filter Chips */}
          <Box
            sx={{
              mb: 1.5,
              mx: -2,
              px: 2,
              overflowX: 'auto',
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, pb: 0.5 }}>
              {/* Type quick filters */}
              <Chip
                size="small"
                icon={<Gem size={14} />}
                label="Gemas"
                onClick={() => setTypeFilter(typeFilter === 'loose' ? 'all' : 'loose')}
                sx={{
                  bgcolor: typeFilter === 'loose' ? emeraldCore.primary : 'transparent',
                  color: typeFilter === 'loose' ? 'white' : theme.palette.text.secondary,
                  border: '1px solid',
                  borderColor: typeFilter === 'loose' ? emeraldCore.primary : isLight ? surfacesLight.border.default : surfacesDark.border.default,
                  fontWeight: 500,
                  flexShrink: 0,
                  '& .MuiChip-icon': { color: typeFilter === 'loose' ? 'white' : emeraldCore.primary },
                }}
              />
              <Chip
                size="small"
                icon={<Crown size={14} />}
                label="Joyería"
                onClick={() => setTypeFilter(typeFilter === 'jewelry' ? 'all' : 'jewelry')}
                sx={{
                  bgcolor: typeFilter === 'jewelry' ? goldAccent.primary : 'transparent',
                  color: typeFilter === 'jewelry' ? 'white' : theme.palette.text.secondary,
                  border: '1px solid',
                  borderColor: typeFilter === 'jewelry' ? goldAccent.primary : isLight ? surfacesLight.border.default : surfacesDark.border.default,
                  fontWeight: 500,
                  flexShrink: 0,
                  '& .MuiChip-icon': { color: typeFilter === 'jewelry' ? 'white' : goldAccent.dark },
                }}
              />
              <Chip
                size="small"
                icon={<Sparkles size={14} />}
                label="Premium"
                onClick={() => setQualityFilter(qualityFilter === 'PREMIUM' ? 'all' : 'PREMIUM')}
                sx={{
                  bgcolor: qualityFilter === 'PREMIUM' ? goldAccent.primary : 'transparent',
                  color: qualityFilter === 'PREMIUM' ? 'white' : theme.palette.text.secondary,
                  border: '1px solid',
                  borderColor: qualityFilter === 'PREMIUM' ? goldAccent.primary : isLight ? surfacesLight.border.default : surfacesDark.border.default,
                  fontWeight: 500,
                  flexShrink: 0,
                  '& .MuiChip-icon': { color: qualityFilter === 'PREMIUM' ? 'white' : goldAccent.dark },
                }}
              />
              {/* City filters */}
              <Chip
                size="small"
                label="Cali"
                onClick={() => setCityFilter(cityFilter === 'Cali' ? 'all' : 'Cali')}
                sx={{
                  bgcolor: cityFilter === 'Cali' ? emeraldCore.primary : 'transparent',
                  color: cityFilter === 'Cali' ? 'white' : theme.palette.text.secondary,
                  border: '1px solid',
                  borderColor: cityFilter === 'Cali' ? emeraldCore.primary : isLight ? surfacesLight.border.default : surfacesDark.border.default,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              />
              <Chip
                size="small"
                label="Bogotá"
                onClick={() => setCityFilter(cityFilter === 'Bogotá' ? 'all' : 'Bogotá')}
                sx={{
                  bgcolor: cityFilter === 'Bogotá' ? '#2563eb' : 'transparent',
                  color: cityFilter === 'Bogotá' ? 'white' : theme.palette.text.secondary,
                  border: '1px solid',
                  borderColor: cityFilter === 'Bogotá' ? '#2563eb' : isLight ? surfacesLight.border.default : surfacesDark.border.default,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              />
              {/* Favorites chip */}
              <Chip
                size="small"
                icon={<Heart size={14} fill={showFavoritesOnly ? '#ef4444' : 'none'} />}
                label={`(${favoritesCount})`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                sx={{
                  bgcolor: showFavoritesOnly ? alpha('#ef4444', 0.1) : 'transparent',
                  color: showFavoritesOnly ? '#ef4444' : theme.palette.text.secondary,
                  border: '1px solid',
                  borderColor: showFavoritesOnly ? '#ef4444' : isLight ? surfacesLight.border.default : surfacesDark.border.default,
                  fontWeight: 500,
                  flexShrink: 0,
                  '& .MuiChip-icon': { color: showFavoritesOnly ? '#ef4444' : '#6b7280' },
                }}
              />
              {/* Clear all if filters active */}
              {hasFilters && (
                <Chip
                  size="small"
                  icon={<X size={14} />}
                  label="Limpiar"
                  onClick={handleClearFilters}
                  sx={{
                    bgcolor: alpha(semanticColors.error.main, 0.1),
                    color: semanticColors.error.main,
                    fontWeight: 600,
                    flexShrink: 0,
                    '& .MuiChip-icon': { color: semanticColors.error.main },
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Mobile Filter Drawer */}
          <SwipeableDrawer
            anchor="bottom"
            open={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            onOpen={() => setMobileFiltersOpen(true)}
            disableSwipeToOpen
            PaperProps={{
              sx: {
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: '85vh',
                bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
              },
            }}
          >
            <Box sx={{ p: 2 }}>
              {/* Drawer handle */}
              <Box
                sx={{
                  width: 40,
                  height: 4,
                  bgcolor: isLight ? surfacesLight.border.default : surfacesDark.border.default,
                  borderRadius: 2,
                  mx: 'auto',
                  mb: 2,
                }}
              />
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Filtros
                </Typography>
                <IconButton size="small" onClick={() => setMobileFiltersOpen(false)}>
                  <X size={20} />
                </IconButton>
              </Box>
              {/* Filter content */}
              <FilterContent {...filterContentProps} />
              {/* Apply button */}
              <Button
                fullWidth
                variant="contained"
                onClick={() => setMobileFiltersOpen(false)}
                sx={{
                  mt: 3,
                  bgcolor: emeraldCore.primary,
                  '&:hover': { bgcolor: emeraldCore.dark },
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: 2,
                }}
              >
                Ver {sortedInventory.length} resultados
              </Button>
            </Box>
          </SwipeableDrawer>
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
              {/* Compact Progress Badge */}
              <ProgressBadge
                level={browsingProgress.level}
                percentageExplored={browsingProgress.percentageExplored}
                viewedCount={browsingProgress.viewedCount}
                totalItems={totalAvailable}
                levelProgress={browsingProgress.levelProgress}
                nextLevel={browsingProgress.nextLevel}
                compact
              />
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

      {/* Active Filter Chips - Individual removal */}
      {hasFilters && (
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

      {/* Results info - Compact */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {sortedInventory.length === inventoryData.length ? (
              <>
                <strong style={{ color: theme.palette.text.primary }}>{inventoryData.length}</strong> esmeraldas en total
              </>
            ) : (
              <>
                Mostrando <strong style={{ color: theme.palette.text.primary }}>{displayInventory.length}</strong> de {sortedInventory.length} esmeraldas
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

      {/* Recently Viewed Carousel */}
      {recentlyViewedItems.length > 0 && (
        <RecentlyViewedCarousel
          items={recentlyViewedItems}
          onItemClick={handleProductClick}
          onClear={clearRecent}
        />
      )}

      {/* Inventory Grid/List */}
      {viewMode === 'grid' ? (
        <VirtualGrid
          items={showFavoritesOnly ? displayInventory : sortedInventory}
          trustScores={itemTrustScores}
          favorites={Array.from(itemTrustScores.keys()).filter(id => isFavorite(id))}
          onItemClick={handleProductClick}
          onCertClick={handleCertClick}
          onToggleFavorite={toggleFavorite}
          renderCard={(props) => (
            <GridCard
              item={props.item}
              trustScore={props.trustScore}
              isFavorite={props.isFavorite}
              onCertClick={props.onCertClick}
              onItemClick={props.onItemClick}
              onToggleFavorite={props.onToggleFavorite}
              isSelectedForComparison={comparison.isSelected(props.item.item)}
              onToggleComparison={() => comparison.toggleComparison(props.item)}
              canAddToComparison={comparison.canAddMore}
            />
          )}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {displayInventory.map((item) => (
            <ListRow
              key={item.item}
              item={item}
              trustScore={itemTrustScores.get(item.item) || calculateTrustScore(item)}
              isFavorite={isFavorite(item.item)}
              onCertClick={() => handleCertClick(item)}
              onItemClick={() => handleProductClick(item)}
              onToggleFavorite={() => toggleFavorite(item.item)}
              isSelectedForComparison={comparison.isSelected(item.item)}
              onToggleComparison={() => comparison.toggleComparison(item)}
              canAddToComparison={comparison.canAddMore}
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
              analyticsHook.trackLoadMore(pagination.visibleCount, sortedInventory.length);
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
            Cargar más ({sortedInventory.length - pagination.visibleCount} restantes)
          </Button>
        </Box>
      )}

      {/* Empty State - Enhanced with guidance */}
      {(displayInventory.length === 0 || (showFavoritesOnly && favoritesCount === 0)) && (
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

      {/* Comparison Bar - Sticky bottom bar */}
      <ComparisonBar
        selectedItems={comparison.selectedItems}
        onRemove={comparison.removeFromComparison}
        onClear={comparison.clearComparison}
        onCompare={comparison.openComparisonModal}
      />

      {/* Comparison Modal - Side-by-side comparison */}
      <ComparisonModal
        open={comparison.showComparisonModal}
        onClose={() => {
          comparison.closeComparisonModal();
          analyticsHook.trackComparisonOpen(comparison.selectedItems.map(i => i.item));
        }}
        items={comparison.selectedItems}
        trustScores={trustScoresMap}
      />

      {/* Keyboard Shortcuts Help Dialog - Disabled for mobile-first (iPhone 12+, iPad) */}
    </Box>
  );
}
