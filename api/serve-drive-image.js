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
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function acceptsWebp(req) {
  const accept = req.headers.accept || '';
  return accept.includes('image/webp');
}

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
  withApiHandler,
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

/**
 * Helper to add timeout to promises (prevents 504 Gateway Timeout)
 */
function withTimeout(promise, timeoutMs, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export default withApiHandler(async (req, res) => {
  if (!isOAuthConfigured()) {
    return sendError(res, 500, 'Google OAuth not configured');
  }

  let { fileId, thumbnail, size: sizeParam = 'original' } = req.query;
    if (Array.isArray(sizeParam)) sizeParam = sizeParam[sizeParam.length - 1];

    if (!fileId) {
      return sendError(res, 400, 'fileId is required');
    }

    // Validate size parameter for responsive images
    const targetWidth = IMAGE_SIZES[sizeParam] ?? IMAGE_SIZES.original;

    const drive = await getOAuthDriveClient();

    // Get file metadata first (with timeout to prevent 504)
    let metadataResponse;
    try {
      metadataResponse = await withTimeout(
        drive.files.get({
          fileId,
          fields: 'id,name,mimeType,size',
          supportsAllDrives: true,
        }),
        8000,
        'Metadata fetch'
      );
    } catch (metaErr) {
      // Detect deleted/trashed files (Google API returns 404)
      if (metaErr?.code === 404 || metaErr?.response?.status === 404 || metaErr?.errors?.[0]?.reason === 'notFound') {
        res.setHeader('Cache-Control', 'no-store');
        return sendError(res, 404, 'File not found — it may have been deleted from Drive');
      }
      throw metaErr; // Re-throw other errors for the global handler
    }

    const { mimeType, name, size } = metadataResponse.data;
    /** Client asked for WebP; raster images only (not SVG). Used for ETag + output format. */
    const prefersWebp =
      acceptsWebp(req) &&
      mimeType.startsWith('image/') &&
      !mimeType.includes('svg');
    const etag = generateETag(
      fileId,
      `${size}-${sizeParam}-${prefersWebp ? 'webp' : 'std'}`,
      mimeType
    );

    // Use optimized image caching (stale-while-revalidate for instant display)
    const imageCache = CACHE.IMAGES || CACHE.LONG;

    // Check If-None-Match for conditional requests (304 Not Modified)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', imageCache);
      return res.status(304).end();
    }

    // HEIC Fast Path: Use Drive thumbnail immediately (skip expensive download + conversion)
    if (UNSUPPORTED_BROWSER_FORMATS.includes(mimeType) && thumbnail !== 'true') {
      console.log(`HEIC Fast Path for ${mimeType}: ${name}`);
      try {
        const thumbResponse = await withTimeout(
          drive.files.get({
            fileId,
            fields: 'thumbnailLink',
            supportsAllDrives: true,
          }),
          5000,
          'HEIC thumbnail fetch'
        );

        if (thumbResponse.data.thumbnailLink) {
          const thumbSize = targetWidth || 1600;
          const thumbnailUrl = thumbResponse.data.thumbnailLink.replace(/=s\d+/, `=s${thumbSize}`);

          const thumbFetch = await withTimeout(
            fetch(thumbnailUrl),
            8000,
            'HEIC thumbnail download'
          );

          if (thumbFetch.ok) {
            let thumbBuffer = Buffer.from(await thumbFetch.arrayBuffer());
            let outMime = 'image/jpeg';
            let fname = name.replace(/\.[^.]+$/, '.jpg');
            if (prefersWebp) {
              try {
                thumbBuffer = await sharp(thumbBuffer)
                  .webp({ quality: 82, effort: 4 })
                  .toBuffer();
                outMime = 'image/webp';
                fname = name.replace(/\.[^.]+$/, '.webp');
              } catch (e) {
                console.warn('HEIC thumb WebP conversion failed, serving JPEG:', e.message);
              }
            }

            res.setHeader('Content-Type', outMime);
            res.setHeader('Content-Length', thumbBuffer.length);
            res.setHeader('Cache-Control', imageCache);
            res.setHeader('ETag', etag);
            res.setHeader('Vary', 'Accept, Accept-Encoding');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(fname)}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Timing-Allow-Origin', '*');

            if (req.method === 'HEAD') {
              return res.status(200).end();
            }

            return res.status(200).send(thumbBuffer);
          }
        }
      } catch (heicError) {
        console.warn('HEIC fast path failed, falling through:', heicError.message);
        // Fall through to regular flow
      }
    }

    // For thumbnail requests (videos), fetch and proxy the thumbnail
    if (thumbnail === 'true') {
      const thumbResponse = await withTimeout(
        drive.files.get({
          fileId,
          fields: 'thumbnailLink',
          supportsAllDrives: true,
        }),
        5000,
        'Video thumbnail metadata'
      );

      if (thumbResponse.data.thumbnailLink) {
        const thumbnailUrl = thumbResponse.data.thumbnailLink.replace(/=s\d+/, '=s800');
        try {
          const thumbFetch = await withTimeout(
            fetch(thumbnailUrl),
            8000,
            'Video thumbnail download'
          );

          if (thumbFetch.ok) {
            let thumbBuffer = Buffer.from(await thumbFetch.arrayBuffer());
            let outMime = 'image/jpeg';
            if (prefersWebp) {
              try {
                thumbBuffer = await sharp(thumbBuffer)
                  .webp({ quality: 82, effort: 4 })
                  .toBuffer();
                outMime = 'image/webp';
              } catch (e) {
                console.warn('Video thumb WebP conversion failed:', e.message);
              }
            }

            // Chrome-optimized headers for thumbnails (stale-while-revalidate for instant display)
            res.setHeader('Content-Type', outMime);
            res.setHeader('Content-Length', thumbBuffer.length);
            res.setHeader('Cache-Control', imageCache);
            res.setHeader('ETag', etag);
            res.setHeader('Vary', 'Accept, Accept-Encoding');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, ETag');
            // CDN-specific caching for Vercel edge

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

      // If thumbnail fetch fails for a video, return a placeholder SVG
      if (mimeType.startsWith('video/')) {
        // Generate a simple video placeholder SVG
        const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
          <rect width="400" height="300" fill="#1a1a2e"/>
          <rect x="150" y="100" width="100" height="100" rx="10" fill="#16213e"/>
          <polygon points="185,125 185,175 220,150" fill="#0f9b6e"/>
          <text x="200" y="240" text-anchor="middle" fill="#4a5568" font-family="system-ui" font-size="14">Video procesando...</text>
        </svg>`;

        const svgBuffer = Buffer.from(placeholderSvg);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Length', svgBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=5'); // Short cache - thumbnail may become available soon
        res.setHeader('ETag', `"video-placeholder-${fileId}"`);

        if (req.method === 'HEAD') {
          return res.status(200).end();
        }

        return res.status(200).send(svgBuffer);
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
    };

    // HEAD request - return headers without body
    if (req.method === 'HEAD') {
      commonHeaders();
      return res.status(200).end();
    }

    // Download the file for GET requests (with timeout to prevent 504)
    // Longer timeout for videos to support international users with slower connections
    const downloadTimeout = mimeType.startsWith('video/') ? 45000 : 20000;
    const response = await withTimeout(
      drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
      ),
      downloadTimeout,
      'File download'
    );

    let buffer = Buffer.from(response.data);

    // Resize image if size parameter provided and it's an image
    if (targetWidth && mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        // Check image dimensions first - skip Sharp if already small enough
        const metadata = await sharp(buffer).metadata();
        const imageWidth = metadata.width;

        // Skip resize if image is already smaller than target (with 20% tolerance)
        if (imageWidth && imageWidth <= targetWidth * 1.2) {
          console.log(`Skipping resize for ${name}: ${imageWidth}px <= ${targetWidth * 1.2}px`);
          let outBuf = buffer;
          let outMime = mimeType;
          let dispName = name;
          if (prefersWebp) {
            try {
              outBuf = await sharp(buffer).webp({ quality: 82, effort: 4 }).toBuffer();
              outMime = 'image/webp';
              dispName = name.replace(/\.[^.]+$/, '.webp');
            } catch (swErr) {
              console.warn('WebP transcode (skip-resize) failed:', swErr.message);
            }
          }
          res.setHeader('Content-Type', outMime);
          res.setHeader('Content-Length', outBuf.length);
          res.setHeader('Cache-Control', imageCache);
          res.setHeader('ETag', etag);
          res.setHeader('Vary', 'Accept, Accept-Encoding');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(dispName)}"`);
          res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Timing-Allow-Origin', '*');

          return res.status(200).send(outBuf);
        }

        // Proceed with resize for larger images
        const resized = sharp(buffer).resize(targetWidth, null, {
          fit: 'inside',
          withoutEnlargement: true, // Don't upscale small images
        });
        buffer = prefersWebp
          ? await resized.webp({ quality: 82, effort: 4 }).toBuffer()
          : await resized.jpeg({ quality: 85, progressive: true }).toBuffer();

        const outMimeResized = prefersWebp ? 'image/webp' : 'image/jpeg';
        const dispResized = prefersWebp
          ? name.replace(/\.[^.]+$/, '.webp')
          : name.replace(/\.[^.]+$/, '.jpg');

        // Update headers for resized image
        res.setHeader('Content-Type', outMimeResized);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', imageCache);
        res.setHeader('ETag', etag);
        res.setHeader('Vary', 'Accept, Accept-Encoding');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(dispResized)}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Timing-Allow-Origin', '*');

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
                let thumbBuf = Buffer.from(await thumbFetch.arrayBuffer());
                let outMimeFb = 'image/jpeg';
                let fnameFb = name.replace(/\.[^.]+$/, '.jpg');
                if (prefersWebp) {
                  try {
                    thumbBuf = await sharp(thumbBuf).webp({ quality: 82, effort: 4 }).toBuffer();
                    outMimeFb = 'image/webp';
                    fnameFb = name.replace(/\.[^.]+$/, '.webp');
                  } catch (e) {
                    console.warn('HEIC fallback WebP failed:', e.message);
                  }
                }

                res.setHeader('Content-Type', outMimeFb);
                res.setHeader('Content-Length', thumbBuf.length);
                res.setHeader('Cache-Control', imageCache);
                res.setHeader('ETag', etag);
                res.setHeader('Vary', 'Accept, Accept-Encoding');
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(fnameFb)}"`);
                res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                res.setHeader('Timing-Allow-Origin', '*');
    
                return res.status(200).send(thumbBuf);
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
            let thumbBuffer = Buffer.from(await thumbFetch.arrayBuffer());
            let outMimeOrig = 'image/jpeg';
            let fnameOrig = name.replace(/\.[^.]+$/, '.jpg');
            if (prefersWebp) {
              try {
                thumbBuffer = await sharp(thumbBuffer).webp({ quality: 82, effort: 4 }).toBuffer();
                outMimeOrig = 'image/webp';
                fnameOrig = name.replace(/\.[^.]+$/, '.webp');
              } catch (e) {
                console.warn('HEIC orig WebP failed:', e.message);
              }
            }

            res.setHeader('Content-Type', outMimeOrig);
            res.setHeader('Content-Length', thumbBuffer.length);
            res.setHeader('Cache-Control', imageCache);
            res.setHeader('ETag', etag);
            res.setHeader('Vary', 'Accept, Accept-Encoding');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Disposition', `inline; filename="${encodeFilename(fnameOrig)}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, ETag, Accept-Ranges');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Timing-Allow-Origin', '*');

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
}, { methods: ['GET', 'HEAD', 'OPTIONS'], requireGoogle: false, errorPrefix: 'ServeDriveImage' });
