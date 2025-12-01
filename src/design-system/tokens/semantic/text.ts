/**
 * Semantic Text Tokens
 * "Emerald iOS" Design System
 *
 * Text color hierarchy for readability and accessibility.
 * Follows iOS label color system.
 */

import { primitiveColors } from '../primitives/colors';

/**
 * Text Colors
 * iOS label hierarchy (primary → secondary → tertiary → quaternary)
 */
export const textColors = {
  /**
   * Primary Text
   * Main content, headlines, body text
   * WCAG AA contrast: 21:1 (light), 21:1 (dark)
   */
  primary: {
    light: primitiveColors.surfaces.dark.primary,     // #000000
    dark: primitiveColors.surfaces.light.primary,     // #FFFFFF
  },

  /**
   * Secondary Text
   * Supporting information, captions, metadata
   * 60% opacity of primary
   */
  secondary: {
    light: primitiveColors.metallic.silver[700],      // #3A4654
    dark: primitiveColors.metallic.silver[300],       // #B4BFC9
  },

  /**
   * Tertiary Text
   * De-emphasized information, placeholders
   * 30% opacity of primary
   */
  tertiary: {
    light: primitiveColors.metallic.silver[500],      // #6B7A8A
    dark: primitiveColors.metallic.silver[500],       // #6B7A8A
  },

  /**
   * Disabled Text
   * Inactive elements, disabled states
   * 40% opacity
   */
  disabled: {
    light: primitiveColors.metallic.silver[400],
    dark: primitiveColors.metallic.silver[600],
  },
} as const;

/**
 * Brand Text Colors
 * Text using brand colors
 */
export const brandText = {
  /**
   * Emerald Text
   * Links, CTAs, brand accents
   */
  emerald: {
    light: primitiveColors.emerald[500],
    dark: primitiveColors.emerald[400],
  },

  /**
   * On Emerald
   * Text on emerald backgrounds (always high contrast)
   */
  onEmerald: {
    light: primitiveColors.surfaces.light.primary,
    dark: primitiveColors.surfaces.light.primary,
  },

  /**
   * On Dark
   * Text on dark backgrounds
   */
  onDark: {
    light: primitiveColors.surfaces.light.primary,
    dark: primitiveColors.surfaces.light.primary,
  },

  /**
   * On Light
   * Text on light backgrounds
   */
  onLight: {
    light: primitiveColors.surfaces.dark.primary,
    dark: primitiveColors.surfaces.dark.primary,
  },
} as const;

/**
 * Status Text Colors
 * Semantic feedback text colors
 */
export const statusText = {
  /**
   * Success Text
   */
  success: {
    light: primitiveColors.system.green.light,
    dark: primitiveColors.system.green.dark,
  },

  /**
   * Warning Text
   */
  warning: {
    light: primitiveColors.system.orange.light,
    dark: primitiveColors.system.orange.dark,
  },

  /**
   * Error Text
   */
  error: {
    light: primitiveColors.system.red.light,
    dark: primitiveColors.system.red.dark,
  },

  /**
   * Info Text
   */
  info: {
    light: primitiveColors.system.blue.light,
    dark: primitiveColors.system.blue.dark,
  },
} as const;

/**
 * Link Colors
 * Interactive text (links, buttons)
 */
export const linkColors = {
  /**
   * Default Link
   */
  default: {
    light: primitiveColors.emerald[500],
    dark: primitiveColors.emerald[400],
  },

  /**
   * Hover State
   */
  hover: {
    light: primitiveColors.emerald[600],
    dark: primitiveColors.emerald[300],
  },

  /**
   * Active/Pressed State
   */
  active: {
    light: primitiveColors.emerald[700],
    dark: primitiveColors.emerald[500],
  },

  /**
   * Visited Link
   */
  visited: {
    light: primitiveColors.emerald[700],
    dark: primitiveColors.emerald[600],
  },
} as const;

/**
 * Placeholder Text
 * Input placeholders, empty states
 */
export const placeholderText = {
  light: primitiveColors.metallic.silver[400],
  dark: primitiveColors.metallic.silver[600],
} as const;

/**
 * Inverse Text
 * Text on colored backgrounds
 */
export const inverseText = {
  /**
   * Always White
   */
  alwaysWhite: primitiveColors.surfaces.light.primary,

  /**
   * Always Black
   */
  alwaysBlack: primitiveColors.surfaces.dark.primary,
} as const;

/**
 * Combined Text Semantic Tokens
 */
export const text = {
  color: textColors,
  brand: brandText,
  status: statusText,
  link: linkColors,
  placeholder: placeholderText,
  inverse: inverseText,
} as const;

export type Text = typeof text;
