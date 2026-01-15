/**
 * Vercel Serverless Function - Serve Image from Google Drive
 *
 * Optimized for Chrome browser compatibility:
 * - Proper CORS headers with Access-Control-Expose-Headers
 * - RFC 5987 compliant Content-Disposition encoding
 * - ETag support for conditional requests
 * - Vary header for proper CDN caching
 * - Accept-Ranges for partial content support
 * - Responsive image sizing via ?size= parameter
 * - HEIC/HEIF fallback to Google Drive thumbnail conversion
 */

import sharp from 'sharp';

/**
 * MIME types that require special handling (not natively supported by browsers)
 * HEIC/HEIF are Apple formats that Chrome/Firefox don't support natively
 */
const UNSUPPORTED_BROWSER_FORMATS = [
  'image/heic',
  'image/heif',
  'image/avif', // Some browsers don't support AVIF yet
];
import {
  initApi,
  sendError,
  CACHE,
} from './_lib/index.js';

import {
  isOAuthConfigured,
  getOAuthDriveClient,
} from './_lib/oauth-drive-client.js';

/**
 * Supported image sizes for responsive loading
 * - thumb: 200px - for small grid thumbnails
 * - small: 400px - for grid cards
 * - medium: 800px - for detail view previews
 * - large: 1200px - for full detail view
 * - original: no resize - full quality
 */
const IMAGE_SIZES = {
  thumb: 200,
  small: 400,
  medium: 800,
  large: 1200,
  original: null,
};

/**
 * Encode filename for Content-Disposition header (RFC 5987)
 * Chrome is strict about header encoding - Safari is lenient
 */
function encodeFilename(filename) {
  // Remove or replace problematic characters for ASCII fallback
  const sanitized = filename.replace(/[^\w\s.-]/g, '_');
  return sanitized;
}

/**
 * Generate ETag from file metadata for conditional requests
 */
function generateETag(fileId, size, mimeType) {
  const hash = Buffer.from(`${fileId}-${size}-${mimeType}`).toString('base64').slice(0, 16);
  return `"${hash}"`;
}

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'HEAD', 'OPTIONS'] })) return;

  if (!isOAuthConfigured()) {
    return sendError(res, 500, 'Google OAuth not configured');
  }

  try {
    const { fileId, thumbnail, size: sizeParam = 'original' } = req.query;

    if (!fileId) {
      return sendError(res, 400, 'fileId is required');
    }

    // Validate size parameter for responsive images
    const targetWidth = IMAGE_SIZES[sizeParam] ?? IMAGE_SIZES.original;

    const drive = await getOAuthDriveClient();

    // Get file metadata first (needed for all request types)
    const metadataResponse = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size',
      supportsAllDrives: true,
    });

    const { mimeType, name, size } = metadataResponse.data;
    const etag = generateETag(fileId, size, mimeType);

    // Use optimized image caching (stale-while-revalidate for instant display)
    const imageCache = CACHE.IMAGES || CACHE.LONG;

    // Check If-None-Match for conditional requests (304 Not Modified)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', imageCache);
      return res.status(304).end();
    }

    // For thumbnail requests (videos), fetch and proxy the thumbnail
    if (thumbnail === 'true') {
      const thumbResponse = await drive.files.get({
        fileId,
        fields: 'thumbnailLink',
        supportsAllDrives: true,
      });

      if (thumbResponse.data.thumbnailLink) {
        const thumbnailUrl = thumbResponse.data.thumbnailLink.replace(/=s\d+/, '=s800');
        try {
          const thumbFetch = await fetch(thumbnailUrl);

          if (thumbFetch.ok) {
            const thumbBuffer = Buffer.from(await thumbFetch.arrayBuffer());

            // Chrome-optimized headers for thumbnails (stale-while-revalidate for instant display)
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', thumbBuffer.length);
            res.setHeader('Cache-Control', imageCache);
            res.setHeader('ETag', `"thumb-${fileId}"`);
            res.setHeader('Vary', 'Accept-Encoding');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, ETag');
            // CDN-specific caching for Vercel edge
            res.setHeader('CDN-Cache-Control', 'public, max-age=604800');

            // HEAD request - return headers only
            if (req.method === 'HEAD') {
              return res.status(200).end();
            }

            return res.status(200).send(thumbBuffer);
          }
        } catch (thumbError) {
          console.warn('Thumbnail fetch failed:', thumbError.message);
        }
      }

      // If thumbnail fetch fails for a video, return a 404
      if (mimeType.startsWith('video/')) {
        return res.status(404).json({
          error: 'Thumbnail not available',
          message: 'No thumbnail available for this video',
        });
      }
      // For images, fall through to serve the original file
    }

    // Set common headers first (for HEAD requests and conditional requests)
    const commonHeaders = () => {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', size || 0);
      res.setHeader('Cache-Control', imageCache);
      res.setHeader('ETag', etag);
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`);
      // Chrome requires explicit header exposure for CORS
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
      // Cross-Origin headers for Chrome image handling
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Timing-Allow-Origin', '*');
      // CDN-specific caching for Vercel edge (7 days)
      res.setHeader('CDN-Cache-Control', 'public, max-age=604800');
    };

    // HEAD request - return headers without body
    if (req.method === 'HEAD') {
      commonHeaders();
      return res.status(200).end();
    }

    // Download the file for GET requests
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    let buffer = Buffer.from(response.data);

    // Resize image if size parameter provided and it's an image
    if (targetWidth && mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        const resizedBuffer = await sharp(buffer)
          .resize(targetWidth, null, {
            fit: 'inside',
            withoutEnlargement: true, // Don't upscale small images
          })
          .jpeg({ quality: 85, progressive: true }) // Convert to optimized JPEG
          .toBuffer();

        buffer = resizedBuffer;

        // Update headers for resized image
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', imageCache);
        // Update ETag to include size for proper caching
        res.setHeader('ETag', `"${generateETag(fileId, buffer.length, 'image/jpeg')}-${sizeParam}"`);
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(name.replace(/\.[^.]+$/, '.jpg'))}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Timing-Allow-Origin', '*');
        res.setHeader('CDN-Cache-Control', 'public, max-age=604800');

        return res.status(200).send(buffer);
      } catch (resizeError) {
        console.warn('Image resize failed:', resizeError.message);

        // For browser-unsupported formats (HEIC/HEIF), use Google Drive's thumbnail as fallback
        if (UNSUPPORTED_BROWSER_FORMATS.includes(mimeType)) {
          console.log(`Using Drive thumbnail fallback for ${mimeType} file: ${name}`);
          try {
            const thumbResponse = await drive.files.get({
              fileId,
              fields: 'thumbnailLink',
              supportsAllDrives: true,
            });

            if (thumbResponse.data.thumbnailLink) {
              // Request larger thumbnail based on target size
              const thumbSize = targetWidth || 800;
              const thumbnailUrl = thumbResponse.data.thumbnailLink.replace(/=s\d+/, `=s${thumbSize}`);
              const thumbFetch = await fetch(thumbnailUrl);

              if (thumbFetch.ok) {
                const thumbBuffer = Buffer.from(await thumbFetch.arrayBuffer());

                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Content-Length', thumbBuffer.length);
                res.setHeader('Cache-Control', imageCache);
                res.setHeader('ETag', `"heic-thumb-${fileId}-${sizeParam}"`);
                res.setHeader('Vary', 'Accept-Encoding');
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(name.replace(/\.[^.]+$/, '.jpg'))}"`);
                res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                res.setHeader('Timing-Allow-Origin', '*');
                res.setHeader('CDN-Cache-Control', 'public, max-age=604800');

                return res.status(200).send(thumbBuffer);
              }
            }
          } catch (thumbError) {
            console.warn('Drive thumbnail fallback failed:', thumbError.message);
          }
        }
        // Fall through to serve original (for supported formats that just failed resize)
      }
    }

    // For browser-unsupported formats without resize (original size), also use Drive thumbnail
    if (UNSUPPORTED_BROWSER_FORMATS.includes(mimeType)) {
      console.log(`Using Drive thumbnail for unsupported format ${mimeType}: ${name}`);
      try {
        const thumbResponse = await drive.files.get({
          fileId,
          fields: 'thumbnailLink',
          supportsAllDrives: true,
        });

        if (thumbResponse.data.thumbnailLink) {
          // Use max size for original requests
          const thumbnailUrl = thumbResponse.data.thumbnailLink.replace(/=s\d+/, '=s1600');
          const thumbFetch = await fetch(thumbnailUrl);

          if (thumbFetch.ok) {
            const thumbBuffer = Buffer.from(await thumbFetch.arrayBuffer());

            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', thumbBuffer.length);
            res.setHeader('Cache-Control', imageCache);
            res.setHeader('ETag', `"heic-orig-${fileId}"`);
            res.setHeader('Vary', 'Accept-Encoding');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(name.replace(/\.[^.]+$/, '.jpg'))}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Timing-Allow-Origin', '*');
            res.setHeader('CDN-Cache-Control', 'public, max-age=604800');

            return res.status(200).send(thumbBuffer);
          }
        }
      } catch (thumbError) {
        console.warn('Drive thumbnail fallback failed for original:', thumbError.message);
      }
      // Fall through to serve original HEIC (browser won't display but at least it won't error)
    }

    // Set all headers for original image
    commonHeaders();
    // Update Content-Length with actual buffer size (may differ from metadata)
    res.setHeader('Content-Length', buffer.length);

    return res.status(200).send(buffer);

  } catch (error) {
    console.error('Error serving Drive image:', error);

    if (error.code === 404) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file was not found or is not accessible',
      });
    }

    if (error.code === 403) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'The service account does not have permission to access this file',
      });
    }

    return sendError(res, 500, 'Failed to serve image', error.message);
  }
}
