/**
 * Vercel Serverless Function - Get Batch Thumbnails from Google Drive
 *
 * Fetches the first image (not video) from each product folder for grid thumbnails.
 * Returns a map of itemNumber -> proxyUrl for efficient grid rendering.
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
 * Find the products folder ID
 */
async function getProductsFolderId(drive, sharedDriveId) {
  const response = await drive.files.list({
    q: `name='products' and mimeType='application/vnd.google-apps.folder' and '${sharedDriveId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  return sharedDriveId;
}

/**
 * List all product folders
 */
async function listProductFolders(drive, productsFolderId) {
  const response = await drive.files.list({
    q: `'${productsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    orderBy: 'name',
    pageSize: 500,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files || [];
}

/**
 * Get first image from a folder, or video thumbnail if no images exist
 */
async function getFirstImageOrVideoThumbnail(drive, folderId) {
  const imageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];

  const videoTypes = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'video/x-matroska',
    'video/mpeg',
    'video/3gpp',
    'video/x-m4v',
  ];

  const imageMimeTypeQuery = imageTypes.map(t => `mimeType='${t}'`).join(' or ');

  // First, try to get an image
  const imageResponse = await drive.files.list({
    q: `'${folderId}' in parents and (${imageMimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (imageResponse.data.files?.length > 0) {
    return { file: imageResponse.data.files[0], isVideo: false };
  }

  // If no images, try to get a video with its thumbnail
  const videoMimeTypeQuery = videoTypes.map(t => `mimeType='${t}'`).join(' or ');

  const videoResponse = await drive.files.list({
    q: `'${folderId}' in parents and (${videoMimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType, thumbnailLink)',
    orderBy: 'name',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (videoResponse.data.files?.length > 0) {
    return { file: videoResponse.data.files[0], isVideo: true };
  }

  return null;
}

/**
 * Extract item number from folder name (format: "32 - Venus")
 */
function extractItemNumber(folderName) {
  const match = folderName.match(/^(\d+)\s*-/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache for 5 minutes on CDN, 1 minute in browser
  res.setHeader('Cache-Control', 's-maxage=300, max-age=60, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    console.log('Fetching batch thumbnails...');
    const drive = getDriveClient();

    // Get products folder
    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    console.log('Products folder ID:', productsFolderId);

    // List all product folders
    const folders = await listProductFolders(drive, productsFolderId);
    console.log(`Found ${folders.length} product folders`);

    // Fetch first image from each folder in parallel (with concurrency limit)
    const BATCH_SIZE = 10;
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

              // For videos, use Google Drive's thumbnail if available
              // Otherwise, use our proxy with thumbnail parameter
              let proxyUrl;
              if (isVideo && file.thumbnailLink) {
                // Google Drive thumbnail URL - convert to larger size
                proxyUrl = file.thumbnailLink.replace(/=s\d+/, '=s400');
              } else {
                proxyUrl = `/api/serve-drive-image?fileId=${file.id}${isVideo ? '&thumbnail=true' : ''}`;
              }

              return {
                itemNumber,
                fileId: file.id,
                proxyUrl,
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

    return res.status(200).json({
      success: true,
      thumbnails,
      count: Object.keys(thumbnails).length,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching batch thumbnails:', error);

    return res.status(500).json({
      error: 'Failed to fetch thumbnails',
      message: error.message,
    });
  }
}
