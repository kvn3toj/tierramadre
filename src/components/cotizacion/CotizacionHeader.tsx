/**
 * CotizacionHeader Component
 * Stats banner showing product count and total.
 */

import { Box, Typography, Paper } from '@mui/material';
import { FileText } from 'lucide-react';
import { brandColors } from './constants';
import { useCotizacionFormat } from '../../hooks/useCotizacion';
import { iosTypographyScale } from '../../design-system';

export interface CotizacionHeaderProps {
  productCount: number;
  total: number;
}

export const CotizacionHeader: React.FC<CotizacionHeaderProps> = ({
  productCount,
  total,
}) => {
  const { formatPrice: formatCurrency } = useCotizacionFormat();
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${brandColors.emeraldDark} 0%, ${brandColors.textPrimary} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          {/* Title section - compact */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} color="#FFFFFF" />
            </Box>
            <Typography sx={{
              fontSize: iosTypographyScale.title3,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.01em',
            }}>
              Cotización de Venta
            </Typography>
          </Box>

          {/* Stats as compact chips */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Typography sx={{
                fontSize: iosTypographyScale.subhead,
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1,
              }}>
                {productCount}
              </Typography>
              <Typography sx={{
                fontSize: iosTypographyScale.caption2,
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 500,
              }}>
                {productCount === 1 ? 'producto' : 'productos'}
              </Typography>
            </Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Typography sx={{
                fontSize: iosTypographyScale.subhead,
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1,
              }}>
                {formatCurrency(total)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default CotizacionHeader;
