/**
 * ProgressGardenRing
 *
 * Concentric SVG ring used in the garden screen. Two arcs:
 *   - outer: low-opacity track with leaf-like dashes
 *   - inner: emerald gradient stroke that fills as `progress` increases
 *
 * Surrounds the LivingEmerald and acts as the dominant progress signifier.
 */

import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';

interface ProgressGardenRingProps {
  /** 0..1 */
  progress: number;
  /** Render diameter in px */
  size: number;
  /** Stroke width for the emerald arc */
  strokeWidth?: number;
  /** Force completion styling regardless of progress */
  isComplete?: boolean;
}

export const ProgressGardenRing: React.FC<ProgressGardenRingProps> = ({
  progress,
  size,
  strokeWidth = 8,
  isComplete = false,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = size / 2 - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="garden-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={emeraldCore.light} />
            <stop offset="50%" stopColor={emeraldCore.primary} />
            <stop offset="100%" stopColor={isComplete ? goldAccent.primary : emeraldCore.dark} />
          </linearGradient>
          <filter id="garden-ring-glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={emeraldCore.primary}
          strokeOpacity={0.12}
          strokeWidth={strokeWidth}
          strokeDasharray="2 8"
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#garden-ring-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          initial={false}
          transition={{ type: 'spring', stiffness: 80, damping: 22, mass: 1.2 }}
          filter="url(#garden-ring-glow)"
        />

        {/* Tiny golden seeds along the track at quarter points */}
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const angle = -Math.PI / 2 + t * 2 * Math.PI;
          const cx = size / 2 + Math.cos(angle) * radius;
          const cy = size / 2 + Math.sin(angle) * radius;
          const reached = clamped >= t - 0.01;
          return (
            <motion.circle
              key={t}
              cx={cx}
              cy={cy}
              r={reached ? 4 : 2.5}
              fill={reached ? goldAccent.primary : emeraldCore.primary}
              fillOpacity={reached ? 1 : 0.3}
              animate={reached ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 2.5, repeat: reached ? Infinity : 0, ease: 'easeInOut' }}
              style={
                reached
                  ? { filter: `drop-shadow(0 0 4px ${goldAccent.primary})` }
                  : undefined
              }
            />
          );
        })}
      </svg>
    </Box>
  );
};

export default ProgressGardenRing;
