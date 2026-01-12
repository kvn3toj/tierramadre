/**
 * Vercel Serverless Function - Quotation Requests CRUD
 *
 * Handles quotation requests from admin to providers.
 * Stored in Google Sheets "SolicitudesCotizacion" sheet.
 *
 * Sheet Schema:
 * A=ID, B=FechaCreacion, C=TipoProducto, D=PesoMin, E=PesoMax, F=ColorPreferencia,
 * G=CalidadPreferencia, H=PresupuestoMax, I=Notas, J=Estado, K=ProveedorAsignado,
 * L=RespuestaId, M=CreadoPor, N=FotosReferenciaUrls
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  initApi,
  sendError,
  sendSuccess,
  SPREADSHEET_ID,
  SHEETS,
  ensureSheet,
  generateId,
} from './_lib/index.js';

const SHEET_NAME = SHEETS.QUOTATION_REQUESTS;
const HEADERS = [
  'ID', 'FechaCreacion', 'TipoProducto', 'PesoMin', 'PesoMax',
  'ColorPreferencia', 'CalidadPreferencia', 'PresupuestoMax', 'Notas',
  'Estado', 'ProveedorAsignado', 'RespuestaId', 'CreadoPor', 'FotosReferenciaUrls'
];

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  try {
    const sheets = getSheetsClient();
    await ensureSheet(sheets, SHEET_NAME, HEADERS);

    // GET - Fetch requests
    if (req.method === 'GET') {
      const { id, status, email } = req.query;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:N`,
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
        notes: row[8] || '',
        status: row[9] || 'pendiente',
        assignedProvider: row[10] || '',
        responseId: row[11] || '',
        createdBy: row[12] || '',
        referencePhotoUrls: (row[13] || '').split(',').filter(Boolean),
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
        qualityPreference, budgetMax, notes, assignedProvider,
        createdBy, referencePhotoUrls,
      } = req.body;

      const newRequest = [
        generateId('REQ'),
        new Date().toISOString(),
        productType,
        weightMin,
        weightMax,
        colorPreference,
        qualityPreference,
        budgetMax,
        notes || '',
        'pendiente',
        assignedProvider || '',
        '',
        createdBy || '',
        (referencePhotoUrls || []).join(','),
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:N`,
        valueInputOption: 'RAW',
        requestBody: { values: [newRequest] },
      });

      return sendSuccess(res, {
        request: {
          id: newRequest[0],
          createdAt: newRequest[1],
          productType, weightMin, weightMax, colorPreference,
          qualityPreference, budgetMax, notes,
          status: 'pendiente',
          assignedProvider, createdBy,
          referencePhotoUrls: referencePhotoUrls || [],
        },
      });
    }

    // PATCH - Update request status
    if (req.method === 'PATCH') {
      const { id, status, responseId } = req.body;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:N`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);

      if (rowIndex === -1) {
        return sendError(res, 404, 'Request not found');
      }

      if (status) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!J${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[status]] },
        });
      }

      if (responseId) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!L${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[responseId]] },
        });
      }

      return sendSuccess(res, {});
    }

    // DELETE - Delete request
    if (req.method === 'DELETE') {
      const { id } = req.query;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:N`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);

      if (rowIndex === -1) {
        return sendError(res, 404, 'Request not found');
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!J${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['cancelada']] },
      });

      return sendSuccess(res, {});
    }

    return sendError(res, 405, 'Method not allowed');

  } catch (error) {
    console.error('Error in quotation-requests:', error);
    return sendError(res, 500, 'Failed to process request', error.message);
  }
}
