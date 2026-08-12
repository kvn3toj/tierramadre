/**
 * Semantic Brand Tokens
 * "Emerald iOS" Design System
 *
 * Purpose-driven color tokens for brand identity.
 * Uses primitive colors to create consistent brand experience.
 */

import { primitiveColors } from '../primitives/colors';

/**
 * Brand Colors
 * Core brand identity colors for both themes
 */
export const brandColors = {
  /**
   * Primary Brand Color - Emerald Green
   * Main brand identity, CTAs, primary actions
   */
  primary: {
    light: primitiveColors.emerald[500],  // #00C992
    dark: primitiveColors.emerald[400],   // Slightly brighter for dark mode
  },

  /**
   * Primary Hover State
   */
  primaryHover: {
    light: primitiveColors.emerald[600],
    dark: primitiveColors.emerald[300],
  },

  /**
   * Primary Active/Pressed State
   */
  primaryActive: {
    light: primitiveColors.emerald[700],
    dark: primitiveColors.emerald[500],
  },

  /**
   * Primary Subtle - Background tints
   */
  primarySubtle: {
    light: primitiveColors.emerald[50],
    dark: primitiveColors.emerald[900],
  },

  /**
   * Secondary - Metallic Silver
   * Accents, secondary actions
   */
  secondary: {
    light: primitiveColors.metallic.silver[500],
    dark: primitiveColors.metallic.silver[400],
  },

  /**
   * Accent - Light Emerald
   * Highlights, notifications
   */
  accent: {
    light: primitiveColors.emerald[300],
    dark: primitiveColors.emerald[200],
  },
} as const;

/**
 * Brand Gradients
 * Emerald and metallic gradients for premium effects
 */
export const brandGradients = {
  /**
   * Primary Emerald Gradient
   * Use for primary buttons, hero sections
   */
  emerald: {
    light: `linear-gradient(135deg, ${primitiveColors.emerald[400]} 0%, ${primitiveColors.emerald[500]} 50%, ${primitiveColors.emerald[600]} 100%)`,
    dark: `linear-gradient(135deg, ${primitiveColors.emerald[300]} 0%, ${primitiveColors.emerald[400]} 50%, ${primitiveColors.emerald[500]} 100%)`,
  },

  /**
   * Silver Shimmer Gradient
   * Use for secondary elements, metallic effects
   */
  silver: {
    light: `linear-gradient(90deg, ${primitiveColors.metallic.silver[300]} 0%, ${primitiveColors.metallic.silver[100]} 50%, ${primitiveColors.metallic.silver[300]} 100%)`,
    dark: `linear-gradient(90deg, ${primitiveColors.metallic.silver[600]} 0%, ${primitiveColors.metallic.silver[400]} 50%, ${primitiveColors.metallic.silver[600]} 100%)`,
  },

  /**
   * Emerald Radial - Spotlight effect
   */
  emeraldRadial: {
    light: `radial-gradient(circle at top right, ${primitiveColors.emerald[100]} 0%, transparent 70%)`,
    dark: `radial-gradient(circle at top right, ${primitiveColors.emerald[900]} 0%, transparent 70%)`,
  },
} as const;

/**
 * Status Colors
 * Semantic feedback colors
 */
export const statusColors = {
  /**
   * Success - Green
   */
  success: {
    light: primitiveColors.system.green.light,
    dark: primitiveColors.system.green.dark,
  },

  /**
   * Warning - Orange/Yellow
   */
  warning: {
    light: primitiveColors.system.orange.light,
    dark: primitiveColors.system.orange.dark,
  },

  /**
   * Error - Red
   */
  error: {
    light: primitiveColors.system.red.light,
    dark: primitiveColors.system.red.dark,
  },

  /**
   * Info - Blue
   */
  info: {
    light: primitiveColors.system.blue.light,
    dark: primitiveColors.system.blue.dark,
  },
} as const;

/**
 * Treasure Status Colors
 * For emerald availability states
 */
export const treasureStatus = {
  /**
   * Available - Emerald green
   */
  available: {
    light: primitiveColors.emerald[500],
    dark: primitiveColors.emerald[400],
  },

  /**
   * Reserved - Gold/Yellow
   */
  reserved: {
    light: primitiveColors.system.yellow.light,
    dark: primitiveColors.system.yellow.dark,
  },

  /**
   * Sold - Red
   */
  sold: {
    light: primitiveColors.system.red.light,
    dark: primitiveColors.system.red.dark,
  },
} as const;

/**
 * Combined Brand Semantic Tokens
 */
export const brand = {
  colors: brandColors,
  gradients: brandGradients,
  status: statusColors,
  treasure: treasureStatus,
} as const;

export type Brand = typeof brand;
