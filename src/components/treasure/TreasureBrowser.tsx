/**
 * TreasureBrowser Component
 *
 * Main treasure browsing interface with filtering, sorting, and grid/list views.
 * Refactored to extract URL sync, filter tracking, active chips, mobile search,
 * empty state, and desktop filter toolbar into separate components.
 */
import { useState, useMemo, useCallback, useRef, useEffect, } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import { Heart } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { useTreasure } from '../../hooks/useTreasure';
import { useTreasureFiltering } from '../../hooks/useTreasureFiltering';
import { useUrlFilterSync } from '../../hooks/useUrlFilterSync';
import { useFilterTracking } from '../../hooks/useFilterTracking';
import { useFavorites } from '../../hooks/useFavorites';
import { usePagination } from '../../hooks/usePagination';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { useSavedFilters } from '../../hooks/useSavedFilters';
import { useTreasureAnalytics } from '../../hooks/useTreasureAnalytics';
import { useTracking } from '../../contexts/TrackingContext';
import { useProductViews } from '../../hooks/useProductViews';
import { useComparison } from '../../hooks/useComparison';
import { TreasureItem } from '../../types';
import CertificationUpload from './CertificationUpload';
import { ComparisonBar, ComparisonModal } from '../comparison';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { createLogger } from '../../utils/logger';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { GridCard, ListRow, VirtualGrid, FilterContent, ActiveFilterChips, type FilterContentProps } from './';
import RecentlyViewedCarousel from './RecentlyViewedCarousel';
import IOSFilterSheet from '../ios/IOSFilterSheet';
import { MobileSearchBar, TreasureEmptyState, DesktopFilterToolbar } from './browser';
import { useLiveRegion } from '../shared/LiveRegion';
import ScrollToTop from '../shared/ScrollToTop';

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
  const { formatFullCurrency } = useCurrencyFormat();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { accessLevel } = useAuthContext();
  const { shouldShowPrices } = usePriceShare();
  const isAdmin = accessLevel === 'admin';
  const isLight = mode === 'light';
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_searchParams] = useSearchParams();

  // Get treasure data from hook
  const { treasure: allTreasure } = useTreasure();

  // URL sync hook - provides initial filters from URL
  const { initialFilters } = useUrlFilterSync({
    filters: { search: '', colorFilter: 'all', qualityFilter: 'all', typeFilter: 'all', statusFilter: 'available', shapeFilter: 'all', priceRange: [0, Number.MAX_SAFE_INTEGER], sortBy: 'newest', cantidadFilter: 'all', cityFilter: 'all', coleccionFilter: 'all', itemsFilter: [] },
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

  // Product view counts for badges
  const { getViewCount } = useProductViews();

  // Comparison hook
  const comparison = useComparison();

  // Aria-live announcements for filter results (WCAG 4.1.3)
  const { announce } = useLiveRegion();
  const prevFilteredCount = useRef(filteredTreasure.length);
  useEffect(() => {
    if (prevFilteredCount.current !== filteredTreasure.length && hasFilters) {
      announce(`${filteredTreasure.length} productos encontrados`);
    }
    prevFilteredCount.current = filteredTreasure.length;
  }, [filteredTreasure.length, hasFilters, announce]);

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
  const handleScrollDirectionChange = useCallback((_direction: 'up' | 'down') => {
    // No-op: recently viewed is always visible now
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
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 2, md: 3, lg: 2 } }}>
      {/* Mobile Layout */}
      {isMobile ? (
        <>
          <MobileSearchBar
            search={search}
            setSearch={setSearch}
            isLight={isLight}
            filterSheetOpen={filterSheetOpen}
            setFilterSheetOpen={setFilterSheetOpen}
            hasFilters={hasFilters}
            activeFilterCount={activeFilterCount}
            filters={filters}
            priceMinMax={priceMinMax}
            setColorFilter={setColorFilter}
            setQualityFilter={setQualityFilter}
            setTypeFilter={setTypeFilter}
            setStatusFilter={setStatusFilter}
            setShapeFilter={setShapeFilter}
            setCantidadFilter={setCantidadFilter}
            setPriceRange={setPriceRange}
            showFavoritesOnly={showFavoritesOnly}
            setShowFavoritesOnly={setShowFavoritesOnly}
            favoritesCount={favoritesCount}
            isProviderMode={isProviderMode}
            filteredCount={filteredTreasure.length}
          />

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
          />
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
            <DesktopFilterToolbar
              shouldShowPrices={shouldShowPrices}
              stats={stats}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              savedFilters={savedFilters}
              hasFilters={hasFilters}
              filters={filters}
              setSearch={setSearch}
              setColorFilter={setColorFilter}
              setQualityFilter={setQualityFilter}
              setTypeFilter={setTypeFilter}
              setStatusFilter={setStatusFilter}
              setShapeFilter={setShapeFilter}
              setPriceRange={setPriceRange}
              setSortBy={setSortBy}
              setCantidadFilter={setCantidadFilter}
              trackViewModeChange={analyticsHook.trackViewModeChange}
              isLight={isLight}
            />
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
          {/* Total value (hidden in provider mode or when prices not shown) */}
          {!isProviderMode && shouldShowPrices && (
            <Typography variant="body2" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
              {formatFullCurrency(filteredStats.totalValue)} total
            </Typography>
          )}
        </Box>
      )}

      {/* Recently Viewed Carousel - always visible, sticky at top of grid */}
      {recentlyViewedItems.length > 0 && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <RecentlyViewedCarousel
            items={recentlyViewedItems}
            onItemClick={handleItemClick}
            onClear={clearRecent}
          />
        </Box>
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
              onToggleComparison={() => comparison.toggleComparison(props.item)}
              canAddToComparison={comparison.canAddMore}
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
        <TreasureEmptyState
          isLight={isLight}
          hasFilters={hasFilters}
          activeFilterCount={activeFilterCount}
          onClearFilters={urlSync.handleClearFilters}
          onSuggestionClick={(term) => {
            urlSync.handleClearFilters();
            setSearch(term);
          }}
        />
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

      <ScrollToTop />
    </Box>
  );
}
