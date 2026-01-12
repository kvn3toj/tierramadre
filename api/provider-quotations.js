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

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { drive_v3 } from '@googleapis/drive';
import formidable from 'formidable';
import fs from 'fs';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'CotizacionesProveedor';
const COTIZACIONES_FOLDER_NAME = 'cotizaciones';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

function getCredentials() {
  return JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );
}

function getSheetsClient() {
  const auth = new GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return new sheets_v4.Sheets({ auth });
}

function getDriveClient() {
  const auth = new GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return new drive_v3.Drive({ auth });
}

function generateId() {
  return `QUO-${Date.now().toString(36).toUpperCase()}`;
}

// ============ MEDIA UPLOAD HELPERS ============

async function getOrCreateCotizacionesFolder(drive, parentFolderId) {
  const searchResponse = await drive.files.list({
    q: `name='${COTIZACIONES_FOLDER_NAME}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  const folder = await drive.files.create({
    resource: {
      name: COTIZACIONES_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return folder.data.id;
}

async function getOrCreateQuotationFolder(drive, cotizacionesFolderId, quotationId) {
  const searchResponse = await drive.files.list({
    q: `name='${quotationId}' and '${cotizacionesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  const folder = await drive.files.create({
    resource: {
      name: quotationId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [cotizacionesFolderId],
    },
    fields: 'id',
  });

  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return folder.data.id;
}

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
  });

  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    id: uploadedFile.data.id,
    url: `https://drive.google.com/uc?export=view&id=${uploadedFile.data.id}`,
    mimeType: file.mimetype,
  };
}

async function handleMediaUpload(req, res) {
  if (!process.env.GOOGLE_SHARED_DRIVE_ID) {
    return res.status(500).json({
      error: 'Google Drive folder not configured',
    });
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
    return res.status(400).json({ error: 'Missing quotationId' });
  }

  let fileList = files.file || files.files;
  if (!fileList) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  if (!Array.isArray(fileList)) {
    fileList = [fileList];
  }

  const drive = getDriveClient();
  const parentFolderId = process.env.GOOGLE_SHARED_DRIVE_ID.trim();

  const cotizacionesFolderId = await getOrCreateCotizacionesFolder(drive, parentFolderId);
  const quotationFolderId = await getOrCreateQuotationFolder(drive, cotizacionesFolderId, quotationId);

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
    return res.status(500).json({ error: 'No files were uploaded successfully' });
  }

  return res.status(200).json({
    success: true,
    quotationId,
    files: uploadedFiles,
    urls: uploadedFiles.map(f => f.url),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Google Service Account not configured',
    });
  }

  // Handle media upload: POST /api/provider-quotations?action=upload
  if (req.method === 'POST' && req.query.action === 'upload') {
    try {
      return await handleMediaUpload(req, res);
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Upload failed', message: error.message });
    }
  }

  try {
    const sheets = getSheetsClient();

    // Ensure sheet exists
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    if (!sheetNames.includes(SHEET_NAME)) {
      // Create sheet if it doesn't exist
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: SHEET_NAME },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A1:P1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'ID', 'ProveedorEmail', 'FechaCreacion', 'TipoProducto', 'Descripcion',
            'PesoCarates', 'Color', 'Calidad', 'PrecioCOP', 'Disponibilidad',
            'FotosUrls', 'SolicitudId', 'Estado', 'Notas', 'VistoAdmin', 'ProveedorNombre'
          ]],
        },
      });
    }

    // GET - Fetch quotations
    if (req.method === 'GET') {
      const { id, email, status, requestId } = req.query;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:P`,
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        return res.status(200).json({ success: true, quotations: [] });
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

      // Filter by ID
      if (id) {
        const quotation = quotations.find(q => q.id === id);
        return res.status(200).json({ success: true, quotation });
      }

      // Filter by provider email
      if (email) {
        quotations = quotations.filter(q => q.providerEmail === email);
      }

      // Filter by status
      if (status) {
        quotations = quotations.filter(q => q.status === status);
      }

      // Filter by request ID
      if (requestId) {
        quotations = quotations.filter(q => q.requestId === requestId);
      }

      // Sort by date descending
      quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.status(200).json({ success: true, quotations });
    }

    // POST - Create new quotation
    if (req.method === 'POST') {
      const {
        providerEmail,
        providerName,
        productType,
        description,
        weightCarats,
        color,
        quality,
        priceCOP,
        availability,
        photoUrls,
        requestId,
        notes,
      } = req.body;

      const quotationId = generateId();
      const newQuotation = [
        quotationId,
        providerEmail,
        new Date().toISOString(),
        productType,
        description,
        weightCarats,
        color,
        quality,
        priceCOP,
        availability,
        (photoUrls || []).join(','),
        requestId || '',
        'disponible',
        notes || '',
        'FALSE',
        providerName || '',
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:P`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [newQuotation],
        },
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
            // Update status to 'respondida' and add response ID
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

      return res.status(200).json({
        success: true,
        quotation: {
          id: quotationId,
          providerEmail,
          providerName,
          createdAt: newQuotation[2],
          productType,
          description,
          weightCarats,
          color,
          quality,
          priceCOP,
          availability,
          photoUrls: photoUrls || [],
          requestId,
          status: 'disponible',
          notes,
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
        return res.status(404).json({ success: false, error: 'Quotation not found' });
      }

      // Update status
      if (status) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!M${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[status]] },
        });
      }

      // Update viewedByAdmin
      if (viewedByAdmin !== undefined) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!O${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[viewedByAdmin ? 'TRUE' : 'FALSE']] },
        });
      }

      return res.status(200).json({ success: true });
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
        return res.status(404).json({ success: false, error: 'Quotation not found' });
      }

      // Mark as sold/unavailable instead of deleting
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!M${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['vendido']] },
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in provider-quotations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: error.message,
    });
  }
}
