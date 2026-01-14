/**
 * AreaChart Component
 *
 * Weekly trend visualization with gradient area fill.
 * iOS HIG compliant with smooth animations and touch targets.
 *
 * Designed by ARIA - Capitana del Concilio de Creacion
 */

import React, { useMemo, useState } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { chartTokens, chartColors } from '../../design-system/tokens/charts';

// =============================================================================
// TYPES
// =============================================================================

export interface AreaChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AreaChartProps {
  /** Data points for the chart */
  data: AreaChartDataPoint[];
  /** Chart height */
  height?: number;
  /** Line/area color */
  color?: string;
  /** Show X axis labels */
  showXAxis?: boolean;
  /** Show Y axis labels */
  showYAxis?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Animate on mount */
  animated?: boolean;
  /** Chart title */
  title?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const generatePath = (
  data: AreaChartDataPoint[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number }
): { linePath: string; areaPath: string; points: Array<{ x: number; y: number; value: number; label: string }> } => {
  if (data.length === 0) {
    return { linePath: '', areaPath: '', points: [] };
  }

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y, value: d.value, label: d.date };
  });

  // Generate smooth bezier curve
  let linePath = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` Q ${prev.x + (cpx - prev.x) * 0.5} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`;
    linePath += ` Q ${cpx + (curr.x - cpx) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Area path (closes to bottom)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

  return { linePath, areaPath, points };
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  height = chartTokens.areaChart.height,
  color = chartColors.emerald.line,
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  animated = true,
  title,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 400; // Will be responsive via viewBox
  const padding = chartTokens.areaChart.padding;

  const { linePath, areaPath, points } = useMemo(
    () => generatePath(data, width, height, padding),
    [data, width, height, padding]
  );

  const gradientId = useMemo(() => `area-gradient-${Math.random().toString(36).slice(2)}`, []);

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);

  // Y-axis labels (3 points: min, mid, max)
  const yLabels = [
    { value: maxValue, y: padding.top },
    { value: Math.round((maxValue + minValue) / 2), y: padding.top + (height - padding.top - padding.bottom) / 2 },
    { value: minValue, y: height - padding.bottom },
  ];

  if (data.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.disabled',
        }}
      >
        <Typography variant="body2">Sin datos</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {title && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            mb: 1,
            display: 'block',
          }}
        >
          {title}
        </Typography>
      )}

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Weekly trend chart"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Gradient for area fill */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && (
          <g opacity={chartTokens.grid.opacity}>
            {yLabels.map((label, i) => (
              <line
                key={`grid-${i}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={label.y}
                y2={label.y}
                stroke={isDark ? '#fff' : '#000'}
                strokeWidth={chartTokens.grid.width}
                strokeDasharray={chartTokens.grid.dashArray}
              />
            ))}
          </g>
        )}

        {/* Y-axis labels */}
        {showYAxis && (
          <g>
            {yLabels.map((label, i) => (
              <text
                key={`y-label-${i}`}
                x={padding.left - 8}
                y={label.y}
                fill={isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5)}
                fontSize="10"
                fontWeight="500"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {label.value}
              </text>
            ))}
          </g>
        )}

        {/* X-axis labels */}
        {showXAxis && (
          <g>
            {points.map((point, i) => (
              <text
                key={`x-label-${i}`}
                x={point.x}
                y={height - padding.bottom + 16}
                fill={
                  hoveredIndex === i
                    ? color
                    : isDark
                      ? alpha('#fff', 0.5)
                      : alpha('#000', 0.5)
                }
                fontSize="10"
                fontWeight={hoveredIndex === i ? '600' : '500'}
                textAnchor="middle"
              >
                {point.label}
              </text>
            ))}
          </g>
        )}

        {/* Area fill */}
        {areaPath && (
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
              strokeDasharray: animated ? 2000 : 0,
              strokeDashoffset: animated ? 2000 : 0,
              animation: animated
                ? `drawLine ${chartTokens.animation.pathDraw}ms ease-out forwards`
                : undefined,
            }}
          />
        )}

        {/* Data points with touch targets */}
        {points.map((point, i) => (
          <g key={`point-${i}`}>
            {/* Invisible touch target */}
            <circle
              cx={point.x}
              cy={point.y}
              r={chartTokens.point.touchTargetRadius}
              fill="transparent"
              cursor="pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />

            {/* Visible point */}
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === i ? chartTokens.point.radiusHover : chartTokens.point.radius}
              fill={color}
              stroke={isDark ? '#1E293B' : '#fff'}
              strokeWidth={2}
              style={{
                opacity: animated ? 0 : 1,
                animation: animated
                  ? `popIn 0.3s ease-out ${0.8 + i * 0.05}s forwards`
                  : undefined,
                transition: 'r 0.2s ease',
              }}
            />

            {/* Tooltip on hover */}
            {hoveredIndex === i && (
              <g>
                <rect
                  x={point.x - 25}
                  y={point.y - 36}
                  width={50}
                  height={24}
                  rx={6}
                  fill={isDark ? '#1E293B' : '#fff'}
                  stroke={alpha(color, 0.2)}
                  strokeWidth={1}
                  style={{
                    filter: `drop-shadow(0 2px 4px ${alpha('#000', 0.1)})`,
                  }}
                />
                <text
                  x={point.x}
                  y={point.y - 20}
                  fill={color}
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {point.value}
                </text>
              </g>
            )}
          </g>
        ))}

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
    </Box>
  );
};

export default AreaChart;
