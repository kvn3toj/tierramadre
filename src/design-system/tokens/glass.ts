/**
 * Tierra Madre Design System - Glassmorphism Tokens
 *
 * iOS-style translucent materials with backdrop blur effects.
 * Creates depth and luxury feel for overlays and cards.
 */

// =============================================================================
// GLASS EFFECT INTERFACE
// =============================================================================

export interface GlassEffect {
  background: string;
  backdropFilter: string;
  WebkitBackdropFilter: string;
  border: string;
  boxShadow?: string;
}

// =============================================================================
// LIGHT GLASS VARIANTS
// =============================================================================

export const glassLight: Record<string, GlassEffect> = {
  /** Standard light glass */
  default: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px) saturate(180%)',
    WebkitBackdropFilter: 'blur(10px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
  },
  /** Frosted - more opaque */
  frosted: {
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 10px 15px rgba(0, 0, 0, 0.08)',
  },
  /** Ultra thin - very transparent */
  ultraThin: {
    background: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(8px) saturate(120%)',
    WebkitBackdropFilter: 'blur(8px) saturate(120%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  /** Regular material */
  regular: {
    background: 'rgba(255, 255, 255, 0.35)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
  },
} as const;

// =============================================================================
// DARK GLASS VARIANTS
// =============================================================================

export const glassDark: Record<string, GlassEffect> = {
  /** Standard dark glass — neutral gray (aligned with iOS/bottom nav) */
  default: {
    background: 'rgba(28, 28, 30, 0.7)',
    backdropFilter: 'blur(10px) saturate(180%)',
    WebkitBackdropFilter: 'blur(10px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
  },
  /** Frosted dark — neutral gray */
  frosted: {
    background: 'rgba(22, 22, 24, 0.85)',
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 10px 15px rgba(0, 0, 0, 0.3)',
  },
  /** Ultra thin dark — neutral gray */
  ultraThin: {
    background: 'rgba(28, 28, 30, 0.5)',
    backdropFilter: 'blur(8px) saturate(120%)',
    WebkitBackdropFilter: 'blur(8px) saturate(120%)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
  },
  /** Regular dark material — neutral gray */
  regular: {
    background: 'rgba(28, 28, 30, 0.6)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  },
} as const;

// =============================================================================
// EMERALD GLASS VARIANTS
// =============================================================================

export const glassEmerald: Record<string, GlassEffect> = {
  /** Light emerald tint */
  light: {
    background: 'rgba(0, 174, 122, 0.08)',
    backdropFilter: 'blur(12px) saturate(200%)',
    WebkitBackdropFilter: 'blur(12px) saturate(200%)',
    border: '1px solid rgba(0, 174, 122, 0.2)',
    boxShadow: '0 4px 6px rgba(0, 174, 122, 0.1)',
  },
  /** Dark emerald tint */
  dark: {
    background: 'rgba(0, 174, 122, 0.12)',
    backdropFilter: 'blur(12px) saturate(200%)',
    WebkitBackdropFilter: 'blur(12px) saturate(200%)',
    border: '1px solid rgba(0, 174, 122, 0.3)',
    boxShadow: '0 4px 6px rgba(0, 174, 122, 0.15)',
  },
  /** Vibrant emerald */
  vibrant: {
    background: 'rgba(0, 174, 122, 0.15)',
    backdropFilter: 'blur(16px) saturate(250%)',
    WebkitBackdropFilter: 'blur(16px) saturate(250%)',
    border: '1px solid rgba(0, 174, 122, 0.4)',
    boxShadow: '0 8px 16px rgba(0, 174, 122, 0.2)',
  },
} as const;

// =============================================================================
// GOLD GLASS VARIANTS
// =============================================================================

export const glassGold: Record<string, GlassEffect> = {
  /** Light gold tint */
  light: {
    background: 'rgba(212, 175, 55, 0.08)',
    backdropFilter: 'blur(12px) saturate(200%)',
    WebkitBackdropFilter: 'blur(12px) saturate(200%)',
    border: '1px solid rgba(212, 175, 55, 0.2)',
    boxShadow: '0 4px 6px rgba(212, 175, 55, 0.1)',
  },
  /** Dark gold tint */
  dark: {
    background: 'rgba(212, 175, 55, 0.12)',
    backdropFilter: 'blur(12px) saturate(200%)',
    WebkitBackdropFilter: 'blur(12px) saturate(200%)',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    boxShadow: '0 4px 6px rgba(212, 175, 55, 0.15)',
  },
  /** Premium gold */
  premium: {
    background: 'rgba(212, 175, 55, 0.15)',
    backdropFilter: 'blur(16px) saturate(250%)',
    WebkitBackdropFilter: 'blur(16px) saturate(250%)',
    border: '1px solid rgba(212, 175, 55, 0.4)',
    boxShadow: '0 8px 16px rgba(212, 175, 55, 0.2)',
  },
} as const;

// =============================================================================
// BLUR VALUES
// =============================================================================

export const blurValues = {
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
} as const;

// =============================================================================
// SATURATION VALUES
// =============================================================================

export const saturationValues = {
  low: '120%',
  normal: '150%',
  high: '180%',
  vibrant: '200%',
  intense: '250%',
} as const;

// =============================================================================
// UTILITY: Apply Glass Effect
// =============================================================================

export const applyGlass = (effect: GlassEffect): Record<string, string> => ({
  background: effect.background,
  backdropFilter: effect.backdropFilter,
  WebkitBackdropFilter: effect.WebkitBackdropFilter,
  border: effect.border,
  ...(effect.boxShadow && { boxShadow: effect.boxShadow }),
});

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const glass = {
  light: glassLight,
  dark: glassDark,
  emerald: glassEmerald,
  gold: glassGold,
  blur: blurValues,
  saturation: saturationValues,
  apply: applyGlass,
} as const;

export default glass;
