/**
 * TreasureBrowser Component
 *
 * Main treasure browsing interface with filtering, sorting, and grid/list views.
 * Logic lives in useTreasureBrowserController; desktop chrome is split into browser/* components.
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Box, Chip, Typography, alpha, useTheme } from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';
import CertificationUpload from './CertificationUpload';
import { ComparisonBar, ComparisonModal } from '../comparison';
import { FilterSheet, getQuietEmerald, qeFont } from '../../design-system';
import { TreasureItem } from '../../types';
import ListRow from './ListRow';
import VirtualGrid from './VirtualGrid';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterContent } from './FilterContent';
import {
  MobileSearchBar,
  TreasureEmptyState,
  CatalogHeader,
  CatalogSkeletonGrid,
  DesktopFilterToolbar,
  TreasureDesktopResultsSummary,
  VitrinaSelectionBar,
} from './browser';
import VitrinaShareDialog from '../vitrina/VitrinaShareDialog';
import { useCurrentAsesor } from '../../hooks/useCurrentAsesor';
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

  // Quiet Emerald tokens (theme is data, not hardcoded hex).
  const qe = getQuietEmerald(c.isLight ? 'light' : 'dark');

  const {
    isLight,
    isProviderMode: providerMode,
    isMobile,
    allTreasure,
    sheetsError,
    refreshFromSheets,
    isLoadingSheets,
    filters,
    filteredTreasure,
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
    canSelect,
    vitrinaSelection: sel,
  } = c;

  // El slug del remitente viaja en el enlace para que el "Consultar" del
  // cliente llegue a quien se lo mandó. Mismo montaje que CartPage.
  const { asesor } = useCurrentAsesor();

  // La barra ocupa alto real sobre la barra de pestañas; la grilla tiene que
  // pagarlo por su fila espaciadora o la última pieza queda debajo. En el
  // teléfono son DOS filas (el conteo no cabe junto a los botones a 390px),
  // así que el despeje es mayor.
  const selectionBarHeight = isMobile ? 96 : 60;

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

  // The header's identity zone used to carry, stacked under the title: a
  // subtitle, the total inventory value, and gem/jewelry count chips. All three
  // are gone — see CatalogHeader's own note for what each cost and why. The
  // header is now a single 56px band instead of 178px of mostly-empty rows.
  //
  // On the phone it is not rendered at all: the brand lockup keeps its band
  // untouched, and search, origin chips and filters share one 46px row inside
  // MobileSearchBar. 187px of chrome down to 98.

  return (
    <Box
      sx={{
        maxWidth: 1536,
        mx: 'auto',
        // xs is 0 because the shell's 16px is the phone edge (DS3 §3.1); this
        // box used to add 8 and VirtualGrid another 8, stacking to 32 a side.
        px: { xs: 0, sm: 2, md: 3, lg: 3, xl: 4 },
      }}
    >
      {!isMobile && (
        <CatalogHeader
          count={headerCount}
          origins={originOptions}
          activeOrigin={originTab}
          onOriginChange={setOriginTab}
          trailingContent={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                // NEVER wraps: the band is one line by construction. The single
                // flexible gap lives in CatalogHeader, so this cluster can no
                // longer collapse it and scatter itself across three baselines.
                flexWrap: 'nowrap',
                minWidth: 0,
              }}
            >
              <FilterContent {...filterContentProps} />
              <DesktopFilterToolbar
                dense
                recentItems={recentlyViewedItems}
                onRecentClick={handleItemClick}
                onClearRecent={clearRecent}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                savedFilters={savedFilters}
                hasFilters={hasFilters}
                // La AUSENCIA del prop es la compuerta: sin permiso no hay
                // botón que encontrar en el DOM.
                onToggleSelectionMode={
                  canSelect
                    ? () => (sel.selectionMode ? sel.exit() : sel.enter())
                    : undefined
                }
                selectionMode={sel.selectionMode}
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
                resultsSummary={
                  <TreasureDesktopResultsSummary
                    theme={theme}
                    isLight={isLight}
                    t={t}
                    filteredTreasureLength={filteredTreasure.length}
                    visibleItemsLength={visibleItems.length}
                    viewMode={viewMode}
                    isProviderMode={providerMode}
                    showFavoritesOnly={showFavoritesOnly}
                    favoritesCount={favoritesCount}
                    onToggleFavoritesOnly={() =>
                      setShowFavoritesOnly(!showFavoritesOnly)
                    }
                  />
                }
              />
            </Box>
          }
        />
      )}

      {isMobile && (
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
            onToggleSelectionMode={
              canSelect
                ? () => (sel.selectionMode ? sel.exit() : sel.enter())
                : undefined
            }
            selectionMode={sel.selectionMode}
            filteredCount={filteredTreasure.length}
            // The header's own count, so the bar can tell whether repeating a
            // number says anything. Same source as CatalogHeader's `count`.
            originCount={headerCount}
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
            activeFilterCount={
              activeFilterCount + (originTab !== 'all' ? 1 : 0)
            }
            // Origin lives in this sheet now, so "limpiar" has to clear it too —
            // urlSync.handleClearFilters alone would leave a mine selected with
            // nothing on screen saying so.
            onClear={handleClearAll}
            onApply={() => setFilterSheetOpen(false)}
          >
            {/* Origen — first, because it is the coarsest cut in the catalogue
                and the one the house talks in. It was a chip strip beside the
                search field until that strip turned out to hijack drag. */}
            {originOptions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  sx={{
                    fontFamily: qeFont.ui,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: qe.subtle,
                    mb: 1,
                  }}
                >
                  Origen
                </Typography>
                <Box
                  role="group"
                  aria-label="Filtrar por origen"
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
                >
                  {['all', ...originOptions].map((o) => {
                    const active = originTab === o;
                    return (
                      <Chip
                        key={o}
                        label={o === 'all' ? 'Todas' : o}
                        size="small"
                        onClick={() => setOriginTab(o)}
                        aria-pressed={active}
                        sx={{
                          // Wraps instead of scrolling: four mines fit on two
                          // lines of a 320px sheet, and a wrapped row cannot
                          // steal a drag from the sheet it sits in.
                          flexShrink: 0,
                          minHeight: 36,
                          fontSize: '0.75rem',
                          fontWeight: active ? 700 : 500,
                          color: active ? qe.onAccent : qe.text,
                          bgcolor: active ? qe.accent : 'transparent',
                          border: `1px solid ${active ? qe.accent : qe.border}`,
                          '&:hover': {
                            bgcolor: active
                              ? qe.accent
                              : alpha(qe.accent, 0.08),
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

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
                      bgcolor: alpha(qe.accent, 0.08),
                      color: qe.accent,
                      border: `1px solid ${alpha(qe.accent, 0.2)}`,
                      '&:hover': { bgcolor: alpha(qe.accent, 0.15) },
                    }}
                  />
                ))}
              </Box>
            )}
            <FilterContent {...filterContentProps} compact />
          </FilterSheet>
        </>
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

      {isLoadingSheets && allTreasure.length === 0 ? (
        <CatalogSkeletonGrid />
      ) : viewMode === 'grid' ? (
        <VirtualGrid
          items={gridItems}
          favorites={favoriteIds}
          comparisonIds={comparisonIds}
          selectedIds={sel.ids}
          selectionMode={sel.selectionMode}
          bottomInset={sel.selectionMode ? selectionBarHeight : 0}
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

      {/* Dos barras inferiores a la vez violarían la regla de un solo cromo
          inferior (DS3 §5.2). Se oculta la de comparación, no se limpia: al
          salir del modo vuelve con lo que tenía. */}
      {!providerMode && !sel.selectionMode && (
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

      {canSelect && (
        <>
          <VitrinaSelectionBar
            visible={sel.selectionMode}
            count={sel.count}
            max={sel.max}
            atCap={sel.atCap}
            onShare={sel.openShare}
            onClear={sel.clear}
            onDone={sel.exit}
          />
          {/* El mismo diálogo que acuña desde el carrito, montado tal cual:
              es función pura de `items`, sin acoplamiento al carrito. */}
          <VitrinaShareDialog
            open={sel.shareOpen}
            onClose={sel.closeShare}
            items={sel.shareItems}
            senderSlug={asesor?.slug}
          />
        </>
      )}

      <ScrollToTop
        scrollContainer={viewMode === 'grid' ? gridScrollEl : null}
        hidden={sel.selectionMode}
      />
    </Box>
  );
}
