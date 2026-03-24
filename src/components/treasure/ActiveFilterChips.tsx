/**
 * ActiveFilterChips Component
 *
 * Displays active filter chips with remove functionality.
 * Supports both compact (mobile) and full (desktop) layouts.
 * Extracted from TreasureBrowser to eliminate duplication.
 */
import React from 'react';
import { Box, Chip, alpha } from '@mui/material';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TreasureFilters } from '../../hooks/useTreasureFiltering';
import { formatCurrency, getColorDot } from '../../utils/formatting';
import { useCurrency } from '../../contexts/CurrencyContext';
import { emeraldCore, goldAccent, semanticColors } from '../../design-system/tokens/colors';
import { HERO_CATEGORY_LABELS, MainCategory } from '../home/sections/gallery-constants';

export interface ActiveFilterChipsProps {
  filters: TreasureFilters;
  priceMinMax: { min: number; max: number };
  onClearSearch: () => void;
  onClearColor: () => void;
  onClearQuality: () => void;
  onClearType: () => void;
  onClearStatus: () => void;
  onClearShape: () => void;
  onClearCantidad: () => void;
  onClearCategoria?: () => void;
  onClearColeccion?: () => void;
  onClearHeroCategory?: () => void;
  onClearPrice: () => void;
  onClearCarat?: () => void;
  caratMinMax?: { min: number; max: number };
  /** Compact mode for mobile - smaller chips */
  compact?: boolean;
}

interface ChipConfig {
  key: string;
  label: string;
  onDelete: () => void;
  icon?: React.ReactNode;
  colors: {
    bg: string;
    text: string;
    delete: string;
  };
}

export function ActiveFilterChips({
  filters,
  priceMinMax,
  onClearSearch,
  onClearColor,
  onClearQuality,
  onClearType,
  onClearStatus,
  onClearShape,
  onClearCantidad,
  onClearCategoria,
  onClearColeccion,
  onClearHeroCategory,
  onClearPrice,
  onClearCarat,
  caratMinMax,
  compact = false,
}: ActiveFilterChipsProps) {
  const { t } = useLanguage();
  const { currency, convertPrice } = useCurrency();
  const chipSize = compact ? 'small' : 'small';
  const iconSize = compact ? 12 : 14;
  const fontSize = compact ? '0.7rem' : undefined;

  // Build list of active filter chips
  const chips: ChipConfig[] = [];

  // Search
  if (filters.search) {
    chips.push({
      key: 'search',
      label: compact ? `"${filters.search}"` : `${t.actions.search}: "${filters.search}"`,
      onDelete: onClearSearch,
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Hero category (from home page tabs)
  if (filters.heroCategoryFilter !== 'all' && onClearHeroCategory) {
    const label = HERO_CATEGORY_LABELS[filters.heroCategoryFilter as MainCategory] || filters.heroCategoryFilter;
    chips.push({
      key: 'heroCategory',
      label: compact ? label : `Categoría: ${label}`,
      onDelete: onClearHeroCategory,
      colors: {
        bg: alpha(emeraldCore.primary, 0.15),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Price range
  const hasPriceFilter = filters.priceRange[0] !== priceMinMax.min || filters.priceRange[1] !== priceMinMax.max;
  if (hasPriceFilter) {
    chips.push({
      key: 'price',
      label: `${formatCurrency(convertPrice(filters.priceRange[0]), currency)} - ${formatCurrency(convertPrice(filters.priceRange[1]), currency)}`,
      onDelete: onClearPrice,
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Carat range
  const hasCaratFilter = caratMinMax && onClearCarat && (
    filters.caratRange[0] !== caratMinMax.min || filters.caratRange[1] !== caratMinMax.max
  );
  if (hasCaratFilter) {
    chips.push({
      key: 'carat',
      label: `${filters.caratRange[0].toFixed(1)} - ${filters.caratRange[1].toFixed(1)} ct`,
      onDelete: onClearCarat!,
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Color
  if (filters.colorFilter !== 'all') {
    chips.push({
      key: 'color',
      label: filters.colorFilter.replace('Verde ', ''),
      onDelete: onClearColor,
      icon: (
        <Box
          sx={{
            width: compact ? 8 : 10,
            height: compact ? 8 : 10,
            borderRadius: '50%',
            bgcolor: getColorDot(filters.colorFilter),
            ml: compact ? 0.5 : 1,
          }}
        />
      ),
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Quality
  if (filters.qualityFilter !== 'all') {
    chips.push({
      key: 'quality',
      label: compact ? filters.qualityFilter : `Calidad: ${filters.qualityFilter}`,
      onDelete: onClearQuality,
      colors: {
        bg: alpha(goldAccent.primary, 0.15),
        text: goldAccent.dark,
        delete: goldAccent.dark,
      },
    });
  }

  // Type
  if (filters.typeFilter !== 'all') {
    chips.push({
      key: 'type',
      label: filters.typeFilter === 'loose' ? 'Gemas' : 'Joyería',
      onDelete: onClearType,
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Status (only show if not 'available' or 'all')
  if (filters.statusFilter !== 'available' && filters.statusFilter !== 'all') {
    chips.push({
      key: 'status',
      label: filters.statusFilter === 'sold' ? t.treasure.filter.sold : t.treasure.filter.all,
      onDelete: onClearStatus,
      colors: {
        bg: alpha(semanticColors.error.main, 0.1),
        text: semanticColors.error.main,
        delete: semanticColors.error.main,
      },
    });
  }

  // Shape
  if (filters.shapeFilter !== 'all') {
    chips.push({
      key: 'shape',
      label: compact ? filters.shapeFilter : `Talla: ${filters.shapeFilter}`,
      onDelete: onClearShape,
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Cantidad
  if (filters.cantidadFilter !== 'all') {
    chips.push({
      key: 'cantidad',
      label: compact
        ? (filters.cantidadFilter === '2+' ? 'Lotes' : filters.cantidadFilter)
        : `${t.treasure.filter.quantity}: ${filters.cantidadFilter === '2+' ? 'Lotes' : filters.cantidadFilter}`,
      onDelete: onClearCantidad,
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Categoria
  if (filters.categoriaFilter !== 'all' && onClearCategoria) {
    chips.push({
      key: 'categoria',
      label: compact ? filters.categoriaFilter : `Categoría: ${filters.categoriaFilter}`,
      onDelete: onClearCategoria,
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  // Coleccion
  if (filters.coleccionFilter !== 'all' && onClearColeccion) {
    chips.push({
      key: 'coleccion',
      label: filters.coleccionFilter,
      onDelete: onClearColeccion,
      colors: {
        bg: alpha(emeraldCore.primary, 0.1),
        text: emeraldCore.dark,
        delete: emeraldCore.dark,
      },
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: compact ? 0.75 : 1,
        flexWrap: 'wrap',
        rowGap: compact ? 0.75 : undefined,
      }}
    >
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          icon={chip.icon as React.ReactElement | undefined}
          label={chip.label}
          size={chipSize}
          onDelete={chip.onDelete}
          deleteIcon={<X size={iconSize} />}
          sx={{
            bgcolor: chip.colors.bg,
            color: chip.colors.text,
            height: compact ? 32 : undefined,
            '& .MuiChip-deleteIcon': { color: chip.colors.delete },
            '& .MuiChip-label': {
              px: compact ? 1 : undefined,
              fontSize,
            },
          }}
        />
      ))}
    </Box>
  );
}

export default React.memo(ActiveFilterChips);
