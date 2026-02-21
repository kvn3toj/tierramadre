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
  withApiHandler,
  sendError,
  sendSuccess,
  setCacheHeaders,
  requireAdminEmail,
  APP_SPREADSHEET_ID,
  SHEETS,
  CACHE,
  ensureSheet,
} from './_lib/index.js';
import { sendNotificationEmail, EMAIL_TYPES, getAdminEmails } from './send-email.js';

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
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEETS.PRODUCT_REQUESTS}'!A:Y`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  // Notify admins about new product request
  const adminEmails = getAdminEmails();
  if (adminEmails.length > 0) {
    sendNotificationEmail(
      EMAIL_TYPES.PROVIDER_SUBMITTED_QUOTATION, // Reuse this template as generic "new request" notification
      {
        adminName: '',
        providerName: requesterName || requesterEmail.split('@')[0],
        providerEmail: requesterEmail,
        productType,
        description,
        weightCarats: `${weightMin || '?'} - ${weightMax || '?'}`,
        color: colorPreference || 'Flexible',
        quality: qualityPreference || 'Flexible',
        priceCOP: budgetMax || 0,
        quotationId: id,
        requestId: '',
      },
      adminEmails
    ).catch(err => console.error('[Email] Failed to send product request notification:', err));
  }

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
    spreadsheetId: APP_SPREADSHEET_ID,
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
  // Use case-insensitive comparison since email casing can vary
  if (email) {
    const emailLower = email.toLowerCase();
    requests = requests.filter(r => r.requesterEmail.toLowerCase() === emailLower);
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
    spreadsheetId: APP_SPREADSHEET_ID,
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
  const oldStatus = currentRow[20] || 'pendiente';

  // Extract request data for emails
  const requesterEmail = currentRow[2];
  const requesterName = currentRow[3] || requesterEmail?.split('@')[0] || 'Usuario';
  const requesterRole = currentRow[4] || 'asesor';
  const productType = currentRow[5] || 'Esmeralda';
  const description = currentRow[6] || '';
  const weightMin = currentRow[7];
  const weightMax = currentRow[8];
  const colorPreference = currentRow[9];
  const qualityPreference = currentRow[10];
  const budgetMin = currentRow[11];
  const budgetMax = currentRow[12];
  const quantity = currentRow[13];
  const clientName = currentRow[14];
  const priority = currentRow[16];
  const neededBy = currentRow[17];
  const notes = currentRow[18];

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
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEETS.PRODUCT_REQUESTS}'!A${rowIndex + 2}:Y${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  });

  // Send email notifications based on status change
  if (updates.status && updates.status !== oldStatus) {
    // Notify the requester about their request status change
    if (requesterEmail) {
      sendNotificationEmail(
        EMAIL_TYPES.PRODUCT_REQUEST_STATUS_UPDATE,
        {
          requesterName,
          requestId: id,
          productType,
          status: updates.status,
          adminResponse: updates.adminResponse || '',
          respondedBy: updates.respondedBy || '',
        },
        requesterEmail
      ).catch(err => console.error('[Email] Failed to send status update to requester:', err));
    }

    // If forwarded to provider, send email to provider
    if (updates.status === 'enviada_proveedor' && updates.providerEmail) {
      sendNotificationEmail(
        EMAIL_TYPES.PRODUCT_REQUEST_FORWARDED,
        {
          providerName: updates.providerEmail.split('@')[0],
          requesterName,
          requesterRole,
          productType,
          description,
          weightMin,
          weightMax,
          colorPreference,
          qualityPreference,
          budgetMin,
          budgetMax,
          quantity,
          clientName,
          priority,
          neededBy,
          notes,
          requestId: id,
        },
        updates.providerEmail
      ).catch(err => console.error('[Email] Failed to send forwarded notification to provider:', err));
    }
  }

  return { success: true, id, updated: true };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default withApiHandler(async (req, res, { sheets }) => {
  // Ensure product requests sheet exists
  await ensureSheet(sheets, SHEETS.PRODUCT_REQUESTS, PRODUCT_REQUEST_HEADERS, APP_SPREADSHEET_ID);

  // POST - Create new product request
  if (req.method === 'POST') {
    const result = await createProductRequest(sheets, req.body);
    return result.success
      ? sendSuccess(res, result)
      : sendError(res, 400, result.error);
  }

  // GET - List product requests
  // All-data view requires admin; filtered view (?email=) allows staff to see their own
  if (req.method === 'GET') {
    const { status, email } = req.query;
    if (!email && !requireAdminEmail(req, res)) return;
    setCacheHeaders(res, CACHE.SHORT);
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
}, { methods: ['GET', 'POST', 'PATCH', 'OPTIONS'], provideSheets: true, errorPrefix: 'ProductRequests' });
