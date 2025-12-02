/**
 * Vercel Serverless Function - Upload to Google Drive
 *
 * This endpoint uploads images/videos to a centralized Google Drive account
 * and returns a publicly accessible URL for embedding in the app.
 */

import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

// Disable Next.js body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Initialize Google Drive API with service account credentials
 */
function getDriveClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Error initializing Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}

/**
 * Get or create Tierra Madre Inventory folder in Shared Drive
 */
async function getOrCreateFolder(drive) {
  const folderName = 'Tierra Madre Inventory';
  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;

  // Search in Shared Drive if configured
  const query = sharedDriveId
    ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${sharedDriveId}' in parents`
    : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (response.data.files.length > 0) {
    return { folderId: response.data.files[0].id, sharedDriveId };
  }

  // Create folder
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(sharedDriveId && { parents: [sharedDriveId] }),
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
    supportsAllDrives: true,
  });

  // Only set permissions if not in Shared Drive
  if (!sharedDriveId) {
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  return { folderId: folder.data.id, sharedDriveId };
}

/**
 * Upload file to Google Drive (supports Shared Drive)
 */
async function uploadToDrive(drive, folderId, sharedDriveId, file, itemNumber) {
  // Handle missing filename (common on mobile)
  const originalName = file.originalFilename || file.newFilename || 'upload';
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };
  const fileExtension = originalName.includes('.')
    ? originalName.split('.').pop()
    : (mimeToExt[file.mimetype] || 'bin');
  const fileName = `product-${itemNumber}-${Date.now()}.${fileExtension}`;

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(file.filepath),
  };

  const uploadedFile = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  // Make file publicly accessible (only if not in Shared Drive)
  if (!sharedDriveId) {
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  // Return direct download link (works for embedding)
  return `https://drive.google.com/uc?export=view&id=${uploadedFile.data.id}`;
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if service account key is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable'
    });
  }

  try {
    // Parse multipart form data
    const form = formidable({ multiples: false });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.file;
    const itemNumber = fields.itemNumber;

    if (!file || !itemNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both file and itemNumber are required'
      });
    }

    // Initialize Google Drive
    const drive = getDriveClient();

    // Get or create folder
    const { folderId, sharedDriveId } = await getOrCreateFolder(drive);

    // Upload file
    const url = await uploadToDrive(drive, folderId, sharedDriveId, file, itemNumber);

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    // Return success response
    return res.status(200).json({
      success: true,
      url,
      message: 'File uploaded successfully to Google Drive'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}
