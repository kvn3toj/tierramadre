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
  emeraldGreen: '#00AE7A',
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

/** Logo aspect ratio: width is approximately 2x height */
export const LOGO_ASPECT_RATIO = 2.0;

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
export async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

/** Calculate dimensions that fit within maxWidth x maxHeight while preserving aspect ratio */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio,
  };
}

/** Load logo as base64 from public folder */
export async function loadLogoBase64(): Promise<string> {
  try {
    const response = await fetch('/logo-tierra-madre.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo:', error);
    return '';
  }
}

/** Download a PDF with the given filename */
export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(`${filename}.pdf`);
}
