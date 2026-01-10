/**
 * Vercel Serverless Function - Get Product Images from Google Drive Folder
 *
 * This endpoint lists all images/videos from a product's folder in Google Drive.
 * Folder structure: SharedDrive/products/{itemNumber}/
 */

import { GoogleAuth } from 'google-auth-library';
import { drive_v3 } from '@googleapis/drive';

/**
 * Initialize Google Drive API with service account credentials
 */
function getDriveClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    return new drive_v3.Drive({ auth });
  } catch (error) {
    console.error('Error initializing Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}

/**
 * Find or get the products folder ID
 */
async function getProductsFolderId(drive, sharedDriveId) {
  // Look for a "products" folder in the shared drive
  const response = await drive.files.list({
    q: `name='products' and mimeType='application/vnd.google-apps.folder' and '${sharedDriveId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // If no products folder, use the shared drive root
  return sharedDriveId;
}

/**
 * Find product folder by item number (folder name format: "32 - Venus")
 */
async function getProductFolderId(drive, parentFolderId, itemNumber) {
  // Search for folder starting with the item number
  const response = await drive.files.list({
    q: `name contains '${itemNumber} -' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  // Filter to find exact match for "N - " at the start of the name
  const exactMatch = response.data.files?.find(f =>
    f.name.startsWith(`${itemNumber} - `)
  );

  return exactMatch?.id || null;
}

/**
 * List all media files in a folder
 */
async function listMediaFiles(drive, folderId) {
  const mediaTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'image/heic',
    'image/heif',
    'image/avif',
    'image/x-icon',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'video/x-matroska',
    'video/mpeg',
    'video/3gpp',
    'video/x-m4v',
  ];

  const mimeTypeQuery = mediaTypes.map(t => `mimeType='${t}'`).join(' or ');

  const response = await drive.files.list({
    q: `'${folderId}' in parents and (${mimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType, size, createdTime, thumbnailLink, webContentLink)',
    orderBy: 'name',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files || [];
}

/**
 * Generate viewable URL for a Drive file
 */
function getViewableUrl(fileId, mimeType) {
  // For images, use the thumbnail link with larger size or direct view
  if (mimeType.startsWith('image/')) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  // For videos, use the preview link
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Main handler
 */
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

  // Check required environment variables
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim();
  if (!sharedDriveId) {
    return res.status(500).json({
      error: 'GOOGLE_SHARED_DRIVE_ID not configured',
    });
  }

  try {
    const { itemNumber } = req.query;

    if (!itemNumber) {
      return res.status(400).json({ error: 'itemNumber is required' });
    }

    console.log(`Fetching images for product ${itemNumber}`);

    const drive = getDriveClient();

    // Get the products folder
    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    console.log('Products folder ID:', productsFolderId);

    // Get the specific product folder
    const productFolderId = await getProductFolderId(drive, productsFolderId, itemNumber.toString());

    if (!productFolderId) {
      console.log(`No folder found for product ${itemNumber}`);
      return res.status(200).json({
        success: true,
        itemNumber,
        images: [],
        message: `No folder found for product ${itemNumber}`,
      });
    }

    console.log(`Found product folder: ${productFolderId}`);

    // List all media files in the folder
    const files = await listMediaFiles(drive, productFolderId);
    console.log(`Found ${files.length} media files`);

    // Transform files to usable format
    const images = files.map((file, index) => {
      const isVideo = file.mimeType.startsWith('video/');
      return {
        id: file.id,
        name: file.name,
        url: getViewableUrl(file.id, file.mimeType),
        thumbnailUrl: file.thumbnailLink || getViewableUrl(file.id, file.mimeType),
        type: isVideo ? 'video' : 'image',
        mimeType: file.mimeType,
        size: parseInt(file.size || '0'),
        createdTime: file.createdTime,
        order: index,
        // For serving through our proxy API
        proxyUrl: `/api/serve-drive-image?fileId=${file.id}`,
      };
    });

    return res.status(200).json({
      success: true,
      itemNumber,
      folderId: productFolderId,
      images,
    });

  } catch (error) {
    console.error('Error fetching Drive images:', error);

    return res.status(500).json({
      error: 'Failed to fetch images',
      message: error.message,
    });
  }
}
