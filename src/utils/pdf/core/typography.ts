/**
 * PDF Typography Utilities
 * "Emerald iOS" Design System → jsPDF Integration
 *
 * Maps iOS text styles to Helvetica (jsPDF standard font).
 * Preserves iOS typography hierarchy and metrics as closely as possible.
 */

import type jsPDF from 'jspdf';
import { setTextColor, RGB, ThemeMode, getThemeColors } from './colorUtils';

/**
 * jsPDF Font Names
 * Standard fonts available in jsPDF
 */
export const PDF_FONTS = {
  helvetica: 'helvetica',
  helveticaBold: 'helvetica',
  times: 'times',
  courier: 'courier',
} as const;

/**
 * jsPDF Font Styles
 */
export const PDF_FONT_STYLES = {
  normal: 'normal',
  bold: 'bold',
  italic: 'italic',
  bolditalic: 'bolditalic',
} as const;

/**
 * iOS Text Style mapped to PDF specifications
 */
export interface IOSTextStylePDF {
  font: typeof PDF_FONTS[keyof typeof PDF_FONTS];
  style: typeof PDF_FONT_STYLES[keyof typeof PDF_FONT_STYLES];
  size: number;          // Font size in points
  lineHeight: number;    // Line height multiplier
  letterSpacing?: number; // Letter spacing (not supported in jsPDF, for reference only)
}

/**
 * iOS Text Styles for PDF
 * Helvetica equivalents of SF Pro Display/Text hierarchy
 *
 * Note: jsPDF sizes are slightly smaller to match iOS optical sizing
 * when rendered on paper vs screen.
 */
export const IOS_TEXT_STYLES_PDF: Record<string, IOSTextStylePDF> = {
  /**
   * Large Title - 32pt (iOS: 34pt)
   * Cover pages, major headings
   */
  largeTitle: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.bold,
    size: 32,
    lineHeight: 1.2,
    letterSpacing: 0.374,
  },

  /**
   * Title 1 - 26pt (iOS: 28pt)
   * Section headers, product names
   */
  title1: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.bold,
    size: 26,
    lineHeight: 1.21,
    letterSpacing: 0.364,
  },

  /**
   * Title 2 - 20pt (iOS: 22pt)
   * Subsection headers
   */
  title2: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.bold,
    size: 20,
    lineHeight: 1.27,
    letterSpacing: 0.352,
  },

  /**
   * Title 3 - 18pt (iOS: 20pt)
   * Third-level headings
   */
  title3: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.bold,
    size: 18,
    lineHeight: 1.25,
    letterSpacing: 0.38,
  },

  /**
   * Headline - 15pt (iOS: 17pt)
   * Card titles, emphasis
   */
  headline: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.bold,
    size: 15,
    lineHeight: 1.29,
    letterSpacing: -0.408,
  },

  /**
   * Body - 11pt (iOS: 17pt, scaled down for PDF readability)
   * Main content, descriptions
   */
  body: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.normal,
    size: 11,
    lineHeight: 1.5,
    letterSpacing: -0.24,
  },

  /**
   * Callout - 10pt (iOS: 16pt)
   * Emphasized content, metadata
   */
  callout: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.normal,
    size: 10,
    lineHeight: 1.31,
    letterSpacing: -0.32,
  },

  /**
   * Subheadline - 9pt (iOS: 15pt)
   * Secondary information
   */
  subheadline: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.normal,
    size: 9,
    lineHeight: 1.33,
    letterSpacing: -0.24,
  },

  /**
   * Footnote - 8pt (iOS: 13pt)
   * Details, supplementary content
   */
  footnote: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.normal,
    size: 8,
    lineHeight: 1.38,
    letterSpacing: -0.078,
  },

  /**
   * Caption 1 - 7pt (iOS: 12pt)
   * Captions, labels
   */
  caption1: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.normal,
    size: 7,
    lineHeight: 1.33,
    letterSpacing: 0,
  },

  /**
   * Caption 2 - 6pt (iOS: 11pt)
   * Very small text, fine print
   */
  caption2: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.normal,
    size: 6,
    lineHeight: 1.18,
    letterSpacing: 0.066,
  },
} as const;

/**
 * Custom Text Styles for PDF
 */
export const CUSTOM_TEXT_STYLES_PDF: Record<string, IOSTextStylePDF> = {
  /**
   * Emerald Name - Serif font for product names
   */
  emeraldName: {
    font: PDF_FONTS.times,  // Times New Roman as serif fallback
    style: PDF_FONT_STYLES.bold,
    size: 26,
    lineHeight: 1.29,
    letterSpacing: 0.5,
  },

  /**
   * Technical Data - Monospace for specs
   */
  technical: {
    font: PDF_FONTS.courier,
    style: PDF_FONT_STYLES.normal,
    size: 8,
    lineHeight: 1.38,
    letterSpacing: 0,
  },

  /**
   * Page Number - Small, subtle
   */
  pageNumber: {
    font: PDF_FONTS.helvetica,
    style: PDF_FONT_STYLES.normal,
    size: 7,
    lineHeight: 1,
    letterSpacing: 0,
  },
} as const;

/**
 * Apply iOS text style to jsPDF instance
 *
 * @param pdf - jsPDF instance
 * @param styleName - iOS text style name
 * @param color - Optional text color (RGB tuple)
 * @param mode - Theme mode for default color
 *
 * @example
 * applyIOSTextStyle(pdf, 'title1', undefined, 'light');
 * pdf.text('Product Name', 20, 40);
 */
export function applyIOSTextStyle(
  pdf: jsPDF,
  styleName: keyof typeof IOS_TEXT_STYLES_PDF,
  color?: RGB,
  mode: ThemeMode = 'light'
): void {
  const style = IOS_TEXT_STYLES_PDF[styleName];

  // Set font
  pdf.setFont(style.font, style.style);

  // Set font size
  pdf.setFontSize(style.size);

  // Set text color (use theme default if not provided)
  if (color) {
    setTextColor(pdf, color);
  } else {
    const colors = getThemeColors(mode);
    setTextColor(pdf, colors.textPrimary);
  }
}

/**
 * Apply custom text style to jsPDF instance
 *
 * @param pdf - jsPDF instance
 * @param styleName - Custom text style name
 * @param color - Optional text color
 * @param mode - Theme mode
 */
export function applyCustomTextStyle(
  pdf: jsPDF,
  styleName: keyof typeof CUSTOM_TEXT_STYLES_PDF,
  color?: RGB,
  mode: ThemeMode = 'light'
): void {
  const style = CUSTOM_TEXT_STYLES_PDF[styleName];

  pdf.setFont(style.font, style.style);
  pdf.setFontSize(style.size);

  if (color) {
    setTextColor(pdf, color);
  } else {
    const colors = getThemeColors(mode);
    setTextColor(pdf, colors.textPrimary);
  }
}

/**
 * Calculate text height for multi-line text
 *
 * @param pdf - jsPDF instance
 * @param text - Text content
 * @param maxWidth - Maximum width for wrapping
 * @param styleName - iOS text style
 * @returns Total height in mm
 *
 * @example
 * const height = calculateTextHeight(pdf, description, 80, 'body');
 */
export function calculateTextHeight(
  pdf: jsPDF,
  text: string,
  maxWidth: number,
  styleName: keyof typeof IOS_TEXT_STYLES_PDF
): number {
  const style = IOS_TEXT_STYLES_PDF[styleName];

  // Apply style temporarily to get accurate measurements
  pdf.setFont(style.font, style.style);
  pdf.setFontSize(style.size);

  // Split text into lines
  const lines = pdf.splitTextToSize(text, maxWidth);

  // Calculate height: (number of lines) * (font size * line height)
  // Convert pt to mm: 1pt = 0.353mm
  const lineHeightMm = (style.size * style.lineHeight * 0.353);
  return lines.length * lineHeightMm;
}

/**
 * Draw multi-line text with iOS styling
 *
 * @param pdf - jsPDF instance
 * @param text - Text content
 * @param x - X position
 * @param y - Y position (top of text)
 * @param maxWidth - Maximum width for wrapping
 * @param styleName - iOS text style
 * @param color - Optional text color
 * @param mode - Theme mode
 *
 * @example
 * drawIOSText(pdf, description, 20, 40, 80, 'body');
 */
export function drawIOSText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  styleName: keyof typeof IOS_TEXT_STYLES_PDF,
  color?: RGB,
  mode: ThemeMode = 'light'
): void {
  applyIOSTextStyle(pdf, styleName, color, mode);

  const style = IOS_TEXT_STYLES_PDF[styleName];
  const lines = pdf.splitTextToSize(text, maxWidth);
  const lineHeightMm = style.size * style.lineHeight * 0.353;

  lines.forEach((line: string, index: number) => {
    pdf.text(line, x, y + index * lineHeightMm);
  });
}

/**
 * Get text width for layout calculations
 *
 * @param pdf - jsPDF instance
 * @param text - Text content
 * @param styleName - iOS text style
 * @returns Text width in mm
 *
 * @example
 * const width = getTextWidth(pdf, 'Product Name', 'title1');
 */
export function getTextWidth(
  pdf: jsPDF,
  text: string,
  styleName: keyof typeof IOS_TEXT_STYLES_PDF
): number {
  const style = IOS_TEXT_STYLES_PDF[styleName];

  pdf.setFont(style.font, style.style);
  pdf.setFontSize(style.size);

  return pdf.getTextWidth(text);
}
