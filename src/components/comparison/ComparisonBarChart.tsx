/**
 * ComparisonBarChart Component
 * Simple horizontal bar chart for visual comparison - neutral, no winners.
 */
import { Box, Typography, alpha } from '@mui/material';
import { TreasureItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { cssTransition, accentColors } from '../../design-system';

interface ComparisonBarChartProps {
  items: TreasureItem[];
}

// High-contrast color palette for better differentiation
const itemColors = [
  emeraldCore.primary,  // Emerald green
  accentColors.error.light,  // Coral red
  accentColors.cyan.light,  // Turquoise
];

export default function ComparisonBarChart({ items }: ComparisonBarChartProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Calculate normalized values for chart
  const prices = items.map((i) => i.precioCOP);
  const weights = items.map((i) => (typeof i.peso === 'number' ? i.peso : 0));
  const pricePerCarats = items.map((i) => {
    if (!i.isJewelry && typeof i.peso === 'number' && i.peso > 0) {
      return i.precioCOP / i.peso;
    }
    return 0;
  });

  const maxPrice = Math.max(...prices);
  const maxWeight = Math.max(...weights);
  const maxPPC = Math.max(...pricePerCarats.filter(p => p > 0));

  const hasLooseStones = pricePerCarats.some((p) => p > 0);

  // Normalize to percentage (0-100)
  const normalizedPrices = prices.map((p) => (maxPrice > 0 ? (p / maxPrice) * 100 : 0));
  const normalizedWeights = weights.map((w) => (maxWeight > 0 ? (w / maxWeight) * 100 : 0));
  const normalizedPPC = pricePerCarats.map((p) => (maxPPC > 0 ? (p / maxPPC) * 100 : 0));

  // Chart data
  const chartData = [
    { label: 'Precio', values: normalizedPrices },
    { label: 'Peso', values: normalizedWeights },
    ...(hasLooseStones ? [{ label: '$/Quilate', values: normalizedPPC }] : []),
  ];

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight
          ? alpha(emeraldCore.primary, 0.02)
          : alpha(emeraldCore.primary, 0.04),
      }}
    >
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1, justifyContent: 'center' }}>
        {items.map((item, idx) => {
          const displayName = item.nombre
            .replace(/^L:.*?\s/, '')
            .replace(/^L:/, '')
            .trim();
          return (
            <Box key={item.item} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: itemColors[idx % itemColors.length],
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
                  maxWidth: 60,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Bars */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {chartData.map(({ label, values }) => (
          <Box key={label}>
            <Typography
              sx={{
                fontSize: '0.5rem',
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                mb: 0.25,
              }}
            >
              {label}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {values.map((value, idx) => {
                const displayName = items[idx].nombre
                  .replace(/^L:.*?\s/, '')
                  .replace(/^L:/, '')
                  .trim();
                const initial = displayName.charAt(0).toUpperCase();

                return (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {/* Initial label */}
                    <Box
                      sx={{
                        minWidth: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: itemColors[idx % itemColors.length],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.5rem',
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {initial}
                      </Typography>
                    </Box>
                    {/* Bar */}
                    <Box
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: alpha(itemColors[idx % itemColors.length], 0.3),
                        width: `${Math.max(value, 2)}%`,
                        transition: cssTransition.slow,
                        minWidth: 4,
                        position: 'relative',
                        border: `2px solid ${itemColors[idx % itemColors.length]}`,
                      }}
                    >
                      {/* Inner fill */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: '70%',
                          bgcolor: itemColors[idx % itemColors.length],
                          borderRadius: 5,
                        }}
                      />
                    </Box>
                    {/* Percentage label */}
                    <Typography
                      sx={{
                        fontSize: '0.55rem',
                        fontWeight: 600,
                        color: itemColors[idx % itemColors.length],
                        minWidth: 32,
                      }}
                    >
                      {Math.round(value)}%
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
