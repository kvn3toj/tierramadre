/**
 * useInventory Hook
 *
 * Main inventory management hook that composes:
 * - useSheetsInventory: Google Sheets data with caching
 * - useInventoryMedia: Legacy and gallery media management
 *
 * Provides a unified API for inventory data with media merged in.
 *
 * Refactored: Extracted separate hooks for better modularity and testability.
 */

import { useMemo } from 'react';
import { InventoryItem } from '../types';
import { inventoryData as defaultInventoryData } from '../data/inventory';
import { useSheetsInventory } from './useSheetsInventory';
import { useInventoryMedia } from './useInventoryMedia';

export function useInventory() {
  // Google Sheets data
  const {
    sheetsInventory,
    isLoading: isLoadingSheets,
    error: sheetsError,
    refresh: refreshFromSheets,
    isUsingSheets,
  } = useSheetsInventory();

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
  } = useInventoryMedia();

  // Merge inventory data with media (memoized for performance)
  const inventory = useMemo((): InventoryItem[] => {
    // Use Google Sheets data if available, otherwise fall back to local data
    const baseInventory = sheetsInventory || defaultInventoryData;

    return baseInventory.map((item) => {
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
  }, [sheetsInventory, legacyMedia, galleries]);

  // Legacy getter for backwards compatibility
  const getInventoryWithMedia = (): InventoryItem[] => inventory;

  return {
    // Inventory data with media merged
    inventory: getInventoryWithMedia(),

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

export default useInventory;
