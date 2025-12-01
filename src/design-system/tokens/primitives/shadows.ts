/**
 * Primitive Shadow Tokens
 * "Emerald iOS" Design System
 *
 * iOS elevation system using subtle shadows. iOS shadows are more
 * refined than Material Design - softer, more organic, less pronounced.
 *
 * Shadows adapt to theme: subtle in light mode, deeper in dark mode.
 */

/**
 * Light Theme Shadows
 * Softer, more transparent shadows for light backgrounds
 */
export const lightShadows = {
  /**
   * None - No shadow
   */
  none: 'none',

  /**
   * Extra Small - Barely perceptible
   * Use for subtle hover states
   */
  xs: '0 1px 2px rgba(15, 23, 42, 0.04)',

  /**
   * Small - Gentle elevation
   * Default card shadow
   */
  sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',

  /**
   * Medium - Standard elevation
   * Floating elements (buttons, chips)
   */
  md: '0 4px 6px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',

  /**
   * Large - Prominent elevation
   * Modals, dialogs, popovers
   */
  lg: '0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.04)',

  /**
   * Extra Large - Maximum elevation
   * Overlays, floating action buttons
   */
  xl: '0 20px 25px rgba(15, 23, 42, 0.1), 0 8px 10px rgba(15, 23, 42, 0.04)',

  /**
   * 2X Large - Hero elements
   */
  xxl: '0 25px 50px rgba(15, 23, 42, 0.15)',
} as const;

/**
 * Dark Theme Shadows
 * Deeper, more pronounced shadows for dark backgrounds
 */
export const darkShadows = {
  /**
   * None - No shadow
   */
  none: 'none',

  /**
   * Extra Small
   */
  xs: '0 1px 2px rgba(0, 0, 0, 0.2)',

  /**
   * Small
   */
  sm: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',

  /**
   * Medium
   */
  md: '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',

  /**
   * Large
   */
  lg: '0 10px 15px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.2)',

  /**
   * Extra Large
   */
  xl: '0 20px 25px rgba(0, 0, 0, 0.5), 0 8px 10px rgba(0, 0, 0, 0.2)',

  /**
   * 2X Large
   */
  xxl: '0 25px 50px rgba(0, 0, 0, 0.6)',
} as const;

/**
 * Colored Shadows
 * Brand-specific shadow effects
 */
export const coloredShadows = {
  /**
   * Emerald Glow - Brand accent shadow
   * Use for primary CTAs, featured elements
   */
  emeraldGlow: {
    light: '0 4px 14px rgba(0, 174, 122, 0.25)',
    dark: '0 4px 20px rgba(0, 174, 122, 0.3)',
  },

  /**
   * Silver Shimmer - Metallic highlight
   * Use for premium elements
   */
  silverShimmer: {
    light: '0 2px 8px rgba(107, 122, 138, 0.15)',
    dark: '0 2px 8px rgba(107, 122, 138, 0.25)',
  },
} as const;

/**
 * Inner Shadows
 * For inset effects (pressed states, wells)
 */
export const innerShadows = {
  /**
   * Light inset
   */
  light: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',

  /**
   * Medium inset
   */
  medium: 'inset 0 2px 6px rgba(0, 0, 0, 0.1)',

  /**
   * Dark inset
   */
  dark: 'inset 0 2px 8px rgba(0, 0, 0, 0.15)',
} as const;

/**
 * Component-Specific Shadows
 * Pre-configured shadows for common components
 */
export const componentShadows = {
  /**
   * Card Shadows
   */
  card: {
    resting: {
      light: lightShadows.sm,
      dark: darkShadows.sm,
    },
    hover: {
      light: lightShadows.md,
      dark: darkShadows.md,
    },
    active: {
      light: lightShadows.xs,
      dark: darkShadows.xs,
    },
  },

  /**
   * Button Shadows
   */
  button: {
    primary: {
      light: coloredShadows.emeraldGlow.light,
      dark: coloredShadows.emeraldGlow.dark,
    },
    secondary: {
      light: lightShadows.sm,
      dark: darkShadows.sm,
    },
    pressed: {
      light: innerShadows.light,
      dark: innerShadows.medium,
    },
  },

  /**
   * Modal Shadows
   */
  modal: {
    light: lightShadows.xxl,
    dark: darkShadows.xxl,
  },

  /**
   * Dropdown / Popover
   */
  dropdown: {
    light: lightShadows.lg,
    dark: darkShadows.lg,
  },

  /**
   * Floating Action Button
   */
  fab: {
    light: lightShadows.xl,
    dark: darkShadows.xl,
  },
} as const;

/**
 * Text Shadows
 * For text contrast and legibility
 */
export const textShadows = {
  /**
   * Subtle text shadow for light text on dark backgrounds
   */
  light: '0 1px 2px rgba(0, 0, 0, 0.5)',

  /**
   * Strong text shadow for readability
   */
  strong: '0 2px 4px rgba(0, 0, 0, 0.8)',

  /**
   * Glow effect for emphasis
   */
  glow: '0 0 8px rgba(255, 255, 255, 0.8)',

  /**
   * Emerald glow for brand text
   */
  emeraldGlow: '0 0 12px rgba(0, 174, 122, 0.6)',
} as const;

/**
 * Combined Shadow System
 */
export const shadows = {
  light: lightShadows,
  dark: darkShadows,
  colored: coloredShadows,
  inner: innerShadows,
  component: componentShadows,
  text: textShadows,
} as const;

export type Shadows = typeof shadows;
