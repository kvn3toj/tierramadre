/**
 * GuestDetailPage
 *
 * Dedicated metrics page for one guest of the current asesor:
 *   - Invitation data (status, contact, created/activated dates)
 *   - Inline multiplier editor
 *   - Activity totals (views, unique products, sessions)
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
  Avatar,
  Divider,
} from '@mui/material';
import {
  Eye,
  Clock,
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
import { SectionHeading } from './components/SectionHeading';
import {
  emeraldCore,
  accentColors,
  iosTypographyScale,
  primitiveSpacing as spacing,
  radius,
  cssTransition,
  fontFamilies,
} from '../../design-system';

const STATUS_META = {
  active: { label: 'Activa', color: '#34c759', icon: CheckCircle },
  pending: { label: 'Pendiente', color: '#ff9500', icon: CircleDashed },
  expired: { label: 'Expirada', color: '#ff3b30', icon: XCircle },
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
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
      <Box sx={{ maxWidth: 600, mx: 'auto', px: spacing.md, pt: 1.5, pb: 12 }}>
        <Skeleton variant="rounded" height={32} sx={{ borderRadius: 3, mb: 1.5 }} />
        <Skeleton variant="rounded" height={92} sx={{ borderRadius: 3, mb: 2 }} />
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

  const statusConf = primaryInvitation
    ? STATUS_META[primaryInvitation.status] || STATUS_META.pending
    : null;
  const StatusIcon = statusConf?.icon;
  const isEditable =
    primaryInvitation &&
    (primaryInvitation.status === 'active' || primaryInvitation.status === 'pending');
  const isMutating = primaryInvitation ? mutatingCodes.has(primaryInvitation.shortCode) : false;

  const statTiles = [
    { label: 'Visitas', value: metrics.totalViews, icon: Eye, color: accentColors.info.light },
    { label: 'Productos', value: metrics.uniqueProducts, icon: Package, color: emeraldCore.primary },
    { label: 'Sesiones', value: metrics.sessionCount, icon: Users, color: accentColors.warning.light },
  ];

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', px: spacing.md, pt: 1.5, pb: 12 }}>
      <Box sx={{ mb: 1.5 }}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', path: '/home' },
            { label: 'Mi Perfil', path: '/mi-perfil' },
            { label: guestName || 'Invitado' },
          ]}
        />
      </Box>

      {/* HERO — combines guest identity + invitation status + multiplier */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: radius.lg,
          border: `1px solid ${alpha(emeraldCore.primary, 0.14)}`,
          background: `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.08)} 0%, transparent 65%)`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: 100,
            height: 100,
            background: `radial-gradient(circle at top right, ${alpha(emeraldCore.primary, 0.2)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, px: 1.75, py: 1.75 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: alpha(emeraldCore.primary, 0.15),
              color: emeraldCore.primary,
              border: `2px solid ${alpha(emeraldCore.primary, 0.3)}`,
              fontSize: '1.3rem',
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: `0 6px 18px ${alpha(emeraldCore.primary, 0.18)}`,
            }}
          >
            {guestName?.charAt(0).toUpperCase() || 'I'}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Typography
                sx={{
                  fontSize: iosTypographyScale.title3,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.15,
                }}
              >
                {guestName || 'Invitado'}
              </Typography>
              {statusConf && StatusIcon && (
                <Chip
                  icon={<StatusIcon size={10} style={{ color: statusConf.color }} />}
                  label={statusConf.label}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    bgcolor: alpha(statusConf.color, 0.12),
                    color: statusConf.color,
                    border: `1px solid ${alpha(statusConf.color, 0.28)}`,
                    '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                    '& .MuiChip-label': { px: 0.75 },
                    flexShrink: 0,
                  }}
                />
              )}
            </Box>

            {primaryInvitation?.guestContact && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                {primaryInvitation.contactType === 'email' ? (
                  <Mail size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                ) : (
                  <Phone size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                )}
                <Typography
                  sx={{
                    fontSize: iosTypographyScale.footnote,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}
                >
                  {primaryInvitation.guestContact}
                </Typography>
              </Box>
            )}

            <Typography
              sx={{
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.01em',
              }}
            >
              Invitado por {asesor.name}
            </Typography>
          </Box>
        </Box>

        {primaryInvitation && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              px: 1.75,
              py: 1.25,
              borderTop: `1px solid ${alpha(emeraldCore.primary, 0.1)}`,
              bgcolor: alpha('#000', 0.02),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, minWidth: 0 }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    lineHeight: 1.2,
                  }}
                >
                  Multiplicador · {primaryInvitation.guestCurrencyMode || 'COP'}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontWeight: 700,
                    fontSize: '1.35rem',
                    color: emeraldCore.primary,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  ×{(primaryInvitation.guestMultiplier ?? 1).toFixed(1)}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    lineHeight: 1.2,
                  }}
                >
                  Enviada · Activada
                </Typography>
                <Typography
                  sx={{
                    fontSize: iosTypographyScale.footnote,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                  }}
                >
                  {formatShortDate(primaryInvitation.createdAt)}
                  <Box component="span" sx={{ color: 'var(--text-tertiary)', mx: 0.5 }}>→</Box>
                  <Box
                    component="span"
                    sx={{
                      color: primaryInvitation.activatedAt ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    {primaryInvitation.activatedAt ? formatShortDate(primaryInvitation.activatedAt) : 'aún no'}
                  </Box>
                </Typography>
              </Box>
            </Box>

            {isEditable && (
              <Button
                size="small"
                disabled={isMutating}
                onClick={openEditor}
                startIcon={<Edit3 size={12} />}
                sx={{
                  textTransform: 'none',
                  borderRadius: radius.md,
                  border: `1px solid ${alpha(emeraldCore.primary, 0.25)}`,
                  color: emeraldCore.primary,
                  bgcolor: alpha(emeraldCore.primary, 0.06),
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  px: 1.25,
                  py: 0.25,
                  minHeight: 0,
                  flexShrink: 0,
                  '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.12) },
                }}
              >
                Editar
              </Button>
            )}
          </Box>
        )}
      </Box>

      {guestInvitations.length > 1 && (
        <Typography
          sx={{
            display: 'block',
            mt: 0.75,
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
            px: 0.5,
          }}
        >
          {guestInvitations.length} invitaciones asociadas — mostrando la más reciente.
        </Typography>
      )}

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
            disabled={isMutating}
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

      {/* Sections */}
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
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
            <Eye size={28} style={{ color: accentColors.info.light, opacity: 0.5, marginBottom: 8 }} />
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              {t.profile.noGuestActivity}
            </Typography>
          </Box>
        ) : (
          <>
            {/* Stats strip: 3 numbers in a single card separated by dividers */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                borderRadius: radius.md,
                bgcolor: 'var(--surface-primary)',
                border: `1px solid var(--border-default)`,
                overflow: 'hidden',
              }}
            >
              {statTiles.map(({ label, value, icon: Icon, color }, i) => (
                <Box
                  key={label}
                  sx={{
                    flex: 1,
                    p: 1.25,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.25,
                    borderLeft: i > 0 ? '1px solid var(--border-default)' : 'none',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Icon size={12} style={{ color, opacity: 0.75 }} />
                    <Typography
                      sx={{
                        fontSize: '0.6rem',
                        color: 'var(--text-tertiary)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: fontFamilies.mono,
                      fontWeight: 700,
                      fontSize: '1.35rem',
                      color,
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Visit dates as inline chips */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: -1 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: radius.sm,
                  bgcolor: alpha('#000', 0.03),
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <Calendar size={11} style={{ color: 'var(--text-tertiary)' }} />
                Primera visita · <strong style={{ color: 'var(--text-primary)' }}>{formatDate(metrics.firstVisit)}</strong>
              </Box>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: radius.sm,
                  bgcolor: alpha('#000', 0.03),
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <Clock size={11} style={{ color: 'var(--text-tertiary)' }} />
                Última visita · <strong style={{ color: 'var(--text-primary)' }}>{formatDate(metrics.lastVisit)}</strong>
              </Box>
            </Box>

            {metrics.topProducts.length > 0 && (
              <Box>
                <SectionHeading>Productos más vistos</SectionHeading>
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
                        px: spacing.sm,
                        py: 1,
                        borderRadius: radius.md,
                        bgcolor: 'var(--surface-primary)',
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
                          bgcolor: alpha(emeraldCore.primary, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Package size={13} style={{ color: emeraldCore.primary }} />
                      </Box>
                      <Typography
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: iosTypographyScale.footnote,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.productName}
                      </Typography>
                      <Box
                        sx={{
                          px: 0.85,
                          py: 0.1,
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

            <Box>
              <SectionHeading
                action={
                  <Typography component="span" sx={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {views.length} {views.length === 1 ? 'visita' : 'visitas'}
                  </Typography>
                }
              >
                Historial completo
              </SectionHeading>
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
                      px: spacing.sm,
                      py: 0.85,
                      borderRadius: radius.md,
                      cursor: 'pointer',
                      transition: cssTransition.default,
                      '&:hover': { bgcolor: 'var(--surface-secondary)' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: accentColors.info.light,
                        flexShrink: 0,
                        opacity: 0.6,
                      }}
                    />
                    <Typography
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: iosTypographyScale.footnote,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {v.productName}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        color: 'var(--text-tertiary)',
                        flexShrink: 0,
                        fontFamily: fontFamilies.mono,
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
    </Box>
  );
}
