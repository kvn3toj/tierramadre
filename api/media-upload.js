/**
 * Media Upload API (OAuth Version)
 *
 * Handles file uploads to Google Drive using OAuth (personal account).
 * Uses YOUR Google account's storage quota, not a Service Account.
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
 *
 * Environment Variables Required:
 * - GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 * - GOOGLE_SHARED_DRIVE_ID (folder ID in your Drive)
 */

import formidable from "formidable";
import fs from "fs";

import {
  withApiHandler,
  sendError,
  sendSuccess,
  DRIVE_FOLDERS,
} from "./_lib/index.js";

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
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  // Videos
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
  "video/3gpp": "3gp",
  "video/x-m4v": "m4v",
};

const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-matroska",
  "video/3gpp",
  "video/x-m4v",
];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Sanitize a caller-supplied filename to a safe Drive basename.
 * Strips any path, restricts to [a-zA-Z0-9._-], and ensures an extension.
 * Returns null when nothing usable remains (caller falls back to the
 * auto-generated name).
 */
function sanitizeFileName(name, mimetype) {
  let base = String(name || "")
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "");
  if (!base) return null;
  if (!/\.[a-z0-9]+$/i.test(base)) {
    base += `.${SUPPORTED_MIME_TYPES[mimetype] || "bin"}`;
  }
  return base;
}

async function uploadFileToDrive(drive, folderId, file, index, overrideName) {
  const originalName = file.originalFilename || file.newFilename || "upload";

  const fileExtension = originalName.includes(".")
    ? originalName.split(".").pop()
    : SUPPORTED_MIME_TYPES[file.mimetype] || "bin";

  const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
  const isPdf =
    file.mimetype === "application/pdf" ||
    String(fileExtension).toLowerCase() === "pdf";
  const prefix = isVideo ? "video" : isPdf ? "doc" : "image";
  // Optional caller-supplied name (e.g. an order-controlling, labeled
  // visualizer filename). Falls back to the auto-generated name.
  const fileName =
    (overrideName && sanitizeFileName(overrideName, file.mimetype)) ||
    `${prefix}-${index + 1}-${Date.now()}.${fileExtension}`;

  console.log(`[Upload] Uploading ${isVideo ? "video" : "image"}: ${fileName}`);
  console.log(`[Upload] Target folder: ${folderId}`);
  console.log(
    `[Upload] File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
  );

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
      fields: "id, webViewLink, webContentLink, thumbnailLink",
    });

    console.log(`[Upload] Upload successful. File ID: ${uploadedFile.data.id}`);
  } catch (uploadError) {
    console.error(`[Upload] Upload failed:`, uploadError.message);
    if (uploadError.response?.data?.error) {
      console.error(
        `[Upload] API Error Details:`,
        JSON.stringify(uploadError.response.data.error, null, 2),
      );
    }
    throw uploadError;
  }

  // Set public permissions so anyone can view
  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  console.log(
    `[Upload] Public permission set for file ${uploadedFile.data.id}`,
  );

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
    result.thumbnailUrl = `/api/serve-drive-image?fileId=${fileId}&thumbnail=true`;
  } else if (isPdf) {
    // PDFs (carnet/kardex, certificado) don't render via `uc?export=view` —
    // that endpoint streams raw bytes meant for an <img>, so a browser opening
    // it for a PDF gets a download or a "can't preview" page (the broken
    // "Abrir Kardex" link). The Drive viewer URL opens the PDF in-browser, and
    // the file is already shared anyone-with-link reader above.
    result.url = `https://drive.google.com/file/d/${fileId}/view`;
  } else {
    result.url = `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  return result;
}

/**
 * Find or create a folder using OAuth Drive client
 */
async function getOrCreateFolderOAuth(drive, parentFolderId, folderName) {
  const escapedFolderName = folderName.replace(/'/g, "\\'");

  // Search for existing folder
  try {
    const searchResponse = await drive.files.list({
      q: `name='${escapedFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      console.log(
        `[Upload] Found existing folder "${folderName}": ${searchResponse.data.files[0].id}`,
      );
      return searchResponse.data.files[0].id;
    }
  } catch (searchError) {
    console.error(
      `[Upload] Error searching for folder "${folderName}":`,
      searchError.message,
    );
  }

  // Create folder
  try {
    console.log(
      `[Upload] Creating folder "${folderName}" in parent ${parentFolderId}`,
    );
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id",
    });

    // Set public permissions for folder
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: { role: "reader", type: "anyone" },
    });

    console.log(`[Upload] Created folder "${folderName}": ${folder.data.id}`);
    return folder.data.id;
  } catch (createError) {
    console.error(
      `[Upload] Error creating folder "${folderName}":`,
      createError.message,
    );
    throw createError;
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default withApiHandler(
  async (req, res, { oauthDrive, sharedDriveId }) => {
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
      console.error("Formidable parse error:", formError);
      return sendError(
        res,
        400,
        "Failed to parse form data",
        formError.message,
      );
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

    // Slice 3 (Fotosíntesis): optional slash-delimited path under the shared
    // Drive root, e.g. "ventas/2026/05". When provided, the endpoint walks/creates
    // each segment and uses the leaf as the upload target — bypassing the
    // cotizaciones/proveedores/quotationId hierarchy that quotations require.
    const subPath = Array.isArray(fields.subPath)
      ? fields.subPath[0]
      : fields.subPath;

    // Optional explicit filename for the uploaded file (single-file uploads
    // only). Lets callers control carousel order + labeling via the name.
    const customFileName = Array.isArray(fields.fileName)
      ? fields.fileName[0]
      : fields.fileName;

    if (!quotationId && !customFolderId && !subPath) {
      return sendError(res, 400, "Missing quotationId, folderId, or subPath");
    }

    let fileList = files.file || files.files;
    if (!fileList) {
      return sendError(res, 400, "No files uploaded");
    }

    if (!Array.isArray(fileList)) {
      fileList = [fileList];
    }

    const drive = oauthDrive;
    console.log(`[Upload] OAuth Drive client initialized`);

    const parentFolderId = sharedDriveId;

    console.log(
      `[Upload] Starting upload for: ${quotationId || customFolderId}`,
    );
    console.log(`[Upload] Parent folder ID: ${parentFolderId}`);

    // Create folder structure: cotizaciones/proveedores/{quotationId}
    // This separates provider quotations from manual entries
    let targetFolderId;
    try {
      if (customFolderId) {
        // Use custom folder directly
        targetFolderId = customFolderId;
      } else if (subPath) {
        // Slice 3 (Fotosíntesis): walk a slash-delimited path under the shared
        // Drive root, creating any missing segments. Used for "ventas/2026/05"
        // so venta PDFs don't end up under cotizaciones/proveedores/.
        const segments = subPath
          .split("/")
          .map((s) => s.trim())
          // Drop empty, "..", and "." segments. Drive has no POSIX-style
          // path traversal (folders are id-keyed, not path-keyed) so this
          // is defensive only — keeps the folder tree predictable.
          .filter((s) => s && s !== ".." && s !== ".");
        if (segments.length === 0) {
          throw new Error("subPath must contain at least one valid segment");
        }
        let cursor = parentFolderId;
        for (const segment of segments) {
          console.log(
            `[Upload] subPath: looking for/creating "${segment}" in ${cursor}`,
          );
          cursor = await getOrCreateFolderOAuth(drive, cursor, segment);
        }
        targetFolderId = cursor;
      } else {
        // Create cotizaciones/proveedores/quotationId structure
        const baseFolderName = targetFolder || DRIVE_FOLDERS.COTIZACIONES;
        console.log(
          `[Upload] Looking for/creating ${baseFolderName} folder in: ${parentFolderId}`,
        );
        const cotizacionesFolderId = await getOrCreateFolderOAuth(
          drive,
          parentFolderId,
          baseFolderName,
        );
        console.log(`[Upload] Cotizaciones folder ID: ${cotizacionesFolderId}`);

        console.log(`[Upload] Looking for/creating proveedores folder`);
        const proveedoresFolderId = await getOrCreateFolderOAuth(
          drive,
          cotizacionesFolderId,
          DRIVE_FOLDERS.COTIZACIONES_PROVEEDORES,
        );
        console.log(`[Upload] Proveedores folder ID: ${proveedoresFolderId}`);

        console.log(`[Upload] Looking for/creating folder: ${quotationId}`);
        targetFolderId = await getOrCreateFolderOAuth(
          drive,
          proveedoresFolderId,
          quotationId,
        );
        console.log(`[Upload] Target folder ID: ${targetFolderId}`);
      }

      // Verify the folder
      const folderCheck = await drive.files.get({
        fileId: targetFolderId,
        fields: "id, name, parents",
      });
      console.log(
        `[Upload] Folder verification:`,
        JSON.stringify(folderCheck.data, null, 2),
      );
    } catch (folderError) {
      console.error("[Upload] Folder creation error:", folderError.message);
      if (folderError.response?.data) {
        console.error(
          "[Upload] API error details:",
          JSON.stringify(folderError.response.data, null, 2),
        );
      }
      return sendError(
        res,
        500,
        "Failed to create upload folder",
        folderError.message,
      );
    }

    // Upload files
    const uploadedFiles = [];
    const errors = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      console.log(
        `[Upload] File ${i + 1}/${fileList.length}: "${file.originalFilename}" (${fileSizeMB}MB, ${isVideo ? "VIDEO" : "IMAGE"})`,
      );

      try {
        const result = await uploadFileToDrive(
          drive,
          targetFolderId,
          file,
          i,
          fileList.length === 1 ? customFileName : null,
        );
        console.log(`[Upload] Upload successful: ${result.fileName}`);
        uploadedFiles.push(result);
      } catch (uploadError) {
        console.error(
          `[Upload] Upload failed for "${file.originalFilename}":`,
          uploadError.message,
        );
        if (uploadError.response?.data) {
          console.error(
            "[Upload] API error details:",
            JSON.stringify(uploadError.response.data, null, 2),
          );
        }
        errors.push({
          file: file.originalFilename || file.newFilename,
          error: uploadError.message,
          size: fileSizeMB,
        });
      } finally {
        // Clean up temp file
        if (file.filepath && fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      }
    }

    if (uploadedFiles.length === 0) {
      const errorMsg =
        errors.length > 0
          ? `Upload failed: ${errors.map((e) => e.error).join(", ")}`
          : "No files were uploaded successfully";
      return sendError(res, 500, errorMsg);
    }

    return sendSuccess(res, {
      folderId: targetFolderId,
      quotationId: quotationId || null,
      files: uploadedFiles,
      urls: uploadedFiles.map((f) => f.url),
      errors: errors.length > 0 ? errors : undefined,
    });
  },
  {
    methods: ["POST", "OPTIONS"],
    provideOAuthDrive: true,
    errorPrefix: "MediaUpload",
  },
);
