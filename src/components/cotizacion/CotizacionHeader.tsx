/**
 * CotizacionHeader Component
 * Stats banner showing product count and total.
 */

import { Box, Typography, Paper } from '@mui/material';
import { FileText } from 'lucide-react';
import { brandColors } from './constants';
import { formatCotizacionCurrency } from '../../hooks/useCotizacion';

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

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                borderRadius: 2.5,
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                minWidth: 80,
              }}
            >
              <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                {productCount}
              </Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                Productos
              </Typography>
            </Box>
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                borderRadius: 2.5,
                bgcolor: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                minWidth: 120,
              }}
            >
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                {formatCotizacionCurrency(total)}
              </Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
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
