/**
 * useNewestProducts Hook
 *
 * Fetches the newest products based on when images were uploaded to Google Drive.
 * This is the SOURCE OF TRUTH for "new products" - sorted by image upload date.
 *
 * @author CoomÜnity Council (Aria, Cronos)
 */

import { useState, useEffect, useCallback } from 'react';
import { TreasureItem } from '../types';
import { createLogger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { fetchWithRetry } from '../utils/fetchWithRetry';

const log = createLogger('NewestProducts');

// Cache configuration
const NEWEST_PRODUCTS_CACHE_KEY = STORAGE_KEYS.NEWEST_PRODUCTS_CACHE;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - show cached data longer
const STALE_REVALIDATE_TTL = 5 * 60 * 1000; // After 5 min, refresh in background

interface NewestProduct {
  itemNumber: number;
  folderName: string;
  productName: string;
  imageId: string;
  imageName: string;
  imageCreatedTime: string;
  proxyUrl: string;
}

interface NewestProductsCache {
  products: NewestProduct[];
  timestamp: number;
}

interface UseNewestProductsReturn {
  /** Products with images, sorted by newest upload date */
  newestProducts: TreasureItem[];
  /** Whether products are still loading */
  isLoading: boolean;
  /** Refresh products from Drive */
  refresh: () => void;
}

interface CacheResult {
  products: NewestProduct[] | null;
  isStale: boolean;
  isExpired: boolean;
}

/**
 * Load cached newest products from localStorage
 * Returns cache status for stale-while-revalidate pattern
 */
function loadCache(): CacheResult {
  try {
    const cached = localStorage.getItem(NEWEST_PRODUCTS_CACHE_KEY);
    if (!cached) return { products: null, isStale: true, isExpired: true };

    const { products, timestamp }: NewestProductsCache = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // Fresh: under stale threshold
    if (age < STALE_REVALIDATE_TTL) {
      return { products, isStale: false, isExpired: false };
    }

    // Stale but usable: show immediately, refresh in background
    if (age < CACHE_TTL) {
      return { products, isStale: true, isExpired: false };
    }

    // Expired: still return for instant display, but mark as expired
    return { products, isStale: true, isExpired: true };
  } catch {
    // Ignore cache errors
  }
  return { products: null, isStale: true, isExpired: true };
}

/**
 * Save newest products to localStorage cache
 */
function saveCache(products: NewestProduct[]): void {
  try {
    const cache: NewestProductsCache = {
      products,
      timestamp: Date.now(),
    };
    localStorage.setItem(NEWEST_PRODUCTS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    log.warn('Error saving newest products cache:', error);
  }
}

/**
 * Fetch newest products from API
 */
async function fetchNewestProducts(
  limit: number,
  notifyOnFailure = false
): Promise<NewestProduct[]> {
  try {
    const response = await fetchWithRetry(`/api/get-newest-products?limit=${limit}`, undefined, {
      retries: 3,
      notifyOnFailure,
      failureMessage: 'No se pudieron cargar las novedades.',
    });
    if (!response.ok) {
      log.debug('Failed to fetch newest products');
      return [];
    }

    const data = await response.json();
    if (data.success && data.products) {
      return data.products;
    }
    return [];
  } catch (error) {
    log.debug('Error fetching newest products:', error);
    return [];
  }
}

/**
 * Hook to fetch newest products based on image upload date
 *
 * @param treasure - All treasure items (for merging metadata)
 * @param limit - Maximum number of products to return
 */
export function useNewestProducts(
  treasure: TreasureItem[],
  limit: number = 10
): UseNewestProductsReturn {
  const [newestProductsData, setNewestProductsData] = useState<NewestProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Fetch newest products with stale-while-revalidate pattern
  useEffect(() => {
    const fetchData = async () => {
      // Check cache first - stale-while-revalidate pattern
      const { products: cachedProducts, isStale } = loadCache();

      // If we have cached data, show it immediately (even if stale)
      if (cachedProducts && cachedProducts.length > 0) {
        log.debug(`Using cached newest products (${cachedProducts.length} items, stale: ${isStale})`);
        setNewestProductsData(cachedProducts);
        setIsLoading(false);

        // If cache is fresh, we're done
        if (!isStale) {
          return;
        }

        // Stale or expired: refresh in background (don't block UI)
        log.debug('Cache is stale, refreshing in background...');
        fetchNewestProducts(limit, false).then((freshProducts) => {
          if (freshProducts.length > 0) {
            log.debug(`Background refresh: ${freshProducts.length} products`);
            saveCache(freshProducts);
            setNewestProductsData(freshProducts);
          }
        });
        return;
      }

      // No cache - must fetch (show loading state)
      setIsLoading(true);
      log.debug('No cache, fetching newest products from API...');
      const products = await fetchNewestProducts(limit, true);

      if (products.length > 0) {
        log.debug(`Fetched ${products.length} newest products`);
        saveCache(products);
      }

      setNewestProductsData(products);
      setIsLoading(false);
    };

    fetchData();
  }, [limit, fetchTrigger]);

  // Merge with treasure data for full product info
  const newestProducts: TreasureItem[] = newestProductsData.map((product) => {
    // Find matching treasure item
    const treasureItem = treasure.find((t) => t.item === product.itemNumber);

    if (treasureItem) {
      return {
        ...treasureItem,
        imagen: product.proxyUrl,
        nombre: treasureItem.nombre || product.productName,
      };
    }

    // Fallback if no treasure match (shouldn't happen, but safety first)
    // Using type assertion since this is a minimal fallback for display purposes only
    return {
      item: product.itemNumber,
      nombre: product.productName,
      imagen: product.proxyUrl,
      fechaIngreso: '',
      peso: 0,
      color: '',
      calidad: '',
      cantidad: 1,
      talla: '',
      medidas: '',
      precioCOP: 0,
      ubicacion: '',
      asesor: '',
      estado: 'DISPONIBLE',
      isJewelry: false,
      mediaType: 'image' as const,
    } as TreasureItem;
  });

  // Refresh function
  const refresh = useCallback(() => {
    try {
      localStorage.removeItem(NEWEST_PRODUCTS_CACHE_KEY);
    } catch { /* ignore */ }
    setNewestProductsData([]);
    setFetchTrigger((t) => t + 1);
  }, []);

  return {
    newestProducts,
    isLoading,
    refresh,
  };
}

export default useNewestProducts;
