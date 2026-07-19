/**
 * TreasureBrowser Component
 *
 * Main treasure browsing interface with filtering, sorting, and grid/list views.
 * Logic lives in useTreasureBrowserController; desktop chrome is split into browser/* components.
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Box, Chip, alpha, useTheme } from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';
import CertificationUpload from './CertificationUpload';
import { ComparisonBar, ComparisonModal } from '../comparison';
import { zIndex, FilterSheet } from '../../design-system';
import { emeraldCore } from '../../design-system/tokens/colors';
import { TreasureItem } from '../../types';
import ListRow from './ListRow';
import VirtualGrid from './VirtualGrid';
import { ActiveFilterChips } from './ActiveFilterChips';
import RecentlyViewedCarousel from './RecentlyViewedCarousel';
import { FilterContent } from './FilterContent';
import RedesignVariantToggle from '../redesign/RedesignVariantToggle';
import {
  MobileSearchBar,
  TreasureEmptyState,
  TreasureDesktopFilterPanel,
  CatalogHeader,
  CatalogSkeletonGrid,
} from './browser';
import TreasureErrorState from './browser/TreasureErrorState';
import ScrollToTop from '../shared/ScrollToTop';
import { useTreasureBrowserController } from '../../hooks/useTreasureBrowserController';

/** Sentinel div that triggers loadMore via IntersectionObserver when scrolled into view. */
function ListLoadMoreSentinel({ onIntersect }: { onIntersect: () => void }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onIntersectRef.current();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <Box ref={sentinelRef} sx={{ height: 1, mt: 2 }} />;
}

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
  const { t } = useLanguage();
  const theme = useTheme();

  // Scroll restoration: key the grid's internal scroll offset by the history
  // entry id (stable across the product round-trip and independent of the
  // replaceState-based filter sync), and only auto-restore on back/forward (POP).
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollKey = `treasure-grid:${location.key}`;
  const [gridScrollEl, setGridScrollEl] = useState<HTMLElement | null>(null);

  const c = useTreasureBrowserController({ isProviderMode, defaultViewMode });

  const {
    formatFullCurrency,
    isLight,
    shouldShowPrices,
    isProviderMode: providerMode,
    isMobile,
    allTreasure,
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
    applySavedPreset,
  } = c;

  // Quiet Emerald origin tabs (Todas / Muzo / Chivor / Coscuez). A self-contained
  // quick filter applied on top of the controller's filtered set, keyed off the
  // captured mine string (item.procedencia / item.mina).
  const CANONICAL_MINES = ['Muzo', 'Chivor', 'Coscuez'];
  const [originTab, setOriginTab] = useState<string>('all');
  const originOptions = useMemo(
    () =>
      CANONICAL_MINES.filter((mine) =>
        allTreasure.some((it) =>
          (it.procedencia || it.mina || '')
            .toLowerCase()
            .includes(mine.toLowerCase()),
        ),
      ),
    [allTreasure],
  );
  const applyOrigin = useCallback(
    (list: TreasureItem[]) => {
      if (originTab === 'all') return list;
      const key = originTab.toLowerCase();
      return list.filter((it) =>
        (it.procedencia || it.mina || '').toLowerCase().includes(key),
      );
    },
    [originTab],
  );
  // Full origin-filtered set drives the header count, list pagination and empty
  // state so they stay consistent when an origin's matches fall past page 1.
  const originFilteredFull = applyOrigin(filteredTreasure);
  const gridItems = applyOrigin(
    showFavoritesOnly ? visibleItems : deferredFilteredTreasure,
  );
  // List view paginates; when an origin tab is active we page the origin-filtered
  // set locally (not the pre-filtered slice), else defer to the controller.
  const listItems =
    originTab === 'all'
      ? visibleItems
      : originFilteredFull.slice(0, pagination.visibleCount);
  const listHasMore =
    originTab === 'all'
      ? pagination.hasMore
      : pagination.visibleCount < originFilteredFull.length;
  const headerCount = originFilteredFull.length;
  const handleClearAll = () => {
    setOriginTab('all');
    urlSync.handleClearFilters();
  };

  return (
    <Box
      sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 2, md: 3, lg: 2 } }}
    >
      <CatalogHeader
        count={headerCount}
        origins={originOptions}
        activeOrigin={originTab}
        onOriginChange={setOriginTab}
        trailingContent={
          !isMobile ? <FilterContent {...filterContentProps} /> : undefined
        }
      />

      {isMobile ? (
        <>
          <MobileSearchBar
            search={filters.search}
            setSearch={setSearch}
            isLight={isLight}
            filterSheetOpen={filterSheetOpen}
            setFilterSheetOpen={setFilterSheetOpen}
            hasFilters={hasFilters}
            activeFilterCount={activeFilterCount}
            filters={filters}
            priceMinMax={priceMinMax}
            caratMinMax={caratMinMax}
            setColorFilter={setColorFilter}
            setQualityFilter={setQualityFilter}
            setTypeFilter={setTypeFilter}
            setStatusFilter={setStatusFilter}
            setShapeFilter={setShapeFilter}
            setCantidadFilter={setCantidadFilter}
            setCategoriaFilter={setCategoriaFilter}
            setHeroCategoryFilter={setHeroCategoryFilter}
            setPriceRange={setPriceRange}
            setCaratRange={setCaratRange}
            showFavoritesOnly={showFavoritesOnly}
            setShowFavoritesOnly={setShowFavoritesOnly}
            favoritesCount={favoritesCount}
            isProviderMode={providerMode}
            filteredCount={filteredTreasure.length}
            recentlyViewedItems={recentlyViewedItems}
            onRecentItemClick={handleItemClick}
            onClearRecent={clearRecent}
            favoriteItems={favoriteMappedItems}
          />

          <FilterSheet
            open={filterSheetOpen}
            onClose={() => setFilterSheetOpen(false)}
            title="Filtros"
            resultCount={filteredTreasure.length}
            activeFilterCount={activeFilterCount}
            onClear={urlSync.handleClearFilters}
            onApply={() => setFilterSheetOpen(false)}
          >
            {savedFilters.presets.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  overflowX: 'auto',
                  flexWrap: 'wrap',
                  mb: 1.5,
                  pb: 0.5,
                }}
              >
                {savedFilters.presets.map((preset) => (
                  <Chip
                    key={preset.id}
                    label={preset.name}
                    size="small"
                    onClick={() => applySavedPreset(preset)}
                    sx={{
                      flexShrink: 0,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      minHeight: 32,
                      bgcolor: alpha(emeraldCore.primary, 0.08),
                      color: emeraldCore.primary,
                      border: `1px solid ${alpha(emeraldCore.primary, 0.2)}`,
                      '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.15) },
                    }}
                  />
                ))}
              </Box>
            )}
            <FilterContent {...filterContentProps} compact />
          </FilterSheet>
        </>
      ) : (
        <TreasureDesktopFilterPanel
          isLight={isLight}
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
          resultsSummary={{
            theme,
            isLight,
            t,
            filteredTreasureLength: filteredTreasure.length,
            allTreasureLength: allTreasure.length,
            visibleItemsLength: visibleItems.length,
            viewMode,
            isProviderMode: providerMode,
            shouldShowPrices,
            formatFullCurrency,
            filteredStatsTotalValue: filteredStats.totalValue,
            showFavoritesOnly,
            favoritesCount,
            onToggleFavoritesOnly: () =>
              setShowFavoritesOnly(!showFavoritesOnly),
          }}
        />
      )}

      {!isMobile && hasFilters && (
        <Box sx={{ mb: 2 }}>
          <ActiveFilterChips
            filters={filters}
            priceMinMax={priceMinMax}
            onClearSearch={() => setSearch('')}
            onClearColor={() => setColorFilter('all')}
            onClearQuality={() => setQualityFilter('all')}
            onClearType={() => setTypeFilter('all')}
            onClearStatus={() => setStatusFilter('all')}
            onClearShape={() => setShapeFilter('all')}
            onClearCantidad={() => setCantidadFilter('all')}
            onClearCategoria={() => setCategoriaFilter('all')}
            onClearColeccion={() => setColeccionFilter('all')}
            onClearHeroCategory={() => setHeroCategoryFilter('all')}
            onClearPrice={() =>
              setPriceRange([priceMinMax.min, priceMinMax.max])
            }
            onClearCarat={() =>
              setCaratRange([caratMinMax.min, caratMinMax.max])
            }
            caratMinMax={caratMinMax}
          />
        </Box>
      )}

      {!isMobile && recentlyViewedItems.length > 0 && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: zIndex.base,
          }}
        >
          <RecentlyViewedCarousel
            items={recentlyViewedItems}
            onItemClick={handleItemClick}
            onClear={clearRecent}
          />
        </Box>
      )}

      {isLoadingSheets && allTreasure.length === 0 ? (
        <CatalogSkeletonGrid />
      ) : viewMode === 'grid' ? (
        <VirtualGrid
          items={gridItems}
          favorites={favoriteIds}
          comparisonIds={comparisonIds}
          canAddToComparison={canAddToComparison}
          onItemClick={handleItemClick}
          onCertClick={handleCertClick}
          onToggleFavorite={toggleFavorite}
          onScrollDirectionChange={handleScrollDirectionChange}
          renderCard={renderCard}
          scrollRestorationKey={scrollKey}
          restoreScroll={navigationType === 'POP'}
          onScrollElement={setGridScrollEl}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {listItems.map((item) => (
            <ListRow
              key={item.item}
              item={item}
              isFavorite={isFavorite(item.item)}
              onCertClick={handleCertClick}
              onItemClick={handleItemClick}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </Box>
      )}

      {viewMode === 'list' && listHasMore && !showFavoritesOnly && (
        <ListLoadMoreSentinel
          onIntersect={() => {
            pagination.loadMore();
            analyticsHook.trackLoadMore(
              pagination.visibleCount,
              originFilteredFull.length,
            );
          }}
        />
      )}

      {sheetsError && allTreasure.length === 0 && (
        <TreasureErrorState
          isLight={isLight}
          error={sheetsError}
          onRetry={refreshFromSheets}
          isRetrying={isLoadingSheets}
        />
      )}

      {!sheetsError &&
        !(isLoadingSheets && allTreasure.length === 0) &&
        ((viewMode === 'grid'
          ? gridItems.length === 0
          : listItems.length === 0) ||
          (showFavoritesOnly && favoritesCount === 0)) && (
          <TreasureEmptyState
            isLight={isLight}
            hasFilters={hasFilters || originTab !== 'all'}
            activeFilterCount={
              activeFilterCount + (originTab !== 'all' ? 1 : 0)
            }
            onClearFilters={handleClearAll}
            onSuggestionClick={(term) => {
              handleClearAll();
              setSearch(term);
            }}
          />
        )}

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

      {!providerMode && (
        <ComparisonBar
          selectedItems={comparison.selectedItems}
          onRemove={(itemId) => comparison.removeFromComparison(itemId)}
          onClear={comparison.clearComparison}
          onCompare={comparison.openComparisonModal}
        />
      )}

      {!providerMode && (
        <ComparisonModal
          open={comparison.showComparisonModal}
          onClose={comparison.closeComparisonModal}
          items={comparison.selectedItems}
        />
      )}

      <ScrollToTop
        scrollContainer={viewMode === 'grid' ? gridScrollEl : null}
      />

      <RedesignVariantToggle />
    </Box>
  );
}
