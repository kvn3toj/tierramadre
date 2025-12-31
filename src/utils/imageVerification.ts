/**
 * Image Verification Utilities
 * For Tierra Madre Emerald Treasure
 *
 * Provides quality analysis, URL validation, and verification workflow helpers.
 */

import {
  ImageQualityCheck,
  ImageQualityLevel,
  ImageMetadata,
  ImageVerificationStatus,
  EmeraldImageGallery,
} from '../types';
import { analyzeImage, loadImage, getImageData } from './imageNormalizer';

// Cloudinary configuration
const CLOUDINARY_CLOUD = 'dyam6g2os';
const CLOUDINARY_FOLDER = 'tierramadre/treasure';

// Quality thresholds
const QUALITY_THRESHOLDS = {
  minResolution: 1200,         // Minimum width/height in pixels
  minFileSize: 100 * 1024,     // 100KB minimum
  maxFileSize: 5 * 1024 * 1024, // 5MB maximum
  idealBrightnessMin: 120,
  idealBrightnessMax: 180,
  idealContrastMin: 40,
  idealContrastMax: 70,
  emeraldGreenHueMin: 80,      // HSL hue range for emerald green
  emeraldGreenHueMax: 160,
};

/**
 * Validate if a URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  // Check for data URLs (base64)
  if (url.startsWith('data:image/')) return true;

  // Check for valid HTTP/HTTPS URLs
  try {
    const parsed = new URL(url);
    const validProtocols = ['http:', 'https:'];
    if (!validProtocols.includes(parsed.protocol)) return false;

    // Check for known image hosts
    const imageHosts = [
      'res.cloudinary.com',
      'drive.google.com',
      'lh3.googleusercontent.com',
      'storage.googleapis.com',
      'i.imgur.com',
    ];

    // Also accept any URL ending in image extension
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
    const hasImageExtension = imageExtensions.some(ext =>
      parsed.pathname.toLowerCase().includes(ext)
    );

    return imageHosts.includes(parsed.hostname) || hasImageExtension;
  } catch {
    return false;
  }
}

/**
 * Extract Google Drive file ID from various Drive URL formats
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,           // /file/d/FILE_ID/
    /\/d\/([a-zA-Z0-9_-]+)/,                  // /d/FILE_ID/
    /id=([a-zA-Z0-9_-]+)/,                    // ?id=FILE_ID
    /\/([a-zA-Z0-9_-]{25,})/,                 // Direct ID (25+ chars)
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

/**
 * Convert Google Drive URL to direct image URL
 */
export function getDriveDirectUrl(fileIdOrUrl: string): string {
  const fileId = extractDriveFileId(fileIdOrUrl) || fileIdOrUrl;
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Generate Cloudinary URL with optimizations
 */
export function getCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
    quality?: 'auto' | number;
    format?: 'auto' | 'jpg' | 'png' | 'webp';
  } = {}
): string {
  const { width, height, crop = 'fit', quality = 'auto', format = 'auto' } = options;

  const transforms: string[] = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);

  const transformString = transforms.join(',');

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/${transformString}/${CLOUDINARY_FOLDER}/${publicId}`;
}

/**
 * Analyze image quality for emerald product photography
 */
export async function analyzeImageQuality(
  imageSource: string | File
): Promise<ImageQualityCheck> {
  const recommendations: string[] = [];

  try {
    // Load and analyze image
    const img = await loadImage(imageSource);
    const imageData = getImageData(img);
    const analysis = analyzeImage(imageData);

    // Get file size for URL sources
    let fileSize = 0;
    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:')) {
        // Base64: calculate approximate size
        const base64Data = imageSource.split(',')[1] || imageSource;
        fileSize = Math.round((base64Data.length * 3) / 4);
      } else {
        // Try to fetch headers to get content-length
        try {
          const response = await fetch(imageSource, { method: 'HEAD' });
          fileSize = parseInt(response.headers.get('content-length') || '0');
        } catch {
          fileSize = 0; // Unknown
        }
      }
    } else {
      fileSize = imageSource.size;
    }

    // Resolution check
    const resolutionOk =
      img.naturalWidth >= QUALITY_THRESHOLDS.minResolution ||
      img.naturalHeight >= QUALITY_THRESHOLDS.minResolution;

    if (!resolutionOk) {
      recommendations.push(
        `Resolution too low (${img.naturalWidth}x${img.naturalHeight}). Minimum ${QUALITY_THRESHOLDS.minResolution}px recommended.`
      );
    }

    // File size check
    const fileSizeOk =
      fileSize >= QUALITY_THRESHOLDS.minFileSize &&
      fileSize <= QUALITY_THRESHOLDS.maxFileSize;

    if (fileSize > 0 && fileSize < QUALITY_THRESHOLDS.minFileSize) {
      recommendations.push('File size too small. May indicate low quality compression.');
    }
    if (fileSize > QUALITY_THRESHOLDS.maxFileSize) {
      recommendations.push('File size too large. Consider optimizing for web delivery.');
    }

    // Brightness check
    if (analysis.brightness < QUALITY_THRESHOLDS.idealBrightnessMin) {
      recommendations.push('Image appears too dark. Consider increasing exposure or lighting.');
    }
    if (analysis.brightness > QUALITY_THRESHOLDS.idealBrightnessMax) {
      recommendations.push('Image appears overexposed. Consider reducing exposure.');
    }

    // Contrast check
    if (analysis.contrast < QUALITY_THRESHOLDS.idealContrastMin) {
      recommendations.push('Low contrast detected. Image may appear flat or hazy.');
    }
    if (analysis.contrast > QUALITY_THRESHOLDS.idealContrastMax) {
      recommendations.push('High contrast detected. May lose detail in shadows/highlights.');
    }

    // Emerald color detection
    const emeraldColorScore = detectEmeraldGreen(imageData);
    if (emeraldColorScore < 30) {
      recommendations.push('Low emerald green detected. Verify correct product photo.');
    }

    // Calculate sharpness (simplified edge detection)
    const sharpness = calculateSharpness(imageData);
    if (sharpness < 30) {
      recommendations.push('Image appears blurry. Consider retaking with better focus.');
    }

    // Calculate overall score (1-5)
    const overallScore = calculateOverallScore({
      resolutionOk,
      fileSizeOk,
      brightness: analysis.brightness,
      contrast: analysis.contrast,
      sharpness,
      emeraldColorScore,
    });

    return {
      resolution: {
        width: img.naturalWidth,
        height: img.naturalHeight,
        isAcceptable: resolutionOk,
      },
      fileSize: {
        bytes: fileSize,
        isOptimal: fileSizeOk,
      },
      brightness: analysis.brightness,
      contrast: analysis.contrast,
      sharpness,
      colorAccuracy: emeraldColorScore,
      overallScore,
      recommendations,
    };
  } catch (error) {
    console.error('Image analysis failed:', error);
    return {
      resolution: { width: 0, height: 0, isAcceptable: false },
      fileSize: { bytes: 0, isOptimal: false },
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      colorAccuracy: 0,
      overallScore: 1,
      recommendations: ['Failed to analyze image. Please verify the image URL is accessible.'],
    };
  }
}

/**
 * Detect presence of emerald green tones in image
 */
function detectEmeraldGreen(imageData: ImageData): number {
  const { data } = imageData;
  let emeraldPixels = 0;
  let totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Convert to HSL to detect green hues
    const [h, s, l] = rgbToHsl(r, g, b);

    // Check if pixel is in emerald green range
    // Emerald green: H ~120-160, S > 30%, L 20-70%
    if (
      h >= 80 && h <= 170 &&   // Green hue range
      s > 0.2 &&                // Minimum saturation
      l > 0.15 && l < 0.75      // Not too dark or bright
    ) {
      emeraldPixels++;
    }
  }

  return Math.round((emeraldPixels / totalPixels) * 100);
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  return [h, s, l];
}

/**
 * Calculate image sharpness using Laplacian variance
 */
function calculateSharpness(imageData: ImageData): number {
  const { data, width, height } = imageData;

  // Convert to grayscale and apply Laplacian operator
  let variance = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Get grayscale values of neighbors
      const getGray = (offset: number) => {
        const r = data[idx + offset];
        const g = data[idx + offset + 1];
        const b = data[idx + offset + 2];
        return 0.299 * r + 0.587 * g + 0.114 * b;
      };

      // Laplacian kernel: [-1, -1, -1], [-1, 8, -1], [-1, -1, -1]
      const center = getGray(0);
      const left = getGray(-4);
      const right = getGray(4);
      const top = getGray(-width * 4);
      const bottom = getGray(width * 4);

      const laplacian = 4 * center - left - right - top - bottom;
      variance += laplacian * laplacian;
      count++;
    }
  }

  // Normalize to 0-100 scale
  const avgVariance = variance / count;
  return Math.min(100, Math.round(Math.sqrt(avgVariance) * 2));
}

/**
 * Calculate overall quality score (1-5)
 */
function calculateOverallScore(metrics: {
  resolutionOk: boolean;
  fileSizeOk: boolean;
  brightness: number;
  contrast: number;
  sharpness: number;
  emeraldColorScore: number;
}): ImageQualityLevel {
  let score = 0;

  // Resolution (20 points)
  if (metrics.resolutionOk) score += 20;

  // File size (10 points)
  if (metrics.fileSizeOk) score += 10;

  // Brightness (20 points)
  const brightnessDiff = Math.abs(150 - metrics.brightness);
  if (brightnessDiff < 30) score += 20;
  else if (brightnessDiff < 50) score += 15;
  else if (brightnessDiff < 70) score += 10;
  else score += 5;

  // Contrast (15 points)
  if (metrics.contrast >= 40 && metrics.contrast <= 70) score += 15;
  else if (metrics.contrast >= 30 && metrics.contrast <= 80) score += 10;
  else score += 5;

  // Sharpness (20 points)
  if (metrics.sharpness >= 60) score += 20;
  else if (metrics.sharpness >= 40) score += 15;
  else if (metrics.sharpness >= 20) score += 10;
  else score += 5;

  // Emerald color presence (15 points)
  if (metrics.emeraldColorScore >= 20) score += 15;
  else if (metrics.emeraldColorScore >= 10) score += 10;
  else if (metrics.emeraldColorScore >= 5) score += 5;

  // Convert to 1-5 scale
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

/**
 * Create initial image metadata from URL
 */
export function createImageMetadata(
  sourceUrl: string,
  options: Partial<ImageMetadata> = {}
): ImageMetadata {
  return {
    sourceUrl,
    uploadedAt: new Date().toISOString(),
    verificationStatus: 'pending',
    ...options,
  };
}

/**
 * Verify image and update metadata with quality check
 */
export async function verifyImage(
  metadata: ImageMetadata,
  verifiedBy?: string
): Promise<ImageMetadata> {
  const qualityCheck = await analyzeImageQuality(metadata.sourceUrl);

  let status: ImageVerificationStatus = 'verified';
  if (qualityCheck.overallScore <= 2) {
    status = 'rejected';
  } else if (qualityCheck.overallScore === 3) {
    status = 'needs_review';
  }

  return {
    ...metadata,
    verifiedAt: new Date().toISOString(),
    verificationStatus: status,
    qualityCheck,
    verifiedBy,
  };
}

/**
 * Create empty gallery structure
 */
export function createEmptyGallery(): EmeraldImageGallery {
  return {
    primary: createImageMetadata(''),
    gallery: [],
    hasAllAngles: false,
    hasMacro: false,
    hasLifestyle: false,
  };
}

/**
 * Check if image URL is accessible
 */
export async function checkImageAccessibility(url: string): Promise<{
  accessible: boolean;
  error?: string;
  redirectUrl?: string;
}> {
  try {
    await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return { accessible: true };
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch verify multiple images
 */
export async function batchVerifyImages(
  urls: string[],
  onProgress?: (current: number, total: number, result: ImageQualityCheck) => void
): Promise<Map<string, ImageQualityCheck>> {
  const results = new Map<string, ImageQualityCheck>();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const result = await analyzeImageQuality(url);
    results.set(url, result);
    onProgress?.(i + 1, urls.length, result);
  }

  return results;
}

/**
 * Get quality level label
 */
export function getQualityLabel(score: ImageQualityLevel): string {
  const labels: Record<ImageQualityLevel, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
  };
  return labels[score];
}

/**
 * Get quality level color
 */
export function getQualityColor(score: ImageQualityLevel): string {
  const colors: Record<ImageQualityLevel, string> = {
    1: '#ef4444', // red
    2: '#f97316', // orange
    3: '#eab308', // yellow
    4: '#22c55e', // green
    5: '#10b981', // emerald
  };
  return colors[score];
}
