/**
 * QualityBadge Component
 * Sacred geometry-inspired quality tier badges.
 * Uses geometric shapes that increase in complexity with quality tier.
 */
import { Box, Tooltip, Typography, alpha } from '@mui/material';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, goldAccent } from '../design-system/tokens/colors';

type QualityTier = 'Estándar' | 'Fina' | 'SuperFina' | 'Sublime' | string;

interface QualityBadgeProps {
  quality: QualityTier;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animate?: boolean;
}

// Sacred geometry configurations for each quality tier
const QUALITY_CONFIG: Record<string, {
  sides: number;
  gradient: string[];
  glow: boolean;
  label: string;
  description: string;
}> = {
  'Estándar': {
    sides: 6, // Hexagon - foundation, stability
    gradient: [emeraldCore.lighter, emeraldCore.light],
    glow: false,
    label: 'Estándar',
    description: 'Calidad base, buena relación precio-valor',
  },
  'Fina': {
    sides: 8, // Octagon - balance, regeneration
    gradient: [emeraldCore.light, emeraldCore.primary],
    glow: false,
    label: 'Fina',
    description: 'Calidad superior, excelente claridad',
  },
  'SuperFina': {
    sides: 10, // Decagon - completeness, divine order
    gradient: [emeraldCore.primary, goldAccent.light],
    glow: true,
    label: 'Super Fina',
    description: 'Calidad excepcional, muy rara',
  },
  'Sublime': {
    sides: 12, // Dodecagon - cosmic perfection
    gradient: [goldAccent.primary, goldAccent.light, goldAccent.primary],
    glow: true,
    label: 'Sublime',
    description: 'La más alta calidad, pieza de colección',
  },
};

// Size configurations
const SIZE_CONFIG = {
  small: { width: 20, height: 20, fontSize: '0.6rem', strokeWidth: 1.5 },
  medium: { width: 28, height: 28, fontSize: '0.7rem', strokeWidth: 2 },
  large: { width: 36, height: 36, fontSize: '0.8rem', strokeWidth: 2.5 },
};

// Generate polygon points for a regular polygon
function generatePolygonPoints(sides: number, radius: number, centerX: number, centerY: number): string {
  const points: string[] = [];
  const angleStep = (2 * Math.PI) / sides;
  const startAngle = -Math.PI / 2; // Start from top

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return points.join(' ');
}

// Sacred geometry SVG shape
function SacredShape({
  sides,
  gradient,
  glow,
  size,
  animate,
}: {
  sides: number;
  gradient: string[];
  glow: boolean;
  size: typeof SIZE_CONFIG.medium;
  animate: boolean;
}) {
  const { width, height, strokeWidth } = size;
  const radius = (width / 2) - strokeWidth;
  const centerX = width / 2;
  const centerY = height / 2;
  const gradientId = `quality-gradient-${sides}`;
  const glowId = `quality-glow-${sides}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        filter: glow ? `drop-shadow(0 0 ${strokeWidth * 2}px ${gradient[0]})` : undefined,
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {gradient.map((color, index) => (
            <stop
              key={index}
              offset={`${(index / (gradient.length - 1)) * 100}%`}
              stopColor={color}
            />
          ))}
        </linearGradient>
        {glow && (
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Inner filled polygon */}
      <polygon
        points={generatePolygonPoints(sides, radius * 0.7, centerX, centerY)}
        fill={`url(#${gradientId})`}
        opacity={0.3}
      />

      {/* Outer stroke polygon */}
      <polygon
        points={generatePolygonPoints(sides, radius, centerX, centerY)}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        style={animate ? {
          animation: 'sacredRotate 20s linear infinite',
        } : undefined}
      />

      {/* Center dot for higher tiers */}
      {sides >= 10 && (
        <circle
          cx={centerX}
          cy={centerY}
          r={strokeWidth}
          fill={gradient[gradient.length - 1]}
        />
      )}
    </svg>
  );
}

export default function QualityBadge({
  quality,
  size = 'medium',
  showLabel = true,
  animate = false,
}: QualityBadgeProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Get configuration for this quality tier (fallback to Estándar)
  const config = QUALITY_CONFIG[quality] || QUALITY_CONFIG['Estándar'];
  const sizeConfig = SIZE_CONFIG[size];

  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {config.label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {config.description}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: showLabel ? 1.5 : 0.5,
          py: 0.5,
          borderRadius: 2,
          bgcolor: alpha(config.gradient[0], isLight ? 0.1 : 0.15),
          border: '1px solid',
          borderColor: alpha(config.gradient[0], 0.3),
          cursor: 'default',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: alpha(config.gradient[0], isLight ? 0.15 : 0.2),
            borderColor: alpha(config.gradient[0], 0.5),
          },
        }}
      >
        <SacredShape
          sides={config.sides}
          gradient={config.gradient}
          glow={config.glow}
          size={sizeConfig}
          animate={animate}
        />

        {showLabel && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: sizeConfig.fontSize,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: `linear-gradient(135deg, ${config.gradient.join(', ')})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: config.glow ? 'transparent' : undefined,
              color: config.glow ? undefined : config.gradient[0],
            }}
          >
            {config.label}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}

// Compact version for grid cards
export function QualityBadgeCompact({ quality }: { quality: QualityTier }) {
  return <QualityBadge quality={quality} size="small" showLabel={false} />;
}

// Add keyframes for animation (should be added to global styles)
export const qualityBadgeKeyframes = `
@keyframes sacredRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
