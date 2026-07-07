/**
 * Tierra Madre Design System - Glassmorphism Tokens (flattened)
 *
 * Quiet Emerald is flat — no backdrop blur. These variant maps keep the
 * legacy `GlassEffect` shape and names so consumers don't need to change
 * imports, but every entry now resolves to a solid, opaque-appropriate
 * surface with `backdropFilter: 'none'`.
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
  /** Standard light surface */
  default: {
    background: '#FFFFFF',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #E4E7E5',
    boxShadow: '0 18px 40px -24px rgba(13,30,24,0.30)',
  },
  /** Frosted - more opaque */
  frosted: {
    background: '#FFFFFF',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #E4E7E5',
    boxShadow: '0 18px 40px -24px rgba(13,30,24,0.30)',
  },
  /** Ultra thin - very transparent */
  ultraThin: {
    background: '#FFFFFF',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #E4E7E5',
    boxShadow: '0 18px 40px -24px rgba(13,30,24,0.30)',
  },
  /** Regular material */
  regular: {
    background: '#FFFFFF',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #E4E7E5',
    boxShadow: '0 18px 40px -24px rgba(13,30,24,0.30)',
  },
} as const;

// =============================================================================
// DARK GLASS VARIANTS
// =============================================================================

export const glassDark: Record<string, GlassEffect> = {
  /** Standard dark surface — neutral gray (aligned with iOS/bottom nav) */
  default: {
    background: '#15191A',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #272C2B',
    boxShadow: '0 20px 46px -26px rgba(0,0,0,0.8)',
  },
  /** Frosted dark — neutral gray */
  frosted: {
    background: '#15191A',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #272C2B',
    boxShadow: '0 20px 46px -26px rgba(0,0,0,0.8)',
  },
  /** Ultra thin dark — neutral gray */
  ultraThin: {
    background: '#15191A',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #272C2B',
    boxShadow: '0 20px 46px -26px rgba(0,0,0,0.8)',
  },
  /** Regular dark material — neutral gray */
  regular: {
    background: '#15191A',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #272C2B',
    boxShadow: '0 20px 46px -26px rgba(0,0,0,0.8)',
  },
} as const;

// =============================================================================
// EMERALD GLASS VARIANTS
// =============================================================================

export const glassEmerald: Record<string, GlassEffect> = {
  /** Light emerald tint */
  light: {
    background: 'rgba(0,175,132,0.08)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid rgba(0,175,132,0.20)',
    boxShadow: '0 4px 6px rgba(0, 175, 132, 0.1)',
  },
  /** Dark emerald tint */
  dark: {
    background: 'rgba(0,175,132,0.12)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid rgba(0,175,132,0.30)',
    boxShadow: '0 4px 6px rgba(0, 175, 132, 0.15)',
  },
  /** Vibrant emerald */
  vibrant: {
    background: 'rgba(0,175,132,0.15)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid rgba(0,175,132,0.40)',
    boxShadow: '0 8px 16px rgba(0, 175, 132, 0.2)',
  },
} as const;

// =============================================================================
// GRAPHITE GLASS VARIANTS (formerly gold — Quiet Emerald drops gold accents)
// =============================================================================

export const glassGold: Record<string, GlassEffect> = {
  /** Light graphite tint */
  light: {
    background: 'rgba(140,146,143,0.08)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid rgba(140,146,143,0.20)',
    boxShadow: '0 4px 6px rgba(13,30,24,0.1)',
  },
  /** Dark graphite tint */
  dark: {
    background: 'rgba(140,146,143,0.12)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid rgba(140,146,143,0.30)',
    boxShadow: '0 4px 6px rgba(13,30,24,0.15)',
  },
  /** Premium graphite */
  premium: {
    background: 'rgba(140,146,143,0.15)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid rgba(140,146,143,0.40)',
    boxShadow: '0 8px 16px rgba(13,30,24,0.2)',
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
