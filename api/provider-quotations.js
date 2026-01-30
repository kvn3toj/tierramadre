/**
 * Provider Quotations API
 *
 * Handles CRUD operations for quotations submitted by providers.
 * Stored in Google Sheets "CotizacionesProveedor" sheet.
 *
 * Endpoints:
 * - GET /api/provider-quotations - List quotations (optional filters: email, status, requestId, id)
 * - POST /api/provider-quotations - Create new quotation
 * - PATCH /api/provider-quotations - Update quotation status
 * - DELETE /api/provider-quotations?id=X - Mark quotation as sold
 *
 * Note: Media uploads have been moved to /api/media-upload
 * For backward compatibility, ?action=upload redirects to the new endpoint.
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  SPREADSHEET_ID,
  SHEETS,
  ensureSheet,
  generateId,
} from './_lib/index.js';
import { sendNotificationEmail, EMAIL_TYPES, getAdminEmails } from './send-email.js';

const SHEET_NAME = SHEETS.PROVIDER_QUOTATIONS;
const HEADERS = [
  'ID', 'ProveedorEmail', 'FechaCreacion', 'TipoProducto', 'Descripcion',
  'PesoCarates', 'Color', 'Calidad', 'PrecioCOP', 'Disponibilidad',
  'FotosUrls', 'SolicitudId', 'Estado', 'Notas', 'VistoAdmin', 'ProveedorNombre'
];

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default withApiHandler(async (req, res, { sheets }) => {
  // Redirect upload requests to the new dedicated endpoint
  if (req.query.action === 'upload') {
    return sendError(res, 301, 'Upload endpoint has moved', 'Please use /api/media-upload instead');
  }

  // Redirect diagnostic requests to the new endpoint
  if (req.query.action === 'check-drive') {
    return sendError(res, 301, 'Diagnostic endpoint has moved', 'Please use /api/drive-diagnostics instead');
  }

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

    // Send email notification to all admins
    const adminEmails = getAdminEmails();
    if (adminEmails.length > 0) {
      sendNotificationEmail(
        EMAIL_TYPES.PROVIDER_SUBMITTED_QUOTATION,
        {
          providerName: providerName || providerEmail.split('@')[0],
          providerEmail,
          productType,
          weightCarats,
          color,
          quality,
          priceCOP,
          description,
          quotationId,
          requestId,
        },
        adminEmails
      ).catch(err => console.error('[Email] Failed to send quotation notification to admins:', err));
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
    const { id, status, viewedByAdmin, adminNotes } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:P`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return sendError(res, 404, 'Quotation not found');
    }

    const row = rows[rowIndex];
    const providerEmail = row[1];
    const providerName = row[15] || providerEmail.split('@')[0];
    const productType = row[3];
    const oldStatus = row[12] || 'disponible';

    if (status) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!M${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[status]] },
      });

      // Send email to provider about status change (only for meaningful changes)
      if (status !== oldStatus && providerEmail) {
        sendNotificationEmail(
          EMAIL_TYPES.QUOTATION_STATUS_CHANGED,
          {
            providerName,
            quotationId: id,
            productType,
            oldStatus,
            newStatus: status,
            adminNotes: adminNotes || '',
          },
          providerEmail
        ).catch(err => console.error('[Email] Failed to send status change notification:', err));
      }
    }

    if (viewedByAdmin !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!O${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[viewedByAdmin ? 'TRUE' : 'FALSE']] },
      });
    }

    return sendSuccess(res, { updated: true });
  }

  // DELETE - Mark quotation as sold
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

    const row = rows[rowIndex];
    const providerEmail = row[1];
    const providerName = row[15] || providerEmail.split('@')[0];
    const productType = row[3];
    const oldStatus = row[12] || 'disponible';

    // Mark as sold/unavailable instead of deleting
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!M${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['vendido']] },
    });

    // Notify provider that their product was sold
    if (providerEmail) {
      sendNotificationEmail(
        EMAIL_TYPES.QUOTATION_STATUS_CHANGED,
        {
          providerName,
          quotationId: id,
          productType,
          oldStatus,
          newStatus: 'vendido',
          adminNotes: '',
        },
        providerEmail
      ).catch(err => console.error('[Email] Failed to send sold notification:', err));
    }

    return sendSuccess(res, { deleted: true });
  }

  return sendError(res, 405, 'Method not allowed');
}, { methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], provideSheets: true, errorPrefix: 'ProviderQuotations' });
