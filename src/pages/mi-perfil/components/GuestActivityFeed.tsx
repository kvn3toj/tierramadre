/**
 * GuestActivityFeed Component
 *
 * Chronological list of product views from guests invited by the current user.
 * Tappable rows navigate to product detail.
 * Shows empty state with "Invitar" CTA when no activity.
 */

import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Eye, UserPlus, Clock, ChevronRight } from 'lucide-react';
import {
  iosTypographyScale,
  primitiveSpacing as spacing,
  radius,
} from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SectionHeading } from './SectionHeading';
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

export function GuestActivityFeed({
  guestViews,
  isLoading,
  onInvite,
}: GuestActivityFeedProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!isLoading && guestViews.length === 0) {
    return (
      <Box>
        <SectionHeading>{t.profile.guestActivity}</SectionHeading>
        <Box
          sx={{
            p: spacing.lg,
            borderRadius: radius.lg,
            bgcolor: 'var(--tm-accent-wash)',
            border: '1px dashed var(--tm-border)',
            textAlign: 'center',
          }}
        >
          <Eye
            size={32}
            style={{
              color: 'var(--tm-accent)',
              marginBottom: 8,
              opacity: 0.5,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: 'var(--text-secondary)',
              mb: 1.5,
              fontSize: iosTypographyScale.footnote,
            }}
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
                border: '1px solid var(--tm-border)',
                bgcolor: 'var(--tm-accent-wash)',
                color: 'var(--tm-accent)',
                fontSize: iosTypographyScale.footnote,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color var(--tm-base) var(--tm-ease)',
                '&:hover': { bgcolor: 'var(--tm-accent-wash)' },
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
    <Box>
      <SectionHeading
        action={
          guestViews.length > 10 ? (
            <Box
              component="button"
              onClick={() => navigate('/mi-perfil/actividad')}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                color: 'var(--tm-accent)',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                transition: 'color var(--tm-base) var(--tm-ease)',
                '&:hover': { color: 'var(--tm-accent)' },
              }}
            >
              Ver todas ({guestViews.length})
              <ChevronRight size={12} />
            </Box>
          ) : undefined
        }
      >
        Actividad de invitados
      </SectionHeading>

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
                if (e.key === 'Enter' || e.key === ' ')
                  navigate(`/product/${view.itemId}`);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                p: spacing.sm,
                borderRadius: radius.md,
                cursor: 'pointer',
                transition: 'background-color var(--tm-base) var(--tm-ease)',
                '&:hover': { bgcolor: 'var(--surface-secondary)' },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.sm,
                  bgcolor: 'var(--tm-accent-wash)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Eye size={14} style={{ color: 'var(--tm-accent)' }} />
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
                      if (view.userName)
                        navigate(
                          `/mi-perfil/invitado/${encodeURIComponent(view.userName)}`,
                        );
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.key === ' ') &&
                        view.userName
                      ) {
                        e.stopPropagation();
                        navigate(
                          `/mi-perfil/invitado/${encodeURIComponent(view.userName)}`,
                        );
                      }
                    }}
                    sx={{
                      color: view.userName ? 'var(--tm-accent)' : 'inherit',
                      fontWeight: 600,
                      cursor: view.userName ? 'pointer' : 'default',
                      '&:hover': view.userName
                        ? { textDecoration: 'underline' }
                        : {},
                    }}
                  >
                    {guestLabel}
                  </Box>{' '}
                  vio <strong>{view.productName}</strong>
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexShrink: 0,
                }}
              >
                <Clock size={11} style={{ color: 'var(--text-tertiary)' }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: iosTypographyScale.caption2,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {formatTimeAgo(view.timestamp)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
