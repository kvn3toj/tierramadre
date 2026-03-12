/**
 * Vercel Serverless Function - Get Batch Thumbnails from Google Drive
 *
 * Fetches the first image (not video) from each product folder for grid thumbnails.
 * Returns a map of itemNumber -> proxyUrl for efficient grid rendering.
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  CACHE,
  BATCH_SIZE,
  getProductsFolderId,
  listProductFolders,
  getFirstImageOrVideoThumbnail,
  extractItemNumber,
  getProxyUrl,
} from './_lib/index.js';
import crypto from 'crypto';

export default withApiHandler(async (req, res, { drive, sharedDriveId }) => {
  console.log('Fetching batch thumbnails...');

  const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
  console.log('Products folder ID:', productsFolderId);

  const folders = await listProductFolders(drive, productsFolderId);
  console.log(`Found ${folders.length} product folders`);

  // Deduplicate: keep only one folder per item number.
  // listProductFolders returns alphabetical order from Drive, so we pick
  // the folder with the lowest numeric item number prefix as canonical.
  // If two folders share the same item number, the first alphabetically wins.
  const seenItems = new Set();
  const uniqueFolders = folders.filter(folder => {
    const itemNumber = extractItemNumber(folder.name);
    if (itemNumber === null || seenItems.has(itemNumber)) return false;
    seenItems.add(itemNumber);
    return true;
  });

  if (uniqueFolders.length < folders.length) {
    console.log(`[Thumbnails] Deduplicated: ${folders.length} folders → ${uniqueFolders.length} unique items`);
  }

  // Fetch first image from each folder in parallel (with concurrency limit)
  const thumbnails = {};

  for (let i = 0; i < uniqueFolders.length; i += BATCH_SIZE) {
    const batch = uniqueFolders.slice(i, i + BATCH_SIZE);

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

  // Generate ETag from actual fileIds for proper cache invalidation
  // When images are deleted/added, the fileIds change, invalidating the cache
  const count = Object.keys(thumbnails).length;
  const fileIds = Object.entries(thumbnails)
    .map(([item, data]) => `${item}:${data.url}`)
    .sort()
    .join('|');
  const dataHash = crypto.createHash('md5')
    .update(fileIds)
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
}, { methods: ['GET', 'OPTIONS'], cache: CACHE.MEDIUM, provideDrive: true, requireDriveId: true, errorPrefix: 'GetBatchThumbnails' });
