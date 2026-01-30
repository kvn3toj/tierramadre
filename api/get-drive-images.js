/**
 * Vercel Serverless Function - Get Product Images from Google Drive Folder
 *
 * This endpoint lists all images/videos from a product's folder in Google Drive.
 * Folder structure: SharedDrive/products/{itemNumber}/
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
  getProductsFolderId,
  getProductFolderById,
  listMediaFiles,
  getViewableUrl,
  getProxyUrl,
} from './_lib/index.js';

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'OPTIONS'] })) return;

  // Cache for 5 minutes - product images don't change frequently
  setCacheHeaders(res, CACHE.MEDIUM);

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google OAuth not configured');
  }

  const sharedDriveId = getSharedDriveId();
  if (!sharedDriveId) {
    return sendError(res, 500, 'GOOGLE_SHARED_DRIVE_ID not configured');
  }

  try {
    const { itemNumber } = req.query;

    if (!itemNumber) {
      return sendError(res, 400, 'itemNumber is required');
    }

    console.log(`Fetching images for product ${itemNumber}`);

    const drive = getDriveClient();

    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    console.log('Products folder ID:', productsFolderId);

    const productFolderId = await getProductFolderById(drive, productsFolderId, itemNumber.toString());

    if (!productFolderId) {
      console.log(`No folder found for product ${itemNumber}`);
      return sendSuccess(res, {
        itemNumber,
        images: [],
        message: `No folder found for product ${itemNumber}`,
      });
    }

    console.log(`Found product folder: ${productFolderId}`);

    const files = await listMediaFiles(drive, productFolderId);
    console.log(`Found ${files.length} media files`);

    const images = files.map((file, index) => {
      const isVideo = file.mimeType.startsWith('video/');

      return {
        id: file.id,
        name: file.name,
        url: getViewableUrl(file.id, file.mimeType),
        // Responsive image URLs for different contexts
        thumbnailUrl: getProxyUrl(file.id, isVideo, 'small'),    // 400px - for gallery grid
        previewUrl: getProxyUrl(file.id, isVideo, 'medium'),     // 800px - for detail preview
        fullUrl: getProxyUrl(file.id, isVideo, 'original'),      // Original - for full view
        type: isVideo ? 'video' : 'image',
        mimeType: file.mimeType,
        size: parseInt(file.size || '0'),
        createdTime: file.createdTime,
        order: index,
        proxyUrl: getProxyUrl(file.id, false, 'original'),       // Default to original
      };
    });

    return sendSuccess(res, {
      itemNumber,
      folderId: productFolderId,
      images,
    });

  } catch (error) {
    console.error('Error fetching Drive images:', error);
    return sendError(res, 500, 'Failed to fetch images', error.message);
  }
}
