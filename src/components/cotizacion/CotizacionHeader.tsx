/**
 * CotizacionHeader Component
 * Compact status bar showing product count and total.
 * Professional inline design — minimal vertical footprint.
 */

import { Box, Typography, Chip } from '@mui/material';
import { Package, DollarSign } from 'lucide-react';
import { brandColors } from './constants';
import { useCotizacionFormat } from '../../hooks/useCotizacion';

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
    <Box
      sx={{
        mb: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
      }}
    >
      {/* Product count chip */}
      <Chip
        icon={<Package size={14} />}
        label={`${productCount} ${productCount === 1 ? 'producto' : 'productos'}`}
        size="small"
        sx={{
          bgcolor: 'action.hover',
          color: 'text.secondary',
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 28,
          '& .MuiChip-icon': {
            color: brandColors.emerald,
          },
        }}
      />

      {/* Total chip */}
      <Chip
        icon={<DollarSign size={14} />}
        label={formatCurrency(total)}
        size="small"
        sx={{
          bgcolor: brandColors.emerald,
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: '0.75rem',
          height: 28,
          '& .MuiChip-icon': {
            color: '#FFFFFF',
          },
        }}
      />
    </Box>
  );
};

export default CotizacionHeader;
