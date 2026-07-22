import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { LayoutGrid, List } from 'lucide-react';
import { getQuietEmerald } from '../../../design-system';
import SavedFiltersDropdown from '../SavedFiltersDropdown';
import type { FilterPreset, FilterState } from '../../../hooks/useSavedFilters';
import type {
  TreasureFilters,
  StatusFilter,
  SortOption,
  TypeFilter,
} from '../../../hooks/useTreasureFiltering';

interface UseSavedFiltersApi {
  presets: FilterPreset[];
  savePreset: (name: string, filters: FilterState) => FilterPreset;
  deletePreset: (id: string) => void;
}

interface DesktopFilterToolbarProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  savedFilters: UseSavedFiltersApi;
  hasFilters: boolean;
  filters: TreasureFilters;
  setSearch: (v: string) => void;
  setColorFilter: (v: string) => void;
  setQualityFilter: (v: string) => void;
  setTypeFilter: (v: TypeFilter) => void;
  setStatusFilter: (v: StatusFilter) => void;
  setShapeFilter: (v: string) => void;
  setPriceRange: (v: [number, number]) => void;
  setSortBy: (v: SortOption) => void;
  setCantidadFilter: (v: string) => void;
  trackViewModeChange: (mode: 'grid' | 'list') => void;
  isLight: boolean;
  /** Rendered in place of the row's flex spacer — keeps the results count on
   * the same row as saved-filters/view-toggle instead of a separate block. */
  resultsSummary?: React.ReactNode;
  /** Drops the top border/margin — for when this renders inline beside the
   * page title instead of as its own row below. */
  dense?: boolean;
}

export default function DesktopFilterToolbar({
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
  isLight,
  resultsSummary,
  dense = false,
}: DesktopFilterToolbarProps) {
  // Theme is data: resolve the Quiet Emerald token set from the mode instead of
  // hand-rolling hex/rgba here.
  const qe = getQuietEmerald(isLight ? 'light' : 'dark');
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        flexWrap: 'wrap',
        // Span the trailing area so the flexible gap below can push the
        // personal/view cluster to the right edge of the header row.
        flex: 1,
        minWidth: 0,
        ...(dense
          ? {}
          : {
              mt: 1,
              pt: 1,
              borderTop: '1px solid',
              borderColor: qe.hairline,
            }),
      }}
    >
      {/* Find cluster: saved searches sits right after Search/Filtros (which
          render just before this component) — all three narrow the catalog. */}
      <SavedFiltersDropdown
        presets={savedFilters.presets}
        onSavePreset={(name) =>
          savedFilters.savePreset(name, {
            search: filters.search,
            colorFilter: filters.colorFilter,
            qualityFilter: filters.qualityFilter,
            typeFilter: filters.typeFilter,
            statusFilter: filters.statusFilter,
            shapeFilter: filters.shapeFilter,
            priceRange: filters.priceRange,
            sortBy: filters.sortBy,
            cantidadFilter: filters.cantidadFilter,
          })
        }
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

      {/* Flexible gap — the honest break between the "narrow the catalog" find
          cluster (search · filtros · búsquedas) and the personal/view cluster.
          minWidth keeps a real gap even when the row is tight. */}
      <Box sx={{ flex: 1, minWidth: 24 }} />

      {/* Personal/view cluster: Favoritos — a distinct concept from "narrow the
          catalog", right-aligned. Inventory summary (total value + stat chips)
          lives in the header's identity zone, not here, so this row stays a
          stable single line whether or not prices are shown. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {resultsSummary}
      </Box>

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, value) => {
          if (value) {
            onViewModeChange(value);
            trackViewModeChange(value);
          }
        }}
        size="small"
      >
        <ToggleButton
          value="grid"
          aria-label="Vista cuadrícula"
          sx={{ px: 1.5 }}
        >
          <LayoutGrid size={18} />
        </ToggleButton>
        <ToggleButton value="list" aria-label="Vista lista" sx={{ px: 1.5 }}>
          <List size={18} />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
