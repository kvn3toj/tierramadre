/**
 * Progress Ring Component
 *
 * Circular progress indicator for achievements and XP progress.
 * Uses SVG for smooth animations and crisp rendering.
 */

import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore } from '../../design-system/tokens/colors';

interface ProgressRingProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Primary color */
  color?: string;
  /** Background track color */
  trackColor?: string;
  /** Show percentage text in center */
  showPercentage?: boolean;
  /** Custom center content */
  children?: React.ReactNode;
  /** Label below the ring */
  label?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 64,
  strokeWidth = 6,
  color,
  trackColor,
  showPercentage = false,
  children,
  label,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Calculate ring dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  // Default colors based on theme
  const ringColor = color || emeraldCore.primary;
  const ringTrackColor = trackColor || (isLight ? alpha('#000', 0.08) : alpha('#fff', 0.12));

  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringTrackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-out',
            }}
          />
        </svg>

        {/* Center content */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children || (showPercentage && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: size * 0.22,
                color: ringColor,
              }}
            >
              {Math.round(clampedProgress)}%
            </Typography>
          ))}
        </Box>
      </Box>

      {label && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.5,
            color: isLight ? 'text.secondary' : alpha('#fff', 0.7),
            fontSize: '0.7rem',
            textAlign: 'center',
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default ProgressRing;
