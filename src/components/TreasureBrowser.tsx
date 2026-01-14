/**
 * TreasureBrowser Component
 *
 * Main treasure browsing interface with filtering, sorting, and grid/list views.
 * Refactored to extract URL sync, filter tracking, and active chips into hooks/components.
 */
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
import { useUrlFilterSync } from '../hooks/useUrlFilterSync';
import { useFilterTracking } from '../hooks/useFilterTracking';
import { useGuestCanSeePrices } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { usePagination } from '../hooks/usePagination';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useSavedFilters } from '../hooks/useSavedFilters';
import { useTreasureAnalytics } from '../hooks/useTreasureAnalytics';
import { useTracking } from '../contexts/TrackingContext';
import { useProductViews } from '../hooks/useProductViews';
import { useComparison } from '../hooks/useComparison';
import { TreasureItem } from '../types';
import CertificationUpload from './CertificationUpload';
import ComparisonBar from './ComparisonBar';
import ComparisonModal from './ComparisonModal';
import { formatFullCurrency } from '../utils/formatting';
import { createLogger } from '../utils/logger';
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../design-system/tokens/colors';
import { GridCard, ListRow, VirtualGrid, FilterContent, ActiveFilterChips, type FilterContentProps } from './treasure';
import RecentlyViewedCarousel from './RecentlyViewedCarousel';
import SavedFiltersDropdown from './SavedFiltersDropdown';
import IOSFilterSheet from './ios/IOSFilterSheet';

const log = createLogger('Treasure');

export interface TreasureBrowserProps {
  /** Provider mode - restricts features: hides prices, share, contact, cart, comparison */
  isProviderMode?: boolean;
  /** Default view mode (defaults to 'grid', provider mode defaults to 'list') */
  defaultViewMode?: 'grid' | 'list';
}

export default function TreasureBrowser({
  isProviderMode = false,
  defaultViewMode,
}: TreasureBrowserProps = {}) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { accessLevel } = useAuthContext();
  const isAdmin = accessLevel === 'admin';
  const isLight = mode === 'light';
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_searchParams] = useSearchParams();

  // Get treasure data from hook
  const { treasure: allTreasure } = useTreasure();

  // URL sync hook - provides initial filters from URL
  const { initialFilters } = useUrlFilterSync({
    filters: { search: '', colorFilter: 'all', qualityFilter: 'all', typeFilter: 'all', statusFilter: 'available', shapeFilter: 'all', priceRange: [0, Number.MAX_SAFE_INTEGER], sortBy: 'price-desc', cantidadFilter: 'all', cityFilter: 'all', coleccionFilter: 'all' },
    priceMinMax: { min: 0, max: 100000000 },
    clearFilters: () => {},
  });

  // Filtering hook - handles all filter state and computed values
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
    setSortBy,
    setCantidadFilter,
    setColeccionFilter,
    clearFilters,
    hasFilters,
    sortedTreasure: filteredTreasure,
    filteredStats,
    filterOptions,
  } = filteringResult;

  // Re-initialize URL sync with actual filter values
  const urlSync = useUrlFilterSync({
    filters,
    priceMinMax: filterOptions.priceMinMax,
    clearFilters,
  });

  // Funnel tracking hook
  const { track, checkAchievements } = useTracking();

  // Filter tracking hook - handles analytics and active filter count
  const { activeFilterCount } = useFilterTracking({
    filters,
    priceMinMax: filterOptions.priceMinMax,
    resultsCount: filteredTreasure.length,
    track,
    checkAchievements,
  });

  // Favorites hook
  const { isFavorite, toggleFavorite, favoritesCount } = useFavorites();

  // Pagination hook (24 items per page)
  const pagination = usePagination({
    totalItems: filteredTreasure.length,
    itemsPerPage: 24,
  });

  // Recently viewed hook
  const { addToRecent, recentItems, clearRecent } = useRecentlyViewed();

  // Saved filters hook
  const savedFilters = useSavedFilters();

  // Analytics hook
  const analyticsHook = useTreasureAnalytics();

  // Guest pricing hook
  const guestCanSeePrices = useGuestCanSeePrices();

  // Product view counts for badges
  const { getViewCount } = useProductViews();

  // Comparison hook
  const comparison = useComparison();

  // Track treasure view on mount
  useEffect(() => {
    track('treasure_view', {
      total_items: allTreasure.length,
      view_mode: viewMode,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Search input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // UI state - provider mode defaults to list view
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    defaultViewMode ?? (isProviderMode ? 'list' : 'grid')
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [hideRecentlyViewed, setHideRecentlyViewed] = useState(false);

  const handleScrollDirectionChange = useCallback((direction: 'up' | 'down') => {
    setHideRecentlyViewed(direction === 'down');
  }, []);

  // Get visible items based on pagination
  const paginatedItems = useMemo(
    () => pagination.getVisibleItems(filteredTreasure),
    [pagination, filteredTreasure]
  );

  // Mobile detection
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter by favorites if enabled
  const visibleItems = useMemo(() => {
    if (!showFavoritesOnly) return paginatedItems;
    return paginatedItems.filter(item => isFavorite(item.item));
  }, [paginatedItems, showFavoritesOnly, isFavorite]);

  // Map recent item IDs to actual treasure items
  const recentlyViewedItems = useMemo(() => {
    const itemMap = new Map(allTreasure.map(item => [item.item, item]));
    return recentItems
      .map(id => itemMap.get(id))
      .filter((item): item is TreasureItem => item !== undefined);
  }, [allTreasure, recentItems]);

  // Certification dialog state
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TreasureItem | null>(null);

  // Stats for header
  const stats = useMemo(() => {
    const available = allTreasure.filter(i => i.estado?.toUpperCase() === 'DISPONIBLE');
    return {
      totalItems: available.length,
      looseStones: available.filter(i => !i.isJewelry).length,
      jewelry: available.filter(i => i.isJewelry).length,
    };
  }, [allTreasure]);

  // Filter options from hook
  const { colors, shapes, qualities, colecciones, priceMinMax } = filterOptions;

  // Destructure filter values for convenience
  const { search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, sortBy, cantidadFilter, coleccionFilter } = filters;

  // Handlers
  const handleCertClick = useCallback((item: TreasureItem) => {
    setSelectedItem(item);
    setCertDialogOpen(true);
  }, []);

  const handleItemClick = useCallback((item: TreasureItem, positionInList: number = 0) => {
    addToRecent(item.item);
    analyticsHook.trackItemView(item.item, item.nombre);
    track('product_clicked', {
      item_id: item.item,
      item_name: item.nombre || 'Sin nombre',
      position_in_list: positionInList,
      filters_active: hasFilters,
      view_mode: viewMode,
    });
    navigate(`/product/${item.item}`);
  }, [navigate, addToRecent, analyticsHook, track, hasFilters, viewMode]);

  const handleSaveCertifications = useCallback((certifications: TreasureItem['certifications']) => {
    if (selectedItem) {
      log.info('Saving certifications for item:', selectedItem.item, certifications);
    }
    setCertDialogOpen(false);
    setSelectedItem(null);
  }, [selectedItem]);

  // Props for FilterContent
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
    priceRange,
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
    priceMinMax,
    isLight,
    theme,
    hidePriceFilter: !guestCanSeePrices || isProviderMode,
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 2, md: 3, lg: 2 } }}>
      {/* Mobile Layout */}
      {isMobile ? (
        <>
          {/* Search Bar - Sticky */}
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
                  bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
                  '& fieldset': {
                    borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: emeraldCore.primary,
                  },
                },
              }}
            />
            {/* Filter toggle button */}
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

          {/* iOS Filter Sheet */}
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
            onClearFilters={urlSync.handleClearFilters}
            hidePriceFilter={!guestCanSeePrices || isProviderMode}
          />

          {/* Quick info row with active filters */}
          {!filterSheetOpen && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
              {/* Favorites toggle (hidden in provider mode) */}
              {!isProviderMode && (
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
              )}

              {/* Active filter chips - compact mode */}
              <ActiveFilterChips
                filters={filters}
                priceMinMax={priceMinMax}
                onClearSearch={() => setSearch('')}
                onClearColor={() => setColorFilter('all')}
                onClearQuality={() => setQualityFilter('all')}
                onClearType={() => setTypeFilter('all')}
                onClearStatus={() => setStatusFilter('available')}
                onClearShape={() => setShapeFilter('all')}
                onClearCantidad={() => setCantidadFilter('all')}
                onClearPrice={() => setPriceRange([priceMinMax.min, priceMinMax.max])}
                compact
              />

              {/* Stats */}
              <Typography
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.75rem',
                  ml: 'auto',
                  flexShrink: 0,
                }}
              >
                {filteredTreasure.length} items
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
            {/* View toggle, stats and keyboard shortcuts */}
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
            </Box>
          </Paper>
        </>
      )}

      {/* Active Filter Chips - Desktop only */}
      {!isMobile && hasFilters && (
        <Box sx={{ mb: 2 }}>
          <ActiveFilterChips
            filters={filters}
            priceMinMax={priceMinMax}
            onClearSearch={() => setSearch('')}
            onClearColor={() => setColorFilter('all')}
            onClearQuality={() => setQualityFilter('all')}
            onClearType={() => setTypeFilter('all')}
            onClearStatus={() => setStatusFilter('available')}
            onClearShape={() => setShapeFilter('all')}
            onClearCantidad={() => setCantidadFilter('all')}
            onClearColeccion={() => setColeccionFilter('all')}
            onClearPrice={() => setPriceRange([priceMinMax.min, priceMinMax.max])}
          />
        </Box>
      )}

      {/* Results info - Desktop only */}
      {!isMobile && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {filteredTreasure.length === allTreasure.length ? (
                <>
                  <strong style={{ color: theme.palette.text.primary }}>{allTreasure.length}</strong> esmeraldas en total
                </>
              ) : (
                <>
                  Mostrando <strong style={{ color: theme.palette.text.primary }}>{visibleItems.length}</strong> de {filteredTreasure.length} esmeraldas
                </>
              )}
            </Typography>
            {/* Favorites toggle (hidden in provider mode) */}
            {!isProviderMode && (
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
            )}
          </Box>
          {/* Total value (hidden in provider mode) */}
          {!isProviderMode && (
            <Typography variant="body2" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
              {formatFullCurrency(filteredStats.totalValue)} total
            </Typography>
          )}
        </Box>
      )}

      {/* Recently Viewed Carousel */}
      {recentlyViewedItems.length > 0 && !hideRecentlyViewed && (
        <RecentlyViewedCarousel
          items={recentlyViewedItems}
          onItemClick={handleItemClick}
          onClear={clearRecent}
        />
      )}

      {/* Treasure Grid/List */}
      {viewMode === 'grid' ? (
        <VirtualGrid
          items={showFavoritesOnly ? visibleItems : filteredTreasure}
          favorites={allTreasure.map(i => i.item).filter(id => isFavorite(id))}
          onItemClick={handleItemClick}
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
              isSelectedForComparison={comparison.isSelected(props.item.item)}
              onToggleComparison={isProviderMode ? undefined : () => comparison.toggleComparison(props.item)}
              canAddToComparison={comparison.canAddMore}
              isProviderMode={isProviderMode}
            />
          )}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibleItems.map((item) => (
            <ListRow
              key={item.item}
              item={item}
              isFavorite={isFavorite(item.item)}
              onCertClick={() => handleCertClick(item)}
              onItemClick={() => handleItemClick(item)}
              onToggleFavorite={() => toggleFavorite(item.item)}
              isProviderMode={isProviderMode}
            />
          ))}
        </Box>
      )}

      {/* Load More Button - List view only */}
      {viewMode === 'list' && pagination.hasMore && !showFavoritesOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              pagination.loadMore();
              analyticsHook.trackLoadMore(pagination.visibleCount, filteredTreasure.length);
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
            Cargar más ({filteredTreasure.length - pagination.visibleCount} restantes)
          </Button>
        </Box>
      )}

      {/* Empty State */}
      {(visibleItems.length === 0 || (showFavoritesOnly && favoritesCount === 0)) && (
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
              onClick={urlSync.handleClearFilters}
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

      {/* Comparison Bar (hidden in provider mode) */}
      {!isProviderMode && (
        <ComparisonBar
          selectedItems={comparison.selectedItems}
          onRemove={(itemId) => comparison.removeFromComparison(itemId)}
          onClear={comparison.clearComparison}
          onCompare={comparison.openComparisonModal}
        />
      )}

      {/* Comparison Modal (hidden in provider mode) */}
      {!isProviderMode && (
        <ComparisonModal
          open={comparison.showComparisonModal}
          onClose={comparison.closeComparisonModal}
          items={comparison.selectedItems}
        />
      )}
    </Box>
  );
}
