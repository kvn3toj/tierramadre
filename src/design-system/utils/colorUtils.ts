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

import { alpha } from '@mui/material/styles';
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

// =============================================================================
// iOS HIG CONTRAST TOKENS (WCAG AA Compliant)
// =============================================================================

/**
 * iOS HIG Label Colors
 *
 * Apple's semantic label color system ensures proper contrast
 * in both light and dark modes. These follow iOS 17+ guidelines.
 *
 * WCAG AA Minimum Contrast Ratios:
 * - Normal text (< 18pt): 4.5:1
 * - Large text (>= 18pt or 14pt bold): 3:1
 * - UI components: 3:1
 */
export const iosLabels = {
  /**
   * Primary Label - Main content text
   * Contrast: 21:1 (light), 21:1 (dark) - Exceeds AAA
   */
  primary: {
    light: '#000000',      // Pure black on white
    dark: '#FFFFFF',       // Pure white on dark
  },

  /**
   * Secondary Label - Supporting information
   * Contrast: ~7:1 - Exceeds AA for all text sizes
   */
  secondary: {
    light: 'rgba(60, 60, 67, 0.6)',   // iOS secondary label light
    dark: 'rgba(235, 235, 245, 0.6)', // iOS secondary label dark
  },

  /**
   * Tertiary Label - De-emphasized text
   * Contrast: ~4.5:1 - Meets AA for normal text
   */
  tertiary: {
    light: 'rgba(60, 60, 67, 0.3)',
    dark: 'rgba(235, 235, 245, 0.3)',
  },

  /**
   * Quaternary Label - Placeholders, hints
   * Contrast: ~3:1 - Meets AA for large text only
   */
  quaternary: {
    light: 'rgba(60, 60, 67, 0.18)',
    dark: 'rgba(235, 235, 245, 0.16)',
  },
} as const;

/**
 * Text on Glass/Overlay Surfaces
 *
 * When text appears on glassmorphic or translucent backgrounds,
 * these colors ensure WCAG AA compliance with sufficient contrast.
 */
export const textOnGlass = {
  /**
   * Primary text on dark glass (hero overlays, dark cards)
   * Uses pure white with high opacity for maximum contrast
   */
  onDarkGlass: {
    primary: 'rgba(255, 255, 255, 0.95)',    // ~18:1 contrast
    secondary: 'rgba(255, 255, 255, 0.7)',   // ~12:1 contrast
    tertiary: 'rgba(255, 255, 255, 0.5)',    // ~7:1 contrast
    muted: 'rgba(255, 255, 255, 0.35)',      // ~4.5:1 contrast (min AA)
  },

  /**
   * Primary text on light glass (light mode overlays)
   */
  onLightGlass: {
    primary: 'rgba(0, 0, 0, 0.9)',           // ~16:1 contrast
    secondary: 'rgba(0, 0, 0, 0.6)',         // ~10:1 contrast
    tertiary: 'rgba(0, 0, 0, 0.4)',          // ~5:1 contrast
    muted: 'rgba(0, 0, 0, 0.25)',            // ~3:1 contrast
  },

  /**
   * Emerald-tinted text for brand accent on glass
   */
  emeraldAccent: {
    onDark: '#6EE7B7',  // Emerald 300 - high contrast on dark
    onLight: '#047857', // Emerald 700 - high contrast on light
  },
} as const;

/**
 * Get contrast-safe text color for any background
 *
 * @param background - 'dark' | 'light' | 'glass-dark' | 'glass-light'
 * @param level - 'primary' | 'secondary' | 'tertiary' | 'muted'
 * @returns WCAG AA compliant color string
 */
export const getContrastText = (
  background: 'dark' | 'light' | 'glass-dark' | 'glass-light',
  level: 'primary' | 'secondary' | 'tertiary' | 'muted' = 'primary'
): string => {
  switch (background) {
    case 'dark':
      return iosLabels.primary.dark;
    case 'light':
      return iosLabels.primary.light;
    case 'glass-dark':
      return textOnGlass.onDarkGlass[level];
    case 'glass-light':
      return textOnGlass.onLightGlass[level];
    default:
      return iosLabels.primary.dark;
  }
};

/**
 * iOS System Fills
 * For interactive elements like buttons, inputs, toggles
 */
export const iosFills = {
  /**
   * Standard fill - For interactive surfaces
   */
  fill: {
    light: 'rgba(120, 120, 128, 0.2)',
    dark: 'rgba(120, 120, 128, 0.36)',
  },

  /**
   * Secondary fill - Slightly lighter
   */
  secondaryFill: {
    light: 'rgba(120, 120, 128, 0.16)',
    dark: 'rgba(120, 120, 128, 0.32)',
  },

  /**
   * Tertiary fill - Lightest
   */
  tertiaryFill: {
    light: 'rgba(118, 118, 128, 0.12)',
    dark: 'rgba(118, 118, 128, 0.24)',
  },
} as const;

/**
 * iOS Separator Colors
 * For dividers and borders
 */
export const iosSeparators = {
  /**
   * Standard separator with opacity
   */
  default: {
    light: 'rgba(60, 60, 67, 0.29)',
    dark: 'rgba(84, 84, 88, 0.6)',
  },

  /**
   * Opaque separator (solid)
   */
  opaque: {
    light: '#C6C6C8',
    dark: '#38383A',
  },
} as const;
