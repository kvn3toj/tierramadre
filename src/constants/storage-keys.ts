/**
 * Centralized localStorage / sessionStorage Keys
 *
 * All storage keys used across the application.
 * Import from here instead of defining inline strings.
 */

// =============================================================================
// USER PREFERENCES & SETTINGS
// =============================================================================

export const STORAGE_KEYS = {
  // Language & Theme
  LANGUAGE: 'tierra-madre-language',
  THEME: 'tierra-madre-theme',

  // Main app state
  APP_DATA: 'tierra-madre-data',
  RECENT_CLIENTS: 'tierra-madre-recent-clients',
  SHARE_PRICES: 'tierra-madre-share-prices',
  AI_USED_NAMES: 'tierra-madre-used-names',

  // Feature flags
  FEATURE_FLAGS: 'tierra-madre-feature-flags',

  // Liquid glass effects
  LIQUID_GLASS: 'tierra-madre-liquid-glass',

  // =============================================================================
  // COLLECTIONS & FAVORITES
  // =============================================================================

  FAVORITES: 'tierramadre-favorites',
  RECENTLY_VIEWED: 'tierramadre-recently-viewed',
  SAVED_FILTERS: 'tierramadre-saved-filters',
  BROWSING_PROGRESS: 'tierramadre-browsing-progress',

  // =============================================================================
  // ANALYTICS & TRACKING
  // =============================================================================

  TREASURE_ANALYTICS: 'tierramadre-treasure-analytics',
  SEARCH_HITS: 'tierramadre-treasure-search-hits',
  SEARCH_HITS_LEGACY: 'tierramadre-search-hits',
  ANALYTICS: 'tierra-madre-analytics',
  PRODUCT_VIEWS: 'tm_product_views',

  // =============================================================================
  // MEDIA & IMAGES
  // =============================================================================

  BATCH_THUMBNAILS: 'tierramadre-batch-thumbnails-v2',
  TREASURE_MEDIA: 'tierramadre-treasure-media',
  TREASURE_GALLERY: 'tierramadre-treasure-gallery',
  DRIVE_IMAGES_CACHE: 'tierramadre-drive-images-cache-v2',
  NEWEST_PRODUCTS_CACHE: 'tierramadre-newest-products-cache-v5',

  // =============================================================================
  // QUOTATIONS
  // =============================================================================

  COTIZACION_COUNTER: 'tierramadre-cotizacion-counter',

  // =============================================================================
  // NOTIFICATIONS
  // =============================================================================

  NOTIFICATION_PERMISSION: 'tierramadre-notification-permission',
  MEDITATION_REMINDER: 'tierramadre-meditation-reminder',
  LAST_PRODUCT_COUNT: 'tierramadre-last-product-count',
  KNOWN_PRODUCT_IDS: 'tierramadre-known-product-ids',
  LAST_REQUEST_CHECK: 'tierramadre-last-request-check',
  LAST_QUOTATION_CHECK: 'tierramadre-last-quotation-check',

  // =============================================================================
  // AUTHENTICATION
  // =============================================================================

  GOOGLE_USER: 'tierramadre-google-user',
  GOOGLE_PREFS: 'tierramadre-google-prefs',
  GOOGLE_TOKEN: 'tierramadre-google-token',

  // =============================================================================
  // GAMIFICATION & STREAKS
  // =============================================================================

  GAMIFICATION: 'tierra-madre-gamification',
  STREAK: 'tierra-madre-streak',
  SAVED_FACTS: 'tierra-madre-saved-facts',
  MEDITATIONS: 'tierra-madre-meditations',

  // =============================================================================
  // SPECIAL FEATURES
  // =============================================================================

  VAULT_UNLOCKED: 'vault-unlocked',
  VAULT_ATTEMPTS: 'vault-attempts',
  VAULT_COOLDOWN: 'vault-cooldown',

  // =============================================================================
  // SYSTEM
  // =============================================================================

  SESSION_ACTIVE: 'tm_session_active',
  LAST_ACTIVITY: 'tm_last_activity',
  APP_VERSION: 'tm_app_version',
  CACHE_VERSION: 'tm_cache_version',
  RELOAD_PENDING: 'tm_reload_pending',
} as const;

// =============================================================================
// SESSION STORAGE KEYS (cleared when tab closes)
// =============================================================================

export const SESSION_KEYS = {
  SESSION_ID: 'tierramadre-session-id',
  FILTER_ACTIVITY: 'treasure-filter-activity',
  CART: 'tierramadre-cart',
  AUTH: 'tierra-madre-auth',
} as const;

// =============================================================================
// LEGACY KEYS (for migration - read but not written)
// =============================================================================

export const LEGACY_KEYS = {
  INVENTORY_ANALYTICS: 'tierramadre-inventory-analytics',
  INVENTORY_SHEETS_CACHE: 'tierramadre-inventory-sheets-cache',
  INVENTORY_MEDIA: 'tierramadre-inventory-media',
  INVENTORY_GALLERY: 'tierramadre-inventory-gallery',
} as const;
