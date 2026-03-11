/**
 * Tierra Madre Design System - Spacing Tokens
 *
 * 8pt grid system with golden ratio (φ = 1.618) proportions.
 * Based on iOS Human Interface Guidelines.
 */

// Golden ratio — imported from single source of truth
import { PHI } from './primitives/geometry';
export { PHI };

// =============================================================================
// BASE SPACING (8pt Grid)
// =============================================================================

export const spacing = {
  /** 0px */
  none: 0,
  /** 4px - 0.5x base */
  xs: 4,
  /** 8px - 1x base unit */
  sm: 8,
  /** 12px - 1.5x base */
  md: 12,
  /** 16px - 2x base */
  lg: 16,
  /** 20px - 2.5x base */
  xl: 20,
  /** 24px - 3x base */
  '2xl': 24,
  /** 32px - 4x base */
  '3xl': 32,
  /** 40px - 5x base */
  '4xl': 40,
  /** 48px - 6x base */
  '5xl': 48,
  /** 64px - 8x base */
  '6xl': 64,
  /** 80px - 10x base */
  '7xl': 80,
  /** 96px - 12x base */
  '8xl': 96,
} as const;

// =============================================================================
// iOS HIG TOUCH TARGETS
// =============================================================================

export const touchTargets = {
  /** 44px - iOS minimum touch target */
  minimum: 44,
  /** 48px - Comfortable touch target */
  comfortable: 48,
  /** 56px - Large touch target */
  large: 56,
} as const;

// =============================================================================
// COMPONENT HEIGHTS
// =============================================================================

export const componentHeights = {
  button: {
    sm: 32,
    md: 40,
    lg: 48,
  },
  input: {
    sm: 40,
    md: 48,
    lg: 56,
  },
  card: {
    sm: 280,
    md: 320,
    lg: 360,
  },
  header: 44,
  tabBar: 49,
} as const;

// =============================================================================
// LAYOUT RATIOS (Golden Ratio Based)
// =============================================================================

export const layoutRatios = {
  /** Content vs Sidebar (φ based) */
  contentSidebar: {
    content: '61.8%',
    sidebar: '38.2%',
  },
  /** Hero section */
  hero: {
    height: '61.8vh',
    minHeight: 500,
  },
  /** Card aspect ratios */
  card: {
    portrait: '1 / 1.618',
    landscape: '1.618 / 1',
    square: '1 / 1',
  },
} as const;

// =============================================================================
// CONTAINER MAX WIDTHS
// =============================================================================

export const containerWidths = {
  /** 600px */
  sm: 600,
  /** 900px */
  md: 900,
  /** 1200px */
  lg: 1200,
  /** 1536px */
  xl: 1536,
} as const;

// =============================================================================
// RESPONSIVE BREAKPOINTS
// =============================================================================

export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

// =============================================================================
// SAFE AREA (iOS Specific)
// =============================================================================

export const safeArea = {
  top: 47,
  bottom: 34,
  horizontal: 16,
  dynamicIsland: {
    width: 126,
    height: 37,
    borderRadius: 20,
  },
} as const;

// =============================================================================
// GAP PRESETS
// =============================================================================

export const gaps = {
  /** Grid gaps for cards */
  grid: {
    mobile: spacing.md,
    tablet: spacing.lg,
    desktop: spacing['2xl'],
  },
  /** Stack spacing */
  stack: {
    tight: spacing.xs,
    normal: spacing.sm,
    relaxed: spacing.lg,
  },
} as const;

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const spacingSystem = {
  base: spacing,
  touch: touchTargets,
  heights: componentHeights,
  ratios: layoutRatios,
  containers: containerWidths,
  breakpoints,
  safeArea,
  gaps,
  phi: PHI,
} as const;

export default spacingSystem;
