/**
 * ValueMatrix Component
 * 2D scatter plot showing Quality vs Price positioning.
 * Helps visualize which emeralds offer the best value proposition.
 */
import { Box, Typography, alpha } from '@mui/material';
import { TrendingUp } from 'lucide-react';
import { TreasureItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { accentColors, qeAccent, whiteAlpha } from '../../design-system';

// Emerald green for value leaders
// static context: no theme mode available (module-level constant, outside React render)
const emeraldGreen = qeAccent.light.pure;

interface ValueMatrixProps {
  items: TreasureItem[];
}

// High-contrast color palette for better differentiation
// static context: no theme mode available (module-level array, outside React render)
const itemColors = [
  qeAccent.light.pure, // Emerald green
  accentColors.error.light, // Coral red
  accentColors.cyan.light, // Turquoise
];

/**
 * Quality to numeric score
 */
function qualityToScore(quality: string): number {
  const qualityMap: Record<string, number> = {
    Fina: 100,
    'Comercial SuperFina': 90,
    'Comercial Fina': 85,
    'Comercial Superior': 75,
    'Comercial Estándar': 65,
    Estándar: 50,
  };
  return qualityMap[quality] || 60;
}

/**
 * Identify the "sweet spot" items (high quality, reasonable price)
 */
function identifyValueLeaders(items: TreasureItem[]): Set<number> {
  const leaders = new Set<number>();

  // Calculate average quality and price
  const avgQuality =
    items.reduce((sum, item) => sum + qualityToScore(item.calidad), 0) /
    items.length;
  const avgPrice =
    items.reduce((sum, item) => sum + item.precioCOP, 0) / items.length;

  // Items with above-average quality and below-average price are leaders
  items.forEach((item, idx) => {
    const quality = qualityToScore(item.calidad);
    if (quality >= avgQuality && item.precioCOP <= avgPrice) {
      leaders.add(idx);
    }
  });

  return leaders;
}

export default function ValueMatrix({ items }: ValueMatrixProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Calculate bounds
  const qualities = items.map((item) => qualityToScore(item.calidad));
  const prices = items.map((item) => item.precioCOP);

  const minQuality = Math.min(...qualities) - 5;
  const maxQuality = Math.max(...qualities) + 5;
  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;

  const valueLeaders = identifyValueLeaders(items);

  // Chart dimensions
  const width = 300;
  const height = 200;
  const padding = 40;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  // Normalize coordinates
  const normalize = (
    value: number,
    min: number,
    max: number,
    range: number,
  ) => {
    return ((value - min) / (max - min)) * range;
  };

  return (
    <Box
      sx={{
        px: 1.5,
        py: 2,
        borderBottom: '1px solid',
        borderColor: isLight
          ? surfacesLight.border.light
          : surfacesDark.border.light,
        bgcolor: isLight
          ? alpha(emeraldGreen, 0.02)
          : alpha(emeraldGreen, 0.04),
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1.5,
          color: 'text.secondary',
          fontSize: '0.65rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}
      >
        Matriz de Valor: Calidad vs Precio
      </Typography>

      {/* SVG Matrix */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={width} height={height}>
          {/* Background quadrants */}
          {/* Top-left quadrant (high quality, low price) = BEST VALUE */}
          <rect
            x={padding}
            y={padding}
            width={plotWidth / 2}
            height={plotHeight / 2}
            fill={alpha(emeraldGreen, 0.08)}
            rx={4}
          />

          {/* Grid lines */}
          {/* Vertical center line */}
          <line
            x1={padding + plotWidth / 2}
            y1={padding}
            x2={padding + plotWidth / 2}
            y2={padding + plotHeight}
            stroke={
              isLight
                ? surfacesLight.border.default
                : surfacesDark.border.default
            }
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.4}
          />
          {/* Horizontal center line */}
          <line
            x1={padding}
            y1={padding + plotHeight / 2}
            x2={padding + plotWidth}
            y2={padding + plotHeight / 2}
            stroke={
              isLight
                ? surfacesLight.border.default
                : surfacesDark.border.default
            }
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.4}
          />

          {/* Axes */}
          {/* X-axis (Price) */}
          <line
            x1={padding}
            y1={padding + plotHeight}
            x2={padding + plotWidth}
            y2={padding + plotHeight}
            stroke={
              isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary
            }
            strokeWidth={2}
          />
          {/* Y-axis (Quality) */}
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={padding + plotHeight}
            stroke={
              isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary
            }
            strokeWidth={2}
          />

          {/* Axis labels */}
          <text
            x={padding + plotWidth / 2}
            y={height - 10}
            textAnchor="middle"
            fill={
              isLight
                ? surfacesLight.text.secondary
                : surfacesDark.text.secondary
            }
            fontSize={10}
            fontWeight={600}
          >
            Precio →
          </text>
          <text
            x={15}
            y={padding + plotHeight / 2}
            textAnchor="middle"
            fill={
              isLight
                ? surfacesLight.text.secondary
                : surfacesDark.text.secondary
            }
            fontSize={10}
            fontWeight={600}
            transform={`rotate(-90, 15, ${padding + plotHeight / 2})`}
          >
            Calidad →
          </text>

          {/* Data points */}
          {items.map((item, idx) => {
            const quality = qualityToScore(item.calidad);
            const price = item.precioCOP;

            const x = padding + normalize(price, minPrice, maxPrice, plotWidth);
            const y =
              padding +
              plotHeight -
              normalize(quality, minQuality, maxQuality, plotHeight);

            const isLeader = valueLeaders.has(idx);
            const color = itemColors[idx % itemColors.length];
            const displayName = item.nombre
              .replace(/^L:.*?\s/, '')
              .replace(/^L:/, '')
              .trim();
            const initial = displayName.charAt(0).toUpperCase();

            return (
              <g key={item.item}>
                {/* Outer glow */}
                <circle
                  cx={x}
                  cy={y}
                  r={14}
                  fill={alpha(color, 0.15)}
                  stroke="none"
                />
                {/* Value leader highlight */}
                {isLeader && (
                  <circle
                    cx={x}
                    cy={y}
                    r={18}
                    fill="none"
                    stroke={emeraldGreen}
                    strokeWidth={2}
                    strokeDasharray="3,2"
                  />
                )}
                {/* Main data point */}
                <circle
                  cx={x}
                  cy={y}
                  r={10}
                  fill={color}
                  stroke={
                    isLight ? whiteAlpha(1) : surfacesDark.background.primary
                  }
                  strokeWidth={2.5}
                />
                {/* Initial letter label */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={
                    isLight ? whiteAlpha(1) : surfacesDark.background.primary
                  }
                  fontSize={10}
                  fontWeight={700}
                >
                  {initial}
                </text>
              </g>
            );
          })}

          {/* "Sweet Spot" label in top-left quadrant */}
          <text
            x={padding + plotWidth / 4}
            y={padding + 15}
            textAnchor="middle"
            fill={emeraldGreen}
            fontSize={9}
            fontWeight={700}
          >
            MEJOR VALOR
          </text>
        </svg>
      </Box>

      {/* Legend */}
      <Box
        sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {items.map((item, idx) => {
            const displayName = item.nombre
              .replace(/^L:.*?\s/, '')
              .replace(/^L:/, '')
              .trim();
            const isLeader = valueLeaders.has(idx);
            return (
              <Box
                key={item.item}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: itemColors[idx % itemColors.length],
                    border: isLeader ? `2px solid ${emeraldGreen}` : 'none',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: isLight
                      ? surfacesLight.text.secondary
                      : surfacesDark.text.secondary,
                    maxWidth: 70,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: isLeader ? 600 : 400,
                  }}
                >
                  {displayName}
                </Typography>
                {isLeader && (
                  <TrendingUp
                    size={10}
                    color={emeraldGreen}
                    strokeWidth={2.5}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Insight */}
        {valueLeaders.size > 0 && (
          <Box
            sx={{
              mt: 0.5,
              p: 1,
              borderRadius: 1.5,
              bgcolor: alpha(emeraldGreen, 0.08),
              border: `1px solid ${alpha(emeraldGreen, 0.2)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: emeraldGreen,
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {valueLeaders.size === 1
                ? '1 esmeralda destaca por su excelente relación calidad-precio'
                : `${valueLeaders.size} esmeraldas destacan por su excelente relación calidad-precio`}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
