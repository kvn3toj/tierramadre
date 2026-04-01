/**
 * useTreasureMedia Hook
 *
 * Manages media storage for treasure items:
 * - Legacy single media (backwards compatibility)
 * - New gallery system (multiple media per product)
 * - Cloud sync with Cloudinary
 */

import { useState, useCallback } from 'react';
import { MediaType } from '../types';
import { MediaItem } from '../components/media/types';
import { createLogger } from '../utils/logger';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { STORAGE_KEYS, LEGACY_KEYS } from '../constants/storage-keys';

const log = createLogger('TreasureMedia');

// Gallery cache TTL: 30 minutes
const GALLERY_TTL = 30 * 60 * 1000;

// Storage keys (new treasure namespace)
const LEGACY_STORAGE_KEY = STORAGE_KEYS.TREASURE_MEDIA;
const GALLERY_STORAGE_KEY = STORAGE_KEYS.TREASURE_GALLERY;

// Old storage keys for migration
const OLD_LEGACY_STORAGE_KEY = LEGACY_KEYS.INVENTORY_MEDIA;
const OLD_GALLERY_STORAGE_KEY = LEGACY_KEYS.INVENTORY_GALLERY;

// =============================================================================
// STORAGE MIGRATION
// =============================================================================

/**
 * Migrate data from old storage key to new one (run once on load)
 */
function migrateStorageKey(oldKey: string, newKey: string): void {
  try {
    const oldData = localStorage.getItem(oldKey);
    if (oldData && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldData);
      localStorage.removeItem(oldKey);
      log.debug(`Migrated storage: ${oldKey} → ${newKey}`);
    }
  } catch (error) {
    log.warn('Storage migration error:', error);
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface LegacyMediaEntry {
  url: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
}

interface LegacyTreasureMedia {
  [itemNumber: number]: LegacyMediaEntry;
}

/** Timestamped wrapper for gallery cache entries */
interface GalleryCacheEntry {
  items: MediaItem[];
  timestamp: number;
}

/** Raw storage shape: each item number maps to a timestamped entry */
interface GalleryCacheStorage {
  [itemNumber: number]: GalleryCacheEntry;
}

interface ProductGallery {
  [itemNumber: number]: MediaItem[];
}

export interface UseTreasureMediaReturn {
  // Legacy single media (backwards compatibility)
  legacyMedia: LegacyTreasureMedia;
  updateImage: (itemNumber: number, imageUrl: string) => void;
  updateVideo: (itemNumber: number, videoUrl: string, thumbnailUrl: string) => Promise<void>;
  removeImage: (itemNumber: number) => void;
  getMedia: (itemNumber: number) => LegacyMediaEntry | undefined;

  // Gallery functions
  galleries: ProductGallery;
  getGallery: (itemNumber: number) => MediaItem[];
  getMediaItems: (itemNumber: number) => MediaItem[];
  fetchCloudGallery: (itemNumber: number) => Promise<MediaItem[]>;
  invalidateGallery: (itemNumber: number) => void;
  addToGallery: (
    itemNumber: number,
    url: string,
    type: 'image' | 'video',
    category: MediaItem['category'],
    thumbnailUrl?: string
  ) => Promise<MediaItem>;
  removeFromGallery: (itemNumber: number, mediaId: string) => void;
  reorderGallery: (itemNumber: number, newOrder: MediaItem[]) => void;
  uploadToGallery: (
    itemNumber: number,
    files: File[],
    category: MediaItem['category']
  ) => Promise<MediaItem[]>;
  updateMediaItems: (itemNumber: number, items: MediaItem[]) => void;
}

// =============================================================================
// STORAGE HELPERS
// =============================================================================

function loadLegacyMedia(): LegacyTreasureMedia {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    log.error('Error loading legacy media:', error);
    return {};
  }
}

function saveLegacyMediaToStorage(media: LegacyTreasureMedia): void {
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(media));
  } catch (error) {
    log.error('Error saving legacy media:', error);
  }
}

function loadGalleries(): ProductGallery {
  try {
    const stored = localStorage.getItem(GALLERY_STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    const now = Date.now();
    const result: ProductGallery = {};

    for (const key of Object.keys(parsed)) {
      const entry = parsed[key];
      // Handle legacy format (plain array without timestamp) — treat as expired
      if (Array.isArray(entry)) continue;
      // Handle timestamped format — check TTL
      if (entry && entry.items && typeof entry.timestamp === 'number') {
        if (now - entry.timestamp < GALLERY_TTL) {
          result[Number(key)] = entry.items;
        }
      }
    }

    return result;
  } catch (error) {
    log.error('Error loading galleries:', error);
    return {};
  }
}

function saveGalleriesToStorage(galleries: ProductGallery): void {
  try {
    const now = Date.now();
    const storage: GalleryCacheStorage = {};

    for (const key of Object.keys(galleries)) {
      storage[Number(key)] = {
        items: galleries[Number(key)],
        timestamp: now,
      };
    }

    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    log.error('Error saving galleries:', error);
  }
}

function generateMediaId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// INITIAL DATA (synchronous to prevent image blinking)
// =============================================================================

/**
 * Get initial legacy media synchronously to prevent URL changes causing image blinks
 */
function getInitialLegacyMedia(): LegacyTreasureMedia {
  // Run storage migration first (synchronous)
  migrateStorageKey(OLD_LEGACY_STORAGE_KEY, LEGACY_STORAGE_KEY);
  return loadLegacyMedia();
}

/**
 * Get initial galleries synchronously to prevent URL changes causing image blinks
 */
function getInitialGalleries(): ProductGallery {
  // Run storage migration first (synchronous)
  migrateStorageKey(OLD_GALLERY_STORAGE_KEY, GALLERY_STORAGE_KEY);
  return loadGalleries();
}

// =============================================================================
// HOOK
// =============================================================================

export function useTreasureMedia(): UseTreasureMediaReturn {
  // Initialize with cached data synchronously to prevent image URL changes (blinking)
  const [legacyMedia, setLegacyMedia] = useState<LegacyTreasureMedia>(getInitialLegacyMedia);
  const [galleries, setGalleries] = useState<ProductGallery>(getInitialGalleries);

  // ==========================================================================
  // LEGACY MEDIA FUNCTIONS
  // ==========================================================================

  const updateImage = useCallback((itemNumber: number, imageUrl: string) => {
    setLegacyMedia((prev) => {
      const newMedia = {
        ...prev,
        [itemNumber]: { url: imageUrl, mediaType: 'image' as MediaType },
      };
      saveLegacyMediaToStorage(newMedia);
      return newMedia;
    });
  }, []);

  const updateVideo = useCallback(async (
    itemNumber: number,
    videoUrl: string,
    thumbnailUrl: string
  ) => {
    setLegacyMedia((prev) => {
      const newMedia = {
        ...prev,
        [itemNumber]: {
          url: videoUrl,
          mediaType: 'video' as MediaType,
          thumbnailUrl,
        },
      };
      saveLegacyMediaToStorage(newMedia);
      return newMedia;
    });
  }, []);

  const removeImage = useCallback((itemNumber: number) => {
    setLegacyMedia((prev) => {
      const newMedia = { ...prev };
      delete newMedia[itemNumber];
      saveLegacyMediaToStorage(newMedia);
      return newMedia;
    });
  }, []);

  const getMedia = useCallback((itemNumber: number) => {
    return legacyMedia[itemNumber];
  }, [legacyMedia]);

  // ==========================================================================
  // GALLERY FUNCTIONS
  // ==========================================================================

  const saveGalleries = useCallback((newGalleries: ProductGallery) => {
    saveGalleriesToStorage(newGalleries);
    setGalleries(newGalleries);
  }, []);

  const getGallery = useCallback((itemNumber: number): MediaItem[] => {
    return galleries[itemNumber] || [];
  }, [galleries]);

  const getMediaItems = useCallback((itemNumber: number): MediaItem[] => {
    return galleries[itemNumber] || [];
  }, [galleries]);

  const fetchCloudGallery = useCallback(async (itemNumber: number): Promise<MediaItem[]> => {
    try {
      // Primary source: Google Drive folders
      const driveResponse = await fetchWithRetry(
        `/api/get-drive-images?itemNumber=${itemNumber}`,
        undefined,
        {
          retries: 2,
          notifyOnFailure: false,
        }
      );
      if (driveResponse.ok) {
        const driveData = await driveResponse.json();
        if (driveData.success && driveData.images && driveData.images.length > 0) {
          // Transform Drive images to MediaItem format
          const media: MediaItem[] = driveData.images.map((img: {
            id: string;
            name: string;
            proxyUrl?: string;
            url: string;
            thumbnailUrl?: string;
            type: 'image' | 'video';
            order?: number;
          }, index: number) => ({
            id: img.id,
            url: img.proxyUrl || img.url, // Prefer proxy URL for better loading
            thumbnailUrl: img.thumbnailUrl,
            type: img.type,
            category: 'producto' as const,
            alt: `Producto ${itemNumber} - ${img.name}`,
            order: img.order ?? index,
          }));

          const newGalleries = {
            ...galleries,
            [itemNumber]: media,
          };
          saveGalleries(newGalleries);
          return media;
        }
      }

      // Legacy Cloudinary API disabled - return cached/local galleries only
      return galleries[itemNumber] || [];
    } catch (error) {
      log.error('Error fetching gallery:', error);
      return galleries[itemNumber] || [];
    }
  }, [galleries, saveGalleries]);

  const addToGallery = useCallback(async (
    itemNumber: number,
    url: string,
    type: 'image' | 'video',
    category: MediaItem['category'],
    thumbnailUrl?: string
  ): Promise<MediaItem> => {
    const currentGallery = galleries[itemNumber] || [];

    const newMediaItem: MediaItem = {
      id: generateMediaId(),
      url,
      thumbnailUrl,
      type,
      category,
      alt: `Producto ${itemNumber} - ${category}`,
      order: currentGallery.length,
    };

    const newGallery = [...currentGallery, newMediaItem];
    const newGalleries = {
      ...galleries,
      [itemNumber]: newGallery,
    };

    saveGalleries(newGalleries);
    return newMediaItem;
  }, [galleries, saveGalleries]);

  const removeFromGallery = useCallback((itemNumber: number, mediaId: string) => {
    const currentGallery = galleries[itemNumber] || [];
    const newGallery = currentGallery
      .filter((item) => item.id !== mediaId)
      .map((item, index) => ({ ...item, order: index }));

    const newGalleries = { ...galleries };

    if (newGallery.length === 0) {
      delete newGalleries[itemNumber];
    } else {
      newGalleries[itemNumber] = newGallery;
    }

    saveGalleries(newGalleries);
  }, [galleries, saveGalleries]);

  const reorderGallery = useCallback((itemNumber: number, newOrder: MediaItem[]) => {
    const reorderedGallery = newOrder.map((item, index) => ({
      ...item,
      order: index,
    }));

    const newGalleries = {
      ...galleries,
      [itemNumber]: reorderedGallery,
    };

    saveGalleries(newGalleries);
  }, [galleries, saveGalleries]);

  /**
   * @deprecated Cloudinary upload removed - all media now stored in Google Drive
   * Use Google Drive API endpoints for new uploads
   */
  const uploadToGallery = useCallback(async (
    _itemNumber: number,
    _files: File[],
    _category: MediaItem['category']
  ): Promise<MediaItem[]> => {
    log.warn('uploadToGallery is deprecated - use Google Drive API for uploads');
    throw new Error('Cloudinary upload removed. Please upload media to Google Drive manually.');
  }, []);

  const invalidateGallery = useCallback((itemNumber: number) => {
    setGalleries((prev) => {
      const next = { ...prev };
      delete next[itemNumber];
      saveGalleriesToStorage(next);
      return next;
    });
  }, []);

  const updateMediaItems = useCallback((itemNumber: number, items: MediaItem[]) => {
    const reorderedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    const newGalleries = { ...galleries };

    if (reorderedItems.length === 0) {
      delete newGalleries[itemNumber];
    } else {
      newGalleries[itemNumber] = reorderedItems;
    }

    saveGalleries(newGalleries);
  }, [galleries, saveGalleries]);

  return {
    // Legacy
    legacyMedia,
    updateImage,
    updateVideo,
    removeImage,
    getMedia,

    // Gallery
    galleries,
    getGallery,
    getMediaItems,
    fetchCloudGallery,
    invalidateGallery,
    addToGallery,
    removeFromGallery,
    reorderGallery,
    uploadToGallery,
    updateMediaItems,
  };
}

export default useTreasureMedia;
