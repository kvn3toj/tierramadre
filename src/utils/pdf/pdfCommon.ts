/**
 * PDF Common Utilities
 * Shared constants, helpers, and interfaces for PDF generation.
 *
 * Extracted from pdfGenerator.ts for modularity.
 */

import type jsPDF from 'jspdf';
import { Emerald } from '../../types';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CatalogOptions {
  title?: string;
  showPrices: boolean;
  showWeights: boolean;
  showLotCodes: boolean;
  layout: 'grid' | 'list' | 'carousel';
  logoBase64?: string;
  theme?: 'dark' | 'light';
  /** Currency mode for price display */
  currency?: 'COP' | 'USD';
  /** Price conversion function (COP -> target currency) */
  convertPrice?: (precioCOP: number) => number;
}

// Re-export Emerald so downstream modules don't need a separate import
export type { Emerald };

// =============================================================================
// BRAND COLORS
// =============================================================================

/** Tierra Madre Brand Colors - Premium Jewelry Palette */
export const BRAND = {
  // Primary emerald green (brand color)
  emeraldGreen: '#00C992',
  emeraldDark: '#008F63',
  emeraldLight: '#00C98C',
  emeraldGlow: '#00D4A0',
  // Cool silver metallic (blue-tinted to avoid gold appearance)
  silver: '#B8C4CE',
  silverLight: '#D0D8E0',
  silverDark: '#8A9AAA',
  platinum: '#E8ECF0',
  // Dark backgrounds
  darkBg: '#080A0C',
  charcoal: '#0C0E10',
  surface: '#151719',
  // Light tones
  white: '#FFFFFF',
  offWhite: '#F5F7F9',
  cream: '#FAFBFC',
  // Grays
  lightGray: '#A0ACB8',
  mediumGray: '#687080',
  darkGray: '#252830',
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Logo aspect ratios (width ÷ height).
 *
 * The bare mark is SQUARE. This was 2.0 for a 1888×1888 asset, which stretched
 * the mark 2:1 on every PDF it touched.
 *
 * The lockup is the brand manual's "auxiliar" (vertical) lockup — mark above
 * the wordmark above the slogan — at 1280×682. Its slogan band is 6.7% of its
 * height, so it only stays legible at ≥24mm in print. Use it on covers, and
 * keep LOGO_ASPECT_RATIO/the mark for 12–14mm page headers.
 */
export const LOGO_ASPECT_RATIO = 1.0;
export const LOCKUP_ASPECT_RATIO = 1280 / 682; // ≈1.877

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Convert hex color string to RGB object */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/** Set PDF fill color from a hex string */
export function setFillFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
}

/** Set PDF text color from a hex string */
export function setTextFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setTextColor(rgb.r, rgb.g, rgb.b);
}

/** Load image and get its natural dimensions */
export async function getImageDimensions(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

/** Calculate dimensions that fit within maxWidth x maxHeight while preserving aspect ratio */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio,
  };
}

/** Fetch a public asset and return it as a base64 data URI. */
async function fetchAsBase64(path: string): Promise<string> {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to load logo (${path}):`, error);
    return '';
  }
}

/** Load the bare square mark as base64. Use at small sizes (page headers). */
export async function loadLogoBase64(): Promise<string> {
  return fetchAsBase64('/logo-tierra-madre.png');
}

/**
 * Load the full lockup (mark + wordmark + slogan) as base64.
 * Only legible at ≥24mm — use on covers, not page headers.
 */
export async function loadLockupBase64(white = false): Promise<string> {
  return fetchAsBase64(white ? '/logo-white.png' : '/logo-brand.png');
}

/** Download a PDF with the given filename */
export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(`${filename}.pdf`);
}
