/**
 * Vercel Serverless Function - Fetch from Google Drive to Cloudinary
 *
 * This endpoint fetches an image/video from a Google Drive URL
 * and uploads it to Cloudinary, returning the Cloudinary URL.
 */

import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';

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
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Error initializing Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractDriveFileId(url) {
  if (!url) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,           // /file/d/FILE_ID/
    /\/d\/([a-zA-Z0-9_-]+)/,                  // /d/FILE_ID/
    /id=([a-zA-Z0-9_-]+)/,                    // ?id=FILE_ID
    /\/([a-zA-Z0-9_-]{25,})/,                 // Direct ID (25+ chars)
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

/**
 * Get file metadata from Google Drive
 */
async function getFileMetadata(drive, fileId) {
  const response = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,size',
  });
  return response.data;
}

/**
 * Download file from Google Drive as buffer
 */
async function downloadFromDrive(drive, fileId) {
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(response.data);
}

/**
 * Upload buffer to Cloudinary
 */
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const resourceType = options.mimeType?.startsWith('video/') ? 'video' : 'image';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: resourceType,
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check required environment variables
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({
      error: 'Cloudinary not configured',
    });
  }

  try {
    const { driveUrl, itemNumber } = req.body;

    if (!driveUrl) {
      return res.status(400).json({ error: 'driveUrl is required' });
    }

    if (!itemNumber) {
      return res.status(400).json({ error: 'itemNumber is required' });
    }

    // Extract file ID from Drive URL
    const fileId = extractDriveFileId(driveUrl);
    if (!fileId) {
      return res.status(400).json({
        error: 'Invalid Google Drive URL',
        message: 'Could not extract file ID from the provided URL',
      });
    }

    console.log(`Fetching file ${fileId} for product ${itemNumber}`);

    const drive = getDriveClient();

    // Get file metadata
    const metadata = await getFileMetadata(drive, fileId);
    console.log('File metadata:', metadata);

    // Validate mime type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];

    if (!allowedMimeTypes.includes(metadata.mimeType)) {
      return res.status(400).json({
        error: 'Unsupported file type',
        message: `File type ${metadata.mimeType} is not supported. Allowed: ${allowedMimeTypes.join(', ')}`,
      });
    }

    // Download file from Drive
    console.log('Downloading from Google Drive...');
    const buffer = await downloadFromDrive(drive, fileId);
    console.log(`Downloaded ${buffer.length} bytes`);

    // Generate public ID for Cloudinary
    const timestamp = Date.now();
    const extension = metadata.name?.split('.').pop() || 'jpg';
    const publicId = `product-${itemNumber}-${timestamp}`;

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    const cloudinaryResult = await uploadToCloudinary(buffer, {
      folder: `tierramadre/product-${itemNumber}`,
      publicId,
      mimeType: metadata.mimeType,
    });

    console.log('Cloudinary upload complete:', cloudinaryResult.secure_url);

    return res.status(200).json({
      success: true,
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      format: cloudinaryResult.format,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      resourceType: cloudinaryResult.resource_type,
      bytes: cloudinaryResult.bytes,
      originalName: metadata.name,
    });

  } catch (error) {
    console.error('Error processing Drive to Cloudinary:', error);

    // Handle specific Google Drive errors
    if (error.code === 404) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The Google Drive file was not found or is not accessible',
      });
    }

    if (error.code === 403) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'The service account does not have permission to access this file. Make sure the file is shared with the service account email.',
      });
    }

    return res.status(500).json({
      error: 'Failed to process file',
      message: error.message,
    });
  }
}
