/**
 * IOSTabBar Component — Quiet Emerald
 *
 * Bottom navigation, restyled to the v2 "Quiet Emerald" language and wired to
 * the redesign A/B variant store (see useRedesignVariant):
 *
 *   A · faithful (default) — keeps the floating pill + sliding active indicator,
 *       retoned to qe tokens: solid accent-strong fill (no gradient), qe
 *       surface/border/subtle, Hanken Grotesk labels.
 *   B · literal — the mockup bar exactly: flat edge-to-edge, 64px + safe area,
 *       hairline top border, translucent surface + blur, active tab = emerald
 *       icon + label (accent-pure), no pill.
 *
 * Both variants keep existing behavior: provider tabs, badges, haptics,
 * Fotosíntesis suppression, Bóveda desktop auto-hide, portal rendering.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { motion, LayoutGroup } from 'framer-motion';
import { Home, MoreHoriz } from '@mui/icons-material';
import { FileText, PlusCircle, Package } from 'lucide-react';
import EmeraldCutIcon from '../icons/EmeraldCutIcon';
import AmbassadorsGlobeIcon from '../icons/AmbassadorsGlobeIcon';
import { useIsProvider } from '../../hooks/usePermissions';

// Design tokens — Quiet Emerald
import {
  getQuietEmerald,
  qeFont,
  easingCurves,
  durations,
  zIndex,
  fontWeights,
  microinteraction,
  layoutBreakpoints,
} from '../../design-system';
import { useRedesignVariant } from '../../hooks/useRedesignVariant';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';

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
    icon: EmeraldCutIcon as React.ElementType,
    route: '/treasure',
  },
  {
    id: 'ambassadors',
    label: t.nav.ambassadors,
    icon: AmbassadorsGlobeIcon as React.ElementType,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getProviderTabs = (t: any): TabConfig[] => [
  {
    id: 'provider-home',
    label: t.nav.home,
    icon: Home,
    route: '/provider',
  },
  {
    id: 'provider-requests',
    label: t.nav.requests,
    icon: FileText as React.ElementType,
    route: '/provider/requests',
  },
  {
    id: 'provider-submit',
    label: t.actions.quote,
    icon: PlusCircle as React.ElementType,
    route: '/provider/submit',
  },
  {
    id: 'provider-inventory',
    label: t.nav.inventory,
    icon: Package as React.ElementType,
    route: '/provider/inventory',
  },
];

export interface IOSTabBarProps {
  onMoreClick?: () => void;
}

// Pill geometry (A · faithful)
const PILL_HEIGHT = 62;
const PILL_RADIUS = 36;
const PILL_PADDING = 4;
const TAB_RADIUS_ACTIVE = 36;
const TAB_RADIUS_INACTIVE = 26;
const ICON_SIZE = 20;
const LABEL_SIZE = 10;
// Flat bar geometry (B · literal — mockup spec)
const FLAT_BAR_HEIGHT = 64;
const FLAT_ICON_SIZE = 21;
const FLAT_LABEL_SIZE = 9;

/** Translucent surface for the literal bar (surface hex → rgba at .94). */
const toRgba = (hex: string, alpha: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const IOSTabBar: React.FC<IOSTabBarProps> = ({ onMoreClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { effectiveConfig } = useLiquidGlassSafe();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const isProvider = useIsProvider();
  const { isLiteral } = useRedesignVariant();

  const qe = useMemo(() => getQuietEmerald(mode), [mode]);
  const inactiveColor = qe.subtle;
  const activeColor = isLiteral ? qe.accentPure : qe.onAccent;
  const activeShadow = isDark
    ? '0 4px 14px rgba(0, 175, 132, 0.28)'
    : '0 4px 14px rgba(0, 111, 82, 0.26)';
  const pillShadow = isDark
    ? '0 4px 16px rgba(0, 0, 0, 0.4)'
    : '0 4px 16px rgba(13, 30, 24, 0.10)';

  // Fotosíntesis now owns its native bottom bar (FotoTabBar) and this global bar
  // early-returns null on /admin/fotosintesis, so its old desktop auto-hide (and
  // the window mousemove listener it drove) is gone. Bóveda/esmereogénesis keeps
  // its own auto-hide below. Direct matchMedia (not MUI useMediaQuery) — robust
  // against portal/theme timing and emulated-viewport quirks.
  // Bóveda only hands the bottom bar to its slim left side-nav at the desktop
  // tier (≥1180px, matching ESMEREO_DESKTOP_MIN); iPad keeps the bottom bar.
  const [isEsmereoDesktop, setIsEsmereoDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(min-width: ${layoutBreakpoints.desktop}px)`).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(min-width: ${layoutBreakpoints.desktop}px)`);
    const onChange = () => setIsEsmereoDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const autoHide =
    isEsmereoDesktop && location.pathname.startsWith('/esmereogenesis');
  const [revealed, setRevealed] = useState(false);
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!autoHide) {
      setRevealed(false);
      return;
    }
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setRevealed(e.clientY >= window.innerHeight - 100);
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [autoHide]);

  // Use provider tabs if user is a provider, otherwise use primary tabs
  const PRIMARY_TABS = useMemo(() => {
    if (isProvider) {
      return getProviderTabs(t);
    }
    return getPrimaryTabs(t);
  }, [t, isProvider]);

  const getActiveTab = (): string => {
    const currentPath = location.pathname;

    // For providers, match against provider routes
    if (isProvider) {
      const matchingTab = PRIMARY_TABS.find(
        (tab) =>
          currentPath === tab.route || currentPath.startsWith(tab.route + '/'),
      );
      return matchingTab?.id || 'provider-home';
    }

    // For regular users
    const matchingTab = PRIMARY_TABS.find(
      (tab) => currentPath.startsWith(tab.route) && tab.id !== 'more',
    );

    if (matchingTab) return matchingTab.id;

    const secondaryRoutes = ['/cuentas', '/boveda-secreta'];
    const isSecondaryRoute = secondaryRoutes.some((route) =>
      currentPath.startsWith(route),
    );

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

  // Use portal to render at document.body level, outside any scrolling containers
  // This ensures fixed positioning works correctly in PWA standalone mode
  const tabBarContent = (
    <Box
      component="nav"
      aria-label="Primary navigation"
      onFocus={() => autoHide && setRevealed(true)}
      onBlur={() => autoHide && setRevealed(false)}
      sx={{
        // Outer wrapper — floating (A) or edge-to-edge (B).
        // right consumes the docked Copilot rail width so the bar shifts with
        // the content instead of underlapping the rail (Navigation UX rule 5).
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 'var(--copilot-rail-width, 0px)',
        padding: isLiteral
          ? 0
          : `12px 21px calc(21px + env(safe-area-inset-bottom)) 21px`,
        zIndex: zIndex.float,
        pointerEvents: 'none', // Pass through clicks outside the bar

        // GPU acceleration + desktop auto-hide slide (Bóveda only)
        WebkitTransform:
          autoHide && !revealed
            ? 'translate3d(0, calc(100% + 24px), 0)'
            : 'translate3d(0, 0, 0)',
        transform:
          autoHide && !revealed
            ? 'translate3d(0, calc(100% + 24px), 0)'
            : 'translate3d(0, 0, 0)',
        transition: reduceMotion
          ? 'none'
          : // right eases in sync with IOSLayout's padding-right rail push.
            'transform 260ms cubic-bezier(0.32, 0.72, 0, 1), right 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
    >
      {/* Inner container — pill (A) or flat hairline bar (B) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'auto', // Re-enable clicks on the bar
          position: 'relative',

          ...(isLiteral
            ? {
                // B · literal — mockup: flat, hairline top, translucent + blur
                height: `calc(${FLAT_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
                padding: `10px 18px calc(6px + env(safe-area-inset-bottom))`,
                backgroundColor: toRgba(qe.surface, 0.94),
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderTop: `1px solid ${qe.hairline}`,
              }
            : {
                // A · faithful — floating pill, retoned to qe tokens
                height: PILL_HEIGHT,
                borderRadius: `${PILL_RADIUS}px`,
                padding: `${PILL_PADDING}px`,
                overflow: 'hidden',
                backgroundColor: qe.surface,
                border: `1px solid ${qe.border}`,
                boxShadow: pillShadow,
              }),

          // Transitions
          transition: effectiveConfig.animations
            ? `background-color ${durations.liquidFast} ${easingCurves.liquidInOut}, border-color ${durations.liquidFast} ${easingCurves.liquidInOut}, box-shadow ${durations.liquidFast} ${easingCurves.liquidInOut}`
            : 'none',

          // Reduced motion support
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
          },
        }}
      >
        <LayoutGroup>
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const iconColor = isActive ? activeColor : inactiveColor;
            // Custom SVG icons that accept size/color/strokeWidth (Lucide-compatible interface)
            const lucideIconIds = [
              'treasure',
              'ambassadors',
              'provider-requests',
              'provider-submit',
              'provider-inventory',
            ];
            const isLucideIcon = lucideIconIds.includes(tab.id);
            const iconSize = isLiteral ? FLAT_ICON_SIZE : ICON_SIZE;

            return (
              <Box
                key={tab.id}
                role="button"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={0}
                onClick={() => handleTabClick(tab)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTabClick(tab);
                  }
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  height: '100%',
                  cursor: 'pointer',
                  position: 'relative',
                  isolation: 'isolate',
                  borderRadius: isLiteral
                    ? '10px'
                    : `${isActive ? TAB_RADIUS_ACTIVE : TAB_RADIUS_INACTIVE}px`,
                  gap: isLiteral ? '4px' : '3px',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',

                  // Transitions
                  transition: effectiveConfig.animations
                    ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                    : 'none',

                  '&:hover': !isActive
                    ? {
                        backgroundColor: effectiveConfig.animations
                          ? isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : 'rgba(0, 0, 0, 0.04)'
                          : undefined,
                      }
                    : {},
                  '&:active': {
                    transform: effectiveConfig.animations
                      ? 'scale(0.95)'
                      : 'none',
                    transition: effectiveConfig.animations
                      ? `transform 80ms ${easingCurves.liquidIn}`
                      : 'none',
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${qe.accent}`,
                    outlineOffset: '2px',
                  },
                }}
              >
                {/* Animated sliding emerald pill background for active tab (A only) */}
                {isActive &&
                  !isLiteral &&
                  (effectiveConfig.animations ? (
                    <motion.div
                      layoutId="tab-indicator"
                      transition={microinteraction.navPill}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: qe.accentStrong,
                        boxShadow: activeShadow,
                        borderRadius: `${TAB_RADIUS_ACTIVE}px`,
                        zIndex: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: qe.accentStrong,
                        boxShadow: activeShadow,
                        borderRadius: `${TAB_RADIUS_ACTIVE}px`,
                        zIndex: 0,
                      }}
                    />
                  ))}

                {/* Icon */}
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: iconSize,
                    width: iconSize,
                    zIndex: 1,
                  }}
                >
                  {isLucideIcon ? (
                    <Icon
                      size={iconSize}
                      color={iconColor}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      style={{
                        transition: effectiveConfig.animations
                          ? `color ${durations.liquidFast} ${easingCurves.liquidInOut}`
                          : 'none',
                      }}
                    />
                  ) : (
                    <Icon
                      sx={{
                        fontSize: `${iconSize}px`,
                        color: iconColor,
                        transition: effectiveConfig.animations
                          ? `color ${durations.liquidFast} ${easingCurves.liquidInOut}`
                          : 'none',
                      }}
                    />
                  )}
                  {/* Badge */}
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
                        fontWeight: fontWeights.semibold,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow:
                          isActive && !isLiteral
                            ? `0 0 0 2px ${qe.accentStrong}`
                            : `0 0 0 2px ${qe.surface}`,
                        // Badge entrance animation
                        animation: effectiveConfig.animations
                          ? `badgeIn 300ms ${easingCurves.liquidSpring} both`
                          : 'none',
                        // Pulse ring pseudo-element
                        '&::after': effectiveConfig.animations
                          ? {
                              content: '""',
                              position: 'absolute',
                              inset: 0,
                              borderRadius: 'inherit',
                              backgroundColor: 'var(--status-error)',
                              opacity: 0,
                              animation: 'badgePulse 2s ease-in-out infinite',
                              zIndex: -1,
                            }
                          : {},
                        '@keyframes badgeIn': {
                          '0%': { transform: 'scale(0)' },
                          '70%': { transform: 'scale(1.15)' },
                          '100%': { transform: 'scale(1)' },
                        },
                        '@keyframes badgePulse': {
                          '0%': { transform: 'scale(1)', opacity: 0.4 },
                          '100%': { transform: 'scale(2.5)', opacity: 0 },
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                          animation: 'none',
                          '&::after': { animation: 'none' },
                        },
                      }}
                    >
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Box>
                  )}
                </Box>

                {/* Label */}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: `${isLiteral ? FLAT_LABEL_SIZE : LABEL_SIZE}px`,
                    fontFamily: qeFont.ui,
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: isLiteral ? 0 : '0.5px',
                    textTransform: isLiteral ? 'none' : 'uppercase',
                    color: isActive ? activeColor : inactiveColor,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    lineHeight: 1.2,
                    transition: effectiveConfig.animations
                      ? `color ${durations.liquidFast} ${easingCurves.liquidInOut}`
                      : 'none',
                    zIndex: 1,
                    position: 'relative',
                  }}
                >
                  {tab.label}
                </Typography>
              </Box>
            );
          })}
        </LayoutGroup>
      </Box>
    </Box>
  );

  // Fotosíntesis owns its own bottom chrome (FotoTabBar). Suppress the global
  // bar for that prefix ONLY — every other route (/home, /treasure, …) is
  // unaffected. Placed after all hooks so hook order stays stable.
  if (location.pathname.startsWith('/admin/fotosintesis')) {
    return null;
  }

  // Render via portal to document.body to escape any parent scroll containers
  // This is critical for PWA standalone mode where body is position:fixed
  return createPortal(tabBarContent, document.body);
};

export default IOSTabBar;
