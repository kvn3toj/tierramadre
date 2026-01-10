/**
 * Vercel Serverless Function - Rename Product Folders with Names
 *
 * Renames folders from "1" to "1 - Rey Midas" format
 */

import { GoogleAuth } from 'google-auth-library';
import { drive_v3 } from '@googleapis/drive';
import { sheets_v4 } from '@googleapis/sheets';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

function getDriveClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return new drive_v3.Drive({ auth });
}

function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return new sheets_v4.Sheets({ auth });
}

async function findFolder(drive, parentId, folderName) {
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files?.[0] || null;
}

async function getProductsFolderId(drive, sharedDriveId) {
  const productsFolder = await findFolder(drive, sharedDriveId, 'products');
  return productsFolder?.id || null;
}

async function getInventoryWithNames(sheets) {
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
  const itemIndex = headers.findIndex(h => h === 'item' || h === '#');
  const nameIndex = headers.findIndex(h => h === 'nombre' || h === 'name');

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const itemNumber = row[itemIndex];
    let productName = nameIndex >= 0 ? row[nameIndex] : '';

    if (itemNumber && !isNaN(itemNumber)) {
      // Clean up name: remove prefixes like "L:A", newlines, extra spaces
      productName = (productName || '')
        .replace(/^L:.*?\n/g, '')
        .replace(/^L:.*?\s/g, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      items.push({
        itemNumber: String(itemNumber),
        productName: productName || `Producto ${itemNumber}`,
      });
    }
  }

  return items;
}

// Clean folder name for filesystem compatibility
function cleanFolderName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
    .replace(/\s+/g, ' ')         // Normalize spaces
    .trim()
    .substring(0, 100);           // Limit length
}

async function renameFolder(drive, folderId, newName) {
  await drive.files.update({
    fileId: folderId,
    requestBody: { name: newName },
    supportsAllDrives: true,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

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

    const results = {
      renamed: [],
      notFound: [],
      errors: [],
    };

    // Get products folder
    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    if (!productsFolderId) {
      return res.status(400).json({ error: 'Products folder not found' });
    }

    // Get inventory with names
    console.log('Getting inventory with names...');
    const items = await getInventoryWithNames(sheets);
    console.log(`Found ${items.length} items`);

    // Rename each folder
    for (const item of items) {
      try {
        // Find folder by item number (current name)
        const folder = await findFolder(drive, productsFolderId, item.itemNumber);

        if (!folder) {
          // Maybe already renamed - try to find with new format
          const newName = cleanFolderName(`${item.itemNumber} - ${item.productName}`);
          const existingFolder = await findFolder(drive, productsFolderId, newName);
          if (existingFolder) {
            results.renamed.push({
              itemNumber: item.itemNumber,
              newName,
              status: 'already_renamed',
            });
          } else {
            results.notFound.push(item.itemNumber);
          }
          continue;
        }

        // Create new name
        const newName = cleanFolderName(`${item.itemNumber} - ${item.productName}`);

        console.log(`Renaming folder ${item.itemNumber} to "${newName}"`);
        await renameFolder(drive, folder.id, newName);

        results.renamed.push({
          itemNumber: item.itemNumber,
          newName,
          folderId: folder.id,
        });

      } catch (err) {
        console.error(`Error renaming ${item.itemNumber}:`, err.message);
        results.errors.push({
          itemNumber: item.itemNumber,
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Renamed ${results.renamed.length} folders`,
      ...results,
    });

  } catch (error) {
    console.error('Error renaming folders:', error);
    return res.status(500).json({
      error: 'Failed to rename folders',
      message: error.message,
    });
  }
}
