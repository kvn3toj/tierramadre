/**
 * CotizacionCard Component
 * Card displaying a saved cotizacion with image preview.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { User, Calendar, Trash2, Eye, Copy } from 'lucide-react';
import { SavedCotizacion } from '../../../../hooks/useCotizacionHistory';
import { qeFont, qeGray } from '../../../../design-system';

// Format currency helper
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface CotizacionCardProps {
  cotizacion: SavedCotizacion;
  onView: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export const CotizacionCard = React.memo<CotizacionCardProps>(({
  cotizacion,
  onView,
  onDelete,
  onDuplicate,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  const createdDate = new Date(cotizacion.createdAt);
  const formattedDate = createdDate.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });

  return (
    <Box
      sx={{
        width: 200,
        flexShrink: 0,
        borderRadius: 'var(--tm-radius-card)',
        overflow: 'hidden',
        bgcolor: 'var(--tm-surface)',
        border: '1px solid',
        borderColor: 'var(--tm-border)',
        transition: 'border-color var(--tm-base) var(--tm-ease)',
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'var(--tm-accent)',
        },
      }}
      onClick={onView}
    >
      {/* Image Preview */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 160,
          bgcolor: 'var(--tm-well)',
          overflow: 'hidden',
        }}
      >
        {!imgLoaded && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={24} aria-label="Cargando" sx={{ color: 'var(--tm-accent)' }} />
          </Box>
        )}
        <Box
          component="img"
          src={cotizacion.imageUrl}
          alt={cotizacion.quotationNumber}
          onLoad={() => setImgLoaded(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity var(--tm-slow) var(--tm-ease)',
          }}
        />

        {/* View Overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity var(--tm-base) var(--tm-ease)',
            '&:hover': {
              bgcolor: 'var(--tm-scrim)',
              opacity: 1,
            },
          }}
        >
          {/* Always light: the scrim below is dark in both themes. */}
          <Eye size={28} color={qeGray[0]} />
        </Box>
      </Box>

      {/* Card Info */}
      <Box sx={{ p: 1.5 }}>
        {/* Quotation Number */}
        <Typography
          variant="caption"
          sx={{
            fontFamily: qeFont.mono,
            color: 'text.secondary',
            fontWeight: 500,
            fontSize: '0.6875rem',
            letterSpacing: '0.05em',
          }}
        >
          {cotizacion.quotationNumber}
        </Typography>

        {/* Client Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <User size={12} style={{ color: 'var(--tm-muted)' }} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: '0.8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cotizacion.clientName || 'Sin cliente'}
          </Typography>
        </Box>

        {/* Date and Total */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Calendar size={11} style={{ color: 'var(--tm-muted)' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
              {formattedDate}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.72rem', fontFamily: qeFont.mono }}
          >
            {formatCurrency(cotizacion.total)}
          </Typography>
        </Box>

        {/* Products Count */}
        <Chip
          size="small"
          label={`${cotizacion.productsCount} producto${cotizacion.productsCount !== 1 ? 's' : ''}`}
          sx={{
            mt: 1,
            height: 20,
            fontSize: '0.6875rem',
            bgcolor: 'var(--tm-well)',
            color: 'var(--tm-muted)',
          }}
        />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
          {onDuplicate && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              aria-label="Duplicar cotizacion"
              sx={{
                color: 'var(--tm-muted)',
                '&:hover': {
                  color: 'var(--tm-accent)',
                  bgcolor: 'var(--tm-accent-wash)',
                },
              }}
            >
              <Copy size={14} />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            sx={{
              color: 'var(--tm-muted)',
              '&:hover': { color: 'var(--tm-danger)', bgcolor: 'var(--tm-well)' },
            }}
          >
            <Trash2 size={14} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
});

CotizacionCard.displayName = 'CotizacionCard';

export default CotizacionCard;
