/**
 * useNewProductImages Hook
 *
 * Pre-fetches images from Google Drive folders for the newest products.
 * Google Drive folders are the SOURCE OF TRUTH for new product images.
 * Products are only displayed if they have a folder with images in Drive.
 *
 * @author CoomÜnity Council (Aria, Cronos)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TreasureItem } from '../types';
import { createLogger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants/storage-keys';

const log = createLogger('NewProductImages');

// Cache configuration
const DRIVE_IMAGES_CACHE_KEY = STORAGE_KEYS.DRIVE_IMAGES_CACHE;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface DriveImage {
  id: string;
  name: string;
  url: string;
  proxyUrl: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
}

interface DriveImagesCache {
  [itemNumber: number]: {
    images: DriveImage[];
    timestamp: number;
  };
}

interface UseNewProductImagesReturn {
  /** Products with Drive images merged in */
  productsWithImages: TreasureItem[];
  /** Whether images are still loading */
  isLoading: boolean;
  /** Refresh images from Drive */
  refresh: () => void;
}

/**
 * Load cached Drive images from localStorage
 */
function loadCache(): DriveImagesCache {
  try {
    const cached = localStorage.getItem(DRIVE_IMAGES_CACHE_KEY);
    if (!cached) return {};
    return JSON.parse(cached);
  } catch {
    return {};
  }
}

/**
 * Get initial cache synchronously to prevent image blinking
 * Filters to only return valid (non-expired) entries
 */
function getInitialCache(): DriveImagesCache {
  const cache = loadCache();
  const validCache: DriveImagesCache = {};
  for (const [key, entry] of Object.entries(cache)) {
    if (isCacheValid(entry.timestamp)) {
      validCache[parseInt(key, 10)] = entry;
    }
  }
  return validCache;
}

/**
 * Save Drive images to localStorage cache
 */
function saveCache(cache: DriveImagesCache): void {
  try {
    localStorage.setItem(DRIVE_IMAGES_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    log.warn('Error saving drive images cache:', error);
  }
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Fetch images from Google Drive for a product
 */
async function fetchDriveImages(itemNumber: number): Promise<DriveImage[]> {
  try {
    const response = await fetch(`/api/get-drive-images?itemNumber=${itemNumber}`);
    if (!response.ok) {
      log.debug(`No Drive images for item ${itemNumber}`);
      return [];
    }

    const data = await response.json();
    if (data.success && data.images && data.images.length > 0) {
      return data.images;
    }
    return [];
  } catch (error) {
    log.debug(`Error fetching Drive images for item ${itemNumber}:`, error);
    return [];
  }
}

/**
 * Hook to pre-fetch and manage Drive images for new products
 *
 * @param treasure - All treasure items from Sheets
 * @param maxDisplay - Maximum number of products to display (with images)
 * @param scanLimit - How many newest items to scan for Drive images (default: 50)
 */
export function useNewProductImages(
  treasure: TreasureItem[],
  maxDisplay: number = 10,
  scanLimit: number = 50
): UseNewProductImagesReturn {
  // Initialize with cached data synchronously to prevent image blinking
  const [driveImages, setDriveImages] = useState<DriveImagesCache>(getInitialCache);
  const [isLoading, setIsLoading] = useState(() => Object.keys(getInitialCache()).length === 0);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Get newest items by item number (highest = newest)
  // Scan more items than we display to find ones with Drive images
  const newestItems = useMemo(() => {
    return [...treasure]
      .sort((a, b) => (b.item || 0) - (a.item || 0))
      .slice(0, scanLimit);
  }, [treasure, scanLimit]);

  // Fetch Drive images for newest items
  // Drive folders are the SOURCE OF TRUTH - always check Drive first
  // OPTIMIZATION: Stop fetching once we have enough products with images
  useEffect(() => {
    if (newestItems.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchImages = async () => {
      setIsLoading(true);
      const cache = loadCache();
      const newCache = { ...cache };
      let cacheUpdated = false;

      // Count how many products already have images in cache
      const seenNames = new Set<string>();
      let productsWithImagesCount = 0;

      // First pass: count cached products with images
      for (const item of newestItems) {
        const itemNumber = item.item;
        if (!itemNumber) continue;

        const normalizedName = (item.nombre || '').replace(/\n/g, ' ').trim().toLowerCase();
        if (normalizedName && seenNames.has(normalizedName)) continue;

        const cached = cache[itemNumber];
        if (cached && isCacheValid(cached.timestamp) && cached.images.length > 0) {
          if (normalizedName) seenNames.add(normalizedName);
          productsWithImagesCount++;
        }
      }

      // If we already have enough from cache, skip fetching
      if (productsWithImagesCount >= maxDisplay) {
        log.debug(`Already have ${productsWithImagesCount} products with images from cache, skipping fetch`);
        setDriveImages(cache);
        setIsLoading(false);
        return;
      }

      // Second pass: fetch only items we need
      // Process sequentially in batches to stop early once we have enough
      const BATCH_SIZE = 5;
      const itemsToCheck = newestItems.filter((item) => {
        const itemNumber = item.item;
        if (!itemNumber) return false;
        const cached = cache[itemNumber];
        // Only check items not in valid cache
        return !cached || !isCacheValid(cached.timestamp);
      });

      for (let i = 0; i < itemsToCheck.length; i += BATCH_SIZE) {
        // Check if we have enough products with images
        if (productsWithImagesCount >= maxDisplay) {
          log.debug(`Found ${productsWithImagesCount} products with images, stopping fetch early`);
          break;
        }

        const batch = itemsToCheck.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (item) => {
            const itemNumber = item.item!;
            const images = await fetchDriveImages(itemNumber);
            return { itemNumber, images, nombre: item.nombre };
          })
        );

        // Process batch results
        for (const { itemNumber, images, nombre } of batchResults) {
          newCache[itemNumber] = {
            images,
            timestamp: Date.now(),
          };
          cacheUpdated = true;

          if (images.length > 0) {
            const normalizedName = (nombre || '').replace(/\n/g, ' ').trim().toLowerCase();
            if (!normalizedName || !seenNames.has(normalizedName)) {
              if (normalizedName) seenNames.add(normalizedName);
              productsWithImagesCount++;
              log.debug(`Fetched ${images.length} images for item ${itemNumber} (${productsWithImagesCount}/${maxDisplay})`);
            }
          }
        }

        // Update state after each batch for progressive loading
        setDriveImages({ ...newCache });
      }

      if (cacheUpdated) {
        saveCache(newCache);
      }

      setDriveImages(newCache);
      setIsLoading(false);
    };

    fetchImages();
  }, [newestItems, fetchTrigger, maxDisplay]);

  // Merge Drive images into products
  // Only include products that have images in their Drive folder
  // Limit to maxDisplay items, deduplicate by name (show only one per unique name)
  const productsWithImages = useMemo((): TreasureItem[] => {
    const result: TreasureItem[] = [];
    const seenNames = new Set<string>();

    for (const item of newestItems) {
      // Stop once we have enough items with images
      if (result.length >= maxDisplay) break;

      const itemNumber = item.item;
      if (!itemNumber) continue;

      // Normalize name for deduplication (trim, lowercase, remove newlines)
      const normalizedName = (item.nombre || '')
        .replace(/\n/g, ' ')
        .trim()
        .toLowerCase();

      // Skip if we've already added a product with this name
      if (normalizedName && seenNames.has(normalizedName)) continue;

      // Check for Drive images - this is the source of truth
      const cached = driveImages[itemNumber];
      if (cached && cached.images.length > 0) {
        const mainImage = cached.images[0];
        if (normalizedName) seenNames.add(normalizedName);
        result.push({
          ...item,
          // Use proxy URL for better loading, fallback to direct URL
          imagen: mainImage.proxyUrl || mainImage.url,
          thumbnailUrl: mainImage.thumbnailUrl,
          mediaType: mainImage.type as 'image' | 'video',
          galleryCount: cached.images.length,
        });
      }
      // No Drive images = don't show this product in new products section
    }

    return result;
  }, [newestItems, driveImages, maxDisplay]);

  // Refresh function
  const refresh = useCallback(() => {
    // Clear cache and re-fetch
    try {
      localStorage.removeItem(DRIVE_IMAGES_CACHE_KEY);
    } catch { /* ignore */ }
    setDriveImages({});
    setFetchTrigger((t) => t + 1);
  }, []);

  return {
    productsWithImages,
    isLoading,
    refresh,
  };
}

export default useNewProductImages;
