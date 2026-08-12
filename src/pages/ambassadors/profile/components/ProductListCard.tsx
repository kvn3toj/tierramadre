/**
 * ProductListCard Component
 * Horizontal card for category detail product list.
 * Thumbnail (left), name + origin + weight (center), price (right), quality badge.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { Badge, Card, qeType } from '../../../../design-system';
import {
  formatCurrency,
  formatWeightLabel,
} from '../../../../utils/formatting';
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
  const weightDisplay = formatWeightLabel(item);

  return (
    <Card
      interactive
      onClick={() => onClick(item)}
      aria-label={`${item.nombre} - ${formatCurrency(item.precioCOP)}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.25,
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
            ...qeType.title,
            fontSize: '1.0625rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.25,
          }}
        >
          {item.nombre}
        </Typography>
        {/* `ubicacion` deliberately NOT rendered here: it is internal custody
            (ASESOR · OFI.CALI · OFI.BOGOTA · EMBAJADOR · RETORNADO), not
            product information, and this card is client-facing. It used to
            print "EMBAJADOR"/"ASESOR" under every name. Mine origin lives in
            `procedencia` and is shown on the detail view. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {weightDisplay && (
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
              {weightDisplay}
            </Typography>
          )}
        </Box>
        {item.calidad && (
          <Box sx={{ mt: 0.5 }}>
            <Badge tone="accent" label={item.calidad} />
          </Box>
        )}
      </Box>

      {/* Price */}
      <Typography
        sx={{
          ...qeType.data,
          fontSize: '1rem',
          color: 'var(--tm-accent)',
          flexShrink: 0,
          fontVariantNumeric: 'lining-nums tabular-nums',
        }}
      >
        {formatCurrency(item.precioCOP)}
      </Typography>
    </Card>
  );
});

export default ProductListCard;
