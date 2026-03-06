import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { Search, X, Heart, SlidersHorizontal } from 'lucide-react';
import { emeraldCore, surfacesLight, surfacesDark } from '../../../design-system/tokens/colors';
import { accentColors } from '../../../design-system';
import { ActiveFilterChips } from '../';
import type { TreasureFilters, StatusFilter, TypeFilter, HeroCategoryFilter } from '../../../hooks/useTreasureFiltering';

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
  setColorFilter: (v: string) => void;
  setQualityFilter: (v: string) => void;
  setTypeFilter: (v: TypeFilter) => void;
  setStatusFilter: (v: StatusFilter) => void;
  setShapeFilter: (v: string) => void;
  setCantidadFilter: (v: string) => void;
  setCategoriaFilter: (v: string) => void;
  setHeroCategoryFilter: (v: HeroCategoryFilter) => void;
  setPriceRange: (v: [number, number]) => void;
  // Favorites
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (v: boolean) => void;
  favoritesCount: number;
  isProviderMode: boolean;
  // Results count
  filteredCount: number;
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
  setColorFilter,
  setQualityFilter,
  setTypeFilter,
  setStatusFilter,
  setShapeFilter,
  setCantidadFilter,
  setCategoriaFilter,
  setHeroCategoryFilter,
  setPriceRange,
  showFavoritesOnly,
  setShowFavoritesOnly,
  favoritesCount,
  isProviderMode,
  filteredCount,
}: MobileSearchBarProps) {
  const theme = useTheme();

  return (
    <>
      {/* Search Bar - Sticky */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          mb: 1,
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
          py: 1,
          mx: -1,
          px: 1,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar esmeraldas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ 'aria-label': 'Buscar productos' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color={theme.palette.text.secondary} />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearch('')}
                  aria-label="Limpiar búsqueda"
                  sx={{ width: 44, height: 44 }}
                >
                  <X size={16} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              height: 44,
              bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
              '& fieldset': {
                borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
              },
              '&.Mui-focused fieldset': {
                borderColor: emeraldCore.primary,
              },
            },
          }}
        />
        {/* Filter toggle button */}
        <IconButton
          onClick={() => setFilterSheetOpen(!filterSheetOpen)}
          aria-label="Filtros"
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            bgcolor: filterSheetOpen || hasFilters
              ? alpha(emeraldCore.primary, 0.15)
              : isLight
                ? surfacesLight.background.secondary
                : surfacesDark.background.tertiary,
            border: '1px solid',
            borderColor: filterSheetOpen || hasFilters
              ? emeraldCore.primary
              : isLight
                ? surfacesLight.border.light
                : surfacesDark.border.light,
            position: 'relative',
          }}
        >
          <SlidersHorizontal
            size={20}
            color={filterSheetOpen || hasFilters ? emeraldCore.primary : theme.palette.text.secondary}
          />
          {activeFilterCount > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: emeraldCore.primary,
                color: 'white',
                fontSize: '0.65rem',
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

      {/* Quick info row with active filters */}
      {!filterSheetOpen && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
          {/* Favorites toggle (hidden in provider mode) */}
          {!isProviderMode && (
            <Box
              role="button"
              tabIndex={0}
              aria-label={showFavoritesOnly ? 'Mostrar todos los productos' : `Mostrar solo favoritos (${favoritesCount})`}
              aria-pressed={showFavoritesOnly}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowFavoritesOnly(!showFavoritesOnly);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                px: 1.5,
                py: 1,
                minHeight: 44,
                borderRadius: '16px',
                '&:focus-visible': {
                  outline: `2px solid ${emeraldCore.primary}`,
                  outlineOffset: 2,
                },
                bgcolor: showFavoritesOnly
                  ? alpha(accentColors.error.light, 0.15)
                  : isLight
                    ? surfacesLight.background.secondary
                    : surfacesDark.background.tertiary,
                border: showFavoritesOnly ? `1px solid ${accentColors.error.light}` : 'none',
                flexShrink: 0,
              }}
            >
              <Heart
                size={14}
                fill={showFavoritesOnly ? accentColors.error.light : 'none'}
                color={showFavoritesOnly ? accentColors.error.light : theme.palette.text.secondary}
              />
              <Typography
                sx={{
                  color: showFavoritesOnly ? accentColors.error.light : theme.palette.text.secondary,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              >
                {favoritesCount}
              </Typography>
            </Box>
          )}

          {/* Active filter chips - compact mode */}
          <ActiveFilterChips
            filters={filters}
            priceMinMax={priceMinMax}
            onClearSearch={() => setSearch('')}
            onClearColor={() => setColorFilter('all')}
            onClearQuality={() => setQualityFilter('all')}
            onClearType={() => setTypeFilter('all')}
            onClearStatus={() => setStatusFilter('available')}
            onClearShape={() => setShapeFilter('all')}
            onClearCantidad={() => setCantidadFilter('all')}
            onClearCategoria={() => setCategoriaFilter('all')}
            onClearHeroCategory={() => setHeroCategoryFilter('all')}
            onClearPrice={() => setPriceRange([priceMinMax.min, priceMinMax.max])}
            compact
          />

          {/* Stats */}
          <Typography
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
              ml: 'auto',
              flexShrink: 0,
            }}
          >
            {filteredCount} items
          </Typography>
        </Box>
      )}
    </>
  );
}
