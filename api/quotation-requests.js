/**
 * Vercel Serverless Function - Quotation Requests CRUD
 *
 * Handles quotation requests from admin to providers.
 * Stored in Google Sheets "SolicitudesCotizacion" sheet.
 *
 * Sheet Schema:
 * A=ID, B=FechaCreacion, C=TipoProducto, D=PesoMin, E=PesoMax, F=ColorPreferencia,
 * G=CalidadPreferencia, H=PresupuestoMax, I=Cantidad, J=Notas, K=Estado, L=ProveedorAsignado,
 * M=RespuestaId, N=CreadoPor, O=FotosReferenciaUrls
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  requireAdminEmail,
  APP_SPREADSHEET_ID,
  SHEETS,
  ensureSheet,
  generateId,
} from './_lib/index.js';
import { sendNotificationEmail, EMAIL_TYPES, getProviderFromSheet } from './send-email.js';

const SHEET_NAME = SHEETS.QUOTATION_REQUESTS;
const HEADERS = [
  'ID', 'FechaCreacion', 'TipoProducto', 'PesoMin', 'PesoMax',
  'ColorPreferencia', 'CalidadPreferencia', 'PresupuestoMax', 'Cantidad', 'Notas',
  'Estado', 'ProveedorAsignado', 'RespuestaId', 'CreadoPor', 'FotosReferenciaUrls'
];

export default withApiHandler(async (req, res, { sheets }) => {
  await ensureSheet(sheets, SHEET_NAME, HEADERS, APP_SPREADSHEET_ID);

  // GET - Fetch requests (admin only)
  if (req.method === 'GET') {
    if (!requireAdminEmail(req, res)) return;
    const { id, status, email } = req.query;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:O`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return sendSuccess(res, { requests: [] });
    }

    let requests = rows.slice(1).map(row => ({
      id: row[0] || '',
      createdAt: row[1] || '',
      productType: row[2] || '',
      weightMin: parseFloat(row[3]) || 0,
      weightMax: parseFloat(row[4]) || 0,
      colorPreference: row[5] || '',
      qualityPreference: row[6] || '',
      budgetMax: parseFloat(row[7]) || 0,
      quantity: parseInt(row[8]) || 1,
      notes: row[9] || '',
      status: row[10] || 'pendiente',
      assignedProvider: row[11] || '',
      responseId: row[12] || '',
      createdBy: row[13] || '',
      referencePhotoUrls: (row[14] || '').split(',').filter(Boolean),
    }));

    if (id) {
      const request = requests.find(r => r.id === id);
      return sendSuccess(res, { request });
    }

    if (status) {
      requests = requests.filter(r => r.status === status);
    }

    if (email) {
      requests = requests.filter(r => !r.assignedProvider || r.assignedProvider === email);
    }

    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return sendSuccess(res, { requests });
  }

  // POST - Create new request
  if (req.method === 'POST') {
    const {
      productType, weightMin, weightMax, colorPreference,
      qualityPreference, budgetMax, quantity, notes, assignedProvider,
      createdBy, referencePhotoUrls,
    } = req.body;

    // Auto-lookup provider from Asesores sheet if not specified
    let providerEmail = assignedProvider;
    let providerName = assignedProvider ? assignedProvider.split('@')[0] : '';

    if (!providerEmail) {
      const provider = await getProviderFromSheet();
      if (provider) {
        providerEmail = provider.email;
        providerName = provider.name || provider.email.split('@')[0];
        console.log('[QuotationRequests] Auto-assigned provider:', providerEmail);
      }
    }

    const newRequest = [
      generateId('REQ'),
      new Date().toISOString(),
      productType,
      weightMin,
      weightMax,
      colorPreference,
      qualityPreference,
      budgetMax,
      quantity || 1,
      notes || '',
      'pendiente',
      providerEmail || '',
      '',
      createdBy || '',
      (referencePhotoUrls || []).join(','),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:O`,
      valueInputOption: 'RAW',
      requestBody: { values: [newRequest] },
    });

    // Send email notification to provider
    if (providerEmail) {
      sendNotificationEmail(
        EMAIL_TYPES.NEW_QUOTATION_REQUEST,
        {
          providerName,
          productType,
          weightMin,
          weightMax,
          colorPreference,
          qualityPreference,
          budgetMax,
          quantity: quantity || 1,
          notes,
          requestId: newRequest[0],
        },
        providerEmail
      ).catch(err => console.error('[Email] Failed to send new request notification:', err));
    }

    return sendSuccess(res, {
      request: {
        id: newRequest[0],
        createdAt: newRequest[1],
        productType, weightMin, weightMax, colorPreference,
        qualityPreference, budgetMax, quantity: quantity || 1, notes,
        status: 'pendiente',
        assignedProvider: providerEmail, createdBy,
        referencePhotoUrls: referencePhotoUrls || [],
      },
    });
  }

  // PATCH - Update request status
  if (req.method === 'PATCH') {
    const { id, status, responseId } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:O`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return sendError(res, 404, 'Request not found');
    }

    // K column = Estado (status)
    if (status) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: APP_SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!K${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[status]] },
      });
    }

    // M column = RespuestaId (responseId)
    if (responseId) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: APP_SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!M${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[responseId]] },
      });
    }

    return sendSuccess(res, {});
  }

  // DELETE - Delete request (marks as cancelled)
  if (req.method === 'DELETE') {
    const { id, reason } = req.query;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:O`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return sendError(res, 404, 'Request not found');
    }

    const row = rows[rowIndex];
    const assignedProvider = row[11];
    const productType = row[2];

    // K column = Estado (status)
    await sheets.spreadsheets.values.update({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!K${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['cancelada']] },
    });

    // Send cancellation email to provider if one was assigned
    if (assignedProvider) {
      sendNotificationEmail(
        EMAIL_TYPES.QUOTATION_REQUEST_CANCELLED,
        {
          providerName: assignedProvider.split('@')[0],
          requestId: id,
          productType,
          reason: reason || '',
        },
        assignedProvider
      ).catch(err => console.error('[Email] Failed to send cancellation notification:', err));
    }

    return sendSuccess(res, {});
  }

  return sendError(res, 405, 'Method not allowed');
}, { methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], provideSheets: true, errorPrefix: 'QuotationRequests' });
