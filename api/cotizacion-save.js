/**
 * Cotización Save API
 *
 * Saves cotización images to Google Drive and metadata to Google Sheets.
 * Each asesor has their own folder: TM-Studio/cotizaciones/asesores/{email}/
 *
 * Endpoints:
 * - POST /api/cotizacion-save - Save cotización image + metadata
 * - GET /api/cotizacion-save?email={email} - Get cotizaciones for an asesor
 * - GET /api/cotizacion-save?action=stats - Get aggregate cotización statistics
 * - DELETE /api/cotizacion-save?id={id}&email={email} - Delete a cotización
 */

import { Readable } from 'stream';
import {
  SPREADSHEET_ID,
  setCorsHeaders,
  handleOptions,
  sendError,
  sendSuccess,
  getSharedDriveId,
  getSheetsClient,
} from './_lib/index.js';

import {
  isOAuthConfigured,
  getOAuthDriveClient,
} from './_lib/oauth-drive-client.js';

// Sheet name for cotización metadata
const COTIZACIONES_SHEET = 'CotizacionesAsesores';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get or create the asesores cotizaciones folder structure
 * TM-Studio/cotizaciones/asesores/{email}/
 */
async function getAsesorCotizacionesFolder(drive, sharedDriveId, asesorEmail) {
  // Sanitize email for folder name
  const sanitizedEmail = asesorEmail.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '_');

  // Find or create cotizaciones folder
  let cotizacionesFolderId;
  const cotizacionesQuery = await drive.files.list({
    q: `name = 'cotizaciones' and '${sharedDriveId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (cotizacionesQuery.data.files?.length > 0) {
    cotizacionesFolderId = cotizacionesQuery.data.files[0].id;
  } else {
    // Create cotizaciones folder
    const folder = await drive.files.create({
      requestBody: {
        name: 'cotizaciones',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [sharedDriveId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    cotizacionesFolderId = folder.data.id;
  }

  // Find or create asesores subfolder
  let asesoresFolderId;
  const asesoresQuery = await drive.files.list({
    q: `name = 'asesores' and '${cotizacionesFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (asesoresQuery.data.files?.length > 0) {
    asesoresFolderId = asesoresQuery.data.files[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: 'asesores',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [cotizacionesFolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    asesoresFolderId = folder.data.id;
  }

  // Find or create asesor's personal folder
  let asesorFolderId;
  const asesorQuery = await drive.files.list({
    q: `name = '${sanitizedEmail}' and '${asesoresFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (asesorQuery.data.files?.length > 0) {
    asesorFolderId = asesorQuery.data.files[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: sanitizedEmail,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [asesoresFolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    asesorFolderId = folder.data.id;
  }

  return asesorFolderId;
}

/**
 * Upload base64 image to Drive
 */
async function uploadImageToDrive(drive, folderId, imageBase64, quotationNumber) {
  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const fileName = `${quotationNumber}.png`;

  const uploadedFile = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: 'image/png',
      body: Readable.from(buffer),
    },
    fields: 'id, name, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  // Make file viewable
  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return {
    fileId: uploadedFile.data.id,
    fileName: uploadedFile.data.name,
    viewUrl: uploadedFile.data.webViewLink,
    downloadUrl: uploadedFile.data.webContentLink,
    proxyUrl: `/api/serve-drive-image?fileId=${uploadedFile.data.id}`,
  };
}

/**
 * Ensure the cotizaciones sheet exists with headers
 */
async function ensureCotizacionesSheet(sheets) {
  try {
    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetExists = spreadsheet.data.sheets?.some(
      s => s.properties?.title === COTIZACIONES_SHEET
    );

    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: COTIZACIONES_SHEET,
              },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${COTIZACIONES_SHEET}!A1:L1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'ID',
            'QuotationNumber',
            'AsesorEmail',
            'AsesorName',
            'ClientName',
            'ClientPhone',
            'ProductsCount',
            'Total',
            'ImageUrl',
            'DriveFileId',
            'CreatedAt',
            'ExpiryDate',
          ]],
        },
      });

      console.log('[CotizacionSave] Created CotizacionesAsesores sheet');
    }

    return true;
  } catch (error) {
    console.error('[CotizacionSave] Error ensuring sheet:', error);
    throw error;
  }
}

/**
 * Save cotización metadata to sheet
 */
async function saveCotizacionToSheet(sheets, data) {
  await ensureCotizacionesSheet(sheets);

  const id = `cot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const row = [
    id,
    data.quotationNumber,
    data.asesorEmail,
    data.asesorName,
    data.clientName,
    data.clientPhone || '',
    data.productsCount,
    data.total,
    data.imageUrl,
    data.driveFileId,
    new Date().toISOString(),
    data.expiryDate || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${COTIZACIONES_SHEET}!A:L`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });

  return id;
}

/**
 * Get cotizaciones for an asesor
 */
async function getCotizacionesByAsesor(sheets, asesorEmail) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COTIZACIONES_SHEET}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return []; // Only headers or empty

    const normalizedEmail = asesorEmail.toLowerCase().trim();

    // Skip header row, filter by email
    const cotizaciones = rows.slice(1)
      .filter(row => row[2]?.toLowerCase().trim() === normalizedEmail)
      .map(row => ({
        id: row[0],
        quotationNumber: row[1],
        asesorEmail: row[2],
        asesorName: row[3],
        clientName: row[4],
        clientPhone: row[5],
        productsCount: parseInt(row[6]) || 0,
        total: parseFloat(row[7]) || 0,
        imageUrl: row[8],
        driveFileId: row[9],
        createdAt: row[10],
        expiryDate: row[11],
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Most recent first

    return cotizaciones;
  } catch (error) {
    // Sheet might not exist yet
    if (error.code === 400 || error.message?.includes('Unable to parse range')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get aggregate cotización statistics
 */
async function getCotizacionStats(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COTIZACIONES_SHEET}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return {
        totalCotizaciones: 0,
        totalValue: 0,
        todayCotizaciones: 0,
        weekCotizaciones: 0,
        uniqueAsesores: 0,
        uniqueClients: 0,
        topAsesores: [],
        recentCotizaciones: [],
      };
    }

    const dataRows = rows.slice(1).filter(row => row[0]); // Skip header, filter empty rows
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - (7 * 24 * 60 * 60 * 1000);

    let totalValue = 0;
    let todayCotizaciones = 0;
    let weekCotizaciones = 0;
    const asesorCounts = {};
    const clientSet = new Set();

    for (const row of dataRows) {
      const asesorEmail = row[2] || '';
      const clientName = row[4] || '';
      const total = parseFloat(row[7]) || 0;
      const createdAt = row[10] ? new Date(row[10]).getTime() : 0;

      totalValue += total;

      if (createdAt >= todayStart) todayCotizaciones++;
      if (createdAt >= weekStart) weekCotizaciones++;

      if (asesorEmail) {
        asesorCounts[asesorEmail] = (asesorCounts[asesorEmail] || 0) + 1;
      }

      if (clientName) {
        clientSet.add(clientName.toLowerCase().trim());
      }
    }

    // Top asesores by count
    const topAsesores = Object.entries(asesorCounts)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent cotizaciones
    const recentCotizaciones = dataRows
      .map(row => ({
        id: row[0],
        quotationNumber: row[1],
        asesorEmail: row[2],
        asesorName: row[3],
        clientName: row[4],
        productsCount: parseInt(row[6]) || 0,
        total: parseFloat(row[7]) || 0,
        createdAt: row[10],
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    return {
      totalCotizaciones: dataRows.length,
      totalValue,
      todayCotizaciones,
      weekCotizaciones,
      uniqueAsesores: Object.keys(asesorCounts).length,
      uniqueClients: clientSet.size,
      topAsesores,
      recentCotizaciones,
    };
  } catch (error) {
    // Sheet might not exist yet
    if (error.code === 400 || error.message?.includes('Unable to parse range')) {
      return {
        totalCotizaciones: 0,
        totalValue: 0,
        todayCotizaciones: 0,
        weekCotizaciones: 0,
        uniqueAsesores: 0,
        uniqueClients: 0,
        topAsesores: [],
        recentCotizaciones: [],
      };
    }
    throw error;
  }
}

/**
 * Delete a cotización
 */
async function deleteCotizacion(drive, sheets, cotizacionId, asesorEmail) {
  // Get all rows to find the one to delete
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${COTIZACIONES_SHEET}!A:L`,
  });

  const rows = response.data.values || [];
  const normalizedEmail = asesorEmail.toLowerCase().trim();

  // Find the row index (1-based for sheets)
  let rowIndex = -1;
  let driveFileId = null;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === cotizacionId && rows[i][2]?.toLowerCase().trim() === normalizedEmail) {
      rowIndex = i + 1; // 1-based
      driveFileId = rows[i][9];
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error('Cotización not found or not owned by this asesor');
  }

  // Delete from Drive
  if (driveFileId) {
    try {
      await drive.files.delete({
        fileId: driveFileId,
        supportsAllDrives: true,
      });
    } catch (error) {
      console.warn('[CotizacionSave] Could not delete Drive file:', error.message);
    }
  }

  // Delete from Sheet (clear the row)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${COTIZACIONES_SHEET}!A${rowIndex}:L${rowIndex}`,
  });

  return true;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (handleOptions(req, res)) return;

  // Check OAuth configuration
  if (!isOAuthConfigured()) {
    return sendError(res, 500, 'OAuth not configured');
  }

  try {
    const drive = await getOAuthDriveClient();
    const sharedDriveId = getSharedDriveId();

    // Get sheets client using Service Account (OAuth is only for Drive)
    const sheets = getSheetsClient(false); // false = read-write access

    // ==========================================================================
    // GET - Fetch cotizaciones for an asesor or aggregate stats
    // ==========================================================================
    if (req.method === 'GET') {
      const { email, action } = req.query;

      // Stats endpoint for analytics dashboard
      if (action === 'stats') {
        const stats = await getCotizacionStats(sheets);
        return sendSuccess(res, stats);
      }

      // Asesor-specific cotizaciones
      if (!email) {
        return sendError(res, 400, 'Email parameter required');
      }

      const cotizaciones = await getCotizacionesByAsesor(sheets, email);

      return sendSuccess(res, {
        cotizaciones,
        count: cotizaciones.length,
      });
    }

    // ==========================================================================
    // POST - Save a new cotización
    // ==========================================================================
    if (req.method === 'POST') {
      const {
        quotationNumber,
        asesorEmail,
        asesorName,
        clientName,
        clientPhone,
        productsCount,
        total,
        expiryDate,
        imageBase64,
      } = req.body;

      // Validate required fields
      if (!quotationNumber || !asesorEmail || !asesorName || !imageBase64) {
        return sendError(res, 400, 'Missing required fields: quotationNumber, asesorEmail, asesorName, imageBase64');
      }

      // Get or create asesor's folder
      const asesorFolderId = await getAsesorCotizacionesFolder(drive, sharedDriveId, asesorEmail);

      // Upload image
      const uploadResult = await uploadImageToDrive(drive, asesorFolderId, imageBase64, quotationNumber);

      // Save metadata to sheet
      const cotizacionId = await saveCotizacionToSheet(sheets, {
        quotationNumber,
        asesorEmail,
        asesorName,
        clientName: clientName || '',
        clientPhone: clientPhone || '',
        productsCount: productsCount || 0,
        total: total || 0,
        expiryDate: expiryDate || '',
        imageUrl: uploadResult.proxyUrl,
        driveFileId: uploadResult.fileId,
      });

      return sendSuccess(res, {
        id: cotizacionId,
        quotationNumber,
        imageUrl: uploadResult.proxyUrl,
        driveFileId: uploadResult.fileId,
      }, 201);
    }

    // ==========================================================================
    // DELETE - Delete a cotización
    // ==========================================================================
    if (req.method === 'DELETE') {
      const { id, email } = req.query;

      if (!id || !email) {
        return sendError(res, 400, 'ID and email parameters required');
      }

      await deleteCotizacion(drive, sheets, id, email);

      return sendSuccess(res, { deleted: true });
    }

    return sendError(res, 405, 'Method not allowed');

  } catch (error) {
    console.error('[CotizacionSave] Error:', error);
    return sendError(res, 500, error.message || 'Internal server error');
  }
}
