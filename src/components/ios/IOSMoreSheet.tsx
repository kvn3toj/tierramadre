/**
 * IOSMoreSheet Component
 *
 * Bottom sheet modal for secondary tools
 * - Search bar for inventory
 * - Bóveda Secreta and Cuentas options
 * - Spring animation
 * - Backdrop dismiss
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Backdrop, Chip, Switch, Slider } from '@mui/material';
import { Lock, Close, AccountBalance, Settings, DarkMode, LightMode, BugReport, AutoAwesome, PersonAdd } from '@mui/icons-material';

import { Vault, BarChart3, ShoppingBag } from 'lucide-react';
import FeedbackWizard from '../feedback/FeedbackWizard';
import { InvitationGenerator } from '../invitation';
import { useTheme } from '../../contexts/ThemeContext';

import { floatingLayers, liquidSaturation, specularHighlights } from '../../design-system/tokens/liquid-glass';
import { floatingLayerShadows } from '../../design-system/tokens/shadows';
import { brand, radius, iosTypographyScale, emeraldCore, accentColors, cssTransition, blurValues, primitiveColors, primitiveSpacing as spacing, easingCurves, durations } from '../../design-system';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import { useIsGuest, useCanCreateInvitations } from '../../hooks/useAuth';
import { useIsAdmin, useIsStaff } from '../../hooks/usePermissions';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { useCurrency } from '../../contexts/CurrencyContext';

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

const getMoreTools = (t: any): MoreToolConfig[] => [
  {
    id: 'invitation',
    label: 'Invitar',
    subtitle: 'Genera un enlace temporal de 24 horas para tus clientes',
    icon: PersonAdd,
    action: 'invitation',
    color: accentColors.info.light, // Blue for invitation
  },
  // Product Requests - for asesores/embajadores (unified view)
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    subtitle: 'Solicita productos y ve el estado de tus pedidos',
    icon: ShoppingBag as any,
    route: '/solicitudes',
    color: accentColors.success.light, // Green
  },
  {
    id: 'accounts',
    label: t.tools.accounts.label,
    subtitle: t.tools.accounts.subtitle,
    icon: AccountBalance,
    route: '/cuentas',
    color: brand.emerald[500], // Emerald from design system
  },
  {
    id: 'analytics',
    label: 'Analytics',
    subtitle: 'Métricas y Business Health',
    icon: BarChart3 as any,
    route: '/admin/analytics',
    color: accentColors.purple.light, // Purple for analytics
  },
  {
    id: 'name-generator',
    label: t.tools.nameGenerator?.label || 'Generador de Nombres',
    subtitle: t.tools.nameGenerator?.subtitle || 'Genera nombres únicos para esmeraldas con IA',
    icon: AutoAwesome,
    route: '/admin/name-generator',
    color: emeraldCore.primary,
    badge: 'AI',
  },
  {
    id: 'settings',
    label: t.tools.settings.label,
    subtitle: t.tools.settings.subtitle,
    icon: Settings,
    action: 'settings',
    color: primitiveColors.metallic.silver[500],
  },
  {
    id: 'feedback',
    label: 'Reportar Feedback',
    subtitle: 'Reporta bugs, sugiere features o mejoras de UX. Incluye captura de pantalla automática.',
    icon: BugReport,
    action: 'feedback',
    color: accentColors.warning.light, // Amber for feedback
    badge: 'DEV',
  },
  {
    id: 'vault',
    label: t.tools.vault.label,
    subtitle: t.tools.vault.subtitle,
    icon: Vault as any,
    route: '/boveda-secreta',
    color: brand.gold[500], // Gold accent
  },
];

export interface IOSMoreSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

const IOSMoreSheet: React.FC<IOSMoreSheetProps> = ({ open, onClose, onOpenSettings }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { mode, toggleTheme } = useTheme();
  const isGuest = useIsGuest();
  const isAdmin = useIsAdmin();
  const isStaff = useIsStaff();
  const canCreateInvitations = useCanCreateInvitations();
  const { effectiveConfig } = useLiquidGlassSafe();
  const { showPrices, togglePriceShare, canToggle } = usePriceShare();
  const { currency, toggleCurrency, canToggleCurrency, multiplier, setMultiplier } = useCurrency();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [invitationOpen, setInvitationOpen] = useState(false);

  // Get tools and filter based on permissions
  const MORE_TOOLS = useMemo(() => {
    const allTools = getMoreTools(t);
    const adminOnlyTools = ['analytics', 'name-generator'];
    const invitationTools = ['invitation']; // Embajadores and Admins only
    const staffTools = ['solicitudes', 'feedback', 'accounts']; // Asesores, Embajadores and Admins only

    return allTools.filter(tool => {
      // Admin-only tools
      if (adminOnlyTools.includes(tool.id)) {
        return isAdmin;
      }
      // Invitation tool - Embajadores and Admins
      if (invitationTools.includes(tool.id)) {
        return canCreateInvitations;
      }
      // Staff tools - Asesores, Embajadores, Admins (not guests or providers)
      if (staffTools.includes(tool.id)) {
        return isStaff;
      }
      return true;
    });
  }, [t, isAdmin, canCreateInvitations, isStaff]);

  // Liquid Glass styles for the sheet
  const sheetStyles = useMemo(() => {
    if (!effectiveConfig.blur) {
      return {
        backgroundColor: 'var(--surface-secondary)',
        backdropFilter: 'none',
        boxShadow: 'var(--shadow-lg)',
      };
    }

    const layer = floatingLayers.overlay;

    return {
      backgroundColor: 'rgba(var(--surface-secondary-rgb), 0.85)',
      backdropFilter: `blur(${layer.blur}) saturate(${liquidSaturation.intense})`,
      WebkitBackdropFilter: `blur(${layer.blur}) saturate(${liquidSaturation.intense})`,
      boxShadow: floatingLayerShadows.overlay,
    };
  }, [effectiveConfig.blur]);

  // Specular highlight for sheet header
  const headerSpecularStyles = useMemo(() => {
    if (!effectiveConfig.specular) return {};

    return {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '5%',
        right: '5%',
        height: '1px',
        background: specularHighlights.gradients.subtle,
        borderRadius: '1px',
      },
    };
  }, [effectiveConfig.specular]);

  const handleToolClick = (tool: MoreToolConfig) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Handle special actions
    if (tool.action === 'feedback') {
      setFeedbackOpen(true);
      return; // Don't close sheet yet - will close when wizard closes
    }

    if (tool.action === 'invitation') {
      setInvitationOpen(true);
      return; // Don't close sheet yet - will close when generator closes
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

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: 1100,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: effectiveConfig.blur ? `blur(${blurValues.lg})` : 'none',
          WebkitBackdropFilter: effectiveConfig.blur ? `blur(${blurValues.lg})` : 'none',
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
          zIndex: 1101,
          ...sheetStyles,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          maxHeight: '85vh',
          overflowY: 'auto',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: effectiveConfig.animations
            ? `transform ${durations.liquidNormal} ${easingCurves.liquidSpring}`
            : cssTransition.slow,
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
            backgroundColor: 'var(--surface-secondary)',
            zIndex: 1,
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant="h2"
              sx={{
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
                aria-label={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
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

        </Box>

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
                {showPrices ? t.settings.pricesShared : t.settings.pricesPrivate}
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
                {currency === 'USD' ? t.settings.currencyUSDActive : t.settings.currencyCOPActive}
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

        {/* Price Multiplier Row - Only for currency-authorized */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 180 }}>
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
                  '& .MuiSlider-valueLabel': { fontSize: iosTypographyScale.footnote },
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
        )}

        {/* Tools Grid */}
        <Box sx={{ position: 'relative', padding: spacing.md }}>
          {/* Blur Overlay for Guest Mode */}
          {isGuest && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderRadius: spacing.md,
              }}
            >
              <Lock
                sx={{
                  fontSize: 48,
                  color: brand.emerald[500],
                  mb: 2,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  px: 3,
                }}
              >
                {t.auth.invitationOnly}
              </Typography>
            </Box>
          )}

          {/* Tools List */}
          <Box
            sx={{
              display: 'grid',
              gap: spacing.xs,
              filter: isGuest ? 'blur(6px)' : 'none',
              pointerEvents: isGuest ? 'none' : 'auto',
              transition: cssTransition.slow,
            }}
          >
          {MORE_TOOLS.map((tool) => {
            const Icon = tool.icon;

            return (
              <Box
                key={tool.id}
                role="button"
                aria-label={`${tool.label}: ${tool.subtitle}`}
                tabIndex={0}
                onClick={() => handleToolClick(tool)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleToolClick(tool);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  background: effectiveConfig.blur
                    ? `linear-gradient(135deg, ${tool.color}08 0%, ${tool.color}03 100%)`
                    : 'var(--surface-primary)',
                  borderRadius: radius.lg,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: `${tool.color}20`,
                  transition: effectiveConfig.animations
                    ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                    : 'none',
                  position: 'relative',
                  overflow: 'hidden',

                  '&::before': effectiveConfig.specular ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '10%',
                    right: '10%',
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${tool.color}30, transparent)`,
                  } : {},

                  '&:hover': {
                    backgroundColor: `${tool.color}10`,
                    borderColor: `${tool.color}40`,
                    transform: effectiveConfig.animations ? 'scale(1.02)' : 'none',
                    boxShadow: `0 4px 16px ${tool.color}20`,
                  },
                  '&:active': {
                    transform: effectiveConfig.animations ? 'scale(0.98)' : 'none',
                  },
                }}
              >
                {/* Icon Container */}
                <Box
                  sx={{
                    width: '48px',
                    height: '48px',
                    borderRadius: radius.md,
                    background: `linear-gradient(135deg, ${tool.color}20 0%, ${tool.color}10 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 2px 8px ${tool.color}15`,
                  }}
                >
                  <Icon sx={{ fontSize: iosTypographyScale.title1, color: tool.color }} />
                </Box>

                {/* Text Content */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: spacing.xxs }}>
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
                          backgroundColor: `${tool.color}20`,
                          color: tool.color,
                          border: `1px solid ${tool.color}40`,
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
                <Box sx={{ color: tool.color, fontSize: '20px', opacity: 0.6 }}>›</Box>
              </Box>
            );
          })}
          </Box>
        </Box>

      </Box>

      {/* Feedback Wizard - Admin only */}
      <FeedbackWizard
        open={feedbackOpen}
        onClose={handleFeedbackClose}
        onCaptureStart={onClose} // Close the More sheet when capture mode starts
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
