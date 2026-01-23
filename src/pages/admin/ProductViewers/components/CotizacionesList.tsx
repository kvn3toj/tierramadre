/**
 * CotizacionesList Component
 * List of asesores who quoted this product.
 */

import React from 'react';
import { Box, Typography, Paper, Chip, alpha } from '@mui/material';
import { FileText, DollarSign, Clock } from 'lucide-react';
import { emeraldCore, goldAccent } from '../../../../design-system/tokens/colors';
import { formatTimeAgo } from '../../../../utils/formatting';
import type { ProductCotizaciones } from '../types';

interface CotizacionesListProps {
  data: ProductCotizaciones;
  isLight: boolean;
}

export const CotizacionesList: React.FC<CotizacionesListProps> = ({ data, isLight }) => {
  if (data.totalCotizaciones === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${alpha(goldAccent.primary, 0.2)}`,
        overflow: 'hidden',
        mb: 3,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${alpha(goldAccent.primary, 0.15)}`,
          bgcolor: alpha(goldAccent.primary, 0.05),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: goldAccent.primary,
            }}
          >
            <FileText size={16} />
            Quién cotizó este producto ({data.quotedBy.length} asesores)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DollarSign size={14} color={emeraldCore.primary} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: emeraldCore.primary }}>
              ${(data.totalValue / 1000000).toFixed(1)}M total
            </Typography>
          </Box>
        </Box>
      </Box>
      {data.quotedBy.map((asesor, idx) => (
        <Box
          key={asesor.email}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            py: 1.5,
            borderBottom:
              idx < data.quotedBy.length - 1 ? `1px solid ${alpha('#000', 0.06)}` : 'none',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: alpha(goldAccent.primary, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={18} color={goldAccent.primary} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {asesor.name}
              </Typography>
              <Chip
                label="Asesor"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: alpha(goldAccent.primary, 0.15),
                  color: goldAccent.primary,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {asesor.count} {asesor.count === 1 ? 'cotización' : 'cotizaciones'}
              </Typography>
              <Box
                sx={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  bgcolor: 'text.disabled',
                }}
              />
              <Typography variant="caption" sx={{ color: emeraldCore.primary, fontWeight: 500 }}>
                ${(asesor.totalValue / 1000000).toFixed(2)}M
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Clock size={12} />
              {formatTimeAgo(asesor.lastQuote)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};
