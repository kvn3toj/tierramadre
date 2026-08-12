/**
 * Tierra Madre Design System v3 — "Quiet Emerald" composite
 *
 * ONE import for the whole system. Feature code should need nothing beyond:
 *
 *   import { ds3, getDS3 } from '@/design-system';
 *
 * v3 promotes Quiet Emerald to the product-wide language and binds it to the
 * shell/navigation/scroll foundations. It composes EXISTING canonical tokens
 * (quiet-emerald, layout, scrollMixins) — it does not fork them.
 *
 * Spec: DESIGN-SYSTEM-V3.md (§9 "Foundation Files").
 */

import {
  quietEmerald,
  getQuietEmerald,
  qeFont,
  qeType,
  qeRadius,
  qeMotion,
  type QEMode,
  type QESurfaces,
} from './tokens/quiet-emerald';
import {
  appShell,
  zIndex,
  radius,
  layoutConstants,
  layoutBreakpoints,
} from './tokens/layout';
import {
  containedScrollY,
  containedScrollX,
  paneHeight,
  bottomBarClearance,
} from './mixins/scrollMixins';

// =============================================================================
// MOTION — the one motion system (§4). No springs in product UI.
// =============================================================================

export const ds3Motion = {
  ease: qeMotion.ease, // enter/move — cubic-bezier(0.22, 1, 0.36, 1)
  easeExit: 'cubic-bezier(0.55, 0, 1, 0.45)',
  fast: qeMotion.fast, // 160ms — hover, press, toggles
  base: qeMotion.base, // 240ms — dropdowns, nav transitions
  slow: qeMotion.slow, // 420ms — sheets, modals, page choreography
  /** Standard transition helper: transition('opacity', 'transform') */
  transition: (...props: string[]): string =>
    props.map((p) => `${p} ${qeMotion.base} ${qeMotion.ease}`).join(', '),
} as const;

// =============================================================================
// SEMANTIC STATUS — desaturated, earth-toned; success IS the emerald (§1.2)
// =============================================================================

export const ds3Status = {
  light: { danger: '#B3403A', warning: '#8A5F1B', success: '#00785C' },
  dark: { danger: '#E5736C', warning: '#D9A94E', success: '#34C99B' },
} as const;

// =============================================================================
// INTERACTION STATES (§6.1) — apply per component via sx spread
// =============================================================================

export const ds3States = {
  /** Keyboard-only focus ring — never suppressed. */
  focusVisible: {
    outline: 'none',
    boxShadow: 'var(--tm-focus-ring)',
  },
  disabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  },
  pressed: { opacity: 0.85 },
} as const;

// =============================================================================
// SHELL & NAVIGATION (§5) — re-exported so one import covers the contract
// =============================================================================

export const ds3Shell = {
  ...appShell,
  zIndex,
  breakpoints: layoutBreakpoints,
  constants: layoutConstants,
  scroll: {
    containedScrollY,
    containedScrollX,
    paneHeight,
    bottomBarClearance,
  },
} as const;

// =============================================================================
// COMPOSITE
// =============================================================================

export interface DS3 extends QESurfaces {
  // Colores semánticos del modo resuelto: ambos modos (claro/oscuro) traen las
  // mismas tres claves con valores hex distintos, así que el contrato es la
  // forma, no los literales de un solo modo (si no, el modo oscuro no encaja).
  status: { danger: string; warning: string; success: string };
}

/** Resolve the full v3 token set for a theme mode. */
export function getDS3(mode: QEMode): DS3 {
  return {
    ...getQuietEmerald(mode),
    status: ds3Status[mode],
  };
}

export const ds3 = {
  ...quietEmerald,
  font: qeFont,
  type: qeType,
  radius: qeRadius,
  radiusScale: radius,
  motion: ds3Motion,
  status: ds3Status,
  states: ds3States,
  shell: ds3Shell,
  get: getDS3,
} as const;

export type { QEMode as DS3Mode, QESurfaces as DS3Surfaces };
export default ds3;
