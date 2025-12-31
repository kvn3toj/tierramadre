/**
 * CotizacionHeader Component
 * Stats banner showing product count and total.
 */

import { Box, Typography, Paper } from '@mui/material';
import { FileText } from 'lucide-react';
import { brandColors } from './constants';
import { formatCotizacionCurrency } from '../../hooks/useCotizacion';
import { iosTypographyScale } from '../../design-system';

export interface CotizacionHeaderProps {
  productCount: number;
  total: number;
}

export const CotizacionHeader: React.FC<CotizacionHeaderProps> = ({
  productCount,
  total,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 4,
        p: 3,
        borderRadius: 4,
        background: `linear-gradient(135deg, ${brandColors.emeraldDark} 0%, ${brandColors.textPrimary} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={28} color="#FFFFFF" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                Cotización de Venta
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Selecciona productos del inventario
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box
              sx={{
                px: 3,
                py: 2,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                minWidth: 100,
                border: '2px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Typography sx={{
                fontSize: iosTypographyScale.title1,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}>
                {productCount}
              </Typography>
              <Typography sx={{
                fontSize: iosTypographyScale.caption1,
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 600,
                mt: 0.5,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}>
                Productos
              </Typography>
            </Box>
            <Box
              sx={{
                px: 3,
                py: 2,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.35)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                minWidth: 140,
                border: '2px solid rgba(255,255,255,0.4)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Typography sx={{
                fontSize: iosTypographyScale.headline,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.2,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}>
                {formatCotizacionCurrency(total)}
              </Typography>
              <Typography sx={{
                fontSize: iosTypographyScale.caption1,
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}>
                Total
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default CotizacionHeader;
