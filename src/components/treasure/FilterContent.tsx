/**
 * FilterContent Component
 *
 * Memoized filter controls for treasure browsing.
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
  Tooltip,
} from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';
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
} from '../../hooks/useTreasureFiltering';
import { useTreasureAnalytics } from '../../hooks/useTreasureAnalytics';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { TreasureItem } from '../../types';
import { formatCurrency, getColorDot, formatCollectionName } from '../../utils/formatting';
import { useCurrency } from '../../contexts/CurrencyContext';
import { emeraldCore, surfacesLight, surfacesDark, semanticColors } from '../../design-system/tokens/colors';
import { cssTransition } from '../../design-system';

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
  setCategoriaFilter: (value: string) => void;
  setPriceRange: (value: [number, number]) => void;
  setCaratRange: (value: [number, number]) => void;
}

/** Filter options derived from treasure data */
export interface FilterOptions {
  colors: string[];
  shapes: string[];
  qualities: string[];
  colecciones: string[];
  categorias: string[];
  priceMinMax: { min: number; max: number };
  caratMinMax: { min: number; max: number };
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
  sortedTreasure: TreasureItem[];
  analyticsHook: ReturnType<typeof useTreasureAnalytics>;
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
  categoriaFilter: string;
  setCategoriaFilter: (value: string) => void;
  priceRange: [number, number];
  setPriceRange: (value: [number, number]) => void;
  caratRange: [number, number];
  setCaratRange: (value: [number, number]) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (value: boolean) => void;
  hasFilters: boolean;
  handleClearFilters: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  sortedTreasure: TreasureItem[];
  analyticsHook: ReturnType<typeof useTreasureAnalytics>;
  colors: string[];
  shapes: string[];
  qualities: string[];
  colecciones: string[];
  categorias: string[];
  priceMinMax: { min: number; max: number };
  caratMinMax: { min: number; max: number };
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
  categoriaFilter,
  setCategoriaFilter,
  priceRange,
  setPriceRange,
  caratRange,
  setCaratRange,
  showAdvancedFilters,
  setShowAdvancedFilters,
  hasFilters,
  handleClearFilters,
  searchInputRef,
  sortedTreasure,
  analyticsHook,
  colors,
  shapes,
  qualities,
  colecciones,
  categorias,
  priceMinMax,
  caratMinMax,
  isLight,
  theme,
  compact = false,
}: FilterContentProps) {
  // Use context to determine if prices should be shown
  const { shouldShowPrices } = usePriceShare();
  const { currency, convertPrice } = useCurrency();
  const { t } = useLanguage();
  const hidePriceFilter = !shouldShowPrices;

  // Compact mode: Beautiful modern pill-based filters (mobile)
  if (compact) {
    // Common pill styles
    const pillBase = {
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: cssTransition.default,
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
        {/* Row 1: Status segmented control (iOS-style) with educational tooltips */}
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
            { value: 'available' as StatusFilter, label: t.treasure.filter.available, dot: emeraldCore.primary, tooltip: t.treasure.filter.availableHint },
            { value: 'sold' as StatusFilter, label: t.treasure.filter.sold, dot: semanticColors.error.main, tooltip: t.treasure.filter.soldHint },
            { value: 'all' as StatusFilter, label: t.treasure.filter.all, dot: null, tooltip: t.treasure.filter.allHint },
          ].map((option) => (
            <Tooltip
              key={option.value}
              title={option.tooltip}
              arrow
              enterDelay={400}
              placement="top"
            >
              <Box
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
                  transition: cssTransition.default,
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
            </Tooltip>
          ))}
        </Box>

        {/* Row 2: Type + Sort in pill format */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {/* Type pills */}
          {[
            { value: 'all' as TypeFilter, label: t.treasure.filter.allTypes },
            { value: 'loose' as TypeFilter, label: `💎 ${t.treasure.filter.looseStones}` },
            { value: 'jewelry' as TypeFilter, label: `💍 ${t.treasure.filter.jewelry}` },
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
              <MenuItem value="newest">{t.treasure.sort.newest}</MenuItem>
              {!hidePriceFilter && <MenuItem value="price-desc">{`${t.treasure.filter.price} ↓`}</MenuItem>}
              {!hidePriceFilter && <MenuItem value="price-asc">{`${t.treasure.filter.price} ↑`}</MenuItem>}
              <MenuItem value="name-asc">A-Z</MenuItem>
              <MenuItem value="quality-premium">Calidad</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Row 2.5: Category pills (from Column K) */}
        {categorias.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
              {t.treasure.filter.category}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                overflowX: 'auto',
                pb: 0.5,
                mx: -1,
                px: 1,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              }}
            >
              <Box
                onClick={() => setCategoriaFilter('all')}
                sx={{
                  ...pillBase,
                  ...(categoriaFilter === 'all' ? pillActive : pillInactive),
                }}
              >
                {t.treasure.filter.allCategories}
              </Box>
              {categorias.map((cat) => (
                <Box
                  key={cat}
                  onClick={() => setCategoriaFilter(categoriaFilter === cat ? 'all' : cat)}
                  sx={{
                    ...pillBase,
                    ...(categoriaFilter === cat ? pillActive : pillInactive),
                  }}
                >
                  {cat}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Row 3: Color swatches (visual) */}
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
            {t.treasure.filter.color}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Box
              onClick={() => setColorFilter('all')}
              sx={{
                ...pillBase,
                ...(colorFilter === 'all' ? pillActive : pillInactive),
              }}
            >
              {t.treasure.filter.allColors}
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

        {/* Row 4: Price tiers (smart chips) - Hidden for guests with no_prices mode */}
        {!hidePriceFilter && (
          <Box>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
              {t.treasure.filter.price}
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
        )}

        {/* Row 4.5: Carat tiers */}
        {caratMinMax.max > 0 && (
          <Box>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
              {t.treasure.filter.carat}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {[
                { label: t.treasure.filter.allCarats, min: caratMinMax.min, max: caratMinMax.max },
                { label: '< 1 ct', min: caratMinMax.min, max: 1 },
                { label: '1 - 3 ct', min: 1, max: 3 },
                { label: '3 - 10 ct', min: 3, max: 10 },
                { label: '> 10 ct', min: 10, max: caratMinMax.max },
              ].map((tier) => {
                const isActive =
                  caratRange[0] === tier.min && caratRange[1] === tier.max;
                return (
                  <Box
                    key={tier.label}
                    onClick={() => setCaratRange([tier.min, tier.max])}
                    sx={{
                      ...pillBase,
                      ...(isActive ? pillActive : pillInactive),
                    }}
                  >
                    {tier.label}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

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
            {t.treasure.filter.lots}
          </Box>
        </Box>

        {/* Clear filters button */}
        {hasFilters && (
          <Chip
            label={`✕ ${t.treasure.filter.clearFilters}`}
            size="small"
            onClick={handleClearFilters}
            sx={{
              alignSelf: 'flex-start',
              borderRadius: '16px',
              bgcolor: alpha(semanticColors.error.main, 0.08),
              color: semanticColors.error.dark,
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
          placeholder={t.treasure.search.placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => {
            if (search.trim()) {
              analyticsHook.trackSearch(search, sortedTreasure.length);
              const itemIds = sortedTreasure.map(item => item.item);
              analyticsHook.trackSearchHits(itemIds);
            }
          }}
          size="small"
          inputRef={searchInputRef}
          inputProps={{ 'aria-label': t.treasure.search.ariaLabel }}
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

        {/* Status filter with tooltip */}
        <Tooltip title={t.treasure.filter.statusTooltip} arrow enterDelay={600} placement="top">
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              displayEmpty
              aria-label="Filtrar por estado"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="available">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: emeraldCore.primary }} />
                  {t.treasure.filter.available}
                </Box>
              </MenuItem>
              <MenuItem value="sold">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: semanticColors.error.main }} />
                  {t.treasure.filter.sold}
                </Box>
              </MenuItem>
              <MenuItem value="all">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: surfacesLight.text.secondary }} />
                  {t.treasure.filter.all}
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Tooltip>

        {/* Sort dropdown */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            displayEmpty
            aria-label="Ordenar productos"
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
            <MenuItem value="newest">{t.treasure.sort.newest}</MenuItem>
            {!hidePriceFilter && <MenuItem value="price-desc">{t.treasure.sort.priceDesc}</MenuItem>}
            {!hidePriceFilter && <MenuItem value="price-asc">{t.treasure.sort.priceAsc}</MenuItem>}
            <MenuItem value="name-asc">{t.treasure.sort.nameAsc}</MenuItem>
            <MenuItem value="name-desc">{t.treasure.sort.nameDesc}</MenuItem>
            <MenuItem value="quality-premium">{t.treasure.sort.bestQuality}</MenuItem>
            <MenuItem value="item-number">{t.treasure.sort.itemNumber}</MenuItem>
            <MenuItem value="most-searched">{t.treasure.sort.mostSearched}</MenuItem>
          </Select>
        </FormControl>

        {/* Category filter (Column K from inventory) */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            displayEmpty
            aria-label="Filtrar por categoría"
            sx={{
              borderRadius: 2,
              bgcolor: categoriaFilter !== 'all' ? alpha(emeraldCore.primary, 0.1) : 'transparent',
            }}
          >
            <MenuItem value="all">{t.treasure.filter.category}</MenuItem>
            {categorias.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Type filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            displayEmpty
            aria-label="Filtrar por tipo"
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">{t.treasure.filter.type}</MenuItem>
            <MenuItem value="loose">{t.treasure.filter.looseStones}</MenuItem>
            <MenuItem value="jewelry">{t.treasure.filter.jewelry}</MenuItem>
          </Select>
        </FormControl>

        {/* Cantidad filter */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={cantidadFilter}
            onChange={(e) => setCantidadFilter(e.target.value)}
            displayEmpty
            aria-label="Filtrar por cantidad"
            startAdornment={
              <InputAdornment position="start">
                <Layers size={14} color={theme.palette.text.secondary} />
              </InputAdornment>
            }
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">{t.treasure.filter.quantity}</MenuItem>
            <MenuItem value="1">{t.treasure.filter.singleUnit}</MenuItem>
            <MenuItem value="2+">{t.treasure.filter.lots}</MenuItem>
          </Select>
        </FormControl>

        {/* Advanced Filters Toggle */}
        <Button
          size="small"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          aria-expanded={showAdvancedFilters}
          startIcon={<SlidersHorizontal size={16} />}
          endIcon={showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          sx={{
            color: theme.palette.text.secondary,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          {t.treasure.filter.moreFilters}
        </Button>

        {/* Clear filters */}
        {hasFilters && (
          <Chip
            label={t.treasure.filter.clear}
            size="small"
            onClick={handleClearFilters}
            sx={{
              bgcolor: alpha(semanticColors.error.main, 0.1),
              color: semanticColors.error.dark,
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
              aria-label="Filtrar por color"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">{t.treasure.filter.allColors}</MenuItem>
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
              aria-label="Filtrar por talla"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">{t.treasure.filter.shape}</MenuItem>
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
              aria-label="Filtrar por calidad"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">{t.treasure.filter.quality}</MenuItem>
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
                aria-label="Filtrar por colección"
                sx={{
                  borderRadius: 2,
                  bgcolor: coleccionFilter !== 'all' ? alpha(emeraldCore.primary, 0.1) : 'transparent',
                }}
              >
                <MenuItem value="all">{t.treasure.filter.collection}</MenuItem>
                {colecciones.map((coleccion) => (
                  <MenuItem key={coleccion} value={coleccion}>
                    {formatCollectionName(coleccion)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Price Range Slider - Hidden for guests with no_prices mode */}
        {!hidePriceFilter && (
          <Box sx={{ mt: 2, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t.treasure.filter.priceRange}
              </Typography>
              <Typography variant="caption" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
                {formatCurrency(convertPrice(priceRange[0]), currency)} - {formatCurrency(convertPrice(priceRange[1]), currency)}
              </Typography>
            </Box>
            <Slider
              value={priceRange}
              onChange={(_, value) => setPriceRange(value as [number, number])}
              min={priceMinMax.min}
              max={priceMinMax.max}
              step={100000}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => formatCurrency(convertPrice(value), currency)}
              aria-label="Rango de precio"
              getAriaValueText={(value) => formatCurrency(convertPrice(value), currency)}
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
        )}

        {/* Carat Range Slider */}
        {caratMinMax.max > 0 && (
          <Box sx={{ mt: 2, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t.treasure.filter.caratRange}
              </Typography>
              <Typography variant="caption" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
                {caratRange[0].toFixed(1)} - {caratRange[1].toFixed(1)} ct
              </Typography>
            </Box>
            <Slider
              value={caratRange}
              onChange={(_, value) => setCaratRange(value as [number, number])}
              min={caratMinMax.min}
              max={caratMinMax.max}
              step={0.1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value.toFixed(1)} ct`}
              aria-label={t.treasure.filter.caratRange}
              getAriaValueText={(value) => `${value.toFixed(1)} ct`}
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
        )}
      </Collapse>
    </>
  );
});

export default FilterContent;
