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
  withApiHandler,
  sendError,
  sendSuccess,
  DRIVE_FOLDERS,
} from './_lib/index.js';

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
 * Get animated GIF URL from video (Telegram/WhatsApp quality)
 * High quality settings for product display and QR sharing
 */
function getVideoGifUrl(uploadResult) {
  return cloudinary.url(uploadResult.public_id, {
    resource_type: 'video',
    format: 'gif',
    transformation: [
      { width: 480, crop: 'scale' },              // 480px width, maintain aspect ratio
      { start_offset: 0, end_offset: 8 },         // Up to 8 seconds of video
      { fps: 15 },                                 // Smooth 15fps animation
      { quality: 90 },                             // High quality like Telegram/WhatsApp
      { flags: ['lossy', 'animated', 'loop'] },   // Optimized looping GIF
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
 * Upload file to Google Drive
 * - For images: Upload directly to Drive
 * - For videos: Convert to high-quality GIF via Cloudinary, upload ONLY the GIF
 *   (saves storage, faster uploads, Telegram/WhatsApp quality)
 */
async function uploadFileToDrive(drive, folderId, file, index) {
  const originalName = file.originalFilename || file.newFilename || 'upload';
  const mimeType = file.mimetype || 'application/octet-stream';
  const isVideo = VIDEO_MIME_TYPES.includes(mimeType);

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const startTime = Date.now();

  // For videos: Convert to GIF only (don't store original video)
  if (isVideo) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary not configured - required for video to GIF conversion');
    }

    console.log(`[FastUpload] Converting video to GIF: ${originalName} (${fileSizeMB}MB)`);

    let cloudinaryResult = null;
    try {
      // Upload video to Cloudinary temporarily for GIF conversion
      cloudinaryResult = await uploadVideoToCloudinary(file.filepath, originalName);
      console.log(`[FastUpload] Cloudinary upload done: ${cloudinaryResult.public_id}`);

      // Generate high-quality GIF (Telegram/WhatsApp style)
      const gifUrl = getVideoGifUrl(cloudinaryResult);
      console.log(`[FastUpload] GIF URL: ${gifUrl}`);

      const gifBuffer = await downloadFromUrl(gifUrl);
      const gifSizeKB = (gifBuffer.length / 1024).toFixed(0);
      console.log(`[FastUpload] GIF generated: ${gifSizeKB}KB`);

      // Upload ONLY the GIF to Drive (no video file)
      const gifFileName = `product-${index + 1}-${Date.now()}.gif`;
      const gifDriveFile = await uploadBufferToDrive(
        drive,
        folderId,
        gifBuffer,
        gifFileName,
        'image/gif'
      );

      const uploadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[FastUpload] GIF uploaded to Drive in ${uploadTime}s: ${gifDriveFile.id}`);

      // Cleanup Cloudinary (async, don't wait)
      deleteFromCloudinary(cloudinaryResult.public_id, 'video');

      // Return GIF as the primary file (videoUrl points to GIF for QR code compatibility)
      return {
        id: gifDriveFile.id,
        mimeType: 'image/gif',
        isVideo: false, // It's now a GIF, not a video
        isConvertedFromVideo: true,
        fileName: gifFileName,
        uploadTime: parseFloat(uploadTime),
        url: `/api/serve-drive-image?fileId=${gifDriveFile.id}`,
        gifUrl: `/api/serve-drive-image?fileId=${gifDriveFile.id}`,
        videoUrl: `https://drive.google.com/file/d/${gifDriveFile.id}/view`, // QR links to GIF
        thumbnailUrl: `/api/serve-drive-image?fileId=${gifDriveFile.id}`,
      };

    } catch (gifError) {
      console.error(`[FastUpload] GIF generation failed:`, gifError.message);
      // Cleanup Cloudinary on error
      if (cloudinaryResult?.public_id) {
        deleteFromCloudinary(cloudinaryResult.public_id, 'video');
      }
      throw new Error(`Video to GIF conversion failed: ${gifError.message}`);
    }
  }

  // For images: Upload directly to Drive
  const fileExtension = SUPPORTED_MIME_TYPES[mimeType] ||
    (originalName.includes('.') ? originalName.split('.').pop() : 'bin');
  const fileName = `image-${index + 1}-${Date.now()}.${fileExtension}`;

  console.log(`[FastUpload] Uploading image ${fileName} (${fileSizeMB}MB) to Drive...`);

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
  console.log(`[FastUpload] Image uploaded in ${uploadTime}s. File ID: ${uploadedFile.data.id}`);

  // Set public permissions
  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    id: uploadedFile.data.id,
    mimeType,
    isVideo: false,
    fileName,
    uploadTime: parseFloat(uploadTime),
    url: `/api/serve-drive-image?fileId=${uploadedFile.data.id}`,
  };
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

export default withApiHandler(async (req, res, { oauthDrive, sharedDriveId }) => {
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

  const drive = oauthDrive;

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
}, { methods: ['POST', 'OPTIONS'], provideOAuthDrive: true, errorPrefix: 'FastUpload' });
