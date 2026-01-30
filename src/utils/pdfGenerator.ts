/**
 * PDF Generator - Backwards Compatibility Re-exports
 *
 * This file has been split into smaller modules under src/utils/pdf/:
 * - pdfCommon.ts   — Shared constants, helpers, and interfaces
 * - pdfSlide.ts    — Horizontal cover page and carousel layout
 * - pdfCatalog.ts  — Grid layout, list layout, portrait cover, and main orchestrator
 *
 * All exports are preserved here for backwards compatibility.
 * New code should import directly from '@/utils/pdf' or the specific sub-modules.
 */

export { loadLogoBase64, downloadPDF } from './pdf/pdfCommon';
export type { CatalogOptions } from './pdf/pdfCommon';
export { generateCatalog } from './pdf/pdfCatalog';
export { addHorizontalCoverPage, addHorizontalCarouselLayout } from './pdf/pdfSlide';
