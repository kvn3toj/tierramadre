/**
 * Vercel Serverless Function - Create Product Folders in Google Drive
 *
 * Creates the products folder structure based on inventory items
 */

import { google } from 'googleapis';

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
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files?.[0] || null;
}

async function createFolder(drive, parentId, folderName) {
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name',
    supportsAllDrives: true,
  });

  return response.data;
}

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function getInventoryItems(sheets) {
  // First, get sheet metadata to find the correct sheet name
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetNames = metadata.data.sheets.map(s => s.properties.title);
  const targetSheet = sheetNames.find(name =>
    name.toLowerCase().includes('inventario') ||
    name.toLowerCase().includes('inventory')
  ) || sheetNames[0];

  console.log(`Using sheet: ${targetSheet}`);

  // Get items from the inventory sheet (column A = item numbers)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${targetSheet}'!A:A`,
  });

  const rows = response.data.values || [];

  // Skip header row, extract item numbers
  const items = rows.slice(1)
    .map(row => row[0])
    .filter(item => item && !isNaN(item))
    .map(item => String(item));

  return [...new Set(items)]; // Remove duplicates
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

    const results = {
      productsFolderId: null,
      productsFolderCreated: false,
      itemNumbers: [],
      foldersCreated: [],
      foldersExisted: [],
      errors: [],
    };

    // Step 1: Find or create products folder
    console.log('Looking for products folder...');
    let productsFolder = await findFolder(drive, sharedDriveId, 'products');

    if (!productsFolder) {
      console.log('Creating products folder...');
      productsFolder = await createFolder(drive, sharedDriveId, 'products');
      results.productsFolderCreated = true;
    }
    results.productsFolderId = productsFolder.id;

    // Step 2: Get inventory items
    console.log('Getting inventory items...');
    const itemNumbers = await getInventoryItems(sheets);
    results.itemNumbers = itemNumbers;
    console.log(`Found ${itemNumbers.length} unique item numbers`);

    // Step 3: Create folder for each item
    console.log('Creating product folders...');
    for (const itemNumber of itemNumbers) {
      try {
        const existingFolder = await findFolder(drive, productsFolder.id, itemNumber);

        if (existingFolder) {
          results.foldersExisted.push({ itemNumber, folderId: existingFolder.id });
        } else {
          const newFolder = await createFolder(drive, productsFolder.id, itemNumber);
          results.foldersCreated.push({ itemNumber, folderId: newFolder.id });
          console.log(`Created folder for product ${itemNumber}`);
        }
      } catch (err) {
        console.error(`Error creating folder for ${itemNumber}:`, err.message);
        results.errors.push({ itemNumber, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Created ${results.foldersCreated.length} folders, ${results.foldersExisted.length} already existed`,
      ...results,
    });

  } catch (error) {
    console.error('Error creating product folders:', error);
    return res.status(500).json({
      error: 'Failed to create product folders',
      message: error.message,
    });
  }
}
