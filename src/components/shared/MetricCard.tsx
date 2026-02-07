/**
 * MetricCard Component
 * Full-featured metric display card with sparkline support.
 * Extracted from AdminAnalyticsPage.
 */

import React from 'react';
import { Box, Paper, Typography, alpha, Tooltip } from '@mui/material';
import { Info } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { iosDimensions } from '../../design-system/tokens/primitives/spacing';
import { semanticColors } from '../../design-system/tokens/colors';
import { SparklineChart } from '../analytics/SparklineChart';

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  /** Sparkline trend data */
  trend?: { data: number[]; label?: string };
  /** Comparison with previous period */
  comparison?: { value: number; label: string };
  /** Subtitle text below label */
  subtitle?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Tooltip explaining what this metric measures */
  tooltip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  trend,
  comparison,
  subtitle,
  compact = false,
  onClick,
  tooltip,
}) => {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: compact ? 2 : 2.5,
        borderRadius: iosDimensions.borderRadiusLarge,
        bgcolor: 'var(--card-bg)',
        border: `1px solid ${alpha(color, 0.15)}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 1 : 1.5,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(color, 0.12)}`,
        } : {},
      }}
    >
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box
          sx={{
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
            borderRadius: iosDimensions.borderRadiusStandard,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.12),
          }}
        >
          <Icon size={compact ? 18 : 22} color={color} />
        </Box>

        {/* Sparkline */}
        {trend && (
          <SparklineChart
            data={trend.data.map(v => ({ value: v }))}
            width={80}
            height={32}
            color={color}
            showArea={true}
            showTrend={false}
            animated={true}
          />
        )}
      </Box>

      {/* Value */}
      <Typography
        variant={compact ? 'h5' : 'h4'}
        sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>

      {/* Label and comparison */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: 'text.primary', fontSize: compact ? '0.8rem' : '0.875rem' }}
          >
            {label}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip} arrow placement="top">
              <Box component="span" sx={{ display: 'inline-flex', cursor: 'help', color: 'text.disabled' }}>
                <Info size={12} />
              </Box>
            </Tooltip>
          )}
        </Box>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {subtitle}
          </Typography>
        )}
        {comparison && comparison.value !== 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            {comparison.value > 0 ? (
              <TrendingUp size={12} color={semanticColors.success.main} />
            ) : (
              <TrendingDown size={12} color={semanticColors.error.main} />
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: comparison.value > 0 ? semanticColors.success.main : semanticColors.error.main,
              }}
            >
              {comparison.value > 0 ? '+' : ''}{comparison.value}%
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {comparison.label}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default MetricCard;
