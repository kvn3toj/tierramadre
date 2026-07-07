/**
 * IOSFilterSheet Component
 *
 * Clean inline filter panel with clear labels and values.
 * - Shows current filter values clearly
 * - Includes status filter (disponibles/vendidas)
 * - Tap to expand and select options
 */

import React, { useCallback, useState } from 'react';
import {
  Box,
  Chip,
  Button,
  alpha,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import { X } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { usePriceShare } from '../../contexts/PriceShareContext';
import {
  type StatusFilter,
  type TypeFilter,
  type SortOption,
} from '../../hooks/useTreasureFiltering';
import type { FilterPreset } from '../../hooks/useSavedFilters';
import { getColorDot, formatCollectionName } from '../../utils/formatting';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { semanticColors } from '../../design-system/tokens/colors';
import {
  radius,
  iosSemanticColors,
  getQuietEmerald,
} from '../../design-system';

export interface IOSFilterSheetProps {
  open: boolean;
  onClose: () => void;
  // Filter values
  statusFilter: StatusFilter;
  sortBy: SortOption;
  typeFilter: TypeFilter;
  categoriaFilter: string;
  coleccionFilter: string;
  colorFilter: string;
  shapeFilter: string;
  qualityFilter: string;
  priceRange: [number, number];
  caratRange: [number, number];
  cantidadFilter: string;
  // Setters
  setStatusFilter: (value: StatusFilter) => void;
  setSortBy: (value: SortOption) => void;
  setTypeFilter: (value: TypeFilter) => void;
  setCategoriaFilter: (value: string) => void;
  setColeccionFilter: (value: string) => void;
  setColorFilter: (value: string) => void;
  setShapeFilter: (value: string) => void;
  setQualityFilter: (value: string) => void;
  setPriceRange: (value: [number, number]) => void;
  setCaratRange: (value: [number, number]) => void;
  setCantidadFilter: (value: string) => void;
  // Options
  colors: string[];
  shapes: string[];
  qualities: string[];
  categorias: string[];
  colecciones: string[];
  priceMinMax: { min: number; max: number };
  caratMinMax: { min: number; max: number };
  // Actions
  hasFilters: boolean;
  onClearFilters: () => void;
  // Result count
  resultCount?: number;
  // Saved filter presets
  savedPresets?: FilterPreset[];
  onApplyPreset?: (preset: FilterPreset) => void;
}

const IOSFilterSheet: React.FC<IOSFilterSheetProps> = ({
  open,
  onClose,
  statusFilter,
  sortBy,
  typeFilter,
  categoriaFilter,
  coleccionFilter,
  colorFilter,
  shapeFilter,
  qualityFilter,
  priceRange,
  caratRange,
  cantidadFilter: _cantidadFilter,
  setStatusFilter,
  setSortBy,
  setTypeFilter,
  setCategoriaFilter,
  setColeccionFilter,
  setColorFilter,
  setShapeFilter,
  setQualityFilter,
  setPriceRange,
  setCaratRange,
  setCantidadFilter: _setCantidadFilter,
  colors,
  shapes,
  qualities,
  categorias,
  colecciones,
  priceMinMax,
  caratMinMax,
  hasFilters,
  onClearFilters,
  resultCount,
  savedPresets,
  onApplyPreset,
}) => {
  const { formatCurrency } = useCurrencyFormat();
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];
  const { shouldShowPrices } = usePriceShare();
  const hidePriceFilter = !shouldShowPrices;

  // Track which section is expanded
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Filter row item style
  const getFilterRowStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    py: 1,
    px: 1.5,
    cursor: 'pointer',
    borderBottom: '1px solid',
    borderColor: qe.border,
    bgcolor: isActive ? alpha(qe.accent, 0.05) : 'transparent',
    '&:hover': {
      bgcolor: alpha(qe.accent, 0.05),
    },
  });

  // Option chip style
  const getChipStyle = (isActive: boolean) => ({
    height: 44,
    borderRadius: 22,
    fontSize: '0.75rem',
    fontWeight: isActive ? 600 : 500,
    bgcolor: isActive ? alpha(qe.accent, 0.15) : qe.well,
    color: isActive ? qe.accent : secondaryLabelColor,
    border: isActive ? `1px solid ${qe.accent}` : '1px solid transparent',
    '&:hover': {
      bgcolor: alpha(qe.accent, 0.1),
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
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }, [priceRange, priceMinMax]);

  // Get labels
  const getStatusLabel = () => {
    if (statusFilter === 'available') return 'Disponibles';
    if (statusFilter === 'sold') return 'Vendidas';
    return 'Todas';
  };

  const getSortLabel = () => {
    const labels: Record<SortOption, string> = {
      'price-desc': 'Mayor precio',
      'price-asc': 'Menor precio',
      'name-asc': 'A-Z',
      'name-desc': 'Z-A',
      newest: 'Recientes',
      'quality-premium': 'Mejor calidad',
      'item-number': '# Item',
      'most-searched': 'Popular',
    };
    return labels[sortBy] || 'Recientes';
  };

  const getTypeLabel = () => {
    if (typeFilter === 'all') return 'Todos';
    if (typeFilter === 'loose') return 'Gemas';
    return 'Joyería';
  };

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Filter row component
  const FilterRow = ({
    label,
    value,
    section,
    isActive = false,
    dotColor,
  }: {
    label: string;
    value: string;
    section: string;
    isActive?: boolean;
    dotColor?: string;
  }) => (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-label={`${label}: ${value}`}
        aria-expanded={expandedSection === section}
        onClick={() => toggleSection(section)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSection(section);
          }
        }}
        sx={getFilterRowStyle(isActive || expandedSection === section)}
      >
        <Typography sx={{ fontSize: '0.8rem', color: secondaryLabelColor }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {dotColor && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: dotColor,
              }}
            />
          )}
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? qe.accent : qe.text,
            }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </>
  );

  return (
    <Collapse in={open} timeout={200}>
      <Box
        sx={{
          bgcolor: qe.surface,
          borderRadius: radius.lg,
          border: '1px solid',
          borderColor: qe.border,
          mb: 1,
          overflow: 'hidden',
        }}
      >
        {/* Saved Presets */}
        {savedPresets && savedPresets.length > 0 && onApplyPreset && (
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              overflowX: 'auto',
              px: 1.5,
              py: 1,
              borderBottom: '1px solid',
              borderColor: qe.border,
            }}
          >
            {savedPresets.map((preset) => (
              <Chip
                key={preset.id}
                label={preset.name}
                size="small"
                onClick={() => onApplyPreset(preset)}
                sx={{
                  flexShrink: 0,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  bgcolor: alpha(qe.accent, 0.08),
                  color: qe.accent,
                  border: `1px solid ${alpha(qe.accent, 0.2)}`,
                  '&:hover': { bgcolor: alpha(qe.accent, 0.15) },
                }}
              />
            ))}
          </Box>
        )}

        {/* Sort filter */}
        <FilterRow
          label="Ordenar"
          value={getSortLabel()}
          section="sort"
          isActive={sortBy !== 'newest'}
        />
        <Collapse in={expandedSection === 'sort'}>
          <Box
            sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', p: 1.5, pt: 0 }}
          >
            {[
              { value: 'newest' as SortOption, label: 'Recientes' },
              ...(!hidePriceFilter
                ? [
                    {
                      value: 'price-desc' as SortOption,
                      label: 'Mayor precio',
                    },
                    { value: 'price-asc' as SortOption, label: 'Menor precio' },
                  ]
                : []),
              { value: 'name-asc' as SortOption, label: 'A-Z' },
              {
                value: 'quality-premium' as SortOption,
                label: 'Mejor calidad',
              },
            ].map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => {
                  setSortBy(option.value);
                  setExpandedSection(null);
                }}
                sx={getChipStyle(sortBy === option.value)}
              />
            ))}
          </Box>
        </Collapse>

        {/* Category filter (Column K from inventory) */}
        <FilterRow
          label="Categoría"
          value={categoriaFilter === 'all' ? 'Todas' : categoriaFilter}
          section="categoria"
          isActive={categoriaFilter !== 'all'}
        />
        <Collapse in={expandedSection === 'categoria'}>
          <Box
            sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', p: 1.5, pt: 0 }}
          >
            <Chip
              label="Todas"
              onClick={() => {
                setCategoriaFilter('all');
                setExpandedSection(null);
              }}
              sx={getChipStyle(categoriaFilter === 'all')}
            />
            {categorias.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                onClick={() => {
                  setCategoriaFilter(cat);
                  setExpandedSection(null);
                }}
                sx={getChipStyle(categoriaFilter === cat)}
              />
            ))}
          </Box>
        </Collapse>

        {/* Colección filter (parity with desktop FilterContent) */}
        {colecciones.length > 0 && (
          <>
            <FilterRow
              label="Colección"
              value={
                coleccionFilter === 'all'
                  ? 'Todas'
                  : formatCollectionName(coleccionFilter)
              }
              section="coleccion"
              isActive={coleccionFilter !== 'all'}
            />
            <Collapse in={expandedSection === 'coleccion'}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.75,
                  flexWrap: 'wrap',
                  p: 1.5,
                  pt: 0,
                }}
              >
                <Chip
                  label="Todas"
                  onClick={() => {
                    setColeccionFilter('all');
                    setExpandedSection(null);
                  }}
                  sx={getChipStyle(coleccionFilter === 'all')}
                />
                {colecciones.map((coleccion) => (
                  <Chip
                    key={coleccion}
                    label={formatCollectionName(coleccion)}
                    onClick={() => {
                      setColeccionFilter(coleccion);
                      setExpandedSection(null);
                    }}
                    sx={getChipStyle(coleccionFilter === coleccion)}
                  />
                ))}
              </Box>
            </Collapse>
          </>
        )}

        {/* Type filter */}
        <FilterRow
          label="Tipo"
          value={getTypeLabel()}
          section="type"
          isActive={typeFilter !== 'all'}
        />
        <Collapse in={expandedSection === 'type'}>
          <Box
            sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', p: 1.5, pt: 0 }}
          >
            {[
              { value: 'all' as TypeFilter, label: 'Todos' },
              { value: 'loose' as TypeFilter, label: 'Gemas' },
              { value: 'jewelry' as TypeFilter, label: 'Joyería' },
            ].map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => {
                  setTypeFilter(option.value);
                  setExpandedSection(null);
                }}
                sx={getChipStyle(typeFilter === option.value)}
              />
            ))}
          </Box>
        </Collapse>

        {/* Color filter */}
        <FilterRow
          label="Color"
          value={
            colorFilter === 'all' ? 'Todos' : colorFilter.replace('Verde ', '')
          }
          section="color"
          isActive={colorFilter !== 'all'}
          dotColor={
            colorFilter !== 'all' ? getColorDot(colorFilter) : undefined
          }
        />
        <Collapse in={expandedSection === 'color'}>
          <Box
            sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', p: 1.5, pt: 0 }}
          >
            <Chip
              label="Todos"
              onClick={() => {
                setColorFilter('all');
                setExpandedSection(null);
              }}
              sx={getChipStyle(colorFilter === 'all')}
            />
            {colors.map((color) => (
              <Chip
                key={color}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: getColorDot(color),
                      }}
                    />
                    {color.replace('Verde ', '')}
                  </Box>
                }
                onClick={() => {
                  setColorFilter(color);
                  setExpandedSection(null);
                }}
                sx={getChipStyle(colorFilter === color)}
              />
            ))}
          </Box>
        </Collapse>

        {/* Quality filter */}
        <FilterRow
          label="Calidad"
          value={qualityFilter === 'all' ? 'Todas' : qualityFilter}
          section="quality"
          isActive={qualityFilter !== 'all'}
        />
        <Collapse in={expandedSection === 'quality'}>
          <Box
            sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', p: 1.5, pt: 0 }}
          >
            <Chip
              label="Todas"
              onClick={() => {
                setQualityFilter('all');
                setExpandedSection(null);
              }}
              sx={getChipStyle(qualityFilter === 'all')}
            />
            {qualities.map((quality) => (
              <Chip
                key={quality}
                label={quality}
                onClick={() => {
                  setQualityFilter(quality);
                  setExpandedSection(null);
                }}
                sx={getChipStyle(qualityFilter === quality)}
              />
            ))}
          </Box>
        </Collapse>

        {/* Shape filter */}
        <FilterRow
          label="Talla"
          value={shapeFilter === 'all' ? 'Todas' : shapeFilter}
          section="shape"
          isActive={shapeFilter !== 'all'}
        />
        <Collapse in={expandedSection === 'shape'}>
          <Box
            sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', p: 1.5, pt: 0 }}
          >
            <Chip
              label="Todas"
              onClick={() => {
                setShapeFilter('all');
                setExpandedSection(null);
              }}
              sx={getChipStyle(shapeFilter === 'all')}
            />
            {shapes.map((shape) => (
              <Chip
                key={shape}
                label={shape}
                onClick={() => {
                  setShapeFilter(shape);
                  setExpandedSection(null);
                }}
                sx={getChipStyle(shapeFilter === shape)}
              />
            ))}
          </Box>
        </Collapse>

        {/* Price filter */}
        {!hidePriceFilter && (
          <>
            <FilterRow
              label="Precio"
              value={getCurrentPriceTier()}
              section="price"
              isActive={
                priceRange[0] !== priceMinMax.min ||
                priceRange[1] !== priceMinMax.max
              }
            />
            <Collapse in={expandedSection === 'price'}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.75,
                  flexWrap: 'wrap',
                  p: 1.5,
                  pt: 0,
                }}
              >
                {priceTiers.map((tier) => (
                  <Chip
                    key={tier.label}
                    label={tier.label}
                    onClick={() => {
                      setPriceRange([tier.min, tier.max]);
                      setExpandedSection(null);
                    }}
                    sx={getChipStyle(getCurrentPriceTier() === tier.label)}
                  />
                ))}
              </Box>
            </Collapse>
          </>
        )}

        {/* Carat filter */}
        {caratMinMax.max > 0 && (
          <>
            <FilterRow
              label="Quilates"
              value={
                caratRange[0] === caratMinMax.min &&
                caratRange[1] === caratMinMax.max
                  ? 'Todos'
                  : `${caratRange[0].toFixed(1)} - ${caratRange[1].toFixed(1)} ct`
              }
              section="carat"
              isActive={
                caratRange[0] !== caratMinMax.min ||
                caratRange[1] !== caratMinMax.max
              }
            />
            <Collapse in={expandedSection === 'carat'}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.75,
                  flexWrap: 'wrap',
                  p: 1.5,
                  pt: 0,
                }}
              >
                {[
                  {
                    label: 'Todos',
                    min: caratMinMax.min,
                    max: caratMinMax.max,
                  },
                  { label: '< 1 ct', min: caratMinMax.min, max: 1 },
                  { label: '1 - 3 ct', min: 1, max: 3 },
                  { label: '3 - 10 ct', min: 3, max: 10 },
                  { label: '> 10 ct', min: 10, max: caratMinMax.max },
                ].map((tier) => (
                  <Chip
                    key={tier.label}
                    label={tier.label}
                    onClick={() => {
                      setCaratRange([tier.min, tier.max]);
                      setExpandedSection(null);
                    }}
                    sx={getChipStyle(
                      caratRange[0] === tier.min && caratRange[1] === tier.max,
                    )}
                  />
                ))}
              </Box>
            </Collapse>
          </>
        )}

        {/* Status filter - at bottom */}
        <FilterRow
          label="Estado"
          value={getStatusLabel()}
          section="status"
          isActive={statusFilter !== 'all'}
          dotColor={
            statusFilter === 'available'
              ? qe.accent
              : statusFilter === 'sold'
                ? semanticColors.error.main
                : undefined
          }
        />
        <Collapse in={expandedSection === 'status'}>
          <Box
            sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', p: 1.5, pt: 0 }}
          >
            {[
              { value: 'all' as StatusFilter, label: 'Todas', dot: null },
              {
                value: 'available' as StatusFilter,
                label: 'Disponibles',
                dot: qe.accent,
              },
              {
                value: 'sold' as StatusFilter,
                label: 'Vendidas',
                dot: semanticColors.error.main,
              },
            ].map((option) => (
              <Chip
                key={option.value}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {option.dot && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: option.dot,
                        }}
                      />
                    )}
                    {option.label}
                  </Box>
                }
                onClick={() => {
                  setStatusFilter(option.value);
                  setExpandedSection(null);
                }}
                sx={getChipStyle(statusFilter === option.value)}
              />
            ))}
          </Box>
        </Collapse>

        {/* Footer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 1,
            borderTop: '1px solid',
            borderColor: qe.border,
            bgcolor: alpha(qe.well, 0.3),
          }}
        >
          {resultCount !== undefined && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: qe.accent,
              }}
            >
              {resultCount} resultado{resultCount !== 1 ? 's' : ''}
            </Typography>
          )}
          {hasFilters ? (
            <Button
              size="small"
              onClick={onClearFilters}
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                color: semanticColors.error.dark,
                p: 0,
                minWidth: 'auto',
                '&:hover': { bgcolor: 'transparent' },
              }}
            >
              Limpiar filtros
            </Button>
          ) : (
            <Typography
              sx={{ fontSize: '0.75rem', color: secondaryLabelColor }}
            >
              Toca para filtrar
            </Typography>
          )}
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Cerrar filtros"
            sx={{ p: 0.5 }}
          >
            <X size={16} color={secondaryLabelColor} />
          </IconButton>
        </Box>
      </Box>
    </Collapse>
  );
};

export default IOSFilterSheet;
