/**
 * Color Utility Functions
 *
 * Helper functions for creating consistent color values with opacity.
 * These replace hardcoded rgba() calls throughout the codebase.
 *
 * Usage:
 *   import { whiteAlpha, blackAlpha, emeraldAlpha } from '../design-system/utils/colorUtils';
 *   background: whiteAlpha(0.1);
 *   background: emeraldAlpha(opacity.medium);
 */

import { alpha } from '@mui/material';
import { emeraldCore, goldAccent, semanticColors } from '../tokens/colors';
import { opacity, type OpacityLevel } from '../tokens/opacity';

// =============================================================================
// BASIC COLOR ALPHA FUNCTIONS
// =============================================================================

/**
 * Create white color with opacity
 * @param opacityValue - Opacity value (0-1) or opacity token key
 */
export const whiteAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return `rgba(255, 255, 255, ${value})`;
};

/**
 * Create black color with opacity
 * @param opacityValue - Opacity value (0-1) or opacity token key
 */
export const blackAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return `rgba(0, 0, 0, ${value})`;
};

// =============================================================================
// BRAND COLOR ALPHA FUNCTIONS
// =============================================================================

/**
 * Create emerald brand color with opacity
 * @param opacityValue - Opacity value (0-1) or opacity token key
 */
export const emeraldAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(emeraldCore.primary, value);
};

/**
 * Create emerald dark color with opacity
 * @param opacityValue - Opacity value (0-1) or opacity token key
 */
export const emeraldDarkAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(emeraldCore.dark, value);
};

/**
 * Create gold accent color with opacity
 * @param opacityValue - Opacity value (0-1) or opacity token key
 */
export const goldAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(goldAccent.primary, value);
};

// =============================================================================
// SEMANTIC COLOR ALPHA FUNCTIONS
// =============================================================================

/**
 * Create error color with opacity
 * @param opacityValue - Opacity value (0-1) or opacity token key
 */
export const errorAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(semanticColors.error.main, value);
};

/**
 * Create success color with opacity
 * @param opacityValue - Opacity value (0-1) or opacity token key
 */
export const successAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(semanticColors.success.main, value);
};

/**
 * Create warning color with opacity
 * @param opacityValue - Opacity value (0-1) or opacity token key
 */
export const warningAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(semanticColors.warning.main, value);
};

// =============================================================================
// THEME-AWARE HELPERS
// =============================================================================

/**
 * Get theme-aware text color with opacity
 * @param isLight - Whether the current theme is light mode
 * @param opacityValue - Opacity value (0-1)
 */
export const textAlpha = (isLight: boolean, opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return isLight ? blackAlpha(value) : whiteAlpha(value);
};

/**
 * Get theme-aware border color
 * @param isLight - Whether the current theme is light mode
 * @param opacityValue - Opacity value (0-1)
 */
export const borderAlpha = (isLight: boolean, opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return isLight
    ? `rgba(0, 0, 0, ${value})`
    : `rgba(255, 255, 255, ${value})`;
};

/**
 * Get theme-aware surface color
 * @param isLight - Whether the current theme is light mode
 * @param opacityValue - Opacity value (0-1)
 */
export const surfaceAlpha = (isLight: boolean, opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return isLight
    ? `rgba(255, 255, 255, ${value})`
    : `rgba(0, 0, 0, ${value})`;
};
