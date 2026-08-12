/**
 * RadarChart Component
 * Multi-dimensional visualization for comparing emerald attributes.
 * Shows quality, color, size, investment potential, and value in a pentagon chart.
 */
import { Box, Typography, alpha } from '@mui/material';
import { TreasureItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { accentColors, qeAccent, whiteAlpha } from '../../design-system';

interface RadarChartProps {
  items: TreasureItem[];
  maxItems?: number; // Limit to 3 items for clarity
}

interface DataPoint {
  label: string;
  values: number[]; // 0-100 for each item
}

// High-contrast color palette for better differentiation
// static context: no theme mode available (module-level array, outside React render)
const itemColors = [
  qeAccent.light.pure, // Emerald green
  accentColors.error.light, // Coral red
  accentColors.cyan.light, // Turquoise
];

/**
 * Quality scoring (0-100)
 */
function calculateQualityScore(quality: string): number {
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
 * Color scoring (0-100)
 */
function calculateColorScore(color: string): number {
  const colorMap: Record<string, number> = {
    'Verde Vivido': 100,
    'Verde Muzo': 95,
    'Verde Natural': 85,
    'Verde Limón': 80,
    'Verde Menta': 75,
  };
  return colorMap[color] || 70;
}

/**
 * Normalize size to 0-100 scale
 */
function normalizeSizeScore(items: TreasureItem[]): number[] {
  const weights = items.map((i) => (typeof i.peso === 'number' ? i.peso : 0));
  const maxWeight = Math.max(...weights, 1);
  return weights.map((w) => (w / maxWeight) * 100);
}

/**
 * Calculate investment score (0-100)
 */
function calculateInvestmentScore(
  item: TreasureItem,
  allItems: TreasureItem[],
): number {
  const qualityScore = calculateQualityScore(item.calidad);
  const colorScore = calculateColorScore(item.color);
  const weights = allItems.map((i) =>
    typeof i.peso === 'number' ? i.peso : 0,
  );
  const weight = typeof item.peso === 'number' ? item.peso : 0;
  const maxWeight = Math.max(...weights, 1);
  const sizeScore = (weight / maxWeight) * 100;
  const certBonus = item.certifications ? 15 : 0;

  return Math.min(
    100,
    qualityScore * 0.4 + colorScore * 0.3 + sizeScore * 0.2 + certBonus * 0.1,
  );
}

/**
 * Calculate value score (price/quality ratio) - inverted so lower price = better
 */
function calculateValueScore(items: TreasureItem[]): number[] {
  const prices = items.map((i) => i.precioCOP);
  const maxPrice = Math.max(...prices);
  const qualities = items.map((i) => calculateQualityScore(i.calidad));

  return items.map((item, idx) => {
    const priceScore = 100 - (item.precioCOP / maxPrice) * 100;
    return qualities[idx] * 0.6 + priceScore * 0.4;
  });
}

/**
 * Convert polar coordinates to cartesian
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Generate SVG path for radar polygon
 */
function generateRadarPath(
  values: number[],
  centerX: number,
  centerY: number,
  maxRadius: number,
): string {
  const angleStep = 360 / values.length;
  const points = values.map((value, idx) => {
    const angle = idx * angleStep;
    const radius = (value / 100) * maxRadius;
    return polarToCartesian(centerX, centerY, radius, angle);
  });

  if (points.length === 0) return '';

  const pathData = points.reduce((path, point, idx) => {
    const command = idx === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '');

  return `${pathData} Z`;
}

export default function RadarChart({ items, maxItems = 3 }: RadarChartProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Limit items for clarity
  const displayItems = items.slice(0, maxItems);

  // Prepare data points
  const sizeScores = normalizeSizeScore(displayItems);
  const valueScores = calculateValueScore(displayItems);
  const investmentScores = displayItems.map((item) =>
    calculateInvestmentScore(item, displayItems),
  );

  const dataPoints: DataPoint[] = [
    {
      label: 'Calidad',
      values: displayItems.map((item) => calculateQualityScore(item.calidad)),
    },
    {
      label: 'Color',
      values: displayItems.map((item) => calculateColorScore(item.color)),
    },
    {
      label: 'Tamaño',
      values: sizeScores,
    },
    {
      label: 'Inversión',
      values: investmentScores,
    },
    {
      label: 'Valor',
      values: valueScores,
    },
  ];

  const size = 280;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 40;
  const levels = 5;
  const angleStep = 360 / dataPoints.length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        px: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          mb: 1.5,
          color: 'text.secondary',
          fontSize: '0.65rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Análisis Multidimensional
      </Typography>

      {/* SVG Radar Chart */}
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Grid circles */}
        {Array.from({ length: levels }).map((_, idx) => {
          const radius = ((idx + 1) / levels) * maxRadius;
          return (
            <circle
              key={`grid-${idx}`}
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke={
                isLight ? surfacesLight.border.light : surfacesDark.border.light
              }
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        {/* Grid lines from center to each axis */}
        {dataPoints.map((_, idx) => {
          const angle = idx * angleStep;
          const endPoint = polarToCartesian(centerX, centerY, maxRadius, angle);
          return (
            <line
              key={`axis-${idx}`}
              x1={centerX}
              y1={centerY}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke={
                isLight ? surfacesLight.border.light : surfacesDark.border.light
              }
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        {/* Data polygons for each item */}
        {displayItems.map((_, itemIdx) => {
          const values = dataPoints.map((dp) => dp.values[itemIdx]);
          const path = generateRadarPath(values, centerX, centerY, maxRadius);
          const color = itemColors[itemIdx % itemColors.length];

          return (
            <g key={`item-${itemIdx}`}>
              {/* Fill with subtle transparency */}
              <path d={path} fill={alpha(color, 0.08)} stroke="none" />
              {/* Stroke outline with higher visibility */}
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeDasharray={
                  itemIdx === 0 ? '0' : itemIdx === 1 ? '5,3' : '2,2'
                }
              />
              {/* Data points with stronger presence */}
              {values.map((value, pointIdx) => {
                const angle = pointIdx * angleStep;
                const radius = (value / 100) * maxRadius;
                const point = polarToCartesian(centerX, centerY, radius, angle);
                return (
                  <g key={`point-${itemIdx}-${pointIdx}`}>
                    {/* Glow effect */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={6}
                      fill={alpha(color, 0.2)}
                    />
                    {/* Main point */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={4}
                      fill={color}
                      stroke={
                        isLight
                          ? whiteAlpha(1)
                          : surfacesDark.background.primary
                      }
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Axis labels */}
        {dataPoints.map((dp, idx) => {
          const angle = idx * angleStep;
          const labelRadius = maxRadius + 25;
          const labelPoint = polarToCartesian(
            centerX,
            centerY,
            labelRadius,
            angle,
          );

          return (
            <text
              key={`label-${idx}`}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={
                isLight ? surfacesLight.text.primary : surfacesDark.text.primary
              }
              fontSize={11}
              fontWeight={600}
            >
              {dp.label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          mt: 1.5,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {displayItems.map((emerald, idx) => {
          const displayName = emerald.nombre
            .replace(/^L:.*?\s/, '')
            .replace(/^L:/, '')
            .trim();
          return (
            <Box
              key={emerald.item}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: itemColors[idx % itemColors.length],
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: isLight
                    ? surfacesLight.text.secondary
                    : surfacesDark.text.secondary,
                  maxWidth: 80,
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
    </Box>
  );
}
