/**
 * Cache Invalidation System
 *
 * Automatically clears transient localStorage caches when a new version is deployed.
 * Preserves user data (favorites, settings, auth) but clears API response caches.
 *
 * This solves the problem where users need to hard-refresh or manually clear
 * localStorage to see API changes after a deploy.
 */

import { STORAGE_KEYS, LEGACY_KEYS } from '../constants/storage-keys';

// Keys that should be cleared on new deploy (API caches, temporary data)
const TRANSIENT_CACHE_PATTERNS = [
  STORAGE_KEYS.BATCH_THUMBNAILS,
  STORAGE_KEYS.TREASURE_SHEETS_CACHE,
  LEGACY_KEYS.INVENTORY_SHEETS_CACHE,
  STORAGE_KEYS.NEW_PRODUCT_IMAGES,
  STORAGE_KEYS.LAST_VERSION_CHECK,
];

// Keys that should NEVER be cleared (user data, preferences)
// Uses .includes() pattern matching, so partial prefixes work
const PRESERVED_KEY_PATTERNS = [
  STORAGE_KEYS.APP_VERSION,
  STORAGE_KEYS.RELOAD_PENDING,
  STORAGE_KEYS.FAVORITES,
  STORAGE_KEYS.RECENTLY_VIEWED,
  STORAGE_KEYS.SAVED_FILTERS,
  STORAGE_KEYS.BROWSING_PROGRESS,
  STORAGE_KEYS.RECENT_CLIENTS,
  STORAGE_KEYS.GAMIFICATION,
  STORAGE_KEYS.STREAK,
  STORAGE_KEYS.SAVED_FACTS,
  STORAGE_KEYS.MEDITATIONS,
  STORAGE_KEYS.LANGUAGE,
  STORAGE_KEYS.THEME,
  STORAGE_KEYS.APP_DATA,
  STORAGE_KEYS.ANALYTICS,
  STORAGE_KEYS.TREASURE_ANALYTICS,
  STORAGE_KEYS.VAULT_UNLOCKED,
  STORAGE_KEYS.GOOGLE_USER,
  STORAGE_KEYS.LIQUID_GLASS,
  STORAGE_KEYS.NOTIFICATION_PERMISSION,
];

const CACHE_VERSION_KEY = STORAGE_KEYS.CACHE_VERSION;

/**
 * Get the current app version from window or localStorage
 */
function getCurrentVersion(): string {
  // First try window.__TM_VERSION__ (set by index.html)
  if (typeof window !== 'undefined' && (window as unknown as { __TM_VERSION__?: string }).__TM_VERSION__) {
    return (window as unknown as { __TM_VERSION__: string }).__TM_VERSION__;
  }
  // Fallback to localStorage
  return localStorage.getItem(STORAGE_KEYS.APP_VERSION) || 'unknown';
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

    if (clearedCount > 0 && import.meta.env.VITE_DEBUG_CACHE) {
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
      if (import.meta.env.VITE_DEBUG_CACHE) {
        console.log(`[CacheInvalidation] Version changed: ${cachedVersion} → ${currentVersion}`);
      }
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
  if (import.meta.env.VITE_DEBUG_CACHE) {
    console.log('[CacheInvalidation] Force invalidated all transient caches');
  }
}
