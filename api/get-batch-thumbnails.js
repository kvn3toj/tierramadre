/**
 * Vercel Serverless Function - Get Batch Thumbnails from Google Drive
 *
 * Fetches the first image (not video) from each product folder for grid thumbnails.
 * Returns a map of itemNumber -> proxyUrl for efficient grid rendering.
 */

import {
  getDriveClient,
  isGoogleConfigured,
  getSharedDriveId,
  initApi,
  sendError,
  sendSuccess,
  setCacheHeaders,
  CACHE,
  BATCH_SIZE,
  getProductsFolderId,
  listProductFolders,
  getFirstImageOrVideoThumbnail,
  extractItemNumber,
  getProxyUrl,
} from './_lib/index.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'OPTIONS'] })) return;

  // Cache for 5 minutes on CDN, 1 minute in browser
  setCacheHeaders(res, CACHE.MEDIUM);

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  const sharedDriveId = getSharedDriveId();
  if (!sharedDriveId) {
    return sendError(res, 500, 'GOOGLE_SHARED_DRIVE_ID not configured');
  }

  try {
    console.log('Fetching batch thumbnails...');
    const drive = getDriveClient();

    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    console.log('Products folder ID:', productsFolderId);

    const folders = await listProductFolders(drive, productsFolderId);
    console.log(`Found ${folders.length} product folders`);

    // Fetch first image from each folder in parallel (with concurrency limit)
    const thumbnails = {};

    for (let i = 0; i < folders.length; i += BATCH_SIZE) {
      const batch = folders.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (folder) => {
          const itemNumber = extractItemNumber(folder.name);
          if (!itemNumber) return null;

          try {
            const result = await getFirstImageOrVideoThumbnail(drive, folder.id);
            if (result) {
              const { file, isVideo } = result;
              return {
                itemNumber,
                fileId: file.id,
                // Use 'small' size (400px) for grid thumbnails - faster loading, less bandwidth
                proxyUrl: getProxyUrl(file.id, isVideo, 'small'),
                isVideo,
              };
            }
          } catch (error) {
            console.warn(`Error fetching thumbnail for ${folder.name}:`, error.message);
          }
          return null;
        })
      );

      results.forEach((result) => {
        if (result) {
          thumbnails[result.itemNumber] = {
            url: result.proxyUrl,
            isVideoThumbnail: result.isVideo,
          };
        }
      });
    }

    console.log(`Generated ${Object.keys(thumbnails).length} thumbnails`);

    // Generate ETag from thumbnail count for conditional requests
    const count = Object.keys(thumbnails).length;
    const dataHash = crypto.createHash('md5')
      .update(JSON.stringify({ count, keys: Object.keys(thumbnails).sort().join(',') }))
      .digest('hex')
      .slice(0, 16);
    const etag = `"batch-${dataHash}"`;

    // Check If-None-Match for 304 response
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.setHeader('ETag', etag);
      return res.status(304).end();
    }

    res.setHeader('ETag', etag);

    return sendSuccess(res, {
      thumbnails,
      count,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching batch thumbnails:', error);
    return sendError(res, 500, 'Failed to fetch thumbnails', error.message);
  }
}
