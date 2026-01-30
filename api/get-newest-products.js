/**
 * Vercel Serverless Function - Get Newest Products from Google Drive
 *
 * Scans Google Drive product folders and returns products sorted by
 * the creation date of their first image (newest first).
 * This is the SOURCE OF TRUTH for "new products" - based on when photos were uploaded.
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  CACHE,
  BATCH_SIZE,
  getProductsFolderId,
  listProductFolders,
  getFirstImageWithDate,
  extractItemNumber,
  extractProductName,
  getProxyUrl,
} from './_lib/index.js';

export default withApiHandler(async (req, res, { drive, sharedDriveId }) => {
  // Get limit from query params (default 10, max 50)
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  console.log('Fetching newest products by image upload date...');

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
}, { methods: ['GET', 'OPTIONS'], cache: CACHE.MEDIUM, provideSheets: true, provideDrive: true, requireDriveId: true, errorPrefix: 'GetNewestProducts' });
