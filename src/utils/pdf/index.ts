/**
 * PDF Utilities
 * "Emerald iOS" Design System → jsPDF Integration
 *
 * Unified exports for all iOS HIG PDF components.
 * Import from '@/utils/pdf' for clean access to all utilities.
 *
 * @example
 * import {
 *   getThemeColors,
 *   applyIOSTextStyle,
 *   addPageHeader,
 *   loadLogo,
 *   addLogo,
 *   drawIOSShadow,
 *   SPACING_MM,
 * } from '@/utils/pdf';
 */

// ===== CORE UTILITIES =====

// Color Utilities
export {
  hexToRgb,
  rgbaToRgb,
  getThemeColors,
  setFillColor,
  setStrokeColor,
  setTextColor,
  applyEmeraldAccent,
  applyCardBackground,
  type RGB,
  type ThemeMode,
} from './core/colorUtils';

// Spacing Utilities
export {
  SPACING_MM,
  PAGE_LAYOUT,
  BORDER_RADIUS_MM,
  TOUCH_TARGET_MM,
  getSpacing,
  ptToMm,
  mmToPt,
  getContentArea,
  applyGridSpacing,
} from './core/spacing';

// Typography Utilities
export {
  PDF_FONTS,
  PDF_FONT_STYLES,
  IOS_TEXT_STYLES_PDF,
  CUSTOM_TEXT_STYLES_PDF,
  applyIOSTextStyle,
  applyCustomTextStyle,
  calculateTextHeight,
  drawIOSText,
  getTextWidth,
  type IOSTextStylePDF,
} from './core/typography';

// Shadow Utilities
export {
  drawIOSShadow,
  drawCardShadow,
  drawModalShadow,
  drawEmeraldGlow,
  drawTextShadow,
  drawImageShadow,
  type ShadowStyle,
} from './core/shadows';

// ===== COMPONENTS =====

// Logo Component
export {
  loadLogo,
  addLogo,
  addLogoToHeader,
  addLogoToCover,
  addHeroLogo,
  getLogoDimensions,
  getLogoPosition,
  type LogoPosition,
  type LogoOptions,
} from './components/logo';

// Header Components
export {
  addPageHeader,
  addMinimalHeader,
  addDecoratedHeader,
  addSectionHeader,
  addCoverHeader,
  getHeaderHeight,
  type HeaderStyle,
  type HeaderOptions,
} from './components/headers';

// ===== HTML TO PDF EXPORT =====

// High-level export functions for capturing DOM elements
export {
  exportToPdf,
  exportQuotationToPdf,
  exportReceiptToPdf,
  type PdfExportOptions,
  type PdfExportResult,
} from './pdfExport';
