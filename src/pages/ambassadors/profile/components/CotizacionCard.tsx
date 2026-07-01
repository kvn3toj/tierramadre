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
  alpha,
} from '@mui/material';
import { User, Calendar, Trash2, Eye, Copy } from 'lucide-react';
import { SavedCotizacion } from '../../../../hooks/useCotizacionHistory';
import { brand, lightTokens, darkTokens, accentColors, cssTransition, qeFont } from '../../../../design-system';

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
  isLight: boolean;
}

export const CotizacionCard = React.memo<CotizacionCardProps>(({
  cotizacion,
  onView,
  onDelete,
  onDuplicate,
  isLight,
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
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: isLight ? '#fff' : darkTokens.background.elevated,
        border: '1px solid',
        borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
        transition: cssTransition.default,
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
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
          bgcolor: isLight ? lightTokens.background.muted : darkTokens.background.surface,
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
            <CircularProgress size={24} aria-label="Cargando" sx={{ color: brand.emerald[500] }} />
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
            transition: cssTransition.slow,
          }}
        />

        {/* View Overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: cssTransition.default,
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.4)',
              opacity: 1,
            },
          }}
        >
          <Eye size={28} color="#fff" />
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
            fontSize: '0.65rem',
            letterSpacing: '0.05em',
          }}
        >
          {cotizacion.quotationNumber}
        </Typography>

        {/* Client Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <User size={12} color={lightTokens.text.muted} />
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
            <Calendar size={11} color={lightTokens.text.muted} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
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
            fontSize: '0.6rem',
            bgcolor: isLight ? alpha('#000000', 0.06) : alpha('#ffffff', 0.08),
            color: 'text.secondary',
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
                color: lightTokens.text.muted,
                '&:hover': { color: brand.emerald[500], bgcolor: alpha(brand.emerald[500], 0.1) },
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
              color: lightTokens.text.muted,
              '&:hover': { color: accentColors.error.light, bgcolor: alpha(accentColors.error.light, 0.1) },
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
