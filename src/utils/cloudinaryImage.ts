/**
 * Cloudinary Image Optimization Utility
 * Generates optimized URLs with WebP/AVIF, responsive srcset, and quality auto.
 */

// Cloudinary base URL for reference
export const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/dyam6g2os';

export interface CloudinaryOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Quality setting */
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:best' | number;
  /** Image format */
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  /** Crop mode */
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit';
  /** Gravity for cropping */
  gravity?: 'auto' | 'face' | 'center';
  /** Device pixel ratio */
  dpr?: 'auto' | number;
}

/**
 * Check if URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicId(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;

  // Match pattern: /upload/v{version}/{public_id}.{ext}
  // or /upload/{transformations}/v{version}/{public_id}.{ext}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
  if (match) {
    // Remove any transformation prefix if present
    const parts = match[1].split('/');
    // Find where the actual path starts (after transformations)
    const pathStart = parts.findIndex(p => !p.includes(',') && !p.includes('_'));
    return parts.slice(pathStart >= 0 ? pathStart : 0).join('/');
  }

  return null;
}

/**
 * Build transformation string from options
 */
function buildTransformations(options: CloudinaryOptions): string {
  const transforms: string[] = [];

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.quality) transforms.push(`q_${options.quality}`);
  if (options.format) transforms.push(`f_${options.format}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.gravity) transforms.push(`g_${options.gravity}`);
  if (options.dpr) transforms.push(`dpr_${options.dpr}`);

  return transforms.join(',');
}

/**
 * Get optimized Cloudinary URL with transformations
 */
export function getCloudinaryUrl(url: string, options: CloudinaryOptions = {}): string {
  if (!url) return url;

  // If not a Cloudinary URL, return as-is
  if (!isCloudinaryUrl(url)) return url;

  // Default options for optimization
  const defaultOptions: CloudinaryOptions = {
    quality: 'auto:good',
    format: 'auto',
    ...options,
  };

  const transforms = buildTransformations(defaultOptions);
  if (!transforms) return url;

  // Insert transformations after /upload/
  // Handle both formats:
  // - https://res.cloudinary.com/cloud/image/upload/v123/folder/file.jpg
  // - https://res.cloudinary.com/cloud/image/upload/folder/file.jpg
  const uploadPattern = /\/upload\/(v\d+\/)?/;

  if (url.match(uploadPattern)) {
    return url.replace(uploadPattern, `/upload/${transforms}/$1`);
  }

  return url;
}

/**
 * Generate responsive srcset for different screen sizes
 */
export function getResponsiveSrcSet(
  url: string,
  widths: number[] = [280, 400, 560, 800, 1200]
): string {
  if (!url || !isCloudinaryUrl(url)) return '';

  return widths
    .map(width => {
      const optimizedUrl = getCloudinaryUrl(url, {
        width,
        quality: 'auto:good',
        format: 'auto',
        crop: 'fill',
      });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Get LQIP (Low Quality Image Placeholder) URL
 * Returns a tiny blurred version for blur-up effect
 */
export function getLQIPUrl(url: string): string {
  if (!url || !isCloudinaryUrl(url)) return url;

  return getCloudinaryUrl(url, {
    width: 20,
    quality: 30,
    format: 'webp',
    crop: 'fill',
  });
}

/**
 * Get optimal image size based on container width and device pixel ratio
 */
export function getOptimalWidth(containerWidth: number, dpr: number = 1): number {
  // Round up to nearest standard size for better caching
  const targetWidth = containerWidth * dpr;
  const standardWidths = [100, 200, 280, 400, 560, 800, 1200, 1600];

  return standardWidths.find(w => w >= targetWidth) || standardWidths[standardWidths.length - 1];
}

/**
 * Generate sizes attribute for responsive images
 * Based on MUI breakpoints and typical layout
 */
export function getImageSizes(layout: 'grid' | 'full' | 'thumbnail' = 'grid'): string {
  switch (layout) {
    case 'full':
      return '100vw';
    case 'thumbnail':
      return '80px';
    case 'grid':
    default:
      // Grid layout: 1 col xs, 2 col sm, 3 col md, 4 col lg
      return '(max-width: 600px) 100vw, (max-width: 900px) 50vw, (max-width: 1200px) 33vw, 25vw';
  }
}
