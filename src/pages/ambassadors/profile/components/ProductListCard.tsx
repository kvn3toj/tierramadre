/**
 * ProductListCard Component
 * Horizontal card for category detail product list.
 * Thumbnail (left), name + origin + weight (center), price (right), quality badge.
 */

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { qeFont } from '../../../../design-system';
import { formatCurrency, formatCarats } from '../../../../utils/formatting';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import ProgressiveImage from '../../../../components/shared/ProgressiveImage';
import type { TreasureItem } from '../../../../types';

interface ProductListCardProps {
  item: TreasureItem;
  onClick: (item: TreasureItem) => void;
}

export const ProductListCard = React.memo(function ProductListCard({
  item,
  onClick,
}: ProductListCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const weightDisplay =
    typeof item.peso === 'number'
      ? `${formatCarats(item.peso)} ct`
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
        borderRadius: 'var(--tm-radius-card)',
        bgcolor: 'var(--tm-surface)',
        border: '1px solid',
        borderColor: 'var(--tm-border)',
        cursor: 'pointer',
        transition: prefersReducedMotion
          ? 'none'
          : 'border-color var(--tm-base) var(--tm-ease), background-color var(--tm-base) var(--tm-ease)',
        '&:hover': {
          borderColor: 'var(--tm-accent)',
        },
        '&:focus-visible': {
          outline: 'none',
          boxShadow: 'var(--tm-focus-ring)',
        },
      }}
    >
      {/* Thumbnail */}
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 'var(--tm-radius-well)',
          bgcolor: 'var(--tm-well)',
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
              bgcolor: 'var(--tm-accent-wash)',
              color: 'var(--tm-accent)',
              borderRadius: 'var(--tm-radius-well)',
            }}
          />
        )}
      </Box>

      {/* Price */}
      <Typography
        sx={{
          fontFamily: qeFont.serif,
          fontWeight: 600,
          fontSize: '1.05rem',
          letterSpacing: '0.01em',
          color: 'var(--tm-accent)',
          flexShrink: 0,
          fontVariantNumeric: 'lining-nums tabular-nums',
        }}
      >
        {formatCurrency(item.precioCOP)}
      </Typography>
    </Box>
  );
});

export default ProductListCard;
