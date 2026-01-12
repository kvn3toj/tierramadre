/**
 * Cache Invalidation System
 *
 * Automatically clears transient localStorage caches when a new version is deployed.
 * Preserves user data (favorites, settings, auth) but clears API response caches.
 *
 * This solves the problem where users need to hard-refresh or manually clear
 * localStorage to see API changes after a deploy.
 */

// Keys that should be cleared on new deploy (API caches, temporary data)
const TRANSIENT_CACHE_PATTERNS = [
  'tierramadre-batch-thumbnails',
  'tierramadre-treasure-sheets-cache',
  'tierramadre-inventory-sheets-cache', // legacy
  'tierramadre-new-product-images',
  'tm_last_version_check',
];

// Keys that should NEVER be cleared (user data, preferences)
const PRESERVED_KEY_PATTERNS = [
  'tm_app_version',
  'tm_reload_pending',
  'tierramadre-favorites',
  'tierramadre-recently-viewed',
  'tierramadre-saved-filters',
  'tierramadre-browsing-progress',
  'tierramadre-recent-clients',
  'tierramadre-gamification',
  'tierramadre-streak',
  'tierramadre-saved-facts',
  'tierramadre-meditation',
  'tierramadre-language',
  'tierramadre-theme',
  'tierra-madre-data', // Main app state (emeralds, posts)
  'tierramadre-analytics',
  'tierramadre-tracking',
  'tierramadre-vault',
  'tierramadre-google-auth',
  'tierramadre-liquid-glass',
  'tierramadre-notifications',
];

const CACHE_VERSION_KEY = 'tm_cache_version';

/**
 * Get the current app version from window or localStorage
 */
function getCurrentVersion(): string {
  // First try window.__TM_VERSION__ (set by index.html)
  if (typeof window !== 'undefined' && (window as unknown as { __TM_VERSION__?: string }).__TM_VERSION__) {
    return (window as unknown as { __TM_VERSION__: string }).__TM_VERSION__;
  }
  // Fallback to localStorage
  return localStorage.getItem('tm_app_version') || 'unknown';
}

/**
 * Check if a key should be preserved (not cleared)
 */
function shouldPreserveKey(key: string): boolean {
  return PRESERVED_KEY_PATTERNS.some(pattern => key.includes(pattern));
}

/**
 * Check if a key is a transient cache that should be cleared
 */
function isTransientCache(key: string): boolean {
  return TRANSIENT_CACHE_PATTERNS.some(pattern => key.includes(pattern));
}

/**
 * Clear all transient caches from localStorage
 * Returns the number of keys cleared
 */
export function clearTransientCaches(): number {
  let clearedCount = 0;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isTransientCache(key) && !shouldPreserveKey(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      clearedCount++;
    });

    if (clearedCount > 0) {
      console.log(`[CacheInvalidation] Cleared ${clearedCount} transient caches:`, keysToRemove);
    }
  } catch (error) {
    console.warn('[CacheInvalidation] Error clearing caches:', error);
  }

  return clearedCount;
}

/**
 * Check if cache invalidation is needed and perform it
 * Should be called early in app initialization (before data fetching)
 */
export function checkAndInvalidateCaches(): boolean {
  try {
    const currentVersion = getCurrentVersion();
    const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);

    // If version changed, clear transient caches
    if (cachedVersion && cachedVersion !== currentVersion) {
      console.log(`[CacheInvalidation] Version changed: ${cachedVersion} → ${currentVersion}`);
      const cleared = clearTransientCaches();
      localStorage.setItem(CACHE_VERSION_KEY, currentVersion);
      return cleared > 0;
    }

    // First time or same version - just store the version
    if (!cachedVersion) {
      localStorage.setItem(CACHE_VERSION_KEY, currentVersion);
    }

    return false;
  } catch (error) {
    console.warn('[CacheInvalidation] Error checking version:', error);
    return false;
  }
}

/**
 * Force clear all transient caches (for manual refresh)
 */
export function forceInvalidateAllCaches(): void {
  clearTransientCaches();
  const currentVersion = getCurrentVersion();
  localStorage.setItem(CACHE_VERSION_KEY, currentVersion);
  console.log('[CacheInvalidation] Force invalidated all transient caches');
}
