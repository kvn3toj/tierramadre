/**
 * Semantic Document Tokens
 * "Emerald iOS" Design System
 *
 * Purpose-driven color tokens for certificates, quotations, and formal documents.
 * Uses primitive colors plus document-specific accents like gold.
 */

import { primitiveColors } from '../primitives/colors';

/**
 * Gold Palette - Premium document accents
 * For certificates, seals, and premium indicators
 */
export const goldColors = {
  50: '#FFFBEB', // Gold whisper
  100: '#FEF3C7', // Gold mist
  200: '#FDE68A', // Gold light
  300: '#F5D76E', // Gold shimmer
  400: '#FBBF24', // Gold bright
  500: '#D4AF37', // Gold primary - Classic gold
  600: '#B8960F', // Gold deep
  700: '#92730B', // Gold rich
  800: '#6B5408', // Gold dark
  900: '#422F04', // Gold darkest
} as const;

/**
 * Document Colors
 * Core colors for certificate and quotation documents
 */
export const documentColors = {
  // Primary brand colors from primitives
  emerald: {
    primary: primitiveColors.emerald[500], // #00C992
    dark: primitiveColors.emerald[600], // #008C62
    light: primitiveColors.emerald[300], // #66FFCF
    deep: primitiveColors.emerald[700], // #006B4B
    subtle: primitiveColors.emerald[50], // #E6FFF7
  },

  // Gold accents for premium documents
  gold: {
    primary: goldColors[500], // #D4AF37
    light: goldColors[300], // #F5D76E
    bright: goldColors[400], // #FBBF24
    deep: goldColors[600], // #B8960F
    subtle: goldColors[100], // #FEF3C7
  },

  // Document backgrounds (light theme)
  background: {
    container: primitiveColors.surfaces.light.secondary, // #F2F2F7 - iOS light gray
    surface: primitiveColors.surfaces.light.primary, // #FFFFFF - Pure white
    paper: '#FAF9F6', // Cream/paper texture
    elevated: primitiveColors.surfaces.light.tertiary, // #FAFAFA - Subtle off-white
  },

  // Text colors for documents
  text: {
    primary: '#1C1C1E', // Near black
    secondary: primitiveColors.metallic.silver[500], // #6B7A8A - Gray
    tertiary: primitiveColors.metallic.silver[400], // #8A99A8 - Light gray
    muted: primitiveColors.metallic.silver[300], // #B4BFC9 - Very light
  },

  // Border colors
  border: {
    default: primitiveColors.metallic.silver[200], // #D1D9E0 - Light border
    subtle: '#E5E7EB', // Very light border
    strong: primitiveColors.metallic.silver[300], // #B4BFC9 - Visible border
    gold: goldColors[500], // #D4AF37 - Gold border
  },
} as const;

/**
 * Document Shadows
 * Consistent shadow styles for document elements
 */
export const documentShadows = {
  paper: '0 4px 20px rgba(0, 0, 0, 0.08)',
  elevated: '0 8px 30px rgba(0, 0, 0, 0.12)',
  goldGlow: '0 0 0 1px rgba(212, 175, 55, 0.3)',
} as const;

/**
 * Document Typography
 * Min sizes and scales for readability
 */
export const documentTypography = {
  minSize: '0.75rem', // 12px minimum for labels
  bodySize: '0.875rem', // 14px for body text
  titleSize: '1.25rem', // 20px for section titles
  headingSize: '1.5rem', // 24px for main headings
} as const;

/**
 * Logo Constants
 * Standardized logo dimensions
 *
 * Two brand assets, two legibility floors — pick by the space available:
 *
 * - `mark`   — the bare line-art symbol, square (1:1). Legible down to ~24px.
 *              Use for corner watermarks, badges, QR centres, tight headers.
 * - `lockup` — the manual's "auxiliar" (vertical) lockup: mark above the
 *              "tierra mädre" wordmark above "ESMERALDAS CON ADN DE PAZ",
 *              ratio 1.877:1. The slogan band is only 6.7% of the lockup's
 *              height, so it needs ≥80px on screen (≥5px slogan) or ≥24mm in
 *              print (≥1.5mm slogan). Below that the slogan turns to mush and
 *              the `mark` is the correct choice.
 * - `lockupWide` — the manual's "principal" (horizontal) lockup, ≈4.30:1.
 *              For wide surfaces (headers, email, OG). Too wide for the
 *              centred, portrait-ish document slots below.
 *
 * All are 100% flat brand colour, so `filter: brightness(0) invert(1)` still
 * produces a clean white version of any of them.
 */
export const logoConfig = {
  /** Bare square symbol — emerald #00C992 */
  mark: '/logo-tierra-madre.png',
  /** Vertical lockup with wordmark + slogan — emerald #00C992, 1280×682 */
  lockup: '/logo-brand.png',
  /** Vertical lockup, pure white — for dark backgrounds. Same geometry as `lockup`. */
  lockupWhite: '/logo-white.png',
  /** Horizontal "principal" lockup — emerald #00C992, 396×92 */
  lockupWide: '/images/logo-horizontal-green.png',

  /** @deprecated Use `mark` or `lockup` explicitly. Kept for compatibility. */
  path: '/logo-tierra-madre.png',

  /** Aspect ratios (width ÷ height) */
  ratio: { mark: 1, lockup: 1280 / 682, lockupWide: 396 / 92 },

  /** Minimum size at which the lockup's slogan stays legible */
  lockupMin: { screenPx: 80, printMm: 24 },

  // Square slots — sized for `mark`
  certificate: { width: 60, height: 60 },
  document: { width: 48, height: 48 },
  small: { width: 32, height: 32 },

  // Lockup slots — height-driven, width follows the 1.877 ratio
  lockupHero: { width: 263, height: 140 },
  lockupHeader: { width: 169, height: 90 },

  altText: 'Tierra Mädre',
} as const;

/**
 * Combined Document Tokens
 */
export const document = {
  colors: documentColors,
  gold: goldColors,
  shadows: documentShadows,
  typography: documentTypography,
  logo: logoConfig,
} as const;

export type Document = typeof document;
