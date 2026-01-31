/**
 * FunnelVisualization Component
 *
 * Visual representation of funnel analysis with step-by-step progression,
 * drop-off indicators, and conversion metrics.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
  Tooltip,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  ArrowDown,
  Clock,
  Target,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, goldAccent, semanticColors } from '../../design-system/tokens/colors';
import type { FunnelAnalysis, FunnelStep } from '../../types/analytics';

interface FunnelVisualizationProps {
  analysis: FunnelAnalysis;
  compact?: boolean;
}

const FunnelStepBar: React.FC<{
  step: FunnelStep;
  index: number;
  totalSteps: number;
  maxCount: number;
  isLast: boolean;
}> = ({ step, index, totalSteps, maxCount, isLast }) => {
  useThemeMode(); // Used for theme consistency

  const barWidth = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
  const isHighDropOff = step.dropOffRate > 30;
  const isMediumDropOff = step.dropOffRate > 15 && step.dropOffRate <= 30;

  // Color based on position in funnel
  const getStepColor = () => {
    if (index === 0) return emeraldCore.primary;
    if (index === totalSteps - 1) return goldAccent.primary;
    return emeraldCore.dark;
  };

  const stepColor = getStepColor();

  return (
    <Box sx={{ mb: isLast ? 0 : 2 }}>
      {/* Step info row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: index === 0 ? emeraldCore.primary : 'text.primary',
            }}
          >
            {index + 1}. {step.name}
          </Typography>
          {index === totalSteps - 1 && step.count > 0 && (
            <CheckCircle size={14} color={semanticColors.success.main} />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {step.count}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ({step.percentage.toFixed(1)}%)
          </Typography>
        </Box>
      </Box>

      {/* Progress bar */}
      <Box
        sx={{
          height: 24,
          borderRadius: 1.5,
          bgcolor: alpha(stepColor, 0.1),
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: `${barWidth}%`,
            height: '100%',
            bgcolor: stepColor,
            borderRadius: 1.5,
            transition: 'width 0.5s ease-out',
            minWidth: step.count > 0 ? 8 : 0,
          }}
        />
        {/* Percentage label inside bar */}
        {barWidth > 20 && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#fff',
              fontWeight: 600,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {step.percentage.toFixed(0)}%
          </Typography>
        )}
      </Box>

      {/* Drop-off indicator */}
      {!isLast && index > 0 && step.dropOffRate > 5 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mt: 1,
            gap: 0.5,
          }}
        >
          <ArrowDown
            size={12}
            color={
              isHighDropOff ? semanticColors.error.main :
              isMediumDropOff ? semanticColors.warning.main :
              'text.secondary'
            }
          />
          <Typography
            variant="caption"
            sx={{
              color: isHighDropOff ? semanticColors.error.main :
                     isMediumDropOff ? semanticColors.warning.main :
                     'text.secondary',
              fontWeight: isHighDropOff ? 700 : 500,
            }}
          >
            -{step.dropOffRate.toFixed(1)}%
          </Typography>
          {isHighDropOff && (
            <Tooltip title="Drop-off crítico - Requiere atención">
              <AlertTriangle size={12} color={semanticColors.error.main} />
            </Tooltip>
          )}
        </Box>
      )}

      {/* Time to next step */}
      {step.avgTimeToNext && step.avgTimeToNext > 0 && !isLast && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            mt: 0.5,
          }}
        >
          <Clock size={10} color="text.secondary" />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ~{formatTime(step.avgTimeToNext)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const FunnelVisualization: React.FC<FunnelVisualizationProps> = ({
  analysis,
  compact = false,
}) => {
  const maxCount = Math.max(...analysis.steps.map(s => s.count), 1);

  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? 2 : 3,
        borderRadius: 3,
        bgcolor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography sx={{ fontSize: '1.5rem' }}>{analysis.funnel.icon}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {analysis.funnel.name}
            </Typography>
          </Box>
          {!compact && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {analysis.funnel.description}
            </Typography>
          )}
        </Box>

        {/* Status chip */}
        <Chip
          size="small"
          icon={analysis.isOnTarget ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          label={analysis.isOnTarget ? 'On Target' : 'Below Target'}
          sx={{
            bgcolor: analysis.isOnTarget
              ? alpha(semanticColors.success.main, 0.1)
              : alpha(semanticColors.warning.main, 0.1),
            color: analysis.isOnTarget
              ? semanticColors.success.main
              : semanticColors.warning.main,
            fontWeight: 600,
            '& .MuiChip-icon': {
              color: 'inherit',
            },
          }}
        />
      </Box>

      {/* Summary metrics */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(emeraldCore.primary, 0.05),
        }}
      >
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: emeraldCore.primary }}>
            {analysis.totalEntries}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Entradas
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: goldAccent.primary }}>
            {analysis.totalCompletions}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Completados
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: analysis.isOnTarget ? semanticColors.success.main : semanticColors.warning.main,
            }}
          >
            {analysis.completionRate.toFixed(1)}%
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Conversión
          </Typography>
        </Box>
        {analysis.avgTimeToComplete > 0 && (
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatTime(analysis.avgTimeToComplete)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Tiempo Prom.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Target indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Target size={14} color={emeraldCore.primary} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Objetivo: {analysis.funnel.targets.completionRate}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, (analysis.completionRate / analysis.funnel.targets.completionRate) * 100)}
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 1,
            bgcolor: alpha(emeraldCore.primary, 0.1),
            '& .MuiLinearProgress-bar': {
              bgcolor: analysis.isOnTarget ? semanticColors.success.main : emeraldCore.primary,
              borderRadius: 1,
            },
          }}
        />
      </Box>

      {/* Funnel steps */}
      <Box>
        {analysis.steps.map((step, index) => (
          <FunnelStepBar
            key={step.id}
            step={step}
            index={index}
            totalSteps={analysis.steps.length}
            maxCount={maxCount}
            isLast={index === analysis.steps.length - 1}
          />
        ))}
      </Box>

      {/* Critical drop-off alert */}
      {analysis.criticalDropOff && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(
              analysis.criticalDropOff.severity === 'critical'
                ? semanticColors.error.main
                : semanticColors.warning.main,
              0.1
            ),
            border: `1px solid ${alpha(
              analysis.criticalDropOff.severity === 'critical'
                ? semanticColors.error.main
                : semanticColors.warning.main,
              0.3
            )}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDown
              size={16}
              color={
                analysis.criticalDropOff.severity === 'critical'
                  ? semanticColors.error.main
                  : semanticColors.warning.main
              }
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: analysis.criticalDropOff.severity === 'critical'
                  ? semanticColors.error.main
                  : semanticColors.warning.main,
              }}
            >
              Drop-off Crítico Detectado
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            {analysis.criticalDropOff.stepFrom} → {analysis.criticalDropOff.stepTo}:
            -{analysis.criticalDropOff.dropOffRate.toFixed(1)}%
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default FunnelVisualization;
