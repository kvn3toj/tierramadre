/**
 * GuestDetailPage
 *
 * Dedicated metrics page for one guest of the current asesor:
 *   - Totals (views, unique products, sessions)
 *   - First / last visit
 *   - Top products
 *   - Full chronological feed of views from this guest
 *
 * Route: /mi-perfil/invitado/:guestName
 */

import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Skeleton, alpha } from '@mui/material';
import { Eye, Clock, ArrowLeft, Package, Users, Calendar } from 'lucide-react';
import { useCurrentAsesor } from '../../hooks/useCurrentAsesor';
import { useGuestDetail } from '../../hooks/useGuestDetail';
import { useLanguage } from '../../contexts/LanguageContext';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import {
  emeraldCore,
  accentColors,
  iosTypographyScale,
  primitiveSpacing as spacing,
  radius,
  cssTransition,
  fontFamilies,
} from '../../design-system';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GuestDetailPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { guestName: guestNameRaw } = useParams<{ guestName: string }>();
  const guestName = useMemo(
    () => (guestNameRaw ? decodeURIComponent(guestNameRaw) : null),
    [guestNameRaw],
  );

  const { asesor, isLoading: asesorLoading } = useCurrentAsesor();
  const { views, metrics, isLoading } = useGuestDetail(asesor?.name, guestName);

  if (asesorLoading || isLoading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: spacing.md, pb: 12 }}>
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3, mb: 2 }} />
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

  const metricCards = [
    {
      label: 'Visitas',
      value: metrics.totalViews,
      icon: Eye,
      color: accentColors.info.light,
    },
    {
      label: 'Productos',
      value: metrics.uniqueProducts,
      icon: Package,
      color: emeraldCore.primary,
    },
    {
      label: 'Sesiones',
      value: metrics.sessionCount,
      icon: Users,
      color: accentColors.warning.light,
    },
  ];

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: spacing.md, pb: 12 }}>
      <Breadcrumbs
        items={[
          { label: 'Inicio', path: '/home' },
          { label: 'Mi Perfil', path: '/mi-perfil' },
          { label: guestName || 'Invitado' },
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

      {/* Header */}
      <Box sx={{ mb: spacing.md }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {guestName || 'Invitado'}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'var(--text-secondary)', fontSize: iosTypographyScale.footnote }}
        >
          Invitado por {asesor.name}
        </Typography>
      </Box>

      {/* Empty state */}
      {metrics.totalViews === 0 ? (
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
        <>
          {/* Metric Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.xs,
              mb: spacing.md,
            }}
          >
            {metricCards.map(({ label, value, icon: Icon, color }) => (
              <Box
                key={label}
                sx={{
                  p: spacing.sm,
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
                <Typography
                  variant="caption"
                  sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-secondary)' }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* First / last visit */}
          <Box
            sx={{
              display: 'flex',
              gap: spacing.sm,
              mb: spacing.md,
              p: spacing.sm,
              borderRadius: radius.md,
              bgcolor: 'var(--surface-primary)',
            }}
          >
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
              <Box>
                <Typography
                  variant="caption"
                  sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)' }}
                >
                  Primera visita
                </Typography>
                <Typography variant="body2" sx={{ fontSize: iosTypographyScale.footnote, fontWeight: 500 }}>
                  {formatDate(metrics.firstVisit)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
              <Box>
                <Typography
                  variant="caption"
                  sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)' }}
                >
                  Última visita
                </Typography>
                <Typography variant="body2" sx={{ fontSize: iosTypographyScale.footnote, fontWeight: 500 }}>
                  {formatDate(metrics.lastVisit)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Top products */}
          {metrics.topProducts.length > 0 && (
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
                PRODUCTOS MÁS VISTOS
              </Typography>
              <Box sx={{ display: 'grid', gap: spacing.xxs }}>
                {metrics.topProducts.map((p) => (
                  <Box
                    key={p.itemId}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/product/${p.itemId}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`/product/${p.itemId}`);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      p: spacing.sm,
                      borderRadius: radius.md,
                      bgcolor: 'var(--surface-primary)',
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
                        bgcolor: alpha(emeraldCore.primary, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Package size={14} style={{ color: emeraldCore.primary }} />
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
                        {p.productName}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: radius.sm,
                        bgcolor: alpha(emeraldCore.primary, 0.12),
                        color: emeraldCore.primary,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        fontFamily: fontFamilies.mono,
                        flexShrink: 0,
                      }}
                    >
                      ×{p.viewCount}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Full history */}
          <Box>
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
              HISTORIAL COMPLETO ({views.length})
            </Typography>
            <Box sx={{ display: 'grid', gap: spacing.xxs }}>
              {views.map((v) => (
                <Box
                  key={`${v.itemId}-${v.timestamp}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/product/${v.itemId}`)}
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
                      width: 28,
                      height: 28,
                      borderRadius: radius.sm,
                      bgcolor: alpha(accentColors.info.light, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Eye size={12} style={{ color: accentColors.info.light }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: iosTypographyScale.footnote,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {v.productName}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: iosTypographyScale.caption2,
                      color: 'var(--text-tertiary)',
                      flexShrink: 0,
                    }}
                  >
                    {formatDateTime(v.timestamp)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
