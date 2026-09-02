import { Box, ButtonBase, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { CheckSquare, LayoutGrid, List } from 'lucide-react';
import { getQuietEmerald } from '../../../design-system';
import SavedFiltersDropdown from '../SavedFiltersDropdown';
import type { FilterPreset, FilterState } from '../../../hooks/useSavedFilters';
import type { TreasureItem } from '../../../types';
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
  /** Recently-viewed pieces, surfaced inside the Búsquedas dropdown. */
  recentItems?: TreasureItem[];
  onRecentClick?: (item: TreasureItem) => void;
  onClearRecent?: () => void;
  /**
   * Vitrina selection mode toggle. **Its ABSENCE is the permission gate**: the
   * controller passes it only when `useCanShareVitrina() && !isProviderMode`,
   * so a provider or a guest never gets the button at all — not a disabled one,
   * not a hidden one. Nothing to find in the DOM.
   */
  onToggleSelectionMode?: () => void;
  /** Whether the vitrina selection mode is currently on. */
  selectionMode?: boolean;
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
  recentItems,
  onRecentClick,
  onClearRecent,
  onToggleSelectionMode,
  selectionMode = false,
}: DesktopFilterToolbarProps) {
  // Theme is data: resolve the Quiet Emerald token set from the mode instead of
  // hand-rolling hex/rgba here.
  const qe = getQuietEmerald(isLight ? 'light' : 'dark');
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'center',
        // Content-sized and non-wrapping. It used to be `flex: 1` with
        // `flexWrap: 'wrap'` and its own flexible spacer inside — which is
        // exactly how the cluster ended up on three baselines: once it wrapped,
        // the spacer collapsed and the parts landed wherever. The single gap now
        // lives in CatalogHeader, above this component.
        flexWrap: 'nowrap',
        flexShrink: 0,
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
      {/* Icon-only in the band. With its full label it measures 160px, and the
          five controls then total 943px inside a 769px slot — 7px of slack after
          gaps, which is the "fits by luck" state the old header was in. At 38px
          the band keeps ~129px of real slack.
          Relocating it into the Filtros popover (a saved filter IS a filter)
          would buy another 40px, but that means threading a dozen saved-filter
          props through FilterContent — worth doing, not worth bundling here. */}
      <SavedFiltersDropdown
        compact={dense}
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
        recentItems={recentItems}
        onRecentClick={onRecentClick}
        onClearRecent={onClearRecent}
      />

      {/* Personal/view cluster: Favoritos — a distinct concept from "narrow the
          catalog". The flexible gap that used to separate the two clusters now
          lives in CatalogHeader, so there is nothing here that can collapse. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {resultsSummary}
      </Box>

      {/* «Seleccionar» — antes del grupo de vista, porque entra al modo en el
          que ese grupo deja de tener sentido (el modo es sólo de cuadrícula).

          SÓLO ICONO, como el corazón de favoritos que tiene al lado. Con el
          rótulo medía 120px, y esta banda es de una sola línea por
          construcción: medido en el catálogo real a 1009px, el botón rotulado
          desbordaba la tira de orígenes (scrollWidth 98 > clientWidth 82, o
          sea "Muzo" recortado a "Mu") y encogía el buscador de 195px a 140.
          El estado encendido se lee por el relleno de acento, y el nombre por
          `aria-label` + `title`. */}
      {onToggleSelectionMode && (
        <ButtonBase
          onClick={onToggleSelectionMode}
          aria-pressed={selectionMode}
          aria-label={
            selectionMode
              ? 'Salir del modo selección'
              : 'Seleccionar varias piezas'
          }
          title={
            selectionMode
              ? 'Salir del modo selección'
              : 'Seleccionar varias piezas'
          }
          disableRipple
          sx={{
            // 40px es el piso de precisión de puntero en escritorio (DS3 §6.3);
            // el teléfono usa 44 en su propia barra.
            width: 40,
            height: 40,
            borderRadius: 2,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: selectionMode ? qe.onAccent : qe.text,
            backgroundColor: selectionMode ? qe.accent : 'transparent',
            border: `1px solid ${selectionMode ? qe.accent : qe.border}`,
            transition: 'opacity var(--tm-fast) var(--tm-ease)',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            '&:active': { opacity: 0.85 },
            '&:focus-visible': {
              outline: `2px solid ${qe.accent}`,
              outlineOffset: 2,
            },
          }}
        >
          <CheckSquare size={18} aria-hidden />
        </ButtonBase>
      )}

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
