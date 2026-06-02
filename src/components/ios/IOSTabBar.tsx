/**
 * IOSTabBar Component
 *
 * Floating pill-shaped bottom navigation matching ds-tm.pen BottomNavBar spec.
 * - Outer wrapper with padding creates floating effect
 * - Inner pill: rounded container with solid bg, subtle border + shadow
 * - Active tab: solid emerald fill pill that slides between tabs (Framer Motion)
 * - Badge support with pulse animation
 * - Haptic feedback on tab change
 * - Safe area insets for modern iOS devices
 */

import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { motion, LayoutGroup } from "framer-motion";
import { Home, MoreHoriz, People } from "@mui/icons-material";
import { Gem, FileText, PlusCircle, Package } from "lucide-react";
import { useIsProvider } from "../../hooks/usePermissions";

// Design tokens
import {
  primitiveColors,
  easingCurves,
  durations,
  zIndex,
  fontWeights,
  microinteraction,
} from "../../design-system";
import { useLanguage } from "../../contexts/LanguageContext";
import { useThemeMode } from "../../contexts/ThemeContext";
import { useLiquidGlassSafe } from "../../contexts/LiquidGlassContext";

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
    id: "home",
    label: t.nav.home,
    icon: Home,
    route: "/home",
  },
  {
    id: "treasure",
    label: t.nav.treasure,
    icon: Gem as React.ElementType,
    route: "/treasure",
  },
  {
    id: "ambassadors",
    label: t.nav.ambassadors,
    icon: People,
    route: "/ambassadors",
  },
  {
    id: "more",
    label: t.nav.more,
    icon: MoreHoriz,
    route: "/more",
  },
];

// Provider-specific tabs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getProviderTabs = (t: any): TabConfig[] => [
  {
    id: "provider-home",
    label: t.nav.home,
    icon: Home,
    route: "/provider",
  },
  {
    id: "provider-requests",
    label: t.nav.requests,
    icon: FileText as React.ElementType,
    route: "/provider/requests",
  },
  {
    id: "provider-submit",
    label: t.actions.quote,
    icon: PlusCircle as React.ElementType,
    route: "/provider/submit",
  },
  {
    id: "provider-inventory",
    label: t.nav.inventory,
    icon: Package as React.ElementType,
    route: "/provider/inventory",
  },
];

export interface IOSTabBarProps {
  onMoreClick?: () => void;
}

// Design spec constants from ds-tm.pen BottomNavBar
const PILL_HEIGHT = 62;
const PILL_RADIUS = 36;
const PILL_PADDING = 4;
const TAB_RADIUS_ACTIVE = 36;
const TAB_RADIUS_INACTIVE = 26;
const ICON_SIZE = 20;
const LABEL_SIZE = 10;
const LABEL_SPACING = 0.5;
// Logo green #00AF84 as gradient base, darker end derived from Button/Primary pattern
const ACTIVE_GRADIENT = "linear-gradient(225deg, #00AF84 0%, #008C6A 100%)";
const ACTIVE_SHADOW = "0 4px 14px rgba(0, 175, 132, 0.3)";
const ACTIVE_SOLID = "#00AF84"; // badge ring color
const INACTIVE_LIGHT = "#9CA3AF";
const INACTIVE_DARK = "#78788A";

const IOSTabBar: React.FC<IOSTabBarProps> = ({ onMoreClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { effectiveConfig } = useLiquidGlassSafe();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";
  const isProvider = useIsProvider();

  const inactiveColor = isDark ? INACTIVE_DARK : INACTIVE_LIGHT;

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
          currentPath === tab.route || currentPath.startsWith(tab.route + "/"),
      );
      return matchingTab?.id || "provider-home";
    }

    // For regular users
    const matchingTab = PRIMARY_TABS.find(
      (tab) => currentPath.startsWith(tab.route) && tab.id !== "more",
    );

    if (matchingTab) return matchingTab.id;

    const secondaryRoutes = ["/cuentas", "/boveda-secreta", "/esmereogenesis"];
    const isSecondaryRoute = secondaryRoutes.some((route) =>
      currentPath.startsWith(route),
    );

    return isSecondaryRoute ? "more" : "";
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: TabConfig) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    // For providers, all tabs navigate directly (no "more" menu)
    if (isProvider) {
      navigate(tab.route);
      return;
    }

    if (tab.id === "more") {
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
      sx={{
        // Outer wrapper — creates floating effect with padding
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: `12px 21px calc(21px + env(safe-area-inset-bottom)) 21px`,
        zIndex: zIndex.float,
        pointerEvents: "none", // Pass through clicks outside the pill

        // GPU acceleration
        WebkitTransform: "translate3d(0, 0, 0)",
        transform: "translate3d(0, 0, 0)",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
        willChange: "transform",
      }}
    >
      {/* Inner pill container */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          height: PILL_HEIGHT,
          borderRadius: `${PILL_RADIUS}px`,
          padding: `${PILL_PADDING}px`,
          pointerEvents: "auto", // Re-enable clicks on the pill
          overflow: "hidden",
          position: "relative",

          // Background
          backgroundColor: isDark ? "#161618" : "#FFFFFF",

          // Border
          border: `1px solid ${isDark ? "#2E2E33" : "#E5E7EB"}`,

          // Shadow — blur 16, offset y:4, subtle
          boxShadow: isDark
            ? "0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 0.5px rgba(0, 174, 122, 0.06)"
            : "0 4px 16px rgba(0, 0, 0, 0.1)",

          // Transitions
          transition: effectiveConfig.animations
            ? `background-color ${durations.liquidFast} ${easingCurves.liquidInOut}, border-color ${durations.liquidFast} ${easingCurves.liquidInOut}, box-shadow ${durations.liquidFast} ${easingCurves.liquidInOut}`
            : "none",

          // Reduced motion support
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
          },
        }}
      >
        <LayoutGroup>
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // Lucide icons: treasure (Gem), provider tabs (FileText, PlusCircle, Package)
            const lucideIconIds = [
              "treasure",
              "provider-requests",
              "provider-submit",
              "provider-inventory",
            ];
            const isLucideIcon = lucideIconIds.includes(tab.id);

            return (
              <Box
                key={tab.id}
                role="button"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                tabIndex={0}
                onClick={() => handleTabClick(tab)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTabClick(tab);
                  }
                }}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  height: "100%",
                  cursor: "pointer",
                  position: "relative",
                  isolation: "isolate",
                  borderRadius: `${isActive ? TAB_RADIUS_ACTIVE : TAB_RADIUS_INACTIVE}px`,
                  gap: "3px",
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",

                  // Transitions
                  transition: effectiveConfig.animations
                    ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                    : "none",

                  "&:hover": !isActive
                    ? {
                        backgroundColor: effectiveConfig.animations
                          ? isDark
                            ? "rgba(255, 255, 255, 0.06)"
                            : "rgba(0, 0, 0, 0.04)"
                          : undefined,
                      }
                    : {},
                  "&:active": {
                    transform: effectiveConfig.animations
                      ? "scale(0.95)"
                      : "none",
                    transition: effectiveConfig.animations
                      ? `transform 80ms ${easingCurves.liquidIn}`
                      : "none",
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${primitiveColors.emerald[500]}`,
                    outlineOffset: "2px",
                  },
                }}
              >
                {/* Animated sliding emerald pill background for active tab */}
                {isActive &&
                  (effectiveConfig.animations ? (
                    <motion.div
                      layoutId="tab-indicator"
                      transition={microinteraction.navPill}
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: ACTIVE_GRADIENT,
                        boxShadow: ACTIVE_SHADOW,
                        borderRadius: `${TAB_RADIUS_ACTIVE}px`,
                        zIndex: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: ACTIVE_GRADIENT,
                        boxShadow: ACTIVE_SHADOW,
                        borderRadius: `${TAB_RADIUS_ACTIVE}px`,
                        zIndex: 0,
                      }}
                    />
                  ))}

                {/* Icon */}
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: ICON_SIZE,
                    width: ICON_SIZE,
                    zIndex: 1,
                  }}
                >
                  {isLucideIcon ? (
                    <Icon
                      size={ICON_SIZE}
                      color={isActive ? "#FFFFFF" : inactiveColor}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      style={{
                        transition: effectiveConfig.animations
                          ? `color ${durations.liquidFast} ${easingCurves.liquidInOut}`
                          : "none",
                      }}
                    />
                  ) : (
                    <Icon
                      sx={{
                        fontSize: `${ICON_SIZE}px`,
                        color: isActive ? "#FFFFFF" : inactiveColor,
                        transition: effectiveConfig.animations
                          ? `color ${durations.liquidFast} ${easingCurves.liquidInOut}`
                          : "none",
                      }}
                    />
                  )}
                  {/* Badge */}
                  {tab.badge && tab.badge > 0 && (
                    <Box
                      aria-label={`${tab.badge} notifications`}
                      sx={{
                        position: "absolute",
                        top: "-4px",
                        right: "-8px",
                        minWidth: "16px",
                        height: "16px",
                        borderRadius: "8px",
                        backgroundColor: "var(--status-error)",
                        color: "white",
                        fontSize: "10px",
                        fontWeight: fontWeights.semibold,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 4px",
                        boxShadow: isActive
                          ? `0 0 0 2px ${ACTIVE_SOLID}`
                          : `0 0 0 2px ${isDark ? "#161618" : "#FFFFFF"}`,
                        // Badge entrance animation
                        animation: effectiveConfig.animations
                          ? `badgeIn 300ms ${easingCurves.liquidSpring} both`
                          : "none",
                        // Pulse ring pseudo-element
                        "&::after": effectiveConfig.animations
                          ? {
                              content: '""',
                              position: "absolute",
                              inset: 0,
                              borderRadius: "inherit",
                              backgroundColor: "var(--status-error)",
                              opacity: 0,
                              animation: "badgePulse 2s ease-in-out infinite",
                              zIndex: -1,
                            }
                          : {},
                        "@keyframes badgeIn": {
                          "0%": { transform: "scale(0)" },
                          "70%": { transform: "scale(1.15)" },
                          "100%": { transform: "scale(1)" },
                        },
                        "@keyframes badgePulse": {
                          "0%": { transform: "scale(1)", opacity: 0.4 },
                          "100%": { transform: "scale(2.5)", opacity: 0 },
                        },
                        "@media (prefers-reduced-motion: reduce)": {
                          animation: "none",
                          "&::after": { animation: "none" },
                        },
                      }}
                    >
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </Box>
                  )}
                </Box>

                {/* Label */}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: `${LABEL_SIZE}px`,
                    fontFamily: '"DM Sans", sans-serif',
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: `${LABEL_SPACING}px`,
                    textTransform: "uppercase",
                    color: isActive ? "#FFFFFF" : inactiveColor,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                    lineHeight: 1.2,
                    transition: effectiveConfig.animations
                      ? `color ${durations.liquidFast} ${easingCurves.liquidInOut}`
                      : "none",
                    zIndex: 1,
                    position: "relative",
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

  // Render via portal to document.body to escape any parent scroll containers
  // This is critical for PWA standalone mode where body is position:fixed
  return createPortal(tabBarContent, document.body);
};

export default IOSTabBar;
