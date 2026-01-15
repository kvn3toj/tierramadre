/**
 * Product Requests API
 *
 * Handles product requests from asesores/embajadores.
 * Stored in Google Sheets "SolicitudesProducto" sheet.
 *
 * Endpoints:
 * - POST /api/product-requests - Create new product request
 * - GET /api/product-requests - List all requests (admin) or ?email=X for user's requests
 * - PATCH /api/product-requests - Update request status (admin)
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  initApi,
  sendError,
  sendSuccess,
  setCacheHeaders,
  SPREADSHEET_ID,
  SHEETS,
  CACHE,
  ensureSheet,
} from './_lib/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const PRODUCT_REQUEST_HEADERS = [
  'ID', 'FechaCreacion', 'RequesterEmail', 'RequesterName', 'RequesterRole',
  'TipoProducto', 'Descripcion', 'PesoMin', 'PesoMax', 'ColorPreferencia',
  'CalidadPreferencia', 'PresupuestoMin', 'PresupuestoMax', 'Cantidad',
  'ClienteNombre', 'ClienteNotas', 'Prioridad', 'FechaNecesaria', 'Notas',
  'FotosReferenciaUrls', 'Estado', 'AdminRespuesta', 'RespondidoPor',
  'FechaRespuesta', 'SolicitudCotizacionId'
];

// =============================================================================
// HELPERS
// =============================================================================

function generateProductRequestId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PR-${datePart}-${randomPart}`;
}

// =============================================================================
// HANDLERS
// =============================================================================

async function createProductRequest(sheets, body) {
  const {
    requesterEmail, requesterName, requesterRole,
    productType, description, weightMin, weightMax,
    colorPreference, qualityPreference, budgetMin, budgetMax,
    quantity, clientName, clientNotes, priority, neededBy,
    notes, referencePhotoUrls,
  } = body;

  if (!requesterEmail || !productType || !description) {
    return { success: false, error: 'requesterEmail, productType, and description are required' };
  }

  const id = generateProductRequestId();
  const row = [
    id,
    new Date().toISOString(),
    requesterEmail,
    requesterName || '',
    requesterRole || 'asesor',
    productType,
    description,
    weightMin || 0,
    weightMax || 0,
    colorPreference || '',
    qualityPreference || '',
    budgetMin || 0,
    budgetMax || 0,
    quantity || 1,
    clientName || '',
    clientNotes || '',
    priority || 'normal',
    neededBy || '',
    notes || '',
    (referencePhotoUrls || []).join(','),
    'pendiente',
    '', // adminResponse
    '', // respondedBy
    '', // respondedAt
    '', // linkedQuotationId
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.PRODUCT_REQUESTS}'!A:Y`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return {
    success: true,
    request: {
      id,
      createdAt: row[1],
      requesterEmail,
      requesterName,
      requesterRole,
      productType,
      description,
      status: 'pendiente',
    },
  };
}

async function listProductRequests(sheets, status, email) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.PRODUCT_REQUESTS}'!A:Y`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, requests: [], total: 0 };
  }

  let requests = rows.slice(1).map((row, index) => ({
    id: row[0] || '',
    createdAt: row[1] || '',
    requesterEmail: row[2] || '',
    requesterName: row[3] || '',
    requesterRole: row[4] || 'asesor',
    productType: row[5] || '',
    description: row[6] || '',
    weightMin: parseFloat(row[7]) || 0,
    weightMax: parseFloat(row[8]) || 0,
    colorPreference: row[9] || '',
    qualityPreference: row[10] || '',
    budgetMin: parseFloat(row[11]) || 0,
    budgetMax: parseFloat(row[12]) || 0,
    quantity: parseInt(row[13]) || 1,
    clientName: row[14] || '',
    clientNotes: row[15] || '',
    priority: row[16] || 'normal',
    neededBy: row[17] || '',
    notes: row[18] || '',
    referencePhotoUrls: (row[19] || '').split(',').filter(Boolean),
    status: row[20] || 'pendiente',
    adminResponse: row[21] || '',
    respondedBy: row[22] || '',
    respondedAt: row[23] || '',
    linkedQuotationId: row[24] || '',
    _rowIndex: index + 2,
  }));

  // Filter by email if provided (for "my requests")
  if (email) {
    requests = requests.filter(r => r.requesterEmail === email);
  }

  // Filter by status if provided
  if (status && status !== 'all') {
    requests = requests.filter(r => r.status === status);
  }

  // Sort by date descending
  requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { success: true, requests, total: requests.length };
}

async function updateProductRequest(sheets, id, updates) {
  if (!id) {
    return { success: false, error: 'id is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.PRODUCT_REQUESTS}'!A:Y`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: false, error: 'Request not found' };
  }

  const rowIndex = rows.slice(1).findIndex(row => row[0] === id);
  if (rowIndex === -1) {
    return { success: false, error: 'Request not found' };
  }

  const currentRow = rows[rowIndex + 1];
  const updatedRow = [...currentRow];

  // Ensure row has enough columns
  while (updatedRow.length < 25) {
    updatedRow.push('');
  }

  // Apply updates
  if (updates.status) {
    updatedRow[20] = updates.status;
  }
  if (updates.adminResponse !== undefined) {
    updatedRow[21] = updates.adminResponse;
  }
  if (updates.respondedBy) {
    updatedRow[22] = updates.respondedBy;
    updatedRow[23] = new Date().toISOString();
  }
  if (updates.linkedQuotationId) {
    updatedRow[24] = updates.linkedQuotationId;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.PRODUCT_REQUESTS}'!A${rowIndex + 2}:Y${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  });

  return { success: true, id, updated: true };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'PATCH', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  try {
    const sheets = getSheetsClient();

    // Ensure product requests sheet exists
    await ensureSheet(sheets, SHEETS.PRODUCT_REQUESTS, PRODUCT_REQUEST_HEADERS);

    // POST - Create new product request
    if (req.method === 'POST') {
      const result = await createProductRequest(sheets, req.body);
      return result.success
        ? sendSuccess(res, result)
        : sendError(res, 400, result.error);
    }

    // GET - List product requests
    if (req.method === 'GET') {
      setCacheHeaders(res, CACHE.SHORT);
      const { status, email } = req.query;
      const result = await listProductRequests(sheets, status, email);
      return sendSuccess(res, result);
    }

    // PATCH - Update product request
    if (req.method === 'PATCH') {
      const result = await updateProductRequest(sheets, req.body.id, req.body);
      return result.success
        ? sendSuccess(res, result)
        : sendError(res, 400, result.error);
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('Product Requests API error:', error);
    return sendError(res, 500, error.message);
  }
}
