/**
 * Primitive Spacing Tokens
 * "Emerald iOS" Design System
 *
 * iOS 8-point grid system for consistent spatial rhythm.
 * All spacing values are multiples of 8px (base unit).
 *
 * Reference: https://developer.apple.com/design/human-interface-guidelines/layout
 */

/**
 * Base Grid Unit
 * iOS uses 8pt as the foundational spacing unit
 */
const BASE_UNIT = 8;

/**
 * Core Spacing Scale
 * Multiples of 8pt grid with semantic names
 */
export const spacing = {
  /**
   * 0px - No spacing
   */
  none: '0px',

  /**
   * 4px - Half unit (0.5x)
   * Use for micro-adjustments and tight spacing
   */
  xxs: `${BASE_UNIT * 0.5}px`,

  /**
   * 8px - Base unit (1x)
   * Standard spacing between related elements
   */
  xs: `${BASE_UNIT}px`,

  /**
   * 12px - Small (1.5x)
   * Comfortable spacing for grouped content
   */
  sm: `${BASE_UNIT * 1.5}px`,

  /**
   * 16px - Medium (2x)
   * iOS standard padding for cards and containers
   */
  md: `${BASE_UNIT * 2}px`,

  /**
   * 20px - Large (2.5x)
   * Generous spacing for sections
   */
  lg: `${BASE_UNIT * 2.5}px`,

  /**
   * 24px - Extra large (3x)
   * Major section spacing
   */
  xl: `${BASE_UNIT * 3}px`,

  /**
   * 32px - 2X Large (4x)
   * Page-level spacing
   */
  xxl: `${BASE_UNIT * 4}px`,

  /**
   * 48px - 3X Large (6x)
   * Hero section spacing
   */
  xxxl: `${BASE_UNIT * 6}px`,

  /**
   * 64px - 4X Large (8x)
   * Maximum spacing for major separations
   */
  xxxxl: `${BASE_UNIT * 8}px`,
} as const;

/**
 * iOS-Specific Dimensions
 * Standard iOS measurements for interactive elements
 */
export const iosDimensions = {
  /**
   * 44px - Minimum touch target (iOS HIG requirement)
   * All tappable elements should be at least this size
   */
  touchTarget: '44px',

  /**
   * 44px - iOS list item height
   * Standard height for list rows
   */
  listItemHeight: '44px',

  /**
   * 44px - iOS navigation bar height
   * Standard top navigation bar
   */
  navBarHeight: '44px',

  /**
   * 49px - iOS tab bar height
   * Standard bottom tab bar
   */
  tabBarHeight: '49px',

  /**
   * 56px - Large button height
   * For prominent CTAs
   */
  largeButtonHeight: '56px',

  /**
   * 50px - Medium button height
   * Standard button size
   */
  mediumButtonHeight: '50px',

  /**
   * 36px - Small button height
   * Compact button variant
   */
  smallButtonHeight: '36px',

  /**
   * 52px - Text field height (mobile)
   * Comfortable thumb-friendly input height
   */
  textFieldHeightMobile: '52px',

  /**
   * 40px - Text field height (desktop)
   * Standard desktop input height
   */
  textFieldHeightDesktop: '40px',

  /**
   * 10px - iOS standard border radius
   * Used for buttons, cards, inputs
   */
  borderRadiusStandard: '10px',

  /**
   * 12px - Large border radius
   * Used for cards and modals
   */
  borderRadiusLarge: '12px',

  /**
   * 16px - Extra large border radius
   * Used for bottom sheets and large containers
   */
  borderRadiusXL: '16px',
} as const;

/**
 * Safe Area Insets
 * iOS device-specific safe areas (notch, home indicator)
 */
export const safeAreaInsets = {
  /**
   * Top safe area (status bar, notch)
   * Dynamic value from device
   */
  top: 'env(safe-area-inset-top)',

  /**
   * Right safe area (rounded corners)
   */
  right: 'env(safe-area-inset-right)',

  /**
   * Bottom safe area (home indicator)
   */
  bottom: 'env(safe-area-inset-bottom)',

  /**
   * Left safe area (rounded corners)
   */
  left: 'env(safe-area-inset-left)',
} as const;

/**
 * Layout Container Widths
 * Responsive container max-widths
 */
export const containerWidths = {
  /**
   * Mobile container (full width with padding)
   */
  mobile: {
    maxWidth: '428px',      // iPhone 14 Pro Max width
    padding: spacing.md,    // 16px edge padding
  },

  /**
   * Tablet container
   */
  tablet: {
    maxWidth: '768px',      // iPad Mini width
    padding: spacing.lg,    // 24px edge padding
  },

  /**
   * Desktop container
   */
  desktop: {
    maxWidth: '1024px',     // iPad Pro width
    padding: spacing.xl,    // 32px edge padding
  },
} as const;

/**
 * Grid Systems
 * Column-based layouts
 */
export const gridSystems = {
  /**
   * Card grid gap
   */
  cardGap: {
    mobile: spacing.sm,     // 12px on mobile
    tablet: spacing.md,     // 16px on tablet
    desktop: spacing.lg,    // 24px on desktop
  },

  /**
   * Minimum card width for auto-fit grids
   */
  minCardWidth: '280px',
} as const;

/**
 * Combined Spacing System
 */
export const spacingSystem = {
  spacing,
  dimensions: iosDimensions,
  safeArea: safeAreaInsets,
  containers: containerWidths,
  grid: gridSystems,
} as const;

export type SpacingSystem = typeof spacingSystem;
