/**
 * Vercel Serverless Function - Sync Treasure Images
 *
 * Updates Google Sheets treasure with Cloudinary image URLs
 * for products that have images uploaded.
 *
 * GET /api/sync-treasure-images - Preview changes
 * POST /api/sync-treasure-images - Apply updates to sheet
 */

import { v2 as cloudinary } from 'cloudinary';
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

// Sheet configuration (same as get-treasure-sheets.js)
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'Inventario'; // Note: Sheet name in Google Sheets (external data source)

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyam6g2os',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Get Google Sheets client
 */
function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return new sheets_v4.Sheets({ auth });
}

/**
 * Get all product images from Cloudinary
 */
async function getCloudinaryImages() {
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

  // Group by product and get best image (largest)
  const productImages = {};
  for (const image of allImages) {
    const match = image.public_id.match(/tierramadre\/product-(\d+)\//);
    if (match) {
      const itemNumber = parseInt(match[1]);
      if (!productImages[itemNumber] || image.bytes > productImages[itemNumber].bytes) {
        productImages[itemNumber] = {
          url: image.secure_url,
          publicId: image.public_id,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
        };
      }
    }
  }

  return productImages;
}

/**
 * Find the treasure sheet name dynamically
 */
async function findTreasureSheet(sheets, spreadsheetId) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const sheetNames = metadata.data.sheets.map(s => s.properties.title);
  // Note: Sheet is named "Inventario" in Google Sheets (external data source)
  const targetSheet = sheetNames.find(name =>
    name.toLowerCase().includes('inventario') ||
    name.toLowerCase().includes('inventory')
  );

  return targetSheet || sheetNames[0];
}

/**
 * Get current treasure from sheet
 */
async function getTreasure(sheets, spreadsheetId) {
  const sheetName = await findTreasureSheet(sheets, spreadsheetId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return { headers: [], items: [], sheetName };

  const headers = rows[0];
  const items = rows.slice(1).map((row, index) => {
    const item = { _rowIndex: index + 2 }; // 1-based, skip header
    headers.forEach((header, colIndex) => {
      item[header] = row[colIndex] || '';
    });
    return item;
  });

  return { headers, items, sheetName };
}

/**
 * Find imageUrl column index
 */
function findImageUrlColumn(headers) {
  const possibleNames = ['imageUrl', 'ImageUrl', 'imagen', 'Imagen', 'image', 'Image', 'foto', 'Foto'];
  for (const name of possibleNames) {
    const index = headers.indexOf(name);
    if (index !== -1) return { index, name };
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const spreadsheetId = SPREADSHEET_ID;

    // Get Cloudinary images
    const cloudinaryImages = await getCloudinaryImages();
    const itemsWithImages = Object.keys(cloudinaryImages).map(Number);

    // Get current treasure
    const sheets = getSheetsClient();
    const { headers, items, sheetName } = await getTreasure(sheets, spreadsheetId);

    // Find imageUrl column
    const imageCol = findImageUrlColumn(headers);
    if (!imageCol) {
      return res.status(400).json({
        error: 'No image column found',
        message: 'Sheet must have a column named: imageUrl, imagen, image, or foto',
        headers,
      });
    }

    // Find items to update
    const updates = [];
    for (const item of items) {
      const itemNumber = parseInt(item['item'] || item['Item'] || item['#'] || '0');
      if (!itemNumber) continue;

      const cloudinaryImage = cloudinaryImages[itemNumber];
      const currentImageUrl = item[imageCol.name] || '';

      if (cloudinaryImage && currentImageUrl !== cloudinaryImage.url) {
        updates.push({
          itemNumber,
          name: item['nombre'] || item['Nombre'] || 'Unknown',
          rowIndex: item._rowIndex,
          currentUrl: currentImageUrl || '(empty)',
          newUrl: cloudinaryImage.url,
          dimensions: `${cloudinaryImage.width}x${cloudinaryImage.height}`,
        });
      }
    }

    // GET - Preview mode
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        mode: 'preview',
        message: 'Use POST to apply updates',
        summary: {
          totalTreasureItems: items.length,
          itemsWithCloudinaryImages: itemsWithImages.length,
          itemsToUpdate: updates.length,
          imageColumn: imageCol.name,
        },
        updates,
      });
    }

    // POST - Apply updates
    if (req.method === 'POST') {
      if (updates.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No updates needed - all images already synced',
        });
      }

      // Prepare batch update
      const columnLetter = String.fromCharCode(65 + imageCol.index); // A=0, B=1, etc.
      const data = updates.map(update => ({
        range: `${sheetName}!${columnLetter}${update.rowIndex}`,
        values: [[update.newUrl]],
      }));

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data,
        },
      });

      return res.status(200).json({
        success: true,
        mode: 'applied',
        message: `Updated ${updates.length} items with Cloudinary URLs`,
        summary: {
          updatedCount: updates.length,
          imageColumn: imageCol.name,
        },
        updates,
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
