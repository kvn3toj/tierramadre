/**
 * RecommendationCard Component
 * Displays intelligent recommendations with insights and analysis.
 */
import { Box, Typography, Chip, Avatar, alpha } from '@mui/material';
import {
  TrendingUp,
  Award,
  Gem,
  DollarSign,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { accentColors } from '../../design-system';
import { formatCarats } from '../../utils/formatting';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import {
  ComparisonRecommendation,
  RecommendationCriteria,
} from './RecommendationEngine';

interface RecommendationCardProps {
  recommendation: ComparisonRecommendation;
}

const criteriaConfig: Record<
  RecommendationCriteria,
  {
    label: string;
    icon: typeof TrendingUp;
    gradient: string;
  }
> = {
  best_value: {
    label: 'Mejor Relación Calidad-Precio',
    icon: DollarSign,
    gradient: `linear-gradient(135deg, ${emeraldCore.primary} 0%, ${emeraldCore.dark} 100%)`, // Emerald green
  },
  best_investment: {
    label: 'Mejor Inversión',
    icon: TrendingUp,
    gradient: `linear-gradient(135deg, ${accentColors.purple.light} 0%, ${accentColors.purple.dark} 100%)`, // Purple for long-term wealth
  },
  premium_quality: {
    label: 'Calidad Premium',
    icon: Award,
    gradient: `linear-gradient(135deg, ${accentColors.warning.light} 0%, ${accentColors.warning.dark} 100%)`, // Gold for premium
  },
  largest_size: {
    label: 'Mayor Tamaño',
    icon: Gem,
    gradient: `linear-gradient(135deg, ${accentColors.cyan.light} 0%, ${accentColors.cyan.dark} 100%)`, // Cyan for size
  },
  best_color: {
    label: 'Mejor Color',
    icon: Sparkles,
    gradient: `linear-gradient(135deg, ${accentColors.success.light} 0%, ${emeraldCore.dark} 100%)`, // Green for color
  },
  rare_find: {
    label: 'Hallazgo Único',
    icon: Sparkles,
    gradient: `linear-gradient(135deg, ${accentColors.pink.light} 0%, ${accentColors.pink.dark} 100%)`, // Pink for rarity
  },
};

export default function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const { formatCurrency } = useCurrencyFormat();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const { winner, score, analysis, criteria } = recommendation;
  const config = criteriaConfig[criteria];
  const Icon = config.icon;

  const displayName = winner.nombre
    .replace(/^L:.*?\s/, '')
    .replace(/^L:/, '')
    .trim();

  return (
    <Box
      sx={{
        mx: 1.5,
        my: 2,
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: alpha(emeraldCore.primary, 0.3),
        bgcolor: isLight
          ? surfacesLight.background.primary
          : surfacesDark.background.primary,
        boxShadow: `0 4px 12px ${alpha(emeraldCore.primary, 0.1)}`,
      }}
    >
      {/* Header with gradient */}
      <Box
        sx={{
          background: config.gradient,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Icon size={18} color="#fff" strokeWidth={2.5} />
        <Typography
          sx={{
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {config.label}
        </Typography>
      </Box>

      {/* Winner info */}
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          {winner.imagen && (
            <Avatar
              src={winner.thumbnailUrl || winner.imagen}
              alt={displayName}
              sx={{
                width: 50,
                height: 50,
                border: `2px solid ${emeraldCore.primary}`,
              }}
            />
          )}
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: emeraldCore.primary,
                mb: 0.25,
              }}
            >
              {displayName}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: 'text.secondary',
              }}
            >
              {formatCurrency(winner.precioCOP)}
              {!winner.isJewelry && typeof winner.peso === 'number' && (
                <> • {formatCarats(winner.peso)} ct</>
              )}
            </Typography>
          </Box>
          <Chip
            label={`${score.score}/100`}
            size="small"
            sx={{
              bgcolor: alpha(emeraldCore.primary, 0.15),
              color: emeraldCore.dark,
              fontWeight: 700,
              fontSize: '0.7rem',
            }}
          />
        </Box>

        {/* Analysis */}
        <Typography
          sx={{
            fontSize: '0.7rem',
            lineHeight: 1.5,
            color: 'text.primary',
            mb: 1.5,
            p: 1,
            borderRadius: 1.5,
            bgcolor: isLight
              ? alpha(emeraldCore.primary, 0.04)
              : alpha(emeraldCore.primary, 0.08),
          }}
        >
          {analysis}
        </Typography>

        {/* Metrics grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 0.75,
            mb: 1.5,
          }}
        >
          <MetricPill
            label="Calidad"
            value={score.valueMetrics.qualityScore}
            color={emeraldCore.primary}
          />
          <MetricPill
            label="Color"
            value={score.valueMetrics.colorScore}
            color={accentColors.success.light}
          />
          <MetricPill
            label="Tamaño"
            value={score.valueMetrics.sizeScore}
            color={accentColors.purple.light}
          />
          <MetricPill
            label="Inversión"
            value={score.valueMetrics.investmentScore}
            color={accentColors.warning.light}
          />
        </Box>

        {/* Strengths */}
        {score.strengths.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <CheckCircle2 size={12} color={emeraldCore.primary} />
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: emeraldCore.primary,
                }}
              >
                Fortalezas
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {score.strengths.map((strength, idx) => (
                <Box
                  key={idx}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: emeraldCore.primary,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                      lineHeight: 1.4,
                    }}
                  >
                    {strength}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Considerations */}
        {score.considerations.length > 0 &&
          score.considerations[0] !== 'Sin consideraciones especiales' && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <AlertCircle size={12} color={accentColors.warning.light} />
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: accentColors.warning.light,
                  }}
                >
                  Consideraciones
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {score.considerations.map((consideration, idx) => (
                  <Box
                    key={idx}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: accentColors.warning.light,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        color: 'text.secondary',
                        lineHeight: 1.4,
                      }}
                    >
                      {consideration}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
      </Box>
    </Box>
  );
}

/**
 * Metric pill component
 */
function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1,
        py: 0.5,
        borderRadius: 1.5,
        bgcolor: alpha(color, 0.08),
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.6rem',
          color: 'text.secondary',
          fontWeight: 600,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.65rem',
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
