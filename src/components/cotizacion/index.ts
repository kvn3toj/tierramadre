/**
 * Cotizacion Components
 * Export all cotizacion-related components.
 */

// Main entry components
export { default as CotizacionGenerator } from './CotizacionGenerator';
export { default as QuotationPreviewPage } from './QuotationPreviewPage';

// Sub-components
export { CotizacionHeader } from './CotizacionHeader';
export { QuotationPreview } from './QuotationPreview';
export { brandColors, quotationStyles, quotationTypography } from './constants';
export type { BrandColors } from './constants';
export { extractDriveFileId, getProductDisplayUrl, getQrCodeUrl } from './utils';
