/**
 * AllActivityPage
 *
 * Full chronological list of product views from all guests invited by the
 * current asesor. Reached from the "Ver todas" CTA on the profile feed.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Skeleton, alpha } from '@mui/material';
import { Eye, Clock, ArrowLeft } from 'lucide-react';
import { useCurrentAsesor } from '../../hooks/useCurrentAsesor';
import { useGuestActivity } from '../../hooks/useGuestActivity';
import { useLanguage } from '../../contexts/LanguageContext';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import {
  emeraldCore,
  accentColors,
  iosTypographyScale,
  primitiveSpacing as spacing,
  radius,
  cssTransition,
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
    <Box sx={{ maxWidth: 600, mx: 'auto', p: spacing.md, pb: 12 }}>
      <Breadcrumbs
        items={[
          { label: 'Inicio', path: '/home' },
          { label: 'Mi Perfil', path: '/mi-perfil' },
          { label: 'Actividad' },
        ]}
      />

      <Box
        role="button"
        tabIndex={0}
        onClick={() => navigate('/mi-perfil')}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          mb: spacing.sm,
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: iosTypographyScale.footnote,
          '&:hover': { color: emeraldCore.primary },
        }}
      >
        <ArrowLeft size={14} /> Mi Perfil
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        Actividad de invitados
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'var(--text-secondary)', mb: spacing.md, fontSize: iosTypographyScale.footnote }}
      >
        {guestViews.length} {guestViews.length === 1 ? 'visita' : 'visitas'} en total
      </Typography>

      {guestViews.length === 0 ? (
        <Box
          sx={{
            p: spacing.lg,
            borderRadius: radius.lg,
            textAlign: 'center',
            bgcolor: alpha(accentColors.info.light, 0.04),
            border: `1px dashed ${alpha(accentColors.info.light, 0.2)}`,
          }}
        >
          <Eye size={32} style={{ color: accentColors.info.light, opacity: 0.5, marginBottom: 8 }} />
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            {t.profile.noGuestActivity}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: spacing.md }}>
          {viewsByDay.map(([day, views]) => (
            <Box key={day}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: iosTypographyScale.caption2,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.08em',
                  mb: 0.5,
                  display: 'block',
                  px: spacing.xs,
                  textTransform: 'capitalize',
                }}
              >
                {day}
              </Typography>
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
