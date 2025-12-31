/**
 * useHaptics Hook
 * Provides haptic feedback for iOS and Android devices.
 *
 * iOS HIG Recommendation:
 * - Use haptic feedback to confirm actions
 * - Light: selections, toggles
 * - Medium: confirmations, successful actions
 * - Heavy: destructive actions, warnings
 *
 * Note: iOS uses Taptic Engine (not navigator.vibrate)
 * Fallback to vibration API for Android
 */

import { useCallback } from 'react';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

interface HapticOptions {
  /**
   * Force haptic even if user prefers reduced motion
   * Use sparingly - only for critical feedback
   */
  force?: boolean;
}

interface UseHapticsReturn {
  /**
   * Trigger haptic feedback
   */
  trigger: (style: HapticStyle, options?: HapticOptions) => void;
  /**
   * Check if haptics are supported
   */
  isSupported: boolean;
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: boolean;
}

/**
 * Vibration patterns for different haptic styles (Android fallback)
 * Values in milliseconds
 */
const VIBRATION_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  selection: 5,
  success: [10, 50, 10], // short-pause-short
  warning: [20, 100, 20], // medium-pause-medium
  error: [30, 100, 30, 100, 30], // three pulses
};

/**
 * Check if the device supports haptic feedback
 */
function checkHapticSupport(): boolean {
  // Check for Vibration API (Android and some browsers)
  if ('vibrate' in navigator) {
    return true;
  }

  // Note: iOS Taptic Engine is not accessible via web APIs
  // We can still attempt vibration which may work on some iOS PWAs
  return false;
}

/**
 * Check if user prefers reduced motion
 */
function checkReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook to trigger haptic feedback on user interactions
 *
 * @example
 * const { trigger, isSupported } = useHaptics();
 *
 * // Button click
 * const handleClick = () => {
 *   trigger('light');
 *   // ... action
 * };
 *
 * // Toggle favorite
 * const handleToggleFavorite = () => {
 *   trigger('selection');
 *   // ... action
 * };
 *
 * // Delete action
 * const handleDelete = () => {
 *   trigger('warning');
 *   // ... action
 * };
 */
export function useHaptics(): UseHapticsReturn {
  const isSupported = checkHapticSupport();
  const prefersReducedMotion = checkReducedMotion();

  const trigger = useCallback((style: HapticStyle, options?: HapticOptions) => {
    // Respect reduced motion preference unless forced
    if (prefersReducedMotion && !options?.force) {
      return;
    }

    // Skip if not supported
    if (!isSupported) {
      return;
    }

    try {
      const pattern = VIBRATION_PATTERNS[style];
      navigator.vibrate(pattern);
    } catch {
      // Silently fail - haptics are optional UX enhancement
    }
  }, [isSupported, prefersReducedMotion]);

  return {
    trigger,
    isSupported,
    prefersReducedMotion,
  };
}

/**
 * Non-hook version for use outside of React components
 * (e.g., in event handlers passed to libraries)
 */
export function triggerHaptic(style: HapticStyle): void {
  if (checkReducedMotion()) return;
  if (!checkHapticSupport()) return;

  try {
    const pattern = VIBRATION_PATTERNS[style];
    navigator.vibrate(pattern);
  } catch {
    // Silently fail
  }
}

export default useHaptics;
