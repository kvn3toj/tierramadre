/**
 * Vercel Serverless Function - Migrate Cloudinary Images to Google Drive (OAuth Version)
 *
 * Uses OAuth2 (personal account) instead of Service Account for upload
 * This allows uploading to regular Drive folders, not just Shared Drives
 */

import { google } from 'googleapis';
import fetch from 'node-fetch';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  return oauth2Client;
}

function getDriveClient(auth) {
  return google.drive({ version: 'v3', auth });
}

function getSheetsClient() {
  // Use Service Account for reading sheets (it works fine for reads)
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function findFolder(drive, parentId, itemNumber) {
  const response = await drive.files.list({
    q: `name contains '${itemNumber} -' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const exactMatch = response.data.files?.find(f =>
    f.name.startsWith(`${itemNumber} - `)
  );

  return exactMatch || null;
}

async function getProductsFolderId(drive, rootFolderId) {
  const response = await drive.files.list({
    q: `name='products' and mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return response.data.files?.[0]?.id || null;
}

async function getInventoryWithImages(sheets) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetNames = metadata.data.sheets.map(s => s.properties.title);
  const targetSheet = sheetNames.find(name =>
    name.toLowerCase().includes('inventario') ||
    name.toLowerCase().includes('inventory')
  ) || sheetNames[0];

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

async function uploadToDrive(drive, folderId, buffer, fileName, mimeType) {
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

  // Check OAuth credentials
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID ||
      !process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
      !process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    return res.status(500).json({
      error: 'OAuth credentials not configured',
      message: 'Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN',
    });
  }

  const rootFolderId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim();
  if (!rootFolderId) {
    return res.status(500).json({ error: 'GOOGLE_SHARED_DRIVE_ID not configured' });
  }

  try {
    const oauth = getOAuthClient();
    const drive = getDriveClient(oauth);
    const sheets = getSheetsClient();
    const dryRun = req.query.dryRun === 'true';
    const forceReplace = req.query.forceReplace === 'true';
    const limit = parseInt(req.query.limit) || 0;

    const results = {
      dryRun,
      forceReplace,
      productsFolderId: null,
      itemsWithImages: [],
      migrated: [],
      skipped: [],
      errors: [],
    };

    // Get products folder
    console.log('Finding products folder...');
    const productsFolderId = await getProductsFolderId(drive, rootFolderId);
    if (!productsFolderId) {
      return res.status(400).json({ error: 'Products folder not found.' });
    }
    results.productsFolderId = productsFolderId;

    // Get items with Cloudinary images
    console.log('Getting inventory items with Cloudinary images...');
    let itemsWithImages = await getInventoryWithImages(sheets);
    results.itemsWithImages = itemsWithImages.map(i => ({ itemNumber: i.itemNumber, imageUrl: i.imageUrl }));

    console.log(`Found ${itemsWithImages.length} items with Cloudinary images`);

    if (limit > 0) {
      itemsWithImages = itemsWithImages.slice(0, limit);
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
        const fileStatus = await checkFileExists(drive, productFolder.id, fileName);

        if (fileStatus.exists) {
          if (fileStatus.isEmpty && forceReplace) {
            console.log(`Deleting empty file for item ${item.itemNumber}...`);
            await deleteFile(drive, fileStatus.fileId);
          } else if (!fileStatus.isEmpty) {
            results.skipped.push({
              itemNumber: item.itemNumber,
              reason: 'File already exists with content',
            });
            continue;
          } else {
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
          size: uploaded.size,
        });

        console.log(`Migrated item ${item.itemNumber} (${uploaded.size} bytes)`);

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
