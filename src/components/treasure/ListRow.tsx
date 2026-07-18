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
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { Heart, Scale } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { TreasureItem } from '../../types';
import {
  getColorDot,
  getQualityBadge,
  formatCarats,
} from '../../utils/formatting';
import { PriceDisplay } from '../price-simulator/PriceDisplay';
import { emeraldCore, semanticColors } from '../../design-system/tokens/colors';
import {
  errorAlpha,
  cssTransition,
  qeFont,
  getQuietEmerald,
  Badge,
} from '../../design-system';

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
  const qe = getQuietEmerald(mode);
  const { shouldShowPrices } = usePriceShare();

  const displayName = item.nombre
    .replace(/^L:.*?\s/, '')
    .replace(/^L:/, '')
    .trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const weight =
    typeof item.peso === 'number'
      ? `${formatCarats(item.peso)} ct`
      : item.metalType;
  const origin = (item.procedencia || item.mina)?.trim();

  const handleItemClick = useCallback(() => {
    onItemClick(item);
  }, [onItemClick, item]);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite(item.item);
    },
    [onToggleFavorite, item.item],
  );

  const handleCompareClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleComparison?.(item);
    },
    [onToggleComparison, item],
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2.5,
        bgcolor: qe.surface,
        border: '1px solid',
        borderColor: qe.border,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
        transition: cssTransition.default,
        '&:hover': {
          borderColor: isLight ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.16)',
          bgcolor: isLight ? qe.well : alpha('#ffffff', 0.03),
        },
        '&:focus-visible': {
          outline: `3px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
      onClick={handleItemClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleItemClick();
        }
      }}
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
          sx={{
            fontFamily: qeFont.serif,
            fontWeight: 500,
            fontSize: 20,
            lineHeight: 1.15,
            color: qe.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>
        <Typography
          sx={{
            fontFamily: qeFont.mono,
            fontSize: 11,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: qe.textMuted,
          }}
        >
          {item.color} · {weight}
          {origin && ` · ${origin}`}
        </Typography>
      </Box>

      {/* Quality badge */}
      <Badge tone={quality.tone} label={quality.label} />

      {/* Price (hidden when prices not shown) */}
      {shouldShowPrices && (
        <Box sx={{ minWidth: 100, textAlign: 'right' }}>
          <PriceDisplay
            price={item.precioCOP}
            precioInternacional={item.precioInternacional}
            compact
          />
        </Box>
      )}

      {/* Action buttons (hidden when prices not shown - comparison requires prices) */}
      {shouldShowPrices && (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* Comparison button */}
          {onToggleComparison && (
            <IconButton
              onClick={handleCompareClick}
              aria-label={
                isSelectedForComparison
                  ? 'Quitar de comparación'
                  : 'Agregar a comparación'
              }
              disabled={!isSelectedForComparison && !canAddToComparison}
              size="small"
              sx={{
                minWidth: 44,
                minHeight: 44,
                color: isSelectedForComparison
                  ? 'white'
                  : theme.palette.text.secondary,
                bgcolor: isSelectedForComparison
                  ? emeraldCore.primary
                  : 'transparent',
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
            aria-label={
              isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
            }
            size="small"
            sx={{
              minWidth: 44,
              minHeight: 44,
              color: isFavorite
                ? semanticColors.error.main
                : theme.palette.text.secondary,
              '&:hover': {
                bgcolor: isFavorite
                  ? errorAlpha(0.1)
                  : alpha(emeraldCore.primary, 0.1),
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
    // Displayed on the secondary line — include so updates aren't masked.
    prevProps.item.procedencia === nextProps.item.procedencia &&
    prevProps.item.mina === nextProps.item.mina &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isSelectedForComparison === nextProps.isSelectedForComparison &&
    prevProps.canAddToComparison === nextProps.canAddToComparison
  );
});
