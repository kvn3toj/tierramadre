/**
 * MetricCard — the ONE stat tile (DS v3).
 *
 * Composes Card(outlined) + Badge. Value renders mono/tabular (the Ledger
 * convention, §E); the icon well always carries the single emerald accent —
 * no per-card free `color` prop (that was the purple/gold/blue scatter this
 * absorbs). Comparison deltas render as a Badge (success/danger tone +
 * label), never color-only text.
 *
 * Absorbs: shared/MetricCard, shared/StatBox, ambassador/StatItem,
 * valuation/components/StatCard.
 */
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Info } from 'lucide-react';
import { Card } from '../Card';
import { Badge } from '../Badge';

export interface MetricCardProps {
  label: string;
  value: string | number;
  /** Icon component (lucide-react style). Rendered in the accent well. */
  icon?: React.ElementType;
  /** Sparkline trend data — rendered as a minimal accent-colored line. */
  trend?: { data: number[] };
  /** Delta vs. a prior period. Tone derives from sign (never a free color). */
  comparison?: { value: number; label: string };
  subtitle?: string;
  compact?: boolean;
  onClick?: () => void;
  tooltip?: string;
}

const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  if (data.length < 2) return null;
  const width = 64;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Box
      component="svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      sx={{ flexShrink: 0 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--tm-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  comparison,
  subtitle,
  compact = false,
  onClick,
  tooltip,
}) => {
  return (
    <Card
      variant="outlined"
      interactive={!!onClick}
      onClick={onClick}
      aria-label={onClick ? label : undefined}
    >
      <Card.Content compact={compact}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? 1 : 1.5,
          }}
        >
          {(Icon || trend) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              {Icon && (
                <Box
                  sx={{
                    width: compact ? 32 : 40,
                    height: compact ? 32 : 40,
                    borderRadius: 'var(--tm-radius-control)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--tm-well)',
                    color: 'var(--tm-accent)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={compact ? 16 : 20} />
                </Box>
              )}
              {trend && <Sparkline data={trend.data} />}
            </Box>
          )}

          <Typography
            sx={{
              fontFamily: 'var(--tm-font-mono)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              fontSize: compact ? '1.25rem' : '1.5rem',
              lineHeight: 1.1,
              color: 'var(--tm-text)',
            }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--tm-font-ui)',
                  fontWeight: 500,
                  fontSize: compact ? '0.75rem' : '0.8125rem',
                  color: 'var(--tm-muted)',
                }}
              >
                {label}
              </Typography>
              {tooltip && (
                <Tooltip title={tooltip} arrow placement="top">
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      cursor: 'help',
                      color: 'var(--tm-subtle)',
                    }}
                  >
                    <Info size={12} />
                  </Box>
                </Tooltip>
              )}
            </Box>

            {subtitle && (
              <Typography
                sx={{
                  fontFamily: 'var(--tm-font-ui)',
                  fontSize: '0.75rem',
                  color: 'var(--tm-muted)',
                }}
              >
                {subtitle}
              </Typography>
            )}

            {comparison && comparison.value !== 0 && (
              <Box sx={{ mt: 0.25 }}>
                <Badge
                  tone={comparison.value > 0 ? 'success' : 'danger'}
                  label={`${comparison.value > 0 ? '+' : ''}${comparison.value}% ${comparison.label}`}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Card.Content>
    </Card>
  );
};

export default MetricCard;
