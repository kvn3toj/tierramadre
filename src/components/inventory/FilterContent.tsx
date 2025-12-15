/**
 * FilterContent Component
 *
 * Memoized filter controls for inventory browsing.
 * Extracted to prevent re-creation on every render,
 * which fixes the iPad keyboard dismissing issue.
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
import { type StatusFilter, type TypeFilter, type SortOption } from '../../hooks/useInventoryFiltering';
import { useInventoryAnalytics } from '../../hooks/useInventoryAnalytics';
import { InventoryItem } from '../../types';
import { formatCurrency, getColorDot } from '../../utils/formatting';
import { emeraldCore, surfacesLight, surfacesDark, semanticColors } from '../../design-system/tokens/colors';

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
  priceMinMax: { min: number; max: number };
  isLight: boolean;
  theme: Theme;
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
  priceMinMax,
  isLight,
  theme,
}: FilterContentProps) {
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
