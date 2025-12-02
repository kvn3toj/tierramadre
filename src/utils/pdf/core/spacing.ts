/**
 * PDF Spacing Utilities
 * "Emerald iOS" Design System → jsPDF Integration
 *
 * Converts iOS 8pt grid system to millimeters for PDF layouts.
 * All spacing values are based on the iOS 8pt grid.
 */

/**
 * Conversion factor: Points to Millimeters
 * 1 pt = 0.352778 mm
 * Rounded for practical PDF use
 */
const PT_TO_MM = 0.353;

/**
 * Spacing Scale in Millimeters
 * iOS 8pt grid → mm for jsPDF
 *
 * These values are optimized for A4 and Letter size PDFs
 */
export const SPACING_MM = {
  /**
   * 0mm - No spacing
   */
  none: 0,

  /**
   * 1mm - Half unit (4pt)
   * Micro-adjustments, tight spacing
   */
  xxs: 1,

  /**
   * 2mm - Base unit (8pt)
   * Standard spacing between related elements
   */
  xs: 2,

  /**
   * 3mm - Small (12pt)
   * Comfortable spacing for grouped content
   */
  sm: 3,

  /**
   * 4mm - Medium (16pt)
   * iOS standard padding for cards and containers
   */
  md: 4,

  /**
   * 6mm - Large (20pt, rounded)
   * Generous spacing for sections
   */
  lg: 6,

  /**
   * 8mm - Extra large (24pt, rounded)
   * Major section spacing
   */
  xl: 8,

  /**
   * 12mm - 2X Large (32pt)
   * Page-level spacing
   */
  xxl: 12,

  /**
   * 16mm - 3X Large (48pt)
   * Hero section spacing
   */
  xxxl: 16,

  /**
   * 20mm - 4X Large (64pt, rounded)
   * Maximum spacing for major separations
   */
  xxxxl: 20,
} as const;

/**
 * Page Layout Constants
 * Standard measurements for PDF page structure
 */
export const PAGE_LAYOUT = {
  /**
   * Page margins (8mm = 24pt = 3x base grid)
   * Consistent edge spacing on all sides
   */
  margin: SPACING_MM.xl,

  /**
   * Card padding (4mm = 16pt = 2x base grid)
   * Internal spacing for card-like containers
   */
  cardPadding: SPACING_MM.md,

  /**
   * Section gap (3mm = 12pt = 1.5x base grid)
   * Space between related sections
   */
  sectionGap: SPACING_MM.sm,

  /**
   * Header height (12mm)
   * Standard height for page headers with logo
   */
  headerHeight: 12,

  /**
   * Footer height (8mm)
   * Standard height for page footers
   */
  footerHeight: 8,

  /**
   * Gutter (6mm = 20pt)
   * Space between columns in multi-column layouts
   */
  gutter: SPACING_MM.lg,

  /**
   * Line spacing multiplier (1.5)
   * iOS standard line height ratio
   */
  lineHeight: 1.5,
} as const;

/**
 * Border Radius in Millimeters
 * iOS standard corner radius values
 */
export const BORDER_RADIUS_MM = {
  /**
   * 3mm - Small radius (10pt)
   * iOS standard for buttons, inputs
   */
  sm: 3,

  /**
   * 4mm - Medium radius (12pt)
   * iOS standard for cards
   */
  md: 4,

  /**
   * 5mm - Large radius (16pt)
   * iOS standard for bottom sheets, large containers
   */
  lg: 5,

  /**
   * 8mm - Extra large radius (24pt)
   * iOS standard for modals, major containers
   */
  xl: 8,

  /**
   * 50% - Circular/pill shape
   * For circular buttons, badges
   */
  full: '50%',
} as const;

/**
 * Touch Target Size in Millimeters
 * iOS minimum tappable area: 44pt = 15.5mm
 */
export const TOUCH_TARGET_MM = {
  /**
   * 15mm - Minimum touch target height
   * iOS HIG requirement: 44pt
   */
  minHeight: 15,

  /**
   * 20mm - Recommended touch target height
   * More comfortable for large catalogs
   */
  recommendedHeight: 20,
} as const;

/**
 * Get spacing value in millimeters from token
 *
 * @param token - Spacing token key
 * @returns Spacing value in mm
 *
 * @example
 * const margin = getSpacing('xl'); // 8
 * pdf.rect(margin, margin, width, height);
 */
export function getSpacing(token: keyof typeof SPACING_MM): number {
  return SPACING_MM[token];
}

/**
 * Convert points to millimeters
 *
 * @param points - Value in points
 * @returns Value in millimeters
 *
 * @example
 * const mm = ptToMm(44); // 15.532
 */
export function ptToMm(points: number): number {
  return points * PT_TO_MM;
}

/**
 * Convert millimeters to points
 *
 * @param mm - Value in millimeters
 * @returns Value in points
 */
export function mmToPt(mm: number): number {
  return mm / PT_TO_MM;
}

/**
 * Calculate page content area dimensions
 * (Page size minus margins)
 *
 * @param pageWidth - Total page width in mm
 * @param pageHeight - Total page height in mm
 * @param margin - Margin size in mm (default: PAGE_LAYOUT.margin)
 * @returns Content area { x, y, width, height }
 *
 * @example
 * const content = getContentArea(210, 297); // A4 page
 * // { x: 8, y: 8, width: 194, height: 281 }
 */
export function getContentArea(
  pageWidth: number,
  pageHeight: number,
  margin: number = PAGE_LAYOUT.margin
) {
  return {
    x: margin,
    y: margin,
    width: pageWidth - margin * 2,
    height: pageHeight - margin * 2,
  };
}

/**
 * Apply consistent grid-based spacing to elements
 *
 * @param baseValue - Starting value
 * @param gridMultiplier - Number of grid units to add (1 unit = 2mm/8pt)
 * @returns Calculated value in mm
 *
 * @example
 * const y = applyGridSpacing(20, 3); // 20 + (3 * 2) = 26mm
 */
export function applyGridSpacing(baseValue: number, gridMultiplier: number): number {
  return baseValue + gridMultiplier * SPACING_MM.xs;
}
