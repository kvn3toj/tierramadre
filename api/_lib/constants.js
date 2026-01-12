/**
 * Shared Constants for API Functions
 *
 * Centralized configuration to avoid duplication across API files.
 */

// Google Sheets Configuration
export const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Sheet Names
export const SHEETS = {
  INVENTORY: 'Inventario',
  PRICING: 'CUALIFICACION -PRECIO',
  ASESORES: null, // Uses index 2 or dynamic lookup
  INVITATIONS: 'Invitations',
  PRODUCT_VIEWS: 'ProductViews',
  PROVIDER_QUOTATIONS: 'CotizacionesProveedor',
  QUOTATION_REQUESTS: 'SolicitudesCotizacion',
  USER_PREFERENCES: 'UserPreferences',
};

// Google Drive Folder Names
export const DRIVE_FOLDERS = {
  PRODUCTS: 'products',
  COTIZACIONES: 'cotizaciones',
};

// Cache Durations (in seconds)
export const CACHE = {
  NONE: 'no-store, no-cache, must-revalidate, proxy-revalidate',
  SHORT: 's-maxage=60, stale-while-revalidate=30',
  MEDIUM: 's-maxage=300, max-age=60, stale-while-revalidate=600',
  LONG: 'public, max-age=86400', // 24 hours
};

// Invitation Settings
export const INVITATION_DURATION_HOURS = 24;

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
