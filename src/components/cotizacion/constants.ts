/**
 * Cotizacion Constants
 * Shared colors and configuration for quotation components.
 *
 * NOTE: For theme-aware text colors in components, prefer using MUI palette strings:
 * - 'text.primary' instead of brandColors.textPrimary
 * - 'text.secondary' instead of brandColors.textSecondary / gray
 * - 'text.disabled' instead of brandColors.textMuted
 * These automatically adapt to light/dark mode.
 */

import {
  documentColors,
  goldColors,
  primitiveColors,
} from '../../design-system/tokens';
import { brand, lightTokens, darkTokens, accentColors } from '../../design-system';

export const brandColors = {
  // Primary emerald colors
  emerald: documentColors.emerald.primary,
  emeraldDark: documentColors.emerald.deep,
  emeraldLight: documentColors.emerald.light,

  // Gold accent colors
  gold: documentColors.gold.primary,
  goldLight: documentColors.gold.light,
  goldDark: goldColors[600], // #B8960F - for hover states

  // Background colors
  background: documentColors.background.container,
  cream: documentColors.background.paper,
  surfaceElevated: lightTokens.background.muted,

  // Text colors (light mode defaults - use 'text.secondary' for theme-aware)
  textPrimary: documentColors.text.primary,
  textSecondary: lightTokens.text.secondary,
  textMuted: lightTokens.text.muted,
  gray: documentColors.text.secondary,

  // Border colors
  border: documentColors.border.default,
  borderSubtle: documentColors.border.subtle,

  // Utility colors
  lightGray: lightTokens.background.muted,
  white: lightTokens.background.surface,

  // Semantic colors
  error: accentColors.error.light,

  // Primitives for specific use cases
  emerald600: primitiveColors.emerald[600], // #059669
  emerald700: primitiveColors.emerald[700], // #047857

  // Brand palette for more colors
  emeraldPalette: brand.emerald,
  goldPalette: brand.gold,
  slatePalette: brand.slate,
};

// Dark mode variants for explicit dark mode usage
export const darkBrandColors = {
  textPrimary: darkTokens.text.primary,
  textSecondary: darkTokens.text.secondary,
  textMuted: darkTokens.text.muted,
  background: darkTokens.background.app,
  surfaceElevated: darkTokens.background.elevated,
  border: darkTokens.border.default,
  borderSubtle: darkTokens.border.light,
};

export type BrandColors = typeof brandColors;
