/**
 * useTreasure Hook
 *
 * Main treasure management hook that composes:
 * - useSheetsTreasure: Google Sheets data with caching
 * - useTreasureMedia: Legacy and gallery media management
 *
 * Provides a unified API for treasure data with media merged in.
 *
 * Refactored: Extracted separate hooks for better modularity and testability.
 */

import { useMemo } from 'react';
import { TreasureItem } from '../types';
import { treasureData as defaultTreasureData } from '../data/treasure';
import { useSheetsTreasure } from './useSheetsTreasure';
import { useTreasureMedia } from './useTreasureMedia';

export function useTreasure() {
  // Google Sheets data
  const {
    sheetsTreasure,
    isLoading: isLoadingSheets,
    error: sheetsError,
    refresh: refreshFromSheets,
    isUsingSheets,
  } = useSheetsTreasure();

  // Media management (legacy + gallery)
  const {
    legacyMedia,
    galleries,
    updateImage,
    updateVideo,
    removeImage,
    getMedia,
    getGallery,
    getMediaItems,
    fetchCloudGallery,
    addToGallery,
    removeFromGallery,
    reorderGallery,
    uploadToGallery,
    updateMediaItems,
  } = useTreasureMedia();

  // Merge treasure data with media (memoized for performance)
  const treasure = useMemo((): TreasureItem[] => {
    // Use Google Sheets data if available, otherwise fall back to local data
    const baseTreasure = sheetsTreasure || defaultTreasureData;

    return baseTreasure.map((item) => {
      const itemMedia = legacyMedia[item.item];
      const gallery = galleries[item.item] || [];

      // If we have a gallery, use the first item as the main image
      const mainMedia = gallery[0];

      // Count gallery items (includes legacy media if no gallery)
      const galleryCount = gallery.length || (itemMedia ? 1 : 0);

      return {
        ...item,
        // Priority: gallery main → legacy media → Sheets imageUrl → original imagen
        imagen: mainMedia?.url || itemMedia?.url || item.imageUrl || item.imagen,
        mediaType: mainMedia?.type || itemMedia?.mediaType || item.mediaType || 'image',
        thumbnailUrl: mainMedia?.thumbnailUrl || itemMedia?.thumbnailUrl || item.thumbnailUrl,
        galleryCount,
      };
    });
  }, [sheetsTreasure, legacyMedia, galleries]);

  // Legacy getter for backwards compatibility
  const getTreasureWithMedia = (): TreasureItem[] => treasure;

  return {
    // Treasure data with media merged
    treasure: getTreasureWithMedia(),

    // Legacy single media functions
    updateImage,
    updateVideo,
    removeImage,
    getMedia,

    // Gallery functions
    getGallery,
    fetchCloudGallery,
    addToGallery,
    removeFromGallery,
    reorderGallery,
    uploadToGallery,
    updateMediaItems,
    getMediaItems,

    // Google Sheets integration
    isLoadingSheets,
    sheetsError,
    refreshFromSheets,
    isUsingSheets,
  };
}

export default useTreasure;
