/**
 * Quality & Color Normalization Constants
 *
 * Shared across filtering, sorting, and display logic.
 */

/**
 * Quality tier ordering for premium sorting (highest quality first)
 */
export const QUALITY_ORDER: Record<string, number> = {
  'SuperFina': 4,
  'Fina': 3,
  'Superior': 2,
  'Comercial': 1,
};

/**
 * Common quality string normalizations from Google Sheets data
 * Fixes typos and variations in quality names
 */
const QUALITY_NORMALIZATIONS: Record<string, string> = {
  'Comercial Standar': 'Comercial Estándar',
  'Comercial Estandar': 'Comercial Estándar',
  'Comercial Standard': 'Comercial Estándar',
};

/**
 * Normalize quality strings to consistent format
 * Fixes typos and variations from Google Sheets data
 */
export function normalizeQuality(quality: string): string {
  if (!quality) return '';
  const q = quality.trim();
  return QUALITY_NORMALIZATIONS[q] || q;
}

/**
 * Normalize color strings to consistent format
 * Ensures colors from Google Sheets are properly formatted
 */
export function normalizeColor(color: string): string {
  if (!color) return '';
  return color.trim();
}
