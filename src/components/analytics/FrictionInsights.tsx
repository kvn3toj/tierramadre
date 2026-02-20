/**
 * FrictionInsights Component
 *
 * Displays friction points and UX recommendations with actionable insights
 * based on funnel analysis data.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
  Chip,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  AlertTriangle,
  Lightbulb,
  Zap,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Wrench,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, goldAccent, semanticColors } from '../../design-system/tokens/colors';
import { cssTransition } from '../../design-system';
import type { FrictionPoint, UXInsight } from '../../types/analytics';

// =============================================================================
// FRICTION POINT CARD
// =============================================================================

interface FrictionPointCardProps {
  friction: FrictionPoint;
}

const FrictionPointCard: React.FC<FrictionPointCardProps> = ({ friction }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [expanded, setExpanded] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return semanticColors.error.main;
      case 'high':
        return '#ff6b35';
      case 'medium':
        return semanticColors.warning.main;
      default:
        return semanticColors.info.main;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'Crítico';
      case 'high':
        return 'Alto';
      case 'medium':
        return 'Medio';
      default:
        return 'Bajo';
    }
  };

  const severityColor = getSeverityColor(friction.severity);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${alpha(severityColor, 0.3)}`,
        borderLeft: `4px solid ${severityColor}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AlertTriangle size={16} color={severityColor} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {friction.step}
            </Typography>
            <Chip
              size="small"
              label={getSeverityLabel(friction.severity)}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: alpha(severityColor, 0.1),
                color: severityColor,
              }}
            />
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {friction.funnel}
          </Typography>

          <Typography variant="body2" sx={{ mt: 1 }}>
            {friction.issue}
          </Typography>
        </Box>

        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha('#000', 0.1)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
            <Lightbulb size={14} color={goldAccent.primary} />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Recomendación
              </Typography>
              <Typography variant="body2">
                {friction.recommendation}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <TrendingUp size={14} color={emeraldCore.primary} />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Impacto Estimado
              </Typography>
              <Typography variant="body2">
                {friction.impact}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mt: 1.5,
              p: 1,
              borderRadius: 1,
              bgcolor: alpha('#000', 0.03),
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Actual
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: severityColor }}>
                {friction.metric.toFixed(1)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Umbral
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {friction.threshold}%
              </Typography>
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

// =============================================================================
// UX INSIGHT CARD
// =============================================================================

interface UXInsightCardProps {
  insight: UXInsight;
}

const UXInsightCard: React.FC<UXInsightCardProps> = ({ insight }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'critical_fix':
        return {
          icon: AlertCircle,
          color: semanticColors.error.main,
          label: 'Fix Crítico',
          bgColor: semanticColors.error.main,
        };
      case 'quick_win':
        return {
          icon: Zap,
          color: goldAccent.primary,
          label: 'Quick Win',
          bgColor: goldAccent.primary,
        };
      case 'improvement':
        return {
          icon: TrendingUp,
          color: emeraldCore.primary,
          label: 'Mejora',
          bgColor: emeraldCore.primary,
        };
      case 'optimization':
        return {
          icon: Wrench,
          color: semanticColors.info.main,
          label: 'Optimización',
          bgColor: semanticColors.info.main,
        };
      default:
        return {
          icon: Lightbulb,
          color: 'text.secondary',
          label: 'Insight',
          bgColor: '#666',
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'Urgente', color: semanticColors.error.main };
      case 'high':
        return { label: 'Alta', color: '#ff6b35' };
      case 'medium':
        return { label: 'Media', color: semanticColors.warning.main };
      default:
        return { label: 'Baja', color: semanticColors.info.main };
    }
  };

  const typeConfig = getTypeConfig(insight.type);
  const priorityConfig = getPriorityConfig(insight.priority);
  const Icon = typeConfig.icon;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        transition: cssTransition.default,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 20px ${alpha(typeConfig.color, 0.15)}`,
        },
      }}
    >
      {/* Header with type badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(typeConfig.color, 0.1),
          }}
        >
          <Icon size={16} color={typeConfig.color} />
        </Box>
        <Chip
          size="small"
          label={typeConfig.label}
          sx={{
            height: 20,
            fontSize: '0.65rem',
            fontWeight: 700,
            bgcolor: alpha(typeConfig.bgColor, 0.1),
            color: typeConfig.color,
          }}
        />
        <Chip
          size="small"
          label={`P: ${priorityConfig.label}`}
          sx={{
            height: 20,
            fontSize: '0.65rem',
            fontWeight: 600,
            bgcolor: alpha(priorityConfig.color, 0.1),
            color: priorityConfig.color,
            ml: 'auto',
          }}
        />
      </Box>

      {/* Title */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {insight.title}
      </Typography>

      {/* Funnel tag */}
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        {insight.funnel}
      </Typography>

      {/* Description */}
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {insight.description}
      </Typography>

      {/* Impact and evidence */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 1.5,
          bgcolor: alpha(emeraldCore.primary, 0.05),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Target size={12} color={emeraldCore.primary} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: emeraldCore.primary }}>
            {insight.estimatedImpact}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Evidencia: {insight.dataEvidence}
        </Typography>
      </Box>
    </Paper>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface FrictionInsightsProps {
  frictionPoints: FrictionPoint[];
  insights: UXInsight[];
}

const FrictionInsights: React.FC<FrictionInsightsProps> = ({
  frictionPoints,
  insights,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [showAll, setShowAll] = useState(false);

  const criticalCount = frictionPoints.filter(f => f.severity === 'critical').length;
  const highCount = frictionPoints.filter(f => f.severity === 'high').length;
  const quickWins = insights.filter(i => i.type === 'quick_win');
  // Note: criticalFixes count is available in frictionPoints with severity 'critical'

  const displayedFrictions = showAll ? frictionPoints : frictionPoints.slice(0, 3);
  const displayedInsights = showAll ? insights : insights.slice(0, 4);

  return (
    <Box>
      {/* Summary header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          bgcolor: isLight
            ? `linear-gradient(135deg, ${alpha(emeraldCore.light, 0.1)} 0%, ${alpha(goldAccent.light, 0.1)} 100%)`
            : alpha('#000', 0.3),
          background: isLight
            ? `linear-gradient(135deg, ${alpha(emeraldCore.light, 0.1)} 0%, ${alpha(goldAccent.light, 0.1)} 100%)`
            : `linear-gradient(135deg, ${alpha(emeraldCore.dark, 0.2)} 0%, ${alpha('#000', 0.4)} 100%)`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Resumen de UX
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              flex: '1 1 120px',
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(semanticColors.error.main, 0.1),
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: semanticColors.error.main }}>
              {criticalCount}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Críticos
            </Typography>
          </Box>

          <Box
            sx={{
              flex: '1 1 120px',
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha('#ff6b35', 0.1),
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b35' }}>
              {highCount}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Alta Prioridad
            </Typography>
          </Box>

          <Box
            sx={{
              flex: '1 1 120px',
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(goldAccent.primary, 0.1),
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: goldAccent.primary }}>
              {quickWins.length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Quick Wins
            </Typography>
          </Box>

          <Box
            sx={{
              flex: '1 1 120px',
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(emeraldCore.primary, 0.1),
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: emeraldCore.primary }}>
              {insights.length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Insights Totales
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Friction Points */}
      {frictionPoints.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AlertTriangle size={18} color={semanticColors.warning.main} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Puntos de Fricción ({frictionPoints.length})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayedFrictions.map(friction => (
              <FrictionPointCard key={friction.id} friction={friction} />
            ))}
          </Box>
        </Box>
      )}

      {/* UX Insights */}
      {insights.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Lightbulb size={18} color={goldAccent.primary} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Recomendaciones UX ({insights.length})
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            {displayedInsights.map(insight => (
              <UXInsightCard key={insight.id} insight={insight} />
            ))}
          </Box>
        </Box>
      )}

      {/* Show more/less button */}
      {(frictionPoints.length > 3 || insights.length > 4) && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            variant="text"
            onClick={() => setShowAll(!showAll)}
            endIcon={showAll ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            sx={{
              textTransform: 'none',
              color: emeraldCore.primary,
              fontWeight: 600,
            }}
          >
            {showAll ? 'Ver menos' : `Ver todo (${frictionPoints.length + insights.length} items)`}
          </Button>
        </Box>
      )}

      {/* Empty state */}
      {frictionPoints.length === 0 && insights.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            bgcolor: alpha(semanticColors.success.main, 0.05),
            border: `1px solid ${alpha(semanticColors.success.main, 0.2)}`,
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={48} color={semanticColors.success.main} />
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
            Sin Fricciones Detectadas
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Los funnels están funcionando dentro de los parámetros esperados.
            Continúa monitoreando para detectar cambios.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default FrictionInsights;
