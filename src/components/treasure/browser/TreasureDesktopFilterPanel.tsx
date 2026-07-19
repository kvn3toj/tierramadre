/**
 * Desktop catalog toolbar card: saved filters, stats chips, results summary,
 * view mode. The search/estado/ordenar/filtros controls (FilterContent) now
 * render on the CatalogHeader row instead of here — see TreasureBrowser.
 */

import { Paper } from '@mui/material';
import DesktopFilterToolbar from './DesktopFilterToolbar';
import TreasureDesktopResultsSummary, {
  type TreasureDesktopResultsSummaryProps,
} from './TreasureDesktopResultsSummary';
import {
  surfacesLight,
  surfacesDark,
} from '../../../design-system/tokens/colors';
import type {
  TreasureFilters,
  TypeFilter,
  StatusFilter,
  SortOption,
} from '../../../hooks/useTreasureFiltering';
import { useSavedFilters } from '../../../hooks/useSavedFilters';

export interface TreasureDesktopFilterPanelProps {
  isLight: boolean;
  shouldShowPrices: boolean;
  stats: { looseStones: number; jewelry: number };
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  savedFilters: ReturnType<typeof useSavedFilters>;
  hasFilters: boolean;
  filters: TreasureFilters;
  setSearch: (s: string) => void;
  setColorFilter: (c: string) => void;
  setQualityFilter: (q: string) => void;
  setTypeFilter: (t: TypeFilter) => void;
  setStatusFilter: (s: StatusFilter) => void;
  setShapeFilter: (s: string) => void;
  setPriceRange: (r: [number, number]) => void;
  setSortBy: (s: SortOption) => void;
  setCantidadFilter: (c: string) => void;
  trackViewModeChange: (mode: 'grid' | 'list') => void;
  /**
   * Rendered inline in DesktopFilterToolbar's own row (in place of its flex
   * spacer) rather than as a separate block — one less divided row squeezing
   * the grid.
   */
  resultsSummary: TreasureDesktopResultsSummaryProps;
}

export default function TreasureDesktopFilterPanel({
  isLight,
  shouldShowPrices,
  stats,
  viewMode,
  onViewModeChange,
  savedFilters,
  hasFilters,
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
  trackViewModeChange,
  resultsSummary,
}: TreasureDesktopFilterPanelProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1.5,
        borderRadius: 2,
        bgcolor: isLight
          ? surfacesLight.background.primary
          : surfacesDark.background.primary,
        border: '1px solid',
        borderColor: isLight
          ? surfacesLight.border.light
          : surfacesDark.border.light,
      }}
    >
      <DesktopFilterToolbar
        shouldShowPrices={shouldShowPrices}
        stats={stats}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
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
        trackViewModeChange={trackViewModeChange}
        isLight={isLight}
        resultsSummary={<TreasureDesktopResultsSummary {...resultsSummary} />}
      />
    </Paper>
  );
}
