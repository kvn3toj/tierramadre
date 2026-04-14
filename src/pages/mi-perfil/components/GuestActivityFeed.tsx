/**
 * GuestActivityFeed Component
 *
 * Chronological list of product views from guests invited by the current user.
 * Tappable rows navigate to product detail.
 * Shows empty state with "Invitar" CTA when no activity.
 */

import { useNavigate } from 'react-router-dom';
import { Box, Typography, alpha } from '@mui/material';
import { Eye, UserPlus, Clock, ChevronRight } from 'lucide-react';
import { emeraldCore, accentColors, iosTypographyScale, primitiveSpacing as spacing, radius, cssTransition } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { GuestView } from '../../../hooks/useGuestActivity';

interface GuestActivityFeedProps {
  guestViews: GuestView[];
  isLoading: boolean;
  onInvite?: () => void;
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function GuestActivityFeed({ guestViews, isLoading, onInvite }: GuestActivityFeedProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!isLoading && guestViews.length === 0) {
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
          {t.profile.guestActivity.toUpperCase()}
        </Typography>
        <Box
          sx={{
            p: spacing.lg,
            borderRadius: radius.lg,
            bgcolor: alpha(accentColors.info.light, 0.04),
            border: `1px dashed ${alpha(accentColors.info.light, 0.2)}`,
            textAlign: 'center',
          }}
        >
          <Eye size={32} style={{ color: accentColors.info.light, marginBottom: 8, opacity: 0.5 }} />
          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', mb: 1.5, fontSize: iosTypographyScale.footnote }}
          >
            {t.profile.noGuestActivity}
          </Typography>
          {onInvite && (
            <Box
              component="button"
              onClick={onInvite}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 2,
                py: 0.75,
                borderRadius: radius.md,
                border: `1px solid ${alpha(emeraldCore.primary, 0.3)}`,
                bgcolor: alpha(emeraldCore.primary, 0.08),
                color: emeraldCore.primary,
                fontSize: iosTypographyScale.footnote,
                fontWeight: 600,
                cursor: 'pointer',
                transition: cssTransition.default,
                '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.15) },
              }}
            >
              <UserPlus size={14} />
              {t.profile.inviteClient}
            </Box>
          )}
        </Box>
      </Box>
    );
  }

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
        ACTIVIDAD DE INVITADOS
      </Typography>

      <Box sx={{ display: 'grid', gap: spacing.xxs }}>
        {guestViews.slice(0, 10).map((view) => {
          const guestLabel = view.userName || 'Invitado';
          return (
            <Box
              key={`${view.itemId}-${view.timestamp}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/product/${view.itemId}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(`/product/${view.itemId}`);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                p: spacing.sm,
                borderRadius: radius.md,
                cursor: 'pointer',
                transition: cssTransition.default,
                '&:hover': { bgcolor: 'var(--surface-secondary)' },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.sm,
                  bgcolor: alpha(accentColors.info.light, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Eye size={14} style={{ color: accentColors.info.light }} />
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
                  <Box
                    component="span"
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (view.userName) navigate(`/mi-perfil/invitado/${encodeURIComponent(view.userName)}`);
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && view.userName) {
                        e.stopPropagation();
                        navigate(`/mi-perfil/invitado/${encodeURIComponent(view.userName)}`);
                      }
                    }}
                    sx={{
                      color: view.userName ? emeraldCore.primary : 'inherit',
                      fontWeight: 600,
                      cursor: view.userName ? 'pointer' : 'default',
                      '&:hover': view.userName ? { textDecoration: 'underline' } : {},
                    }}
                  >
                    {guestLabel}
                  </Box>
                  {' '}vio <strong>{view.productName}</strong>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <Clock size={11} style={{ color: 'var(--text-tertiary)' }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)' }}
                >
                  {formatTimeAgo(view.timestamp)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {guestViews.length > 10 && (
        <Box
          role="button"
          tabIndex={0}
          onClick={() => navigate('/mi-perfil/actividad')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/mi-perfil/actividad');
          }}
          sx={{
            mt: spacing.xs,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            p: spacing.sm,
            borderRadius: radius.md,
            cursor: 'pointer',
            color: emeraldCore.primary,
            fontSize: iosTypographyScale.footnote,
            fontWeight: 600,
            transition: cssTransition.default,
            '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.08) },
          }}
        >
          Ver todas las actividades ({guestViews.length})
          <ChevronRight size={14} />
        </Box>
      )}
    </Box>
  );
}
