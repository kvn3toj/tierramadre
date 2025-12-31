/**
 * ImageQualityIndicator
 * Reusable components for displaying image quality status throughout the app
 *
 * Includes:
 * - QualityBadge: Small badge showing quality score
 * - VerificationStatus: Status chip with icon
 * - QualityProgress: Progress bar with quality breakdown
 * - QualityMiniCard: Compact card for grid views
 */

import React from 'react';
import {
  Box,
  Chip,
  Typography,
  Tooltip,
  LinearProgress,
  Rating,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Pending,
  Star,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import {
  ImageQualityLevel,
  ImageVerificationStatus,
  ImageQualityCheck,
} from '../types';
import { getQualityLabel, getQualityColor } from '../utils/imageVerification';

// Design System Imports
import {
  semanticColors,
  surfacesLight,
} from '../design-system/tokens/colors';
import { primitiveColors } from '../design-system/tokens/primitives/colors';

// ==========================================
// Quality Badge - Shows star rating
// ==========================================

interface QualityBadgeProps {
  score: ImageQualityLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  variant?: 'filled' | 'outlined' | 'minimal';
}

const BadgeContainer = styled(Box)<{
  score: ImageQualityLevel;
  size: 'small' | 'medium' | 'large';
  variant: 'filled' | 'outlined' | 'minimal';
}>(({ score, size, variant }) => {
  const color = getQualityColor(score);
  const padding =
    size === 'small' ? '2px 6px' : size === 'medium' ? '4px 10px' : '6px 14px';
  const fontSize =
    size === 'small' ? '0.7rem' : size === 'medium' ? '0.8rem' : '0.9rem';

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: size === 'small' ? 3 : 6,
    padding,
    borderRadius: 20,
    fontSize,
    fontWeight: 600,
    ...(variant === 'filled' && {
      backgroundColor: color,
      color: surfacesLight.background.primary,
    }),
    ...(variant === 'outlined' && {
      backgroundColor: 'transparent',
      border: `2px solid ${color}`,
      color,
    }),
    ...(variant === 'minimal' && {
      backgroundColor: alpha(color, 0.1),
      color,
    }),
  };
});

export const QualityBadge: React.FC<QualityBadgeProps> = ({
  score,
  size = 'medium',
  showLabel = true,
  variant = 'filled',
}) => {
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 16 : 20;

  return (
    <Tooltip title={`Quality: ${getQualityLabel(score)} (${score}/5)`}>
      <BadgeContainer score={score} size={size} variant={variant}>
        <Star sx={{ fontSize: iconSize }} />
        {showLabel && getQualityLabel(score)}
        {!showLabel && score}
      </BadgeContainer>
    </Tooltip>
  );
};

// ==========================================
// Verification Status Chip
// ==========================================

interface VerificationStatusProps {
  status: ImageVerificationStatus;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}

const statusConfig: Record<
  ImageVerificationStatus,
  {
    label: string;
    color: string;
    icon: React.ReactNode;
  }
> = {
  pending: {
    label: 'Pending',
    color: surfacesLight.text.secondary,
    icon: <Pending fontSize="small" />,
  },
  verified: {
    label: 'Verified',
    color: primitiveColors.system.green.light,
    icon: <CheckCircle fontSize="small" />,
  },
  rejected: {
    label: 'Rejected',
    color: semanticColors.error.main,
    icon: <Cancel fontSize="small" />,
  },
  needs_review: {
    label: 'Needs Review',
    color: semanticColors.warning.main,
    icon: <Warning fontSize="small" />,
  },
};

export const VerificationStatus: React.FC<VerificationStatusProps> = ({
  status,
  size = 'medium',
  showIcon = true,
}) => {
  const config = statusConfig[status];

  return (
    <Chip
      label={config.label}
      icon={showIcon ? (config.icon as React.ReactElement) : undefined}
      size={size}
      sx={{
        backgroundColor: alpha(config.color, 0.15),
        color: config.color,
        fontWeight: 600,
        '& .MuiChip-icon': {
          color: config.color,
        },
      }}
    />
  );
};

// ==========================================
// Quality Progress Bar
// ==========================================

interface QualityProgressProps {
  qualityCheck: ImageQualityCheck;
  showDetails?: boolean;
  compact?: boolean;
}

const ProgressRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
}));

export const QualityProgress: React.FC<QualityProgressProps> = ({
  qualityCheck,
  showDetails = true,
  compact = false,
}) => {
  const metrics = [
    {
      label: 'Resolution',
      value: qualityCheck.resolution.isAcceptable ? 100 : 40,
      ok: qualityCheck.resolution.isAcceptable,
    },
    {
      label: 'Brightness',
      value: Math.min(100, (qualityCheck.brightness / 200) * 100),
      ok: qualityCheck.brightness >= 100 && qualityCheck.brightness <= 200,
    },
    {
      label: 'Sharpness',
      value: qualityCheck.sharpness,
      ok: qualityCheck.sharpness >= 40,
    },
    {
      label: 'Color',
      value: qualityCheck.colorAccuracy,
      ok: qualityCheck.colorAccuracy >= 10,
    },
  ];

  if (compact) {
    // Just show overall progress
    const avgValue =
      metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;

    return (
      <Box>
        <LinearProgress
          variant="determinate"
          value={avgValue}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha('#000', 0.05),
            '& .MuiLinearProgress-bar': {
              bgcolor: getQualityColor(qualityCheck.overallScore),
              borderRadius: 3,
            },
          }}
        />
      </Box>
    );
  }

  return (
    <Box>
      {metrics.map((metric) => (
        <ProgressRow key={metric.label}>
          <Typography
            variant="caption"
            sx={{ minWidth: 70, color: 'text.secondary' }}
          >
            {metric.label}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={metric.value}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              bgcolor: alpha('#000', 0.05),
              '& .MuiLinearProgress-bar': {
                bgcolor: metric.ok ? primitiveColors.system.green.light : semanticColors.warning.main,
                borderRadius: 2,
              },
            }}
          />
          {showDetails && (
            <Box sx={{ width: 20, textAlign: 'right' }}>
              {metric.ok ? (
                <CheckCircle sx={{ fontSize: 14, color: primitiveColors.system.green.light }} />
              ) : (
                <Warning sx={{ fontSize: 14, color: semanticColors.warning.main }} />
              )}
            </Box>
          )}
        </ProgressRow>
      ))}
    </Box>
  );
};

// ==========================================
// Quality Mini Card - For grid views
// ==========================================

interface QualityMiniCardProps {
  score: ImageQualityLevel;
  status: ImageVerificationStatus;
  onClick?: () => void;
}

const MiniCard = styled(Box)<{ score: ImageQualityLevel }>(({ theme, score }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(getQualityColor(score), 0.1),
  border: `1px solid ${alpha(getQualityColor(score), 0.2)}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(getQualityColor(score), 0.15),
    transform: 'scale(1.02)',
  },
}));

export const QualityMiniCard: React.FC<QualityMiniCardProps> = ({
  score,
  status,
  onClick,
}) => {
  return (
    <Tooltip
      title={`Quality: ${getQualityLabel(score)} | Status: ${statusConfig[status].label}`}
    >
      <MiniCard score={score} onClick={onClick}>
        <Rating value={score} max={5} readOnly size="small" />
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: statusConfig[status].color,
            mt: 0.5,
          }}
        />
      </MiniCard>
    </Tooltip>
  );
};

// ==========================================
// Image Quality Overlay - For thumbnails
// ==========================================

type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface QualityOverlayProps {
  score?: ImageQualityLevel;
  status?: ImageVerificationStatus;
  position?: OverlayPosition;
}

const positionStyles: Record<OverlayPosition, React.CSSProperties> = {
  'top-left': { top: 8, left: 8 },
  'top-right': { top: 8, right: 8 },
  'bottom-left': { bottom: 8, left: 8 },
  'bottom-right': { bottom: 8, right: 8 },
};

const OverlayContainer = styled(Box)<{ overlayPosition: OverlayPosition }>(
  ({ overlayPosition }) => ({
    position: 'absolute',
    ...positionStyles[overlayPosition],
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  })
);

export const QualityOverlay: React.FC<QualityOverlayProps> = ({
  score,
  status,
  position = 'top-right',
}) => {
  if (!score && !status) return null;

  return (
    <OverlayContainer overlayPosition={position}>
      {score && <QualityBadge score={score} size="small" showLabel={false} />}
      {status && (
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: statusConfig[status].color,
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      )}
    </OverlayContainer>
  );
};

// ==========================================
// Verification Summary - Dashboard stats
// ==========================================

interface VerificationSummaryProps {
  stats: {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    needsReview: number;
    averageQuality: number;
  };
}

export const VerificationSummary: React.FC<VerificationSummaryProps> = ({
  stats,
}) => {
  const verificationRate =
    stats.total > 0
      ? Math.round((stats.verified / stats.total) * 100)
      : 0;

  // Define semantic colors for stats
  const successColor = primitiveColors.system.green.light;
  const pendingColor = surfacesLight.text.secondary;
  const warningColor = semanticColors.warning.main;
  const errorColor = semanticColors.error.main;
  const infoColor = semanticColors.info.main;
  const purpleColor = '#8b5cf6'; // Purple accent - kept as is since no purple in design system

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 2,
      }}
    >
      <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(successColor, 0.1), borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: successColor }}>
          {stats.verified}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Verified
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(pendingColor, 0.1), borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: pendingColor }}>
          {stats.pending}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Pending
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(warningColor, 0.1), borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: warningColor }}>
          {stats.needsReview}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Needs Review
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(errorColor, 0.1), borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: errorColor }}>
          {stats.rejected}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Rejected
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(infoColor, 0.1), borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: infoColor }}>
          {verificationRate}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Verified Rate
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(purpleColor, 0.1), borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: purpleColor }}>
          {stats.averageQuality.toFixed(1)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Avg Quality
        </Typography>
      </Box>
    </Box>
  );
};

// Export all components
export default {
  QualityBadge,
  VerificationStatus,
  QualityProgress,
  QualityMiniCard,
  QualityOverlay,
  VerificationSummary,
};
