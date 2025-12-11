/**
 * TrustScoreLotus Component
 * Sacred lotus petal visualization for trust scores.
 * 5 petals representing 5 trust dimensions, filled based on score.
 */
import { Box, Tooltip, Typography, alpha } from '@mui/material';
import { useThemeMode } from '../contexts/ThemeContext';
import { TrustScoreBreakdown } from '../types';
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../design-system/tokens/colors';

interface TrustScoreLotusProps {
  score: TrustScoreBreakdown;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animate?: boolean;
}

const SIZE_CONFIG = {
  small: { width: 28, height: 28, fontSize: '0.6rem' },
  medium: { width: 40, height: 40, fontSize: '0.7rem' },
  large: { width: 56, height: 56, fontSize: '0.8rem' },
};

// Trust dimension labels in Spanish
const DIMENSION_LABELS: Record<string, string> = {
  provenance: 'Procedencia',
  quality: 'Calidad',
  aesthetic: 'Estética',
  market: 'Mercado',
};

// Generate lotus petal path
function generatePetalPath(
  index: number,
  total: number,
  centerX: number,
  centerY: number,
  radius: number,
  fillPercent: number
): string {
  const angleStep = (2 * Math.PI) / total;
  const startAngle = -Math.PI / 2 + index * angleStep;
  const endAngle = startAngle + angleStep;

  // Petal dimensions
  const innerRadius = radius * 0.25;
  const petalLength = radius * 0.75 * (fillPercent / 100);

  // Calculate petal center angle
  const midAngle = (startAngle + endAngle) / 2;

  // Control points for the bezier curves
  const tipX = centerX + (innerRadius + petalLength) * Math.cos(midAngle);
  const tipY = centerY + (innerRadius + petalLength) * Math.sin(midAngle);

  // Base points
  const baseLeftX = centerX + innerRadius * Math.cos(midAngle - 0.3);
  const baseLeftY = centerY + innerRadius * Math.sin(midAngle - 0.3);
  const baseRightX = centerX + innerRadius * Math.cos(midAngle + 0.3);
  const baseRightY = centerY + innerRadius * Math.sin(midAngle + 0.3);

  // Control points for curves
  const ctrlDist = petalLength * 0.6;
  const ctrlLeftX = centerX + (innerRadius + ctrlDist) * Math.cos(midAngle - 0.15);
  const ctrlLeftY = centerY + (innerRadius + ctrlDist) * Math.sin(midAngle - 0.15);
  const ctrlRightX = centerX + (innerRadius + ctrlDist) * Math.cos(midAngle + 0.15);
  const ctrlRightY = centerY + (innerRadius + ctrlDist) * Math.sin(midAngle + 0.15);

  return `
    M ${baseLeftX} ${baseLeftY}
    Q ${ctrlLeftX} ${ctrlLeftY} ${tipX} ${tipY}
    Q ${ctrlRightX} ${ctrlRightY} ${baseRightX} ${baseRightY}
    Z
  `;
}

// Lotus SVG visualization
function LotusSVG({
  score,
  size,
  animate,
}: {
  score: TrustScoreBreakdown;
  size: typeof SIZE_CONFIG.medium;
  animate: boolean;
}) {
  const { width, height } = size;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 2;

  // Extract dimension scores (0-100 each) - 4 petals for 4 dimensions
  const dimensions = [
    { key: 'provenance', value: score.provenance },
    { key: 'quality', value: score.quality },
    { key: 'aesthetic', value: score.aesthetic },
    { key: 'market', value: score.market },
  ];

  // Overall score determines the glow intensity
  const glowIntensity = score.overall / 100;
  const isHighScore = score.overall >= 80;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        filter: isHighScore
          ? `drop-shadow(0 0 ${4 * glowIntensity}px ${goldAccent.primary})`
          : undefined,
      }}
    >
      <defs>
        {/* Gradient for filled petals */}
        <linearGradient id="petalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={emeraldCore.light} />
          <stop offset="50%" stopColor={emeraldCore.primary} />
          <stop offset="100%" stopColor={isHighScore ? goldAccent.light : emeraldCore.dark} />
        </linearGradient>

        {/* Gradient for unfilled petals */}
        <linearGradient id="petalBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={alpha(emeraldCore.lightest, 0.3)} />
          <stop offset="100%" stopColor={alpha(emeraldCore.light, 0.2)} />
        </linearGradient>
      </defs>

      {/* Background petals (unfilled, full size) */}
      {dimensions.map((dim, index) => (
        <path
          key={`bg-${dim.key}`}
          d={generatePetalPath(index, 4, centerX, centerY, radius, 100)}
          fill="url(#petalBgGradient)"
          stroke={alpha(emeraldCore.primary, 0.2)}
          strokeWidth={0.5}
        />
      ))}

      {/* Filled petals based on dimension scores */}
      {dimensions.map((dim, index) => (
        <path
          key={`fill-${dim.key}`}
          d={generatePetalPath(index, 4, centerX, centerY, radius, dim.value)}
          fill="url(#petalGradient)"
          opacity={0.9}
          style={animate ? {
            animation: `lotusBloom 0.5s ease-out ${index * 0.1}s both`,
          } : undefined}
        />
      ))}

      {/* Center circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius * 0.2}
        fill={isHighScore ? goldAccent.primary : emeraldCore.primary}
        opacity={0.9}
      />

      {/* Score text in center */}
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={radius * 0.25}
        fontWeight="700"
      >
        {score.overall}
      </text>
    </svg>
  );
}

export default function TrustScoreLotus({
  score,
  size = 'medium',
  showLabel = false,
  animate = true,
}: TrustScoreLotusProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const sizeConfig = SIZE_CONFIG[size];

  // Build tooltip content
  const tooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Puntuación de Confianza: {score.overall}/100
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {[
          { key: 'provenance', value: score.provenance },
          { key: 'quality', value: score.quality },
          { key: 'aesthetic', value: score.aesthetic },
          { key: 'market', value: score.market },
        ].map(({ key, value }) => (
          <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {DIMENSION_LABELS[key]}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: value >= 80 ? goldAccent.primary : value >= 50 ? emeraldCore.primary : 'text.secondary',
              }}
            >
              {value}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const scoreColor = score.overall >= 80
    ? goldAccent.primary
    : score.overall >= 60
      ? emeraldCore.primary
      : score.overall >= 40
        ? emeraldCore.light
        : surfacesLight.text.secondary;

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          cursor: 'default',
        }}
      >
        <LotusSVG score={score} size={sizeConfig} animate={animate} />

        {showLabel && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: sizeConfig.fontSize,
                color: scoreColor,
                display: 'block',
                lineHeight: 1.2,
              }}
            >
              {score.overall}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: `calc(${sizeConfig.fontSize} - 0.05rem)`,
                color: isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary,
                display: 'block',
                lineHeight: 1,
              }}
            >
              Confianza
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

// Compact version for grid cards
export function TrustScoreLotusCompact({ score }: { score: TrustScoreBreakdown }) {
  return <TrustScoreLotus score={score} size="small" showLabel={false} animate={false} />;
}

// CSS keyframes for animation (add to global styles)
export const trustScoreLotusKeyframes = `
@keyframes lotusBloom {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 0.9;
    transform: scale(1);
  }
}
`;
