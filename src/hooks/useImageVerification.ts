/**
 * useImageVerification Hook
 *
 * Provides image verification capabilities integrated with the
 * existing treasure and Cloudinary infrastructure.
 */

import { useState, useCallback } from 'react';
import { TreasureItem, ImageVerificationStatus, ImageQualityLevel } from '../types';

export interface ImageVerificationResult {
  success: boolean;
  url: string;
  source: 'cloudinary' | 'external';
  exists?: boolean;
  publicId?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  createdAt?: string;
  quality?: {
    total: number;
    stars: number;
    label: string;
    breakdown: Record<string, { score?: number; status: string; message: string }>;
  };
  error?: string;
}

export interface ProductImagesResult {
  success: boolean;
  itemNumber: number;
  imageCount: number;
  images: Array<{
    url: string;
    publicId: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
    createdAt: string;
    quality: ImageVerificationResult['quality'];
  }>;
  bestImage: ImageVerificationResult | null;
}

export interface CloudinaryImagesSummary {
  success: boolean;
  summary: {
    totalInventoryImages: number;
    totalProductImages: number;
    itemsWithProductImages: number;
    uniqueInventoryNames: number;
  };
  productsByItem: Record<string, Array<{
    url: string;
    publicId: string;
    format: string;
    createdAt: string;
  }>>;
}

export function useImageVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<Map<number, ProductImagesResult>>(new Map());
  const [cloudinarySummary, setCloudinarySummary] = useState<CloudinaryImagesSummary | null>(null);

  /**
   * Verify a single image URL
   */
  const verifyImageUrl = useCallback(async (url: string): Promise<ImageVerificationResult> => {
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/verify-image?url=${encodeURIComponent(url)}`);
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        url,
        source: 'external',
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    } finally {
      setIsVerifying(false);
    }
  }, []);

  /**
   * Get all images for a product and their quality scores
   */
  const verifyProductImages = useCallback(async (itemNumber: number): Promise<ProductImagesResult> => {
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/verify-image?itemNumber=${itemNumber}`);
      const result = await response.json();

      // Cache result
      setVerificationResults(prev => new Map(prev).set(itemNumber, result));

      return result;
    } catch (error) {
      const errorResult: ProductImagesResult = {
        success: false,
        itemNumber,
        imageCount: 0,
        images: [],
        bestImage: null,
      };
      return errorResult;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  /**
   * Get summary of all images in Cloudinary
   */
  const fetchCloudinarySummary = useCallback(async (): Promise<CloudinaryImagesSummary | null> => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/check-cloudinary-images');
      const result = await response.json();
      setCloudinarySummary(result);
      return result;
    } catch (error) {
      console.error('Failed to fetch Cloudinary summary:', error);
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  /**
   * Batch verify multiple products
   */
  const batchVerifyProducts = useCallback(async (
    itemNumbers: number[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<number, ProductImagesResult>> => {
    const results = new Map<number, ProductImagesResult>();

    for (let i = 0; i < itemNumbers.length; i++) {
      const itemNumber = itemNumbers[i];
      const result = await verifyProductImages(itemNumber);
      results.set(itemNumber, result);
      onProgress?.(i + 1, itemNumbers.length);
    }

    return results;
  }, [verifyProductImages]);

  /**
   * Get cached verification result for a product
   */
  const getCachedVerification = useCallback((itemNumber: number): ProductImagesResult | undefined => {
    return verificationResults.get(itemNumber);
  }, [verificationResults]);

  /**
   * Check if a product has Cloudinary images
   */
  const hasCloudinaryImages = useCallback((itemNumber: number): boolean => {
    if (!cloudinarySummary) return false;
    return !!cloudinarySummary.productsByItem[String(itemNumber)]?.length;
  }, [cloudinarySummary]);

  /**
   * Get verification status based on quality score
   */
  const getVerificationStatus = useCallback((quality: ImageVerificationResult['quality']): ImageVerificationStatus => {
    if (!quality) return 'pending';
    if (quality.stars >= 4) return 'verified';
    if (quality.stars >= 3) return 'needs_review';
    return 'rejected';
  }, []);

  /**
   * Get quality level from star rating
   */
  const getQualityLevel = useCallback((stars: number): ImageQualityLevel => {
    return Math.max(1, Math.min(5, stars)) as ImageQualityLevel;
  }, []);

  /**
   * Get items that need image verification from treasure
   */
  const getItemsNeedingVerification = useCallback((treasure: TreasureItem[]): TreasureItem[] => {
    return treasure.filter(item => {
      // Items without images
      if (!item.imageUrl && !item.imagen) return true;

      // Items with unverified images (not in cache)
      const cached = verificationResults.get(item.item);
      if (!cached) return true;

      // Items with poor quality images
      if (cached.bestImage?.quality?.stars && cached.bestImage.quality.stars < 3) return true;

      return false;
    });
  }, [verificationResults]);

  /**
   * Get items with missing or broken images
   */
  const getItemsWithImageIssues = useCallback(async (treasure: TreasureItem[]): Promise<TreasureItem[]> => {
    const issues: TreasureItem[] = [];

    for (const item of treasure) {
      const imageUrl = item.imageUrl || item.imagen;
      if (!imageUrl) {
        issues.push(item);
        continue;
      }

      // Quick check if URL is valid
      const result = await verifyImageUrl(imageUrl);
      if (!result.success) {
        issues.push(item);
      }
    }

    return issues;
  }, [verifyImageUrl]);

  return {
    // State
    isVerifying,
    verificationResults,
    cloudinarySummary,

    // Single verification
    verifyImageUrl,

    // Product verification
    verifyProductImages,
    getCachedVerification,

    // Batch operations
    batchVerifyProducts,
    fetchCloudinarySummary,

    // Utilities
    hasCloudinaryImages,
    getVerificationStatus,
    getQualityLevel,
    getItemsNeedingVerification,
    getItemsWithImageIssues,
  };
}
