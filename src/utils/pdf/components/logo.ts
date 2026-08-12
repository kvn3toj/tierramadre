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
 * Logo variants and their aspect ratios (width ÷ height).
 *
 * - `mark`   — the bare line-art symbol, SQUARE. This constant used to be 2.0
 *              while the asset was 1888×1888, so every PDF stretched the mark 2:1.
 * - `lockup` — the brand manual's "auxiliar" (vertical) lockup: mark above the
 *              "tierra mädre" wordmark above "ESMERALDAS CON ADN DE PAZ",
 *              1280×682. Its slogan band is only 6.7% of the lockup height, so
 *              it needs ≥24mm to print legibly (≈1.5mm slogan cap height).
 *              Covers get the lockup; 12–14mm page headers keep the mark.
 *
 * The manual's "principal" lockup is the HORIZONTAL one (≈4.30:1). It is not
 * used in documents — every document slot here is centred and portrait-ish,
 * where 4.30:1 would have to shrink far below the slogan's legibility floor.
 * It ships as public/images/logo-horizontal-*.png for wide surfaces.
 */
export type LogoVariant = 'mark' | 'lockup';

const LOGO_ASPECT_RATIO = 1.0; // mark — square
const LOCKUP_ASPECT_RATIO = 1280 / 682; // ≈1.877

/** Smallest height (mm) at which the lockup's slogan still prints legibly. */
export const LOCKUP_MIN_HEIGHT_MM = 24;

const ASPECT: Record<LogoVariant, number> = {
  mark: LOGO_ASPECT_RATIO,
  lockup: LOCKUP_ASPECT_RATIO,
};

const ASSET: Record<LogoVariant, { light: string; dark: string }> = {
  mark: { light: '/logo-tierra-madre.png', dark: '/logo-symbol-white.png' },
  lockup: { light: '/logo-brand.png', dark: '/logo-white.png' },
};

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
   * Which brand asset is being drawn — decides the width/height ratio.
   * Default: 'mark' (square)
   */
  variant?: LogoVariant;

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
const logoCache: Record<string, string> = {};

/**
 * Load logo from public folder as base64
 *
 * @param darkMode - Load the white variant, for dark backgrounds
 * @param variant - `mark` (square symbol) or `lockup` (with wordmark + slogan)
 * @returns Base64 encoded logo string
 *
 * @example
 * const logo = await loadLogo();                    // green mark
 * const whiteLogo = await loadLogo(true);           // white mark
 * const cover = await loadLogo(false, 'lockup');    // green lockup
 */
export async function loadLogo(
  darkMode: boolean = false,
  variant: LogoVariant = 'mark',
): Promise<string> {
  const cacheKey = `${variant}:${darkMode ? 'white' : 'standard'}`;

  // Return from cache if available
  if (logoCache[cacheKey]) {
    return logoCache[cacheKey];
  }

  try {
    const logoPath = darkMode ? ASSET[variant].dark : ASSET[variant].light;
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
  options: LogoOptions = {},
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
      variant = 'mark',
      marginX = PAGE_LAYOUT.margin,
      marginY = PAGE_LAYOUT.margin,
    } = options;

    if (variant === 'lockup' && height < LOCKUP_MIN_HEIGHT_MM) {
      console.warn(
        `Logo lockup drawn at ${height}mm; below ${LOCKUP_MIN_HEIGHT_MM}mm the ` +
          'slogan is not legible in print. Use variant "mark" for small slots.',
      );
    }

    // Calculate dimensions
    const logoWidth = height * ASPECT[variant];
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
      'MEDIUM',
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
 * Stays on the square `mark`: at 12mm the lockup's slogan would print at
 * 0.75mm and read as a smudge.
 *
 * @example
 * const logo = await loadLogo();
 * addLogoToHeader(pdf, logo);
 */
export function addLogoToHeader(
  pdf: jsPDF,
  logoBase64: string,
  options: LogoOptions = {},
): void {
  addLogo(pdf, 'topRight', logoBase64, {
    variant: 'mark',
    ...options,
    height: options.height || 12,
  });
}

/**
 * Add logo to cover page (standard position: top-center, larger)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param options - Logo options
 *
 * Covers carry the full `lockup` (wordmark + slogan), so the default height is
 * the 24mm legibility floor — pass `logoBase64` from
 * `loadLogo(darkMode, 'lockup')`.
 *
 * @example
 * const logo = await loadLogo(false, 'lockup');
 * addLogoToCover(pdf, logo);
 */
export function addLogoToCover(
  pdf: jsPDF,
  logoBase64: string,
  options: LogoOptions = {},
): void {
  addLogo(pdf, 'topCenter', logoBase64, {
    variant: 'lockup',
    ...options,
    height: options.height || LOCKUP_MIN_HEIGHT_MM,
  });
}

/**
 * Add centered hero logo (for title pages)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param options - Logo options
 *
 * Title pages carry the full `lockup`; 24mm is exactly its legibility floor.
 *
 * @example
 * const logo = await loadLogo(false, 'lockup');
 * addHeroLogo(pdf, logo, { height: 24 });
 */
export function addHeroLogo(
  pdf: jsPDF,
  logoBase64: string,
  options: LogoOptions = {},
): void {
  addLogo(pdf, 'center', logoBase64, {
    variant: 'lockup',
    ...options,
    height: options.height || LOCKUP_MIN_HEIGHT_MM,
  });
}

/**
 * Calculate logo dimensions for layout planning
 *
 * @param height - Logo height in mm
 * @param variant - 'mark' (square, default) or 'lockup' (≈1.863:1)
 * @returns Object with width and height
 *
 * @example
 * const dims = getLogoDimensions(12);
 * // { width: 12, height: 12 }  — the mark is square
 */
export function getLogoDimensions(
  height: number,
  variant: LogoVariant = 'mark',
): {
  width: number;
  height: number;
} {
  return {
    width: height * ASPECT[variant],
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
 * @param variant - 'mark' (square, default) or 'lockup' (≈1.863:1)
 * @returns Position coordinates { x, y, width, height }
 */
export function getLogoPosition(
  pdf: jsPDF,
  position: LogoPosition,
  height: number = 12,
  marginX: number = PAGE_LAYOUT.margin,
  marginY: number = PAGE_LAYOUT.margin,
  variant: LogoVariant = 'mark',
): { x: number; y: number; width: number; height: number } {
  const logoWidth = height * ASPECT[variant];
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
