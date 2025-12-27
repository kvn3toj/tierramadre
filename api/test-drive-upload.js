/**
 * Test Google Drive upload capabilities
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim();
  if (!sharedDriveId) {
    return res.status(500).json({ error: 'GOOGLE_SHARED_DRIVE_ID not configured' });
  }

  try {
    const drive = getDriveClient();

    // Test 1: Check if ID is a shared drive or a folder
    let driveInfo = null;
    let folderInfo = null;

    // Try as shared drive
    try {
      const driveResponse = await drive.drives.get({
        driveId: sharedDriveId,
        fields: 'id, name, capabilities',
      });
      driveInfo = driveResponse.data;
    } catch (err) {
      driveInfo = { error: err.message };
    }

    // Try as folder
    try {
      const folderResponse = await drive.files.get({
        fileId: sharedDriveId,
        fields: 'id, name, mimeType, parents, driveId',
        supportsAllDrives: true,
      });
      folderInfo = folderResponse.data;
    } catch (err) {
      folderInfo = { error: err.message };
    }

    // List all shared drives the service account has access to
    let availableDrives = [];
    try {
      const drivesResponse = await drive.drives.list({
        fields: 'drives(id, name)',
      });
      availableDrives = drivesResponse.data.drives || [];
    } catch (err) {
      availableDrives = [{ error: err.message }];
    }

    // Test 2: Try to create a text file in the shared drive root
    const { Readable } = await import('stream');
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const stream = Readable.from(Buffer.from(testContent));

    let uploadResult = null;
    let uploadError = null;

    try {
      const response = await drive.files.create({
        requestBody: {
          name: 'test-upload.txt',
          parents: [sharedDriveId],
        },
        media: {
          mimeType: 'text/plain',
          body: stream,
        },
        fields: 'id, name, parents',
        supportsAllDrives: true,
      });
      uploadResult = response.data;

      // Clean up - delete the test file
      await drive.files.delete({
        fileId: response.data.id,
        supportsAllDrives: true,
      });
      uploadResult.deleted = true;
    } catch (err) {
      uploadError = err.message;
    }

    // Test 3: Get products folder
    const productsFolderResponse = await drive.files.list({
      q: `name='products' and mimeType='application/vnd.google-apps.folder' and '${sharedDriveId}' in parents and trashed=false`,
      fields: 'files(id, name, parents)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const productsFolder = productsFolderResponse.data.files?.[0];

    // Test 4: Get a product folder (e.g., "8 - Aluna")
    let productFolder = null;
    if (productsFolder) {
      const productFolderResponse = await drive.files.list({
        q: `name contains '8 -' and mimeType='application/vnd.google-apps.folder' and '${productsFolder.id}' in parents and trashed=false`,
        fields: 'files(id, name, parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      productFolder = productFolderResponse.data.files?.[0];
    }

    // Test 5: Try upload directly to products folder
    let productsUploadResult = null;
    let productsUploadError = null;

    if (productsFolder) {
      try {
        const stream2 = Readable.from(Buffer.from(testContent));
        const response = await drive.files.create({
          requestBody: {
            name: 'test-in-products.txt',
            parents: [productsFolder.id],
          },
          media: {
            mimeType: 'text/plain',
            body: stream2,
          },
          fields: 'id, name, parents',
          supportsAllDrives: true,
        });
        productsUploadResult = response.data;

        // Clean up
        await drive.files.delete({
          fileId: response.data.id,
          supportsAllDrives: true,
        });
        productsUploadResult.deleted = true;
      } catch (err) {
        productsUploadError = err.message;
      }
    }

    return res.status(200).json({
      success: true,
      sharedDriveId,
      driveInfo,
      folderInfo,
      availableDrives,
      uploadToRoot: uploadResult || { error: uploadError },
      productsFolder,
      productFolder,
      uploadToProducts: productsUploadResult || { error: productsUploadError },
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack,
    });
  }
}
