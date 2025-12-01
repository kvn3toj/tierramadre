/**
 * Semantic Surface Tokens
 * "Emerald iOS" Design System
 *
 * Background colors and container surfaces for both light and dark themes.
 * Follows iOS system background hierarchy.
 */

import { primitiveColors } from '../primitives/colors';

/**
 * Surface Backgrounds
 * iOS system background hierarchy (primary → secondary → tertiary)
 */
export const surfaceBackgrounds = {
  /**
   * Primary Background
   * Main app background, base layer
   */
  primary: {
    light: primitiveColors.surfaces.light.primary,    // #FFFFFF
    dark: primitiveColors.surfaces.dark.primary,      // #000000
  },

  /**
   * Secondary Background
   * Grouped content background, cards
   */
  secondary: {
    light: primitiveColors.surfaces.light.secondary,  // #F2F2F7 (iOS)
    dark: primitiveColors.surfaces.dark.secondary,    // #1C1C1E (iOS)
  },

  /**
   * Tertiary Background
   * Nested grouped content, inset areas
   */
  tertiary: {
    light: primitiveColors.surfaces.light.tertiary,   // #FAFAFA
    dark: primitiveColors.surfaces.dark.tertiary,     // #0A0E13
  },
} as const;

/**
 * Elevated Surfaces
 * Surfaces that appear above the background (cards, modals)
 */
export const elevatedSurfaces = {
  /**
   * Card Surface
   * Standard card background
   */
  card: {
    light: primitiveColors.surfaces.light.primary,    // #FFFFFF
    dark: primitiveColors.surfaces.dark.secondary,    // #1C1C1E
  },

  /**
   * Modal/Dialog Surface
   * Overlay surfaces
   */
  modal: {
    light: primitiveColors.surfaces.light.primary,
    dark: primitiveColors.surfaces.dark.secondary,
  },

  /**
   * Popover Surface
   * Floating menus, tooltips
   */
  popover: {
    light: primitiveColors.surfaces.light.primary,
    dark: primitiveColors.surfaces.dark.secondary,
  },

  /**
   * Navigation Bar Surface
   * Top navigation background
   */
  navbar: {
    light: primitiveColors.surfaces.light.primary,
    dark: primitiveColors.surfaces.dark.primary,
  },

  /**
   * Tab Bar Surface
   * Bottom navigation background
   */
  tabbar: {
    light: primitiveColors.surfaces.light.secondary,
    dark: primitiveColors.surfaces.dark.secondary,
  },
} as const;

/**
 * Glassmorphic Surfaces
 * iOS-style frosted glass effects with backdrop blur
 */
export const glassSurfaces = {
  /**
   * Light Glass
   * Subtle blur, high transparency
   */
  light: {
    light: primitiveColors.overlays.light.subtle,     // rgba(255,255,255,0.7)
    dark: primitiveColors.overlays.dark.subtle,       // rgba(0,0,0,0.5)
  },

  /**
   * Medium Glass
   * Standard blur, medium transparency
   */
  medium: {
    light: primitiveColors.overlays.light.medium,     // rgba(255,255,255,0.85)
    dark: primitiveColors.overlays.dark.medium,       // rgba(0,0,0,0.7)
  },

  /**
   * Strong Glass
   * Heavy blur, low transparency
   */
  strong: {
    light: primitiveColors.overlays.light.strong,     // rgba(255,255,255,0.95)
    dark: primitiveColors.overlays.dark.strong,       // rgba(0,0,0,0.85)
  },
} as const;

/**
 * Border Colors
 * Separators and dividers
 */
export const borderColors = {
  /**
   * Default Border
   * Standard dividers, card borders
   */
  default: {
    light: primitiveColors.metallic.silver[200],
    dark: primitiveColors.metallic.silver[800],
  },

  /**
   * Subtle Border
   * Very light separation
   */
  subtle: {
    light: primitiveColors.metallic.silver[100],
    dark: primitiveColors.metallic.silver[900],
  },

  /**
   * Strong Border
   * Emphasized borders
   */
  strong: {
    light: primitiveColors.metallic.silver[300],
    dark: primitiveColors.metallic.silver[700],
  },

  /**
   * Focus Border
   * Active/focused element border
   */
  focus: {
    light: primitiveColors.emerald[500],
    dark: primitiveColors.emerald[400],
  },
} as const;

/**
 * Overlay Backgrounds
 * Full-screen overlays, modals, sheets
 */
export const overlayBackgrounds = {
  /**
   * Modal Backdrop
   * Semi-transparent overlay behind modals
   */
  modal: {
    light: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.75)',
  },

  /**
   * Sheet Backdrop
   * iOS bottom sheet overlay
   */
  sheet: {
    light: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },

  /**
   * Alert Backdrop
   * Alert dialog overlay
   */
  alert: {
    light: 'rgba(0, 0, 0, 0.4)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

/**
 * Backdrop Filters
 * CSS backdrop-filter values for glassmorphism
 */
export const backdropFilters = {
  /**
   * Light Blur
   */
  light: 'blur(10px) saturate(180%)',

  /**
   * Medium Blur
   */
  medium: 'blur(20px) saturate(180%)',

  /**
   * Heavy Blur
   */
  heavy: 'blur(40px) saturate(200%)',

  /**
   * iOS Standard
   * Default iOS blur effect
   */
  ios: 'blur(20px) saturate(180%)',
} as const;

/**
 * Combined Surface Semantic Tokens
 */
export const surface = {
  background: surfaceBackgrounds,
  elevated: elevatedSurfaces,
  glass: glassSurfaces,
  border: borderColors,
  overlay: overlayBackgrounds,
  backdropFilter: backdropFilters,
} as const;

export type Surface = typeof surface;
