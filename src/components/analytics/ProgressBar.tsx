/**
 * ProgressBar Component
 *
 * Score breakdown visualization for health metrics.
 * iOS HIG compliant with animated fill and spring physics.
 *
 * Designed by ARIA - Capitana del Concilio de Creacion
 */

import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { chartTokens } from '../../design-system/tokens/charts';
import { emeraldCore } from '../../design-system/tokens/colors';
import { iosDimensions } from '../../design-system';

// =============================================================================
// TYPES
// =============================================================================

export interface ProgressBarProps {
  /** Progress value (0-100) */
  value: number;
  /** Label text */
  label: string;
  /** Sublabel text */
  sublabel?: string;
  /** Bar color */
  color?: string;
  /** Show percentage value */
  showValue?: boolean;
  /** Animate on mount */
  animated?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional icon */
  icon?: React.ElementType;
  /** Status badge text */
  status?: string;
  /** Status color */
  statusColor?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  sublabel,
  color = emeraldCore.primary,
  showValue = true,
  animated = true,
  size = 'md',
  icon: Icon,
  status,
  statusColor,
}) => {
  const theme = useTheme();

  const barHeight = size === 'sm' ? chartTokens.progressBar.heightCompact : chartTokens.progressBar.height;
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <Box
      sx={{
        py: size === 'sm' ? 1 : 1.5,
        px: 2,
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
          {Icon && (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: iosDimensions.borderRadiusStandard,
                bgcolor: alpha(color, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={14} color={color} />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: size === 'sm' ? '0.75rem' : '0.8rem',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Typography>
            {sublabel && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  display: 'block',
                }}
              >
                {sublabel}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Value and status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {showValue && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontSize: size === 'sm' ? '0.8rem' : '0.875rem',
                color: color,
              }}
            >
              {Math.round(clampedValue)}%
            </Typography>
          )}
          {status && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: '0.6rem',
                color: statusColor || (clampedValue >= 60 ? emeraldCore.primary : theme.palette.warning.main),
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {status}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Progress track */}
      <Box
        sx={{
          width: '100%',
          height: barHeight,
          borderRadius: chartTokens.progressBar.borderRadius,
          bgcolor: alpha(color, chartTokens.progressBar.trackOpacity),
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Progress fill */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${clampedValue}%`,
            borderRadius: chartTokens.progressBar.borderRadius,
            bgcolor: color,
            transition: animated ? 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            ...(animated && {
              animation: 'progressGrow 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              '@keyframes progressGrow': {
                '0%': { width: 0 },
                '100%': { width: `${clampedValue}%` },
              },
            }),
          }}
        />

        {/* Shine effect */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '50%',
            width: `${clampedValue}%`,
            borderRadius: chartTokens.progressBar.borderRadius,
            background: `linear-gradient(180deg, ${alpha('#fff', 0.2)} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />
      </Box>
    </Box>
  );
};

export default ProgressBar;
