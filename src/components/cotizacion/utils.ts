/**
 * Cotizacion Utilities
 * Helper functions for quotation generation and URL handling.
 */
import { CotizacionProduct } from '../../hooks/useCotizacion';
import { PRODUCTION_URL } from './constants';

/**
 * Extract Google Drive file ID from various URL formats
 * Handles:
 * - /api/serve-drive-image?fileId={id}
 * - https://drive.google.com/uc?export=download&id={id}
 * - https://drive.google.com/file/d/{id}/view
 * - https://drive.google.com/file/d/{id}/preview
 */
export const extractDriveFileId = (url: string | undefined): string | null => {
  if (!url) return null;

  // Handle proxy URL: /api/serve-drive-image?fileId={id}
  if (url.includes('/api/serve-drive-image?fileId=')) {
    return url.split('fileId=')[1]?.split('&')[0] || null;
  }

  // Handle download URL: https://drive.google.com/uc?export=download&id={id}
  const downloadMatch = url.match(/[?&]id=([^&]+)/);
  if (downloadMatch) {
    return downloadMatch[1];
  }

  // Handle view/preview URL: https://drive.google.com/file/d/{id}/...
  const viewMatch = url.match(/\/file\/d\/([^/]+)/);
  if (viewMatch) {
    return viewMatch[1];
  }

  return null;
};

/**
 * Generate a URL-safe slug from product name
 */
export const generateProductSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

/**
 * Get the display URL for a product
 * - For manual products with media (GIF/image): shortened Drive link
 * - For inventory products: product detail page URL
 * - Fallback: website base URL
 */
export const getProductDisplayUrl = (product: CotizacionProduct): string => {
  // Manual product with media URL (GIF converted from video, or image) - show shortened Drive link
  if (product.isManual && (product.videoUrl || product.gifUrl)) {
    const mediaUrl = product.videoUrl || product.gifUrl;
    const fileId = extractDriveFileId(mediaUrl);
    if (fileId) {
      return `drive.google.com/file/d/${fileId.substring(0, 8)}...`;
    }
  }

  // Inventory products: show product detail page URL
  if (!product.isManual) {
    return `${PRODUCTION_URL}/product/${product.itemNumber}`;
  }

  // Manual products without video: show base Vercel URL
  return PRODUCTION_URL;
};

/**
 * Get the QR code URL based on product types
 * - For manual products with media (GIF/image): links to Drive file
 * - For single inventory product: links to product detail page
 * - For multiple inventory products: links to Treasure Browser with filtered items
 */
export const getQrCodeUrl = (products: CotizacionProduct[]): string => {
  if (products.length === 0) {
    return `https://${PRODUCTION_URL}/tesoro`;
  }

  const manualProducts = products.filter(p => p.isManual);
  const inventoryProducts = products.filter(p => !p.isManual);

  // If only manual products with media, link to the first media file (GIF or image)
  if (manualProducts.length > 0 && inventoryProducts.length === 0) {
    const productWithMedia = manualProducts.find(p => p.videoUrl || p.gifUrl || p.imagen);
    if (productWithMedia) {
      // PRIORITY 1: Use videoUrl/gifUrl if available (both point to GIF file now)
      const gifOrVideoUrl = productWithMedia.videoUrl || productWithMedia.gifUrl;
      if (gifOrVideoUrl) {
        const fileId = extractDriveFileId(gifOrVideoUrl);
        if (fileId) {
          return `https://drive.google.com/file/d/${fileId}/view`;
        }
        if (gifOrVideoUrl.includes('drive.google.com')) {
          return gifOrVideoUrl;
        }
      }

      // PRIORITY 2: Use imagen if it's a Drive URL
      const mediaUrl = productWithMedia.imagen;
      const imageFileId = extractDriveFileId(mediaUrl);
      if (imageFileId) {
        return `https://drive.google.com/file/d/${imageFileId}/view`;
      }

      // For other URLs (like Cloudinary), use directly
      if (mediaUrl) {
        return mediaUrl;
      }
    }
  }

  // For inventory products, check if single or multiple
  if (inventoryProducts.length === 1 && manualProducts.length === 0) {
    // Single inventory product: link directly to product detail page
    return `https://${PRODUCTION_URL}/product/${inventoryProducts[0].itemNumber}`;
  }

  // Multiple products: link to Treasure Browser with all item numbers
  const itemNumbers = products.map(p => p.itemNumber).join(',');
  return `https://${PRODUCTION_URL}/tesoro?items=${itemNumbers}&status=all`;
};
