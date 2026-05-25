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

import { useMemo } from "react";
import { TreasureItem } from "../types";
import { treasureData as defaultTreasureData } from "../data/treasure";
import { useSheetsTreasure } from "./useSheetsTreasure";
import { useTreasureMedia } from "./useTreasureMedia";
import { useBatchThumbnails } from "./useBatchThumbnails";
import { usePrevious } from "./usePrevious";
import {
  useFotosintesisCatalog,
  useFotosintesisGroups,
} from "./useFotosintesisCatalog";
import { convertToProxyUrl } from "../utils/driveUrl";

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
  const { thumbnails: batchThumbnails, isLoading: isLoadingThumbnails } =
    useBatchThumbnails();

  // Published Fotosíntesis items (Convex) — captured through the lot wizard
  // and published to catalog. They live in a separate sheet the legacy reader
  // never touches, so we merge them in here.
  const fotosintesisItems = useFotosintesisCatalog();
  // Grouped lote/sublote bundle cards + the member item ids they absorb.
  const { groupCards, excludedItemIds } = useFotosintesisGroups();

  // Merge treasure data with media (memoized for performance)
  const treasure = useMemo((): TreasureItem[] => {
    // Use Google Sheets data if available, otherwise fall back to local data
    const sheetsBase = sheetsTreasure || defaultTreasureData;

    // Append published Fotosíntesis items, skipping any id already present in
    // the legacy catalog so a number collision never duplicates a card, and
    // skipping items absorbed into a grouped lote/sublote card.
    const sheetIds = new Set(sheetsBase.map((i) => i.item));
    const individuals = fotosintesisItems.filter(
      (i) => !sheetIds.has(i.item) && !excludedItemIds.has(i.item),
    );
    const lotes = groupCards.filter((g) => !sheetIds.has(g.item));
    const baseTreasure =
      individuals.length || lotes.length
        ? [...sheetsBase, ...individuals, ...lotes]
        : sheetsBase;

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
      const rawImageUrl =
        mainMedia?.url || itemMedia?.url || batchThumb?.url || item.imagen;
      const rawThumbnailUrl =
        mainMedia?.thumbnailUrl || itemMedia?.thumbnailUrl || item.thumbnailUrl;

      // Determine media type: check if batch thumbnail is from a video-only product
      const isVideoOnly =
        batchThumb?.isVideoThumbnail && !mainMedia && !itemMedia;
      const mediaType =
        mainMedia?.type ||
        itemMedia?.mediaType ||
        (isVideoOnly ? "video" : item.mediaType) ||
        "image";

      return {
        ...item,
        imagen: convertToProxyUrl(rawImageUrl),
        mediaType,
        thumbnailUrl: convertToProxyUrl(rawThumbnailUrl),
        galleryCount,
        tinyThumb: batchThumb?.tinyThumb,
      };
    });
  }, [
    sheetsTreasure,
    legacyMedia,
    galleries,
    batchThumbnails,
    fotosintesisItems,
    groupCards,
    excludedItemIds,
  ]);

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
        prevItem.isLote === item.isLote &&
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

    // Loading states
    isLoadingThumbnails,
    isLoadingSheets,
    sheetsError,
    refreshFromSheets,
    isUsingSheets,
  };
}

export default useTreasure;
