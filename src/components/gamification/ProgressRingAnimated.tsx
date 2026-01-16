/**
 * ProgressRing Component
 *
 * Circular progress indicator with animated fill.
 * Supports different sizes and color themes.
 *
 * Designed by: Aria (Animation) + Eunoia (Visual Design)
 */

import React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';

// =============================================================================
// TYPES
// =============================================================================

interface ProgressRingProps {
  /** Progress value (0-100) */
  progress: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color theme */
  color?: 'emerald' | 'gold' | 'gradient';
  /** Show percentage text */
  showPercentage?: boolean;
  /** Custom center content */
  children?: React.ReactNode;
  /** Animation duration in seconds */
  animationDuration?: number;
  /** Label for accessibility */
  label?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = 'emerald',
  showPercentage = true,
  children,
  animationDuration = 1,
  label = 'Progreso',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Spring animation for smooth progress
  const springProgress = useSpring(progress, {
    stiffness: 50,
    damping: 20,
  });

  const strokeDashoffset = useTransform(
    springProgress,
    [0, 100],
    [circumference, 0]
  );

  // Get stroke color based on theme
  const getStrokeColor = () => {
    switch (color) {
      case 'gold':
        return goldAccent.primary;
      case 'gradient':
        return `url(#progressGradient-${size})`;
      default:
        return emeraldCore.primary;
    }
  };

  const getBackgroundColor = () => {
    switch (color) {
      case 'gold':
        return `${goldAccent.primary}20`;
      default:
        return `${emeraldCore.primary}20`;
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${Math.round(progress)}%`}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          position: 'absolute',
        }}
      >
        {/* Gradient definition */}
        {color === 'gradient' && (
          <defs>
            <linearGradient
              id={`progressGradient-${size}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={emeraldCore.primary} />
              <stop offset="100%" stopColor={goldAccent.primary} />
            </linearGradient>
          </defs>
        )}

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getBackgroundColor()}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
          transition={{ duration: animationDuration, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children || (
          showPercentage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(progress)}%
              </Typography>
            </motion.div>
          )
        )}
      </Box>
    </Box>
  );
};

export default ProgressRing;
