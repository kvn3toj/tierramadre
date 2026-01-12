/**
 * DonutChart Component
 *
 * Circular progress/breakdown chart following iOS HIG.
 * Animated segments with center label.
 *
 * Designed by ARIA - Capitana del Concilio de Creación
 */

import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

// =============================================================================
// TYPES
// =============================================================================

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  /** Segments data */
  segments: DonutSegment[];
  /** Chart size */
  size?: number;
  /** Donut thickness (as percentage of radius) */
  thickness?: number;
  /** Center label */
  centerLabel?: string;
  /** Center value */
  centerValue?: string | number;
  /** Animated on mount */
  animated?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'bottom' | 'right';
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
};

// =============================================================================
// COMPONENT
// =============================================================================

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 140,
  thickness = 0.25,
  centerLabel,
  centerValue,
  animated = true,
  showLegend = true,
  legendPosition = 'bottom',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const total = useMemo(() => segments.reduce((sum, s) => sum + s.value, 0), [segments]);

  const arcs = useMemo(() => {
    let currentAngle = 0;
    return segments.map((segment) => {
      const segmentAngle = total > 0 ? (segment.value / total) * 360 : 0;
      const arc = {
        ...segment,
        startAngle: currentAngle,
        endAngle: currentAngle + segmentAngle - 1, // -1 for gap
        percentage: total > 0 ? Math.round((segment.value / total) * 100) : 0,
      };
      currentAngle += segmentAngle;
      return arc;
    });
  }, [segments, total]);

  const center = size / 2;
  const outerRadius = (size / 2) - 4;
  const innerRadius = outerRadius * (1 - thickness);
  const strokeWidth = outerRadius - innerRadius;
  const pathRadius = (outerRadius + innerRadius) / 2;

  if (total === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size}>
            <circle
              cx={center}
              cy={center}
              r={pathRadius}
              fill="none"
              stroke={alpha(isDark ? '#fff' : '#000', 0.08)}
              strokeWidth={strokeWidth}
            />
          </svg>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No data
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: legendPosition === 'right' ? 'row' : 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* Chart */}
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={pathRadius}
            fill="none"
            stroke={alpha(isDark ? '#fff' : '#000', 0.06)}
            strokeWidth={strokeWidth}
          />

          {/* Segments */}
          {arcs.map((arc, index) => {
            if (arc.endAngle <= arc.startAngle) return null;

            const pathD = describeArc(
              center,
              center,
              pathRadius,
              arc.startAngle,
              arc.endAngle
            );

            return (
              <path
                key={arc.id}
                d={pathD}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  strokeDasharray: animated ? 1000 : 0,
                  strokeDashoffset: animated ? 1000 : 0,
                  animation: animated
                    ? `drawSegment 0.8s ease-out ${index * 0.1}s forwards`
                    : undefined,
                }}
              />
            );
          })}

          <style>
            {`
              @keyframes drawSegment {
                to { stroke-dashoffset: 0; }
              }
            `}
          </style>
        </svg>

        {/* Center content */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          {centerValue !== undefined && (
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                lineHeight: 1,
                color: 'text.primary',
              }}
            >
              {typeof centerValue === 'number' ? centerValue.toLocaleString() : centerValue}
            </Typography>
          )}
          {centerLabel && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.65rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {centerLabel}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Legend */}
      {showLegend && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: legendPosition === 'right' ? 'column' : 'row',
            gap: legendPosition === 'right' ? 1 : 2,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {arcs.map((arc) => (
            <Box
              key={arc.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: arc.color,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {arc.label}
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    ml: 0.5,
                    fontSize: 'inherit',
                  }}
                >
                  {arc.percentage}%
                </Typography>
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DonutChart;
