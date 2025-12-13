/**
 * Liquid Glass Mixins
 *
 * Reusable style mixins for applying Liquid Glass effects to components.
 * These generate MUI sx-compatible style objects.
 *
 * @example
 * ```tsx
 * <Box sx={{ ...liquidGlassEffect({ state: 'hover', elevation: 'floating' }) }}>
 *   Content
 * </Box>
 * ```
 */

import type { SxProps, Theme } from '@mui/material';
import {
  dynamicBlur,
  dynamicOpacity,
  specularHighlights,
  floatingLayers,
  borderHighlights,
  liquidSaturation,
  type InteractionState,
  type ElevationLevel,
  type DeviceTier,
} from '../tokens/liquid-glass';
import { floatingLayerShadows, specularShadows } from '../tokens/shadows';
import { easingCurves, durations } from '../tokens/primitives/motion';

// =============================================================================
// TYPES
// =============================================================================

export interface LiquidGlassOptions {
  /** Current interaction state */
  state?: InteractionState;
  /** Elevation level */
  elevation?: ElevationLevel;
  /** Dark mode */
  isDark?: boolean;
  /** Enable specular highlight */
  specular?: boolean;
  /** Enable refraction effect */
  refraction?: boolean;
  /** Device tier for performance */
  tier?: DeviceTier;
  /** Custom background color (overrides default) */
  backgroundColor?: string;
  /** Accent color for tinting */
  accentColor?: 'emerald' | 'gold' | 'none';
}

// =============================================================================
// MAIN LIQUID GLASS EFFECT
// =============================================================================

/**
 * Complete Liquid Glass effect mixin
 * Combines blur, specular, shadow, and transitions
 */
export const liquidGlassEffect = (options: LiquidGlassOptions = {}): SxProps<Theme> => {
  const {
    state = 'resting',
    elevation = 'raised',
    isDark = false,
    specular = true,
    refraction = false,
    tier = 'high',
    backgroundColor,
    accentColor = 'none',
  } = options;

  // Skip effects for low-tier devices
  if (tier === 'low') {
    return {
      background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      border: isDark ? borderHighlights.dark.normal : borderHighlights.light.normal,
      boxShadow: floatingLayerShadows[elevation],
    };
  }

  const blur = dynamicBlur[state];
  const opacity = dynamicOpacity[state];
  const layer = floatingLayers[elevation];
  const saturation = liquidSaturation.vibrant;

  // Base background color
  const baseBg = backgroundColor || (isDark
    ? `rgba(30, 41, 59, ${opacity})`
    : `rgba(255, 255, 255, ${opacity})`);

  // Border based on accent
  const border = accentColor === 'emerald'
    ? borderHighlights.emerald.normal
    : accentColor === 'gold'
      ? borderHighlights.gold.normal
      : isDark
        ? borderHighlights.dark.normal
        : borderHighlights.light.normal;

  // Specular gradient
  const specularGradient = accentColor === 'emerald'
    ? specularHighlights.gradients.emerald
    : accentColor === 'gold'
      ? specularHighlights.gradients.gold
      : specularHighlights.gradients.standard;

  return {
    // Background with specular overlay
    background: specular
      ? `${specularGradient}, ${baseBg}`
      : baseBg,

    // Backdrop filter (the core Liquid Glass effect)
    backdropFilter: `blur(${blur}) saturate(${saturation})`,
    WebkitBackdropFilter: `blur(${blur}) saturate(${saturation})`,

    // Border
    border,

    // Shadow from elevation
    boxShadow: `${floatingLayerShadows[elevation]}${specular ? `, ${specularShadows.innerGlow}` : ''}`,

    // Scale for floating effect
    transform: `scale(${layer.scale}) translateZ(0)`,

    // Smooth transitions with Liquid Glass curves
    transition: `
      all ${durations.liquidNormal} ${easingCurves.liquidInOut},
      backdrop-filter ${durations.liquidNormal} ${easingCurves.liquidSoft},
      -webkit-backdrop-filter ${durations.liquidNormal} ${easingCurves.liquidSoft}
    `,

    // GPU acceleration
    willChange: 'transform, backdrop-filter',

    // Refraction filter (optional, performance-heavy)
    ...(refraction && tier === 'high' && {
      filter: 'brightness(1.02) contrast(1.01)',
    }),
  };
};

// =============================================================================
// INDIVIDUAL EFFECT MIXINS
// =============================================================================

/**
 * Dynamic blur only
 */
export const dynamicBlurMixin = (
  state: InteractionState = 'resting',
  isDark: boolean = false
): SxProps<Theme> => ({
  backdropFilter: `blur(${dynamicBlur[state]}) saturate(${liquidSaturation.vibrant})`,
  WebkitBackdropFilter: `blur(${dynamicBlur[state]}) saturate(${liquidSaturation.vibrant})`,
  background: isDark
    ? `rgba(30, 41, 59, ${dynamicOpacity[state]})`
    : `rgba(255, 255, 255, ${dynamicOpacity[state]})`,
  transition: `backdrop-filter ${durations.liquidNormal} ${easingCurves.liquidSoft}`,
});

/**
 * Specular highlight only
 */
export const specularHighlightMixin = (
  intensity: 'subtle' | 'normal' | 'bright' | 'vibrant' = 'normal',
  angle: keyof typeof specularHighlights.angle = 'topLeft'
): SxProps<Theme> => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(${specularHighlights.angle[angle]},
      rgba(255,255,255,${specularHighlights.intensity[intensity]}) 0%,
      transparent 50%)`,
    pointerEvents: 'none',
    borderRadius: 'inherit',
  },
});

/**
 * Floating layer elevation
 */
export const floatingLayerMixin = (level: ElevationLevel = 'raised'): SxProps<Theme> => {
  const layer = floatingLayers[level];
  return {
    boxShadow: floatingLayerShadows[level],
    transform: `scale(${layer.scale}) translateZ(0)`,
    zIndex: layer.zIndex,
    transition: `transform ${durations.liquidNormal} ${easingCurves.liquidSpring},
                 box-shadow ${durations.liquidNormal} ${easingCurves.liquidInOut}`,
  };
};

/**
 * Tab bar specular indicator
 */
export const tabSpecularIndicator = (isActive: boolean): SxProps<Theme> => ({
  position: 'relative',
  '&::before': isActive ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: '2px',
    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
    borderRadius: '2px',
    transition: `opacity ${durations.liquidFast} ${easingCurves.liquidIn}`,
  } : {},
});

// =============================================================================
// HOVER STATE MIXINS
// =============================================================================

/**
 * Liquid Glass hover effect
 * Apply to elements that should respond to hover
 */
export const liquidGlassHover = (options: LiquidGlassOptions = {}): SxProps<Theme> => {
  const restingStyles = liquidGlassEffect({ ...options, state: 'resting' }) as Record<string, unknown>;
  const hoverStyles = liquidGlassEffect({ ...options, state: 'hover' }) as Record<string, unknown>;
  const activeStyles = liquidGlassEffect({ ...options, state: 'active' }) as Record<string, unknown>;

  return {
    ...restingStyles,
    '&:hover': hoverStyles,
    '&:active': activeStyles,
  };
};

// =============================================================================
// GPU ACCELERATION HELPERS
// =============================================================================

/**
 * Force GPU acceleration
 */
export const gpuAcceleration: SxProps<Theme> = {
  transform: 'translateZ(0)',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
};

/**
 * Clean up will-change after animation
 */
export const cleanupWillChange: SxProps<Theme> = {
  willChange: 'auto',
};

// =============================================================================
// FALLBACKS
// =============================================================================

/**
 * Fallback for browsers without backdrop-filter support
 */
export const liquidGlassFallback = (isDark: boolean = false): SxProps<Theme> => ({
  '@supports not (backdrop-filter: blur(10px))': {
    background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  },
});

/**
 * Reduced motion support
 */
export const reducedMotionSupport: SxProps<Theme> = {
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none !important',
    animation: 'none !important',
    transform: 'none !important',
  },
};

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const liquidGlassMixins = {
  effect: liquidGlassEffect,
  blur: dynamicBlurMixin,
  specular: specularHighlightMixin,
  layer: floatingLayerMixin,
  hover: liquidGlassHover,
  tabIndicator: tabSpecularIndicator,
  gpu: gpuAcceleration,
  cleanup: cleanupWillChange,
  fallback: liquidGlassFallback,
  reducedMotion: reducedMotionSupport,
} as const;

export default liquidGlassMixins;
