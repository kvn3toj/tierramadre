/**
 * Overlay Tokens
 *
 * Glass effects, gradients, backdrop blurs, and overlay styles.
 * Centralizes all overlay patterns for consistent iOS-style glass effects.
 *
 * Usage:
 *   import { overlays, glassStyle } from '../design-system/tokens/overlays';
 *   sx={{ ...glassStyle.light }}
 */

import { opacity } from './opacity';

// =============================================================================
// GLASS OVERLAYS
// =============================================================================

export const overlays = {
  /** Glass effect backgrounds - iOS style frosted glass */
  glass: {
    /** Light glass - for use on dark backgrounds */
    light: {
      bg: `rgba(255,255,255,${opacity.glass})`,
      border: `rgba(255,255,255,${opacity.light})`,
      blur: 'blur(20px)',
    },
    /** Dark glass - for use on light backgrounds */
    dark: {
      bg: `rgba(0,0,0,${opacity.overlay})`,
      border: `rgba(255,255,255,${opacity.soft})`,
      blur: 'blur(20px)',
    },
    /** Frosted glass - more visible */
    frosted: {
      bg: `rgba(255,255,255,${opacity.soft})`,
      border: `rgba(255,255,255,${opacity.medium})`,
      blur: 'blur(24px) saturate(180%)',
    },
  },

  /** Hero section overlays */
  hero: {
    /** Standard hero gradient overlay */
    gradient: `linear-gradient(to bottom, rgba(0,0,0,${opacity.soft}) 0%, rgba(0,0,0,${opacity.prominent}) 60%, rgba(0,0,0,${opacity.heavy}) 100%)`,
    /** Subtle gradient for lighter content */
    subtle: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,${opacity.overlay}) 100%)`,
    /** Strong gradient for text overlay */
    strong: `linear-gradient(to bottom, transparent 40%, rgba(0,0,0,${opacity.intense}) 100%)`,
  },

  /** Tooltip backgrounds */
  tooltip: {
    light: `rgba(255,255,255,${opacity.tooltip})`,
    dark: `rgba(30,41,59,${opacity.tooltip})`,
  },

  /** Modal/sheet backdrops */
  backdrop: {
    modal: `rgba(0,0,0,${opacity.half})`,
    sheet: `rgba(0,0,0,${opacity.prominent})`,
    heavy: `rgba(0,0,0,${opacity.intense})`,
  },

  /** Category/Pill button states */
  pill: {
    active: {
      bg: `rgba(255,255,255,${opacity.regular})`,
      border: `rgba(255,255,255,${opacity.near})`,
    },
    inactive: {
      bg: 'transparent',
      border: `rgba(255,255,255,${opacity.half})`,
    },
    hover: {
      bg: `rgba(255,255,255,${opacity.soft})`,
    },
  },

  /** Text overlays with various opacity levels */
  text: {
    primary: `rgba(255,255,255,${opacity.solid})`,
    secondary: `rgba(255,255,255,${opacity.muted})`,
    tertiary: `rgba(255,255,255,${opacity.half})`,
    hint: `rgba(255,255,255,${opacity.strong})`,
  },
} as const;

// =============================================================================
// GLASS STYLE PRESETS (sx-ready objects)
// =============================================================================

export const glassStyle = {
  /** Light glass effect - use on dark backgrounds */
  light: {
    bgcolor: overlays.glass.light.bg,
    backdropFilter: overlays.glass.light.blur,
    WebkitBackdropFilter: overlays.glass.light.blur,
    border: '1px solid',
    borderColor: overlays.glass.light.border,
  },

  /** Dark glass effect - use on light backgrounds */
  dark: {
    bgcolor: overlays.glass.dark.bg,
    backdropFilter: overlays.glass.dark.blur,
    WebkitBackdropFilter: overlays.glass.dark.blur,
    border: '1px solid',
    borderColor: overlays.glass.dark.border,
  },

  /** Frosted glass effect - more visible blur */
  frosted: {
    bgcolor: overlays.glass.frosted.bg,
    backdropFilter: overlays.glass.frosted.blur,
    WebkitBackdropFilter: overlays.glass.frosted.blur,
    border: '1px solid',
    borderColor: overlays.glass.frosted.border,
  },
} as const;

// =============================================================================
// THUMBNAIL/SELECTION STATES
// =============================================================================

export const thumbnailStates = {
  /** Active/selected thumbnail */
  active: {
    border: `2px solid rgba(255,255,255,${opacity.near})`,
    boxShadow: `0 0 0 1px rgba(0,0,0,${opacity.regular})`,
  },
  /** Inactive thumbnail */
  inactive: {
    border: `2px solid rgba(255,255,255,${opacity.half})`,
    boxShadow: 'none',
  },
  /** Hover state */
  hover: {
    border: `2px solid rgba(255,255,255,${opacity.intense})`,
  },
} as const;
