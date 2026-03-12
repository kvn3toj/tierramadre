/**
 * useLiquidGlass Hook
 *
 * Provides Liquid Glass effect state management and styles.
 * Handles interaction states (hover, active) and integrates with device tier.
 */

import { useState, useCallback, useMemo } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { liquidGlassEffect, type LiquidGlassOptions } from '../design-system/mixins/liquidGlassMixins';
import type { InteractionState, ElevationLevel, DeviceTier } from '../design-system/tokens/liquid-glass';
import { getCachedDeviceTier } from '../utils/deviceTier';
import { whiteAlpha, blackAlpha } from '../design-system/utils/colorUtils';
import { surfacesDark } from '../design-system/tokens/colors';

/** Dark fallback with 95% opacity — uses semantic surface token */
const DARK_SURFACE_FALLBACK = `${surfacesDark.surface.default}F2`; // #1C1C1EF2 = 95% opacity

// =============================================================================
// FALLBACK STYLES (shared across hooks to avoid duplication)
// =============================================================================

/** Opaque fallback for devices that don't support Liquid Glass */
const getFallbackStyles = (isDark: boolean): SxProps<Theme> => ({
  background: isDark ? DARK_SURFACE_FALLBACK : whiteAlpha(0.95),
  border: isDark
    ? `1px solid ${whiteAlpha(0.1)}`
    : `1px solid ${blackAlpha(0.1)}`,
});

/** Minimal fallback (background only, no border) */
const getFallbackBg = (isDark: boolean): SxProps<Theme> => ({
  background: isDark ? DARK_SURFACE_FALLBACK : whiteAlpha(0.95),
});

// =============================================================================
// TYPES
// =============================================================================

export interface UseLiquidGlassOptions {
  /** Initial elevation level */
  elevation?: ElevationLevel;
  /** Dark mode */
  isDark?: boolean;
  /** Enable specular highlight */
  specular?: boolean;
  /** Enable refraction effect */
  refraction?: boolean;
  /** Override device tier */
  tierOverride?: DeviceTier;
  /** Accent color */
  accentColor?: 'emerald' | 'gold' | 'none';
  /** Disable all effects */
  disabled?: boolean;
}

export interface UseLiquidGlassReturn {
  /** Current interaction state */
  state: InteractionState;
  /** Glass effect styles (apply to sx prop) */
  glassProps: SxProps<Theme>;
  /** Event handlers for interaction tracking */
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onMouseDown: () => void;
    onMouseUp: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
  /** Set state manually */
  setState: (state: InteractionState) => void;
  /** Device tier being used */
  tier: DeviceTier;
  /** Is effects enabled */
  isEnabled: boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export const useLiquidGlass = (options: UseLiquidGlassOptions = {}): UseLiquidGlassReturn => {
  const {
    elevation = 'raised',
    isDark = false,
    specular = true,
    refraction = false,
    tierOverride,
    accentColor = 'none',
    disabled = false,
  } = options;

  // Interaction state
  const [state, setState] = useState<InteractionState>('resting');

  // Device tier (cached)
  const tier = tierOverride || getCachedDeviceTier();

  // Check if effects are enabled
  const isEnabled = !disabled && tier !== 'low';

  // Event handlers
  const handleMouseEnter = useCallback(() => {
    if (isEnabled) setState('hover');
  }, [isEnabled]);

  const handleMouseLeave = useCallback(() => {
    if (isEnabled) setState('resting');
  }, [isEnabled]);

  const handleMouseDown = useCallback(() => {
    if (isEnabled) setState('active');
  }, [isEnabled]);

  const handleMouseUp = useCallback(() => {
    if (isEnabled) setState('hover');
  }, [isEnabled]);

  const handleTouchStart = useCallback(() => {
    if (isEnabled) setState('active');
  }, [isEnabled]);

  const handleTouchEnd = useCallback(() => {
    if (isEnabled) setState('resting');
  }, [isEnabled]);

  const handleFocus = useCallback(() => {
    if (isEnabled && state === 'resting') setState('hover');
  }, [isEnabled, state]);

  const handleBlur = useCallback(() => {
    if (isEnabled) setState('resting');
  }, [isEnabled]);

  // Memoized handlers object
  const handlers = useMemo(() => ({
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onFocus: handleFocus,
    onBlur: handleBlur,
  }), [
    handleMouseEnter,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
    handleFocus,
    handleBlur,
  ]);

  // Generate glass effect styles
  const glassProps = useMemo((): SxProps<Theme> => {
    if (!isEnabled) {
      return getFallbackStyles(isDark);
    }

    const effectOptions: LiquidGlassOptions = {
      state,
      elevation,
      isDark,
      specular,
      refraction: refraction && tier === 'high',
      tier,
      accentColor,
    };

    return liquidGlassEffect(effectOptions);
  }, [state, elevation, isDark, specular, refraction, tier, accentColor, isEnabled]);

  return {
    state,
    glassProps,
    handlers,
    setState,
    tier,
    isEnabled,
  };
};

// =============================================================================
// SIMPLIFIED HOOKS
// =============================================================================

/**
 * Simple Liquid Glass without interaction tracking
 * Use when you only need the visual effect
 */
export const useLiquidGlassStatic = (options: Omit<UseLiquidGlassOptions, 'disabled'> & {
  state?: InteractionState;
} = {}): SxProps<Theme> => {
  const {
    state = 'resting',
    elevation = 'raised',
    isDark = false,
    specular = true,
    refraction = false,
    tierOverride,
    accentColor = 'none',
  } = options;

  const tier = tierOverride || getCachedDeviceTier();

  return useMemo(() => {
    if (tier === 'low') {
      return getFallbackStyles(isDark);
    }

    return liquidGlassEffect({
      state,
      elevation,
      isDark,
      specular,
      refraction: refraction && tier === 'high',
      tier,
      accentColor,
    });
  }, [state, elevation, isDark, specular, refraction, tier, accentColor]);
};

/**
 * Liquid Glass for navigation elements
 * Pre-configured for nav bars and tab bars
 */
export const useLiquidGlassNav = (isDark: boolean = false): SxProps<Theme> => {
  const tier = getCachedDeviceTier();

  return useMemo(() => {
    if (tier === 'low') {
      return getFallbackBg(isDark);
    }

    return liquidGlassEffect({
      state: 'resting',
      elevation: 'overlay',
      isDark,
      specular: true,
      refraction: false,
      tier,
    });
  }, [isDark, tier]);
};

export default useLiquidGlass;
