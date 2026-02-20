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
import {
  geometry,
  PHI,
  PHI_INVERSE,
  fibonacci,
  goldenScale,
  harmonicRatios,
  aspectRatios,
  sacredAngles,
  emeraldCut,
  emeraldRadius,
  goldenSpacing,
  goldenTypeScale,
  goldenContainers,
  goldenKeyframes,
  goldenGrid,
  goldenMultiple,
  getFibonacci,
  goldenSplit,
} from './primitives/geometry';

// Migrated tokens (sacred brand & motion)
import { brandTokens, colors as sacredColors, typography as sacredTypography, geometry as sacredGeometry } from './brand';
import { motionTokens, cssTransition, duration as animDuration, easing as animEasing, spring as animSpring, cardVariants, fadeInUp, staggerContainer, staggerItem, scaleIn } from './motion';

// New canonical tokens (migrated from legacy design-system.ts)
import { accentColors, medalColors, getAccentColor } from './accents';
import { iosSemanticColors, getIOSColor } from './ios-semantic';
import { iosTypographyScale } from './ios-typography';
import { layoutConstants, radius } from './layout';

// Legacy palette tokens (migrated from monolithic design-system.ts)
import {
  brand as brandPalette,
  lightTokens, darkTokens,
  gradients as compatGradients,
  legacyTypography,
  getTokens,
  studioColors, studioGradients, studioShadows, studioCardStyles,
  animation, disabledButton,
} from './legacy-compat';

// Semantics
import { brand, brandColors, brandGradients, statusColors, treasureStatus } from './semantic/brand';
import { surface, surfaceBackgrounds, elevatedSurfaces, glassSurfaces, borderColors, overlayBackgrounds, backdropFilters } from './semantic/surface';
import { text, textColors, brandText, statusText, linkColors, placeholderText, inverseText } from './semantic/text';
import { interactive, interactionStates, buttonStates, inputStates, cardStates, toggleStates, selectionStates, listItemStates } from './semantic/interactive';
import { document, documentColors, goldColors, documentShadows, documentTypography, logoConfig } from './semantic/document';

// Re-export everything
export { primitiveColors, typography, fontFamilies, fontWeights, iosTextStyles, customTextStyles };
export { spacingSystem, spacing, iosDimensions, safeAreaInsets, containerWidths, gridSystems };
export { motion, easingCurves, durations, springPresets, transitions, keyframes, staggerDelays };
export { shadows, lightShadows, darkShadows, coloredShadows, innerShadows, componentShadows, textShadows };
export {
  geometry,
  PHI,
  PHI_INVERSE,
  fibonacci,
  goldenScale,
  harmonicRatios,
  aspectRatios,
  sacredAngles,
  emeraldCut,
  emeraldRadius,
  goldenSpacing,
  goldenTypeScale,
  goldenContainers,
  goldenKeyframes,
  goldenGrid,
  goldenMultiple,
  getFibonacci,
  goldenSplit,
};
export { brandColors, brandGradients, statusColors, treasureStatus };
export { surface, surfaceBackgrounds, elevatedSurfaces, glassSurfaces, borderColors, overlayBackgrounds, backdropFilters };
export { text, textColors, brandText, statusText, linkColors, placeholderText, inverseText };
export { interactive, interactionStates, buttonStates, inputStates, cardStates, toggleStates, selectionStates, listItemStates };
export { document, documentColors, goldColors, documentShadows, documentTypography, logoConfig };

// Migrated tokens exports
export { brandTokens, sacredColors, sacredTypography, sacredGeometry };
export { motionTokens, cssTransition, animDuration, animEasing, animSpring, cardVariants, fadeInUp, staggerContainer, staggerItem, scaleIn };

// New canonical tokens exports
export { accentColors, medalColors, getAccentColor };
export { iosSemanticColors, getIOSColor };
export { iosTypographyScale };
export { layoutConstants, radius };

// Legacy palette tokens (consumers should migrate to canonical tokens)
export { brandPalette as brand, lightTokens, darkTokens };
export { compatGradients as legacyGradients, legacyTypography, getTokens };
export { studioColors, studioGradients, studioShadows, studioCardStyles };
export { animation, disabledButton };

// Types
export type { PrimitiveColors } from './primitives/colors';
export type { Typography } from './primitives/typography';
export type { SpacingSystem } from './primitives/spacing';
export type { Motion } from './primitives/motion';
export type { Shadows } from './primitives/shadows';
export type { Geometry } from './primitives/geometry';
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
  geometry,

  // Semantics
  brand,
  surface,
  text,
  interactive,
  document,
} as const;

export type Tokens = typeof tokens;
