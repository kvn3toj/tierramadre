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
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import {
  Home,
  MoreHoriz,
  People,
} from '@mui/icons-material';
import { Gem } from 'lucide-react';

// Design tokens
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { easingCurves, durations } from '../../design-system/tokens/primitives/motion';
import { dynamicBlur, liquidSaturation, specularHighlights, tabBarConfig } from '../../design-system/tokens/liquid-glass';
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

export interface IOSTabBarProps {
  onMoreClick?: () => void;
}

const IOSTabBar: React.FC<IOSTabBarProps> = ({ onMoreClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { effectiveConfig } = useLiquidGlassSafe();

  // Dynamic shrink/expand behavior - DISABLED for always-visible navigation
  const {
    isCollapsed,
    height,
    iconSize,
    labelOpacity,
  } = useScrollShrink({
    disabled: true, // Always show full tab bar
    threshold: tabBarConfig.scrollThreshold,
    expandedHeight: tabBarConfig.height.expanded,
    collapsedHeight: tabBarConfig.height.collapsed,
  });

  const PRIMARY_TABS = useMemo(() => getPrimaryTabs(t), [t]);

  const getActiveTab = (): string => {
    const currentPath = location.pathname;
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

    if (tab.id === 'more') {
      if (onMoreClick) onMoreClick();
    } else {
      navigate(tab.route);
    }
  };

  // Liquid Glass styles based on effects config - more prominent background
  const liquidGlassStyles = useMemo(() => {
    if (!effectiveConfig.blur) {
      // Fallback for low-tier devices
      return {
        backgroundColor: 'var(--surface-secondary)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      };
    }

    const blurValue = dynamicBlur.resting;

    return {
      backgroundColor: 'rgba(var(--surface-secondary-rgb), 0.92)',
      backdropFilter: `blur(${blurValue}) saturate(${liquidSaturation.vibrant})`,
      WebkitBackdropFilter: `blur(${blurValue}) saturate(${liquidSaturation.vibrant})`,
    };
  }, [effectiveConfig.blur]);

  // Specular highlight for active tab
  const getTabSpecularStyles = (isActive: boolean) => {
    if (!effectiveConfig.specular || !isActive) return {};

    return {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '15%',
        right: '15%',
        height: '2px',
        background: specularHighlights.gradients.subtle,
        borderRadius: '2px',
        opacity: 1,
        transition: `opacity ${durations.liquidFast} ${easingCurves.liquidIn}`,
      },
    };
  };

  return (
    <Box
      component="nav"
      aria-label="Primary navigation"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: `calc(${height}px + env(safe-area-inset-bottom))`,
        ...liquidGlassStyles,
        borderTop: '1px solid var(--border-default)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'stretch',
        paddingTop: isCollapsed ? spacing.xs : spacing.sm,
        paddingBottom: `calc(${spacing.xs} + env(safe-area-inset-bottom))`,
        zIndex: 1000,
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        willChange: effectiveConfig.animations ? 'height, padding, backdrop-filter' : 'auto',
        transition: effectiveConfig.animations
          ? `all ${tabBarConfig.transitionDuration} ${easingCurves.liquidInOut}`
          : 'none',

        // Fallback for browsers without backdrop-filter
        '@supports not (backdrop-filter: blur(10px))': {
          backgroundColor: 'var(--surface-secondary)',
        },

        // Reduced motion support
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
        },
      }}
    >
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-evenly', px: 1 }}>
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isLucideIcon = tab.id === 'treasure'; // Gem is from lucide-react

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
                minHeight: '44px',
                position: 'relative',

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

                // Specular highlight for active tab
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
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default IOSTabBar;
