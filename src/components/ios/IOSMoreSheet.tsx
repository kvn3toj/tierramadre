/**
 * IOSMoreSheet Component
 *
 * Bottom sheet modal for secondary tools
 * - Profile card at top (staff only)
 * - Grouped tool sections with headers
 * - Guest view: only Boveda + Settings (no blur overlay)
 * - Spring animation + Backdrop dismiss
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Backdrop,
  Chip,
  Switch,
  Slider,
  Avatar,
  alpha,
} from '@mui/material';
import {
  Close,
  AccountBalance,
  Settings,
  DarkMode,
  LightMode,
  BugReport,
  AutoAwesome,
  Person,
  PersonAdd,
} from '@mui/icons-material';

import {
  Vault,
  BarChart3,
  ShoppingBag,
  ChevronRight,
  Package,
  Camera,
  Sprout,
} from 'lucide-react';
import FeedbackWizard from '../feedback/FeedbackWizard';
import { InvitationGenerator } from '../invitation';
import { useTheme } from '../../contexts/ThemeContext';

import {
  brand,
  radius,
  iosTypographyScale,
  emeraldCore,
  accentColors,
  cssTransition,
  blurValues,
  primitiveColors,
  primitiveSpacing as spacing,
  easingCurves,
  durations,
  zIndex,
  getQuietEmerald,
  qeFont,
} from '../../design-system';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import { useCanCreateInvitations } from '../../hooks/useAuth';
import { useIsAdmin, useIsStaff } from '../../hooks/usePermissions';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useCurrentAsesor } from '../../hooks/useCurrentAsesor';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';

export interface MoreToolConfig {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  route?: string;
  action?: 'feedback' | 'invitation' | 'settings'; // Special action types
  color: string;
  badge?: string; // Optional badge text
}

interface MenuSection {
  id: string;
  title: string;
  tools: MoreToolConfig[];
}

const buildMenuSections = (
  t: any,
  flags: { isAdmin: boolean; isStaff: boolean; canCreateInvitations: boolean },
): MenuSection[] => {
  const sections: MenuSection[] = [];

  // HERRAMIENTAS DE VENTA
  // The invite tool is available to anyone in the Asesores sheet
  // (canCreateInvitations); the remaining sales tools stay staff-only.
  if (flags.isStaff || flags.canCreateInvitations) {
    const salesTools: MoreToolConfig[] = [];

    if (flags.canCreateInvitations) {
      salesTools.push({
        id: 'invitation',
        label: t.tools.invitation.label,
        subtitle: t.tools.invitation.subtitle,
        icon: PersonAdd,
        action: 'invitation',
        color: accentColors.info.light,
      });
    }

    if (flags.isStaff) {
      salesTools.push(
        {
          id: 'solicitudes',
          label: t.tools.requests.label,
          subtitle: t.tools.requests.subtitle,
          icon: ShoppingBag as any,
          route: '/solicitudes',
          color: accentColors.success.light,
        },
        {
          id: 'accounts',
          label: t.tools.accounts.label,
          subtitle: t.tools.accounts.subtitle,
          icon: AccountBalance,
          route: '/cuentas',
          color: brand.emerald[500],
        },
      );
    }

    if (salesTools.length > 0) {
      sections.push({
        id: 'sales',
        title: t.menu.salesTools.toUpperCase(),
        tools: salesTools,
      });
    }
  }

  // DESCUBRIR (all users)
  const discoverTools: MoreToolConfig[] = [
    {
      id: 'vault',
      label: t.tools.vault.label,
      subtitle: t.tools.vault.subtitle,
      icon: Vault as any,
      route: '/boveda-secreta',
      color: brand.gold[500],
    },
    {
      // Bóveda re-skin: the Esmereogénesis hub had no persistent nav entry.
      // (Copy promoted to the i18n bundle in Phase 9.)
      id: 'esmereogenesis',
      label: 'Esmereogénesis',
      subtitle: 'Ahorro con propósito · haz tuya una esmeralda',
      icon: Sprout as any,
      route: '/esmereogenesis',
      color: emeraldCore.primary,
    },
  ];

  if (flags.isAdmin) {
    discoverTools.push({
      id: 'name-generator',
      label: t.tools.nameGenerator?.label || 'Generador de Nombres',
      subtitle:
        t.tools.nameGenerator?.subtitle ||
        'Genera nombres unicos para esmeraldas con IA',
      icon: AutoAwesome,
      route: '/admin/name-generator',
      color: emeraldCore.primary,
      badge: 'AI',
    });
  }

  sections.push({
    id: 'discover',
    title: t.menu.discover.toUpperCase(),
    tools: discoverTools,
  });

  // ADMINISTRACION (admin only)
  if (flags.isAdmin) {
    sections.push({
      id: 'admin',
      title: t.menu.admin.toUpperCase(),
      tools: [
        {
          id: 'fotosintesis',
          label: 'Fotosíntesis',
          subtitle: 'Captura: compra → inventario → venta → carnet',
          icon: Camera as any,
          route: '/admin/fotosintesis',
          color: emeraldCore.primary,
        },
        {
          id: 'atelier-products',
          label: t.tools.atelierProducts?.label || 'Atelier · Inventario',
          subtitle:
            t.tools.atelierProducts?.subtitle ||
            'Consulta y edición fina de la hoja maestra',
          icon: Package as any,
          route: '/admin/products',
          color: emeraldCore.dark,
        },
        {
          id: 'analytics',
          label: t.tools.analytics.label,
          subtitle: t.tools.analytics.subtitle,
          icon: BarChart3 as any,
          route: '/admin/analytics',
          color: accentColors.purple.light,
        },
      ],
    });
  }

  return sections;
};

// Bottom items (always visible, not in sections)
const getBottomTools = (
  t: any,
  isStaff: boolean,
  isSignedIn: boolean,
): MoreToolConfig[] => {
  const tools: MoreToolConfig[] = [];

  // "Mi Perfil" is the universal entry point to the user's account page.
  // The profile *card* at the top of the sheet only renders when the user is
  // staff AND has an asesor record — anyone outside that intersection was
  // previously stranded without a visible path to their profile. The bottom
  // entry closes that gap for everyone who is signed in.
  if (isSignedIn) {
    tools.push({
      id: 'profile',
      label: t.tools.profile.label,
      subtitle: t.tools.profile.subtitle,
      icon: Person,
      route: '/mi-perfil',
      color: emeraldCore.primary,
    });
  }

  tools.push({
    id: 'settings',
    label: t.tools.settings.label,
    subtitle: t.tools.settings.subtitle,
    icon: Settings,
    action: 'settings',
    color: primitiveColors.metallic.silver[500],
  });

  if (isStaff) {
    tools.push({
      id: 'feedback',
      label: t.tools.feedback.label,
      subtitle: t.tools.feedback.subtitle,
      icon: BugReport,
      action: 'feedback',
      color: accentColors.warning.light,
      badge: 'DEV',
    });
  }

  return tools;
};

const ROLE_COLORS: Record<string, string> = {
  Admin: '#8C928F', // graphite
  Embajador: emeraldCore.dark, // QE light-mode accent
  Asesor: emeraldCore.primary, // QE emerald
};

export interface IOSMoreSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

const IOSMoreSheet: React.FC<IOSMoreSheetProps> = ({
  open,
  onClose,
  onOpenSettings,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { mode, toggleTheme } = useTheme();
  const qe = getQuietEmerald(mode);
  const isAdmin = useIsAdmin();
  const isStaff = useIsStaff();
  const canCreateInvitations = useCanCreateInvitations();
  const { effectiveConfig } = useLiquidGlassSafe();
  const { showPrices, togglePriceShare, canToggle } = usePriceShare();
  const {
    currency,
    toggleCurrency,
    canToggleCurrency,
    multiplier,
    setMultiplier,
  } = useCurrency();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [invitationOpen, setInvitationOpen] = useState(false);

  // Profile card data (staff only)
  const { asesor } = useCurrentAsesor();
  const { user: googleUser } = useGoogleAuth();

  // Build grouped menu sections
  const menuSections = useMemo(
    () => buildMenuSections(t, { isAdmin, isStaff, canCreateInvitations }),
    [t, isAdmin, isStaff, canCreateInvitations],
  );

  const bottomTools = useMemo(
    () => getBottomTools(t, isStaff, !!googleUser),
    [t, isStaff, googleUser],
  );

  // Flat Quiet Emerald surface for the sheet
  const sheetStyles = useMemo(
    () => ({
      backgroundColor: qe.surface,
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      borderTop: `1px solid ${qe.hairline}`,
      boxShadow: qe.shadow,
    }),
    [qe.surface, qe.hairline, qe.shadow],
  );

  // Specular highlight for sheet header (removed under Quiet Emerald)
  const headerSpecularStyles = useMemo(() => ({}), []);

  const handleToolClick = (tool: MoreToolConfig) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Handle special actions
    if (tool.action === 'feedback') {
      setFeedbackOpen(true);
      return;
    }

    if (tool.action === 'invitation') {
      setInvitationOpen(true);
      return;
    }

    if (tool.action === 'settings') {
      onOpenSettings?.();
      onClose();
      return;
    }

    // Navigate to route
    if (tool.route) {
      navigate(tool.route);
      onClose();
    }
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
    onClose();
  };

  const handleInvitationClose = () => {
    setInvitationOpen(false);
    onClose();
  };

  const handleThemeToggle = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    toggleTheme();
  };

  const handlePriceToggle = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    togglePriceShare();
  };

  const handleCurrencyToggle = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    toggleCurrency();
  };

  const handleProfileClick = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    navigate('/mi-perfil');
    onClose();
  };

  // Render a single tool row
  const renderToolRow = (tool: MoreToolConfig) => {
    const Icon = tool.icon;

    return (
      <Box
        key={tool.id}
        role="button"
        aria-label={`${tool.label}: ${tool.subtitle}`}
        tabIndex={0}
        onClick={() => handleToolClick(tool)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleToolClick(tool);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          background: 'transparent',
          cursor: 'pointer',
          transition: `background-color ${durations.liquidFast} ${easingCurves.liquidInOut}`,
          '&:hover': { backgroundColor: qe.well },
          '&:active': { backgroundColor: qe.well },
        }}
      >
        {/* Icon Container */}
        <Box
          sx={{
            width: '36px',
            height: '36px',
            borderRadius: radius.sm,
            backgroundColor: qe.well,
            color: qe.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: '20px', color: qe.accent }} />
        </Box>

        {/* Text Content */}
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              marginBottom: spacing.xxs,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontSize: iosTypographyScale.body,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {tool.label}
            </Typography>
            {tool.badge && (
              <Chip
                label={tool.badge}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: qe.well,
                  color: qe.accent,
                  border: `1px solid ${qe.border}`,
                }}
              />
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontSize: iosTypographyScale.footnote,
              color: 'var(--text-secondary)',
            }}
          >
            {tool.subtitle}
          </Typography>
        </Box>

        {/* Chevron */}
        <Box sx={{ color: qe.subtle, fontSize: '20px' }}>
          <ChevronRight size={18} />
        </Box>
      </Box>
    );
  };

  const roleColor = asesor?.role
    ? ROLE_COLORS[asesor.role] || emeraldCore.primary
    : emeraldCore.primary;
  const photoUrl = asesor?.photoUrl || googleUser?.picture;

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: zIndex.sheet,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: effectiveConfig.blur
            ? `blur(${blurValues.lg})`
            : 'none',
          WebkitBackdropFilter: effectiveConfig.blur
            ? `blur(${blurValues.lg})`
            : 'none',
          transition: effectiveConfig.animations
            ? `opacity ${durations.liquidNormal} ${easingCurves.liquidInOut}`
            : 'none',
        }}
      />

      <Box
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.more}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: zIndex.sheetContent,
          ...sheetStyles,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          maxHeight: '85vh',
          overflowY: 'auto',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          transition: effectiveConfig.animations
            ? `transform ${durations.liquidNormal} ${easingCurves.liquidSpring}, visibility ${durations.liquidNormal}`
            : `${cssTransition.slow}, visibility 0.3s`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          willChange: 'transform',
          ...headerSpecularStyles,

          '@supports not (backdrop-filter: blur(10px))': {
            backgroundColor: 'var(--surface-secondary)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: cssTransition.default,
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            // Must be fully opaque so scrolling content doesn't bleed through
            // the translucent sheet behind the sticky header
            backgroundColor: 'rgb(var(--surface-secondary-rgb))',
            zIndex: zIndex.sticky,
            paddingTop: spacing.sm,
            paddingX: spacing.md,
            paddingBottom: spacing.sm,
            borderBottom: '0.5px solid var(--border-default)',
          }}
        >
          {/* Handle Bar */}
          <Box
            sx={{
              width: '36px',
              height: '5px',
              backgroundColor: 'var(--border-default)',
              borderRadius: '2.5px',
              margin: '0 auto',
              marginBottom: spacing.sm,
            }}
          />

          {/* Title and Actions */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: isStaff && asesor ? 1.5 : 2,
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontFamily: qeFont.serif,
                fontSize: iosTypographyScale.title2,
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {t.nav.more}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Theme Toggle */}
              <IconButton
                onClick={handleThemeToggle}
                aria-label={
                  mode === 'dark' ? t.settings.lightMode : t.settings.darkMode
                }
                sx={{
                  color: brand.emerald[500],
                  backgroundColor: `${brand.emerald[500]}15`,
                  '&:hover': { backgroundColor: `${brand.emerald[500]}25` },
                }}
              >
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>

              <IconButton
                onClick={onClose}
                aria-label={t.actions.close}
                sx={{
                  color: 'var(--text-secondary)',
                  '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Profile Card (staff only) */}
          {isStaff && asesor && (
            <Box
              role="button"
              tabIndex={0}
              onClick={handleProfileClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleProfileClick();
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                p: spacing.sm,
                mb: spacing.xs,
                borderRadius: radius.lg,
                bgcolor: 'var(--surface-primary)',
                border: `1px solid ${alpha(roleColor, 0.15)}`,
                cursor: 'pointer',
                transition: cssTransition.default,
                '&:hover': { bgcolor: 'var(--surface-tertiary)' },
              }}
            >
              <Avatar
                src={photoUrl || undefined}
                alt={asesor.name}
                sx={{
                  width: 44,
                  height: 44,
                  border: `2px solid ${alpha(roleColor, 0.25)}`,
                  fontSize: '1rem',
                  fontWeight: 700,
                  bgcolor: alpha(roleColor, 0.15),
                  color: roleColor,
                }}
              >
                {asesor.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography
                    sx={{
                      fontSize: iosTypographyScale.body,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {asesor.name}
                  </Typography>
                  <Chip
                    label={asesor.role || 'Asesor'}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      bgcolor: alpha(roleColor, 0.12),
                      color: roleColor,
                      border: `1px solid ${alpha(roleColor, 0.25)}`,
                      flexShrink: 0,
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: iosTypographyScale.caption1,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {t.menu.profileSubtitle}
                </Typography>
              </Box>
              <ChevronRight
                size={18}
                style={{ color: roleColor, opacity: 0.5, flexShrink: 0 }}
              />
            </Box>
          )}
        </Box>

        {/* Quick Settings (toggles + slider) - right after profile for easy access */}
        {(canToggle || canToggleCurrency) && (
          <Box sx={{ borderBottom: '0.5px solid var(--border-default)' }}>
            {/* Price Share Toggle Row - Only for staff */}
            {canToggle && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingX: spacing.md,
                  paddingY: spacing.sm,
                  borderBottom: '0.5px solid var(--border-default)',
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: iosTypographyScale.body,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t.settings.viewPrices}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: iosTypographyScale.caption1,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {showPrices
                      ? t.settings.pricesShared
                      : t.settings.pricesPrivate}
                  </Typography>
                </Box>
                <Switch
                  checked={showPrices}
                  onChange={handlePriceToggle}
                  inputProps={{ 'aria-label': t.settings.viewPrices }}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: primitiveColors.system.green.light,
                      '&:hover': {
                        backgroundColor: 'rgba(52, 199, 89, 0.08)',
                      },
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: primitiveColors.system.green.light,
                    },
                  }}
                />
              </Box>
            )}

            {/* Currency Toggle Row - Only for authorized user */}
            {canToggleCurrency && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingX: spacing.md,
                  paddingY: spacing.sm,
                  borderBottom: '0.5px solid var(--border-default)',
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: iosTypographyScale.body,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t.settings.currencyMode}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: iosTypographyScale.caption1,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {currency === 'USD'
                      ? t.settings.currencyUSDActive
                      : t.settings.currencyCOPActive}
                  </Typography>
                </Box>
                <Switch
                  checked={currency === 'USD'}
                  onChange={handleCurrencyToggle}
                  inputProps={{ 'aria-label': t.settings.currencyMode }}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: emeraldCore.dark,
                      '&:hover': {
                        backgroundColor: 'rgba(46, 125, 50, 0.08)',
                      },
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: emeraldCore.dark,
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Grouped Tool Sections */}
        <Box sx={{ padding: spacing.md }}>
          {menuSections.map((section) => (
            <Box key={section.id} sx={{ mb: spacing.md }}>
              {/* Section Header */}
              <Typography
                sx={{
                  fontFamily: qeFont.mono,
                  fontSize: '0.6rem',
                  fontWeight: 500,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: qe.subtle,
                  mb: 1,
                  display: 'block',
                  px: spacing.xs,
                }}
              >
                {section.title}
              </Typography>

              <Box
                sx={{
                  backgroundColor: qe.surface,
                  border: `1px solid ${qe.border}`,
                  borderRadius: radius.md,
                  overflow: 'hidden',
                  '& > *:not(:first-of-type)': {
                    borderTop: `1px solid ${qe.hairline}`,
                  },
                }}
              >
                {section.tools.map((tool) => renderToolRow(tool))}
              </Box>
            </Box>
          ))}

          {/* Divider */}
          <Box
            sx={{
              height: '0.5px',
              bgcolor: 'var(--border-default)',
              my: spacing.sm,
            }}
          />

          {/* Bottom Items (Settings + Feedback) */}
          <Box sx={{ display: 'grid', gap: spacing.xs }}>
            {bottomTools.map(renderToolRow)}
          </Box>

          {/* Price Multiplier - at bottom, only for currency-authorized */}
          {canToggleCurrency && (
            <>
              <Box
                sx={{
                  height: '0.5px',
                  bgcolor: 'var(--border-default)',
                  my: spacing.sm,
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingY: spacing.sm,
                  paddingX: spacing.xs,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: iosTypographyScale.body,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t.settings.currencyMultiplier}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: iosTypographyScale.caption1,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {t.settings.currencyMultiplierHint}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    minWidth: 180,
                  }}
                >
                  <Slider
                    value={multiplier}
                    onChange={(_e, val) => {
                      if ('vibrate' in navigator) navigator.vibrate(10);
                      setMultiplier(val as number);
                    }}
                    min={1}
                    max={4}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `x${v}`}
                    aria-label={t.settings.currencyMultiplier}
                    sx={{
                      color: emeraldCore.dark,
                      '& .MuiSlider-thumb': { width: 20, height: 20 },
                      '& .MuiSlider-valueLabel': {
                        fontSize: iosTypographyScale.footnote,
                      },
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: iosTypographyScale.footnote,
                      fontWeight: 600,
                      color: emeraldCore.dark,
                      minWidth: 28,
                      textAlign: 'right',
                    }}
                  >
                    x{multiplier}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Feedback Wizard - Staff only */}
      <FeedbackWizard
        open={feedbackOpen}
        onClose={handleFeedbackClose}
        onCaptureStart={onClose}
      />

      {/* Invitation Generator - Embajadores and Admins */}
      <InvitationGenerator
        open={invitationOpen}
        onClose={handleInvitationClose}
      />
    </>
  );
};

export default IOSMoreSheet;
