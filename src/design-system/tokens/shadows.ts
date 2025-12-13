/**
 * Tierra Madre Design System - Shadow Tokens
 *
 * iOS-style soft, diffused shadows with emerald-tinted variants.
 * Follows Fibonacci sequence for depth progression.
 */

// Base color values for rgba
const BLACK = '0, 0, 0';
const EMERALD = '0, 174, 122';
const GOLD = '212, 175, 55';

// =============================================================================
// DEFAULT SHADOWS (Neutral)
// =============================================================================

export const defaultShadows = {
  none: 'none',
  xs: `0 1px 2px rgba(${BLACK}, 0.05)`,
  sm: `0 1px 3px rgba(${BLACK}, 0.1), 0 1px 2px rgba(${BLACK}, 0.06)`,
  md: `0 4px 6px rgba(${BLACK}, 0.07), 0 2px 4px rgba(${BLACK}, 0.05)`,
  lg: `0 10px 15px rgba(${BLACK}, 0.08), 0 4px 6px rgba(${BLACK}, 0.05)`,
  xl: `0 20px 25px rgba(${BLACK}, 0.1), 0 10px 10px rgba(${BLACK}, 0.04)`,
  '2xl': `0 25px 50px rgba(${BLACK}, 0.12)`,
  /** iOS-style floating element */
  floating: `0 10px 40px rgba(${BLACK}, 0.2)`,
  /** Inset shadow for pressed states */
  inset: `inset 0 2px 4px rgba(${BLACK}, 0.1)`,
} as const;

// =============================================================================
// EMERALD-TINTED SHADOWS
// =============================================================================

export const emeraldShadows = {
  none: 'none',
  xs: `0 1px 2px rgba(${EMERALD}, 0.1)`,
  sm: `0 1px 3px rgba(${EMERALD}, 0.15), 0 1px 2px rgba(${EMERALD}, 0.1)`,
  md: `0 4px 6px rgba(${EMERALD}, 0.12), 0 2px 4px rgba(${EMERALD}, 0.08)`,
  lg: `0 10px 15px rgba(${EMERALD}, 0.15), 0 4px 6px rgba(${EMERALD}, 0.1)`,
  xl: `0 20px 25px rgba(${EMERALD}, 0.2), 0 10px 10px rgba(${EMERALD}, 0.1)`,
  '2xl': `0 25px 50px rgba(${EMERALD}, 0.25)`,
  /** Glow effect for hover states */
  glow: `0 0 20px rgba(${EMERALD}, 0.4)`,
  /** Primary button shadow */
  primary: `0 4px 14px rgba(${EMERALD}, 0.4)`,
} as const;

// =============================================================================
// GOLD-TINTED SHADOWS
// =============================================================================

export const goldShadows = {
  none: 'none',
  xs: `0 1px 2px rgba(${GOLD}, 0.1)`,
  sm: `0 1px 3px rgba(${GOLD}, 0.15), 0 1px 2px rgba(${GOLD}, 0.1)`,
  md: `0 4px 6px rgba(${GOLD}, 0.12), 0 2px 4px rgba(${GOLD}, 0.08)`,
  lg: `0 10px 15px rgba(${GOLD}, 0.15), 0 4px 6px rgba(${GOLD}, 0.1)`,
  xl: `0 20px 25px rgba(${GOLD}, 0.2), 0 10px 10px rgba(${GOLD}, 0.1)`,
  '2xl': `0 25px 50px rgba(${GOLD}, 0.25)`,
  /** Luxury glow for premium items */
  glow: `0 0 20px rgba(${GOLD}, 0.4)`,
  /** Secondary button shadow */
  secondary: `0 4px 14px rgba(${GOLD}, 0.3)`,
} as const;

// =============================================================================
// SEMANTIC SHADOWS
// =============================================================================

export const semanticShadows = {
  success: `0 4px 14px rgba(0, 174, 122, 0.3)`,
  warning: `0 4px 14px rgba(245, 158, 11, 0.3)`,
  error: `0 4px 14px rgba(239, 68, 68, 0.3)`,
  info: `0 4px 14px rgba(59, 130, 246, 0.3)`,
} as const;

// =============================================================================
// CARD SHADOWS (Elevation System)
// =============================================================================

export const cardShadows = {
  /** Flat - no elevation */
  flat: 'none',
  /** Resting state */
  resting: `0 1px 3px rgba(${BLACK}, 0.08), 0 1px 2px rgba(${BLACK}, 0.06)`,
  /** Hover state */
  hover: `0 4px 12px rgba(${BLACK}, 0.1), 0 2px 4px rgba(${BLACK}, 0.06)`,
  /** Selected/active state */
  active: `0 8px 16px rgba(${BLACK}, 0.12), 0 4px 8px rgba(${BLACK}, 0.08)`,
  /** Floating/modal */
  floating: `0 16px 32px rgba(${BLACK}, 0.15), 0 8px 16px rgba(${BLACK}, 0.1)`,

  /** Emerald variant hover */
  emeraldHover: `0 4px 12px rgba(${EMERALD}, 0.15), 0 2px 4px rgba(${EMERALD}, 0.1)`,
  /** Gold variant for premium cards */
  goldHover: `0 4px 12px rgba(${GOLD}, 0.15), 0 2px 4px rgba(${GOLD}, 0.1)`,
} as const;

// =============================================================================
// FOCUS RING SHADOWS
// =============================================================================

export const focusShadows = {
  /** Default focus ring */
  default: `0 0 0 2px #FFFFFF, 0 0 0 4px #00AE7A`,
  /** Error focus ring */
  error: `0 0 0 2px #FFFFFF, 0 0 0 4px #EF4444`,
  /** Subtle focus (for dark backgrounds) */
  subtle: `0 0 0 2px rgba(0, 174, 122, 0.5)`,
} as const;

// =============================================================================
// LIQUID GLASS FLOATING LAYERS (iOS 26)
// =============================================================================

export const floatingLayerShadows = {
  /** Ground level - no shadow */
  ground: 'none',
  /** Raised - subtle depth */
  raised: `0 2px 8px rgba(${BLACK}, 0.08)`,
  /** Floating - clear separation */
  floating: `0 8px 24px rgba(${BLACK}, 0.12)`,
  /** Overlay - strong depth */
  overlay: `0 16px 48px rgba(${BLACK}, 0.16)`,
  /** Modal - maximum depth */
  modal: `0 24px 64px rgba(${BLACK}, 0.20)`,
} as const;

// =============================================================================
// LIQUID GLASS SPECULAR SHADOWS
// =============================================================================

export const specularShadows = {
  /** Light inner glow for polished glass effect */
  innerGlow: `inset 0 1px 1px rgba(255, 255, 255, 0.15)`,
  /** Top edge highlight */
  topEdge: `inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
  /** Combined specular effect */
  combined: `inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 -1px 1px rgba(0, 0, 0, 0.05)`,
  /** Emerald specular */
  emerald: `inset 0 1px 1px rgba(0, 174, 122, 0.15), 0 0 20px rgba(0, 174, 122, 0.1)`,
  /** Gold specular */
  gold: `inset 0 1px 1px rgba(212, 175, 55, 0.2), 0 0 20px rgba(212, 175, 55, 0.1)`,
} as const;

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const shadows = {
  default: defaultShadows,
  emerald: emeraldShadows,
  gold: goldShadows,
  semantic: semanticShadows,
  card: cardShadows,
  focus: focusShadows,
  // Liquid Glass (iOS 26)
  floatingLayers: floatingLayerShadows,
  specular: specularShadows,
} as const;

export default shadows;
