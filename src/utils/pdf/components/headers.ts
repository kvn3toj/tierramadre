/**
 * PDF Header Components
 * "Emerald iOS" Design System → jsPDF Integration
 *
 * Reusable page headers with logo, title, and page numbers.
 * Ensures consistent header styling across all PDF exports.
 */

import jsPDF, { GState } from 'jspdf';
import { addLogoToHeader, getLogoDimensions } from './logo';
import { applyIOSTextStyle, applyCustomTextStyle } from '../core/typography';
import { getThemeColors, ThemeMode, setFillColor, setStrokeColor } from '../core/colorUtils';
import { SPACING_MM, PAGE_LAYOUT } from '../core/spacing';

/**
 * Header Style Options
 */
export type HeaderStyle = 'standard' | 'minimal' | 'decorated';

/**
 * Header Options
 */
export interface HeaderOptions {
  /**
   * Page title (optional, shown on left side)
   */
  title?: string;

  /**
   * Current page number (optional)
   */
  pageNumber?: number;

  /**
   * Total pages (optional, shows "1 / 10" format)
   */
  totalPages?: number;

  /**
   * Header style variant
   * Default: 'standard'
   */
  style?: HeaderStyle;

  /**
   * Show logo in header
   * Default: true
   */
  showLogo?: boolean;

  /**
   * Show emerald accent line beneath header
   * Default: true
   */
  showAccentLine?: boolean;

  /**
   * Theme mode
   * Default: 'light'
   */
  theme?: ThemeMode;
}

/**
 * Add iOS-styled page header
 *
 * Standard header includes:
 * - Logo (top-right, 12mm height)
 * - Optional title (top-left)
 * - Optional page number (top-right, below logo)
 * - Emerald accent line (bottom of header)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param options - Header customization options
 *
 * @example
 * addPageHeader(pdf, logo, {
 *   title: 'Catálogo de Esmeraldas',
 *   pageNumber: 1,
 *   totalPages: 10,
 * });
 */
export function addPageHeader(
  pdf: jsPDF,
  logoBase64: string,
  options: HeaderOptions = {}
): void {
  const {
    title,
    pageNumber,
    totalPages,
    showLogo = true,
    showAccentLine = true,
    theme = 'light',
  } = options;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = PAGE_LAYOUT.margin;
  const colors = getThemeColors(theme);

  // Header area top position
  const headerY = margin;

  // Add logo (top-right)
  if (showLogo && logoBase64) {
    addLogoToHeader(pdf, logoBase64, { darkMode: theme === 'dark' });
  }

  // Add title (top-left)
  if (title) {
    applyIOSTextStyle(pdf, 'headline', colors.textSecondary, theme);

    const titleX = margin;
    const titleY = headerY + 4; // Vertically centered with logo

    pdf.text(title, titleX, titleY);
  }

  // Add page number (below logo, right-aligned)
  if (pageNumber !== undefined) {
    applyCustomTextStyle(pdf, 'pageNumber', colors.textTertiary, theme);

    const logoDims = getLogoDimensions(12);
    const pageNumX = pageWidth - margin;
    const pageNumY = headerY + logoDims.height + SPACING_MM.xs;

    const pageText = totalPages
      ? `${pageNumber} / ${totalPages}`
      : `${pageNumber}`;

    // Right-align page number
    const pageTextWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageNumX - pageTextWidth, pageNumY);
  }

  // Add emerald accent line (beneath header)
  if (showAccentLine) {
    const lineY = headerY + PAGE_LAYOUT.headerHeight;

    setStrokeColor(pdf, colors.emeraldPrimary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, lineY, pageWidth - margin, lineY);
  }
}

/**
 * Add minimal header (logo only, no decorations)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param theme - Theme mode
 *
 * @example
 * addMinimalHeader(pdf, logo);
 */
export function addMinimalHeader(
  pdf: jsPDF,
  logoBase64: string,
  theme: ThemeMode = 'light'
): void {
  addPageHeader(pdf, logoBase64, {
    showLogo: true,
    showAccentLine: false,
    theme,
  });
}

/**
 * Add decorated header (with emerald background strip)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param options - Header options
 *
 * @example
 * addDecoratedHeader(pdf, logo, { title: 'Premium Collection' });
 */
export function addDecoratedHeader(
  pdf: jsPDF,
  logoBase64: string,
  options: HeaderOptions = {}
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = PAGE_LAYOUT.margin;
  const theme = options.theme || 'light';
  const colors = getThemeColors(theme);

  const headerY = margin;
  const headerHeight = PAGE_LAYOUT.headerHeight;

  // Draw emerald background strip
  setFillColor(pdf, colors.emeraldPrimary);
  pdf.setGState(new GState({ opacity: 0.1 }));
  pdf.rect(0, headerY, pageWidth, headerHeight, 'F');
  pdf.setGState(new GState({ opacity: 1 }));

  // Add standard header elements on top
  addPageHeader(pdf, logoBase64, {
    ...options,
    showAccentLine: true,
  });
}

/**
 * Add section header (within page content)
 *
 * @param pdf - jsPDF instance
 * @param title - Section title
 * @param x - X position
 * @param y - Y position
 * @param theme - Theme mode
 * @returns Height of header (for layout calculations)
 *
 * @example
 * const nextY = addSectionHeader(pdf, 'Productos Destacados', 20, 40);
 * // Continue content at nextY
 */
export function addSectionHeader(
  pdf: jsPDF,
  title: string,
  x: number,
  y: number,
  theme: ThemeMode = 'light'
): number {
  const colors = getThemeColors(theme);

  // Section title
  applyIOSTextStyle(pdf, 'title2', colors.textPrimary, theme);
  pdf.text(title, x, y);

  // Emerald accent line (partial width)
  const lineY = y + SPACING_MM.sm;
  const lineWidth = 20; // 20mm accent line

  setStrokeColor(pdf, colors.emeraldPrimary);
  pdf.setLineWidth(1);
  pdf.line(x, lineY, x + lineWidth, lineY);

  // Return next Y position for content
  return lineY + SPACING_MM.md;
}

/**
 * Add cover page header (centered logo + title)
 *
 * @param pdf - jsPDF instance
 * @param logoBase64 - Base64 encoded logo
 * @param title - Cover title
 * @param subtitle - Cover subtitle (optional)
 * @param theme - Theme mode
 *
 * @example
 * addCoverHeader(pdf, logo, 'Catálogo Premium', 'Colección 2025');
 */
export function addCoverHeader(
  pdf: jsPDF,
  logoBase64: string,
  title: string,
  subtitle?: string,
  theme: ThemeMode = 'light'
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const colors = getThemeColors(theme);

  // Center area
  const centerY = pageHeight / 2;

  // Logo (centered, 18mm height)
  if (logoBase64) {
    const logoDims = getLogoDimensions(18);
    const logoX = (pageWidth - logoDims.width) / 2;
    const logoY = centerY - 40;

    pdf.addImage(
      logoBase64,
      'PNG',
      logoX,
      logoY,
      logoDims.width,
      logoDims.height,
      undefined,
      'MEDIUM'
    );
  }

  // Title (centered, below logo)
  applyIOSTextStyle(pdf, 'largeTitle', colors.textPrimary, theme);

  const titleY = centerY;
  const titleWidth = pdf.getTextWidth(title);
  const titleX = (pageWidth - titleWidth) / 2;

  pdf.text(title, titleX, titleY);

  // Subtitle (centered, below title)
  if (subtitle) {
    applyIOSTextStyle(pdf, 'title2', colors.textSecondary, theme);

    const subtitleY = titleY + SPACING_MM.xl;
    const subtitleWidth = pdf.getTextWidth(subtitle);
    const subtitleX = (pageWidth - subtitleWidth) / 2;

    pdf.text(subtitle, subtitleX, subtitleY);
  }

  // Emerald accent (centered, below subtitle)
  const accentY = subtitle
    ? titleY + SPACING_MM.xl + SPACING_MM.lg
    : titleY + SPACING_MM.lg;

  const accentWidth = 40; // 40mm decorative line
  const accentX = (pageWidth - accentWidth) / 2;

  setStrokeColor(pdf, colors.emeraldPrimary);
  pdf.setLineWidth(1);
  pdf.line(accentX, accentY, accentX + accentWidth, accentY);
}

/**
 * Get header height for layout calculations
 *
 * @param style - Header style
 * @returns Header height in mm
 *
 * @example
 * const contentY = margin + getHeaderHeight('standard');
 */
export function getHeaderHeight(style: HeaderStyle = 'standard'): number {
  switch (style) {
    case 'minimal':
      return PAGE_LAYOUT.headerHeight;
    case 'decorated':
      return PAGE_LAYOUT.headerHeight + SPACING_MM.sm;
    case 'standard':
    default:
      return PAGE_LAYOUT.headerHeight;
  }
}
