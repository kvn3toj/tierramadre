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

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Skeleton,
  alpha,
  Popover,
  Slider,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Eye,
  Clock,
  ArrowLeft,
  Package,
  Users,
  Calendar,
  Phone,
  Mail,
  Edit3,
  CheckCircle,
  CircleDashed,
  XCircle,
} from 'lucide-react';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { useCurrentAsesor } from '../../hooks/useCurrentAsesor';
import { useGuestDetail } from '../../hooks/useGuestDetail';
import { useMyInvitations } from '../../hooks/useMyInvitations';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
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

const STATUS_META = {
  active: { label: 'Activa', color: '#34c759', icon: CheckCircle },
  pending: { label: 'Pendiente', color: '#ff9500', icon: CircleDashed },
  expired: { label: 'Expirada', color: '#ff3b30', icon: XCircle },
} as const;

export default function GuestDetailPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { notify } = useNotification();
  const { guestName: guestNameRaw } = useParams<{ guestName: string }>();
  const guestName = useMemo(
    () => (guestNameRaw ? decodeURIComponent(guestNameRaw) : null),
    [guestNameRaw],
  );

  const { user: googleUser } = useGoogleAuth();
  const { asesor, isLoading: asesorLoading } = useCurrentAsesor();
  const { views, metrics, isLoading } = useGuestDetail(asesor?.name, guestName);
  const { invitations, mutatingCodes, updateMultiplier } = useMyInvitations(googleUser?.email);

  // Find invitations for this guest (most-recent first); prefer active, fall back to any.
  const guestInvitations = useMemo(() => {
    if (!guestName) return [];
    return invitations
      .filter((inv) => (inv.guestName ?? '').trim() === guestName.trim())
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  }, [invitations, guestName]);

  const primaryInvitation = useMemo(() => {
    if (guestInvitations.length === 0) return null;
    return (
      guestInvitations.find((inv) => inv.status === 'active' || inv.status === 'pending') ||
      guestInvitations[0]
    );
  }, [guestInvitations]);

  // Multiplier editor state
  const [editAnchor, setEditAnchor] = useState<HTMLElement | null>(null);
  const [editValue, setEditValue] = useState(1);

  const openEditor = (event: React.MouseEvent<HTMLElement>) => {
    if (!primaryInvitation) return;
    setEditAnchor(event.currentTarget);
    setEditValue(primaryInvitation.guestMultiplier ?? 1);
  };

  const saveMultiplier = async () => {
    if (!primaryInvitation) return;
    const ok = await updateMultiplier(primaryInvitation.shortCode, editValue);
    if (!ok) notify('No se pudo actualizar el multiplicador', 'error');
    setEditAnchor(null);
  };

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

      {/* Invitation data + multiplier editor */}
      {primaryInvitation && (() => {
        const statusConf = STATUS_META[primaryInvitation.status] || STATUS_META.pending;
        const StatusIcon = statusConf.icon;
        const isEditable =
          primaryInvitation.status === 'active' || primaryInvitation.status === 'pending';
        const isMutating = mutatingCodes.has(primaryInvitation.shortCode);

        return (
          <Box
            sx={{
              mb: spacing.md,
              p: spacing.sm,
              borderRadius: radius.lg,
              bgcolor: 'var(--surface-primary)',
              border: `1px solid ${alpha(emeraldCore.primary, 0.08)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: iosTypographyScale.caption2,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.08em',
                }}
              >
                DATOS DEL INVITADO
              </Typography>
              <Chip
                icon={<StatusIcon size={11} style={{ color: statusConf.color }} />}
                label={statusConf.label}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: alpha(statusConf.color, 0.1),
                  color: statusConf.color,
                  border: `1px solid ${alpha(statusConf.color, 0.25)}`,
                  '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                }}
              />
            </Box>

            {/* Contact */}
            {primaryInvitation.guestContact && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                {primaryInvitation.contactType === 'email' ? (
                  <Mail size={13} style={{ color: 'var(--text-tertiary)' }} />
                ) : (
                  <Phone size={13} style={{ color: 'var(--text-tertiary)' }} />
                )}
                <Typography
                  variant="body2"
                  sx={{ fontSize: iosTypographyScale.footnote, color: 'var(--text-primary)' }}
                >
                  {primaryInvitation.guestContact}
                </Typography>
              </Box>
            )}

            {/* Created + activated */}
            <Box sx={{ display: 'flex', gap: spacing.sm, mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)' }}
                >
                  Invitación enviada
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontSize: iosTypographyScale.footnote, fontWeight: 500 }}
                >
                  {formatDate(primaryInvitation.createdAt)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)' }}
                >
                  Cuenta activada
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: iosTypographyScale.footnote,
                    fontWeight: 500,
                    color: primaryInvitation.activatedAt ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  {primaryInvitation.activatedAt ? formatDate(primaryInvitation.activatedAt) : 'Aún no'}
                </Typography>
              </Box>
            </Box>

            {/* Multiplier + currency */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
                pt: 1,
                borderTop: `1px solid ${alpha(emeraldCore.primary, 0.08)}`,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)' }}
                >
                  Multiplicador · {primaryInvitation.guestCurrencyMode || 'COP'}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: emeraldCore.primary,
                    lineHeight: 1,
                  }}
                >
                  ×{(primaryInvitation.guestMultiplier ?? 1).toFixed(1)}
                </Typography>
              </Box>
              {isEditable && (
                <IconButton
                  size="small"
                  disabled={isMutating}
                  onClick={openEditor}
                  sx={{
                    border: `1px solid ${alpha(emeraldCore.primary, 0.25)}`,
                    color: emeraldCore.primary,
                    bgcolor: alpha(emeraldCore.primary, 0.06),
                    borderRadius: radius.md,
                    px: 1.5,
                    py: 0.5,
                    fontSize: iosTypographyScale.footnote,
                    fontWeight: 600,
                    gap: 0.5,
                    '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.12) },
                  }}
                >
                  <Edit3 size={13} />
                  <Typography component="span" sx={{ fontSize: iosTypographyScale.footnote, fontWeight: 600 }}>
                    Editar
                  </Typography>
                </IconButton>
              )}
            </Box>

            {guestInvitations.length > 1 && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1,
                  fontSize: iosTypographyScale.caption2,
                  color: 'var(--text-tertiary)',
                }}
              >
                {guestInvitations.length} invitaciones asociadas a este invitado — mostrando la más reciente
                activa.
              </Typography>
            )}
          </Box>
        );
      })()}

      {/* Multiplier editor popover */}
      <Popover
        open={Boolean(editAnchor)}
        anchorEl={editAnchor}
        onClose={() => setEditAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2, borderRadius: radius.lg, width: 240 } } }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          Multiplicador: x{editValue.toFixed(1)}
        </Typography>
        <Slider
          value={editValue}
          onChange={(_, v) => setEditValue(v as number)}
          min={1}
          max={4}
          step={0.1}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `x${v}`}
          sx={{ color: emeraldCore.primary, '& .MuiSlider-thumb': { width: 16, height: 16 } }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
          <Button
            size="small"
            onClick={() => setEditAnchor(null)}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            Cancelar
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={primaryInvitation ? mutatingCodes.has(primaryInvitation.shortCode) : false}
            onClick={saveMultiplier}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              bgcolor: emeraldCore.primary,
              '&:hover': { bgcolor: emeraldCore.dark },
            }}
          >
            Guardar
          </Button>
        </Box>
      </Popover>

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
