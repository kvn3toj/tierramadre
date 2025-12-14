/**
 * FactorSlider Component
 * Price factor selection with slider and tier chips.
 */

import { Box, Typography, Paper, Slider, Chip, IconButton, Tooltip, alpha } from '@mui/material';
import { Target, Info } from 'lucide-react';
import { PRICING_TIERS, PricingTier } from '../../hooks/usePriceCalculation';
import { studioColors, studioCardStyles } from '../PremiumHeader';

export interface FactorSliderProps {
  priceFactor: number;
  onFactorChange: (factor: number) => void;
  currentTier: PricingTier;
}

export const FactorSlider: React.FC<FactorSliderProps> = ({
  priceFactor,
  onFactorChange,
  currentTier,
}) => {
  return (
    <Paper elevation={0} sx={{ ...studioCardStyles.card, position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 150,
          height: 150,
          background: `radial-gradient(circle, ${alpha(currentTier.color, 0.06)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, position: 'relative' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: alpha(currentTier.color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Target size={18} color={currentTier.color} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
            Factor sobre Inversión
          </Typography>
          <Typography variant="caption" sx={{ color: studioColors.textSecondary }}>
            Multiplicador de precio
          </Typography>
        </Box>
        <Tooltip title="Multiplicador que se aplica al total de inversión para calcular el precio de venta">
          <IconButton size="small" sx={{ color: studioColors.textMuted }}>
            <Info size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Large Factor Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 0.5,
            px: 4,
            py: 2,
            borderRadius: 3,
            bgcolor: alpha(currentTier.color, 0.08),
            border: `2px solid ${alpha(currentTier.color, 0.2)}`,
          }}
        >
          <Typography
            sx={{
              fontSize: '3rem',
              fontWeight: 800,
              color: currentTier.color,
              lineHeight: 1,
              fontFamily: 'monospace',
            }}
          >
            {priceFactor.toFixed(1)}
          </Typography>
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: currentTier.color,
              opacity: 0.7,
            }}
          >
            x
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, mb: 3 }}>
        <Slider
          value={priceFactor}
          onChange={(_, value) => onFactorChange(value as number)}
          min={1.5}
          max={4.0}
          step={0.1}
          marks={PRICING_TIERS.map(tier => ({
            value: tier.factor,
            label: tier.label,
          }))}
          sx={{
            color: currentTier.color,
            '& .MuiSlider-markLabel': {
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: studioColors.textMuted,
              top: 30,
            },
            '& .MuiSlider-mark': {
              bgcolor: studioColors.border,
              height: 12,
              width: 2,
              borderRadius: 1,
            },
            '& .MuiSlider-thumb': {
              width: 24,
              height: 24,
              boxShadow: `0 2px 8px ${alpha(currentTier.color, 0.4)}`,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: `0 0 0 6px ${alpha(currentTier.color, 0.16)}, 0 2px 8px ${alpha(currentTier.color, 0.4)}`,
              },
            },
            '& .MuiSlider-track': {
              height: 6,
              borderRadius: 3,
              border: 'none',
            },
            '& .MuiSlider-rail': {
              height: 6,
              borderRadius: 3,
              bgcolor: studioColors.border,
              opacity: 1,
            },
          }}
        />
      </Box>

      {/* Quick Select Tiers */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
        {PRICING_TIERS.map((tier) => (
          <Chip
            key={tier.label}
            label={tier.label}
            onClick={() => onFactorChange(tier.factor)}
            sx={{
              cursor: 'pointer',
              bgcolor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.1),
              color: Math.abs(priceFactor - tier.factor) < 0.05 ? '#FFFFFF' : tier.color,
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 28,
              border: '1px solid',
              borderColor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.3),
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.15),
                transform: 'translateY(-1px)',
              },
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};

export default FactorSlider;
