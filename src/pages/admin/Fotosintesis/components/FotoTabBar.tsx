/**
 * FotoTabBar — Fotosíntesis-native bottom navigation.
 *
 * Replaces the global iOS tab bar while inside `/admin/fotosintesis/*`. Five
 * slots (Inicio · Lotes · Ventas · Directorio · Menú), a real active-route
 * indicator, and a sliding emerald pill driven by the module's own `getFoto`
 * tokens (NOT the storefront's hardcoded gradient).
 *
 * The Menú slot is a trigger — it calls `onMenuClick` to open the shared
 * FotoRouteMenu owned by FotosintesisLayout.
 */

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { motion, LayoutGroup } from "framer-motion";
import {
  BarChart3,
  Boxes,
  Home,
  Menu as MenuIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getFoto, zIndex } from "../../../../design-system";

export interface FotoTabBarProps {
  /** Opens the shared route menu (owned by FotosintesisLayout). */
  onMenuClick: () => void;
  /** Reflects the menu's open state so the Menú slot can light up. */
  menuOpen?: boolean;
}

type SlotMatch = "exact" | "prefix";

interface TabSlot {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Route target (absent for the action-only Menú slot). */
  route?: string;
  /** How `route` maps to the active state. */
  match?: SlotMatch;
  /** True for the Menú action slot. */
  action?: boolean;
}

const SLOTS: readonly TabSlot[] = [
  {
    id: "inicio",
    label: "Inicio",
    icon: Home,
    route: "/admin/fotosintesis",
    match: "exact",
  },
  {
    id: "lotes",
    label: "Lotes",
    icon: Boxes,
    route: "/admin/fotosintesis/lots",
    match: "prefix",
  },
  {
    id: "ventas",
    label: "Ventas",
    icon: BarChart3,
    route: "/admin/fotosintesis/sales",
    match: "prefix",
  },
  {
    id: "directorio",
    label: "Directorio",
    icon: Users,
    route: "/admin/fotosintesis/directory",
    match: "prefix",
  },
  {
    id: "menu",
    label: "Menú",
    icon: MenuIcon,
    action: true,
  },
];

const PILL_HEIGHT = 60;
const PILL_RADIUS = 30;
const PILL_PADDING = 4;
const TAB_RADIUS = 26;
const ICON_SIZE = 20;
const LABEL_SIZE = 10;

const NAV_PILL_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
};

/**
 * Resolve the active slot id for a pathname. Inicio matches ONLY its exact
 * path (never sub-routes); the others match by their distinct prefix, so
 * exactly one slot can ever be lit and Ventas never bleeds onto a sibling.
 */
function activeSlotFor(pathname: string): string {
  for (const slot of SLOTS) {
    if (!slot.route) continue;
    if (slot.match === "exact") {
      if (pathname === slot.route) return slot.id;
    } else if (
      pathname === slot.route ||
      pathname.startsWith(slot.route + "/")
    ) {
      return slot.id;
    }
  }
  return "";
}

export function FotoTabBar({ onMenuClick, menuOpen = false }: FotoTabBarProps) {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const location = useLocation();

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const activeId = useMemo(
    () => activeSlotFor(location.pathname),
    [location.pathname],
  );

  const activeGradient = `linear-gradient(225deg, ${foto.accent.primary} 0%, ${foto.accent.deep} 100%)`;
  const activeShadow = `0 4px 14px ${foto.accent.glow}`;

  const handleSlot = (slot: TabSlot) => {
    if ("vibrate" in navigator) navigator.vibrate(10);
    if (slot.action) {
      onMenuClick();
      return;
    }
    if (slot.route) navigate(slot.route);
  };

  const content = (
    <Box
      component="nav"
      aria-label="Navegación de Fotosíntesis"
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: `10px 16px calc(12px + env(safe-area-inset-bottom)) 16px`,
        zIndex: zIndex.float,
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          height: PILL_HEIGHT,
          maxWidth: 520,
          marginX: "auto",
          borderRadius: `${PILL_RADIUS}px`,
          padding: `${PILL_PADDING}px`,
          pointerEvents: "auto",
          position: "relative",
          backgroundColor: foto.surfaces.canvas,
          border: `1px solid ${foto.surfaces.edge}`,
          boxShadow: "0 4px 16px rgba(11, 16, 14, 0.12)",
        }}
      >
        <LayoutGroup>
          {SLOTS.map((slot) => {
            const Icon = slot.icon;
            const isActive = slot.action ? menuOpen : activeId === slot.id;
            return (
              <Box
                key={slot.id}
                component="button"
                type="button"
                aria-label={slot.label}
                aria-current={!slot.action && isActive ? "page" : undefined}
                aria-haspopup={slot.action ? "menu" : undefined}
                aria-expanded={slot.action ? menuOpen : undefined}
                onClick={() => handleSlot(slot)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  height: "100%",
                  minWidth: 0,
                  gap: "3px",
                  border: "none",
                  background: "transparent",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  position: "relative",
                  isolation: "isolate",
                  borderRadius: `${TAB_RADIUS}px`,
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                  transition: "background 120ms ease",
                  "&:hover": !isActive
                    ? { background: foto.surfaces.rowHover }
                    : undefined,
                  "&:active": { transform: "scale(0.95)" },
                  "&:focus-visible": {
                    outline: "none",
                    boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                  },
                }}
              >
                {isActive &&
                  (reduceMotion ? (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        background: activeGradient,
                        boxShadow: activeShadow,
                        borderRadius: `${TAB_RADIUS}px`,
                        zIndex: 0,
                      }}
                    />
                  ) : (
                    <motion.div
                      layoutId="foto-tab-indicator"
                      transition={NAV_PILL_SPRING}
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: activeGradient,
                        boxShadow: activeShadow,
                        borderRadius: `${TAB_RADIUS}px`,
                        zIndex: 0,
                      }}
                    />
                  ))}

                <Box
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: ICON_SIZE,
                    width: ICON_SIZE,
                  }}
                >
                  <Icon
                    size={ICON_SIZE}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    color={isActive ? foto.ink.inverse : foto.ink.tertiary}
                  />
                </Box>

                <Typography
                  component="span"
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    fontSize: `${LABEL_SIZE}px`,
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: isActive ? foto.ink.inverse : foto.ink.tertiary,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                    lineHeight: 1.2,
                  }}
                >
                  {slot.label}
                </Typography>
              </Box>
            );
          })}
        </LayoutGroup>
      </Box>
    </Box>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

export default FotoTabBar;
