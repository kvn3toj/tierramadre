/**
 * EngagementHeatmap Component
 *
 * Displays user engagement metrics per feature area in a heatmap visualization.
 * Shows DAU (Daily Active Users), average session time, and 7-day retention.
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
  LinearProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Users,
  Clock,
  Repeat,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useTracking } from '../../contexts/TrackingContext';
import { emeraldCore, semanticColors } from '../../design-system/tokens/colors';
import { analyzeEngagement } from '../../utils/engagementAnalyzer';
import type { FeatureEngagement, EngagementHeatmapData } from '../../types/analytics';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface TrendIconProps {
  trend: 'up' | 'down' | 'neutral';
  size?: number;
}

const TrendIcon: React.FC<TrendIconProps> = ({ trend, size = 12 }) => {
  switch (trend) {
    case 'up':
      return <TrendingUp size={size} color={semanticColors.success.main} />;
    case 'down':
      return <TrendingDown size={size} color={semanticColors.error.main} />;
    default:
      return <Minus size={size} color="gray" />;
  }
};

interface HeatmapRowProps {
  feature: FeatureEngagement;
  isLight: boolean;
}

const HeatmapRow: React.FC<HeatmapRowProps> = ({ feature, isLight }) => {
  const retentionColor = useMemo(() => {
    if (feature.retentionRate >= 70) return semanticColors.success.main;
    if (feature.retentionRate >= 50) return emeraldCore.primary;
    if (feature.retentionRate >= 30) return semanticColors.warning.main;
    return semanticColors.error.main;
  }, [feature.retentionRate]);

  const heatColor = useMemo(() => {
    // Gradient from cool (low engagement) to hot (high engagement)
    const intensity = feature.heatIntensity / 100;
    if (intensity >= 0.7) return alpha(semanticColors.error.main, 0.15);
    if (intensity >= 0.5) return alpha(semanticColors.warning.main, 0.15);
    if (intensity >= 0.3) return alpha(emeraldCore.primary, 0.15);
    return alpha(semanticColors.info.main, 0.1);
  }, [feature.heatIntensity]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '160px 70px 90px 1fr',
        gap: 2,
        alignItems: 'center',
        p: 1.5,
        borderRadius: 2,
        bgcolor: heatColor,
        border: `1px solid ${isLight ? alpha('#000', 0.05) : alpha('#fff', 0.05)}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateX(4px)',
          boxShadow: `0 2px 8px ${alpha(feature.color, 0.2)}`,
        },
      }}
    >
      {/* Feature Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: '1.25rem' }}>{feature.icon}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {feature.featureName}
        </Typography>
      </Box>

      {/* DAU */}
      <Tooltip title="Daily Active Users (sesiones unicas)">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Users size={14} color={feature.color} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {feature.dau}
          </Typography>
          <TrendIcon trend={feature.dauTrend} />
        </Box>
      </Tooltip>

      {/* Avg Time */}
      <Tooltip title="Tiempo promedio de sesion en esta feature">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Clock size={14} color={feature.color} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {feature.avgTimeFormatted}
          </Typography>
          <TrendIcon trend={feature.timeTrend} />
        </Box>
      </Tooltip>

      {/* Retention Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1, maxWidth: 120 }}>
          <LinearProgress
            variant="determinate"
            value={feature.retentionRate}
            sx={{
              height: 12,
              borderRadius: 2,
              bgcolor: alpha(retentionColor, 0.2),
              '& .MuiLinearProgress-bar': {
                bgcolor: retentionColor,
                borderRadius: 2,
              },
            }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: retentionColor,
            minWidth: 36,
          }}
        >
          {feature.retentionRate}%
        </Typography>
        <TrendIcon trend={feature.retentionTrend} />
      </Box>
    </Box>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface EngagementHeatmapProps {
  dateRange?: { start: number; end: number };
  compact?: boolean;
}

const EngagementHeatmap: React.FC<EngagementHeatmapProps> = ({
  dateRange,
  compact = false,
}) => {
  const { mode } = useThemeMode();
  const { exportAnalytics } = useTracking();
  const isLight = mode === 'light';

  // Analyze engagement data
  const heatmapData: EngagementHeatmapData = useMemo(() => {
    const analytics = exportAnalytics();
    return analyzeEngagement(analytics.events, dateRange);
  }, [exportAnalytics, dateRange]);

  const hasData = heatmapData.features.some((f) => f.totalEvents > 0);

  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? 2 : 3,
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Flame size={20} color={semanticColors.error.main} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              User Engagement Heatmap
            </Typography>
            {!compact && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Ultimos {heatmapData.dateRange.days} dias -{' '}
                {heatmapData.features.length} features analizadas
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            size="small"
            icon={<Users size={14} />}
            label={`${heatmapData.totalDau} DAU`}
            sx={{
              bgcolor: alpha(emeraldCore.primary, 0.1),
              color: emeraldCore.dark,
              fontWeight: 600,
            }}
          />
          <Chip
            size="small"
            icon={<Repeat size={14} />}
            label={`${heatmapData.avgRetention}% Ret`}
            sx={{
              bgcolor: alpha(semanticColors.info.main, 0.1),
              color: semanticColors.info.dark,
              fontWeight: 600,
            }}
          />
        </Box>
      </Box>

      {/* Column Headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '160px 70px 90px 1fr',
          gap: 2,
          px: 1.5,
          py: 1,
          mb: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        >
          Feature
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        >
          DAU
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        >
          Avg Time
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        >
          7-Day Retention
        </Typography>
      </Box>

      {/* Heatmap Rows */}
      {hasData ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {heatmapData.features.map((feature) => (
            <HeatmapRow
              key={feature.featureId}
              feature={feature}
              isLight={isLight}
            />
          ))}
        </Box>
      ) : (
        /* Empty State */
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            color: 'text.secondary',
          }}
        >
          <Flame size={40} color={alpha('#666', 0.3)} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            No hay datos de engagement disponibles para este periodo.
          </Typography>
          <Typography variant="caption">
            Usa la aplicacion para generar datos de tracking.
          </Typography>
        </Box>
      )}

      {/* Footer with timestamp */}
      <Box
        sx={{ mt: 2, pt: 1, borderTop: `1px solid ${alpha('#000', 0.1)}` }}
      >
        <Typography variant="caption" sx={{ color: 'text.tertiary' }}>
          Generado: {new Date(heatmapData.generatedAt).toLocaleString('es-CO')}
        </Typography>
      </Box>
    </Paper>
  );
};

export default EngagementHeatmap;
