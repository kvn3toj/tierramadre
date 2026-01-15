/**
 * Cloudinary Process & Drive Upload API
 *
 * Receives files, processes them through Cloudinary for optimization,
 * then uploads the optimized result to Google Drive cotizaciones folder.
 *
 * Flow:
 * 1. Receive file upload
 * 2. Upload to Cloudinary (temporary) for processing
 * 3. Download optimized version from Cloudinary
 * 4. Upload to Google Drive cotizaciones folder
 * 5. Delete from Cloudinary (optional cleanup)
 *
 * Endpoints:
 * - POST /api/cloudinary-upload - Upload files (multipart/form-data)
 *   Required field: quotationId (e.g., "manual-123")
 *   Files: file or files (multipart)
 *
 * Features:
 * - Automatic HEIC/HEIF conversion to JPEG
 * - Image optimization (quality, format)
 * - Video transcoding to MP4
 * - GIF optimization
 * - Final storage in Google Drive
 */

import { v2 as cloudinary } from 'cloudinary';
import formidable from 'formidable';
import fs from 'fs';
import { Readable } from 'stream';
import https from 'https';

import {
  getDriveClient,
  isGoogleConfigured,
  getSharedDriveId,
  setCorsHeaders,
  handleOptions,
  sendError,
  sendSuccess,
  DRIVE_FOLDERS,
  getOrCreateFolder,
} from './_lib/index.js';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyam6g2os';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const SUPPORTED_MIME_TYPES = {
  // Images
  'image/jpeg': { type: 'image', outputFormat: 'jpg', outputMime: 'image/jpeg' },
  'image/png': { type: 'image', outputFormat: 'png', outputMime: 'image/png' },
  'image/webp': { type: 'image', outputFormat: 'jpg', outputMime: 'image/jpeg' },
  'image/gif': { type: 'image', outputFormat: 'gif', outputMime: 'image/gif' },
  'image/heic': { type: 'image', outputFormat: 'jpg', outputMime: 'image/jpeg' },
  'image/heif': { type: 'image', outputFormat: 'jpg', outputMime: 'image/jpeg' },
  'image/avif': { type: 'image', outputFormat: 'jpg', outputMime: 'image/jpeg' },
  // Videos
  'video/mp4': { type: 'video', outputFormat: 'mp4', outputMime: 'video/mp4' },
  'video/quicktime': { type: 'video', outputFormat: 'mp4', outputMime: 'video/mp4' },
  'video/webm': { type: 'video', outputFormat: 'mp4', outputMime: 'video/mp4' },
  'video/x-msvideo': { type: 'video', outputFormat: 'mp4', outputMime: 'video/mp4' },
  'video/x-matroska': { type: 'video', outputFormat: 'mp4', outputMime: 'video/mp4' },
  'video/3gpp': { type: 'video', outputFormat: 'mp4', outputMime: 'video/mp4' },
  'video/x-m4v': { type: 'video', outputFormat: 'mp4', outputMime: 'video/mp4' },
};

// =============================================================================
// HELPERS
// =============================================================================

function isCloudinaryConfigured() {
  return CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET;
}

/**
 * Upload to Cloudinary for processing
 */
async function processWithCloudinary(filePath, options = {}) {
  const { resourceType = 'image', originalFilename } = options;

  const uploadOptions = {
    folder: 'tierramadre/_processing', // Temporary folder
    resource_type: resourceType,
    // Use original filename as public_id base (sanitized)
    ...(originalFilename && {
      public_id: `${Date.now()}_${originalFilename
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .substring(0, 50)}`,
    }),
  };

  return cloudinary.uploader.upload(filePath, uploadOptions);
}

/**
 * Get optimized URL from Cloudinary
 */
function getOptimizedUrl(uploadResult, outputFormat, isVideo) {
  if (isVideo) {
    // Return transcoded MP4 URL
    return cloudinary.url(uploadResult.public_id, {
      resource_type: 'video',
      format: 'mp4',
      video_codec: 'h264',
      audio_codec: 'aac',
    });
  } else if (outputFormat === 'gif') {
    // Optimized GIF
    return cloudinary.url(uploadResult.public_id, {
      resource_type: 'image',
      format: 'gif',
      transformation: [{ quality: 'auto:good' }],
    });
  } else {
    // Optimized image (JPEG for HEIC/HEIF/WebP/AVIF, original for PNG)
    return cloudinary.url(uploadResult.public_id, {
      resource_type: 'image',
      format: outputFormat,
      transformation: [{ quality: 'auto:good' }],
    });
  }
}

/**
 * Download file from URL to buffer
 */
function downloadFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
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
async function uploadToDrive(drive, folderId, buffer, fileName, mimeType, sharedDriveId) {
  console.log(`[Drive] Uploading ${fileName} (${(buffer.length / 1024 / 1024).toFixed(2)}MB) to folder ${folderId}`);

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
    fields: 'id, webViewLink, webContentLink, thumbnailLink',
    supportsAllDrives: true,
  });

  console.log(`[Drive] Upload successful. File ID: ${uploadedFile.data.id}`);

  // Only set public permissions for non-Shared Drive files
  if (!sharedDriveId) {
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
  }

  return uploadedFile.data;
}

/**
 * Delete file from Cloudinary (cleanup)
 */
async function deleteFromCloudinary(publicId, resourceType) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[Cloudinary] Cleaned up: ${publicId}`);
  } catch (e) {
    console.warn(`[Cloudinary] Cleanup failed for ${publicId}:`, e.message);
  }
}

/**
 * Detect if folder is in a Shared Drive
 */
async function detectDriveType(drive, parentFolderId) {
  try {
    await drive.drives.get({ driveId: parentFolderId, fields: 'id, name' });
    return parentFolderId;
  } catch {
    try {
      const folderResponse = await drive.files.get({
        fileId: parentFolderId,
        fields: 'driveId',
        supportsAllDrives: true,
      });
      return folderResponse.data.driveId || null;
    } catch {
      return null;
    }
  }
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

  // Check configurations
  if (!isCloudinaryConfigured()) {
    return sendError(res, 500, 'Cloudinary not configured. Missing API credentials.');
  }

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  const sharedDriveId = getSharedDriveId();
  if (!sharedDriveId) {
    return sendError(res, 500, 'Google Drive folder not configured');
  }

  // Parse form data
  let fields, files;
  try {
    const form = formidable({
      multiples: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB max
      keepExtensions: true,
    });

    [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, parsedFields, parsedFiles) => {
        if (err) reject(err);
        resolve([parsedFields, parsedFiles]);
      });
    });
  } catch (formError) {
    console.error('Formidable parse error:', formError);
    return sendError(res, 400, 'Failed to parse form data', formError.message);
  }

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

  console.log(`[CloudinaryToDrive] Starting process for quotation: ${quotationId}`);
  console.log(`[CloudinaryToDrive] Files to process: ${fileList.length}`);

  // Initialize Drive
  const drive = getDriveClient(false);
  const parentFolderId = sharedDriveId;
  const driveIdParam = await detectDriveType(drive, parentFolderId);

  // Create folder structure: cotizaciones/{quotationId}
  let targetFolderId;
  try {
    const baseFolderId = await getOrCreateFolder(drive, parentFolderId, DRIVE_FOLDERS.COTIZACIONES, driveIdParam);
    targetFolderId = await getOrCreateFolder(drive, baseFolderId, quotationId, driveIdParam);
    console.log(`[CloudinaryToDrive] Target Drive folder: ${targetFolderId}`);
  } catch (folderError) {
    console.error('[CloudinaryToDrive] Folder creation error:', folderError.message);
    return sendError(res, 500, 'Failed to create upload folder', folderError.message);
  }

  // Process and upload files
  const uploadedFiles = [];
  const errors = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const mimeType = file.mimetype || 'application/octet-stream';
    const typeInfo = SUPPORTED_MIME_TYPES[mimeType];

    if (!typeInfo) {
      errors.push({
        file: file.originalFilename || file.newFilename,
        error: `Unsupported file type: ${mimeType}`,
      });
      continue;
    }

    const isVideo = typeInfo.type === 'video';
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    console.log(`[CloudinaryToDrive] Processing ${i + 1}/${fileList.length}: "${file.originalFilename}" (${fileSizeMB}MB, ${typeInfo.type})`);

    let cloudinaryResult = null;

    try {
      // Step 1: Upload to Cloudinary for processing
      console.log(`[CloudinaryToDrive] Step 1: Uploading to Cloudinary for processing...`);
      cloudinaryResult = await processWithCloudinary(file.filepath, {
        resourceType: typeInfo.type,
        originalFilename: file.originalFilename,
      });
      console.log(`[CloudinaryToDrive] Cloudinary upload done: ${cloudinaryResult.public_id}`);

      // Step 2: Get optimized URL
      const optimizedUrl = getOptimizedUrl(cloudinaryResult, typeInfo.outputFormat, isVideo);
      console.log(`[CloudinaryToDrive] Step 2: Optimized URL: ${optimizedUrl}`);

      // Step 3: Download optimized file
      console.log(`[CloudinaryToDrive] Step 3: Downloading optimized file...`);
      const optimizedBuffer = await downloadFromUrl(optimizedUrl);
      console.log(`[CloudinaryToDrive] Downloaded: ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)}MB`);

      // Step 4: Upload to Google Drive
      const prefix = isVideo ? 'video' : 'image';
      const fileName = `${prefix}-${i + 1}-${Date.now()}.${typeInfo.outputFormat}`;

      console.log(`[CloudinaryToDrive] Step 4: Uploading to Google Drive as ${fileName}...`);
      const driveFile = await uploadToDrive(
        drive,
        targetFolderId,
        optimizedBuffer,
        fileName,
        typeInfo.outputMime,
        driveIdParam
      );

      // Build result
      const fileId = driveFile.id;
      const result = {
        id: fileId,
        mimeType: typeInfo.outputMime,
        isVideo,
        fileName,
        originalName: file.originalFilename,
        optimizedSize: optimizedBuffer.length,
      };

      if (isVideo) {
        result.url = `https://drive.google.com/file/d/${fileId}/preview`;
        result.videoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        result.thumbnailUrl = `/api/serve-drive-image?fileId=${fileId}&thumbnail=true`;
      } else {
        result.url = `https://drive.google.com/uc?export=view&id=${fileId}`;
      }

      uploadedFiles.push(result);
      console.log(`[CloudinaryToDrive] Success: ${fileName} -> Drive ID ${fileId}`);

      // Step 5: Cleanup Cloudinary (async, don't wait)
      deleteFromCloudinary(cloudinaryResult.public_id, typeInfo.type);

    } catch (error) {
      console.error(`[CloudinaryToDrive] Error processing "${file.originalFilename}":`, error.message);
      errors.push({
        file: file.originalFilename || file.newFilename,
        error: error.message,
        size: fileSizeMB,
      });

      // Try to cleanup Cloudinary if we got that far
      if (cloudinaryResult?.public_id) {
        deleteFromCloudinary(cloudinaryResult.public_id, typeInfo.type);
      }
    } finally {
      // Clean up temp file
      if (file.filepath && fs.existsSync(file.filepath)) {
        try {
          fs.unlinkSync(file.filepath);
        } catch (e) {
          console.warn('Failed to cleanup temp file:', e.message);
        }
      }
    }
  }

  if (uploadedFiles.length === 0) {
    const errorMsg = errors.length > 0
      ? `Upload failed: ${errors.map(e => e.error).join(', ')}`
      : 'No files were uploaded successfully';
    return sendError(res, 500, errorMsg);
  }

  return sendSuccess(res, {
    folderId: targetFolderId,
    quotationId,
    files: uploadedFiles,
    urls: uploadedFiles.map(f => f.url),
    errors: errors.length > 0 ? errors : undefined,
  });
}
