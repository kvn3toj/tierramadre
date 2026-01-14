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

async function uploadFileToDrive(drive, folderId, file, index) {
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

  const uploadedFile = await drive.files.create({
    resource: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.filepath),
    },
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  return {
    id: uploadedFile.data.id,
    url: `https://drive.google.com/uc?export=view&id=${uploadedFile.data.id}`,
    mimeType: file.mimetype,
  };
}

async function handleMediaUpload(req, res) {
  const sharedDriveId = getSharedDriveId();
  if (!sharedDriveId) {
    return sendError(res, 500, 'Google Drive folder not configured');
  }

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

  const cotizacionesFolderId = await getOrCreateFolder(drive, parentFolderId, DRIVE_FOLDERS.COTIZACIONES);
  const quotationFolderId = await getOrCreateFolder(drive, cotizacionesFolderId, quotationId);

  const uploadedFiles = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    try {
      const result = await uploadFileToDrive(drive, quotationFolderId, file, i);
      uploadedFiles.push(result);
    } catch (uploadError) {
      console.error(`Error uploading file ${i}:`, uploadError);
    } finally {
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    }
  }

  if (uploadedFiles.length === 0) {
    return sendError(res, 500, 'No files were uploaded successfully');
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
