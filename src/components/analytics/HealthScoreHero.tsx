/**
 * HealthScoreHero Component
 *
 * Large health score display with animated ring and glow effects.
 * iOS HIG compliant with spring animations.
 *
 * Designed by ARIA - Capitana del Concilio de Creacion
 */

import React, { useMemo, useEffect, useState } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { goldAccent, semanticColors } from '../../design-system/tokens/colors';

// =============================================================================
// TYPES
// =============================================================================

export interface HealthScoreHeroProps {
  /** Health score (0-100) */
  score: number;
  /** Previous score for comparison */
  previousScore?: number;
  /** Score breakdown (unused but kept for future use) */
  breakdown?: {
    cotizacion: number;
    engagement: number;
    retention: number;
    conversion: number;
  };
  /** Animate on mount */
  animated?: boolean;
  /** Size of the ring */
  size?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars

// =============================================================================
// HELPERS
// =============================================================================

const getHealthColor = (score: number): string => {
  if (score >= 80) return semanticColors.success.main;
  if (score >= 60) return goldAccent.primary;
  if (score >= 40) return semanticColors.warning.main;
  return semanticColors.error.main;
};

const getHealthLabel = (score: number): string => {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bueno';
  if (score >= 40) return 'Regular';
  return 'Atención';
};

const getTrend = (current: number, previous?: number): 'up' | 'down' | 'flat' => {
  if (!previous) return 'flat';
  const diff = current - previous;
  if (Math.abs(diff) < 2) return 'flat';
  return diff > 0 ? 'up' : 'down';
};

// =============================================================================
// COMPONENT
// =============================================================================

export const HealthScoreHero: React.FC<HealthScoreHeroProps> = ({
  score,
  previousScore,
  // breakdown kept for future use
  animated = true,
  size = 180,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);

  const color = useMemo(() => getHealthColor(score), [score]);
  const label = useMemo(() => getHealthLabel(score), [score]);
  const trend = useMemo(() => getTrend(score, previousScore), [score, previousScore]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  // Animated score counting
  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    const duration = 1500;
    const startTime = Date.now();
    const startScore = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startScore + (score - startScore) * eased);
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, animated]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? semanticColors.success.main
      : trend === 'down'
        ? semanticColors.error.main
        : alpha(isDark ? '#fff' : '#000', 0.4);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* Ring container */}
      <Box sx={{ position: 'relative', width: size, height: size }}>
        {/* Glow effect */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(color, 0.2)} 0%, transparent 70%)`,
            filter: 'blur(20px)',
            animation: animated ? 'pulse 2s ease-in-out infinite' : undefined,
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.6 },
              '50%': { opacity: 1 },
            },
          }}
        />

        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="health-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={alpha(color, 0.12)}
            strokeWidth="12"
          />

          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#health-gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? circumference : circumference - progress}
            style={{
              transition: animated ? 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
              filter: `drop-shadow(0 0 12px ${alpha(color, 0.5)})`,
              ...(animated && {
                animation: 'ringDraw 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }),
            }}
          />

          <style>
            {`
              @keyframes ringDraw {
                to { stroke-dashoffset: ${circumference - progress}; }
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
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: color,
              lineHeight: 1,
              fontSize: size * 0.28,
              textShadow: `0 0 20px ${alpha(color, 0.3)}`,
            }}
          >
            {displayScore}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: size * 0.065,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {label}
          </Typography>
        </Box>
      </Box>

      {/* Trend indicator */}
      {previousScore !== undefined && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: '9999px',
            bgcolor: alpha(trendColor, 0.1),
          }}
        >
          <TrendIcon size={14} color={trendColor} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.7rem',
              color: trendColor,
            }}
          >
            {trend === 'up' ? '+' : trend === 'down' ? '' : ''}
            {score - previousScore} pts
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              color: 'text.secondary',
            }}
          >
            vs anterior
          </Typography>
        </Box>
      )}

      {/* Description */}
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          textAlign: 'center',
          fontSize: '0.75rem',
          maxWidth: 240,
        }}
      >
        Basado en cotizaciones, engagement, retención y conversión
      </Typography>
    </Box>
  );
};

export default HealthScoreHero;
