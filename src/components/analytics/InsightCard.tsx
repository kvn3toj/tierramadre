/**
 * InsightCard Component
 *
 * AI recommendation and insight display card.
 * iOS HIG compliant with colored accents and animations.
 *
 * Designed by ARIA - Capitana del Concilio de Creacion
 */

import React from 'react';
import { Box, Typography, alpha, useTheme, ButtonBase } from '@mui/material';
import { Lightbulb, AlertTriangle, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { insightColors } from '../../design-system/tokens/colors';
import { chartTokens } from '../../design-system/tokens/charts';
import { cssTransition, iosDimensions } from '../../design-system';

// =============================================================================
// TYPES
// =============================================================================

export type InsightType = 'opportunity' | 'warning' | 'success' | 'critical';

export interface InsightCardProps {
  /** Insight type determines color scheme */
  type: InsightType;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Custom icon (optional, defaults based on type) */
  icon?: React.ElementType;
  /** Action callback */
  onAction?: () => void;
  /** Optional metric to display */
  metric?: {
    value: string | number;
    label: string;
  };
  /** Compact mode */
  compact?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

const getDefaultIcon = (type: InsightType): React.ElementType => {
  switch (type) {
    case 'opportunity':
      return Lightbulb;
    case 'warning':
      return AlertTriangle;
    case 'success':
      return CheckCircle;
    case 'critical':
      return AlertCircle;
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  description,
  icon,
  onAction,
  metric,
  compact = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const colors = insightColors[type];
  const Icon = icon || getDefaultIcon(type);

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: compact ? 1.5 : 2,
        p: compact ? 1.5 : 2,
        minHeight: compact ? 60 : chartTokens.insightCard.minHeight,
        borderRadius: chartTokens.insightCard.borderRadius,
        bgcolor: isDark ? colors.bgDark : colors.bg,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${colors.icon}`,
        transition: cssTransition.default,
        ...(onAction && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 4px 12px ${alpha(colors.icon, 0.15)}`,
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }),
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: compact ? 32 : chartTokens.insightCard.iconSize,
          height: compact ? 32 : chartTokens.insightCard.iconSize,
          borderRadius: iosDimensions.borderRadiusStandard,
          bgcolor: alpha(colors.icon, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={compact ? 16 : 20} color={colors.icon} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: compact ? '0.75rem' : '0.8rem',
            color: isDark ? colors.textDark : colors.text,
            mb: 0.25,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: compact ? '0.65rem' : '0.7rem',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: compact ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>

        {/* Metric badge */}
        {metric && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: alpha(colors.icon, 0.1),
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.7rem',
                color: colors.icon,
              }}
            >
              {metric.value}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                color: 'text.secondary',
              }}
            >
              {metric.label}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Action indicator */}
      {onAction && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'center',
          }}
        >
          <ChevronRight size={16} color={colors.icon} />
        </Box>
      )}
    </Box>
  );

  if (onAction) {
    return (
      <ButtonBase
        onClick={onAction}
        sx={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          borderRadius: chartTokens.insightCard.borderRadius,
        }}
      >
        {content}
      </ButtonBase>
    );
  }

  return content;
};

export default InsightCard;
