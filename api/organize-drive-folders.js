/**
 * Vercel Serverless Function - Organize Google Drive Folders
 *
 * This endpoint:
 * 1. Creates a "products" folder if it doesn't exist
 * 2. Creates subfolders for each product based on item numbers
 * 3. Moves existing product images to the correct folders
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
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return new drive_v3.Drive({ auth });
  } catch (error) {
    console.error('Error initializing Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}

/**
 * List all files and folders in a directory
 */
async function listFolder(drive, folderId) {
  const files = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, parents)',
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (response.data.files) {
      files.push(...response.data.files);
    }
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return files;
}

/**
 * Find a folder by name within a parent
 */
async function findFolder(drive, parentId, folderName) {
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files?.[0] || null;
}

/**
 * Create a folder
 */
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

/**
 * Move a file to a new folder
 */
async function moveFile(drive, fileId, oldParentId, newParentId) {
  await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: oldParentId,
    supportsAllDrives: true,
  });
}

/**
 * Extract product number from filename
 * Matches patterns like: product-123-xxx, 123.jpg, item-123, etc.
 */
function extractProductNumber(filename) {
  // Pattern: product-{number}
  let match = filename.match(/product[_-]?(\d+)/i);
  if (match) return match[1];

  // Pattern: item-{number}
  match = filename.match(/item[_-]?(\d+)/i);
  if (match) return match[1];

  // Pattern: starts with number
  match = filename.match(/^(\d+)[._-]/);
  if (match) return match[1];

  return null;
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    const drive = getDriveClient();
    const action = req.query.action || req.body?.action || 'status';
    const results = {
      action,
      sharedDriveId,
      productsFolder: null,
      existingFiles: [],
      productFolders: [],
      movedFiles: [],
      errors: [],
    };

    console.log(`Action: ${action}`);

    // Step 1: List current contents of shared drive
    console.log('Listing shared drive contents...');
    const rootFiles = await listFolder(drive, sharedDriveId);
    results.existingFiles = rootFiles.map(f => ({
      id: f.id,
      name: f.name,
      type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      mimeType: f.mimeType,
    }));

    // Step 2: Find or create products folder
    let productsFolder = await findFolder(drive, sharedDriveId, 'products');

    if (!productsFolder && action === 'organize') {
      console.log('Creating products folder...');
      productsFolder = await createFolder(drive, sharedDriveId, 'products');
      results.productsFolder = { id: productsFolder.id, name: 'products', created: true };
    } else if (productsFolder) {
      results.productsFolder = { id: productsFolder.id, name: 'products', created: false };
    }

    // Step 3: List existing product folders
    if (productsFolder) {
      const existingProductFolders = await listFolder(drive, productsFolder.id);
      results.productFolders = existingProductFolders
        .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
        .map(f => ({ id: f.id, name: f.name }));
    }

    // Step 4: If action is organize, move files and create folders
    if (action === 'organize' && productsFolder) {
      // Find image files in root that match product pattern
      const imageFiles = rootFiles.filter(f =>
        f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/')
      );

      console.log(`Found ${imageFiles.length} media files in root`);

      for (const file of imageFiles) {
        const productNumber = extractProductNumber(file.name);

        if (productNumber) {
          try {
            // Find or create product folder
            let productFolder = await findFolder(drive, productsFolder.id, productNumber);

            if (!productFolder) {
              console.log(`Creating folder for product ${productNumber}...`);
              productFolder = await createFolder(drive, productsFolder.id, productNumber);
              results.productFolders.push({ id: productFolder.id, name: productNumber, created: true });
            }

            // Move file to product folder
            console.log(`Moving ${file.name} to folder ${productNumber}...`);
            await moveFile(drive, file.id, sharedDriveId, productFolder.id);
            results.movedFiles.push({
              fileName: file.name,
              productNumber,
              folderId: productFolder.id,
            });
          } catch (err) {
            console.error(`Error processing ${file.name}:`, err.message);
            results.errors.push({
              file: file.name,
              error: err.message,
            });
          }
        }
      }
    }

    // Step 5: Get final structure
    if (productsFolder) {
      const finalFolders = await listFolder(drive, productsFolder.id);
      results.finalStructure = {
        productsFolderId: productsFolder.id,
        subfolders: finalFolders
          .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
          .map(f => ({ id: f.id, name: f.name })),
      };
    }

    return res.status(200).json({
      success: true,
      ...results,
    });

  } catch (error) {
    console.error('Error organizing Drive:', error);

    return res.status(500).json({
      error: 'Failed to organize Drive',
      message: error.message,
    });
  }
}
