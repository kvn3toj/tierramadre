/**
 * SparklineChart Component
 *
 * Minimalist trend visualization following iOS HIG.
 * Shows 7-day trend with optional area fill and animated path.
 *
 * Designed by ARIA - Capitana del Concilio de Creación
 */

import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { chartTokens, chartColors, chartBadge } from '../../design-system/tokens/charts';
import { semanticColors } from '../../design-system/tokens/colors';

// =============================================================================
// TYPES
// =============================================================================

export interface SparklineDataPoint {
  value: number;
  label?: string;
}

export interface SparklineChartProps {
  /** Data points for the sparkline (typically 7 days) */
  data: SparklineDataPoint[];
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Line color */
  color?: string;
  /** Show area fill under line */
  showArea?: boolean;
  /** Show trend badge */
  showTrend?: boolean;
  /** Animate on mount */
  animated?: boolean;
  /** Label for accessibility */
  label?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const calculateTrend = (data: SparklineDataPoint[]): { percent: number; direction: 'up' | 'down' | 'flat' } => {
  if (data.length < 2) return { percent: 0, direction: 'flat' };

  const firstHalf = data.slice(0, Math.ceil(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

  if (firstAvg === 0) return { percent: secondAvg > 0 ? 100 : 0, direction: secondAvg > 0 ? 'up' : 'flat' };

  const percent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);

  if (Math.abs(percent) < 3) return { percent: 0, direction: 'flat' };
  return { percent: Math.abs(percent), direction: percent > 0 ? 'up' : 'down' };
};

const generatePath = (
  data: SparklineDataPoint[],
  width: number,
  height: number,
  padding: number = 4
): string => {
  if (data.length === 0) return '';

  const values = data.map(d => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = padding + chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y };
  });

  // Generate smooth bezier curve
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${prev.x + (cpx - prev.x) * 0.5} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`;
    path += ` Q ${cpx + (curr.x - cpx) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return path;
};

const generateAreaPath = (
  data: SparklineDataPoint[],
  width: number,
  height: number,
  padding: number = 4
): string => {
  const linePath = generatePath(data, width, height, padding);
  if (!linePath) return '';

  const chartWidth = width - padding * 2;
  const lastX = padding + chartWidth;
  const bottomY = height - padding;
  const firstX = padding;

  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
};

// =============================================================================
// COMPONENT
// =============================================================================

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 120,
  height = 40,
  color = chartColors.emerald.line,
  showArea = true,
  showTrend = true,
  animated = true,
  label = 'Trend',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const trend = useMemo(() => calculateTrend(data), [data]);
  const linePath = useMemo(() => generatePath(data, width, height), [data, width, height]);
  const areaPath = useMemo(() => generateAreaPath(data, width, height), [data, width, height]);

  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).slice(2)}`, []);

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend.direction === 'up'
    ? semanticColors.success.main
    : trend.direction === 'down'
      ? semanticColors.error.main
      : alpha(isDark ? '#fff' : '#000', 0.4);

  const badgeStyle = trend.direction === 'up'
    ? chartBadge.positive
    : trend.direction === 'down'
      ? chartBadge.negative
      : chartBadge.neutral;

  if (data.length === 0) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.disabled',
        }}
      >
        <Typography variant="caption">No data</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        {showArea && areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            style={{
              opacity: animated ? 0 : 1,
              animation: animated ? 'fadeIn 0.6s ease-out 0.3s forwards' : undefined,
            }}
          />
        )}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={chartTokens.line.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: animated ? 1000 : 0,
              strokeDashoffset: animated ? 1000 : 0,
              animation: animated ? `drawLine ${chartTokens.animation.pathDraw}ms ease-out forwards` : undefined,
            }}
          />
        )}

        {/* End point dot */}
        {data.length > 0 && (
          <circle
            cx={width - 4}
            cy={4 + (height - 8) - ((data[data.length - 1].value - Math.min(...data.map(d => d.value))) / (Math.max(...data.map(d => d.value), 1) - Math.min(...data.map(d => d.value), 0) || 1)) * (height - 8)}
            r={4}
            fill={color}
            style={{
              opacity: animated ? 0 : 1,
              animation: animated ? 'popIn 0.3s ease-out 0.8s forwards' : undefined,
            }}
          />
        )}

        <style>
          {`
            @keyframes drawLine {
              to { stroke-dashoffset: 0; }
            }
            @keyframes fadeIn {
              to { opacity: 1; }
            }
            @keyframes popIn {
              0% { opacity: 0; transform: scale(0); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}
        </style>
      </svg>

      {/* Trend badge */}
      {showTrend && trend.direction !== 'flat' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            bgcolor: isDark ? badgeStyle.bg : badgeStyle.bgLight,
          }}
        >
          <TrendIcon size={12} color={trendColor} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.65rem',
              color: trendColor,
              lineHeight: 1,
            }}
          >
            {trend.percent}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SparklineChart;
