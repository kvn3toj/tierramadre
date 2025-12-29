/**
 * Tierra Madre Design System - Liquid Glass Tokens
 *
 * Apple iOS 26 "Liquid Glass" design language implementation.
 * Dynamic blur, specular highlights, light refraction, and floating layers.
 *
 * Reference: WWDC 2025 - Apple Human Interface Guidelines
 * https://developer.apple.com/design/human-interface-guidelines/
 */

// =============================================================================
// TYPES
// =============================================================================

export type InteractionState = 'inactive' | 'resting' | 'hover' | 'active';
export type ElevationLevel = 'ground' | 'raised' | 'floating' | 'overlay' | 'modal';
export type DeviceTier = 'high' | 'medium' | 'low';

export interface LiquidGlassEffect {
  blur: string;
  saturation: string;
  background: string;
  specularHighlight: string;
  shadow: string;
  scale: number;
  borderHighlight: string;
}

export interface FloatingLayer {
  blur: string;
  shadow: string;
  scale: number;
  zIndex: number;
}

// =============================================================================
// DYNAMIC BLUR (Based on interaction state)
// =============================================================================

/**
 * Blur decreases as user interacts = more clarity when engaged
 * This is the key Liquid Glass behavior
 */
export const dynamicBlur = {
  /** Secondary elements, not in focus */
  inactive: '14px',
  /** Default resting state */
  resting: '8px',
  /** Hover - more clarity as user shows interest */
  hover: '5px',
  /** Active/pressed - maximum clarity */
  active: '2px',
} as const;

/**
 * Background opacity follows same pattern
 */
export const dynamicOpacity = {
  inactive: 0.8,
  resting: 0.88,
  hover: 0.92,
  active: 0.95,
} as const;

// =============================================================================
// SPECULAR HIGHLIGHTS
// =============================================================================

/**
 * Light reflection effects on edges
 * Creates the "polished glass" appearance
 */
export const specularHighlights = {
  /** Standard highlight intensity */
  intensity: {
    subtle: 0.08,
    normal: 0.15,
    bright: 0.25,
    vibrant: 0.35,
  },

  /** Angle of the highlight gradient */
  angle: {
    topLeft: '135deg',
    top: '180deg',
    topRight: '225deg',
    left: '90deg',
    right: '270deg',
  },

  /** Colors for highlights */
  color: {
    white: 'rgba(255, 255, 255, 0.25)',
    emerald: 'rgba(0, 174, 122, 0.20)',
    gold: 'rgba(212, 175, 55, 0.20)',
    cool: 'rgba(200, 220, 255, 0.20)',
  },

  /** Pre-built gradients for specular effect */
  gradients: {
    /** Standard top-left shine */
    standard: `linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)`,
    /** Subtle edge highlight */
    subtle: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)`,
    /** Bright polish */
    bright: `linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, transparent 50%)`,
    /** Emerald-tinted shine */
    emerald: `linear-gradient(135deg, rgba(0,174,122,0.20) 0%, rgba(255,255,255,0.15) 30%, transparent 50%)`,
    /** Gold premium shine */
    gold: `linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(255,255,255,0.15) 30%, transparent 50%)`,
  },
} as const;

// =============================================================================
// LIGHT REFRACTION
// =============================================================================

/**
 * Chromatic aberration and light bending effects
 * Simulates how real glass distorts light
 */
export const lightRefraction = {
  /** Offset for chromatic split (subtle color fringing) */
  offset: {
    none: '0px',
    subtle: '1px',
    normal: '2px',
    strong: '3px',
  },

  /** Whether to apply chromatic effect */
  chromatic: {
    enabled: true,
    disabled: false,
  },

  /** CSS filter for refraction simulation */
  filters: {
    /** Subtle light bend */
    subtle: 'brightness(1.02) contrast(1.01)',
    /** Normal refraction */
    normal: 'brightness(1.05) contrast(1.02) saturate(1.1)',
    /** Strong glass effect */
    strong: 'brightness(1.08) contrast(1.03) saturate(1.15)',
  },
} as const;

// =============================================================================
// FLOATING LAYERS (5-level elevation system)
// =============================================================================

/**
 * Creates depth hierarchy like Vision Pro spatial design
 */
export const floatingLayers: Record<ElevationLevel, FloatingLayer> = {
  /** Base level - no elevation */
  ground: {
    blur: '0px',
    shadow: 'none',
    scale: 1,
    zIndex: 0,
  },
  /** Slightly raised - cards, buttons */
  raised: {
    blur: '8px',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    scale: 1.005,
    zIndex: 10,
  },
  /** Floating elements - popovers, dropdowns */
  floating: {
    blur: '16px',
    shadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    scale: 1.01,
    zIndex: 100,
  },
  /** Overlay - sheets, sidebars */
  overlay: {
    blur: '24px',
    shadow: '0 16px 48px rgba(0, 0, 0, 0.16)',
    scale: 1.015,
    zIndex: 1000,
  },
  /** Modal - dialogs, alerts */
  modal: {
    blur: '32px',
    shadow: '0 24px 64px rgba(0, 0, 0, 0.20)',
    scale: 1.02,
    zIndex: 10000,
  },
} as const;

// =============================================================================
// SATURATION VALUES (enhanced from iOS)
// =============================================================================

export const liquidSaturation = {
  /** Low - muted, subtle */
  low: '110%',
  /** Normal - balanced */
  normal: '130%',
  /** High - vibrant */
  high: '150%',
  /** Vibrant - iOS standard */
  vibrant: '170%',
  /** Intense - Liquid Glass enhanced */
  intense: '190%',
  /** Maximum - for special effects */
  maximum: '220%',
} as const;

// =============================================================================
// BACKDROP FILTER PRESETS
// =============================================================================

export const backdropPresets = {
  /** Standard Liquid Glass */
  standard: (state: InteractionState = 'resting') =>
    `blur(${dynamicBlur[state]}) saturate(${liquidSaturation.vibrant})`,

  /** Light mode variant */
  light: (state: InteractionState = 'resting') =>
    `blur(${dynamicBlur[state]}) saturate(${liquidSaturation.high}) brightness(1.05)`,

  /** Dark mode variant */
  dark: (state: InteractionState = 'resting') =>
    `blur(${dynamicBlur[state]}) saturate(${liquidSaturation.intense}) brightness(0.95)`,

  /** Emerald tinted */
  emerald: (state: InteractionState = 'resting') =>
    `blur(${dynamicBlur[state]}) saturate(${liquidSaturation.intense}) hue-rotate(-10deg)`,

  /** Static presets for simpler use */
  static: {
    inactive: `blur(24px) saturate(200%)`,
    resting: `blur(16px) saturate(200%)`,
    hover: `blur(12px) saturate(200%)`,
    active: `blur(8px) saturate(200%)`,
  },
} as const;

// =============================================================================
// BORDER HIGHLIGHTS (edge glow effect)
// =============================================================================

export const borderHighlights = {
  /** Light mode borders */
  light: {
    subtle: '1px solid rgba(255, 255, 255, 0.2)',
    normal: '1px solid rgba(255, 255, 255, 0.3)',
    bright: '1px solid rgba(255, 255, 255, 0.5)',
    specular: '1px solid rgba(255, 255, 255, 0.7)',
  },

  /** Dark mode borders */
  dark: {
    subtle: '1px solid rgba(255, 255, 255, 0.08)',
    normal: '1px solid rgba(255, 255, 255, 0.12)',
    bright: '1px solid rgba(255, 255, 255, 0.2)',
    specular: '1px solid rgba(255, 255, 255, 0.3)',
  },

  /** Emerald accent borders */
  emerald: {
    subtle: '1px solid rgba(0, 174, 122, 0.2)',
    normal: '1px solid rgba(0, 174, 122, 0.3)',
    bright: '1px solid rgba(0, 174, 122, 0.5)',
    glow: '1px solid rgba(0, 174, 122, 0.7)',
  },

  /** Gold accent borders */
  gold: {
    subtle: '1px solid rgba(212, 175, 55, 0.2)',
    normal: '1px solid rgba(212, 175, 55, 0.3)',
    bright: '1px solid rgba(212, 175, 55, 0.5)',
    glow: '1px solid rgba(212, 175, 55, 0.7)',
  },
} as const;

// =============================================================================
// TAB BAR CONFIGURATION (Dynamic shrink/expand)
// =============================================================================

export const tabBarConfig = {
  /** Heights */
  height: {
    expanded: 56,
    collapsed: 48,
    mini: 40,
  },

  /** Icon sizes */
  iconSize: {
    expanded: 26,
    collapsed: 22,
    mini: 20,
  },

  /** Label visibility */
  labelOpacity: {
    expanded: 1,
    collapsed: 0.7,
    mini: 0,
  },

  /** Scroll threshold to trigger shrink */
  scrollThreshold: 50,

  /** Transition duration */
  transitionDuration: '400ms',
} as const;

// =============================================================================
// DEVICE TIER CONFIGURATIONS
// =============================================================================

export const tierEffects: Record<DeviceTier, {
  blur: boolean;
  specular: boolean;
  refraction: boolean;
  floatingLayers: boolean;
  dynamicTabBar: boolean;
  animations: boolean;
}> = {
  /** Full effects - ProMotion displays, Apple Silicon */
  high: {
    blur: true,
    specular: true,
    refraction: true,
    floatingLayers: true,
    dynamicTabBar: true,
    animations: true,
  },
  /** Reduced effects - standard displays */
  medium: {
    blur: true,
    specular: true,
    refraction: false,
    floatingLayers: true,
    dynamicTabBar: true,
    animations: true,
  },
  /** Minimal effects - older devices */
  low: {
    blur: false,
    specular: false,
    refraction: false,
    floatingLayers: false,
    dynamicTabBar: false,
    animations: false,
  },
} as const;

// =============================================================================
// UTILITY: Get effect for state
// =============================================================================

export const getLiquidGlassEffect = (
  state: InteractionState = 'resting',
  elevation: ElevationLevel = 'raised',
  isDark: boolean = false
): LiquidGlassEffect => {
  const layer = floatingLayers[elevation];
  const bgOpacity = dynamicOpacity[state];

  return {
    blur: dynamicBlur[state],
    saturation: liquidSaturation.vibrant,
    background: isDark
      ? `rgba(30, 41, 59, ${bgOpacity})`
      : `rgba(255, 255, 255, ${bgOpacity})`,
    specularHighlight: specularHighlights.gradients.standard,
    shadow: layer.shadow,
    scale: layer.scale,
    borderHighlight: isDark
      ? borderHighlights.dark.normal
      : borderHighlights.light.normal,
  };
};

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const liquidGlass = {
  blur: dynamicBlur,
  opacity: dynamicOpacity,
  specular: specularHighlights,
  refraction: lightRefraction,
  layers: floatingLayers,
  saturation: liquidSaturation,
  backdrop: backdropPresets,
  border: borderHighlights,
  tabBar: tabBarConfig,
  tiers: tierEffects,
  getEffect: getLiquidGlassEffect,
} as const;

export default liquidGlass;
