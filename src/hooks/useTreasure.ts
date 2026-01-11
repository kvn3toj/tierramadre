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

      // Priority: gallery main → legacy media → Sheets imageUrl → original imagen
      // Convert any Google Drive URLs to proxy URLs for reliable loading
      const rawImageUrl = mainMedia?.url || itemMedia?.url || item.imageUrl || item.imagen;
      const rawThumbnailUrl = mainMedia?.thumbnailUrl || itemMedia?.thumbnailUrl || item.thumbnailUrl;

      return {
        ...item,
        imagen: convertToProxyUrl(rawImageUrl),
        mediaType: mainMedia?.type || itemMedia?.mediaType || item.mediaType || 'image',
        thumbnailUrl: convertToProxyUrl(rawThumbnailUrl),
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
