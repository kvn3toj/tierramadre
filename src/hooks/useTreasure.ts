/**
 * useTreasure Hook
 *
 * Main treasure management hook that composes:
 * - useSheetsTreasure: Google Sheets data with caching (product metadata only)
 * - useTreasureMedia: Legacy and gallery media management (localStorage)
 * - useBatchThumbnails: Grid thumbnails from Google Drive product folders (PRIMARY IMAGE SOURCE)
 *
 * IMAGE SOURCE: Google Drive `products/` folder
 * Folder naming convention: "{item} - {name}/" (e.g., "32 - Venus/")
 * The first image (alphabetically) in each folder is used as the thumbnail.
 *
 * Provides a unified API for treasure data with media merged in.
 */

import { useMemo } from 'react';
import { TreasureItem } from '../types';
import { treasureData as defaultTreasureData } from '../data/treasure';
import { useSheetsTreasure } from './useSheetsTreasure';
import { useTreasureMedia } from './useTreasureMedia';
import { useBatchThumbnails } from './useBatchThumbnails';
import { usePrevious } from './usePrevious';

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractDriveFileId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,           // /file/d/FILE_ID/
    /\/d\/([a-zA-Z0-9_-]+)/,                  // /d/FILE_ID/
    /id=([a-zA-Z0-9_-]+)/,                    // ?id=FILE_ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

/**
 * Convert Google Drive URL to proxy URL for reliable loading
 * If not a Drive URL, returns the original URL unchanged
 */
function convertToProxyUrl(url: string | undefined): string | undefined {
  if (!url) return url;

  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com')) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      return `/api/serve-drive-image?fileId=${fileId}`;
    }
  }

  // Return original URL if not a Drive URL or no file ID found
  return url;
}

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
    invalidateGallery,
    addToGallery,
    removeFromGallery,
    reorderGallery,
    uploadToGallery,
    updateMediaItems,
  } = useTreasureMedia();

  // Batch thumbnails from Google Drive folders
  const { thumbnails: batchThumbnails } = useBatchThumbnails();

  // Merge treasure data with media (memoized for performance)
  const treasure = useMemo((): TreasureItem[] => {
    // Use Google Sheets data if available, otherwise fall back to local data
    const baseTreasure = sheetsTreasure || defaultTreasureData;

    return baseTreasure.map((item) => {
      const itemMedia = legacyMedia[item.item];
      const gallery = galleries[item.item] || [];
      const batchThumb = batchThumbnails[item.item];

      // If we have a gallery, use the first item as the main image
      const mainMedia = gallery[0];

      // Count gallery items (includes legacy media if no gallery)
      const galleryCount = gallery.length || (itemMedia ? 1 : 0);

      // Image Source: Google Drive `products/` folder via batch thumbnails
      // Convert any Google Drive URLs to proxy URLs for reliable loading
      const rawImageUrl = mainMedia?.url || itemMedia?.url || batchThumb?.url;
      const rawThumbnailUrl = mainMedia?.thumbnailUrl || itemMedia?.thumbnailUrl || item.thumbnailUrl;

      // Determine media type: check if batch thumbnail is from a video-only product
      const isVideoOnly = batchThumb?.isVideoThumbnail && !mainMedia && !itemMedia;
      const mediaType = mainMedia?.type || itemMedia?.mediaType || (isVideoOnly ? 'video' : item.mediaType) || 'image';

      return {
        ...item,
        imagen: convertToProxyUrl(rawImageUrl),
        mediaType,
        thumbnailUrl: convertToProxyUrl(rawThumbnailUrl),
        galleryCount,
      };
    });
  }, [sheetsTreasure, legacyMedia, galleries, batchThumbnails]);

  // Track previous treasure array for URL stability check
  const prevTreasure = usePrevious(treasure);

  // Apply URL stability check: reuse previous item objects if URLs haven't changed
  // This prevents false-positive re-renders in memoized components like GridCard
  const stableTreasure = useMemo((): TreasureItem[] => {
    if (!prevTreasure || prevTreasure.length !== treasure.length) {
      return treasure;
    }

    return treasure.map((item, index) => {
      const prevItem = prevTreasure[index];

      // Only reuse previous object if item number matches AND key fields are identical
      if (
        prevItem?.item === item.item &&
        prevItem.imagen === item.imagen &&
        prevItem.thumbnailUrl === item.thumbnailUrl &&
        prevItem.mediaType === item.mediaType &&
        prevItem.galleryCount === item.galleryCount &&
        prevItem.precioCOP === item.precioCOP &&
        prevItem.isJewelry === item.isJewelry &&
        prevItem.estado === item.estado
      ) {
        // URLs unchanged - reuse previous object reference
        // This prevents GridCard re-render due to memo comparison
        return prevItem;
      }

      // URL or other property changed - use new object
      return item;
    });
  }, [treasure, prevTreasure]);

  // Legacy getter for backwards compatibility
  const getTreasureWithMedia = (): TreasureItem[] => stableTreasure;

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
    invalidateGallery,
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
