/**
 * IOSTabBar Component
 *
 * iOS HIG-compliant bottom tab bar navigation with Liquid Glass effects (iOS 26)
 * - 4 primary tabs: Home, Treasures, Library, More
 * - Dynamic shrink/expand on scroll
 * - Specular highlights on active tab
 * - Badge support for notifications
 * - Haptic feedback on tab change
 * - Safe area insets for modern iOS devices
 */

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import {
  Home,
  MoreHoriz,
  People,
} from '@mui/icons-material';
import { Gem, FileText, PlusCircle, Package } from 'lucide-react';
import { useIsProvider } from '../../hooks/usePermissions';

// Design tokens
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { easingCurves, durations } from '../../design-system/tokens/primitives/motion';
import { dynamicBlur, dynamicOpacity, liquidSaturation, tabBarConfig } from '../../design-system/tokens/liquid-glass';
import { radius, layoutConstants } from '../../design-system';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import useScrollShrink from '../../hooks/useScrollShrink';

export interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  badge?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPrimaryTabs = (t: any): TabConfig[] => [
  {
    id: 'home',
    label: t.nav.home,
    icon: Home,
    route: '/home',
  },
  {
    id: 'treasure',
    label: t.nav.treasure,
    icon: Gem as React.ElementType,
    route: '/treasure',
  },
  {
    id: 'ambassadors',
    label: t.nav.ambassadors,
    icon: People,
    route: '/ambassadors',
  },
  {
    id: 'more',
    label: t.nav.more,
    icon: MoreHoriz,
    route: '/more',
  },
];

// Provider-specific tabs
const getProviderTabs = (): TabConfig[] => [
  {
    id: 'provider-home',
    label: 'Inicio',
    icon: Home,
    route: '/provider',
  },
  {
    id: 'provider-requests',
    label: 'Solicitudes',
    icon: FileText as React.ElementType,
    route: '/provider/requests',
  },
  {
    id: 'provider-submit',
    label: 'Cotizar',
    icon: PlusCircle as React.ElementType,
    route: '/provider/submit',
  },
  {
    id: 'provider-inventory',
    label: 'Inventario',
    icon: Package as React.ElementType,
    route: '/provider/inventory',
  },
];

export interface IOSTabBarProps {
  onMoreClick?: () => void;
}

const IOSTabBar: React.FC<IOSTabBarProps> = ({ onMoreClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { effectiveConfig } = useLiquidGlassSafe();
  const isProvider = useIsProvider();

  // Dynamic shrink/expand behavior - DISABLED for always-visible navigation
  const {
    iconSize,
    labelOpacity,
  } = useScrollShrink({
    disabled: true, // Always show full tab bar
    threshold: tabBarConfig.scrollThreshold,
    expandedHeight: tabBarConfig.height.expanded,
    collapsedHeight: tabBarConfig.height.collapsed,
  });

  // Use provider tabs if user is a provider, otherwise use primary tabs
  const PRIMARY_TABS = useMemo(() => {
    if (isProvider) {
      return getProviderTabs();
    }
    return getPrimaryTabs(t);
  }, [t, isProvider]);

  const getActiveTab = (): string => {
    const currentPath = location.pathname;

    // For providers, match against provider routes
    if (isProvider) {
      const matchingTab = PRIMARY_TABS.find(tab =>
        currentPath === tab.route || currentPath.startsWith(tab.route + '/')
      );
      return matchingTab?.id || 'provider-home';
    }

    // For regular users
    const matchingTab = PRIMARY_TABS.find(tab =>
      currentPath.startsWith(tab.route) && tab.id !== 'more'
    );

    if (matchingTab) return matchingTab.id;

    const secondaryRoutes = ['/cuentas', '/boveda-secreta'];
    const isSecondaryRoute = secondaryRoutes.some(route => currentPath.startsWith(route));

    return isSecondaryRoute ? 'more' : '';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: TabConfig) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // For providers, all tabs navigate directly (no "more" menu)
    if (isProvider) {
      navigate(tab.route);
      return;
    }

    if (tab.id === 'more') {
      if (onMoreClick) onMoreClick();
    } else {
      navigate(tab.route);
    }
  };

  // Tab Bar styles following Apple HIG - solid with subtle translucency
  const liquidGlassStyles = useMemo(() => {
    if (!effectiveConfig.blur) {
      // Fallback for low-tier devices - fully opaque
      return {
        backgroundColor: 'var(--surface-secondary)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      };
    }

    // Apple HIG: Tab bars use design system tokens for consistency
    // "Frosted glass" effect - stronger blur + moderate opacity
    const blurValue = dynamicBlur.resting; // 20px from design system
    const saturation = liquidSaturation.intense; // 190% for tab bars

    return {
      backgroundColor: `rgba(var(--surface-secondary-rgb), ${dynamicOpacity.resting})`,
      backdropFilter: `blur(${blurValue}) saturate(${saturation})`,
      WebkitBackdropFilter: `blur(${blurValue}) saturate(${saturation})`,
    };
  }, [effectiveConfig.blur]);

  // Specular highlight for active tab - pill-shaped glow
  const getTabSpecularStyles = (isActive: boolean) => {
    if (!isActive) return {};

    return {
      // Pill-shaped background glow
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        height: '70%',
        background: effectiveConfig.specular
          ? 'radial-gradient(ellipse, rgba(0, 174, 122, 0.12) 0%, rgba(0, 174, 122, 0.06) 40%, transparent 70%)'
          : 'rgba(0, 174, 122, 0.08)',
        borderRadius: radius['3xl'],
        opacity: 1,
        transition: `all ${durations.liquidFast} ${easingCurves.liquidInOut}`,
        zIndex: 0,
      },
      // Animated gradient underline
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: '20%',
        right: '20%',
        height: '3px',
        background: effectiveConfig.specular
          ? 'linear-gradient(90deg, transparent, var(--brand-primary), transparent)'
          : 'var(--brand-primary)',
        borderRadius: '2px',
        opacity: 1,
        transition: `all ${durations.liquidFast} ${easingCurves.liquidInOut}`,
        boxShadow: effectiveConfig.specular
          ? '0 0 8px rgba(0, 174, 122, 0.4)'
          : 'none',
        zIndex: 1,
      },
    };
  };

  // Use portal to render at document.body level, outside any scrolling containers
  // This ensures fixed positioning works correctly in PWA standalone mode
  const tabBarContent = (
    <Box
      component="nav"
      aria-label="Primary navigation"
      sx={{
        // CRITICAL: Always visible - prevent browser from hiding on scroll
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: `calc(64px + env(safe-area-inset-bottom))`, // Instagram-like height
        ...liquidGlassStyles,

        // Instagram-style: straight top, rounded bottom corners matching phone screen
        borderTop: '0.5px solid rgba(255, 255, 255, 0.15)',
        borderBottomLeftRadius: radius['2xl'],
        borderBottomRightRadius: radius['2xl'],

        // Enhanced shadow for depth
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.35), 0 -2px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',

        display: 'flex',
        alignItems: 'center',
        paddingTop: spacing.sm,
        paddingBottom: `calc(${spacing.xs} + env(safe-area-inset-bottom))`,
        zIndex: 1000,
        overflow: 'hidden', // Contain shimmer effect within rounded corners

        // GPU acceleration - forces browser to keep element visible on scroll
        WebkitTransform: 'translate3d(0, 0, 0)',
        transform: 'translate3d(0, 0, 0)',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',

        // Ensure always visible
        visibility: 'visible',
        opacity: 1,

        willChange: 'transform', // Hint to browser to optimize
        transition: effectiveConfig.animations
          ? `all ${tabBarConfig.transitionDuration} ${easingCurves.liquidInOut}`
          : 'none',

        // Enhanced metallic shimmer effect - more visible
        '&::before': effectiveConfig.specular ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-50%',
          width: '200%',
          height: '3px',
          background: `linear-gradient(
            90deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 0.15) 45%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0.15) 55%,
            transparent 60%,
            transparent 100%
          )`,
          animation: effectiveConfig.animations ? 'shimmer 6s ease-in-out infinite' : 'none',
          '@keyframes shimmer': {
            '0%': {
              transform: 'translateX(0)',
            },
            '100%': {
              transform: 'translateX(50%)',
            },
          },
        } : {},

        // Subtle inner glow for premium feel
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          opacity: 0.6,
        },

        // Fallback for browsers without backdrop-filter
        '@supports not (backdrop-filter: blur(10px))': {
          backgroundColor: 'var(--surface-secondary)',
        },

        // Reduced motion support
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&::before': {
            animation: 'none !important',
          },
        },

        // Flex layout for tabs
        justifyContent: 'space-evenly',
        px: 1,
      }}
    >
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          // Lucide icons: treasure (Gem), provider tabs (FileText, PlusCircle, Package)
          const lucideIconIds = ['treasure', 'provider-requests', 'provider-submit', 'provider-inventory'];
          const isLucideIcon = lucideIconIds.includes(tab.id);

          return (
            <Box
              key={tab.id}
              role="button"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={0}
              onClick={() => handleTabClick(tab)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleTabClick(tab);
                }
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                maxWidth: 90,
                padding: `${spacing.xxs} ${spacing.xs}`,
                cursor: 'pointer',
                minHeight: `${layoutConstants.minTouchTarget}px`,
                position: 'relative',
                isolation: 'isolate', // Create stacking context for z-index

                // Liquid Glass transitions
                transition: effectiveConfig.animations
                  ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                  : 'none',

                '&:hover': {
                  opacity: 0.8,
                  transform: effectiveConfig.animations ? 'scale(1.02)' : 'none',
                },
                '&:active': {
                  transform: effectiveConfig.animations ? 'scale(0.95)' : 'none',
                },
                '&:focus-visible': {
                  outline: `2px solid ${primitiveColors.emerald[500]}`,
                  outlineOffset: '2px',
                  borderRadius: spacing.sm,
                },

                // Pill-shaped glow + gradient underline for active tab
                ...getTabSpecularStyles(isActive),
              }}
            >
              <Box sx={{
                position: 'relative',
                marginBottom: spacing.xxs,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: `${iconSize}px`,
                width: `${iconSize}px`,
                transition: effectiveConfig.animations
                  ? `transform ${durations.liquidFast} ${easingCurves.liquidSpring}`
                  : 'none',
                zIndex: 2, // Above background effects
              }}>
                {isLucideIcon ? (
                  <Icon
                    size={iconSize - 2}
                    color={isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)'}
                    strokeWidth={isActive ? 2.5 : 2}
                    style={{
                      transition: effectiveConfig.animations
                        ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                        : 'none',
                    }}
                  />
                ) : (
                  <Icon
                    sx={{
                      fontSize: `${iconSize}px`,
                      color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                      transition: effectiveConfig.animations
                        ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                        : 'none',
                    }}
                  />
                )}
                {tab.badge && tab.badge > 0 && (
                  <Box
                    aria-label={`${tab.badge} notifications`}
                    sx={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-8px',
                      minWidth: '16px',
                      height: '16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--status-error)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: '0 0 0 2px var(--surface-secondary)',
                    }}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Box>
                )}
              </Box>

              <Typography
                variant="caption"
                sx={{
                  fontSize: { xs: '9px', sm: '10px' },
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  lineHeight: 1.2,
                  marginTop: spacing.xxs,
                  opacity: labelOpacity,
                  transition: effectiveConfig.animations
                    ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                    : 'none',
                  zIndex: 2, // Above background effects
                  position: 'relative',
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          );
        })}
    </Box>
  );

  // Render via portal to document.body to escape any parent scroll containers
  // This is critical for PWA standalone mode where body is position:fixed
  return createPortal(tabBarContent, document.body);
};

export default IOSTabBar;
