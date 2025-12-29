/**
 * Liquid Glass Context
 *
 * Provides global Liquid Glass settings and feature toggles.
 * Allows users to enable/disable effects and auto-detects device tier.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { DeviceTier } from '../design-system/tokens/liquid-glass';
import { tierConfigs, detectDeviceTier, type TierConfig } from '../utils/deviceTier';

// =============================================================================
// TYPES
// =============================================================================

export interface LiquidGlassEffects {
  /** Enable backdrop blur */
  blur: boolean;
  /** Enable specular highlights */
  specular: boolean;
  /** Enable light refraction */
  refraction: boolean;
  /** Enable floating layer elevation */
  floatingLayers: boolean;
  /** Enable dynamic tab bar shrink/expand */
  dynamicTabBar: boolean;
  /** Enable animations */
  animations: boolean;
}

export interface LiquidGlassSettings {
  /** Master enable/disable */
  enabled: boolean;
  /** Device tier selection */
  tier: DeviceTier | 'auto';
  /** Individual effect toggles */
  effects: LiquidGlassEffects;
}

export interface LiquidGlassContextValue extends LiquidGlassSettings {
  /** Computed effective tier (resolved from 'auto') */
  effectiveTier: DeviceTier;
  /** Computed effective config based on tier */
  effectiveConfig: TierConfig;
  /** Update settings */
  updateSettings: (settings: Partial<LiquidGlassSettings>) => void;
  /** Toggle individual effect */
  toggleEffect: (effect: keyof LiquidGlassEffects) => void;
  /** Reset to defaults */
  resetToDefaults: () => void;
  /** Check if a specific effect is enabled */
  isEffectEnabled: (effect: keyof LiquidGlassEffects) => boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'tierra-madre-liquid-glass';

const DEFAULT_SETTINGS: LiquidGlassSettings = {
  enabled: true,
  tier: 'auto',
  effects: {
    blur: true,
    specular: false,       // Disabled for better performance
    refraction: false,     // Disabled (rarely noticeable)
    floatingLayers: false, // Disabled for simplicity
    dynamicTabBar: false,  // Tab bar always visible
    animations: true,      // Keep for UI feedback
  },
};

// =============================================================================
// CONTEXT
// =============================================================================

const LiquidGlassContext = createContext<LiquidGlassContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface LiquidGlassProviderProps {
  children: React.ReactNode;
  /** Override initial settings */
  initialSettings?: Partial<LiquidGlassSettings>;
  /** Disable localStorage persistence */
  disablePersistence?: boolean;
}

export const LiquidGlassProvider: React.FC<LiquidGlassProviderProps> = ({
  children,
  initialSettings,
  disablePersistence = false,
}) => {
  // Load settings from storage or use defaults
  const [settings, setSettings] = useState<LiquidGlassSettings>(() => {
    if (!disablePersistence && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_SETTINGS, ...parsed, ...initialSettings };
        }
      } catch {
        // Ignore storage errors
      }
    }
    return { ...DEFAULT_SETTINGS, ...initialSettings };
  });

  // Detect device tier
  const [detectedTier, setDetectedTier] = useState<DeviceTier>('medium');

  useEffect(() => {
    setDetectedTier(detectDeviceTier());
  }, []);

  // Persist settings
  useEffect(() => {
    if (!disablePersistence && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ignore storage errors
      }
    }
  }, [settings, disablePersistence]);

  // Compute effective tier
  const effectiveTier = useMemo((): DeviceTier => {
    if (settings.tier === 'auto') return detectedTier;
    return settings.tier;
  }, [settings.tier, detectedTier]);

  // Compute effective config (merge tier config with user overrides)
  const effectiveConfig = useMemo((): TierConfig => {
    const tierConfig = tierConfigs[effectiveTier];

    // If disabled, return all false
    if (!settings.enabled) {
      return {
        blur: false,
        specular: false,
        refraction: false,
        floatingLayers: false,
        dynamicTabBar: false,
        animations: false,
      };
    }

    // Merge tier config with user toggles (user can only disable, not enable beyond tier)
    return {
      blur: tierConfig.blur && settings.effects.blur,
      specular: tierConfig.specular && settings.effects.specular,
      refraction: tierConfig.refraction && settings.effects.refraction,
      floatingLayers: tierConfig.floatingLayers && settings.effects.floatingLayers,
      dynamicTabBar: tierConfig.dynamicTabBar && settings.effects.dynamicTabBar,
      animations: tierConfig.animations && settings.effects.animations,
    };
  }, [settings, effectiveTier]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<LiquidGlassSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      effects: {
        ...prev.effects,
        ...(newSettings.effects || {}),
      },
    }));
  }, []);

  // Toggle individual effect
  const toggleEffect = useCallback((effect: keyof LiquidGlassEffects) => {
    setSettings(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [effect]: !prev.effects[effect],
      },
    }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Check if effect is enabled
  const isEffectEnabled = useCallback((effect: keyof LiquidGlassEffects): boolean => {
    return effectiveConfig[effect];
  }, [effectiveConfig]);

  // Context value
  const value = useMemo((): LiquidGlassContextValue => ({
    ...settings,
    effectiveTier,
    effectiveConfig,
    updateSettings,
    toggleEffect,
    resetToDefaults,
    isEffectEnabled,
  }), [settings, effectiveTier, effectiveConfig, updateSettings, toggleEffect, resetToDefaults, isEffectEnabled]);

  return (
    <LiquidGlassContext.Provider value={value}>
      {children}
    </LiquidGlassContext.Provider>
  );
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Use Liquid Glass context
 */
export const useLiquidGlassContext = (): LiquidGlassContextValue => {
  const context = useContext(LiquidGlassContext);
  if (!context) {
    throw new Error('useLiquidGlassContext must be used within LiquidGlassProvider');
  }
  return context;
};

/**
 * Safe version that returns defaults if outside provider
 */
export const useLiquidGlassSafe = (): LiquidGlassContextValue => {
  const context = useContext(LiquidGlassContext);

  // Return safe defaults if outside provider
  if (!context) {
    const detectedTier = typeof window !== 'undefined' ? detectDeviceTier() : 'medium';
    return {
      ...DEFAULT_SETTINGS,
      effectiveTier: detectedTier,
      effectiveConfig: tierConfigs[detectedTier],
      updateSettings: () => {},
      toggleEffect: () => {},
      resetToDefaults: () => {},
      isEffectEnabled: (effect) => tierConfigs[detectedTier][effect],
    };
  }

  return context;
};

/**
 * Check if Liquid Glass is enabled
 */
export const useIsLiquidGlassEnabled = (): boolean => {
  const { enabled, effectiveTier } = useLiquidGlassSafe();
  return enabled && effectiveTier !== 'low';
};

/**
 * Get effective tier
 */
export const useEffectiveTier = (): DeviceTier => {
  const { effectiveTier } = useLiquidGlassSafe();
  return effectiveTier;
};

export default LiquidGlassContext;
