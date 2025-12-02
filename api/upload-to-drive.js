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
 * Get the shared folder ID from environment
 */
function getTargetFolderId() {
  const folderId = process.env.GOOGLE_SHARED_DRIVE_ID;
  if (!folderId) {
    throw new Error('GOOGLE_SHARED_DRIVE_ID environment variable not set');
  }
  return folderId;
}

/**
 * Upload file to Google Drive (shared folder)
 */
async function uploadToDrive(drive, folderId, file, itemNumber) {
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
  });

  // Make file publicly accessible
  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

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

    // Formidable v3+ returns arrays - get the first item
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const itemNumber = Array.isArray(fields.itemNumber) ? fields.itemNumber[0] : fields.itemNumber;

    if (!file || !itemNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both file and itemNumber are required'
      });
    }

    // Initialize Google Drive
    const drive = getDriveClient();

    // Get target folder
    const folderId = getTargetFolderId();

    // Upload file
    const url = await uploadToDrive(drive, folderId, file, itemNumber);

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
