/**
 * Vercel Serverless Function - Verify Image Quality
 *
 * Checks if an image URL is accessible and returns metadata.
 * Works with Cloudinary, Google Drive, and other URLs.
 *
 * GET /api/verify-image?url=<image_url>
 * GET /api/verify-image?itemNumber=<number>
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyam6g2os',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Extract Cloudinary public_id from URL
 */
function extractCloudinaryPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;

  try {
    // Pattern: .../upload/v12345/folder/image.jpg
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (match) return match[1];

    // Pattern: .../image/upload/transformations/folder/image.jpg
    const match2 = url.match(/\/image\/upload\/(?:[^/]+\/)*?([^/]+\/[^/]+)(?:\.\w+)?$/);
    if (match2) return match2[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Get image info from Cloudinary
 */
async function getCloudinaryImageInfo(publicId) {
  try {
    const result = await cloudinary.api.resource(publicId, {
      image_metadata: true,
      colors: true,
      quality_analysis: true,
    });

    return {
      exists: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      createdAt: result.created_at,
      colors: result.colors?.slice(0, 5), // Top 5 colors
      metadata: result.image_metadata,
      qualityAnalysis: result.quality_analysis,
    };
  } catch (error) {
    if (error.http_code === 404) {
      return { exists: false, error: 'Image not found in Cloudinary' };
    }
    throw error;
  }
}

/**
 * Get all images for a product from Cloudinary
 */
async function getProductImages(itemNumber) {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `tierramadre/product-${itemNumber}`,
      max_results: 50,
      context: true,
      metadata: true,
    });

    return result.resources.map(resource => ({
      url: resource.secure_url,
      publicId: resource.public_id,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      bytes: resource.bytes,
      createdAt: resource.created_at,
      context: resource.context,
    }));
  } catch (error) {
    console.error('Error fetching product images:', error);
    return [];
  }
}

/**
 * Check if external URL is accessible
 */
async function checkExternalUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      accessible: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: parseInt(response.headers.get('content-length') || '0'),
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
}

/**
 * Analyze image quality based on dimensions and size
 */
function analyzeQuality(info) {
  const score = { total: 0, max: 100, breakdown: {} };

  // Resolution (40 points)
  const minDimension = Math.min(info.width || 0, info.height || 0);
  if (minDimension >= 1200) {
    score.breakdown.resolution = { score: 40, status: 'excellent', message: 'High resolution' };
  } else if (minDimension >= 800) {
    score.breakdown.resolution = { score: 30, status: 'good', message: 'Good resolution' };
  } else if (minDimension >= 400) {
    score.breakdown.resolution = { score: 15, status: 'fair', message: 'Low resolution' };
  } else {
    score.breakdown.resolution = { score: 5, status: 'poor', message: 'Very low resolution' };
  }
  score.total += score.breakdown.resolution.score;

  // File size (30 points) - optimal between 100KB and 3MB
  const sizeKB = (info.bytes || 0) / 1024;
  if (sizeKB >= 100 && sizeKB <= 3000) {
    score.breakdown.fileSize = { score: 30, status: 'optimal', message: `${Math.round(sizeKB)}KB - Good size` };
  } else if (sizeKB < 100) {
    score.breakdown.fileSize = { score: 15, status: 'warning', message: 'File too small - may be low quality' };
  } else if (sizeKB <= 5000) {
    score.breakdown.fileSize = { score: 20, status: 'good', message: 'Large file - consider compression' };
  } else {
    score.breakdown.fileSize = { score: 10, status: 'warning', message: 'File very large - needs compression' };
  }
  score.total += score.breakdown.fileSize.score;

  // Format (15 points)
  const format = (info.format || '').toLowerCase();
  if (['jpg', 'jpeg', 'webp'].includes(format)) {
    score.breakdown.format = { score: 15, status: 'optimal', message: `${format.toUpperCase()} - Web optimized` };
  } else if (format === 'png') {
    score.breakdown.format = { score: 12, status: 'good', message: 'PNG - Good for transparency' };
  } else {
    score.breakdown.format = { score: 5, status: 'warning', message: `${format} - Consider converting` };
  }
  score.total += score.breakdown.format.score;

  // Aspect ratio (15 points) - prefer square-ish or portrait for product photos
  const ratio = (info.width || 1) / (info.height || 1);
  if (ratio >= 0.8 && ratio <= 1.25) {
    score.breakdown.aspectRatio = { score: 15, status: 'optimal', message: 'Square format - ideal for catalogs' };
  } else if (ratio >= 0.6 && ratio <= 1.5) {
    score.breakdown.aspectRatio = { score: 12, status: 'good', message: 'Good aspect ratio' };
  } else {
    score.breakdown.aspectRatio = { score: 5, status: 'warning', message: 'Unusual aspect ratio' };
  }
  score.total += score.breakdown.aspectRatio.score;

  // Calculate star rating (1-5)
  score.stars = Math.ceil(score.total / 20);
  score.label = score.stars >= 4 ? 'Excellent' : score.stars >= 3 ? 'Good' : score.stars >= 2 ? 'Fair' : 'Poor';

  return score;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, itemNumber } = req.query;

  try {
    // If itemNumber provided, get all images for that product
    if (itemNumber) {
      const images = await getProductImages(parseInt(itemNumber));

      // Analyze each image
      const analyzed = images.map(img => ({
        ...img,
        quality: analyzeQuality(img),
      }));

      // Sort by quality score
      analyzed.sort((a, b) => b.quality.total - a.quality.total);

      return res.status(200).json({
        success: true,
        itemNumber: parseInt(itemNumber),
        imageCount: analyzed.length,
        images: analyzed,
        bestImage: analyzed[0] || null,
        timestamp: new Date().toISOString(),
      });
    }

    // If URL provided, verify that specific image
    if (url) {
      // Check if it's a Cloudinary URL
      const publicId = extractCloudinaryPublicId(url);

      if (publicId) {
        // Get detailed info from Cloudinary
        const info = await getCloudinaryImageInfo(publicId);

        if (!info.exists) {
          return res.status(200).json({
            success: false,
            url,
            ...info,
          });
        }

        return res.status(200).json({
          success: true,
          url,
          source: 'cloudinary',
          ...info,
          quality: analyzeQuality(info),
        });
      }

      // External URL (Google Drive, etc.)
      const check = await checkExternalUrl(url);

      return res.status(200).json({
        success: check.accessible,
        url,
        source: 'external',
        ...check,
        quality: check.accessible ? {
          total: 50, // Unknown quality for external URLs
          stars: 3,
          label: 'Unknown',
          breakdown: {
            note: { message: 'Quality analysis requires Cloudinary URL' },
          },
        } : null,
      });
    }

    return res.status(400).json({
      error: 'Missing parameter',
      message: 'Provide either url or itemNumber query parameter',
    });

  } catch (error) {
    console.error('Error verifying image:', error);
    return res.status(500).json({
      error: 'Verification failed',
      message: error.message,
    });
  }
}
