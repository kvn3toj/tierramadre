/**
 * ListRow Component
 * Compact list view row for treasure items.
 * Optimized for scanning and quick comparison.
 */
import React, { useCallback } from 'react';
import { Box, Typography, IconButton, alpha, useTheme } from '@mui/material';
import { Heart } from 'lucide-react';
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
  qeFont,
  getQuietEmerald,
  Badge,
  Card,
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
}: ListRowProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
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

  return (
    <Card
      variant="outlined"
      interactive
      onClick={handleItemClick}
      aria-label={`${item.nombre} - ${item.color}, ${weight}`}
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
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
          {' · '}
          <Box component="span" sx={{ color: 'var(--tm-subtle)' }}>
            Nº {item.item}
          </Box>
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

      {/* Action buttons */}
      {shouldShowPrices && (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
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
    </Card>
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
    prevProps.isFavorite === nextProps.isFavorite
  );
});
