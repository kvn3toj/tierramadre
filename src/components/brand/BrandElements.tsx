/**
 * TIERRA MADRE - Sacred Brand Elements
 * Reusable geometric components for conscious luxury
 */

import React from 'react';
import { Box, styled } from '@mui/material';
import { colors, spacing, geometry, motion, brandVoice, typography } from '../../styles/brandTokens';

// ═══════════════════════════════════════════════════════════════
// CORNER DECORATION - Geometric Presence
// ═══════════════════════════════════════════════════════════════

interface CornerDecorationProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const CornerDecoration: React.FC<CornerDecorationProps> = ({
  position,
  size = 'medium',
  color = colors.emeraldDeep,
}) => {
  const dimension = geometry.cornerDecoration[size];

  const positionStyles = {
    'top-left': { top: spacing.md, left: spacing.md },
    'top-right': { top: spacing.md, right: spacing.md },
    'bottom-left': { bottom: spacing.md, left: spacing.md },
    'bottom-right': { bottom: spacing.md, right: spacing.md },
  };

  const rotations = {
    'top-left': 0,
    'top-right': 90,
    'bottom-right': 180,
    'bottom-left': 270,
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        ...positionStyles[position],
        width: dimension,
        height: dimension,
        opacity: brandVoice.opacity.subtle,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        style={{ transform: `rotate(${rotations[position]}deg)` }}
      >
        <g stroke={color} strokeWidth="1" fill="none">
          <line x1="0" y1="0" x2={dimension} y2="0" />
          <line x1="0" y1="0" x2="0" y2={dimension} />
        </g>
      </svg>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════
// SACRED DIVIDER - Elegant Separation
// ═══════════════════════════════════════════════════════════════

interface DividerProps {
  variant?: 'simple' | 'gradient' | 'geometric';
  width?: string | number;
  color?: string;
  margin?: number;
}

export const SacredDivider: React.FC<DividerProps> = ({
  variant = 'simple',
  width = '100%',
  color = colors.silverGray,
  margin = spacing.lg,
}) => {
  if (variant === 'gradient') {
    return (
      <Box
        sx={{
          width,
          height: '1px',
          my: `${margin}px`,
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          opacity: brandVoice.opacity.present,
        }}
      />
    );
  }

  if (variant === 'geometric') {
    return (
      <Box
        sx={{
          width,
          my: `${margin}px`,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
        }}
      >
        <Box sx={{ width: 6, height: 6, backgroundColor: color, transform: 'rotate(45deg)' }} />
        <Box sx={{ flex: 1, height: '1px', backgroundColor: color, opacity: brandVoice.opacity.subtle }} />
        <Box sx={{ width: 6, height: 6, backgroundColor: color, transform: 'rotate(45deg)' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width,
        height: '1px',
        my: `${margin}px`,
        backgroundColor: color,
        opacity: brandVoice.opacity.subtle,
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════
// ORIGIN SEAL - Colombia Map with Emerald Point
// ═══════════════════════════════════════════════════════════════

interface OriginSealProps {
  size?: number;
  showLabel?: boolean;
}

export const OriginSeal: React.FC<OriginSealProps> = ({
  size = 80,
  showLabel = true,
}) => {
  // Simplified Colombia silhouette
  const colombiaPath = 'M 40 10 L 60 15 L 70 25 L 75 40 L 70 60 L 60 75 L 45 80 L 30 75 L 20 60 L 15 40 L 20 25 L 30 15 Z';
  const muzoPoint = { x: 42, y: 35 }; // Approximate Muzo location

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Background circle */}
        <circle cx="50" cy="50" r="48" fill={colors.naturalWhite} stroke={colors.silverGray} strokeWidth="1" />

        {/* Colombia map */}
        <path d={colombiaPath} fill={colors.lightGray} stroke={colors.charcoal} strokeWidth="0.5" opacity={0.6} />

        {/* Emerald origin point */}
        <circle cx={muzoPoint.x} cy={muzoPoint.y} r="3" fill={colors.emeraldDeep} />

        {/* Pulsing effect */}
        <circle cx={muzoPoint.x} cy={muzoPoint.y} r="3" fill="none" stroke={colors.neonGreen} strokeWidth="1" opacity={0.3}>
          <animate attributeName="r" from="3" to="8" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>

      {showLabel && (
        <Box
          sx={{
            fontSize: '0.65rem',
            fontFamily: typography.sans.technical,
            color: colors.charcoal,
            letterSpacing: typography.tracking.wider,
            textTransform: 'uppercase',
            opacity: brandVoice.opacity.present,
          }}
        >
          Origen: Muzo, Colombia
        </Box>
      )}
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRUST BADGE - Certification Seal
// ═══════════════════════════════════════════════════════════════

interface TrustBadgeProps {
  text: string;
  icon?: 'check' | 'shield' | 'gem';
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  text,
  icon = 'check',
}) => {
  const renderIcon = () => {
    const size = 16;
    switch (icon) {
      case 'check':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
              fill={colors.emeraldDeep}
            />
          </svg>
        );
      case 'shield':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
              fill={colors.emeraldDeep}
              opacity={0.3}
            />
          </svg>
        );
      case 'gem':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 2L4 7l8 15 8-15-8-5z"
              fill={colors.emeraldDeep}
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs}px ${spacing.sm}px`,
        border: `1px solid ${colors.silverGray}`,
        borderRadius: geometry.radius.subtle,
        backgroundColor: colors.naturalWhite,
      }}
    >
      {renderIcon()}
      <Box
        sx={{
          fontSize: '0.75rem',
          fontFamily: typography.sans.clean,
          color: colors.charcoal,
          letterSpacing: typography.tracking.wide,
          textTransform: 'uppercase',
        }}
      >
        {text}
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════
// FLOWER SYMBOL - Brand Logo Element (4 Petals)
// ═══════════════════════════════════════════════════════════════

interface FlowerSymbolProps {
  size?: number;
  variant?: 'outline' | 'filled' | 'watermark';
}

export const FlowerSymbol: React.FC<FlowerSymbolProps> = ({
  size = 64,
  variant = 'outline',
}) => {
  const center = size / 2;
  const petalRadius = size * 0.35;
  const opacity = variant === 'watermark' ? brandVoice.opacity.ghost : brandVoice.opacity.present;
  const fill = variant === 'filled' ? colors.emeraldDeep : 'none';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity }}>
      {/* Center */}
      <circle cx={center} cy={center} r={size * 0.08} fill={fill || colors.emeraldDeep} stroke={colors.emeraldDeep} strokeWidth="1" />

      {/* 4 Petals */}
      {[0, 90, 180, 270].map((angle) => (
        <ellipse
          key={angle}
          cx={center}
          cy={center - petalRadius * 0.5}
          rx={petalRadius * 0.3}
          ry={petalRadius * 0.5}
          fill={fill}
          stroke={colors.emeraldDeep}
          strokeWidth="1"
          transform={`rotate(${angle} ${center} ${center})`}
        />
      ))}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════
// GEOMETRIC FRAME - Technical Container
// ═══════════════════════════════════════════════════════════════

interface GeometricFrameProps {
  children: React.ReactNode;
  variant?: 'minimal' | 'technical' | 'luxury';
  padding?: number;
}

export const GeometricFrame = styled(Box, {
  shouldForwardProp: (prop) => !['variant', 'padding'].includes(prop as string),
})<GeometricFrameProps>(({ variant = 'minimal', padding = spacing.lg }) => {
  const base = {
    padding,
    position: 'relative' as const,
    transition: `all ${motion.duration.normal} ${motion.easing.smooth}`,
  };

  switch (variant) {
    case 'technical':
      return {
        ...base,
        border: `1px solid ${colors.silverGray}`,
        backgroundColor: colors.naturalWhite,
      };
    case 'luxury':
      return {
        ...base,
        border: `2px solid ${colors.emeraldDeep}`,
        backgroundColor: colors.pureWhite,
        boxShadow: geometry.shadow.soft,
        '&:hover': {
          boxShadow: geometry.shadow.elevated,
          transform: 'translateY(-2px)',
        },
      };
    default:
      return {
        ...base,
        borderTop: `1px solid ${colors.silverGray}`,
        borderBottom: `1px solid ${colors.silverGray}`,
      };
  }
});

// Export all
export {
  colors,
  spacing,
  geometry,
  typography,
  motion,
  brandVoice,
} from '../../styles/brandTokens';
