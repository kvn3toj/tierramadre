/**
 * Shared Constants for API Functions
 *
 * Centralized configuration to avoid duplication across API files.
 */

// Google Sheets Configuration
export const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Dedicated Feedback Spreadsheet (separate from inventory to avoid overload)
export const FEEDBACK_SPREADSHEET_ID = process.env.FEEDBACK_SPREADSHEET_ID?.trim() || '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';

// Sheet Names
export const SHEETS = {
  INVENTORY: 'Inventario',
  PRICING: 'CUALIFICACION -PRECIO',
  ASESORES: null, // Uses index 2 or dynamic lookup
  INVITATIONS: 'Invitations',
  PRODUCT_VIEWS: 'ProductViews',
  PROVIDER_QUOTATIONS: 'CotizacionesProveedor',
  QUOTATION_REQUESTS: 'SolicitudesCotizacion',
  PRODUCT_REQUESTS: 'SolicitudesProducto',
  USER_PREFERENCES: 'UserPreferences',
  FEEDBACK: 'Feedback',
  COTIZACION_REPORTS: 'CotizacionReports',
};

// Google Drive Folder Names
export const DRIVE_FOLDERS = {
  PRODUCTS: 'products',
  // Parent folder for all quotation media
  COTIZACIONES: 'cotizaciones',
  // Subfolder for manual entries (Entrada Manual in CotizacionGenerator)
  COTIZACIONES_MANUALES: 'manuales',
  // Subfolder for provider quotations (QuotationMediaUpload)
  COTIZACIONES_PROVEEDORES: 'proveedores',
  // Exclusive collections per asesor
  COLLECTIONS: 'collections',
  // Feedback app folder (inside TM-Studio/feedback-app)
  FEEDBACK_APP: 'feedback-app',
  // Screenshots subfolder inside feedback-app
  FEEDBACK_SCREENSHOTS: 'screenshots',
};

// Cache Durations (optimized for Chrome/Safari compatibility)
export const CACHE = {
  NONE: 'no-store, no-cache, must-revalidate, proxy-revalidate',
  SHORT: 's-maxage=60, stale-while-revalidate=30',
  MEDIUM: 's-maxage=300, max-age=60, stale-while-revalidate=600',
  LONG: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400', // 24h browser, 7d CDN, 24h stale
  // Optimized for images: immutable hint for CDN, long stale-while-revalidate for instant display
  IMAGES: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400, immutable',
};

// Invitation Settings — no time limit on guest access
export const INVITATION_DURATION_HOURS = 876000; // ~100 years

// Batch Processing
export const BATCH_SIZE = 10;
export const MAX_PAGE_SIZE = 500;

// Supported Media Types
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/x-icon',
];

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
  'video/3gpp',
  'video/x-m4v',
];

export const ALL_MEDIA_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];

// Email Configuration
// ADMIN_EMAILS environment variable should be comma-separated list
// e.g., "admin1@tierramadre.com,admin2@tierramadre.com"
export const EMAIL_CONFIG = {
  DEFAULT_FROM: 'Tierra Madre <notificaciones@tierramadre.studio>',
  DEFAULT_APP_URL: 'https://tierra-madre-studio.vercel.app',
};
