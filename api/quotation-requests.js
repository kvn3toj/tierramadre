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

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'SolicitudesCotizacion';

function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return new sheets_v4.Sheets({ auth });
}

function generateId() {
  return `REQ-${Date.now().toString(36).toUpperCase()}`;
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
        range: `'${SHEET_NAME}'!A1:N1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'ID', 'FechaCreacion', 'TipoProducto', 'PesoMin', 'PesoMax',
            'ColorPreferencia', 'CalidadPreferencia', 'PresupuestoMax', 'Notas',
            'Estado', 'ProveedorAsignado', 'RespuestaId', 'CreadoPor', 'FotosReferenciaUrls'
          ]],
        },
      });
    }

    // GET - Fetch requests
    if (req.method === 'GET') {
      const { id, status, email } = req.query;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:N`,
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        return res.status(200).json({ success: true, requests: [] });
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

      // Filter by ID if provided
      if (id) {
        const request = requests.find(r => r.id === id);
        return res.status(200).json({ success: true, request });
      }

      // Filter by status
      if (status) {
        requests = requests.filter(r => r.status === status);
      }

      // Filter by assigned provider email
      if (email) {
        requests = requests.filter(r => !r.assignedProvider || r.assignedProvider === email);
      }

      // Sort by date descending
      requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.status(200).json({ success: true, requests });
    }

    // POST - Create new request
    if (req.method === 'POST') {
      const {
        productType,
        weightMin,
        weightMax,
        colorPreference,
        qualityPreference,
        budgetMax,
        notes,
        assignedProvider,
        createdBy,
        referencePhotoUrls,
      } = req.body;

      const newRequest = [
        generateId(),
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
        requestBody: {
          values: [newRequest],
        },
      });

      return res.status(200).json({
        success: true,
        request: {
          id: newRequest[0],
          createdAt: newRequest[1],
          productType,
          weightMin,
          weightMax,
          colorPreference,
          qualityPreference,
          budgetMax,
          notes,
          status: 'pendiente',
          assignedProvider,
          createdBy,
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
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      // Update status and/or responseId
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

      return res.status(200).json({ success: true });
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
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      // Clear the row (or mark as deleted)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!J${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['cancelada']] },
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in quotation-requests:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: error.message,
    });
  }
}
