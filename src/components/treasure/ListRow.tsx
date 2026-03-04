/**
 * ListRow Component
 * Compact list view row for treasure items.
 * Optimized for scanning and quick comparison.
 */
import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { Heart, Scale } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { TreasureItem } from '../../types';
import { getColorDot, getQualityBadge } from '../../utils/formatting';
import { PriceDisplay } from '../price-simulator/PriceDisplay';
import { emeraldCore, surfacesLight, surfacesDark, semanticColors } from '../../design-system/tokens/colors';
import { errorAlpha, cssTransition } from '../../design-system';

interface ListRowProps {
  item: TreasureItem;
  isFavorite: boolean;
  onItemClick: (item: TreasureItem) => void;
  onCertClick: (item: TreasureItem) => void;
  onToggleFavorite: (itemId: number) => void;
  // Comparison props
  isSelectedForComparison?: boolean;
  onToggleComparison?: (item: TreasureItem) => void;
  canAddToComparison?: boolean;
}

function ListRow({
  item,
  isFavorite,
  onItemClick,
  onToggleFavorite,
  isSelectedForComparison = false,
  onToggleComparison,
  canAddToComparison = true,
}: ListRowProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const { shouldShowPrices } = usePriceShare();

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType;

  const handleItemClick = useCallback(() => {
    onItemClick(item);
  }, [onItemClick, item]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(item.item);
  }, [onToggleFavorite, item.item]);

  const handleCompareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComparison?.(item);
  }, [onToggleComparison, item]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2.5,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
        transition: cssTransition.default,
        '&:hover': {
          borderColor: emeraldCore.dark,
          bgcolor: isLight ? emeraldCore.lightest : alpha(emeraldCore.dark, 0.08),
        },
        '&:focus-visible': {
          outline: `3px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
      onClick={handleItemClick}
      role="article"
      aria-label={`${item.nombre} - ${item.color}, ${weight}`}
      tabIndex={0}
    >
      {/* Color indicator */}
      <Box
        sx={{
          width: 8,
          height: 40,
          borderRadius: 4,
          bgcolor: colorDot,
          flexShrink: 0,
        }}
      />

      {/* Main info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          {item.color} • {weight}
        </Typography>
      </Box>

      {/* Quality badge */}
      <Chip
        label={quality.label}
        size="small"
        sx={{
          height: 22,
          fontSize: '0.6875rem',
          fontWeight: 600,
          bgcolor: quality.bg,
          color: quality.color,
          border: `1px solid ${quality.border}`,
        }}
      />

      {/* Price (hidden when prices not shown) */}
      {shouldShowPrices && (
        <Box sx={{ minWidth: 100, textAlign: 'right' }}>
          <PriceDisplay price={item.precioCOP} precioInternacional={item.precioInternacional} compact />
        </Box>
      )}

      {/* Action buttons (hidden when prices not shown - comparison requires prices) */}
      {shouldShowPrices && (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* Comparison button */}
          {onToggleComparison && (
          <IconButton
            onClick={handleCompareClick}
            aria-label={isSelectedForComparison ? 'Quitar de comparación' : 'Agregar a comparación'}
            disabled={!isSelectedForComparison && !canAddToComparison}
            size="small"
            sx={{
              color: isSelectedForComparison ? 'white' : theme.palette.text.secondary,
              bgcolor: isSelectedForComparison ? emeraldCore.primary : 'transparent',
              '&:hover': {
                bgcolor: isSelectedForComparison
                  ? emeraldCore.dark
                  : alpha(emeraldCore.primary, 0.1),
              },
              '&:disabled': {
                color: theme.palette.text.disabled,
              },
            }}
          >
            <Scale size={18} />
          </IconButton>
        )}

          {/* Favorite button */}
          <IconButton
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            size="small"
            sx={{
              color: isFavorite ? semanticColors.error.main : theme.palette.text.secondary,
              '&:hover': {
                bgcolor: isFavorite ? errorAlpha(0.1) : alpha(emeraldCore.primary, 0.1),
              },
            }}
          >
            <Heart
              size={18}
              fill={isFavorite ? semanticColors.error.main : 'none'}
            />
          </IconButton>
        </Box>
      )}
    </Paper>
  );
}

// Note: Memoization can't track shouldShowPrices from context, but that's fine
// since context changes will trigger re-render anyway
export default React.memo(ListRow, (prevProps, nextProps) => {
  return (
    prevProps.item.item === nextProps.item.item &&
    prevProps.item.imagen === nextProps.item.imagen &&
    prevProps.item.precioCOP === nextProps.item.precioCOP &&
    prevProps.item.estado === nextProps.item.estado &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isSelectedForComparison === nextProps.isSelectedForComparison &&
    prevProps.canAddToComparison === nextProps.canAddToComparison
  );
});
