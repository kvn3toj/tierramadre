/**
 * Vercel Serverless Function - Upload Media for Cotizaciones
 *
 * Uploads images, GIFs, and videos to Google Drive for quotations.
 * Creates folder structure: TM-Studio/cotizaciones/{quotation-id}/
 *
 * Supports both provider quotations and admin quotation requests.
 */

import { GoogleAuth } from 'google-auth-library';
import { drive_v3 } from '@googleapis/drive';
import formidable from 'formidable';
import fs from 'fs';

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Cotizaciones folder name (created beside 'products' folder)
const COTIZACIONES_FOLDER_NAME = 'cotizaciones';

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
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    return new drive_v3.Drive({ auth });
  } catch (error) {
    console.error('Error initializing Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}

/**
 * Get or create the cotizaciones folder inside TM-Studio
 */
async function getOrCreateCotizacionesFolder(drive, parentFolderId) {
  // Check if cotizaciones folder already exists
  const searchResponse = await drive.files.list({
    q: `name='${COTIZACIONES_FOLDER_NAME}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  // Create the cotizaciones folder
  const folderMetadata = {
    name: COTIZACIONES_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
  });

  // Make folder publicly accessible
  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return folder.data.id;
}

/**
 * Get or create a subfolder for a specific quotation
 */
async function getOrCreateQuotationFolder(drive, cotizacionesFolderId, quotationId) {
  // Check if quotation folder already exists
  const searchResponse = await drive.files.list({
    q: `name='${quotationId}' and '${cotizacionesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  // Create the quotation-specific folder
  const folderMetadata = {
    name: quotationId,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [cotizacionesFolderId],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
  });

  // Make folder publicly accessible
  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return folder.data.id;
}

/**
 * Upload file to Google Drive
 */
async function uploadFileToDrive(drive, folderId, file, index) {
  // Handle missing filename
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

  const fileName = `media-${index + 1}-${Date.now()}.${fileExtension}`;

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

  // Return direct view URL
  return {
    id: uploadedFile.data.id,
    url: `https://drive.google.com/uc?export=view&id=${uploadedFile.data.id}`,
    mimeType: file.mimetype,
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable',
    });
  }

  if (!process.env.GOOGLE_SHARED_DRIVE_ID) {
    return res.status(500).json({
      error: 'Google Drive folder not configured',
      message: 'Please set up GOOGLE_SHARED_DRIVE_ID environment variable',
    });
  }

  try {
    // Parse multipart form data
    const form = formidable({
      multiples: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB max
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Get quotation ID from fields
    const quotationId = Array.isArray(fields.quotationId)
      ? fields.quotationId[0]
      : fields.quotationId;

    if (!quotationId) {
      return res.status(400).json({
        error: 'Missing quotationId',
        message: 'quotationId field is required',
      });
    }

    // Handle file array (formidable v3+ returns arrays)
    let fileList = files.file || files.files;
    if (!fileList) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'At least one file is required',
      });
    }

    // Normalize to array
    if (!Array.isArray(fileList)) {
      fileList = [fileList];
    }

    // Initialize Google Drive
    const drive = getDriveClient();
    const parentFolderId = process.env.GOOGLE_SHARED_DRIVE_ID.trim();

    // Get or create folder structure
    const cotizacionesFolderId = await getOrCreateCotizacionesFolder(drive, parentFolderId);
    const quotationFolderId = await getOrCreateQuotationFolder(drive, cotizacionesFolderId, quotationId);

    // Upload all files
    const uploadedFiles = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const result = await uploadFileToDrive(drive, quotationFolderId, file, i);
        uploadedFiles.push(result);
      } catch (uploadError) {
        console.error(`Error uploading file ${i}:`, uploadError);
      } finally {
        // Clean up temporary file
        if (file.filepath && fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        error: 'Upload failed',
        message: 'No files were successfully uploaded',
      });
    }

    return res.status(200).json({
      success: true,
      quotationId,
      files: uploadedFiles,
      urls: uploadedFiles.map(f => f.url),
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
}
