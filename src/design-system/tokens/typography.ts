/**
 * Tierra Madre Design System - Typography Tokens
 *
 * iOS Dynamic Type scale with SF Pro Display font family.
 * Harmonic progression based on musical intervals.
 */

// =============================================================================
// FONT FAMILIES
// =============================================================================

export const fontFamilies = {
  /** System font stack (iOS-style) */
  system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif',
  /** Brand font for headings */
  brand: '"Libre Baskerville", Georgia, serif',
  /** Editorial serif for printed/document contexts (e.g. Kardex). Alias of brand. */
  serif: '"Libre Baskerville", Georgia, serif',
  /** Monospace for prices and data */
  mono: '"SF Mono", "Fira Code", "Monaco", Consolas, monospace',
} as const;

// =============================================================================
// FONT SIZES (iOS Dynamic Type Scale)
// =============================================================================

export const fontSizes = {
  /** 11px - Caption 2 */
  xs: '0.6875rem',
  /** 12px - Caption 1 */
  sm: '0.75rem',
  /** 13px - Footnote */
  md: '0.8125rem',
  /** 15px - Subheadline */
  lg: '0.9375rem',
  /** 16px - Callout */
  xl: '1rem',
  /** 17px - Body/Headline */
  '2xl': '1.0625rem',
  /** 20px - Title 3 */
  '3xl': '1.25rem',
  /** 22px - Title 2 */
  '4xl': '1.375rem',
  /** 28px - Title 1 */
  '5xl': '1.75rem',
  /** 34px - Large Title */
  '6xl': '2.125rem',
  /** 40px - Display */
  '7xl': '2.5rem',
  /** 48px - Hero */
  '8xl': '3rem',
} as const;

// =============================================================================
// FONT WEIGHTS
// =============================================================================

export const fontWeights = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// =============================================================================
// LINE HEIGHTS (φ-based)
// =============================================================================

export const lineHeights = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.618, // Golden ratio
  loose: 1.8,
} as const;

// =============================================================================
// LETTER SPACING
// =============================================================================

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// =============================================================================
// iOS TYPOGRAPHY PRESETS
// =============================================================================

export const typography = {
  /** 34px / 700 / 1.2 - Large titles */
  largeTitle: {
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
    fontFamily: fontFamilies.brand,
  },
  /** 28px / 700 / 1.25 - Page titles */
  title1: {
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.bold,
    lineHeight: 1.25,
    letterSpacing: letterSpacing.tight,
    fontFamily: fontFamilies.brand,
  },
  /** 22px / 700 / 1.3 - Section titles */
  title2: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.snug,
    letterSpacing: '-0.01em',
    fontFamily: fontFamilies.brand,
  },
  /** 20px / 600 / 1.35 - Subsection titles */
  title3: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: 1.35,
    letterSpacing: '-0.01em',
    fontFamily: fontFamilies.system,
  },
  /** 17px / 600 / 1.4 - Important text */
  headline: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
    fontFamily: fontFamilies.system,
  },
  /** 17px / 400 / 1.5 - Main body text */
  body: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: '-0.01em',
    fontFamily: fontFamilies.system,
  },
  /** 16px / 400 / 1.4 - Secondary text */
  callout: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.normal,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
    fontFamily: fontFamilies.system,
  },
  /** 15px / 400 / 1.4 - Subheadlines */
  subheadline: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.normal,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
    fontFamily: fontFamilies.system,
  },
  /** 13px / 400 / 1.4 - Footnotes */
  footnote: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.normal,
    lineHeight: 1.4,
    letterSpacing: '-0.005em',
    fontFamily: fontFamilies.system,
  },
  /** 12px / 400 / 1.35 - Captions */
  caption1: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: 1.35,
    letterSpacing: '0',
    fontFamily: fontFamilies.system,
  },
  /** 11px / 400 / 1.3 - Small captions */
  caption2: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.snug,
    letterSpacing: '0.005em',
    fontFamily: fontFamilies.system,
  },
  /** Uppercase labels */
  overline: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: 1.5,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
    fontFamily: fontFamilies.system,
  },
  /** Prices and numeric data */
  price: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: '-0.02em',
    fontFamily: fontFamilies.mono,
    fontVariantNumeric: 'tabular-nums',
  },
  /** Button text */
  button: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
    textTransform: 'none' as const,
    fontFamily: fontFamilies.system,
  },
} as const;

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const typographySystem = {
  families: fontFamilies,
  sizes: fontSizes,
  weights: fontWeights,
  lineHeights,
  letterSpacing,
  presets: typography,
} as const;

export default typographySystem;
