/**
 * IOSFilterSheet Component
 *
 * iOS HIG-compliant modal bottom sheet for treasure filters.
 * - Swipeable with grabber handle
 * - Modal behavior (blocks grid interaction)
 * - Sections: Sort, Type, Color, Shape, Quality, Price
 * - Spring animations
 */

import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  Chip,
  Button,
  Slider,
  alpha,
} from '@mui/material';
import { X, Check, Trash2 } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import {
  type StatusFilter,
  type TypeFilter,
  type SortOption,
} from '../../hooks/useTreasureFiltering';
import { formatCurrency, getColorDot } from '../../utils/formatting';
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
  semanticColors,
} from '../../design-system/tokens/colors';
import {
  iosTypographyScale,
  radius,
  animation,
  iosSemanticColors,
} from '../../design-system';

export interface IOSFilterSheetProps {
  open: boolean;
  onClose: () => void;
  // Filter values
  statusFilter: StatusFilter;
  sortBy: SortOption;
  typeFilter: TypeFilter;
  colorFilter: string;
  shapeFilter: string;
  qualityFilter: string;
  priceRange: [number, number];
  cantidadFilter: string;
  // Setters
  setStatusFilter: (value: StatusFilter) => void;
  setSortBy: (value: SortOption) => void;
  setTypeFilter: (value: TypeFilter) => void;
  setColorFilter: (value: string) => void;
  setShapeFilter: (value: string) => void;
  setQualityFilter: (value: string) => void;
  setPriceRange: (value: [number, number]) => void;
  setCantidadFilter: (value: string) => void;
  // Options
  colors: string[];
  shapes: string[];
  qualities: string[];
  priceMinMax: { min: number; max: number };
  // Actions
  hasFilters: boolean;
  onClearFilters: () => void;
  // Price visibility
  hidePriceFilter?: boolean;
}

const IOSFilterSheet: React.FC<IOSFilterSheetProps> = ({
  open,
  onClose,
  statusFilter,
  sortBy,
  typeFilter,
  colorFilter,
  shapeFilter,
  qualityFilter,
  priceRange,
  cantidadFilter,
  setStatusFilter,
  setSortBy,
  setTypeFilter,
  setColorFilter,
  setShapeFilter,
  setQualityFilter,
  setPriceRange,
  setCantidadFilter,
  colors,
  shapes,
  qualities,
  priceMinMax,
  hasFilters,
  onClearFilters,
  hidePriceFilter = false,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  // Chip styles
  const getChipStyle = (isActive: boolean) => ({
    height: 36,
    borderRadius: radius.full,
    fontSize: iosTypographyScale.footnote,
    fontWeight: isActive ? 600 : 500,
    px: 1,
    transition: animation.transition.fast,
    bgcolor: isActive
      ? alpha(emeraldCore.primary, 0.15)
      : isLight
        ? surfacesLight.background.secondary
        : surfacesDark.background.tertiary,
    color: isActive ? emeraldCore.dark : secondaryLabelColor,
    border: '1px solid',
    borderColor: isActive
      ? emeraldCore.primary
      : isLight
        ? surfacesLight.border.light
        : surfacesDark.border.light,
    '&:hover': {
      bgcolor: isActive
        ? alpha(emeraldCore.primary, 0.2)
        : alpha(emeraldCore.primary, 0.05),
    },
  });

  // Price tiers
  const priceTiers = [
    { label: 'Todos', min: priceMinMax.min, max: priceMinMax.max },
    { label: '< $1M', min: priceMinMax.min, max: 1000000 },
    { label: '$1M - $5M', min: 1000000, max: 5000000 },
    { label: '$5M - $20M', min: 5000000, max: 20000000 },
    { label: '> $20M', min: 20000000, max: priceMinMax.max },
  ];

  const getCurrentPriceTier = useCallback(() => {
    const [min, max] = priceRange;
    if (min === priceMinMax.min && max === priceMinMax.max) return 'Todos';
    if (min === priceMinMax.min && max <= 1000000) return '< $1M';
    if (min >= 1000000 && max <= 5000000) return '$1M - $5M';
    if (min >= 5000000 && max <= 20000000) return '$5M - $20M';
    if (min >= 20000000) return '> $20M';
    return null;
  }, [priceRange, priceMinMax]);

  const handleApply = () => {
    onClose();
  };

  const handleClear = () => {
    onClearFilters();
    onClose();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          maxHeight: '85vh',
          bgcolor: isLight
            ? surfacesLight.background.primary
            : surfacesDark.background.primary,
          // iOS glass effect
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        },
      }}
      // Modal behavior - blocks interaction with content behind
      ModalProps={{
        keepMounted: true,
      }}
    >
      {/* Grabber handle */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pt: 1.5,
          pb: 1,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 5,
            borderRadius: 3,
            bgcolor: isLight
              ? surfacesLight.border.default
              : surfacesDark.border.default,
          }}
        />
      </Box>

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          pb: 2,
          borderBottom: '0.5px solid',
          borderColor: isLight
            ? surfacesLight.border.light
            : surfacesDark.border.light,
        }}
      >
        <Typography
          sx={{
            fontSize: iosTypographyScale.title3,
            fontWeight: 600,
            color: labelColor,
          }}
        >
          Filtros
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            width: 32,
            height: 32,
            bgcolor: isLight
              ? surfacesLight.background.secondary
              : surfacesDark.background.tertiary,
          }}
        >
          <X size={18} color={secondaryLabelColor} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box
        sx={{
          overflowY: 'auto',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Status Section */}
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: 600,
              color: secondaryLabelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 1.5,
            }}
          >
            Estado
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { value: 'available' as StatusFilter, label: 'Disponibles', dot: emeraldCore.primary },
              { value: 'sold' as StatusFilter, label: 'Vendidas', dot: semanticColors.error.main },
              { value: 'all' as StatusFilter, label: 'Todas', dot: null },
            ].map((option) => (
              <Chip
                key={option.value}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {option.dot && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: option.dot,
                        }}
                      />
                    )}
                    {option.label}
                  </Box>
                }
                onClick={() => setStatusFilter(option.value)}
                sx={getChipStyle(statusFilter === option.value)}
              />
            ))}
          </Box>
        </Box>

        {/* Sort Section */}
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: 600,
              color: secondaryLabelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 1.5,
            }}
          >
            Ordenar
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { value: 'price-desc' as SortOption, label: 'Precio Mayor' },
              { value: 'price-asc' as SortOption, label: 'Precio Menor' },
              { value: 'name-asc' as SortOption, label: 'A-Z' },
              { value: 'newest' as SortOption, label: 'Recientes' },
              { value: 'quality-premium' as SortOption, label: 'Calidad' },
            ].map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => setSortBy(option.value)}
                sx={getChipStyle(sortBy === option.value)}
              />
            ))}
          </Box>
        </Box>

        {/* Type Section */}
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: 600,
              color: secondaryLabelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 1.5,
            }}
          >
            Tipo
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { value: 'all' as TypeFilter, label: 'Todo' },
              { value: 'loose' as TypeFilter, label: 'Gemas' },
              { value: 'jewelry' as TypeFilter, label: 'Joyeria' },
            ].map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => setTypeFilter(option.value)}
                sx={getChipStyle(typeFilter === option.value)}
              />
            ))}
          </Box>
        </Box>

        {/* Color Section */}
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: 600,
              color: secondaryLabelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 1.5,
            }}
          >
            Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Todos"
              onClick={() => setColorFilter('all')}
              sx={getChipStyle(colorFilter === 'all')}
            />
            {colors.slice(0, 8).map((color) => (
              <Chip
                key={color}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: getColorDot(color),
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                    {color.replace('Verde ', '')}
                  </Box>
                }
                onClick={() => setColorFilter(color)}
                sx={getChipStyle(colorFilter === color)}
              />
            ))}
          </Box>
        </Box>

        {/* Shape Section */}
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: 600,
              color: secondaryLabelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 1.5,
            }}
          >
            Talla
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Todas"
              onClick={() => setShapeFilter('all')}
              sx={getChipStyle(shapeFilter === 'all')}
            />
            {shapes.slice(0, 6).map((shape) => (
              <Chip
                key={shape}
                label={shape}
                onClick={() => setShapeFilter(shape)}
                sx={getChipStyle(shapeFilter === shape)}
              />
            ))}
          </Box>
        </Box>

        {/* Quality Section */}
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: 600,
              color: secondaryLabelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 1.5,
            }}
          >
            Calidad
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Todas"
              onClick={() => setQualityFilter('all')}
              sx={getChipStyle(qualityFilter === 'all')}
            />
            {qualities.map((quality) => (
              <Chip
                key={quality}
                label={quality}
                onClick={() => setQualityFilter(quality)}
                sx={getChipStyle(qualityFilter === quality)}
              />
            ))}
          </Box>
        </Box>

        {/* Cantidad Section */}
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: 600,
              color: secondaryLabelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 1.5,
            }}
          >
            Cantidad
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { value: 'all', label: 'Todas' },
              { value: '1', label: '1 unidad' },
              { value: '2+', label: 'Lotes (2+)' },
            ].map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => setCantidadFilter(option.value)}
                sx={getChipStyle(cantidadFilter === option.value)}
              />
            ))}
          </Box>
        </Box>

        {/* Price Section - Hidden for guests */}
        {!hidePriceFilter && (
          <Box>
            <Typography
              sx={{
                fontSize: iosTypographyScale.footnote,
                fontWeight: 600,
                color: secondaryLabelColor,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                mb: 1.5,
              }}
            >
              Precio
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {priceTiers.map((tier) => (
                <Chip
                  key={tier.label}
                  label={tier.label}
                  onClick={() => setPriceRange([tier.min, tier.max])}
                  sx={getChipStyle(getCurrentPriceTier() === tier.label)}
                />
              ))}
            </Box>

            {/* Price Range Slider */}
            <Box sx={{ px: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography
                  sx={{ fontSize: iosTypographyScale.caption1, color: secondaryLabelColor }}
                >
                  {formatCurrency(priceRange[0])}
                </Typography>
                <Typography
                  sx={{ fontSize: iosTypographyScale.caption1, color: secondaryLabelColor }}
                >
                  {formatCurrency(priceRange[1])}
                </Typography>
              </Box>
              <Slider
                value={priceRange}
                onChange={(_, value) => setPriceRange(value as [number, number])}
                min={priceMinMax.min}
                max={priceMinMax.max}
                step={100000}
                valueLabelDisplay="off"
                sx={{
                  color: emeraldCore.primary,
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    bgcolor: 'white',
                    border: `2px solid ${emeraldCore.primary}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  },
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
          </Box>
        )}
      </Box>

      {/* Footer Actions */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          p: 2,
          pt: 1.5,
          borderTop: '0.5px solid',
          borderColor: isLight
            ? surfacesLight.border.light
            : surfacesDark.border.light,
          // Safe area for bottom (16px + safe area)
          pb: `calc(16px + env(safe-area-inset-bottom))`,
        }}
      >
        {hasFilters && (
          <Button
            variant="outlined"
            startIcon={<Trash2 size={16} />}
            onClick={handleClear}
            sx={{
              flex: 1,
              height: 50,
              borderRadius: radius.lg,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: iosTypographyScale.body,
              borderColor: semanticColors.error.main,
              color: semanticColors.error.main,
              '&:hover': {
                bgcolor: alpha(semanticColors.error.main, 0.08),
                borderColor: semanticColors.error.main,
              },
            }}
          >
            Limpiar
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={<Check size={18} />}
          onClick={handleApply}
          sx={{
            flex: hasFilters ? 2 : 1,
            height: 50,
            borderRadius: radius.lg,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: iosTypographyScale.body,
            bgcolor: emeraldCore.primary,
            '&:hover': {
              bgcolor: emeraldCore.dark,
            },
          }}
        >
          Aplicar
        </Button>
      </Box>
    </Drawer>
  );
};

export default IOSFilterSheet;
