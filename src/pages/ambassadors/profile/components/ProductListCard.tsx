/**
 * ProductListCard Component
 * Horizontal card for category detail product list.
 * Thumbnail (left), name + origin + weight (center), price (right), quality badge.
 */

import React from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { emeraldCore, cssTransition, surfacesLight, surfacesDark, fontFamilies } from '../../../../design-system';
import { formatCurrency } from '../../../../utils/formatting';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import ProgressiveImage from '../../../../components/shared/ProgressiveImage';
import type { TreasureItem } from '../../../../types';

interface ProductListCardProps {
  item: TreasureItem;
  onClick: (item: TreasureItem) => void;
}

export const ProductListCard = React.memo(function ProductListCard({ item, onClick }: ProductListCardProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const prefersReducedMotion = useReducedMotion();

  const weightDisplay = typeof item.peso === 'number'
    ? `${item.peso} ct`
    : item.peso || '';

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
      aria-label={`${item.nombre} - ${formatCurrency(item.precioCOP)}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.25,
        borderRadius: '14px',
        bgcolor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        cursor: 'pointer',
        transition: prefersReducedMotion ? 'none' : `all ${cssTransition.default}`,
        '&:hover': {
          borderColor: alpha(emeraldCore.primary, 0.3),
          boxShadow: isLight
            ? `0 4px 14px ${alpha('#000', 0.06)}`
            : `0 4px 14px ${alpha('#000', 0.2)}`,
          transform: prefersReducedMotion ? 'none' : 'translateX(2px)',
        },
        '&:focus-visible': {
          outline: `2px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Thumbnail */}
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '10px',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <ProgressiveImage
          src={item.thumbnailUrl || item.imagen}
          alt={item.nombre}
          width={64}
          height={64}
          layout="thumbnail"
          quality="eco"
          enableLQIP={false}
          showPlaceholderIcon={false}
        />
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 650,
            fontSize: '0.82rem',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.25,
            letterSpacing: '-0.01em',
          }}
        >
          {item.nombre}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {item.ubicacion && (
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              {item.ubicacion}
            </Typography>
          )}
          {weightDisplay && (
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              {weightDisplay}
            </Typography>
          )}
        </Box>
        {item.calidad && (
          <Chip
            label={item.calidad}
            size="small"
            sx={{
              height: 18,
              mt: 0.5,
              fontSize: '0.55rem',
              fontWeight: 600,
              bgcolor: alpha(emeraldCore.primary, 0.08),
              color: emeraldCore.primary,
              borderRadius: '5px',
            }}
          />
        )}
      </Box>

      {/* Price */}
      <Typography
        sx={{
          fontFamily: fontFamilies.mono,
          fontWeight: 700,
          fontSize: '0.88rem',
          color: emeraldCore.primary,
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatCurrency(item.precioCOP)}
      </Typography>
    </Box>
  );
});

export default ProductListCard;
