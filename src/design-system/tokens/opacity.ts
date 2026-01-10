/**
 * Opacity Tokens
 *
 * Standard opacity levels for consistent transparency across the app.
 * These replace hardcoded rgba opacity values for maintainability.
 *
 * Usage:
 *   import { opacity } from '../design-system/tokens/opacity';
 *   background: `rgba(255,255,255,${opacity.light})`;
 */

export const opacity = {
  /** 0 - Fully transparent */
  transparent: 0,

  /** 0.03 - Barely visible, ultra-subtle backgrounds */
  whisper: 0.03,

  /** 0.05 - Very subtle hover states */
  subtle: 0.05,

  /** 0.06 - Glass effect backgrounds (iOS style) */
  glass: 0.06,

  /** 0.08 - Light borders, separators */
  light: 0.08,

  /** 0.1 - Soft overlays, inactive states */
  soft: 0.1,

  /** 0.12 - Grid lines, subtle guides */
  guide: 0.12,

  /** 0.15 - Medium backgrounds, badges */
  medium: 0.15,

  /** 0.2 - Regular overlays, active pill backgrounds */
  regular: 0.2,

  /** 0.25 - Stronger overlays, shadows */
  elevated: 0.25,

  /** 0.3 - Notable overlays */
  prominent: 0.3,

  /** 0.35 - Strong overlays, text secondary */
  strong: 0.35,

  /** 0.4 - Dark overlays */
  overlay: 0.4,

  /** 0.5 - Half opacity, modals backdrop */
  half: 0.5,

  /** 0.6 - Secondary text on dark backgrounds */
  muted: 0.6,

  /** 0.7 - Prominent text/elements */
  intense: 0.7,

  /** 0.8 - Near-solid overlays */
  heavy: 0.8,

  /** 0.85 - Primary text on overlays */
  solid: 0.85,

  /** 0.9 - Nearly opaque */
  near: 0.9,

  /** 0.95 - Tooltip backgrounds */
  tooltip: 0.95,

  /** 1 - Fully opaque */
  opaque: 1,
} as const;

export type OpacityLevel = keyof typeof opacity;
