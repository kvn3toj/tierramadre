/**
 * Vercel Serverless Function - Cotizacion Reports API
 *
 * Logs client validation mismatches when asesor creates cotizacion
 * for a client not in their invited guests list.
 *
 * Actions:
 * - POST: Log a new mismatch report
 * - GET: List reports (admin only)
 */

import {
  withApiHandler,
  sendError,
  APP_SPREADSHEET_ID,
  SHEETS,
  ensureSheet,
} from './_lib/index.js';

const SHEET_NAME = SHEETS.COTIZACION_REPORTS;
const HEADERS = [
  'id',
  'timestamp',
  'asesorEmail',
  'asesorName',
  'clientNameEntered',
  'clientPhone',
  'clientEmail',
  'expectedGuests',
  'quotationNumber',
  'actionTaken',
];

/**
 * Log a new mismatch report
 */
async function logMismatchReport(sheets, body) {
  const {
    asesorEmail,
    asesorName,
    clientNameEntered,
    clientPhone,
    clientEmail,
    expectedGuests,
    quotationNumber,
  } = body;

  if (!asesorEmail || !clientNameEntered) {
    return { success: false, error: 'asesorEmail and clientNameEntered are required' };
  }

  const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const timestamp = new Date().toISOString();

  const row = [
    id,
    timestamp,
    asesorEmail,
    asesorName || '',
    clientNameEntered,
    clientPhone || '',
    clientEmail || '',
    JSON.stringify(expectedGuests || []),
    quotationNumber || '',
    'logged', // actionTaken
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:J`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return {
    success: true,
    message: 'Mismatch report logged',
    reportId: id,
  };
}

export default withApiHandler(async (req, res, { sheets }) => {
  await ensureSheet(sheets, SHEET_NAME, HEADERS, APP_SPREADSHEET_ID);

  // POST - Log mismatch report
  if (req.method === 'POST') {
    const result = await logMismatchReport(sheets, req.body);
    return res.status(200).json(result);
  }

  // GET - List reports (for admin dashboard later)
  if (req.method === 'GET') {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:J`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return res.status(200).json({ success: true, reports: [], total: 0 });
    }

    const reports = rows.slice(1).map((row) => ({
      id: row[0],
      timestamp: row[1],
      asesorEmail: row[2],
      asesorName: row[3],
      clientNameEntered: row[4],
      clientPhone: row[5],
      clientEmail: row[6],
      expectedGuests: JSON.parse(row[7] || '[]'),
      quotationNumber: row[8],
      actionTaken: row[9],
    }));

    return res.status(200).json({
      success: true,
      reports,
      total: reports.length,
    });
  }

  return sendError(res, 405, 'Method not allowed');
}, { methods: ['GET', 'POST', 'OPTIONS'], provideSheets: true, errorPrefix: 'CotizacionReports' });
