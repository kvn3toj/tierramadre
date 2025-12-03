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
  50: '#FFFBEB',   // Gold whisper
  100: '#FEF3C7',  // Gold mist
  200: '#FDE68A',  // Gold light
  300: '#F5D76E',  // Gold shimmer
  400: '#FBBF24',  // Gold bright
  500: '#D4AF37',  // Gold primary - Classic gold
  600: '#B8960F',  // Gold deep
  700: '#92730B',  // Gold rich
  800: '#6B5408',  // Gold dark
  900: '#422F04',  // Gold darkest
} as const;

/**
 * Document Colors
 * Core colors for certificate and quotation documents
 */
export const documentColors = {
  // Primary brand colors from primitives
  emerald: {
    primary: primitiveColors.emerald[500],     // #00AE7A
    dark: primitiveColors.emerald[600],        // #008C62
    light: primitiveColors.emerald[300],       // #66FFCF
    deep: primitiveColors.emerald[700],        // #006B4B
    subtle: primitiveColors.emerald[50],       // #E6FFF7
  },

  // Gold accents for premium documents
  gold: {
    primary: goldColors[500],                  // #D4AF37
    light: goldColors[300],                    // #F5D76E
    bright: goldColors[400],                   // #FBBF24
    deep: goldColors[600],                     // #B8960F
    subtle: goldColors[100],                   // #FEF3C7
  },

  // Document backgrounds (light theme)
  background: {
    container: primitiveColors.surfaces.light.secondary,  // #F2F2F7 - iOS light gray
    surface: primitiveColors.surfaces.light.primary,      // #FFFFFF - Pure white
    paper: '#FAF9F6',                                     // Cream/paper texture
    elevated: primitiveColors.surfaces.light.tertiary,    // #FAFAFA - Subtle off-white
  },

  // Text colors for documents
  text: {
    primary: '#1C1C1E',                        // Near black
    secondary: primitiveColors.metallic.silver[500],  // #6B7A8A - Gray
    tertiary: primitiveColors.metallic.silver[400],   // #8A99A8 - Light gray
    muted: primitiveColors.metallic.silver[300],      // #B4BFC9 - Very light
  },

  // Border colors
  border: {
    default: primitiveColors.metallic.silver[200],    // #D1D9E0 - Light border
    subtle: '#E5E7EB',                                // Very light border
    strong: primitiveColors.metallic.silver[300],     // #B4BFC9 - Visible border
    gold: goldColors[500],                            // #D4AF37 - Gold border
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
  minSize: '0.75rem',      // 12px minimum for labels
  bodySize: '0.875rem',    // 14px for body text
  titleSize: '1.25rem',    // 20px for section titles
  headingSize: '1.5rem',   // 24px for main headings
} as const;

/**
 * Logo Constants
 * Standardized logo dimensions
 */
export const logoConfig = {
  path: '/logo-tierra-madre.png',
  certificate: { width: 60, height: 60 },
  document: { width: 48, height: 48 },
  small: { width: 32, height: 32 },
  altText: 'Tierra Madre',
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
