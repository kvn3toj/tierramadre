/**
 * Legacy Design System Tokens
 *
 * Brand palettes, semantic tokens (light/dark), and component styles
 * migrated from the legacy monolithic design-system.ts.
 *
 * These preserve the exact color values used across ~58 consumer files.
 * Over time, consumers should migrate to the canonical named tokens
 * (emeraldCore, goldAccent, surfacesLight, surfacesDark, etc.)
 */

import { alpha } from '@mui/material/styles';
import { defaultShadows } from './shadows';
import { cssTransition } from './motion';

// =============================================================================
// BRAND COLOR PALETTES (Immutable)
// =============================================================================

export const brand = {
  emerald: {
    50: '#E6F7F2',
    100: '#B3E8D9',
    200: '#80D9C0',
    300: '#4DCAA7',
    400: '#26BE93',
    500: '#00AE7A',
    600: '#009A6C',
    700: '#008A61',
    800: '#006B4D',
    900: '#004D38',
  },
  gold: {
    50: '#FDF8E8',
    100: '#F9ECC5',
    200: '#F5D76E',
    300: '#EDCB4F',
    400: '#E4BE30',
    500: '#D4AF37',
    600: '#B8962F',
    700: '#9C7D27',
    800: '#80651F',
    900: '#644D17',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

// =============================================================================
// SEMANTIC TOKENS (Light Mode)
// =============================================================================

export const lightTokens = {
  background: {
    app: '#FAFAFA',
    page: '#F5F7F9',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    muted: '#F1F5F9',
    inverse: brand.slate[900],
  },
  text: {
    primary: brand.slate[900],
    secondary: brand.slate[600],
    muted: brand.slate[400],
    inverse: '#FFFFFF',
    brand: brand.emerald[500],
    gold: brand.gold[600],
  },
  border: {
    default: brand.slate[200],
    light: brand.slate[100],
    focus: brand.emerald[500],
    hover: brand.slate[300],
    card: brand.slate[200],
  },
  interactive: {
    primary: brand.emerald[500],
    primaryHover: brand.emerald[600],
    primaryActive: brand.emerald[700],
    secondary: brand.gold[500],
    secondaryHover: brand.gold[600],
  },
  status: {
    success: '#22C55E',
    successBg: alpha('#22C55E', 0.1),
    warning: '#F59E0B',
    warningBg: alpha('#F59E0B', 0.1),
    error: '#EF4444',
    errorBg: alpha('#EF4444', 0.1),
    info: brand.emerald[500],
    infoBg: alpha(brand.emerald[500], 0.1),
  },
} as const;

// =============================================================================
// SEMANTIC TOKENS (Dark Mode)
// =============================================================================

export const darkTokens = {
  background: {
    app: '#0A0A0A',
    page: '#0F0F0F',
    surface: '#1A1A1A',
    elevated: '#242424',
    muted: '#141414',
    inverse: '#FFFFFF',
  },
  text: {
    primary: '#F8FAFC',
    secondary: brand.slate[400],
    muted: brand.slate[500],
    inverse: brand.slate[900],
    brand: brand.emerald[400],
    gold: brand.gold[400],
  },
  border: {
    default: alpha('#FFFFFF', 0.12),
    light: alpha('#FFFFFF', 0.06),
    focus: brand.emerald[400],
    hover: alpha('#FFFFFF', 0.2),
    card: alpha('#FFFFFF', 0.08),
  },
  interactive: {
    primary: brand.emerald[400],
    primaryHover: brand.emerald[300],
    primaryActive: brand.emerald[500],
    secondary: brand.gold[400],
    secondaryHover: brand.gold[300],
  },
  status: {
    success: '#4ADE80',
    successBg: alpha('#4ADE80', 0.15),
    warning: '#FBBF24',
    warningBg: alpha('#FBBF24', 0.15),
    error: '#F87171',
    errorBg: alpha('#F87171', 0.15),
    info: brand.emerald[400],
    infoBg: alpha(brand.emerald[400], 0.15),
  },
} as const;

// =============================================================================
// LEGACY GRADIENTS (using brand palette values)
// =============================================================================

export const gradients = {
  header: `linear-gradient(135deg, ${brand.slate[900]} 0%, ${alpha(brand.emerald[500], 0.15)} 100%)`,
  headerDark: `linear-gradient(135deg, #0A0A0A 0%, ${alpha(brand.emerald[500], 0.1)} 100%)`,
  emerald: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[700]} 100%)`,
  emeraldSoft: `linear-gradient(135deg, ${brand.emerald[400]} 0%, ${brand.emerald[600]} 100%)`,
  gold: `linear-gradient(135deg, ${brand.gold[400]} 0%, ${brand.gold[600]} 100%)`,
  goldShimmer: `linear-gradient(135deg, ${brand.gold[400]} 0%, ${brand.gold[300]} 50%, ${brand.gold[500]} 100%)`,
  surfaceLight: `linear-gradient(180deg, #FFFFFF 0%, ${brand.slate[50]} 100%)`,
  surfaceDark: `linear-gradient(180deg, #1A1A1A 0%, #141414 100%)`,
  overlayLight: `radial-gradient(circle at 100% 0%, ${alpha(brand.emerald[500], 0.08)} 0%, transparent 60%)`,
  overlayDark: `radial-gradient(circle at 100% 0%, ${alpha(brand.emerald[400], 0.12)} 0%, transparent 60%)`,
} as const;

// =============================================================================
// LEGACY TYPOGRAPHY
// =============================================================================

export const legacyTypography = {
  fontFamily: {
    display: '"Libre Baskerville", Georgia, serif',
    body: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", Monaco, Consolas, monospace',
  },
  size: {
    xs: '0.6875rem',
    sm: '0.75rem',
    base: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0',
    wide: '0.01em',
    wider: '0.05em',
    widest: '0.12em',
  },
} as const;

// =============================================================================
// LEGACY HELPER FUNCTIONS
// =============================================================================

export const getTokens = (mode: 'light' | 'dark') => {
  return mode === 'light' ? lightTokens : darkTokens;
};

// =============================================================================
// LEGACY STUDIO EXPORTS
// =============================================================================

export const studioColors = {
  emerald: brand.emerald[500],
  emeraldDark: brand.emerald[700],
  emeraldLight: brand.emerald[400],
  emeraldDeep: brand.emerald[800],
  gold: brand.gold[500],
  goldLight: brand.gold[200],
  surface: lightTokens.background.surface,
  surfaceElevated: lightTokens.background.elevated,
  surfaceMuted: lightTokens.background.muted,
  dark: brand.slate[900],
  darkSoft: brand.slate[800],
  textPrimary: lightTokens.text.primary,
  textSecondary: lightTokens.text.secondary,
  textMuted: lightTokens.text.muted,
  border: lightTokens.border.default,
  borderLight: lightTokens.border.light,
};

export const studioGradients = gradients;

export const studioShadows = {
  ...defaultShadows,
  emerald: `0 4px 14px ${alpha(brand.emerald[500], 0.25)}`,
  emeraldLg: `0 8px 24px ${alpha(brand.emerald[500], 0.3)}`,
  gold: `0 4px 14px ${alpha(brand.gold[500], 0.25)}`,
};

// =============================================================================
// LEGACY ANIMATION TOKENS
// =============================================================================

export const animation = {
  easing: {
    default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    in: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    out: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    inOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    spring: 'cubic-bezier(0.68, -0.15, 0.265, 1.35)',
    springGentle: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
  },
  transition: {
    fast: cssTransition.fast,
    default: cssTransition.default,
    slow: cssTransition.slow,
    spring: cssTransition.spring,
    colors: cssTransition.colors,
  },
} as const;

// =============================================================================
// LEGACY DISABLED BUTTON STYLES
// =============================================================================

export const disabledButton = {
  contained: {
    opacity: 0.45,
    pointerEvents: 'none' as const,
  },
  outlined: {
    opacity: 0.4,
    pointerEvents: 'none' as const,
  },
} as const;
