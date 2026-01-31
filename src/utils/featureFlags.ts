/**
 * Feature Flags
 * Controls gradual rollout of iOS components
 *
 * Usage:
 * import { FEATURES } from '@/utils/featureFlags';
 * if (FEATURES.IOS_UPLOAD) { ... }
 */

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storage-keys';

/** A/B Test Variant for Grid Layout */
export type ABGridVariant = 'control' | 'ios-hig' | 'premium';

export interface FeatureFlags {
  /** iOS Upload feature (EmeraldUploader.ios.tsx) */
  IOS_UPLOAD: boolean;

  /** iOS Gallery feature */
  IOS_GALLERY: boolean;

  /** iOS Calendar feature */
  IOS_CALENDAR: boolean;

  /** iOS Catalog feature */
  IOS_CATALOG: boolean;

  /** iOS Treasure feature */
  IOS_TREASURE: boolean;

  /** iOS Ambassadors feature */
  IOS_AMBASSADORS: boolean;

  /** A/B Test: Grid Layout Variant */
  AB_GRID_VARIANT: ABGridVariant;
}

/**
 * Default Feature Flags
 * Week 2: IOS_UPLOAD enabled for testing
 * Week 3-4: IOS_GALLERY enabled
 * Week 5+: Other features
 */
export const FEATURES: FeatureFlags = {
  IOS_UPLOAD: true,     // ✅ Week 2 - Ready for testing
  IOS_GALLERY: false,   // ⏳ Week 3-4
  IOS_CALENDAR: false,  // ⏳ Week 5-6
  IOS_CATALOG: false,   // ⏳ Week 7-8
  IOS_TREASURE: false, // ⏳ Week 7-8
  IOS_AMBASSADORS: false, // ⏳ Future
  AB_GRID_VARIANT: 'ios-hig', // ✅ Default to iOS HIG strict compliance
};

/**
 * Local Storage Key for Feature Overrides
 * Developers can enable features manually via localStorage
 */
const FEATURE_OVERRIDE_KEY = STORAGE_KEYS.FEATURE_FLAGS;

/**
 * Get Feature Flag Value
 * Checks localStorage override first, then default config
 */
export function getFeatureFlag<K extends keyof FeatureFlags>(flagName: K): FeatureFlags[K] {
  if (typeof window === 'undefined') return FEATURES[flagName];

  try {
    const overrides = localStorage.getItem(FEATURE_OVERRIDE_KEY);
    if (overrides) {
      const parsed = JSON.parse(overrides);
      if (flagName in parsed) {
        return parsed[flagName];
      }
    }
  } catch (error) {
    console.warn('Failed to read feature flag overrides:', error);
  }

  return FEATURES[flagName];
}

/**
 * Set Feature Flag Override
 * For local development/testing
 *
 * @example
 * setFeatureFlag('IOS_UPLOAD', true);
 * setFeatureFlag('AB_GRID_VARIANT', 'premium');
 */
export function setFeatureFlag<K extends keyof FeatureFlags>(flagName: K, value: FeatureFlags[K]): void {
  if (typeof window === 'undefined') return;

  try {
    const overrides = localStorage.getItem(FEATURE_OVERRIDE_KEY);
    const parsed = overrides ? JSON.parse(overrides) : {};
    parsed[flagName] = value;
    localStorage.setItem(FEATURE_OVERRIDE_KEY, JSON.stringify(parsed));

    console.log(`✅ Feature flag "${flagName}" set to ${value}`);
    console.log('🔄 Refresh the page to see changes');
  } catch (error) {
    console.error('Failed to set feature flag override:', error);
  }
}

/**
 * Clear All Feature Flag Overrides
 * Resets to default configuration
 */
export function clearFeatureFlags(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(FEATURE_OVERRIDE_KEY);
    console.log('✅ Feature flag overrides cleared');
    console.log('🔄 Refresh the page to see default flags');
  } catch (error) {
    console.error('Failed to clear feature flags:', error);
  }
}

/**
 * Get All Feature Flags
 * Returns current state of all flags (with overrides applied)
 */
export function getAllFeatureFlags(): FeatureFlags {
  const flags = { ...FEATURES };

  if (typeof window === 'undefined') return flags;

  try {
    const overrides = localStorage.getItem(FEATURE_OVERRIDE_KEY);
    if (overrides) {
      const parsed = JSON.parse(overrides);
      // Merge overrides for each known flag
      if ('IOS_UPLOAD' in parsed) flags.IOS_UPLOAD = parsed.IOS_UPLOAD;
      if ('IOS_GALLERY' in parsed) flags.IOS_GALLERY = parsed.IOS_GALLERY;
      if ('IOS_CALENDAR' in parsed) flags.IOS_CALENDAR = parsed.IOS_CALENDAR;
      if ('IOS_CATALOG' in parsed) flags.IOS_CATALOG = parsed.IOS_CATALOG;
      if ('IOS_TREASURE' in parsed) flags.IOS_TREASURE = parsed.IOS_TREASURE;
      if ('IOS_AMBASSADORS' in parsed) flags.IOS_AMBASSADORS = parsed.IOS_AMBASSADORS;
      if ('AB_GRID_VARIANT' in parsed) flags.AB_GRID_VARIANT = parsed.AB_GRID_VARIANT;
    }
  } catch (error) {
    console.warn('Failed to read feature flag overrides:', error);
  }

  return flags;
}

/**
 * Feature Flag Debug Panel
 * Console helper for developers
 *
 * Usage in browser console:
 * window.featureFlags.enable('IOS_UPLOAD')
 * window.featureFlags.disable('IOS_UPLOAD')
 * window.featureFlags.list()
 * window.featureFlags.reset()
 */
if (typeof window !== 'undefined') {
  (window as any).featureFlags = {
    enable: (flag: keyof FeatureFlags) => setFeatureFlag(flag, true),
    disable: (flag: keyof FeatureFlags) => setFeatureFlag(flag, false),
    list: () => {
      const flags = getAllFeatureFlags();
      console.table(flags);
      return flags;
    },
    reset: clearFeatureFlags,
  };

  // Log available commands on first load
  console.log(
    '%c🎛️ Feature Flags Available',
    'background: #00AE7A; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  console.log('Use window.featureFlags to control features:');
  console.log('  • window.featureFlags.list()         - Show all flags');
  console.log('  • window.featureFlags.enable("IOS_UPLOAD")  - Enable a flag');
  console.log('  • window.featureFlags.disable("IOS_UPLOAD") - Disable a flag');
  console.log('  • window.featureFlags.reset()        - Reset to defaults');
}

/**
 * React Hook for Feature Flags
 * Provides reactive access to feature flags with localStorage sync
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(() => getAllFeatureFlags());

  // Sync with localStorage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FEATURE_OVERRIDE_KEY) {
        setFlags(getAllFeatureFlags());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setFlag = useCallback(<K extends keyof FeatureFlags>(flagName: K, value: FeatureFlags[K]) => {
    setFeatureFlag(flagName, value);
    setFlags(getAllFeatureFlags());
  }, []);

  const resetFlags = useCallback(() => {
    clearFeatureFlags();
    setFlags({ ...FEATURES });
  }, []);

  return {
    flags,
    setFlag,
    resetFlags,
    getFlag: <K extends keyof FeatureFlags>(flagName: K) => flags[flagName],
  };
}

export default FEATURES;
