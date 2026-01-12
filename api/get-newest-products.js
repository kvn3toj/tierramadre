/**
 * Vercel Serverless Function - Get Newest Products from Google Drive
 *
 * Scans Google Drive product folders and returns products sorted by
 * the creation date of their first image (newest first).
 * This is the SOURCE OF TRUTH for "new products" - based on when photos were uploaded.
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
  getFirstImageWithDate,
  extractItemNumber,
  extractProductName,
  getProxyUrl,
} from './_lib/index.js';

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

  // Get limit from query params (default 10, max 50)
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  try {
    console.log('Fetching newest products by image upload date...');
    const drive = getDriveClient();

    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    console.log('Products folder ID:', productsFolderId);

    const folders = await listProductFolders(drive, productsFolderId, 'createdTime desc');
    console.log(`Found ${folders.length} product folders`);

    // Fetch first image from each folder with its creation date
    const productsWithImages = [];

    // Fetch more folders to account for deduplication
    for (let i = 0; i < folders.length && productsWithImages.length < limit * 5; i += BATCH_SIZE) {
      const batch = folders.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (folder) => {
          const itemNumber = extractItemNumber(folder.name);
          if (!itemNumber) return null;

          try {
            const image = await getFirstImageWithDate(drive, folder.id);
            if (image) {
              return {
                itemNumber,
                folderName: folder.name,
                productName: extractProductName(folder.name),
                imageId: image.id,
                imageName: image.name,
                imageCreatedTime: image.createdTime,
                proxyUrl: getProxyUrl(image.id),
              };
            }
          } catch (error) {
            console.warn(`Error fetching image for ${folder.name}:`, error.message);
          }
          return null;
        })
      );

      results.forEach((result) => {
        if (result) {
          productsWithImages.push(result);
        }
      });
    }

    // Sort by image creation date (newest first)
    productsWithImages.sort((a, b) =>
      new Date(b.imageCreatedTime).getTime() - new Date(a.imageCreatedTime).getTime()
    );

    // Deduplicate by product name - keep only the newest per name
    const seenNames = new Set();
    const uniqueProducts = productsWithImages.filter((product) => {
      const normalizedName = product.productName.toLowerCase().trim();
      if (seenNames.has(normalizedName)) {
        return false;
      }
      seenNames.add(normalizedName);
      return true;
    });

    const newestProducts = uniqueProducts.slice(0, limit);

    console.log(`Returning ${newestProducts.length} newest products`);

    return sendSuccess(res, {
      products: newestProducts,
      count: newestProducts.length,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching newest products:', error);
    return sendError(res, 500, 'Failed to fetch newest products', error.message);
  }
}
