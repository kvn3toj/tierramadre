/**
 * User Preferences, Feedback & Product Requests API
 *
 * Unified API for user preferences, feedback, and product requests management.
 *
 * Actions (via query param):
 * - prefs.get: Get user preferences (GET, ?userId=X)
 * - prefs.set: Save user preferences (POST)
 * - feedback.submit: Submit new feedback (POST)
 * - feedback.list: List all feedback (GET, optional ?status=X)
 * - feedback.update: Update feedback status (POST)
 * - product-request.create: Create product request from asesor/embajador (POST)
 * - product-request.list: List all product requests for admin (GET, optional ?status=X)
 * - product-request.my: Get requester's own requests (GET, ?email=X)
 * - product-request.update: Update request status by admin (POST)
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
// FEEDBACK CONFIGURATION
// =============================================================================

const FEEDBACK_HEADERS = [
  'id', 'timestamp', 'page', 'component', 'feature', 'category', 'priority',
  'severity', 'description', 'screenshot', 'highlightBox', 'deviceType',
  'browser', 'os', 'adminEmail', 'adminName', 'status', 'notes',
  'resolvedAt', 'version', 'environment'
];

function generateFeedbackId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FB-${datePart}-${randomPart}`;
}

function detectDevice(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  return 'Other';
}

function detectOS(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('win')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Other';
}

// =============================================================================
// USER PREFERENCES HANDLERS
// =============================================================================

async function getPreferences(sheets, userId) {
  if (!userId) {
    return { success: false, error: 'userId required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.USER_PREFERENCES}!A:B`,
  });

  const rows = response.data.values || [];
  const userRow = rows.find(row => row[0] === userId);

  if (userRow && userRow[1]) {
    try {
      const preferences = JSON.parse(userRow[1]);
      return { success: true, preferences };
    } catch {
      return { success: true, preferences: {} };
    }
  }

  return { success: true, preferences: {} };
}

async function setPreferences(sheets, userId, preferences) {
  if (!userId || !preferences) {
    return { success: false, error: 'userId and preferences required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.USER_PREFERENCES}!A:B`,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === userId);
  const prefsJson = JSON.stringify(preferences);

  if (rowIndex >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.USER_PREFERENCES}!A${rowIndex + 1}:B${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[userId, prefsJson]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.USER_PREFERENCES}!A:B`,
      valueInputOption: 'RAW',
      requestBody: { values: [[userId, prefsJson]] },
    });
  }

  return { success: true };
}

// =============================================================================
// PRODUCT REQUESTS CONFIGURATION
// =============================================================================

const PRODUCT_REQUEST_HEADERS = [
  'ID', 'FechaCreacion', 'RequesterEmail', 'RequesterName', 'RequesterRole',
  'TipoProducto', 'Descripcion', 'PesoMin', 'PesoMax', 'ColorPreferencia',
  'CalidadPreferencia', 'PresupuestoMin', 'PresupuestoMax', 'Cantidad',
  'ClienteNombre', 'ClienteNotas', 'Prioridad', 'FechaNecesaria', 'Notas',
  'FotosReferenciaUrls', 'Estado', 'AdminRespuesta', 'RespondidoPor',
  'FechaRespuesta', 'SolicitudCotizacionId'
];

function generateProductRequestId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PR-${datePart}-${randomPart}`;
}

// =============================================================================
// PRODUCT REQUESTS HANDLERS
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
// FEEDBACK HANDLERS
// =============================================================================

async function submitFeedback(sheets, body, headers) {
  const {
    page, component, feature, category, priority, severity,
    description, screenshot, highlightBox, adminEmail, adminName,
    version, environment,
  } = body;

  if (!description || !category) {
    return { success: false, error: 'description and category are required' };
  }

  const id = generateFeedbackId();
  const userAgent = headers['user-agent'] || '';

  // Store screenshot indicator only (base64 too large for sheets)
  const hasScreenshot = screenshot ? '[HAS_SCREENSHOT]' : '';

  const row = [
    id,
    new Date().toISOString(),
    page || '',
    component || '',
    feature || '',
    category,
    priority || 'medium',
    severity || '',
    description,
    hasScreenshot,
    highlightBox ? JSON.stringify(highlightBox) : '',
    detectDevice(userAgent),
    detectBrowser(userAgent),
    detectOS(userAgent),
    adminEmail || '',
    adminName || '',
    'open',
    '',
    '',
    version || '',
    environment || 'production',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:U`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { success: true, id, timestamp: row[1] };
}

async function listFeedback(sheets, status) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:U`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, data: [], total: 0 };
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  let feedback = dataRows.map((row, index) => {
    const item = {};
    headerRow.forEach((header, i) => {
      item[header] = row[i] || '';
    });
    item._rowIndex = index + 2; // Sheet row (1-indexed + header)
    item.hasScreenshot = item.screenshot === '[HAS_SCREENSHOT]';
    delete item.screenshot; // Don't send screenshot placeholder to client
    return item;
  });

  // Filter by status if provided
  if (status && status !== 'all') {
    feedback = feedback.filter(item => item.status === status);
  }

  // Sort by timestamp descending (newest first)
  feedback.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { success: true, data: feedback, total: feedback.length };
}

async function updateFeedback(sheets, id, updates) {
  if (!id) {
    return { success: false, error: 'id is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A:U`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: false, error: 'Feedback not found' };
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  // Find the row with matching ID
  const rowIndex = dataRows.findIndex(row => row[0] === id);
  if (rowIndex === -1) {
    return { success: false, error: 'Feedback not found' };
  }

  // Update the row
  const currentRow = dataRows[rowIndex];
  const updatedRow = [...currentRow];

  // Apply updates
  if (updates.status) {
    const statusIndex = headerRow.indexOf('status');
    if (statusIndex >= 0) updatedRow[statusIndex] = updates.status;

    // Set resolvedAt if status is resolved
    if (updates.status === 'resolved') {
      const resolvedAtIndex = headerRow.indexOf('resolvedAt');
      if (resolvedAtIndex >= 0) updatedRow[resolvedAtIndex] = new Date().toISOString();
    }
  }

  if (updates.notes !== undefined) {
    const notesIndex = headerRow.indexOf('notes');
    if (notesIndex >= 0) updatedRow[notesIndex] = updates.notes;
  }

  // Write back to sheet (rowIndex + 2 because of header and 1-indexing)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEETS.FEEDBACK}'!A${rowIndex + 2}:U${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  });

  return { success: true, id, updated: true };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  const action = req.query.action || req.body?.action || 'prefs.get';

  try {
    const sheets = getSheetsClient();

    // =========================
    // USER PREFERENCES
    // =========================

    // GET preferences
    if (req.method === 'GET' && (action === 'prefs.get' || req.query.userId)) {
      const result = await getPreferences(sheets, req.query.userId);
      return result.success ? sendSuccess(res, result) : sendError(res, 400, result.error);
    }

    // POST preferences
    if (req.method === 'POST' && action === 'prefs.set') {
      const result = await setPreferences(sheets, req.body.userId, req.body.preferences);
      return result.success ? sendSuccess(res, result) : sendError(res, 400, result.error);
    }

    // =========================
    // FEEDBACK
    // =========================

    // Ensure feedback sheet exists
    if (action.startsWith('feedback.')) {
      await ensureSheet(sheets, SHEETS.FEEDBACK, FEEDBACK_HEADERS);
    }

    // POST feedback submission
    if (req.method === 'POST' && action === 'feedback.submit') {
      const result = await submitFeedback(sheets, req.body, req.headers);
      return result.success
        ? res.status(200).json(result)
        : sendError(res, 400, result.error);
    }

    // GET feedback list
    if (req.method === 'GET' && action === 'feedback.list') {
      setCacheHeaders(res, CACHE.SHORT);
      const result = await listFeedback(sheets, req.query.status);
      return res.status(200).json(result);
    }

    // POST feedback update
    if (req.method === 'POST' && action === 'feedback.update') {
      const result = await updateFeedback(sheets, req.body.id, req.body);
      return result.success
        ? res.status(200).json(result)
        : sendError(res, 400, result.error);
    }

    // =========================
    // PRODUCT REQUESTS
    // =========================

    // Ensure product requests sheet exists
    if (action.startsWith('product-request.')) {
      await ensureSheet(sheets, SHEETS.PRODUCT_REQUESTS, PRODUCT_REQUEST_HEADERS);
    }

    // POST create product request
    if (req.method === 'POST' && action === 'product-request.create') {
      const result = await createProductRequest(sheets, req.body);
      return result.success
        ? res.status(200).json(result)
        : sendError(res, 400, result.error);
    }

    // GET list all product requests (admin)
    if (req.method === 'GET' && action === 'product-request.list') {
      setCacheHeaders(res, CACHE.SHORT);
      const result = await listProductRequests(sheets, req.query.status, null);
      return res.status(200).json(result);
    }

    // GET my product requests (asesor/embajador)
    if (req.method === 'GET' && action === 'product-request.my') {
      if (!req.query.email) {
        return sendError(res, 400, 'email is required');
      }
      setCacheHeaders(res, CACHE.SHORT);
      const result = await listProductRequests(sheets, req.query.status, req.query.email);
      return res.status(200).json(result);
    }

    // POST update product request (admin)
    if (req.method === 'POST' && action === 'product-request.update') {
      const result = await updateProductRequest(sheets, req.body.id, req.body);
      return result.success
        ? res.status(200).json(result)
        : sendError(res, 400, result.error);
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('User prefs/feedback API error:', error);
    return sendError(res, 500, error.message);
  }
}
