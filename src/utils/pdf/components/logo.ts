/**
 * PDF Logo Component
 * "Emerald iOS" Design System → jsPDF Integration
 *
 * Unified logo component for all PDF exports.
 * Ensures consistent logo placement, sizing, and aspect ratio.
 */

import type jsPDF from 'jspdf';
import { PAGE_LAYOUT } from '../core/spacing';
import { drawIOSShadow } from '../core/shadows';

/**
 * Logo Aspect Ratio
 * Width is approximately 2x height (landscape logo)
 */
const LOGO_ASPECT_RATIO = 2.0;

/**
 * Logo Position Options
 */
export type LogoPosition =
  | 'topLeft'
  | 'topRight'
  | 'topCenter'
  | 'center'
  | 'bottomLeft'
  | 'bottomRight';

/**
 * Logo Options
 */
export interface LogoOptions {
  /**
   * Logo height in mm (width calculated automatically)
   * Default: 12mm
   */
  height?: number;

  /**
   * Add subtle shadow beneath logo
   * Default: false
   */
  withShadow?: boolean;

  /**
   * Dark mode (use white logo variant)
   * Default: false (uses standard logo)
   */
  darkMode?: boolean;

  /**
   * Custom margins from edges (mm)
   * Default: uses PAGE_LAYOUT.margin
   */
  marginX?: number;
  marginY?: number;
}

/**
 * Logo Cache
 * Store loaded logos to avoid repeated fetches
 */
let logoCache: {
  standard?: string;
  white?: string;
} = {};

/**
 * Load logo from public folder as base64
 *
 * @param darkMode - Load white logo variant for dark backgrounds
 * @returns Base64 encoded logo string
 *
 * @example
 * const logo = await loadLogo();
 * const whiteLogo = await loadLogo(true);
 */
export async function loadLogo(darkMode: boolean = false): Promise<string> {
  const cacheKey = darkMode ? 'white' : 'standard';

  // Return from cache if available
  if (logoCache[cacheKey]) {
    return logoCache[cacheKey]!;
  }

  try {
    const logoPath = darkMode ? '/logo-white.png' : '/logo-tierra-madre.png';
    const response = await fetch(logoPath);

    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.statusText}`);
    }

    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Cache the logo
    logoCache[cacheKey] = base64;

    return base64;
  } catch (error) {
    console.error('Failed to load logo:', error);
    return '';
  }
}

/**
 * Add logo to PDF page
 *
 * @param pdf - jsPDF instance
 * @param position - Logo position on page
 * @param logoBase64 - Base64 encoded logo (use loadLogo() to fetch)
 * @param options - Logo customization options
 *
 * @example
 * const logo = await loadLogo();
 * addLogo(pdf, 'topRight', logo, { height: 12, withShadow: true });
 *
 * @example
 * // Dark mode with white logo
 * const whiteLogo = await loadLogo(true);
 * addLogo(pdf, 'topLeft', whiteLogo, { darkMode: true });
 */
export function addLogo(
  pdf: jsPDF,
  position: LogoPosition,
  logoBase64: string,
  options: LogoOptions = {}
): void {
  if (!logoBase64) {
    console.warn('Logo base64 is empty, skipping logo rendering');
    return;
  }

  try {
    // Extract options with defaults
    const {
      height = 12,
      withShadow = false,
      marginX = PAGE_LAYOUT.margin,
      marginY = PAGE_LAYOUT.margin,
    } = options;

    // Calculate dimensions
    const logoWidth = height * LOGO_ASPECT_RATIO;
    const logoHeight = height;

    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate position
    let logoX: number;
    let logoY: number;

    switch (position) {
      case 'topLeft':
        logoX = marginX;
        logoY = marginY;
        break;

      case 'topRight':
        logoX = pageWidth - marginX - logoWidth;
        logoY = marginY;
        break;

      case 'topCenter':
        logoX = (pageWidth - logoWidth) / 2;
        logoY = marginY;
        break;

      case 'center':
        logoX = (pageWidth - logoWidth) / 2;
        logoY = (pageHeight - logoHeight) / 2;
        break;

      case 'bottomLeft':
        logoX = marginX;
        logoY = pageHeight - marginY - logoHeight;
        break;

      case 'bottomRight':
        logoX = pageWidth - marginX - logoWidth;
        logoY = pageHeight - marginY - logoHeight;
        break;

      default:
        logoX = pageWidth - marginX - logoWidth;
        logoY = marginY;
    }

    // Draw shadow if requested
    if (withShadow) {
      drawIOSShadow(pdf, logoX, logoY, logoWidth, logoHeight, 'xs');
    }

    // Add logo image
    pdf.addImage(
      logoBase64,
      'PNG',
      logoX,
      logoY,
      logoWidth,
      logoHeight,
      undefined,
      'MEDIUM'
    );
  } catch (error) {
    console.error('Failed to add logo to page:', error);
  }
}

/**
 * Add logo to header area (standard position: top-right)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param options - Logo options
 *
 * @example
 * const logo = await loadLogo();
 * addLogoToHeader(pdf, logo);
 */
export function addLogoToHeader(
  pdf: jsPDF,
  logoBase64: string,
  options: LogoOptions = {}
): void {
  addLogo(pdf, 'topRight', logoBase64, { ...options, height: options.height || 12 });
}

/**
 * Add logo to cover page (standard position: top-center, larger)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param options - Logo options
 *
 * @example
 * const logo = await loadLogo();
 * addLogoToCover(pdf, logo);
 */
export function addLogoToCover(
  pdf: jsPDF,
  logoBase64: string,
  options: LogoOptions = {}
): void {
  addLogo(pdf, 'topCenter', logoBase64, { ...options, height: options.height || 18 });
}

/**
 * Add centered hero logo (for title pages)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param options - Logo options
 *
 * @example
 * const logo = await loadLogo();
 * addHeroLogo(pdf, logo, { height: 24 });
 */
export function addHeroLogo(
  pdf: jsPDF,
  logoBase64: string,
  options: LogoOptions = {}
): void {
  addLogo(pdf, 'center', logoBase64, { ...options, height: options.height || 24 });
}

/**
 * Calculate logo dimensions for layout planning
 *
 * @param height - Logo height in mm
 * @returns Object with width and height
 *
 * @example
 * const dims = getLogoDimensions(12);
 * // { width: 24, height: 12 }
 */
export function getLogoDimensions(height: number): { width: number; height: number } {
  return {
    width: height * LOGO_ASPECT_RATIO,
    height,
  };
}

/**
 * Get logo position coordinates
 * Useful for layout calculations without actually adding the logo
 *
 * @param pdf - jsPDF instance
 * @param position - Logo position
 * @param height - Logo height
 * @param marginX - Horizontal margin
 * @param marginY - Vertical margin
 * @returns Position coordinates { x, y, width, height }
 */
export function getLogoPosition(
  pdf: jsPDF,
  position: LogoPosition,
  height: number = 12,
  marginX: number = PAGE_LAYOUT.margin,
  marginY: number = PAGE_LAYOUT.margin
): { x: number; y: number; width: number; height: number } {
  const logoWidth = height * LOGO_ASPECT_RATIO;
  const logoHeight = height;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let logoX: number;
  let logoY: number;

  switch (position) {
    case 'topLeft':
      logoX = marginX;
      logoY = marginY;
      break;
    case 'topRight':
      logoX = pageWidth - marginX - logoWidth;
      logoY = marginY;
      break;
    case 'topCenter':
      logoX = (pageWidth - logoWidth) / 2;
      logoY = marginY;
      break;
    case 'center':
      logoX = (pageWidth - logoWidth) / 2;
      logoY = (pageHeight - logoHeight) / 2;
      break;
    case 'bottomLeft':
      logoX = marginX;
      logoY = pageHeight - marginY - logoHeight;
      break;
    case 'bottomRight':
      logoX = pageWidth - marginX - logoWidth;
      logoY = pageHeight - marginY - logoHeight;
      break;
    default:
      logoX = pageWidth - marginX - logoWidth;
      logoY = marginY;
  }

  return {
    x: logoX,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  };
}
