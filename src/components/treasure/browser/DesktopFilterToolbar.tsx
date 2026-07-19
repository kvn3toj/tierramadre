import {
  Box,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material';
import { LayoutGrid, List, Gem, Crown } from 'lucide-react';
import { emeraldCore } from '../../../design-system/tokens/colors';
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
  shouldShowPrices: boolean;
  stats: { looseStones: number; jewelry: number };
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
  isLight,
  resultsSummary,
  dense = false,
}: DesktopFilterToolbarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        ...(dense
          ? {}
          : {
              mt: 1,
              pt: 1,
              borderTop: '1px solid',
              borderColor: isLight
                ? 'rgba(0,0,0,0.06)'
                : 'rgba(255,255,255,0.06)',
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

      {/* Personal/info cluster: Favoritos + stat chips + total value — a
          distinct concept from "narrow the catalog", separated with a
          little extra breathing room from the find cluster above. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 1 }}>
        {resultsSummary}
        {shouldShowPrices && (
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
                // Quiet Emerald: emerald is the only saturated color —
                // jewelry reads as neutral ink, not gold.
                bgcolor: isLight
                  ? 'rgba(0,0,0,0.06)'
                  : 'rgba(255,255,255,0.08)',
                color: isLight ? '#5C6360' : '#9AA09D',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 24,
                '& .MuiChip-icon': { color: isLight ? '#5C6360' : '#9AA09D' },
              }}
            />
          </Box>
        )}
      </Box>

      {!dense && <Box sx={{ flex: 1 }} />}
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
