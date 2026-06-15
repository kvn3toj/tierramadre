/**
 * TreasureBrowser Component
 *
 * Main treasure browsing interface with filtering, sorting, and grid/list views.
 * Logic lives in useTreasureBrowserController; desktop chrome is split into browser/* components.
 */

import { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Box, useTheme } from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';
import CertificationUpload from './CertificationUpload';
import { ComparisonBar, ComparisonModal } from '../comparison';
import { zIndex } from '../../design-system';
import ListRow from './ListRow';
import VirtualGrid from './VirtualGrid';
import { ActiveFilterChips } from './ActiveFilterChips';
import RecentlyViewedCarousel from './RecentlyViewedCarousel';
import IOSFilterSheet from '../ios/IOSFilterSheet';
import {
  MobileSearchBar,
  TreasureEmptyState,
  TreasureDesktopFilterPanel,
  TreasureDesktopResultsSummary,
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
      { rootMargin: '200px' }
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
    applySavedPreset,
  } = c;

  const { colors, shapes, qualities, categorias, colecciones } = filterOptions;
  const { statusFilter, sortBy, typeFilter, categoriaFilter, coleccionFilter, colorFilter, shapeFilter, qualityFilter, priceRange } =
    filters;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 2, md: 3, lg: 2 } }}>
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

          <IOSFilterSheet
            open={filterSheetOpen}
            onClose={() => setFilterSheetOpen(false)}
            statusFilter={statusFilter}
            sortBy={sortBy}
            typeFilter={typeFilter}
            categoriaFilter={categoriaFilter}
            coleccionFilter={coleccionFilter}
            colorFilter={colorFilter}
            shapeFilter={shapeFilter}
            qualityFilter={qualityFilter}
            priceRange={priceRange}
            caratRange={filters.caratRange}
            cantidadFilter={filters.cantidadFilter}
            setStatusFilter={setStatusFilter}
            setSortBy={setSortBy}
            setTypeFilter={setTypeFilter}
            setCategoriaFilter={setCategoriaFilter}
            setColeccionFilter={setColeccionFilter}
            setColorFilter={setColorFilter}
            setShapeFilter={setShapeFilter}
            setQualityFilter={setQualityFilter}
            setPriceRange={setPriceRange}
            setCaratRange={setCaratRange}
            setCantidadFilter={setCantidadFilter}
            colors={colors}
            shapes={shapes}
            qualities={qualities}
            categorias={categorias}
            colecciones={colecciones}
            priceMinMax={priceMinMax}
            caratMinMax={caratMinMax}
            hasFilters={hasFilters}
            onClearFilters={urlSync.handleClearFilters}
            resultCount={filteredTreasure.length}
            savedPresets={savedFilters.presets}
            onApplyPreset={applySavedPreset}
          />
        </>
      ) : (
        <TreasureDesktopFilterPanel
          isLight={isLight}
          filterContentProps={filterContentProps}
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
            onClearStatus={() => setStatusFilter('available')}
            onClearShape={() => setShapeFilter('all')}
            onClearCantidad={() => setCantidadFilter('all')}
            onClearCategoria={() => setCategoriaFilter('all')}
            onClearColeccion={() => setColeccionFilter('all')}
            onClearHeroCategory={() => setHeroCategoryFilter('all')}
            onClearPrice={() => setPriceRange([priceMinMax.min, priceMinMax.max])}
            onClearCarat={() => setCaratRange([caratMinMax.min, caratMinMax.max])}
            caratMinMax={caratMinMax}
          />
        </Box>
      )}

      {!isMobile && (
        <TreasureDesktopResultsSummary
          theme={theme}
          isLight={isLight}
          t={t}
          filteredTreasureLength={filteredTreasure.length}
          allTreasureLength={allTreasure.length}
          visibleItemsLength={visibleItems.length}
          viewMode={viewMode}
          isProviderMode={providerMode}
          shouldShowPrices={shouldShowPrices}
          formatFullCurrency={formatFullCurrency}
          filteredStatsTotalValue={filteredStats.totalValue}
          showFavoritesOnly={showFavoritesOnly}
          favoritesCount={favoritesCount}
          onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
        />
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

      {viewMode === 'grid' ? (
        <VirtualGrid
          items={showFavoritesOnly ? visibleItems : deferredFilteredTreasure}
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
          {visibleItems.map((item) => (
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

      {viewMode === 'list' && pagination.hasMore && !showFavoritesOnly && (
        <ListLoadMoreSentinel
          onIntersect={() => {
            pagination.loadMore();
            analyticsHook.trackLoadMore(pagination.visibleCount, filteredTreasure.length);
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

      {!sheetsError && (visibleItems.length === 0 || (showFavoritesOnly && favoritesCount === 0)) && (
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

      <ScrollToTop scrollContainer={viewMode === 'grid' ? gridScrollEl : null} />
    </Box>
  );
}
