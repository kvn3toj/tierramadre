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
import { Box, Typography, IconButton, Backdrop, Button } from '@mui/material';
import { Lock, Close, AccountBalance, Settings, DarkMode, LightMode } from '@mui/icons-material';
import { Vault, BarChart3, GitCommit } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

import { spacing } from '../../design-system/tokens/primitives/spacing';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { easingCurves, durations } from '../../design-system/tokens/primitives/motion';
import { floatingLayers, liquidSaturation, specularHighlights } from '../../design-system/tokens/liquid-glass';
import { floatingLayerShadows } from '../../design-system/tokens/shadows';
import { brand, radius, layoutConstants, iosTypographyScale } from '../../design-system';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import { useIsGuest } from '../../hooks/useAuth';
import { useIsAdmin } from '../../hooks/usePermissions';
import UnlockPrompt from '../auth/UnlockPrompt';

export interface MoreToolConfig {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  route: string;
  color: string;
}

const getMoreTools = (t: any): MoreToolConfig[] => [
  {
    id: 'vault',
    label: t.tools.vault.label,
    subtitle: t.tools.vault.subtitle,
    icon: Vault as any,
    route: '/boveda-secreta',
    color: brand.gold[500], // Gold accent
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
    color: '#8B5CF6', // Purple for analytics
  },
  {
    id: 'changelog',
    label: 'Changelog',
    subtitle: 'Reporte de desarrollo',
    icon: GitCommit as any,
    route: '/admin/changelog',
    color: '#10B981', // Emerald for changelog
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
  const { effectiveConfig } = useLiquidGlassSafe();
  const [unlockOpen, setUnlockOpen] = useState(false);

  // Get tools and filter admin-only tools for non-admins
  const MORE_TOOLS = useMemo(() => {
    const allTools = getMoreTools(t);
    const adminOnlyTools = ['accounts', 'analytics', 'changelog'];
    // Cuentas and Analytics are admin-only
    return allTools.filter(tool => !adminOnlyTools.includes(tool.id) || isAdmin);
  }, [t, isAdmin]);

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

    navigate(tool.route);
    onClose();
  };

  const handleUnlockClose = () => {
    setUnlockOpen(false);
    // Check if user is still guest - if not, they upgraded successfully
    // Close the sheet on next tick to allow state to update
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleSettingsClick = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onOpenSettings?.();
    onClose();
  };

  const handleThemeToggle = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    toggleTheme();
  };

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: 1100,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: effectiveConfig.blur ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: effectiveConfig.blur ? 'blur(16px)' : 'none',
          transition: effectiveConfig.animations
            ? `opacity ${durations.liquidNormal} ${easingCurves.liquidInOut}`
            : 'none',
        }}
      />

      <Box
        role="dialog"
        aria-modal="true"
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
            : 'transform 0.3s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)',
          willChange: 'transform',
          ...headerSpecularStyles,

          '@supports not (backdrop-filter: blur(10px))': {
            backgroundColor: 'var(--surface-secondary)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'transform 0.2s ease-out',
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
                  mb: 2,
                  textAlign: 'center',
                  px: 3,
                }}
              >
                {t.auth.unlockFeature}
              </Typography>
              <Button
                variant="contained"
                onClick={() => setUnlockOpen(true)}
                startIcon={<Lock />}
                sx={{
                  backgroundColor: brand.emerald[500],
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: radius.md,
                  '&:hover': {
                    backgroundColor: brand.emerald[600],
                  },
                }}
              >
                {t.auth.accessRequired}
              </Button>
            </Box>
          )}

          {/* Tools List */}
          <Box
            sx={{
              display: 'grid',
              gap: spacing.xs,
              filter: isGuest ? 'blur(6px)' : 'none',
              pointerEvents: isGuest ? 'none' : 'auto',
              transition: 'filter 0.3s ease',
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
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: iosTypographyScale.body,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: spacing.xxs,
                    }}
                  >
                    {tool.label}
                  </Typography>
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

        {/* Settings Section - Always accessible */}
        <Box sx={{ padding: spacing.md, paddingTop: 0 }}>
          <Box
            role="button"
            aria-label={`${t.tools.settings.label}: ${t.tools.settings.subtitle}`}
            tabIndex={0}
            onClick={handleSettingsClick}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSettingsClick();
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              backgroundColor: 'var(--surface-primary)',
              borderRadius: radius.md,
              cursor: 'pointer',
              transition: effectiveConfig.animations
                ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                : 'none',

              '&:hover': {
                backgroundColor: 'var(--surface-tertiary)',
                transform: effectiveConfig.animations ? 'scale(1.01)' : 'none',
              },
              '&:active': {
                transform: effectiveConfig.animations ? 'scale(0.98)' : 'none',
              },
            }}
          >
            {/* Icon Container */}
            <Box
              sx={{
                width: `${layoutConstants.minTouchTarget}px`,
                height: `${layoutConstants.minTouchTarget}px`,
                borderRadius: radius.md,
                backgroundColor: `${primitiveColors.metallic.silver[500]}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Settings sx={{ fontSize: iosTypographyScale.title2, color: primitiveColors.metallic.silver[500] }} />
            </Box>

            {/* Text Content */}
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body1"
                sx={{
                  fontSize: iosTypographyScale.body,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: spacing.xxs,
                }}
              >
                {t.tools.settings.label}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: iosTypographyScale.footnote,
                  color: 'var(--text-secondary)',
                }}
              >
                {t.tools.settings.subtitle}
              </Typography>
            </Box>

            {/* Chevron */}
            <Box sx={{ color: 'var(--text-quaternary)', fontSize: '20px' }}>›</Box>
          </Box>
        </Box>
      </Box>

      {/* Unlock Prompt */}
      <UnlockPrompt
        open={unlockOpen}
        onClose={handleUnlockClose}
      />
    </>
  );
};

export default IOSMoreSheet;
