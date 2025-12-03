/**
 * Design System Tokens - Main Export
 * "Emerald iOS" Design System
 *
 * Central export point for all design tokens.
 * Import from here to access the complete token system.
 */

// Primitives
import { primitiveColors } from './primitives/colors';
import { typography, fontFamilies, fontWeights, iosTextStyles, customTextStyles } from './primitives/typography';
import { spacingSystem, spacing, iosDimensions, safeAreaInsets, containerWidths, gridSystems } from './primitives/spacing';
import { motion, easingCurves, durations, springPresets, transitions, keyframes, staggerDelays } from './primitives/motion';
import { shadows, lightShadows, darkShadows, coloredShadows, innerShadows, componentShadows, textShadows } from './primitives/shadows';

// Semantics
import { brand, brandColors, brandGradients, statusColors, inventoryStatus } from './semantic/brand';
import { surface, surfaceBackgrounds, elevatedSurfaces, glassSurfaces, borderColors, overlayBackgrounds, backdropFilters } from './semantic/surface';
import { text, textColors, brandText, statusText, linkColors, placeholderText, inverseText } from './semantic/text';
import { interactive, interactionStates, buttonStates, inputStates, cardStates, toggleStates, selectionStates, listItemStates } from './semantic/interactive';
import { document, documentColors, goldColors, documentShadows, documentTypography, logoConfig } from './semantic/document';

// Re-export everything
export { primitiveColors, typography, fontFamilies, fontWeights, iosTextStyles, customTextStyles };
export { spacingSystem, spacing, iosDimensions, safeAreaInsets, containerWidths, gridSystems };
export { motion, easingCurves, durations, springPresets, transitions, keyframes, staggerDelays };
export { shadows, lightShadows, darkShadows, coloredShadows, innerShadows, componentShadows, textShadows };
export { brand, brandColors, brandGradients, statusColors, inventoryStatus };
export { surface, surfaceBackgrounds, elevatedSurfaces, glassSurfaces, borderColors, overlayBackgrounds, backdropFilters };
export { text, textColors, brandText, statusText, linkColors, placeholderText, inverseText };
export { interactive, interactionStates, buttonStates, inputStates, cardStates, toggleStates, selectionStates, listItemStates };
export { document, documentColors, goldColors, documentShadows, documentTypography, logoConfig };

// Types
export type { PrimitiveColors } from './primitives/colors';
export type { Typography } from './primitives/typography';
export type { SpacingSystem } from './primitives/spacing';
export type { Motion } from './primitives/motion';
export type { Shadows } from './primitives/shadows';
export type { Brand } from './semantic/brand';
export type { Surface } from './semantic/surface';
export type { Text } from './semantic/text';
export type { Interactive } from './semantic/interactive';
export type { Document } from './semantic/document';

/**
 * Complete Token System
 * Organized export of all tokens
 */
export const tokens = {
  // Primitives
  colors: primitiveColors,
  typography,
  spacing: spacingSystem,
  motion,
  shadows,

  // Semantics
  brand,
  surface,
  text,
  interactive,
  document,
} as const;

export type Tokens = typeof tokens;
