/**
 * Ambassador Photo Upload API
 *
 * Uploads ambassador profile photos to Google Drive ambassadors/ folder.
 * Each ambassador gets one photo named {slug}.jpg, replacing any previous one.
 *
 * POST /api/ambassador-photo
 * Body: multipart/form-data with fields: file (image), slug (string)
 */

import formidable from 'formidable';
import fs from 'fs';

import {
  withApiHandler,
  sendError,
  sendSuccess,
  DRIVE_FOLDERS,
} from './_lib/index.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SLUG_REGEX = /^[a-z0-9-]+$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Find or create ambassadors/ folder using OAuth Drive (Shared Drive aware)
 */
async function getOrCreateAmbassadorsFolder(drive, parentFolderId) {
  const folderName = DRIVE_FOLDERS.AMBASSADORS;

  const searchResponse = await drive.files.list({
    q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchResponse.data.files?.length > 0) {
    return searchResponse.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  console.log(`[AmbassadorPhoto] Created ambassadors/ folder: ${folder.data.id}`);
  return folder.data.id;
}

export default withApiHandler(async (req, res, { oauthDrive, sharedDriveId }) => {
  if (!oauthDrive) {
    return sendError(res, 500, 'OAuth Drive not available');
  }

  // Parse multipart form data
  let fields, files;
  try {
    const form = formidable({
      multiples: false,
      maxFileSize: MAX_FILE_SIZE,
    });

    [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, parsedFields, parsedFiles) => {
        if (err) reject(err);
        resolve([parsedFields, parsedFiles]);
      });
    });
  } catch (formError) {
    return sendError(res, 400, 'Failed to parse form data', formError.message);
  }

  // Extract and validate slug
  const slug = Array.isArray(fields.slug) ? fields.slug[0] : fields.slug;
  // Get uploaded file (extract before try/finally so cleanup always runs)
  const file = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;

  try {
    if (!slug || !SLUG_REGEX.test(slug)) {
      return sendError(res, 400, 'Invalid or missing slug');
    }

    if (!file) {
      return sendError(res, 400, 'No file uploaded');
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return sendError(res, 400, `Unsupported file type: ${file.mimetype}. Use JPEG, PNG, or WebP.`);
    }

    const drive = oauthDrive;

    // Get or create ambassadors/ folder
    const ambassadorsFolderId = await getOrCreateAmbassadorsFolder(drive, sharedDriveId);

    // Check for existing photo and delete it
    const fileName = `${slug}.jpg`;
    const existingFiles = await drive.files.list({
      q: `name='${fileName}' and '${ambassadorsFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (existingFiles.data.files?.length > 0) {
      for (const existing of existingFiles.data.files) {
        await drive.files.delete({ fileId: existing.id, supportsAllDrives: true });
        console.log(`[AmbassadorPhoto] Deleted old photo: ${existing.id}`);
      }
    }

    // Upload new photo
    const uploadedFile = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [ambassadorsFolderId],
      },
      media: {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(file.filepath),
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    const fileId = uploadedFile.data.id;

    // Set public read permissions
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    console.log(`[AmbassadorPhoto] Uploaded ${fileName}: ${fileId}`);

    const proxyUrl = `/api/serve-drive-image?fileId=${fileId}`;

    return sendSuccess(res, {
      fileId,
      proxyUrl,
      slug,
    });
  } finally {
    // Clean up temp file (always runs, even on validation errors)
    if (file?.filepath && fs.existsSync(file.filepath)) {
      fs.unlinkSync(file.filepath);
    }
  }
}, {
  methods: ['POST', 'OPTIONS'],
  provideOAuthDrive: true,
  requireDriveId: true,
  errorPrefix: 'AmbassadorPhoto',
});
