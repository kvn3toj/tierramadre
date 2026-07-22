/**
 * Badge — the ONE status/label chip (DS v3).
 *
 * Color is never the only indicator (WCAG 1.4.1): a Badge always carries a
 * label (visible, or screen-reader-only in `compact`) plus a tone-colored
 * dot/icon. Tones are the desaturated DS3 semantics (§1.2); the accent/success
 * dot renders as a tiny emerald-cut lozenge (§E1.3 "el bisel"), not a circle.
 *
 * Absorbs: the quality/price/status/role tier renderers scattered across
 * treasure / ambassador / cotizacion, and shared/SyncStatusBadge.
 */
import React from 'react';
import { Box } from '@mui/material';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger';

export interface BadgeProps {
  /** Semantic tone. Default 'neutral'. */
  tone?: BadgeTone;
  /** The label — always present (visible, or aria in `compact`). */
  label: string;
  /** Optional leading icon; replaces the status dot. */
  icon?: React.ReactNode;
  /** Show the status dot. Default true when no icon. */
  dot?: boolean;
  /** Icon/dot only — the label collapses to screen-reader-only text. */
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const TONE_COLOR: Record<BadgeTone, string> = {
  neutral: 'var(--tm-muted)',
  accent: 'var(--tm-accent)',
  success: 'var(--tm-accent)', // success IS the emerald — no second green (§1.2)
  warn: 'var(--tm-warning)',
  danger: 'var(--tm-danger)',
};

// Emerald step-cut lozenge — the trust/selected signature (§E1.3).
const LOZENGE_CLIP =
  'polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px)';

const srOnly = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  label,
  icon,
  dot,
  compact = false,
  className,
  style,
}) => {
  const color = TONE_COLOR[tone];
  const showDot = icon ? false : (dot ?? true);
  const beveled = tone === 'accent' || tone === 'success';

  return (
    <Box
      component="span"
      className={className}
      title={compact ? label : undefined}
      style={style}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 0 : '6px',
        height: 22,
        padding: compact ? '0 6px' : '0 10px',
        borderRadius: 'var(--tm-radius-control)',
        border: '1px solid var(--tm-border)',
        backgroundColor: 'var(--tm-surface)',
        fontFamily: 'var(--tm-font-ui)',
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: '0.01em',
        color: tone === 'neutral' ? 'var(--tm-muted)' : color,
        whiteSpace: 'nowrap',
      }}
    >
      {icon ? (
        <Box
          component="span"
          aria-hidden
          sx={{
            display: 'inline-flex',
            color,
            '& svg': { width: 12, height: 12 },
          }}
        >
          {icon}
        </Box>
      ) : showDot ? (
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 7,
            height: 7,
            flexShrink: 0,
            backgroundColor: color,
            borderRadius: beveled ? 0 : '50%',
            ...(beveled
              ? { clipPath: LOZENGE_CLIP, WebkitClipPath: LOZENGE_CLIP }
              : {}),
          }}
        />
      ) : null}
      {compact ? (
        <Box component="span" sx={srOnly}>
          {label}
        </Box>
      ) : (
        label
      )}
    </Box>
  );
};

export default Badge;
