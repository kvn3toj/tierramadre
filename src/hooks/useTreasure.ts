/**
 * useTreasure Hook
 *
 * Main treasure management hook that composes:
 * - useSheetsTreasure: Google Sheets data with caching (product metadata only)
 * - useTreasureMedia: Legacy and gallery media management (localStorage)
 * - useBatchThumbnails: Grid thumbnails from Google Drive product folders (PRIMARY IMAGE SOURCE)
 *
 * IMAGE SOURCE PRIORITY (highest to lowest):
 * 1. Gallery (first item) - Manual gallery uploads from localStorage
 * 2. Legacy media - Legacy localStorage entries
 * 3. Batch thumbnails - First image from Google Drive product folders (PRIMARY)
 * 4. Sheets imageUrl - Fallback from Google Sheets column K (DEPRECATED)
 * 5. Original imagen - Static data fallback
 *
 * PRIMARY IMAGE SOURCE: Google Drive product folders
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
 * Check if a string looks like a valid image URL
 * Filters out text content accidentally placed in image URL fields
 */
function isValidImageUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  // Valid patterns for image URLs
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/api/') ||
    trimmed.startsWith('data:image/') ||
    trimmed.includes('cloudinary.com') ||
    trimmed.includes('drive.google.com') ||
    trimmed.includes('googleusercontent.com')
  );
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

      // Image Priority: gallery → legacy → batch thumbnail (PRIMARY) → Sheets imageUrl (fallback) → imagen
      // Batch thumbnails from Google Drive product folders are the PRIMARY source for most products
      // Convert any Google Drive URLs to proxy URLs for reliable loading
      // Validate fallback URLs to filter out text accidentally placed in image fields (e.g., "Vendido en primicia")
      const validatedImageUrl = isValidImageUrl(item.imageUrl) ? item.imageUrl : undefined;
      const validatedImagen = isValidImageUrl(item.imagen) ? item.imagen : undefined;
      const rawImageUrl = mainMedia?.url || itemMedia?.url || batchThumb?.url || validatedImageUrl || validatedImagen;
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
