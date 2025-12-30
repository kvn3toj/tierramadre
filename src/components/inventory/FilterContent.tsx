/**
 * FilterContent Component
 *
 * Memoized filter controls for inventory browsing.
 * Extracted to prevent re-creation on every render,
 * which fixes the iPad keyboard dismissing issue.
 *
 * REFACTORED: Props grouped into logical objects to reduce prop drilling.
 */

import { memo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  FormControl,
  Select,
  MenuItem,
  alpha,
  Collapse,
  Button,
  Slider,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
  Search,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import {
  type StatusFilter,
  type TypeFilter,
  type SortOption,
  type TreasureFilters,
} from '../../hooks/useInventoryFiltering';
import { useInventoryAnalytics } from '../../hooks/useInventoryAnalytics';
import { InventoryItem } from '../../types';
import { formatCurrency, getColorDot } from '../../utils/formatting';
import { emeraldCore, surfacesLight, surfacesDark, semanticColors } from '../../design-system/tokens/colors';

// =============================================================================
// TYPES - Grouped for cleaner prop drilling
// =============================================================================

/** All filter setter functions grouped together */
export interface FilterSetters {
  setSearch: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
  setSortBy: (value: SortOption) => void;
  setTypeFilter: (value: TypeFilter) => void;
  setCantidadFilter: (value: string) => void;
  setColorFilter: (value: string) => void;
  setShapeFilter: (value: string) => void;
  setQualityFilter: (value: string) => void;
  setColeccionFilter: (value: string) => void;
  setPriceRange: (value: [number, number]) => void;
}

/** Filter options derived from inventory data */
export interface FilterOptions {
  colors: string[];
  shapes: string[];
  qualities: string[];
  colecciones: string[];
  priceMinMax: { min: number; max: number };
}

/** UI-specific state for filter panel */
export interface FilterUIState {
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (value: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

/** New grouped props interface (preferred) */
export interface FilterContentPropsGrouped {
  filters: TreasureFilters;
  setters: FilterSetters;
  options: FilterOptions;
  ui: FilterUIState;
  hasFilters: boolean;
  handleClearFilters: () => void;
  sortedInventory: InventoryItem[];
  analyticsHook: ReturnType<typeof useInventoryAnalytics>;
  isLight: boolean;
  theme: Theme;
  compact?: boolean;
}

/** @deprecated Use FilterContentPropsGrouped - Legacy flat props for backward compatibility */
export interface FilterContentProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (value: TypeFilter) => void;
  cantidadFilter: string;
  setCantidadFilter: (value: string) => void;
  colorFilter: string;
  setColorFilter: (value: string) => void;
  shapeFilter: string;
  setShapeFilter: (value: string) => void;
  qualityFilter: string;
  setQualityFilter: (value: string) => void;
  coleccionFilter: string;
  setColeccionFilter: (value: string) => void;
  priceRange: [number, number];
  setPriceRange: (value: [number, number]) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (value: boolean) => void;
  hasFilters: boolean;
  handleClearFilters: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  sortedInventory: InventoryItem[];
  analyticsHook: ReturnType<typeof useInventoryAnalytics>;
  colors: string[];
  shapes: string[];
  qualities: string[];
  colecciones: string[];
  priceMinMax: { min: number; max: number };
  isLight: boolean;
  theme: Theme;
  /** Hide search field (when parent already has one) */
  compact?: boolean;
}

export const FilterContent = memo(function FilterContent({
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
  compact = false,
}: FilterContentProps) {
  // Compact mode: Beautiful modern pill-based filters (mobile)
  if (compact) {
    // Common pill styles
    const pillBase = {
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: '1px solid',
      px: 1.5,
      py: 0.5,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      whiteSpace: 'nowrap' as const,
    };

    const pillActive = {
      bgcolor: alpha(emeraldCore.primary, 0.15),
      borderColor: emeraldCore.primary,
      color: emeraldCore.dark,
      boxShadow: `0 2px 8px ${alpha(emeraldCore.primary, 0.2)}`,
    };

    const pillInactive = {
      bgcolor: isLight ? 'white' : surfacesDark.background.secondary,
      borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
      color: theme.palette.text.secondary,
      '&:hover': {
        borderColor: alpha(emeraldCore.primary, 0.5),
        bgcolor: alpha(emeraldCore.primary, 0.05),
      },
    };

    // Price tier options
    const priceTiers = [
      { label: 'Todos', min: priceMinMax.min, max: priceMinMax.max },
      { label: '< $1M', min: priceMinMax.min, max: 1000000 },
      { label: '$1M - $5M', min: 1000000, max: 5000000 },
      { label: '$5M - $20M', min: 5000000, max: 20000000 },
      { label: '> $20M', min: 20000000, max: priceMinMax.max },
    ];

    const getCurrentPriceTier = () => {
      const [min, max] = priceRange;
      if (min === priceMinMax.min && max === priceMinMax.max) return 'Todos';
      if (min === priceMinMax.min && max <= 1000000) return '< $1M';
      if (min >= 1000000 && max <= 5000000) return '$1M - $5M';
      if (min >= 5000000 && max <= 20000000) return '$5M - $20M';
      if (min >= 20000000) return '> $20M';
      return null; // Custom range
    };

    const currentPriceTier = getCurrentPriceTier();

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Row 1: Status segmented control (iOS-style) */}
        <Box
          sx={{
            display: 'flex',
            bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.tertiary,
            borderRadius: '24px',
            p: 0.4,
            gap: 0.25,
          }}
        >
          {[
            { value: 'available' as StatusFilter, label: 'Disponibles', dot: emeraldCore.primary },
            { value: 'sold' as StatusFilter, label: 'Vendidas', dot: semanticColors.error.main },
            { value: 'all' as StatusFilter, label: 'Todas', dot: null },
          ].map((option) => (
            <Box
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              sx={{
                flex: 1,
                textAlign: 'center',
                py: 0.75,
                px: 1,
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                ...(statusFilter === option.value
                  ? {
                      bgcolor: isLight ? 'white' : surfacesDark.background.secondary,
                      color: emeraldCore.dark,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    }
                  : {
                      color: theme.palette.text.secondary,
                      '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.05) },
                    }),
              }}
            >
              {option.dot && (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: option.dot }} />
              )}
              {option.label}
            </Box>
          ))}
        </Box>

        {/* Row 2: Type + Sort in pill format */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {/* Type pills */}
          {[
            { value: 'all' as TypeFilter, label: 'Todo' },
            { value: 'loose' as TypeFilter, label: '💎 Gemas' },
            { value: 'jewelry' as TypeFilter, label: '💍 Joyería' },
          ].map((option) => (
            <Box
              key={option.value}
              onClick={() => setTypeFilter(option.value)}
              sx={{
                ...pillBase,
                ...(typeFilter === option.value ? pillActive : pillInactive),
              }}
            >
              {option.label}
            </Box>
          ))}

          {/* Sort pill */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              sx={{
                borderRadius: '20px',
                fontSize: '0.75rem',
                '& .MuiSelect-select': { py: 0.6, px: 1.5 },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                },
              }}
            >
              <MenuItem value="price-desc">Precio ↓</MenuItem>
              <MenuItem value="price-asc">Precio ↑</MenuItem>
              <MenuItem value="name-asc">A-Z</MenuItem>
              <MenuItem value="quality-premium">Calidad</MenuItem>
              <MenuItem value="newest">Recientes</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Row 3: Color swatches (visual) */}
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
            Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Box
              onClick={() => setColorFilter('all')}
              sx={{
                ...pillBase,
                ...(colorFilter === 'all' ? pillActive : pillInactive),
              }}
            >
              Todos
            </Box>
            {colors.slice(0, 6).map((color) => (
              <Box
                key={color}
                onClick={() => setColorFilter(color)}
                sx={{
                  ...pillBase,
                  ...(colorFilter === color ? pillActive : pillInactive),
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: getColorDot(color),
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                  }}
                />
                {color.replace('Verde ', '')}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Row 4: Price tiers (smart chips) */}
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
            Precio
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {priceTiers.map((tier) => (
              <Box
                key={tier.label}
                onClick={() => setPriceRange([tier.min, tier.max])}
                sx={{
                  ...pillBase,
                  ...(currentPriceTier === tier.label ? pillActive : pillInactive),
                }}
              >
                {tier.label}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Row 5: Additional filters (horizontal scroll) */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            overflowX: 'auto',
            pb: 0.5,
            mx: -1,
            px: 1,
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {/* Shape pills */}
          {shapes.slice(0, 4).map((shape) => (
            <Box
              key={shape}
              onClick={() => setShapeFilter(shapeFilter === shape ? 'all' : shape)}
              sx={{
                ...pillBase,
                ...(shapeFilter === shape ? pillActive : pillInactive),
              }}
            >
              {shape}
            </Box>
          ))}

          {/* Quality pills */}
          {qualities.slice(0, 3).map((quality) => (
            <Box
              key={quality}
              onClick={() => setQualityFilter(qualityFilter === quality ? 'all' : quality)}
              sx={{
                ...pillBase,
                ...(qualityFilter === quality ? pillActive : pillInactive),
              }}
            >
              {quality}
            </Box>
          ))}

          {/* Cantidad */}
          <Box
            onClick={() => setCantidadFilter(cantidadFilter === '2+' ? 'all' : '2+')}
            sx={{
              ...pillBase,
              ...(cantidadFilter === '2+' ? pillActive : pillInactive),
            }}
          >
            Lotes
          </Box>
        </Box>

        {/* Clear filters button */}
        {hasFilters && (
          <Chip
            label="✕ Limpiar filtros"
            size="small"
            onClick={handleClearFilters}
            sx={{
              alignSelf: 'flex-start',
              borderRadius: '16px',
              bgcolor: alpha(semanticColors.error.main, 0.08),
              color: semanticColors.error.main,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.7rem',
              '&:hover': {
                bgcolor: alpha(semanticColors.error.main, 0.15),
              },
            }}
          />
        )}
      </Box>
    );
  }

  // Desktop mode: Original layout with "Más filtros" toggle
  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: showAdvancedFilters ? 2 : 0 }}>
        {/* Search */}
        <TextField
          placeholder="Buscar... (presiona /)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => {
            if (search.trim()) {
              analyticsHook.trackSearch(search, sortedInventory.length);
              const itemIds = sortedInventory.map(item => item.item);
              analyticsHook.trackSearchHits(itemIds);
            }
          }}
          size="small"
          inputRef={searchInputRef}
          sx={{
            minWidth: 200,
            flex: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color={surfacesLight.text.tertiary} />
              </InputAdornment>
            ),
          }}
        />

        {/* Status filter */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            displayEmpty
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="available">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: emeraldCore.primary }} />
                Disponibles
              </Box>
            </MenuItem>
            <MenuItem value="sold">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: semanticColors.error.main }} />
                Vendidas
              </Box>
            </MenuItem>
            <MenuItem value="all">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: surfacesLight.text.secondary }} />
                Todas
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Sort dropdown */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            displayEmpty
            startAdornment={
              <InputAdornment position="start">
                <ArrowUpDown size={16} color={emeraldCore.primary} />
              </InputAdornment>
            }
            sx={{
              borderRadius: 2,
              bgcolor: alpha(emeraldCore.primary, 0.05),
              '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.1) },
              '& .MuiSelect-select': { fontWeight: 500 },
            }}
          >
            <MenuItem value="price-desc">Precio: Mayor a Menor</MenuItem>
            <MenuItem value="price-asc">Precio: Menor a Mayor</MenuItem>
            <MenuItem value="name-asc">Nombre A-Z</MenuItem>
            <MenuItem value="name-desc">Nombre Z-A</MenuItem>
            <MenuItem value="quality-premium">Mejor Calidad</MenuItem>
            <MenuItem value="item-number">Numero de Item</MenuItem>
            <MenuItem value="newest">Mas Recientes</MenuItem>
            <MenuItem value="most-searched">Más Buscados</MenuItem>
          </Select>
        </FormControl>

        {/* Type filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            displayEmpty
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">Tipo</MenuItem>
            <MenuItem value="loose">Gemas</MenuItem>
            <MenuItem value="jewelry">Joyería</MenuItem>
          </Select>
        </FormControl>

        {/* Cantidad filter */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={cantidadFilter}
            onChange={(e) => setCantidadFilter(e.target.value)}
            displayEmpty
            startAdornment={
              <InputAdornment position="start">
                <Layers size={14} color={theme.palette.text.secondary} />
              </InputAdornment>
            }
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">Cantidad</MenuItem>
            <MenuItem value="1">1 unidad</MenuItem>
            <MenuItem value="2+">2+ (Lotes)</MenuItem>
          </Select>
        </FormControl>

        {/* Advanced Filters Toggle */}
        <Button
          size="small"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          startIcon={<SlidersHorizontal size={16} />}
          endIcon={showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          sx={{
            color: theme.palette.text.secondary,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Más filtros
        </Button>

        {/* Clear filters */}
        {hasFilters && (
          <Chip
            label="Limpiar"
            size="small"
            onClick={handleClearFilters}
            sx={{
              bgcolor: alpha(semanticColors.error.main, 0.1),
              color: semanticColors.error.main,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          />
        )}
      </Box>

      {/* Advanced Filters */}
      <Collapse in={showAdvancedFilters}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default }}>
          {/* Color filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">Todos colores</MenuItem>
              {colors.map((color) => (
                <MenuItem key={color} value={color}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getColorDot(color) }} />
                    {color.replace('Verde ', '')}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Shape filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={shapeFilter}
              onChange={(e) => setShapeFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">Talla</MenuItem>
              {shapes.map((shape) => (
                <MenuItem key={shape} value={shape}>
                  {shape}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Quality filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">Calidad</MenuItem>
              {qualities.map((quality) => (
                <MenuItem key={quality} value={quality}>
                  {quality}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Colección filter */}
          {colecciones.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={coleccionFilter}
                onChange={(e) => setColeccionFilter(e.target.value)}
                displayEmpty
                sx={{
                  borderRadius: 2,
                  bgcolor: coleccionFilter !== 'all' ? alpha(emeraldCore.primary, 0.1) : 'transparent',
                }}
              >
                <MenuItem value="all">Colección</MenuItem>
                {colecciones.map((coleccion) => (
                  <MenuItem key={coleccion} value={coleccion}>
                    {coleccion}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Price Range Slider */}
        <Box sx={{ mt: 2, px: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              Rango de Precio
            </Typography>
            <Typography variant="caption" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
              {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
            </Typography>
          </Box>
          <Slider
            value={priceRange}
            onChange={(_, value) => setPriceRange(value as [number, number])}
            min={priceMinMax.min}
            max={priceMinMax.max}
            step={100000}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatCurrency(value)}
            sx={{
              color: emeraldCore.dark,
              '& .MuiSlider-thumb': { width: 20, height: 20 },
              '& .MuiSlider-track': { height: 4 },
              '& .MuiSlider-rail': {
                height: 4,
                bgcolor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
              },
            }}
          />
        </Box>
      </Collapse>
    </>
  );
});

export default FilterContent;
