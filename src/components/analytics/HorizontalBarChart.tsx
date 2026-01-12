/**
 * HorizontalBarChart Component
 *
 * Visual bar chart for ranking data following iOS HIG.
 * Animated bars with medal badges for top 3.
 *
 * Designed by ARIA - Capitana del Concilio de Creación
 */

import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Crown, Medal, Award, ChevronRight } from 'lucide-react';
import { emeraldCore } from '../../design-system/tokens/colors';

// =============================================================================
// TYPES
// =============================================================================

export interface BarDataItem {
  id: string | number;
  label: string;
  sublabel?: string;
  value: number;
}

export interface HorizontalBarChartProps {
  /** Data items to display */
  data: BarDataItem[];
  /** Maximum items to show */
  maxItems?: number;
  /** Bar color */
  color?: string;
  /** Show rank badges for top 3 */
  showMedals?: boolean;
  /** Animated bars on mount */
  animated?: boolean;
  /** Click handler for bar items */
  onItemClick?: (item: BarDataItem) => void;
  /** Unit label (e.g., "views", "sales") */
  unit?: string;
  /** Show navigation chevron */
  showChevron?: boolean;
}

// =============================================================================
// MEDAL BADGES
// =============================================================================

const MedalBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const medals = [
    { icon: Crown, color: '#FFD700', bg: alpha('#FFD700', 0.15), label: '1st' },
    { icon: Medal, color: '#C0C0C0', bg: alpha('#C0C0C0', 0.15), label: '2nd' },
    { icon: Award, color: '#CD7F32', bg: alpha('#CD7F32', 0.15), label: '3rd' },
  ];

  if (rank > 3) {
    return (
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: alpha('#000', 0.05),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          {rank}
        </Typography>
      </Box>
    );
  }

  const medal = medals[rank - 1];
  const Icon = medal.icon;

  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        bgcolor: medal.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={14} color={medal.color} />
    </Box>
  );
};

// =============================================================================
// COMPONENT
// =============================================================================

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  maxItems = 10,
  color = emeraldCore.primary,
  showMedals = true,
  animated = true,
  onItemClick,
  unit = '',
  showChevron = true,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const displayData = data.slice(0, maxItems);
  const maxValue = Math.max(...displayData.map(d => d.value), 1);

  if (displayData.length === 0) {
    return (
      <Box
        sx={{
          py: 4,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">No data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {displayData.map((item, index) => {
        const barWidth = (item.value / maxValue) * 100;
        const isInteractive = !!onItemClick;
        const rank = index + 1;

        return (
          <Box
            key={item.id}
            onClick={() => onItemClick?.(item)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1.5,
              px: 2,
              cursor: isInteractive ? 'pointer' : 'default',
              borderBottom: index < displayData.length - 1
                ? `1px solid ${alpha(isDark ? '#fff' : '#000', 0.06)}`
                : 'none',
              transition: 'background-color 0.15s ease',
              '&:hover': isInteractive ? {
                bgcolor: alpha(color, 0.05),
              } : {},
              '&:active': isInteractive ? {
                bgcolor: alpha(color, 0.1),
              } : {},
            }}
          >
            {/* Rank badge */}
            {showMedals && <MedalBadge rank={rank} />}

            {/* Label and bar */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    mr: 1,
                  }}
                >
                  {item.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: rank <= 3 ? color : 'text.primary',
                    flexShrink: 0,
                  }}
                >
                  {item.value.toLocaleString()}
                  {unit && (
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 400,
                        color: 'text.secondary',
                        ml: 0.5,
                      }}
                    >
                      {unit}
                    </Typography>
                  )}
                </Typography>
              </Box>

              {/* Bar */}
              <Box
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(isDark ? '#fff' : '#000', 0.06),
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    background: rank <= 3
                      ? `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`
                      : alpha(color, 0.5),
                    width: animated ? 0 : `${barWidth}%`,
                    animation: animated
                      ? `growBar 0.6s ease-out ${index * 0.05}s forwards`
                      : undefined,
                    '@keyframes growBar': {
                      from: { width: 0 },
                      to: { width: `${barWidth}%` },
                    },
                  }}
                />
              </Box>

              {/* Sublabel */}
              {item.sublabel && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    mt: 0.25,
                    display: 'block',
                  }}
                >
                  {item.sublabel}
                </Typography>
              )}
            </Box>

            {/* Chevron */}
            {showChevron && isInteractive && (
              <ChevronRight
                size={16}
                color={alpha(isDark ? '#fff' : '#000', 0.3)}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default HorizontalBarChart;
