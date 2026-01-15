/**
 * Media Upload API
 *
 * Handles file uploads to Google Drive for quotations and products.
 * Supports images and videos up to 100MB.
 *
 * Endpoints:
 * - POST /api/media-upload - Upload files (multipart/form-data)
 *   Required field: quotationId (or folderId for generic uploads)
 *   Files: file or files (multipart)
 *
 * Supported formats:
 * - Images: JPEG, PNG, WebP, GIF, HEIC, HEIF, AVIF
 * - Videos: MP4, MOV, WebM, AVI, MKV, 3GP, M4V
 */

import formidable from 'formidable';
import fs from 'fs';

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

const SUPPORTED_MIME_TYPES = {
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
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

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
  'video/3gpp',
  'video/x-m4v',
];

// =============================================================================
// HELPERS
// =============================================================================

async function uploadFileToDrive(drive, folderId, file, index, sharedDriveId = null) {
  const originalName = file.originalFilename || file.newFilename || 'upload';

  const fileExtension = originalName.includes('.')
    ? originalName.split('.').pop()
    : (SUPPORTED_MIME_TYPES[file.mimetype] || 'bin');

  const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
  const prefix = isVideo ? 'video' : 'image';
  const fileName = `${prefix}-${index + 1}-${Date.now()}.${fileExtension}`;

  console.log(`[uploadFileToDrive] Uploading ${isVideo ? 'video' : 'image'}: ${fileName}`);
  console.log(`[uploadFileToDrive] Target folder: ${folderId}`);
  console.log(`[uploadFileToDrive] Shared Drive ID: ${sharedDriveId || 'none (My Drive)'}`);
  console.log(`[uploadFileToDrive] File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);

  let uploadedFile;
  try {
    uploadedFile = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.filepath),
      },
      fields: 'id, webViewLink, webContentLink, thumbnailLink',
      supportsAllDrives: true,
    });

    console.log(`[uploadFileToDrive] Upload successful. File ID: ${uploadedFile.data.id}`);
  } catch (uploadError) {
    console.error(`[uploadFileToDrive] Upload failed:`, uploadError.message);
    if (uploadError.response?.data?.error) {
      console.error(`[uploadFileToDrive] API Error Details:`, JSON.stringify(uploadError.response.data.error, null, 2));
    }
    throw uploadError;
  }

  // Only set public permissions for non-Shared Drive files
  if (!sharedDriveId) {
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
  }

  const fileId = uploadedFile.data.id;

  const result = {
    id: fileId,
    mimeType: file.mimetype,
    isVideo,
    fileName,
  };

  if (isVideo) {
    result.url = `https://drive.google.com/file/d/${fileId}/preview`;
    result.videoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    result.thumbnailUrl = uploadedFile.data.thumbnailLink ||
      `/api/serve-drive-image?fileId=${fileId}&thumbnail=true`;
  } else {
    result.url = `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  return result;
}

async function detectDriveType(drive, parentFolderId) {
  let driveIdParam = null;

  // First, try to check if the parentFolderId IS a Shared Drive
  try {
    await drive.drives.get({
      driveId: parentFolderId,
      fields: 'id, name'
    });
    driveIdParam = parentFolderId;
    console.log(`[Upload] Parent is a Shared Drive root: ${driveIdParam}`);
  } catch {
    // Not a Shared Drive root, check if it's a folder inside a Shared Drive
    try {
      const folderResponse = await drive.files.get({
        fileId: parentFolderId,
        fields: 'driveId, parents',
        supportsAllDrives: true,
      });

      driveIdParam = folderResponse.data.driveId || null;

      if (driveIdParam) {
        console.log(`[Upload] Parent folder is inside Shared Drive: ${driveIdParam}`);
      } else {
        console.log(`[Upload] WARNING: Using regular My Drive folder - large uploads may fail!`);
      }
    } catch (folderCheckError) {
      console.error(`[Upload] Could not determine Drive type:`, folderCheckError.message);
    }
  }

  return driveIdParam;
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

  // Get quotation/folder ID
  const quotationId = Array.isArray(fields.quotationId)
    ? fields.quotationId[0]
    : fields.quotationId;

  const customFolderId = Array.isArray(fields.folderId)
    ? fields.folderId[0]
    : fields.folderId;

  const targetFolder = Array.isArray(fields.targetFolder)
    ? fields.targetFolder[0]
    : fields.targetFolder;

  if (!quotationId && !customFolderId) {
    return sendError(res, 400, 'Missing quotationId or folderId');
  }

  let fileList = files.file || files.files;
  if (!fileList) {
    return sendError(res, 400, 'No files uploaded');
  }

  if (!Array.isArray(fileList)) {
    fileList = [fileList];
  }

  const drive = getDriveClient(false);
  const parentFolderId = sharedDriveId;

  console.log(`[Upload] Starting upload for: ${quotationId || customFolderId}`);
  console.log(`[Upload] Parent folder ID: ${parentFolderId}`);

  // Determine if we're using a Shared Drive
  const driveIdParam = await detectDriveType(drive, parentFolderId);

  // Create folder structure: cotizaciones/proveedores/{quotationId}
  // This separates provider quotations from manual entries
  let targetFolderId;
  try {
    if (customFolderId) {
      // Use custom folder directly
      targetFolderId = customFolderId;
    } else {
      // Create cotizaciones/proveedores/quotationId structure
      const baseFolderName = targetFolder || DRIVE_FOLDERS.COTIZACIONES;
      console.log(`[Upload] Looking for/creating ${baseFolderName} folder in: ${parentFolderId}`);
      const cotizacionesFolderId = await getOrCreateFolder(drive, parentFolderId, baseFolderName, driveIdParam);
      console.log(`[Upload] Cotizaciones folder ID: ${cotizacionesFolderId}`);

      console.log(`[Upload] Looking for/creating proveedores folder`);
      const proveedoresFolderId = await getOrCreateFolder(drive, cotizacionesFolderId, DRIVE_FOLDERS.COTIZACIONES_PROVEEDORES, driveIdParam);
      console.log(`[Upload] Proveedores folder ID: ${proveedoresFolderId}`);

      console.log(`[Upload] Looking for/creating folder: ${quotationId}`);
      targetFolderId = await getOrCreateFolder(drive, proveedoresFolderId, quotationId, driveIdParam);
      console.log(`[Upload] Target folder ID: ${targetFolderId}`);
    }

    // Verify the folder
    const folderCheck = await drive.files.get({
      fileId: targetFolderId,
      fields: 'id, name, driveId, parents',
      supportsAllDrives: true,
    });
    console.log(`[Upload] Folder verification:`, JSON.stringify(folderCheck.data, null, 2));
  } catch (folderError) {
    console.error('[Upload] Folder creation error:', folderError.message);
    if (folderError.response?.data) {
      console.error('[Upload] API error details:', JSON.stringify(folderError.response.data, null, 2));
    }
    return sendError(res, 500, 'Failed to create upload folder', folderError.message);
  }

  // Upload files
  const uploadedFiles = [];
  const errors = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    console.log(`[Upload] File ${i + 1}/${fileList.length}: "${file.originalFilename}" (${fileSizeMB}MB, ${isVideo ? 'VIDEO' : 'IMAGE'})`);

    try {
      const result = await uploadFileToDrive(drive, targetFolderId, file, i, driveIdParam);
      console.log(`[Upload] Upload successful: ${result.fileName}`);
      uploadedFiles.push(result);
    } catch (uploadError) {
      console.error(`[Upload] Upload failed for "${file.originalFilename}":`, uploadError.message);
      if (uploadError.response?.data) {
        console.error('[Upload] API error details:', JSON.stringify(uploadError.response.data, null, 2));
      }
      errors.push({
        file: file.originalFilename || file.newFilename,
        error: uploadError.message,
        size: fileSizeMB
      });
    } finally {
      // Clean up temp file
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
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
    quotationId: quotationId || null,
    files: uploadedFiles,
    urls: uploadedFiles.map(f => f.url),
    errors: errors.length > 0 ? errors : undefined,
  });
}
