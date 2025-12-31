/**
 * useTreasureMedia Hook
 *
 * Manages media storage for treasure items:
 * - Legacy single media (backwards compatibility)
 * - New gallery system (multiple media per product)
 * - Cloud sync with Cloudinary
 */

import { useState, useEffect, useCallback } from 'react';
import { MediaType } from '../types';
import { MediaItem } from '../components/media/types';
import { uploadProductMedia } from '../utils/cloudinaryUpload';
import { extractVideoThumbnail } from '../utils/videoStorage';
import { createLogger } from '../utils/logger';

const log = createLogger('TreasureMedia');

// Storage keys (new treasure namespace)
const LEGACY_STORAGE_KEY = 'tierramadre-treasure-media';
const GALLERY_STORAGE_KEY = 'tierramadre-treasure-gallery';

// Old storage keys for migration
const OLD_LEGACY_STORAGE_KEY = 'tierramadre-inventory-media';
const OLD_GALLERY_STORAGE_KEY = 'tierramadre-inventory-gallery';

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
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    log.error('Error loading galleries:', error);
    return {};
  }
}

function saveGalleriesToStorage(galleries: ProductGallery): void {
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(galleries));
  } catch (error) {
    log.error('Error saving galleries:', error);
  }
}

function generateMediaId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// HOOK
// =============================================================================

export function useTreasureMedia(): UseTreasureMediaReturn {
  const [legacyMedia, setLegacyMedia] = useState<LegacyTreasureMedia>({});
  const [galleries, setGalleries] = useState<ProductGallery>({});

  // Load from localStorage on mount (with migration)
  useEffect(() => {
    // Run storage migration first
    migrateStorageKey(OLD_LEGACY_STORAGE_KEY, LEGACY_STORAGE_KEY);
    migrateStorageKey(OLD_GALLERY_STORAGE_KEY, GALLERY_STORAGE_KEY);

    // Then load data
    setLegacyMedia(loadLegacyMedia());
    setGalleries(loadGalleries());
  }, []);

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
      const response = await fetch(`/api/get-product-media?itemNumber=${itemNumber}`);
      if (!response.ok) {
        log.warn('Could not fetch cloud gallery');
        return galleries[itemNumber] || [];
      }

      const data = await response.json();
      if (data.media && data.media.length > 0) {
        const newGalleries = {
          ...galleries,
          [itemNumber]: data.media,
        };
        saveGalleries(newGalleries);
        return data.media;
      }

      return galleries[itemNumber] || [];
    } catch (error) {
      log.error('Error fetching cloud gallery:', error);
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

  const uploadToGallery = useCallback(async (
    itemNumber: number,
    files: File[],
    category: MediaItem['category']
  ): Promise<MediaItem[]> => {
    const uploadedItems: MediaItem[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');

      try {
        // Upload to Cloudinary
        const mediaUrl = await uploadProductMedia(file, itemNumber);

        // Extract thumbnail for videos
        let thumbnailUrl: string | undefined;
        if (isVideo) {
          thumbnailUrl = await extractVideoThumbnail(file);
        }

        // Add to gallery
        const mediaItem = await addToGallery(
          itemNumber,
          mediaUrl,
          isVideo ? 'video' : 'image',
          category,
          thumbnailUrl
        );

        uploadedItems.push(mediaItem);
      } catch (error) {
        log.error('Error uploading file:', error);
        throw error;
      }
    }

    return uploadedItems;
  }, [addToGallery]);

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
    addToGallery,
    removeFromGallery,
    reorderGallery,
    uploadToGallery,
    updateMediaItems,
  };
}

export default useTreasureMedia;
