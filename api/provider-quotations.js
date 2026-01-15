/**
 * Vercel Serverless Function - Provider Quotations CRUD + Media Upload
 *
 * Handles quotations submitted by providers.
 * Stored in Google Sheets "CotizacionesProveedor" sheet.
 *
 * Also handles media uploads for both provider quotations and admin requests.
 * Use ?action=upload for file uploads (multipart/form-data).
 *
 * Sheet Schema:
 * A=ID, B=ProveedorEmail, C=FechaCreacion, D=TipoProducto, E=Descripcion,
 * F=PesoCarates, G=Color, H=Calidad, I=PrecioCOP, J=Disponibilidad,
 * K=FotosUrls, L=SolicitudId, M=Estado, N=Notas, O=VistoAdmin, P=ProveedorNombre
 */

import formidable from 'formidable';
import fs from 'fs';

import {
  getSheetsClient,
  getDriveClient,
  isGoogleConfigured,
  getSharedDriveId,
  setCorsHeaders,
  handleOptions,
  sendError,
  sendSuccess,
  SPREADSHEET_ID,
  SHEETS,
  DRIVE_FOLDERS,
  ensureSheet,
  generateId,
  getOrCreateFolder,
} from './_lib/index.js';

const SHEET_NAME = SHEETS.PROVIDER_QUOTATIONS;
const HEADERS = [
  'ID', 'ProveedorEmail', 'FechaCreacion', 'TipoProducto', 'Descripcion',
  'PesoCarates', 'Color', 'Calidad', 'PrecioCOP', 'Disponibilidad',
  'FotosUrls', 'SolicitudId', 'Estado', 'Notas', 'VistoAdmin', 'ProveedorNombre'
];

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// ============ MEDIA UPLOAD HELPERS ============

// Supported media types
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

async function uploadFileToDrive(drive, folderId, file, index, sharedDriveId = null) {
  const originalName = file.originalFilename || file.newFilename || 'upload';

  const fileExtension = originalName.includes('.')
    ? originalName.split('.').pop()
    : (SUPPORTED_MIME_TYPES[file.mimetype] || 'bin');

  const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
  const prefix = isVideo ? 'video' : 'image';
  const fileName = `${prefix}-${index + 1}-${Date.now()}.${fileExtension}`;

  // Upload file to Drive - request thumbnailLink for videos
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

    console.log(`[uploadFileToDrive] ✓ Upload successful. File ID: ${uploadedFile.data.id}`);
  } catch (uploadError) {
    console.error(`[uploadFileToDrive] ✗ Upload failed:`, uploadError.message);
    if (uploadError.response?.data?.error) {
      console.error(`[uploadFileToDrive] API Error Details:`, JSON.stringify(uploadError.response.data.error, null, 2));
    }
    throw uploadError;
  }

  // Only set public permissions for non-Shared Drive files
  // Shared Drive files inherit permissions from the drive
  if (!sharedDriveId) {
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
  }

  const fileId = uploadedFile.data.id;

  // Build response with appropriate URLs
  const result = {
    id: fileId,
    mimeType: file.mimetype,
    isVideo,
    fileName,
  };

  if (isVideo) {
    // For videos: provide preview URL and thumbnail
    result.url = `https://drive.google.com/file/d/${fileId}/preview`;
    result.videoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    // Use Drive's auto-generated thumbnail for video poster
    result.thumbnailUrl = uploadedFile.data.thumbnailLink ||
      `/api/serve-drive-image?fileId=${fileId}&thumbnail=true`;
  } else {
    // For images: provide direct view URL
    result.url = `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  return result;
}

async function handleMediaUpload(req, res) {
  const sharedDriveId = getSharedDriveId();
  if (!sharedDriveId) {
    return sendError(res, 500, 'Google Drive folder not configured');
  }

  // Note: sharedDriveId can be either:
  // 1. A Shared Drive ID (recommended)
  // 2. A regular folder ID that's been shared with the Service Account (works if owner has quota)
  // The folder creation and uploads will work as long as the Service Account has write permissions

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

  const drive = getDriveClient(false);
  const parentFolderId = sharedDriveId;

  console.log(`[Upload] Starting upload for quotation: ${quotationId}`);
  console.log(`[Upload] Parent folder ID: ${parentFolderId}`);

  // Determine if we're using a Shared Drive
  let driveIdParam = null;

  // First, try to check if the parentFolderId IS a Shared Drive (not a folder inside one)
  try {
    await drive.drives.get({
      driveId: parentFolderId,
      fields: 'id, name'
    });
    // If this succeeds, parentFolderId is a Shared Drive ID
    driveIdParam = parentFolderId;
    console.log(`[Upload] Parent is a Shared Drive root: ${driveIdParam}`);
  } catch (driveRootCheckError) {
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
        console.log(`[Upload] WARNING: Using regular My Drive folder - large uploads may fail due to Service Account quota!`);
      }
    } catch (folderCheckError) {
      console.error(`[Upload] Could not determine Drive type:`, folderCheckError.message);
      console.log(`[Upload] WARNING: Proceeding without Shared Drive context - uploads may fail!`);
    }
  }

  let cotizacionesFolderId, quotationFolderId;
  try {
    console.log(`[Upload] Looking for/creating cotizaciones folder in: ${parentFolderId}`);
    cotizacionesFolderId = await getOrCreateFolder(drive, parentFolderId, DRIVE_FOLDERS.COTIZACIONES, driveIdParam);
    console.log(`[Upload] Cotizaciones folder ID: ${cotizacionesFolderId}`);

    console.log(`[Upload] Looking for/creating quotation folder: ${quotationId}`);
    quotationFolderId = await getOrCreateFolder(drive, cotizacionesFolderId, quotationId, driveIdParam);
    console.log(`[Upload] Quotation folder ID: ${quotationFolderId}`);

    // Verify the created folder is in the Shared Drive
    const folderCheck = await drive.files.get({
      fileId: quotationFolderId,
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

  const uploadedFiles = [];
  const errors = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    console.log(`[Upload] File ${i + 1}/${fileList.length}: "${file.originalFilename}" (${fileSizeMB}MB, ${isVideo ? 'VIDEO' : 'IMAGE'})`);

    try {
      const result = await uploadFileToDrive(drive, quotationFolderId, file, i, driveIdParam);
      console.log(`[Upload] ✓ Upload successful: ${result.fileName}`);
      uploadedFiles.push(result);
    } catch (uploadError) {
      console.error(`[Upload] ✗ Upload failed for "${file.originalFilename}":`, uploadError.message);
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
    quotationId,
    files: uploadedFiles,
    urls: uploadedFiles.map(f => f.url),
  });
}

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);

  if (handleOptions(req, res)) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  // Diagnostic endpoint: GET /api/provider-quotations?action=check-drive
  if (req.method === 'GET' && req.query.action === 'check-drive') {
    try {
      const sharedDriveId = getSharedDriveId();
      const drive = getDriveClient(false);

      let driveInfo = null;
      let isSharedDrive = false;
      let folderInfo = null;

      // First, try to access as a Shared Drive
      try {
        const driveResponse = await drive.drives.get({
          driveId: sharedDriveId,
          fields: 'id, name, capabilities',
        });
        driveInfo = driveResponse.data;
        isSharedDrive = true;
      } catch {
        // Not a Shared Drive, try as a regular folder
        try {
          const folderResponse = await drive.files.get({
            fileId: sharedDriveId,
            fields: 'id, name, mimeType, capabilities, parents',
            supportsAllDrives: true,
          });
          folderInfo = folderResponse.data;
        } catch (folderErr) {
          return sendError(res, 500, 'Cannot access Drive ID', `ID ${sharedDriveId} is neither a Shared Drive nor an accessible folder: ${folderErr.message}`);
        }
      }

      // Check if cotizaciones folder exists
      const cotizacionesSearch = await drive.files.list({
        q: `name='${DRIVE_FOLDERS.COTIZACIONES}' and '${sharedDriveId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        ...(isSharedDrive && { driveId: sharedDriveId, corpora: 'drive' }),
      });

      return sendSuccess(res, {
        configuredId: sharedDriveId,
        isSharedDrive,
        driveInfo,
        folderInfo,
        cotizacionesFolder: cotizacionesSearch.data.files?.[0] || null,
        folderNameExpected: DRIVE_FOLDERS.COTIZACIONES,
      });
    } catch (error) {
      console.error('Drive check error:', error);
      return sendError(res, 500, 'Drive check failed', error.message);
    }
  }

  // Handle media upload: POST /api/provider-quotations?action=upload
  if (req.method === 'POST' && req.query.action === 'upload') {
    try {
      return await handleMediaUpload(req, res);
    } catch (error) {
      console.error('Upload error:', error);
      return sendError(res, 500, 'Upload failed', error.message);
    }
  }

  try {
    const sheets = getSheetsClient();
    await ensureSheet(sheets, SHEET_NAME, HEADERS);

    // GET - Fetch quotations
    if (req.method === 'GET') {
      const { id, email, status, requestId } = req.query;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:P`,
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        return sendSuccess(res, { quotations: [] });
      }

      let quotations = rows.slice(1).map(row => ({
        id: row[0] || '',
        providerEmail: row[1] || '',
        createdAt: row[2] || '',
        productType: row[3] || '',
        description: row[4] || '',
        weightCarats: parseFloat(row[5]) || 0,
        color: row[6] || '',
        quality: row[7] || '',
        priceCOP: parseFloat(row[8]) || 0,
        availability: parseInt(row[9]) || 0,
        photoUrls: (row[10] || '').split(',').filter(Boolean),
        requestId: row[11] || '',
        status: row[12] || 'disponible',
        notes: row[13] || '',
        viewedByAdmin: row[14] === 'TRUE',
        providerName: row[15] || '',
      }));

      if (id) {
        const quotation = quotations.find(q => q.id === id);
        return sendSuccess(res, { quotation });
      }

      if (email) {
        quotations = quotations.filter(q => q.providerEmail === email);
      }

      if (status) {
        quotations = quotations.filter(q => q.status === status);
      }

      if (requestId) {
        quotations = quotations.filter(q => q.requestId === requestId);
      }

      quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return sendSuccess(res, { quotations });
    }

    // POST - Create new quotation
    if (req.method === 'POST') {
      const {
        providerEmail, providerName, productType, description,
        weightCarats, color, quality, priceCOP, availability,
        photoUrls, requestId, notes,
      } = req.body;

      const quotationId = generateId('QUO');
      const newQuotation = [
        quotationId, providerEmail, new Date().toISOString(),
        productType, description, weightCarats, color, quality,
        priceCOP, availability, (photoUrls || []).join(','),
        requestId || '', 'disponible', notes || '', 'FALSE', providerName || '',
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:P`,
        valueInputOption: 'RAW',
        requestBody: { values: [newQuotation] },
      });

      // If responding to a request, update the request status
      if (requestId) {
        try {
          const reqResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'SolicitudesCotizacion'!A:M`,
          });

          const reqRows = reqResponse.data.values || [];
          const reqRowIndex = reqRows.findIndex(row => row[0] === requestId);

          if (reqRowIndex > 0) {
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `'SolicitudesCotizacion'!J${reqRowIndex + 1}:L${reqRowIndex + 1}`,
              valueInputOption: 'RAW',
              requestBody: { values: [['respondida', '', quotationId]] },
            });
          }
        } catch (err) {
          console.error('Error updating request status:', err);
        }
      }

      return sendSuccess(res, {
        quotation: {
          id: quotationId,
          providerEmail, providerName,
          createdAt: newQuotation[2],
          productType, description, weightCarats, color, quality,
          priceCOP, availability,
          photoUrls: photoUrls || [],
          requestId, status: 'disponible', notes,
          viewedByAdmin: false,
        },
      });
    }

    // PATCH - Update quotation
    if (req.method === 'PATCH') {
      const { id, status, viewedByAdmin } = req.body;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:P`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);

      if (rowIndex === -1) {
        return sendError(res, 404, 'Quotation not found');
      }

      if (status) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!M${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[status]] },
        });
      }

      if (viewedByAdmin !== undefined) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!O${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[viewedByAdmin ? 'TRUE' : 'FALSE']] },
        });
      }

      return sendSuccess(res, {});
    }

    // DELETE - Delete quotation
    if (req.method === 'DELETE') {
      const { id } = req.query;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:P`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);

      if (rowIndex === -1) {
        return sendError(res, 404, 'Quotation not found');
      }

      // Mark as sold/unavailable instead of deleting
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!M${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['vendido']] },
      });

      return sendSuccess(res, {});
    }

    return sendError(res, 405, 'Method not allowed');

  } catch (error) {
    console.error('Error in provider-quotations:', error);
    return sendError(res, 500, 'Failed to process request', error.message);
  }
}
