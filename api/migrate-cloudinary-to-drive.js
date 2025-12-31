/**
 * Vercel Serverless Function - Migrate Cloudinary Images to Google Drive
 *
 * Downloads images from Cloudinary URLs and uploads them to Google Drive product folders
 */

import { google } from 'googleapis';
import fetch from 'node-fetch';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

function getDriveClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function findFolder(drive, parentId, folderName) {
  // Search for folder starting with the item number (e.g., "32 - Venus")
  const response = await drive.files.list({
    q: `name contains '${folderName} -' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files?.[0] || null;
}

async function getProductsFolderId(drive, sharedDriveId) {
  const response = await drive.files.list({
    q: `name='products' and mimeType='application/vnd.google-apps.folder' and '${sharedDriveId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return response.data.files?.[0]?.id || null;
}

async function getInventoryWithImages(sheets) {
  // Get sheet metadata to find the correct sheet name
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetNames = metadata.data.sheets.map(s => s.properties.title);
  const targetSheet = sheetNames.find(name =>
    name.toLowerCase().includes('inventario') ||
    name.toLowerCase().includes('inventory')
  ) || sheetNames[0];

  // Get full inventory data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${targetSheet}'!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h?.toLowerCase().trim() || '');
  const itemIndex = headers.findIndex(h => h === 'item' || h === '#' || h === 'numero');
  const imageIndex = headers.findIndex(h => h.includes('imagen') || h.includes('image') || h.includes('url') || h.includes('foto'));

  if (itemIndex === -1) {
    console.log('Headers:', headers);
    throw new Error('Could not find item column');
  }

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const itemNumber = row[itemIndex];
    const imageUrl = imageIndex >= 0 ? row[imageIndex] : null;

    if (itemNumber && !isNaN(itemNumber) && imageUrl && imageUrl.includes('cloudinary')) {
      items.push({
        itemNumber: String(itemNumber),
        imageUrl: imageUrl.trim(),
        rowIndex: i,
      });
    }
  }

  return items;
}

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const buffer = await response.buffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}

function getExtensionFromMimeType(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };
  return map[mimeType] || 'jpg';
}

async function uploadToDrive(drive, folderId, buffer, fileName, mimeType) {
  // Use resumable upload for Shared Drive support
  // The parent folder being in a Shared Drive is enough - no need for driveId parameter
  const { Readable } = await import('stream');
  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, webViewLink, size',
    supportsAllDrives: true,
  });

  return response.data;
}

async function checkFileExists(drive, folderId, fileName) {
  const response = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, size)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const file = response.data.files?.[0];
  if (!file) return { exists: false, fileId: null, isEmpty: false };

  // Check if file is empty (size 0 or undefined)
  const isEmpty = !file.size || parseInt(file.size) === 0;
  return { exists: true, fileId: file.id, isEmpty };
}

async function deleteFile(drive, fileId) {
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({ error: 'Google Service Account not configured' });
  }

  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim();
  if (!sharedDriveId) {
    return res.status(500).json({ error: 'GOOGLE_SHARED_DRIVE_ID not configured' });
  }

  try {
    const drive = getDriveClient();
    const sheets = getSheetsClient();
    const dryRun = req.query.dryRun === 'true';
    const limit = parseInt(req.query.limit) || 0; // 0 = no limit

    const results = {
      dryRun,
      productsFolderId: null,
      itemsWithImages: [],
      migrated: [],
      skipped: [],
      errors: [],
    };

    // Get products folder
    console.log('Finding products folder...');
    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    if (!productsFolderId) {
      return res.status(400).json({ error: 'Products folder not found. Run create-product-folders first.' });
    }
    results.productsFolderId = productsFolderId;

    // Get items with Cloudinary images
    console.log('Getting inventory items with Cloudinary images...');
    let itemsWithImages = await getInventoryWithImages(sheets);
    results.itemsWithImages = itemsWithImages.map(i => ({ itemNumber: i.itemNumber, imageUrl: i.imageUrl }));

    console.log(`Found ${itemsWithImages.length} items with Cloudinary images`);

    if (limit > 0) {
      itemsWithImages = itemsWithImages.slice(0, limit);
      console.log(`Limited to ${limit} items`);
    }

    if (dryRun) {
      return res.status(200).json({
        success: true,
        message: `Dry run: Found ${results.itemsWithImages.length} items to migrate`,
        ...results,
      });
    }

    // Migrate each image
    for (const item of itemsWithImages) {
      try {
        console.log(`Processing item ${item.itemNumber}...`);

        // Find product folder
        const productFolder = await findFolder(drive, productsFolderId, item.itemNumber);
        if (!productFolder) {
          results.errors.push({
            itemNumber: item.itemNumber,
            error: 'Product folder not found',
          });
          continue;
        }

        // Generate filename
        const isVideo = item.imageUrl.includes('/video/') || item.imageUrl.match(/\.(mp4|mov|webm)$/i);
        const extension = isVideo ? 'mp4' : 'jpg';
        const fileName = `hero.${extension}`;

        // Check if already migrated
        const forceReplace = req.query.forceReplace === 'true';
        const fileStatus = await checkFileExists(drive, productFolder.id, fileName);

        if (fileStatus.exists) {
          // If file exists but is empty, delete it and re-upload
          if (fileStatus.isEmpty && forceReplace) {
            console.log(`Deleting empty file for item ${item.itemNumber}...`);
            await deleteFile(drive, fileStatus.fileId);
          } else if (!fileStatus.isEmpty) {
            // File exists and has content, skip
            results.skipped.push({
              itemNumber: item.itemNumber,
              reason: 'File already exists with content',
            });
            continue;
          } else {
            // File is empty but forceReplace not set
            results.skipped.push({
              itemNumber: item.itemNumber,
              reason: 'File exists but is empty (use forceReplace=true to fix)',
            });
            continue;
          }
        }

        // Download from Cloudinary
        console.log(`Downloading from Cloudinary: ${item.imageUrl}`);
        const { buffer, contentType } = await downloadImage(item.imageUrl);

        // Upload to Drive
        console.log(`Uploading to Drive folder ${item.itemNumber}...`);
        const uploaded = await uploadToDrive(
          drive,
          productFolder.id,
          buffer,
          fileName,
          contentType
        );

        results.migrated.push({
          itemNumber: item.itemNumber,
          driveFileId: uploaded.id,
          fileName: uploaded.name,
        });

        console.log(`Migrated item ${item.itemNumber}`);

      } catch (err) {
        console.error(`Error migrating item ${item.itemNumber}:`, err.message);
        results.errors.push({
          itemNumber: item.itemNumber,
          error: err.message,
          url: item.imageUrl,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Migrated ${results.migrated.length} items, skipped ${results.skipped.length}, errors ${results.errors.length}`,
      ...results,
    });

  } catch (error) {
    console.error('Error in migration:', error);
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message,
    });
  }
}
