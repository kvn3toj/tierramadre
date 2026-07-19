/**
 * FilterContent Component
 *
 * Memoized filter controls for treasure browsing.
 * Extracted to prevent re-creation on every render,
 * which fixes the iPad keyboard dismissing issue.
 *
 * REFACTORED: Props grouped into logical objects to reduce prop drilling.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  Tooltip,
} from '@mui/material';
import { Button } from '../../design-system/components/Button';
import { SegmentedControl } from '../../design-system/components/SegmentedControl';
import { LogRangeSlider } from '../shared/LogRangeSlider';
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
import {
  formatCurrency,
  getColorDot,
  formatCollectionName,
} from '../../utils/formatting';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
  semanticColors,
} from '../../design-system/tokens/colors';
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

// =============================================================================
// SCROLL FADE — shared by every horizontal-scroll chip/pill row in this file
// (and MobileSearchBar's quick-access carousel). Modeled on
// RecentlyViewedCarousel, the one place this pattern was already correct.
// =============================================================================

export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update]);

  return { ref, canScrollLeft, canScrollRight };
}

export function ScrollFadeEdges({
  canScrollLeft,
  canScrollRight,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}) {
  return (
    <>
      {canScrollLeft && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 24,
            zIndex: 1,
            pointerEvents: 'none',
            background:
              'linear-gradient(to right, var(--tm-surface), transparent)',
          }}
        />
      )}
      {canScrollRight && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 24,
            zIndex: 1,
            pointerEvents: 'none',
            background:
              'linear-gradient(to left, var(--tm-surface), transparent)',
          }}
        />
      )}
    </>
  );
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

  // Scroll-fade state for the two horizontal-scroll pill rows below (category,
  // shape/quality/cantidad). Called unconditionally — Rules of Hooks — even
  // though only the compact branch renders them.
  const categoryScroll = useScrollFade<HTMLDivElement>();
  const moreFiltersScroll = useScrollFade<HTMLDivElement>();

  // Compact mode: Beautiful modern pill-based filters (mobile)
  if (compact) {
    // Common pill styles — minHeight 44 is the WCAG touch-target floor; the
    // visible chip stays compact (fontSize/gap unchanged), only the hit area
    // grows, via alignItems:center centering the label inside the taller box.
    const pillBase = {
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: cssTransition.default,
      border: '1px solid',
      minHeight: 44,
      px: 1.75,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      whiteSpace: 'nowrap' as const,
      '&:focus-visible': {
        outline: 'none',
        boxShadow: 'var(--tm-focus-ring)',
      },
    };

    const pillActive = {
      bgcolor: alpha(emeraldCore.primary, 0.15),
      borderColor: emeraldCore.primary,
      color: emeraldCore.dark,
      boxShadow: `0 2px 8px ${alpha(emeraldCore.primary, 0.2)}`,
    };

    const pillInactive = {
      bgcolor: isLight ? 'white' : surfacesDark.background.secondary,
      borderColor: isLight
        ? surfacesLight.border.light
        : surfacesDark.border.default,
      color: theme.palette.text.secondary,
      '&:hover': {
        borderColor: alpha(emeraldCore.primary, 0.5),
        bgcolor: alpha(emeraldCore.primary, 0.05),
      },
    };

    // Accessible pill — role="button" + keyboard activation + aria-pressed,
    // matching the interaction contract IOSFilterSheet's FilterRow already
    // had (this row-family didn't).
    const Pill = ({
      active,
      onClick,
      children,
    }: {
      active: boolean;
      onClick: () => void;
      children: React.ReactNode;
    }) => (
      <Box
        role="button"
        tabIndex={0}
        aria-pressed={active}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        sx={{ ...pillBase, ...(active ? pillActive : pillInactive) }}
      >
        {children}
      </Box>
    );

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
        {/* Row 1: Status segmented control, with educational tooltips per segment */}
        <SegmentedControl
          ariaLabel="Filtrar por estado"
          block
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            {
              value: 'available' as StatusFilter,
              tooltip: t.treasure.filter.availableHint,
              label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: 'var(--tm-accent-pure)',
                    }}
                  />
                  {t.treasure.filter.available}
                </Box>
              ),
            },
            {
              value: 'sold' as StatusFilter,
              tooltip: t.treasure.filter.soldHint,
              label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: 'var(--tm-danger)',
                    }}
                  />
                  {t.treasure.filter.sold}
                </Box>
              ),
            },
            {
              value: 'all' as StatusFilter,
              tooltip: t.treasure.filter.allHint,
              label: t.treasure.filter.all,
            },
          ]}
        />

        {/* Row 2: Type + Sort in pill format */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {/* Type pills */}
          {[
            { value: 'all' as TypeFilter, label: t.treasure.filter.allTypes },
            {
              value: 'loose' as TypeFilter,
              label: `💎 ${t.treasure.filter.looseStones}`,
            },
            {
              value: 'jewelry' as TypeFilter,
              label: `💍 ${t.treasure.filter.jewelry}`,
            },
          ].map((option) => (
            <Pill
              key={option.value}
              active={typeFilter === option.value}
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </Pill>
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
                  borderColor: isLight
                    ? surfacesLight.border.light
                    : surfacesDark.border.default,
                },
              }}
            >
              <MenuItem value="newest">{t.treasure.sort.newest}</MenuItem>
              {!hidePriceFilter && (
                <MenuItem value="price-desc">{`${t.treasure.filter.price} ↓`}</MenuItem>
              )}
              {!hidePriceFilter && (
                <MenuItem value="price-asc">{`${t.treasure.filter.price} ↑`}</MenuItem>
              )}
              <MenuItem value="name-asc">A-Z</MenuItem>
              <MenuItem value="quality-premium">Calidad</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Row 2.5: Category pills (from Column K) */}
        {categorias.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                mb: 0.5,
                display: 'block',
              }}
            >
              {t.treasure.filter.category}
            </Typography>
            <Box sx={{ position: 'relative' }}>
              <ScrollFadeEdges
                canScrollLeft={categoryScroll.canScrollLeft}
                canScrollRight={categoryScroll.canScrollRight}
              />
              <Box
                ref={categoryScroll.ref}
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
                <Pill
                  active={categoriaFilter === 'all'}
                  onClick={() => setCategoriaFilter('all')}
                >
                  {t.treasure.filter.allCategories}
                </Pill>
                {categorias.map((cat) => (
                  <Pill
                    key={cat}
                    active={categoriaFilter === cat}
                    onClick={() =>
                      setCategoriaFilter(categoriaFilter === cat ? 'all' : cat)
                    }
                  >
                    {cat}
                  </Pill>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* Row 3: Color swatches (visual) */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              mb: 0.5,
              display: 'block',
            }}
          >
            {t.treasure.filter.color}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Pill
              active={colorFilter === 'all'}
              onClick={() => setColorFilter('all')}
            >
              {t.treasure.filter.allColors}
            </Pill>
            {colors.slice(0, 6).map((color) => (
              <Pill
                key={color}
                active={colorFilter === color}
                onClick={() => setColorFilter(color)}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: getColorDot(color),
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                  }}
                />
                {color.replace('Verde ', '')}
              </Pill>
            ))}
          </Box>
        </Box>

        {/* Row 4: Price tiers (smart chips) - Hidden for guests with no_prices mode */}
        {!hidePriceFilter && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                mb: 0.5,
                display: 'block',
              }}
            >
              {t.treasure.filter.price}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {priceTiers.map((tier) => (
                <Pill
                  key={tier.label}
                  active={currentPriceTier === tier.label}
                  onClick={() => setPriceRange([tier.min, tier.max])}
                >
                  {tier.label}
                </Pill>
              ))}
            </Box>
          </Box>
        )}

        {/* Row 4.5: Carat tiers */}
        {caratMinMax.max > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                mb: 0.5,
                display: 'block',
              }}
            >
              {t.treasure.filter.carat}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {[
                {
                  label: t.treasure.filter.allCarats,
                  min: caratMinMax.min,
                  max: caratMinMax.max,
                },
                { label: '< 1 ct', min: caratMinMax.min, max: 1 },
                { label: '1 - 3 ct', min: 1, max: 3 },
                { label: '3 - 10 ct', min: 3, max: 10 },
                { label: '> 10 ct', min: 10, max: caratMinMax.max },
              ].map((tier) => {
                const isActive =
                  caratRange[0] === tier.min && caratRange[1] === tier.max;
                return (
                  <Pill
                    key={tier.label}
                    active={isActive}
                    onClick={() => setCaratRange([tier.min, tier.max])}
                  >
                    {tier.label}
                  </Pill>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Row 5: Additional filters (horizontal scroll) */}
        <Box sx={{ position: 'relative' }}>
          <ScrollFadeEdges
            canScrollLeft={moreFiltersScroll.canScrollLeft}
            canScrollRight={moreFiltersScroll.canScrollRight}
          />
          <Box
            ref={moreFiltersScroll.ref}
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
              <Pill
                key={shape}
                active={shapeFilter === shape}
                onClick={() =>
                  setShapeFilter(shapeFilter === shape ? 'all' : shape)
                }
              >
                {shape}
              </Pill>
            ))}

            {/* Quality pills */}
            {qualities.slice(0, 3).map((quality) => (
              <Pill
                key={quality}
                active={qualityFilter === quality}
                onClick={() =>
                  setQualityFilter(qualityFilter === quality ? 'all' : quality)
                }
              >
                {quality}
              </Pill>
            ))}

            {/* Cantidad */}
            <Pill
              active={cantidadFilter === '2+'}
              onClick={() =>
                setCantidadFilter(cantidadFilter === '2+' ? 'all' : '2+')
              }
            >
              {t.treasure.filter.lots}
            </Pill>
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
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
          mb: showAdvancedFilters ? 2 : 0,
        }}
      >
        {/* Search */}
        <TextField
          placeholder={t.treasure.search.placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => {
            if (search.trim()) {
              analyticsHook.trackSearch(search, sortedTreasure.length);
              const itemIds = sortedTreasure.map((item) => item.item);
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
              bgcolor: isLight
                ? surfacesLight.background.secondary
                : surfacesDark.background.secondary,
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
        <Tooltip
          title={t.treasure.filter.statusTooltip}
          arrow
          enterDelay={600}
          placement="top"
        >
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
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: emeraldCore.primary,
                    }}
                  />
                  {t.treasure.filter.available}
                </Box>
              </MenuItem>
              <MenuItem value="sold">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: semanticColors.error.main,
                    }}
                  />
                  {t.treasure.filter.sold}
                </Box>
              </MenuItem>
              <MenuItem value="all">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: surfacesLight.text.secondary,
                    }}
                  />
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
            {!hidePriceFilter && (
              <MenuItem value="price-desc">
                {t.treasure.sort.priceDesc}
              </MenuItem>
            )}
            {!hidePriceFilter && (
              <MenuItem value="price-asc">{t.treasure.sort.priceAsc}</MenuItem>
            )}
            <MenuItem value="name-asc">{t.treasure.sort.nameAsc}</MenuItem>
            <MenuItem value="name-desc">{t.treasure.sort.nameDesc}</MenuItem>
            <MenuItem value="quality-premium">
              {t.treasure.sort.bestQuality}
            </MenuItem>
            <MenuItem value="item-number">
              {t.treasure.sort.itemNumber}
            </MenuItem>
            <MenuItem value="most-searched">
              {t.treasure.sort.mostSearched}
            </MenuItem>
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
              bgcolor:
                categoriaFilter !== 'all'
                  ? alpha(emeraldCore.primary, 0.1)
                  : 'transparent',
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
          variant="plain"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          aria-expanded={showAdvancedFilters}
          startIcon={<SlidersHorizontal size={16} />}
          endIcon={
            showAdvancedFilters ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )
          }
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
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
            mt: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: isLight
              ? surfacesLight.border.light
              : surfacesDark.border.default,
          }}
        >
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
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: getColorDot(color),
                      }}
                    />
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
                  bgcolor:
                    coleccionFilter !== 'all'
                      ? alpha(emeraldCore.primary, 0.1)
                      : 'transparent',
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: theme.palette.text.primary }}
              >
                {t.treasure.filter.priceRange}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: emeraldCore.dark, fontWeight: 600 }}
              >
                {formatCurrency(convertPrice(priceRange[0]), currency)} -{' '}
                {formatCurrency(convertPrice(priceRange[1]), currency)}
              </Typography>
            </Box>
            <LogRangeSlider
              value={priceRange}
              onChange={setPriceRange}
              min={priceMinMax.min}
              max={priceMinMax.max}
              roundTo={1000}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) =>
                formatCurrency(convertPrice(value), currency)
              }
              getAriaLabel={(index) =>
                index === 0 ? 'Precio mínimo' : 'Precio máximo'
              }
              getAriaValueText={(value) =>
                formatCurrency(convertPrice(value), currency)
              }
              sx={{
                color: emeraldCore.dark,
                '& .MuiSlider-thumb': { width: 20, height: 20 },
                '& .MuiSlider-track': { height: 4 },
                '& .MuiSlider-rail': {
                  height: 4,
                  bgcolor: isLight
                    ? surfacesLight.border.light
                    : surfacesDark.border.default,
                },
              }}
            />
          </Box>
        )}

        {/* Carat Range Slider */}
        {caratMinMax.max > 0 && (
          <Box sx={{ mt: 2, px: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: theme.palette.text.primary }}
              >
                {t.treasure.filter.caratRange}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: emeraldCore.dark, fontWeight: 600 }}
              >
                {caratRange[0].toFixed(1)} - {caratRange[1].toFixed(1)} ct
              </Typography>
            </Box>
            <LogRangeSlider
              value={caratRange}
              onChange={setCaratRange}
              min={caratMinMax.min}
              max={caratMinMax.max}
              roundTo={0.1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value.toFixed(1)} ct`}
              getAriaLabel={(index) =>
                index === 0 ? 'Quilates mínimo' : 'Quilates máximo'
              }
              getAriaValueText={(value) => `${value.toFixed(1)} ct`}
              sx={{
                color: emeraldCore.dark,
                '& .MuiSlider-thumb': { width: 20, height: 20 },
                '& .MuiSlider-track': { height: 4 },
                '& .MuiSlider-rail': {
                  height: 4,
                  bgcolor: isLight
                    ? surfacesLight.border.light
                    : surfacesDark.border.default,
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
