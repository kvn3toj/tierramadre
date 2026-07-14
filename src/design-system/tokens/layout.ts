/**
 * Layout Constants (iOS HIG)
 *
 * Fixed dimensions for consistent UI across the app.
 * Navigation bars, tab bars, safe areas, and touch targets.
 *
 * Extracted from legacy design-system.ts for canonical usage.
 */

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================

export const layoutConstants = {
  // Navigation
  tabBarHeight: 56,
  tabBarClearance: 80,
  navBarHeight: 44,
  largeNavBarHeight: 96,

  // Safe areas (fallback values when env() not available)
  safeAreaTopFallback: 47,
  safeAreaBottomFallback: 34,

  // Touch targets (iOS HIG minimum: 44pt)
  minTouchTarget: 44,

  // Common offsets
  floatingButtonOffset: 96,
  comparisonBarOffset: 64,
  quickActionsOffset: 80,
} as const;

// =============================================================================
// APP SHELL (fixed-viewport single-scroller architecture)
// =============================================================================

/**
 * The app is a fixed-viewport shell: body { overflow: hidden } and the ONLY
 * page scroller is <main id="main-content"> inside IOSLayout. These tokens are
 * the single source of truth for the shell's published CSS vars and the
 * bottom-bar reservations. See "Navigation UX Rules" in src/design-system/README.md.
 */
export const appShell = {
  /** CSS var: measured clientHeight of <main id="main-content">, published by
   *  IOSLayout via ResizeObserver. Always read with a 100dvh fallback. */
  mainHeightVar: '--app-main-height',
  /** CSS var: docked Copilot rail width, published by CopilotRail. 0px when
   *  closed/overlay. Fixed chrome pinned to the right edge must consume it. */
  railWidthVar: '--copilot-rail-width',
  /** Global IOSTabBar bottom reservation: 12 top + 62 pill + 21 bottom (px, + safe-area). */
  tabBarReserve: 95,
  /** FotoTabBar bottom reservation on /admin/fotosintesis routes (px, + safe-area). */
  fotoTabBarReserve: 92,
} as const;

// =============================================================================
// NAMED PX BREAKPOINTS (outside the MUI scale — use sparingly)
// =============================================================================

/**
 * The only custom px breakpoints allowed in the app. Everything else uses MUI
 * theme breakpoints (sm 600 / md 900 / lg 1200 / xl 1536) via sx objects.
 */
export const layoutBreakpoints = {
  /** Below this the Copilot rail can't push content → temporary overlay. */
  railDock: 1024,
  /** Desktop tier: global tab bar hides, esmereo desktop layouts engage. */
  desktop: 1180,
} as const;

// =============================================================================
// Z-INDEX SCALE (Semantic Layering)
// =============================================================================

export const zIndex = {
  /** Hidden elements */
  hide: -1,
  /** Base layer */
  base: 0,
  /** Sticky headers, tab bars */
  sticky: 500,
  /** Fixed navigation, scroll-to-top */
  fixed: 900,
  /** Navigation bar */
  nav: 999,
  /** Tab bar, floating action buttons */
  float: 1000,
  /** Sheets, drawers, dropdown overlays */
  sheet: 1100,
  /** Sheet content (above sheet backdrop) */
  sheetContent: 1101,
  /** Comparison bar, floating panels */
  panel: 1200,
  /** Cotizacion overlays */
  overlay: 1400,
  /** Toasts, achievement notifications */
  toast: 2000,
  /** Modals, splash screens, lightboxes */
  modal: 9999,
} as const;

// =============================================================================
// BORDER RADIUS SCALE
// =============================================================================

export const radius = {
  none: '0',
  xs: '0.25rem', // 4px
  sm: '0.375rem', // 6px
  md: '0.5rem', // 8px
  /** 10px - iOS standard (buttons, inputs) */
  mlg: '0.625rem', // 10px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;
