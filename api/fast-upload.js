/**
 * Fast Upload API - With Video GIF Generation
 *
 * This endpoint uploads files to Google Drive with video GIF support:
 * 1. Uploads directly to Google Drive
 * 2. For videos, generates animated GIF via Cloudinary for preview
 * 3. Returns both video URL and GIF URL for display
 *
 * Use this for manual product entries in cotizaciones.
 */

import formidable from 'formidable';
import fs from 'fs';
import https from 'https';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

import {
  getSharedDriveId,
  setCorsHeaders,
  handleOptions,
  sendError,
  sendSuccess,
  DRIVE_FOLDERS,
} from './_lib/index.js';

import {
  isOAuthConfigured,
  getOAuthDriveClient,
} from './_lib/oauth-drive-client.js';

// =============================================================================
// CLOUDINARY CONFIGURATION
// =============================================================================

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyam6g2os';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary (only if credentials available)
if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function isCloudinaryConfigured() {
  return CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET;
}

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
  'video/3gpp',
  'video/x-m4v',
];

const SUPPORTED_MIME_TYPES = {
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'jpg', // Will need conversion on display
  'image/heif': 'jpg',
  'image/avif': 'avif',
  // Videos
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
  'video/3gpp': '3gp',
  'video/x-m4v': 'm4v',
};

// =============================================================================
// CLOUDINARY HELPERS (for GIF generation)
// =============================================================================

/**
 * Upload video to Cloudinary temporarily for GIF generation
 */
async function uploadVideoToCloudinary(filePath, originalFilename) {
  return cloudinary.uploader.upload(filePath, {
    folder: 'tierramadre/_processing',
    resource_type: 'video',
    public_id: `${Date.now()}_${originalFilename
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50)}`,
  });
}

/**
 * Get animated GIF URL from video (first 3 seconds)
 */
function getVideoGifUrl(uploadResult) {
  return cloudinary.url(uploadResult.public_id, {
    resource_type: 'video',
    format: 'gif',
    transformation: [
      { width: 400, crop: 'scale' },  // Reasonable size for preview
      { start_offset: 0, end_offset: 3 },  // First 3 seconds
      { fps: 10 },  // Lower framerate for smaller file
      { quality: 'auto:low' },  // Optimize for size
    ],
  });
}

/**
 * Download file from URL to buffer
 */
function downloadFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFromUrl(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Upload buffer to Google Drive
 */
async function uploadBufferToDrive(drive, folderId, buffer, fileName, mimeType) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const uploadedFile = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: readable,
    },
    fields: 'id',
  });

  // Set public permissions
  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return uploadedFile.data;
}

/**
 * Delete file from Cloudinary (cleanup)
 */
async function deleteFromCloudinary(publicId, resourceType) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[FastUpload] Cloudinary cleanup: ${publicId}`);
  } catch (e) {
    console.warn(`[FastUpload] Cloudinary cleanup failed: ${e.message}`);
  }
}

// =============================================================================
// DRIVE HELPERS
// =============================================================================

/**
 * Upload file to Google Drive with optional GIF generation for videos
 */
async function uploadFileToDrive(drive, folderId, file, index) {
  const originalName = file.originalFilename || file.newFilename || 'upload';
  const mimeType = file.mimetype || 'application/octet-stream';

  const fileExtension = SUPPORTED_MIME_TYPES[mimeType] ||
    (originalName.includes('.') ? originalName.split('.').pop() : 'bin');

  const isVideo = VIDEO_MIME_TYPES.includes(mimeType);
  const prefix = isVideo ? 'video' : 'image';
  const fileName = `${prefix}-${index + 1}-${Date.now()}.${fileExtension}`;

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  console.log(`[FastUpload] Uploading ${fileName} (${fileSizeMB}MB) to Drive...`);

  const startTime = Date.now();

  // Upload main file to Drive
  const uploadedFile = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(file.filepath),
    },
    fields: 'id, webViewLink, webContentLink, thumbnailLink',
  });

  const uploadTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[FastUpload] Upload complete in ${uploadTime}s. File ID: ${uploadedFile.data.id}`);

  // Set public permissions
  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const fileId = uploadedFile.data.id;

  const result = {
    id: fileId,
    mimeType,
    isVideo,
    fileName,
    uploadTime: parseFloat(uploadTime),
  };

  if (isVideo) {
    result.url = `https://drive.google.com/file/d/${fileId}/preview`;
    result.videoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    // Fallback thumbnail (may not be immediately available)
    result.thumbnailUrl = `/api/serve-drive-image?fileId=${fileId}&thumbnail=true`;

    // Generate GIF via Cloudinary if configured
    if (isCloudinaryConfigured()) {
      let cloudinaryResult = null;
      try {
        console.log(`[FastUpload] Generating GIF preview via Cloudinary...`);

        // Upload video to Cloudinary temporarily
        cloudinaryResult = await uploadVideoToCloudinary(file.filepath, originalName);
        console.log(`[FastUpload] Cloudinary upload done: ${cloudinaryResult.public_id}`);

        // Get GIF URL and download it
        const gifUrl = getVideoGifUrl(cloudinaryResult);
        console.log(`[FastUpload] GIF URL: ${gifUrl}`);

        const gifBuffer = await downloadFromUrl(gifUrl);
        console.log(`[FastUpload] GIF downloaded: ${(gifBuffer.length / 1024).toFixed(0)}KB`);

        // Upload GIF to Drive
        const gifFileName = `gif-${index + 1}-${Date.now()}.gif`;
        const gifDriveFile = await uploadBufferToDrive(
          drive,
          folderId,
          gifBuffer,
          gifFileName,
          'image/gif'
        );

        result.gifUrl = `/api/serve-drive-image?fileId=${gifDriveFile.id}`;
        result.gifId = gifDriveFile.id;
        console.log(`[FastUpload] GIF uploaded to Drive: ${gifDriveFile.id}`);

        // Cleanup Cloudinary (async, don't wait)
        deleteFromCloudinary(cloudinaryResult.public_id, 'video');

      } catch (gifError) {
        console.warn(`[FastUpload] GIF generation failed (non-fatal):`, gifError.message);
        // Continue without GIF - Drive thumbnail will be used as fallback
        if (cloudinaryResult?.public_id) {
          deleteFromCloudinary(cloudinaryResult.public_id, 'video');
        }
      }
    } else {
      console.log(`[FastUpload] Cloudinary not configured, skipping GIF generation`);
    }
  } else {
    result.url = `/api/serve-drive-image?fileId=${fileId}`;
  }

  return result;
}

/**
 * Find or create a folder in Drive
 */
async function getOrCreateFolder(drive, parentFolderId, folderName) {
  const escapedFolderName = folderName.replace(/'/g, "\\'");

  // Search for existing folder
  const searchResponse = await drive.files.list({
    q: `name='${escapedFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  // Set public permissions
  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return folder.data.id;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  setCorsHeaders(res, ['POST', 'OPTIONS']);

  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  if (!isOAuthConfigured()) {
    return sendError(res, 500, 'Google OAuth not configured');
  }

  const sharedDriveId = getSharedDriveId();
  if (!sharedDriveId) {
    return sendError(res, 500, 'Google Drive folder not configured');
  }

  const totalStartTime = Date.now();

  // Parse form data
  let fields, files;
  try {
    const form = formidable({
      multiples: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB max
    });

    [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, parsedFields, parsedFiles) => {
        if (err) reject(err);
        resolve([parsedFields, parsedFiles]);
      });
    });
  } catch (formError) {
    console.error('[FastUpload] Parse error:', formError);
    return sendError(res, 400, 'Failed to parse form data', formError.message);
  }

  const parseTime = ((Date.now() - totalStartTime) / 1000).toFixed(1);
  console.log(`[FastUpload] Form parsed in ${parseTime}s`);

  // Get quotation ID
  const quotationId = Array.isArray(fields.quotationId)
    ? fields.quotationId[0]
    : fields.quotationId;

  if (!quotationId) {
    return sendError(res, 400, 'Missing quotationId');
  }

  let fileList = files.file || files.files;
  if (!fileList) {
    return sendError(res, 400, 'No files uploaded');
  }

  if (!Array.isArray(fileList)) {
    fileList = [fileList];
  }

  // Get OAuth Drive client
  let drive;
  try {
    drive = await getOAuthDriveClient();
  } catch (oauthError) {
    console.error('[FastUpload] OAuth error:', oauthError.message);
    return sendError(res, 500, `OAuth failed: ${oauthError.message}`);
  }

  // Create folder structure: cotizaciones/manuales/{quotationId}
  let targetFolderId;
  try {
    const cotizacionesFolderId = await getOrCreateFolder(drive, sharedDriveId, DRIVE_FOLDERS.COTIZACIONES);
    const manualesFolderId = await getOrCreateFolder(drive, cotizacionesFolderId, DRIVE_FOLDERS.COTIZACIONES_MANUALES);
    targetFolderId = await getOrCreateFolder(drive, manualesFolderId, quotationId);
  } catch (folderError) {
    console.error('[FastUpload] Folder error:', folderError.message);
    return sendError(res, 500, 'Failed to create folder', folderError.message);
  }

  // Upload files
  const uploadedFiles = [];
  const errors = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];

    try {
      const result = await uploadFileToDrive(drive, targetFolderId, file, i);
      uploadedFiles.push(result);
    } catch (uploadError) {
      console.error(`[FastUpload] Error:`, uploadError.message);
      errors.push({
        file: file.originalFilename || file.newFilename,
        error: uploadError.message,
      });
    } finally {
      // Clean up temp file
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    }
  }

  const totalTime = ((Date.now() - totalStartTime) / 1000).toFixed(1);
  console.log(`[FastUpload] Total time: ${totalTime}s for ${fileList.length} file(s)`);

  if (uploadedFiles.length === 0) {
    return sendError(res, 500, errors[0]?.error || 'Upload failed');
  }

  return sendSuccess(res, {
    folderId: targetFolderId,
    quotationId,
    files: uploadedFiles,
    urls: uploadedFiles.map(f => f.url),
    totalTime: parseFloat(totalTime),
    errors: errors.length > 0 ? errors : undefined,
  });
}
