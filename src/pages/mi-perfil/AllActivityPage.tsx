/**
 * AllActivityPage
 *
 * Full chronological list of product views from all guests invited by the
 * current asesor. Reached from the "Ver todas" CTA on the profile feed.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Skeleton } from '@mui/material';
import { Eye, Clock } from 'lucide-react';
import { useCurrentAsesor } from '../../hooks/useCurrentAsesor';
import { useGuestActivity } from '../../hooks/useGuestActivity';
import { useLanguage } from '../../contexts/LanguageContext';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import { SectionHeading } from './components/SectionHeading';
import {
  iosTypographyScale,
  primitiveSpacing as spacing,
  radius,
  cssTransition,
  qeFont,
} from '../../design-system';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function AllActivityPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { asesor, isLoading: asesorLoading } = useCurrentAsesor();
  const { guestViews, isLoading } = useGuestActivity(asesor?.name, 2000);

  const viewsByDay = useMemo(() => {
    const map = new Map<string, typeof guestViews>();
    for (const v of guestViews) {
      const key = dayKey(v.timestamp);
      const bucket = map.get(key) ?? [];
      bucket.push(v);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [guestViews]);

  if (asesorLoading || isLoading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: spacing.md, pb: 12 }}>
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  if (!asesor) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: spacing.md, textAlign: 'center' }}>
        <Typography sx={{ color: 'var(--text-secondary)', mt: 8 }}>{t.profile.notFound}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', px: spacing.md, pt: 1.5, pb: 12 }}>
      <Box sx={{ mb: 1.5 }}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', path: '/home' },
            { label: 'Mi Perfil', path: '/mi-perfil' },
            { label: 'Actividad' },
          ]}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontSize: iosTypographyScale.title3, fontWeight: 700, letterSpacing: '-0.01em' }}>
          Actividad de invitados
        </Typography>
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontFamily: qeFont.mono,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.04em',
          }}
        >
          {guestViews.length} {guestViews.length === 1 ? 'visita' : 'visitas'}
        </Typography>
      </Box>

      {guestViews.length === 0 ? (
        <Box
          sx={{
            p: spacing.lg,
            borderRadius: radius.lg,
            textAlign: 'center',
            bgcolor: 'var(--tm-accent-wash)',
            border: '1px dashed var(--tm-border)',
          }}
        >
          <Eye size={32} style={{ color: 'var(--tm-accent)', opacity: 0.5, marginBottom: 8 }} />
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            {t.profile.noGuestActivity}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {viewsByDay.map(([day, views]) => (
            <Box key={day}>
              <SectionHeading>
                <Box component="span" sx={{ textTransform: 'capitalize' }}>{day}</Box>
              </SectionHeading>
              <Box sx={{ display: 'grid', gap: spacing.xxs }}>
                {views.map((view) => {
                  const guestLabel = view.userName || 'Invitado';
                  return (
                    <Box
                      key={`${view.itemId}-${view.timestamp}`}
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
                      onClick={() => navigate(`/product/${view.itemId}`)}
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
                              if (view.userName) {
                                navigate(`/mi-perfil/invitado/${encodeURIComponent(view.userName)}`);
                              }
                            }}
                            sx={{
                              color: view.userName ? 'var(--tm-accent)' : 'inherit',
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
                          sx={{
                            fontSize: iosTypographyScale.caption2,
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {formatDateTime(view.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
