/**
 * Vercel Serverless Function - Get Newest Products from Google Drive
 *
 * Scans Google Drive product folders and returns products sorted by
 * the creation date of their first image (newest first).
 * This is the SOURCE OF TRUTH for "new products" - based on when photos were uploaded.
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
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 500,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files || [];
}

/**
 * Get first image from a folder with its creation date
 */
async function getFirstImageWithDate(drive, folderId) {
  const imageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];

  const imageMimeTypeQuery = imageTypes.map(t => `mimeType='${t}'`).join(' or ');

  const imageResponse = await drive.files.list({
    q: `'${folderId}' in parents and (${imageMimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (imageResponse.data.files?.length > 0) {
    return imageResponse.data.files[0];
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
 * Extract product name from folder name (format: "32 - Venus")
 */
function extractProductName(folderName) {
  const match = folderName.match(/^\d+\s*-\s*(.+)$/);
  return match ? match[1].trim() : folderName;
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

  // Get limit from query params (default 10)
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  try {
    console.log('Fetching newest products by image upload date...');
    const drive = getDriveClient();

    // Get products folder
    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    console.log('Products folder ID:', productsFolderId);

    // List all product folders
    const folders = await listProductFolders(drive, productsFolderId);
    console.log(`Found ${folders.length} product folders`);

    // Fetch first image from each folder with its creation date
    const BATCH_SIZE = 10;
    const productsWithImages = [];

    // Fetch more folders to account for deduplication (need enough unique products)
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
                proxyUrl: `/api/serve-drive-image?fileId=${image.id}`,
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

    // Take only the requested limit
    const newestProducts = uniqueProducts.slice(0, limit);

    console.log(`Returning ${newestProducts.length} newest products`);

    return res.status(200).json({
      success: true,
      products: newestProducts,
      count: newestProducts.length,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching newest products:', error);

    return res.status(500).json({
      error: 'Failed to fetch newest products',
      message: error.message,
    });
  }
}
