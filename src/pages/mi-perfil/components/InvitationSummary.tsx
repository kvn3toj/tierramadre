/**
 * InvitationSummary Component
 *
 * 3 metric cards (total, active, pending) + compact invitation list.
 */

import { Box, Typography, Chip, alpha } from '@mui/material';
import { Link2, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { emeraldCore, accentColors, iosTypographyScale, primitiveSpacing as spacing, radius, fontFamilies } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { Invitation, } from '../../../hooks/useMyInvitations';

interface InvitationSummaryProps {
  invitations: Invitation[];
  metrics: { total: number; active: number; pending: number };
  isLoading: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const STATUS_CONFIG = {
  active: { label: 'Activa', color: accentColors.success.light, icon: CheckCircle },
  pending: { label: 'Pendiente', color: accentColors.warning.light, icon: Clock },
  expired: { label: 'Expirada', color: accentColors.error?.light || '#f44336', icon: XCircle },
};

export function InvitationSummary({ invitations, metrics, isLoading }: InvitationSummaryProps) {
  const { t } = useLanguage();

  if (!isLoading && invitations.length === 0) return null;

  const metricCards = [
    { label: t.profile.total, value: metrics.total, icon: Link2, color: emeraldCore.primary },
    { label: t.profile.active, value: metrics.active, icon: CheckCircle, color: accentColors.success.light },
    { label: t.profile.pending, value: metrics.pending, icon: Clock, color: accentColors.warning.light },
  ];

  return (
    <Box sx={{ mb: spacing.md }}>
      <Typography
        variant="overline"
        sx={{
          fontSize: iosTypographyScale.caption2,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          mb: 1,
          display: 'block',
          px: spacing.xs,
        }}
      >
        {t.profile.invitations.toUpperCase()}
      </Typography>

      {/* Metric Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.xs, mb: spacing.sm }}>
        {metricCards.map(({ label, value, icon: Icon, color }) => (
          <Box
            key={label}
            sx={{
              p: 1.5,
              borderRadius: radius.md,
              bgcolor: alpha(color, 0.06),
              border: `1px solid ${alpha(color, 0.12)}`,
              textAlign: 'center',
            }}
          >
            <Icon size={16} style={{ color, marginBottom: 4 }} />
            <Typography
              variant="h6"
              sx={{
                fontFamily: fontFamilies.mono,
                fontWeight: 700,
                fontSize: '1.1rem',
                color,
                lineHeight: 1,
              }}
            >
              {value}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-secondary)' }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Invitation List (compact, max 5) */}
      <Box sx={{ display: 'grid', gap: spacing.xxs }}>
        {invitations.slice(0, 5).map((inv) => {
          const statusConf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;

          return (
            <Box
              key={inv.invitationId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                p: spacing.sm,
                borderRadius: radius.md,
                bgcolor: 'var(--surface-primary)',
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.sm,
                  bgcolor: alpha(statusConf.color, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Send size={12} style={{ color: statusConf.color }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: iosTypographyScale.footnote,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {inv.guestName || inv.guestContact || inv.shortCode}
                </Typography>
              </Box>

              <Chip
                label={statusConf.label}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  bgcolor: alpha(statusConf.color, 0.1),
                  color: statusConf.color,
                  border: `1px solid ${alpha(statusConf.color, 0.2)}`,
                }}
              />

              <Typography
                variant="caption"
                sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)', flexShrink: 0 }}
              >
                {formatDate(inv.createdAt)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
