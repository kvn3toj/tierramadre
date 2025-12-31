/**
 * MoreSheetSearch - Enhanced search panel for IOSMoreSheet
 * Features:
 * - Text search with instant feedback
 * - Quick filter chips (Type, Quality, City)
 * - Results preview count
 * - Navigates to treasure with query params
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Collapse,
  Slider,
  alpha,
} from '@mui/material';
import {
  Search,
  Gem,
  Crown,
  Sparkles,
  MapPin,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTreasure } from '../../hooks/useTreasure';
import { useTreasureFiltering, TypeFilter } from '../../hooks/useTreasureFiltering';
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { formatCurrency } from '../../utils/formatting';

// Helper to generate filter chip styles
const getFilterChipSx = (isActive: boolean, color: string, hoverColor: string) => ({
  bgcolor: isActive ? color : 'transparent',
  color: isActive ? 'white' : 'var(--text-secondary)',
  border: '1px solid',
  borderColor: isActive ? color : 'var(--border-default)',
  fontWeight: 500,
  '& .MuiChip-icon': { color: isActive ? 'white' : color },
  '&:hover': {
    bgcolor: isActive ? hoverColor : alpha(color, 0.1),
  },
});

interface MoreSheetSearchProps {
  onClose: () => void;
}

const MoreSheetSearch: React.FC<MoreSheetSearchProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { treasure } = useTreasure();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Read initial values from URL params for persistence
  const urlParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  // Local filter state for preview - initialized from URL params
  const [localSearch, setLocalSearch] = useState(urlParams.get('search') || '');
  const [localTypeFilter, setLocalTypeFilter] = useState<TypeFilter>(
    (urlParams.get('type') as TypeFilter) || 'all'
  );
  const [localQualityFilter, setLocalQualityFilter] = useState(urlParams.get('quality') || 'all');
  const [localCityFilter, setLocalCityFilter] = useState(urlParams.get('city') || 'all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([
    urlParams.get('priceMin') ? parseInt(urlParams.get('priceMin')!, 10) : 0,
    urlParams.get('priceMax') ? parseInt(urlParams.get('priceMax')!, 10) : Number.MAX_SAFE_INTEGER
  ]);

  // Sync from URL on mount only (not on every render to prevent loops)
  const urlSyncDone = useRef(false);
  useEffect(() => {
    if (urlSyncDone.current) return;
    urlSyncDone.current = true;

    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    if (search !== null) setLocalSearch(search);
    const type = params.get('type') as TypeFilter;
    if (type) setLocalTypeFilter(type);
    const quality = params.get('quality');
    if (quality) setLocalQualityFilter(quality);
    const city = params.get('city');
    if (city) setLocalCityFilter(city);
  }, []);

  // Use the filtering hook for preview results
  const {
    sortedTreasure,
    filteredStats,
    filterOptions,
  } = useTreasureFiltering({
    treasure,
    initialFilters: {
      search: localSearch,
      typeFilter: localTypeFilter,
      qualityFilter: localQualityFilter,
      cityFilter: localCityFilter as any,
      statusFilter: 'available',
      priceRange: localPriceRange,
    },
  });

  // Custom hasFilters check - exclude statusFilter since 'available' is our default
  const hasActiveFilters = useMemo(() => {
    return (
      localSearch !== '' ||
      localTypeFilter !== 'all' ||
      localQualityFilter !== 'all' ||
      localCityFilter !== 'all' ||
      (filterOptions.priceMinMax.max > 0 && (
        localPriceRange[0] !== filterOptions.priceMinMax.min ||
        localPriceRange[1] !== filterOptions.priceMinMax.max
      ))
    );
  }, [localSearch, localTypeFilter, localQualityFilter, localCityFilter, localPriceRange, filterOptions.priceMinMax]);

  // Sync price range when filter options load - only once to prevent loops
  const priceRangeInitRef = useRef(false);
  useEffect(() => {
    if (!priceRangeInitRef.current && filterOptions.priceMinMax.max > 0) {
      priceRangeInitRef.current = true;
      setLocalPriceRange([filterOptions.priceMinMax.min, filterOptions.priceMinMax.max]);
    }
  }, [filterOptions.priceMinMax.min, filterOptions.priceMinMax.max]);

  // Focus search input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Build query params and navigate
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();

    const params = new URLSearchParams();

    if (localSearch.trim()) {
      params.set('search', localSearch.trim());
    }
    if (localTypeFilter !== 'all') {
      params.set('type', localTypeFilter);
    }
    if (localQualityFilter !== 'all') {
      params.set('quality', localQualityFilter);
    }
    if (localCityFilter !== 'all') {
      params.set('city', localCityFilter);
    }
    if (localPriceRange[0] !== filterOptions.priceMinMax.min) {
      params.set('priceMin', localPriceRange[0].toString());
    }
    if (localPriceRange[1] !== filterOptions.priceMinMax.max) {
      params.set('priceMax', localPriceRange[1].toString());
    }

    const queryString = params.toString();
    navigate(`/treasure${queryString ? `?${queryString}` : ''}`);
    onClose();
  };

  // Clear all filters
  const clearFilters = () => {
    setLocalSearch('');
    setLocalTypeFilter('all');
    setLocalQualityFilter('all');
    setLocalCityFilter('all');
    setLocalPriceRange([filterOptions.priceMinMax.min, filterOptions.priceMinMax.max]);
  };

  return (
    <Box>
      {/* Search Input - Enhanced for mobile */}
      <Box component="form" onSubmit={handleSearch}>
        <TextField
          fullWidth
          size="small"
          placeholder="Descubre tesoros por nombre, color, calidad..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          inputRef={searchInputRef}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} color="var(--text-tertiary)" />
              </InputAdornment>
            ),
            endAdornment: localSearch && (
              <InputAdornment position="end">
                <Box
                  component="button"
                  type="button"
                  onClick={() => setLocalSearch('')}
                  aria-label="Limpiar búsqueda"
                  sx={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-tertiary)',
                    transition: 'color 0.2s ease',
                    '&:hover': {
                      color: primitiveColors.emerald[500],
                    },
                  }}
                >
                  <X size={18} />
                </Box>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'var(--surface-primary)',
              borderRadius: spacing.md,
              fontSize: '16px', // Prevents iOS zoom on focus
              '& fieldset': {
                borderColor: 'var(--border-default)',
                borderWidth: 1.5,
              },
              '&:hover fieldset': {
                borderColor: primitiveColors.emerald[500],
              },
              '&.Mui-focused fieldset': {
                borderColor: primitiveColors.emerald[500],
                borderWidth: 2,
              },
            },
            '& .MuiInputBase-input': {
              padding: '14px 0',
              fontSize: '16px',
            },
          }}
        />
      </Box>

      {/* Quick Filter Chips */}
      <Box sx={{ mt: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'var(--text-secondary)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            mb: 1,
          }}
        >
          Filtros rápidos
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {/* Type chips */}
          <Chip
            size="small"
            icon={<Gem size={14} />}
            label="Gemas"
            onClick={() => setLocalTypeFilter(localTypeFilter === 'loose' ? 'all' : 'loose')}
            sx={getFilterChipSx(localTypeFilter === 'loose', primitiveColors.emerald[500], primitiveColors.emerald[600])}
          />
          <Chip
            size="small"
            icon={<Crown size={14} />}
            label="Joyería"
            onClick={() => setLocalTypeFilter(localTypeFilter === 'jewelry' ? 'all' : 'jewelry')}
            sx={getFilterChipSx(localTypeFilter === 'jewelry', '#D4AF37', '#B8962F')}
          />

          {/* Quality chip */}
          <Chip
            size="small"
            icon={<Sparkles size={14} />}
            label="Premium"
            onClick={() => setLocalQualityFilter(localQualityFilter === 'PREMIUM' ? 'all' : 'PREMIUM')}
            sx={getFilterChipSx(localQualityFilter === 'PREMIUM', '#D4AF37', '#B8962F')}
          />

          {/* City chips */}
          <Chip
            size="small"
            icon={<MapPin size={14} />}
            label="Cali"
            onClick={() => setLocalCityFilter(localCityFilter === 'Cali' ? 'all' : 'Cali')}
            sx={getFilterChipSx(localCityFilter === 'Cali', primitiveColors.emerald[500], primitiveColors.emerald[600])}
          />
          <Chip
            size="small"
            icon={<MapPin size={14} />}
            label="Bogotá"
            onClick={() => setLocalCityFilter(localCityFilter === 'Bogotá' ? 'all' : 'Bogotá')}
            sx={getFilterChipSx(localCityFilter === 'Bogotá', '#2563eb', '#1d4ed8')}
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <Chip
              size="small"
              icon={<X size={14} />}
              label="Limpiar"
              onClick={clearFilters}
              sx={{
                bgcolor: alpha('#ef4444', 0.1),
                color: '#ef4444',
                fontWeight: 600,
                '& .MuiChip-icon': { color: '#ef4444' },
                '&:hover': {
                  bgcolor: alpha('#ef4444', 0.2),
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Advanced Filters Toggle */}
      <Button
        size="small"
        onClick={() => setShowAdvanced(!showAdvanced)}
        startIcon={<SlidersHorizontal size={16} />}
        endIcon={showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        sx={{
          mt: 2,
          color: 'var(--text-secondary)',
          textTransform: 'none',
          fontWeight: 500,
          px: 0,
          '&:hover': {
            bgcolor: 'transparent',
            color: primitiveColors.emerald[500],
          },
        }}
      >
        Más filtros
      </Button>

      {/* Advanced Filters */}
      <Collapse in={showAdvanced}>
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--border-default)' }}>
          {/* Price Range Slider */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Rango de Precio
              </Typography>
              <Typography variant="caption" sx={{ color: primitiveColors.emerald[600], fontWeight: 600 }}>
                {formatCurrency(localPriceRange[0])} - {formatCurrency(localPriceRange[1])}
              </Typography>
            </Box>
            <Slider
              value={localPriceRange}
              onChange={(_, value) => setLocalPriceRange(value as [number, number])}
              min={filterOptions.priceMinMax.min}
              max={filterOptions.priceMinMax.max}
              step={100000}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => formatCurrency(value)}
              sx={{
                color: primitiveColors.emerald[500],
                '& .MuiSlider-thumb': { width: 20, height: 20 },
                '& .MuiSlider-track': { height: 4 },
                '& .MuiSlider-rail': {
                  height: 4,
                  bgcolor: 'var(--border-default)',
                },
              }}
            />
          </Box>

          {/* Quality options */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)', mb: 1 }}>
              Calidad
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {filterOptions.qualities.map((quality) => (
                <Chip
                  key={quality}
                  size="small"
                  label={quality}
                  onClick={() => setLocalQualityFilter(localQualityFilter === quality ? 'all' : quality)}
                  sx={{
                    bgcolor: localQualityFilter === quality ? primitiveColors.emerald[500] : 'transparent',
                    color: localQualityFilter === quality ? 'white' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: localQualityFilter === quality ? primitiveColors.emerald[500] : 'var(--border-default)',
                    fontWeight: 500,
                    '&:hover': {
                      bgcolor: localQualityFilter === quality
                        ? primitiveColors.emerald[600]
                        : alpha(primitiveColors.emerald[500], 0.1),
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Collapse>

      {/* Results Preview & Search Button */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid var(--border-default)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            {hasActiveFilters ? (
              <>
                <strong style={{ color: 'var(--text-primary)' }}>{sortedTreasure.length}</strong> resultados encontrados
              </>
            ) : (
              <>
                <strong style={{ color: 'var(--text-primary)' }}>{treasure.filter(i => i.estado?.toUpperCase() === 'DISPONIBLE').length}</strong> tesoros disponibles
              </>
            )}
          </Typography>
          {hasActiveFilters && (
            <Typography variant="caption" sx={{ color: primitiveColors.emerald[600], fontWeight: 600 }}>
              {formatCurrency(filteredStats.totalValue)}
            </Typography>
          )}
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={() => handleSearch()}
          startIcon={<Search size={18} />}
          sx={{
            backgroundColor: primitiveColors.emerald[500],
            color: 'white',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.5,
            borderRadius: spacing.md,
            '&:hover': {
              backgroundColor: primitiveColors.emerald[600],
            },
          }}
        >
          {hasActiveFilters ? `Ver ${sortedTreasure.length} resultados` : 'Explorar Tesoros'}
        </Button>
      </Box>
    </Box>
  );
};

export default MoreSheetSearch;
