/**
 * PDF Color Utilities
 * "Emerald iOS" Design System → jsPDF Integration
 *
 * Converts design tokens to jsPDF RGB values for consistent PDF styling.
 */

import type jsPDF from 'jspdf';
import { primitiveColors } from '../../../design-system/tokens/primitives/colors';

/**
 * RGB Color Tuple [r, g, b]
 * Values range from 0-255
 */
export type RGB = [number, number, number];

/**
 * Theme Mode
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Convert hex color to RGB tuple
 *
 * @param hex - Hex color string (e.g., "#00C992" or "00C992")
 * @returns RGB tuple [r, g, b] with values 0-255
 *
 * @example
 * hexToRgb('#00C992') // [0, 201, 146]
 * hexToRgb('FFFFFF') // [255, 255, 255]
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse hex to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return [r, g, b];
}

/**
 * Convert RGBA string to RGB tuple (ignores alpha)
 *
 * @param rgba - RGBA string (e.g., "rgba(255, 255, 255, 0.7)")
 * @returns RGB tuple [r, g, b] with values 0-255
 */
export function rgbaToRgb(rgba: string): RGB {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) {
    throw new Error(`Invalid RGBA string: ${rgba}`);
  }

  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

/**
 * Get themed color palette for PDF generation
 *
 * @param mode - Theme mode ('light' or 'dark')
 * @returns Object with all themed colors as RGB tuples
 *
 * @example
 * const colors = getThemeColors('light');
 * pdf.setFillColor(...colors.emeraldPrimary);
 */
export function getThemeColors(mode: ThemeMode) {
  return {
    // Brand Colors (Emerald)
    emeraldPrimary: hexToRgb(primitiveColors.emerald[500]), // #00C992
    emeraldLight: hexToRgb(primitiveColors.emerald[400]), // #33FFBF
    emeraldDark: hexToRgb(primitiveColors.emerald[600]), // #008C62
    emeraldGlow: hexToRgb(primitiveColors.emerald[200]), // #99FFE0
    emeraldWhisper: hexToRgb(primitiveColors.emerald[50]), // #E6FFF7

    // Backgrounds
    background:
      mode === 'dark'
        ? hexToRgb(primitiveColors.surfaces.dark.primary) // #000000
        : hexToRgb(primitiveColors.surfaces.light.primary), // #FFFFFF

    backgroundSecondary:
      mode === 'dark'
        ? hexToRgb(primitiveColors.surfaces.dark.secondary) // #1C1C1E
        : hexToRgb(primitiveColors.surfaces.light.secondary), // #F2F2F7

    backgroundTertiary:
      mode === 'dark'
        ? hexToRgb(primitiveColors.surfaces.dark.tertiary) // #0A0E13
        : hexToRgb(primitiveColors.surfaces.light.tertiary), // #FAFAFA

    // Cards & Elevated Surfaces
    card:
      mode === 'dark'
        ? hexToRgb(primitiveColors.surfaces.dark.secondary) // #1C1C1E
        : hexToRgb(primitiveColors.surfaces.light.primary), // #FFFFFF

    // Text Colors
    textPrimary:
      mode === 'dark'
        ? hexToRgb(primitiveColors.surfaces.light.primary) // #FFFFFF
        : hexToRgb(primitiveColors.surfaces.dark.primary), // #000000

    textSecondary:
      mode === 'dark'
        ? hexToRgb(primitiveColors.metallic.silver[300]) // #B4BFC9
        : hexToRgb(primitiveColors.metallic.silver[700]), // #3A4654

    textTertiary: hexToRgb(primitiveColors.metallic.silver[500]), // #6B7A8A (same both modes)

    textDisabled:
      mode === 'dark'
        ? hexToRgb(primitiveColors.metallic.silver[600]) // #515F6E
        : hexToRgb(primitiveColors.metallic.silver[400]), // #8A99A8

    // Text on Emerald (always white for contrast)
    textOnEmerald: hexToRgb(primitiveColors.surfaces.light.primary), // #FFFFFF

    // Borders
    border:
      mode === 'dark'
        ? hexToRgb(primitiveColors.metallic.silver[800]) // #252E3B
        : hexToRgb(primitiveColors.metallic.silver[200]), // #D1D9E0

    borderSubtle:
      mode === 'dark'
        ? hexToRgb(primitiveColors.metallic.silver[900]) // #121821
        : hexToRgb(primitiveColors.metallic.silver[100]), // #E8ECEF

    borderStrong:
      mode === 'dark'
        ? hexToRgb(primitiveColors.metallic.silver[700]) // #3A4654
        : hexToRgb(primitiveColors.metallic.silver[300]), // #B4BFC9

    // Status Colors
    success:
      mode === 'dark'
        ? hexToRgb(primitiveColors.system.green.dark) // #32D74B
        : hexToRgb(primitiveColors.system.green.light), // #34C759

    warning:
      mode === 'dark'
        ? hexToRgb(primitiveColors.system.orange.dark) // #FF9F0A
        : hexToRgb(primitiveColors.system.orange.light), // #FF9500

    error:
      mode === 'dark'
        ? hexToRgb(primitiveColors.system.red.dark) // #FF453A
        : hexToRgb(primitiveColors.system.red.light), // #FF3B30

    info:
      mode === 'dark'
        ? hexToRgb(primitiveColors.system.blue.dark) // #0A84FF
        : hexToRgb(primitiveColors.system.blue.light), // #007AFF

    // Metallic Silver Accents
    silver: {
      100: hexToRgb(primitiveColors.metallic.silver[100]), // #E8ECEF
      200: hexToRgb(primitiveColors.metallic.silver[200]), // #D1D9E0
      300: hexToRgb(primitiveColors.metallic.silver[300]), // #B4BFC9
      500: hexToRgb(primitiveColors.metallic.silver[500]), // #6B7A8A
      700: hexToRgb(primitiveColors.metallic.silver[700]), // #3A4654
      900: hexToRgb(primitiveColors.metallic.silver[900]), // #121821
    },
  };
}

/**
 * Set fill color in jsPDF from design token
 *
 * @param pdf - jsPDF instance
 * @param color - RGB tuple [r, g, b]
 *
 * @example
 * const colors = getThemeColors('light');
 * setFillColor(pdf, colors.emeraldPrimary);
 * pdf.rect(10, 10, 50, 50, 'F');
 */
export function setFillColor(pdf: jsPDF, color: RGB): void {
  pdf.setFillColor(color[0], color[1], color[2]);
}

/**
 * Set stroke (line) color in jsPDF from design token
 *
 * @param pdf - jsPDF instance
 * @param color - RGB tuple [r, g, b]
 */
export function setStrokeColor(pdf: jsPDF, color: RGB): void {
  pdf.setDrawColor(color[0], color[1], color[2]);
}

/**
 * Set text color in jsPDF from design token
 *
 * @param pdf - jsPDF instance
 * @param color - RGB tuple [r, g, b]
 */
export function setTextColor(pdf: jsPDF, color: RGB): void {
  pdf.setTextColor(color[0], color[1], color[2]);
}

/**
 * Apply emerald accent to PDF element
 * Shorthand for setting emerald fill color
 *
 * @param pdf - jsPDF instance
 * @param mode - Theme mode
 */
export function applyEmeraldAccent(
  pdf: jsPDF,
  mode: ThemeMode = 'light',
): void {
  const colors = getThemeColors(mode);
  setFillColor(pdf, colors.emeraldPrimary);
}

/**
 * Apply card background color
 *
 * @param pdf - jsPDF instance
 * @param mode - Theme mode
 */
export function applyCardBackground(
  pdf: jsPDF,
  mode: ThemeMode = 'light',
): void {
  const colors = getThemeColors(mode);
  setFillColor(pdf, colors.card);
}
