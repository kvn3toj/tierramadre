/**
 * CotizacionHeader Component
 * Compact status bar showing product count and total.
 * Professional inline design — minimal vertical footprint.
 */

import { Box, Chip } from '@mui/material';
import { Package, DollarSign } from 'lucide-react';
import { brandColors } from './constants';
import { useCotizacionFormat } from '../../hooks/useCotizacion';
import { fontWeights } from '../../design-system';

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
          fontWeight: fontWeights.semibold,
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
          fontWeight: fontWeights.bold,
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
