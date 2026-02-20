/**
 * PricingResults Component
 * Displays calculated pricing metrics.
 */

import { Box, Typography, Paper, LinearProgress, alpha } from '@mui/material';
import { TrendingUp, Gem, Percent, DollarSign, ArrowUpRight } from 'lucide-react';
import { PricingMetrics } from '../../hooks/usePriceCalculation';
import { formatPercent } from '../../utils/formatting';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { studioColors, studioGradients, studioShadows, accentColors } from '../../design-system';

export interface PricingResultsProps {
  pricingMetrics: PricingMetrics;
  priceFactor: number;
  caratWeight: number;
  marginProgress: number;
}

export const PricingResults: React.FC<PricingResultsProps> = ({
  pricingMetrics,
  priceFactor,
  caratWeight,
  marginProgress,
}) => {
  const { formatFullCurrency: formatCurrency } = useCurrencyFormat();
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${studioColors.border}`,
        boxShadow: studioShadows.emerald,
      }}
    >
      {/* Main Price Section */}
      <Box
        sx={{
          p: 3,
          background: studioGradients.header,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: studioGradients.emerald,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: alpha(studioColors.emerald, 0.08),
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: alpha(studioColors.emerald, 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} color={studioColors.emerald} />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: alpha('#FFFFFF', 0.9) }}>
              Precio de Venta Sugerido
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              sx={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: studioColors.emerald,
                fontFamily: 'monospace',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {formatCurrency(pricingMetrics.salePrice)}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: alpha(studioColors.emerald, 0.15),
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
              }}
            >
              <ArrowUpRight size={14} color={studioColors.emerald} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: studioColors.emerald }}>
                {priceFactor.toFixed(1)}x
              </Typography>
            </Box>
          </Box>

          {/* Price per Carat Display */}
          {caratWeight > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(studioColors.gold, 0.08),
                  border: `1px solid ${alpha(studioColors.gold, 0.2)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Gem size={16} color={studioColors.gold} />
                  <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.85), fontWeight: 500 }}>
                    Precio por Quilate
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: studioColors.gold,
                    fontFamily: 'monospace',
                  }}
                >
                  {formatCurrency(pricingMetrics.pricePerCarat)}/ct
                </Typography>
              </Box>
            </Box>
          )}

          {/* Margin Progress Bar */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                Margen de ganancia
              </Typography>
              <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 600 }}>
                {formatPercent(pricingMetrics.margin)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={marginProgress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha('#FFFFFF', 0.15),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: studioGradients.emerald,
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Metrics Grid */}
      <Box sx={{ p: 2.5, bgcolor: studioColors.surface }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {/* Margin */}
          <MetricCard
            icon={<Percent size={16} color={accentColors.info.light} />}
            value={formatPercent(pricingMetrics.margin)}
            label="Margen s/Venta"
            color={accentColors.info.light}
          />

          {/* ROI */}
          <MetricCard
            icon={<TrendingUp size={16} color={accentColors.purple.light} />}
            value={formatPercent(pricingMetrics.roi)}
            label="ROI (Retorno)"
            color={accentColors.purple.light}
          />

          {/* Profit */}
          <MetricCard
            icon={<DollarSign size={16} color={studioColors.emerald} />}
            value={formatCurrency(pricingMetrics.profit)}
            label="Ganancia Neta"
            color={studioColors.emerald}
            smallValue
          />
        </Box>
      </Box>
    </Paper>
  );
};

// Sub-component for metric cards
interface MetricCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  smallValue?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, value, label, color, smallValue }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 2,
      bgcolor: alpha(color, 0.06),
      textAlign: 'center',
      border: `1px solid ${alpha(color, 0.1)}`,
    }}
  >
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: 1.5,
        bgcolor: alpha(color, 0.1),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        mb: 1,
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontSize: smallValue ? '0.9375rem' : '1.25rem',
        fontWeight: 700,
        color: color,
        fontFamily: 'monospace',
        lineHeight: smallValue ? 1.2 : 1,
        mb: 0.5,
      }}
    >
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 500 }}>
      {label}
    </Typography>
  </Box>
);

export default PricingResults;
