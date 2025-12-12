/**
 * Vercel Serverless Function - Sync Cloudinary Images to Google Drive
 *
 * Downloads all product images from Cloudinary and uploads them to Google Drive
 * with proper labeling: product-{itemNumber}-{index}.jpg
 *
 * GET /api/sync-cloudinary-to-drive - Get sync status/preview
 * POST /api/sync-cloudinary-to-drive - Execute sync
 */

import { v2 as cloudinary } from 'cloudinary';
import { google } from 'googleapis';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyam6g2os',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Initialize Google Drive API with service account credentials
 */
function getDriveClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Get the shared folder ID from environment
 */
function getTargetFolderId() {
  const folderId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim();
  if (!folderId) {
    throw new Error('GOOGLE_SHARED_DRIVE_ID environment variable not set');
  }
  return folderId;
}

/**
 * Get all product images from Cloudinary
 */
async function getAllCloudinaryImages() {
  const allImages = [];
  let nextCursor = null;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'tierramadre/product-',
      max_results: 500,
      next_cursor: nextCursor,
    });

    allImages.push(...result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);

  // Group by product
  const productImages = {};
  for (const image of allImages) {
    // Extract item number from public_id: tierramadre/product-{number}/filename
    const match = image.public_id.match(/tierramadre\/product-(\d+)\//);
    if (match) {
      const itemNumber = match[1];
      if (!productImages[itemNumber]) {
        productImages[itemNumber] = [];
      }
      productImages[itemNumber].push({
        url: image.secure_url,
        publicId: image.public_id,
        format: image.format,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
        createdAt: image.created_at,
      });
    }
  }

  return productImages;
}

/**
 * Check if file already exists in Drive folder
 */
async function fileExistsInDrive(drive, folderId, fileName) {
  try {
    const response = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    return response.data.files.length > 0;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

/**
 * Download image from URL and return as buffer
 */
async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload buffer to Google Drive
 */
async function uploadToDrive(drive, folderId, buffer, fileName, mimeType) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: readable,
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });

  // Make file publicly viewable
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return {
    id: response.data.id,
    name: response.data.name,
    webViewLink: response.data.webViewLink,
  };
}

/**
 * Get MIME type from format
 */
function getMimeType(format) {
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return mimeTypes[format.toLowerCase()] || 'image/jpeg';
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get all Cloudinary images
    const productImages = await getAllCloudinaryImages();
    const productCount = Object.keys(productImages).length;
    const totalImages = Object.values(productImages).flat().length;

    // GET - Preview what will be synced
    if (req.method === 'GET') {
      const preview = [];
      for (const [itemNumber, images] of Object.entries(productImages)) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const fileName = `product-${itemNumber}-${String(i + 1).padStart(2, '0')}.${image.format}`;
          preview.push({
            itemNumber: parseInt(itemNumber),
            sourceUrl: image.url,
            targetFileName: fileName,
            size: `${Math.round(image.bytes / 1024)}KB`,
            dimensions: `${image.width}x${image.height}`,
          });
        }
      }

      // Sort by item number
      preview.sort((a, b) => a.itemNumber - b.itemNumber);

      return res.status(200).json({
        success: true,
        mode: 'preview',
        message: 'Use POST to execute sync',
        summary: {
          totalProducts: productCount,
          totalImages: totalImages,
        },
        images: preview,
      });
    }

    // POST - Execute sync
    if (req.method === 'POST') {
      const drive = getDriveClient();
      const folderId = getTargetFolderId();

      const results = {
        success: [],
        skipped: [],
        failed: [],
      };

      for (const [itemNumber, images] of Object.entries(productImages)) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const fileName = `product-${itemNumber}-${String(i + 1).padStart(2, '0')}.${image.format}`;

          try {
            // Check if already exists
            const exists = await fileExistsInDrive(drive, folderId, fileName);
            if (exists) {
              results.skipped.push({
                fileName,
                reason: 'Already exists in Drive',
              });
              continue;
            }

            // Download from Cloudinary
            const buffer = await downloadImage(image.url);

            // Upload to Drive
            const uploaded = await uploadToDrive(
              drive,
              folderId,
              buffer,
              fileName,
              getMimeType(image.format)
            );

            results.success.push({
              fileName,
              driveId: uploaded.id,
              webViewLink: uploaded.webViewLink,
            });

          } catch (error) {
            results.failed.push({
              fileName,
              sourceUrl: image.url,
              error: error.message,
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        mode: 'sync',
        summary: {
          totalProducts: productCount,
          totalImages: totalImages,
          uploaded: results.success.length,
          skipped: results.skipped.length,
          failed: results.failed.length,
        },
        results,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      error: 'Sync failed',
      message: error.message,
    });
  }
}
