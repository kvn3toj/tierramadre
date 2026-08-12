import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  ButtonBase,
  alpha,
  useTheme,
  Collapse,
  Card,
  CardMedia,
} from '@mui/material';
import { Search, X, Heart, SlidersHorizontal, Clock } from 'lucide-react';
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
} from '../../../design-system/tokens/colors';
import {
  accentColors,
  blurValues,
  zIndex,
  cssTransition,
  blackAlpha,
  whiteAlpha,
  hitSlop,
} from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ActiveFilterChips } from '../';
import { useScrollFade, ScrollFadeEdges } from '../FilterContent';
import { useCurrencyFormat } from '../../../contexts/CurrencyContext';
import { usePriceShare } from '../../../contexts/PriceShareContext';
import type {
  TreasureFilters,
  StatusFilter,
  TypeFilter,
  HeroCategoryFilter,
} from '../../../hooks/useTreasureFiltering';
import type { TreasureItem } from '../../../types';
// Logo placeholder for products without images
import logoPlaceholder from '../../../assets/logo-symbol.png';

type QuickAccessTab = 'recent' | 'favorites';

export interface MobileSearchBarProps {
  search: string;
  setSearch: (value: string) => void;
  isLight: boolean;
  filterSheetOpen: boolean;
  setFilterSheetOpen: (open: boolean) => void;
  hasFilters: boolean;
  activeFilterCount: number;
  filters: TreasureFilters;
  priceMinMax: { min: number; max: number };
  caratMinMax: { min: number; max: number };
  setColorFilter: (v: string) => void;
  setQualityFilter: (v: string) => void;
  setTypeFilter: (v: TypeFilter) => void;
  setStatusFilter: (v: StatusFilter) => void;
  setShapeFilter: (v: string) => void;
  setCantidadFilter: (v: string) => void;
  setCategoriaFilter: (v: string) => void;
  setHeroCategoryFilter: (v: HeroCategoryFilter) => void;
  setPriceRange: (v: [number, number]) => void;
  setCaratRange: (v: [number, number]) => void;
  // Favorites
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (v: boolean) => void;
  favoritesCount: number;
  isProviderMode: boolean;
  // Results count, after every filter (search, colour, quality, …)
  filteredCount: number;
  /**
   * The origin-filtered total. On desktop the header prints it; on the phone
   * nothing does, by design. Either way it is the baseline this bar compares
   * against to decide whether a number is worth showing: equal means the filters
   * narrowed nothing, and a count that never changes is decoration.
   */
  originCount?: number;
  // Recently viewed items (merged)
  recentlyViewedItems?: TreasureItem[];
  onRecentItemClick?: (item: TreasureItem) => void;
  onClearRecent?: () => void;
  // Favorite items for quick access panel
  favoriteItems?: TreasureItem[];
}

export default function MobileSearchBar({
  search,
  setSearch,
  isLight,
  filterSheetOpen,
  setFilterSheetOpen,
  hasFilters,
  activeFilterCount,
  filters,
  priceMinMax,
  caratMinMax,
  setColorFilter,
  setQualityFilter,
  setTypeFilter,
  setStatusFilter,
  setShapeFilter,
  setCantidadFilter,
  setCategoriaFilter,
  setHeroCategoryFilter,
  setPriceRange,
  setCaratRange,
  showFavoritesOnly,
  setShowFavoritesOnly,
  favoritesCount,
  isProviderMode,
  filteredCount,
  originCount,
  recentlyViewedItems = [],
  onRecentItemClick,
  onClearRecent,
  favoriteItems = [],
}: MobileSearchBarProps) {
  const { t } = useLanguage();
  const theme = useTheme();
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickAccessTab>('recent');
  const quickAccessScroll = useScrollFade<HTMLDivElement>();
  const { formatCurrency } = useCurrencyFormat();
  const { shouldShowPrices } = usePriceShare();

  // Only worth printing a count here if it differs from the one the header is
  // already showing. When `originCount` is not supplied we cannot compare, so
  // fall back to the old always-on behaviour rather than silently hiding data.
  const showNarrowedCount =
    originCount === undefined || filteredCount !== originCount;

  // Determine which items to show based on active tab
  const quickAccessItems =
    activeTab === 'recent' ? recentlyViewedItems : favoriteItems;
  const hasRecentItems = recentlyViewedItems.length > 0;
  const hasFavoriteItems = favoriteItems.length > 0;
  const hasQuickAccessContent = hasRecentItems || hasFavoriteItems;

  // Auto-select initial tab based on available content (only on first open)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!quickAccessOpen) {
      hasInitialized.current = false;
      return;
    }
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    if (!hasRecentItems && hasFavoriteItems) {
      setActiveTab('favorites');
    } else if (hasRecentItems) {
      setActiveTab('recent');
    }
  }, [quickAccessOpen, hasRecentItems, hasFavoriteItems]);

  const handleQuickAccessToggle = useCallback(() => {
    setQuickAccessOpen((prev) => !prev);
  }, []);

  return (
    <>
      {/* Search Bar + Quick Actions - Sticky */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: zIndex.base,
          bgcolor: isLight
            ? alpha(surfacesLight.background.primary, 0.92)
            : alpha(surfacesDark.background.primary, 0.92),
          backdropFilter: `blur(${blurValues.lg})`,
          WebkitBackdropFilter: `blur(${blurValues.lg})`,
          // Negative margin cancels the shell's 16px edge so the translucent
          // band reaches the screen edges, then px puts the controls back on the
          // same 16px line the grid starts at. Was -1/1 when TreasureBrowser
          // still added 8px of its own; that padding is gone, so this follows.
          mx: -2,
          px: 2,
          pt: 0.75,
          pb: 0.5,
        }}
      >
        {/* The single row: search · quick access · filters.
            Origin used to sit here as a chip strip, and it was a mistake: a
            horizontally-scrolling strip wedged between a text field and two
            buttons has no axis lock, so dragging it dragged the whole row and
            fought the vertical scroll of the grid underneath. Origin is a filter
            like any other and now lives in the filter sheet with the rest; the
            search field takes the width that buys. */}
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t.treasure.search.placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            inputProps={{ 'aria-label': t.treasure.search.ariaLabel }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearch('')}
                    aria-label={t.treasure.search.clearAriaLabel}
                    // 36x36 painted inside a 38px-tall field — a real 44px
                    // box will not fit, so grow only the tap area.
                    sx={{ width: 36, height: 36, ...hitSlop() }}
                  >
                    <X size={14} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              // Shares the row with the chip strip: allowed to shrink, but never
              // past the point where the placeholder stops being readable.
              flex: '1 1 auto',
              minWidth: 104,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                height: 38,
                bgcolor: isLight
                  ? surfacesLight.background.primary
                  : surfacesDark.background.secondary,
                '& fieldset': {
                  borderColor: isLight
                    ? surfacesLight.border.light
                    : surfacesDark.border.light,
                },
                '&.Mui-focused fieldset': {
                  borderColor: emeraldCore.primary,
                },
              },
            }}
          />

          {/* Quick access toggle (heart/clock) - combines recent + favs */}
          {!isProviderMode && hasQuickAccessContent && (
            <IconButton
              onClick={handleQuickAccessToggle}
              aria-label={
                quickAccessOpen
                  ? t.treasure.quickAccess.close
                  : t.treasure.quickAccess.open
              }
              aria-expanded={quickAccessOpen}
              sx={{
                ...hitSlop(),
                width: 38,
                height: 38,
                borderRadius: 2.5,
                bgcolor: quickAccessOpen
                  ? alpha(emeraldCore.primary, 0.15)
                  : showFavoritesOnly
                    ? alpha(accentColors.error.light, 0.12)
                    : isLight
                      ? surfacesLight.background.secondary
                      : surfacesDark.background.tertiary,
                border: '1px solid',
                borderColor: quickAccessOpen
                  ? emeraldCore.primary
                  : showFavoritesOnly
                    ? accentColors.error.light
                    : isLight
                      ? surfacesLight.border.light
                      : surfacesDark.border.light,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {activeTab === 'favorites' || showFavoritesOnly ? (
                <Heart
                  size={16}
                  fill={showFavoritesOnly ? accentColors.error.light : 'none'}
                  color={
                    showFavoritesOnly
                      ? accentColors.error.light
                      : quickAccessOpen
                        ? emeraldCore.primary
                        : theme.palette.text.secondary
                  }
                />
              ) : (
                <Clock
                  size={16}
                  color={
                    quickAccessOpen
                      ? emeraldCore.primary
                      : theme.palette.text.secondary
                  }
                />
              )}
              {/* Badge showing count */}
              {(favoritesCount > 0 || recentlyViewedItems.length > 0) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    minWidth: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: showFavoritesOnly
                      ? accentColors.error.light
                      : emeraldCore.primary,
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {activeTab === 'favorites'
                    ? favoritesCount
                    : recentlyViewedItems.length}
                </Box>
              )}
            </IconButton>
          )}

          {/* Filter toggle button */}
          <IconButton
            onClick={() => setFilterSheetOpen(!filterSheetOpen)}
            aria-label="Filtros"
            sx={{
              ...hitSlop(),
              width: 38,
              height: 38,
              borderRadius: 2.5,
              flexShrink: 0,
              bgcolor:
                filterSheetOpen || hasFilters
                  ? alpha(emeraldCore.primary, 0.15)
                  : isLight
                    ? surfacesLight.background.secondary
                    : surfacesDark.background.tertiary,
              border: '1px solid',
              borderColor:
                filterSheetOpen || hasFilters
                  ? emeraldCore.primary
                  : isLight
                    ? surfacesLight.border.light
                    : surfacesDark.border.light,
              position: 'relative',
            }}
          >
            <SlidersHorizontal
              size={16}
              color={
                filterSheetOpen || hasFilters
                  ? emeraldCore.primary
                  : theme.palette.text.secondary
              }
            />
            {activeFilterCount > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  minWidth: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: emeraldCore.primary,
                  color: 'white',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeFilterCount}
              </Box>
            )}
          </IconButton>
        </Box>

        {/* Row 2: filter chips + narrowed count.
            Renders ONLY when it has something to say. It used to render always,
            reserving 24px + margin under the search on every screen, and its
            count repeated the header's: with no filters on, "486 esmeraldas en
            total" sat two rows under "Catálogo · 486 PIEZAS". Same number,
            twice, ~100px apart.
            The count now appears only when filters actually narrowed the set,
            which is the only time it differs from the header and the only time
            it tells you anything. */}
        {!filterSheetOpen && (hasFilters || showNarrowedCount) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5,
              minHeight: 24,
            }}
          >
            {/* Active filter chips - compact mode */}
            {hasFilters && (
              <Box
                sx={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0.5 }}
              >
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
                  onClearHeroCategory={() => setHeroCategoryFilter('all')}
                  onClearPrice={() =>
                    setPriceRange([priceMinMax.min, priceMinMax.max])
                  }
                  onClearCarat={() =>
                    setCaratRange([caratMinMax.min, caratMinMax.max])
                  }
                  caratMinMax={caratMinMax}
                  compact
                />
              </Box>
            )}

            {/* Narrowed count — only when the filters changed the number the
                header is already showing. */}
            {showNarrowedCount && (
              <Typography
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.7rem',
                  ml: 'auto',
                  flexShrink: 0,
                  letterSpacing: '0.01em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {filteredCount} {t.treasure.totalEmeralds}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Collapsible Quick Access Panel (Recent / Favorites) */}
      <Collapse in={quickAccessOpen} timeout={200} unmountOnExit>
        <Box
          sx={{
            // Matches the sticky band above — same bleed, same content line.
            mx: -2,
            px: 2,
            pb: 1,
            bgcolor: isLight
              ? alpha(emeraldCore.lightest, 0.2)
              : alpha(surfacesDark.background.tertiary, 0.4),
            borderBottom: '1px solid',
            borderColor: isLight
              ? surfacesLight.border.light
              : surfacesDark.border.light,
          }}
        >
          {/* Tab selector */}
          <Box sx={{ display: 'flex', gap: 0, mb: 0.75 }}>
            {hasRecentItems && (
              <Box
                role="tab"
                tabIndex={0}
                aria-selected={activeTab === 'recent'}
                onClick={() => setActiveTab('recent')}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab('recent');
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  // py grown (was 0.75) for a >=44px row. Deliberately NOT
                  // hitSlop(): these tabs sit in a `gap: 0` flex row, where
                  // overlapping slops would steal each other's presses.
                  py: 1.75,
                  gap: 0.5,
                  px: 1.5,
                  cursor: 'pointer',
                  borderBottom: '2px solid',
                  borderColor:
                    activeTab === 'recent'
                      ? emeraldCore.primary
                      : 'transparent',
                  transition: cssTransition.fast,
                  '&:focus-visible': {
                    outline: 'none',
                    boxShadow: 'var(--tm-focus-ring)',
                  },
                }}
              >
                <Clock
                  size={12}
                  color={
                    activeTab === 'recent'
                      ? emeraldCore.primary
                      : theme.palette.text.secondary
                  }
                />
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: activeTab === 'recent' ? 700 : 500,
                    color:
                      activeTab === 'recent'
                        ? emeraldCore.primary
                        : theme.palette.text.secondary,
                  }}
                >
                  {t.treasure.recentlyViewed} ({recentlyViewedItems.length})
                </Typography>
              </Box>
            )}
            {!isProviderMode && (
              <Box
                role="tab"
                tabIndex={0}
                aria-selected={activeTab === 'favorites'}
                onClick={() => {
                  setActiveTab('favorites');
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab('favorites');
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  // py grown (was 0.75) for a >=44px row. Deliberately NOT
                  // hitSlop(): these tabs sit in a `gap: 0` flex row, where
                  // overlapping slops would steal each other's presses.
                  py: 1.75,
                  gap: 0.5,
                  px: 1.5,
                  cursor: 'pointer',
                  borderBottom: '2px solid',
                  borderColor:
                    activeTab === 'favorites'
                      ? accentColors.error.light
                      : 'transparent',
                  transition: cssTransition.fast,
                  '&:focus-visible': {
                    outline: 'none',
                    boxShadow: 'var(--tm-focus-ring)',
                  },
                }}
              >
                <Heart
                  size={12}
                  fill={
                    activeTab === 'favorites'
                      ? accentColors.error.light
                      : 'none'
                  }
                  color={
                    activeTab === 'favorites'
                      ? accentColors.error.light
                      : theme.palette.text.secondary
                  }
                />
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: activeTab === 'favorites' ? 700 : 500,
                    color:
                      activeTab === 'favorites'
                        ? accentColors.error.light
                        : theme.palette.text.secondary,
                  }}
                >
                  {t.treasure.favorites} ({favoritesCount})
                </Typography>
              </Box>
            )}

            {/* Actions: Clear (for recent) / Filter (for favorites) */}
            <Box
              sx={{
                ml: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {activeTab === 'recent' &&
                onClearRecent &&
                recentlyViewedItems.length > 0 && (
                  <ButtonBase
                    onClick={onClearRecent}
                    disableRipple
                    sx={{
                      // Real button: ButtonBase brings Enter/Space, focus and
                      // disabled semantics, so the hand-rolled tabIndex +
                      // onKeyDown that shadowed them are gone. `font:
                      // 'inherit'` is required — ButtonBase sets no
                      // font-family, so it would otherwise fall back to the
                      // UA button font.
                      font: 'inherit',
                      fontSize: '0.6875rem',
                      color: theme.palette.text.secondary,
                      cursor: 'pointer',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      ...hitSlop(),
                      '&:hover': { color: accentColors.error.light },
                      '&:focus-visible': {
                        outline: 'none',
                        boxShadow: 'var(--tm-focus-ring)',
                      },
                    }}
                  >
                    {t.treasure.filter.clear}
                  </ButtonBase>
                )}
              {activeTab === 'favorites' && favoritesCount > 0 && (
                <ButtonBase
                  onClick={() => {
                    setShowFavoritesOnly(!showFavoritesOnly);
                    setQuickAccessOpen(false);
                  }}
                  disableRipple
                  aria-pressed={showFavoritesOnly}
                  sx={{
                    font: 'inherit',
                    fontSize: '0.6875rem',
                    color: showFavoritesOnly
                      ? accentColors.error.light
                      : emeraldCore.primary,
                    cursor: 'pointer',
                    fontWeight: 600,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    ...hitSlop(),
                    '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.08) },
                    '&:focus-visible': {
                      outline: 'none',
                      boxShadow: 'var(--tm-focus-ring)',
                    },
                  }}
                >
                  {showFavoritesOnly
                    ? t.actions.viewAll
                    : t.actions.favoritesOnly}
                </ButtonBase>
              )}
            </Box>
          </Box>

          {/* Horizontal scroll carousel */}
          {quickAccessItems.length > 0 ? (
            <Box sx={{ position: 'relative' }}>
              <ScrollFadeEdges
                canScrollLeft={quickAccessScroll.canScrollLeft}
                canScrollRight={quickAccessScroll.canScrollRight}
              />
              <Box
                ref={quickAccessScroll.ref}
                sx={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  scrollSnapType: 'x mandatory',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                  WebkitOverflowScrolling: 'touch',
                  pb: 0.25,
                }}
              >
                {quickAccessItems.slice(0, 10).map((item) => (
                  <QuickAccessCard
                    key={item.item}
                    item={item}
                    onClick={() => {
                      onRecentItemClick?.(item);
                      setQuickAccessOpen(false);
                    }}
                    isLight={isLight}
                    hidePrice={!shouldShowPrices}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Typography
                sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}
              >
                {activeTab === 'favorites'
                  ? t.treasure.quickAccess.noFavorites
                  : t.treasure.quickAccess.noRecent}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </>
  );
}

/** Compact card for quick access panel */
function QuickAccessCard({
  item,
  onClick,
  isLight,
  hidePrice,
  formatCurrency,
}: {
  item: TreasureItem;
  onClick: () => void;
  isLight: boolean;
  hidePrice?: boolean;
  formatCurrency: (v: number) => string;
}) {
  const displayName = item.nombre
    .replace(/^L:.*?\s/, '')
    .replace(/^L:/, '')
    .trim();

  return (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{
        width: 72,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: isLight
          ? surfacesLight.border.light
          : surfacesDark.border.light,
        bgcolor: isLight
          ? surfacesLight.background.primary
          : surfacesDark.background.secondary,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: cssTransition.fast,
        '&:hover': {
          borderColor: emeraldCore.primary,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {item.imagen ? (
          <CardMedia
            component="img"
            image={item.thumbnailUrl || item.imagen}
            alt={displayName}
            sx={{ height: 56, objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              height: 56,
              bgcolor: isLight
                ? surfacesLight.background.tertiary
                : surfacesDark.background.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={logoPlaceholder}
              alt=""
              sx={{ width: 20, height: 'auto', opacity: 0.28 }}
            />
          </Box>
        )}
        {!hidePrice && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              bgcolor: blackAlpha(0.5),
              borderRadius: '3px',
              px: 0.3,
              py: 0.1,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.5rem',
                color: whiteAlpha(0.85),
                fontWeight: 500,
              }}
            >
              {formatCurrency(item.precioCOP)}
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ px: 0.4, py: 0.3 }}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '0.55rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isLight
              ? surfacesLight.text.primary
              : surfacesDark.text.primary,
            lineHeight: 1.2,
          }}
        >
          {displayName}
        </Typography>
      </Box>
    </Card>
  );
}
