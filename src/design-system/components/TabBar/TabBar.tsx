/**
 * TabBar — the ONE bottom navigation for Tierra Madre (DS v3).
 *
 * Unifies the storefront IOSTabBar and the Fotosíntesis FotoTabBar into a
 * single config-driven bar. The Fotosíntesis bar was the good one — it is
 * CONTAINED (maxWidth + centered) so it never stretches edge-to-edge on
 * desktop, has equal-width slots, one lit slot, and a real active-route
 * indicator. This component makes that behavior canonical and lets the
 * storefront use it with its own slots + tokens.
 *
 * What changed vs the old storefront bar:
 *   • Contained on desktop — inner pill caps at `maxWidth` and centers, so on a
 *     wide screen it floats as a pill instead of a stretched edge-to-edge bar.
 *   • One geometry, one behavior for users and admins (only slots + theme differ).
 *   • Signature: the active indicator is an emerald step-cut (octagonal table),
 *     not a generic fully-rounded pill — the DS v3 "el bisel" signature (§ craft).
 *   • Motion reconciled to DS v3: a calm near-critically-damped tween on the
 *     sliding indicator (no visible bounce), honoring the "no springs in product
 *     UI" rule while preserving the Foto bar's snap.
 *
 * Behavior preserved from both bars: portal to <body> (PWA-safe), safe-area
 * bottom inset, rail-aware `right`, reduced-motion, haptics, badges, a11y
 * (role=nav, aria-current, aria-haspopup/expanded for the action slot).
 *
 * Spec: DESIGN-SYSTEM-V3.md §5.2/§5.3 + DESIGN-SYSTEM-V3-ADDENDUM.md.
 * Target path: src/design-system/components/TabBar/TabBar.tsx
 * (re-export from the barrel: `export { TabBar } from './components/TabBar/TabBar'`).
 */

import React, { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { motion, LayoutGroup } from 'framer-motion';
import { zIndex } from '../../tokens/layout';

// =============================================================================
// TYPES
// =============================================================================

export interface TabBarTheme {
  /** Pill background (resting surface). */
  surface: string;
  /** 1px pill border. */
  border: string;
  /** Active indicator fill (solid — no gradient in DS v3). */
  accentStrong: string;
  /** Text/icon color ON the active fill. */
  onAccent: string;
  /** Inactive icon + label color. */
  inactive: string;
  /** Subtle hover wash for inactive slots. */
  hover: string;
  /** Focus-ring color. */
  focus: string;
  /** Editorial drop shadow for the floating pill. */
  shadow: string;
  /** UI font family. */
  fontUi: string;
}

type SlotMatch = 'exact' | 'prefix';

export interface TabSlot {
  id: string;
  label: string;
  /** Lucide-style icon: ({size,color,strokeWidth}) — the app's icon contract.
   *  Acepta iconos de lucide-react (ForwardRef) y los iconos propios de la app,
   *  que exponen la misma firma {size,color,strokeWidth}. */
  icon:
    | LucideIcon
    | React.ComponentType<{
        size?: number;
        color?: string;
        strokeWidth?: number;
      }>;
  /** Route target (absent for an action-only slot such as "Menú"). */
  route?: string;
  /** How `route` maps to the active state. Default 'prefix'. */
  match?: SlotMatch;
  /** True for an action slot (opens a sheet/menu instead of navigating). */
  action?: boolean;
  /** Optional unread/notification count. */
  badge?: number;
}

export interface TabBarProps {
  slots: readonly TabSlot[];
  theme: TabBarTheme;
  /** Called when an action slot is tapped (e.g. open the More/Route menu). */
  onAction?: (slotId: string) => void;
  /** Reflects an action slot's open state so it can light up. */
  actionOpen?: boolean;
  /** Max width of the floating pill (px). Caps desktop stretch. Default 520. */
  maxWidth?: number;
  /** Emerald step-cut signature on the active indicator. Default true. */
  beveled?: boolean;
  /** aria-label for the nav landmark. */
  ariaLabel?: string;
}

// =============================================================================
// GEOMETRY (from the Foto bar — the contained one)
// =============================================================================

const PILL_HEIGHT = 60;
const PILL_RADIUS = 30;
const PILL_PADDING = 4;
const TAB_RADIUS = 26;
const ICON_SIZE = 20;
const LABEL_SIZE = 10;
const BEVEL = 9; // emerald step-cut chamfer (px)

/** DS v3 calm tween — near-critically-damped, no bounce (§4 no-spring rule). */
const INDICATOR_TRANSITION = {
  type: 'tween' as const,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  duration: 0.24,
};

/**
 * Octagonal emerald-table clip — the "el bisel" signature. Chamfers all four
 * corners so the active fill reads as an emerald cut, not a generic pill.
 * When `beveled` is false, we fall back to a rounded rect (borderRadius).
 */
const emeraldClip = `polygon(${BEVEL}px 0, calc(100% - ${BEVEL}px) 0, 100% ${BEVEL}px, 100% calc(100% - ${BEVEL}px), calc(100% - ${BEVEL}px) 100%, ${BEVEL}px 100%, 0 calc(100% - ${BEVEL}px), 0 ${BEVEL}px)`;

const reduceMotionNow = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Active-slot resolution: exactly one slot can ever be lit. */
function activeSlotFor(pathname: string, slots: readonly TabSlot[]): string {
  // exact matches win first so a root like /home never bleeds onto children
  for (const s of slots) {
    if (s.route && (s.match ?? 'prefix') === 'exact' && pathname === s.route) {
      return s.id;
    }
  }
  for (const s of slots) {
    if (!s.route || s.action) continue;
    if ((s.match ?? 'prefix') === 'prefix') {
      if (pathname === s.route || pathname.startsWith(s.route + '/'))
        return s.id;
    }
  }
  return '';
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TabBar: React.FC<TabBarProps> = ({
  slots,
  theme,
  onAction,
  actionOpen = false,
  maxWidth = 520,
  beveled = true,
  ariaLabel = 'Navegación principal',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = reduceMotionNow();

  const activeId = useMemo(
    () => activeSlotFor(location.pathname, slots),
    [location.pathname, slots],
  );

  const handleSlot = (slot: TabSlot) => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    if (slot.action) {
      onAction?.(slot.id);
      return;
    }
    if (slot.route) navigate(slot.route);
  };

  const indicatorStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: theme.accentStrong,
    boxShadow: `0 4px 14px ${theme.accentStrong}33`,
    zIndex: 0,
    ...(beveled
      ? { clipPath: emeraldClip, WebkitClipPath: emeraldClip }
      : { borderRadius: `${TAB_RADIUS}px` }),
  };

  const content = (
    <Box
      component="nav"
      aria-label={ariaLabel}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        // Consume the docked Copilot rail width so the bar shifts with content
        // instead of underlapping the rail (Nav UX rule 5).
        right: 'var(--copilot-rail-width, 0px)',
        padding: `10px 16px calc(12px + env(safe-area-inset-bottom, 0px)) 16px`,
        zIndex: zIndex.float,
        pointerEvents: 'none', // pass-through outside the pill
        transition: reduceMotion
          ? 'none'
          : 'right 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {/* Inner pill — CONTAINED: caps at maxWidth and centers, so it never
          stretches edge-to-edge on desktop. This is the whole fix. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: PILL_HEIGHT,
          maxWidth,
          marginX: 'auto',
          borderRadius: `${PILL_RADIUS}px`,
          padding: `${PILL_PADDING}px`,
          pointerEvents: 'auto',
          position: 'relative',
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          boxShadow: theme.shadow,
        }}
      >
        <LayoutGroup>
          {slots.map((slot) => {
            const Icon = slot.icon;
            const isActive = slot.action ? actionOpen : activeId === slot.id;
            const fg = isActive ? theme.onAccent : theme.inactive;
            return (
              <Box
                key={slot.id}
                component="button"
                type="button"
                aria-label={slot.label}
                aria-current={!slot.action && isActive ? 'page' : undefined}
                aria-haspopup={slot.action ? 'menu' : undefined}
                aria-expanded={slot.action ? actionOpen : undefined}
                onClick={() => handleSlot(slot)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1, // equal-width slots
                  height: '100%',
                  minWidth: 0,
                  gap: '3px',
                  border: 'none',
                  background: 'transparent',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  position: 'relative',
                  isolation: 'isolate',
                  borderRadius: `${TAB_RADIUS}px`,
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 120ms ease',
                  '&:hover': !isActive
                    ? { background: theme.hover }
                    : undefined,
                  '&:active': { transform: 'scale(0.96)' },
                  '&:focus-visible': {
                    outline: 'none',
                    boxShadow: `0 0 0 3px ${theme.focus}`,
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    '&:active': { transform: 'none' },
                  },
                }}
              >
                {/* Active indicator — emerald step-cut, slides between slots */}
                {isActive &&
                  (reduceMotion ? (
                    <Box sx={indicatorStyle} />
                  ) : (
                    <motion.div
                      layoutId="tm-tab-indicator"
                      transition={INDICATOR_TRANSITION}
                      style={indicatorStyle}
                    />
                  ))}

                {/* Icon */}
                <Box
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: ICON_SIZE,
                    width: ICON_SIZE,
                  }}
                >
                  <Icon
                    size={ICON_SIZE}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    color={fg}
                  />
                  {slot.badge && slot.badge > 0 ? (
                    <Box
                      aria-label={`${slot.badge} sin leer`}
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -8,
                        minWidth: 16,
                        height: 16,
                        px: '4px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--tm-danger, #B3403A)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 600,
                        lineHeight: '16px',
                        textAlign: 'center',
                        boxShadow: `0 0 0 2px ${
                          isActive ? theme.accentStrong : theme.surface
                        }`,
                      }}
                    >
                      {slot.badge > 99 ? '99+' : slot.badge}
                    </Box>
                  ) : null}
                </Box>

                {/* Label */}
                <Typography
                  component="span"
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    fontFamily: theme.fontUi,
                    fontSize: `${LABEL_SIZE}px`,
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: fg,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
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

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default TabBar;
