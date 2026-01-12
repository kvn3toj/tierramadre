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

const log = createLogger('NewestProducts');

// Cache configuration
const NEWEST_PRODUCTS_CACHE_KEY = 'tierramadre-newest-products-cache-v4';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

/**
 * Load cached newest products from localStorage
 */
function loadCache(): NewestProduct[] | null {
  try {
    const cached = localStorage.getItem(NEWEST_PRODUCTS_CACHE_KEY);
    if (!cached) return null;

    const { products, timestamp }: NewestProductsCache = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return products;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
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
async function fetchNewestProducts(limit: number): Promise<NewestProduct[]> {
  try {
    const response = await fetch(`/api/get-newest-products?limit=${limit}`);
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

  // Fetch newest products from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Check cache first
      const cached = loadCache();
      if (cached && cached.length > 0) {
        log.debug(`Using cached newest products (${cached.length} items)`);
        setNewestProductsData(cached);
        setIsLoading(false);
        return;
      }

      // Fetch from API
      log.debug('Fetching newest products from API...');
      const products = await fetchNewestProducts(limit);

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
    return {
      item: product.itemNumber,
      nombre: product.productName,
      imagen: product.proxyUrl,
      peso: 0,
      mediaType: 'image' as const,
    };
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
