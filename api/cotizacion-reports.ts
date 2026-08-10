/**
 * Vercel Serverless Function - Cotizacion Reports API
 *
 * Logs client validation mismatches when asesor creates cotizacion
 * for a client not in their invited guests list.
 *
 * Actions:
 * - POST: Log a new mismatch report (staff session required)
 * - GET: List reports (staff session required)
 *
 * SESSION-GATED (2026-08-09, PII lockdown). Both methods, both before any
 * Sheets call. Measured against production the day of this fix: an anonymous
 * `GET /api/cotizacion-reports` answered HTTP 200 with 19 records carrying
 * `asesorEmail`, `asesorName`, `clientNameEntered`, `clientPhone`,
 * `clientEmail`, `expectedGuests` and `quotationNumber` — real customers (7
 * phone numbers, 3 emails). The header above already said "admin only"; the
 * guard was simply never written, and the 2026-08-05/06 access-control rounds
 * missed it because this is not a catalog endpoint.
 *
 * POST is gated too: it APPENDS customer name/phone/email into the same sheet,
 * so an open POST is an anonymous PII-injection door onto the rows GET was
 * leaking. Its only caller (CotizacionGenerator.tsx) fires exclusively when
 * `invitedGuests.length > 0`, and that list comes from
 * `/api/invitations?action=list-by-creator`, which has required a `tms1`
 * session since the 2026-08-06 lockdown — so every request that reaches this
 * POST already proved a staff session seconds earlier.
 *
 * Converted from .js to .ts for the same reason api/product-views.ts was: a
 * plain `.js` importer does not get TypeScript's `.js`→`.ts` extension
 * resolution, which is what the `./_lib/sessionToken.js` import below needs.
 */

import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withApiHandler,
  sendError,
  APP_SPREADSHEET_ID,
  SHEETS,
  ensureSheet,
} from './_lib/index.js';
import { extractBearer } from './_lib/bearer.js';
import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';

type Sheets = sheets_v4.Sheets;

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
 * Verifies a `tms1` app session token from the `Authorization: Bearer …`
 * header and returns its email, or null. Only `tms1` tokens count — a raw
 * Google ID token, whatever its shape, is not a session token and returns
 * null here, which the gate below turns into a 401. Same helper as
 * api/invitations.ts and api/product-views.ts; exported for
 * tests/cotizacionReportsPii.test.ts.
 */
export function verifiedSessionEmail(
  authHeader?: string | string[],
): string | null {
  const token = extractBearer(authHeader);
  if (!token || !isSessionToken(token)) return null;
  return verifySessionToken(token)?.email ?? null;
}

interface MismatchReportBody {
  asesorEmail?: string;
  asesorName?: string;
  clientNameEntered?: string;
  clientPhone?: string;
  clientEmail?: string;
  expectedGuests?: string[];
  quotationNumber?: string;
}

/**
 * Log a new mismatch report
 */
async function logMismatchReport(sheets: Sheets, body: MismatchReportBody) {
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
    return {
      success: false,
      error: 'asesorEmail and clientNameEntered are required',
    };
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

export async function handleCotizacionReports(
  req: VercelRequest,
  res: VercelResponse,
  context: Record<string, unknown>,
): Promise<unknown> {
  const sheets = context.sheets as Sheets;

  // Gate BEFORE ensureSheet and every other Sheets call — an unauthorized
  // caller must cost no Sheets quota, same placement as
  // api/product-views.ts's gate.
  if (!verifiedSessionEmail(req.headers['authorization'])) {
    return sendError(res, 401, 'Inicia sesión para ver esta información.');
  }

  await ensureSheet(sheets, SHEET_NAME, HEADERS, APP_SPREADSHEET_ID);

  // POST - Log mismatch report
  if (req.method === 'POST') {
    const result = await logMismatchReport(
      sheets,
      (req.body as MismatchReportBody) || {},
    );
    return res.status(200).json(result);
  }

  // GET - List reports
  if (req.method === 'GET') {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:J`,
    });

    const rows = (response.data.values || []) as string[][];
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
}

export default withApiHandler(handleCotizacionReports, {
  methods: ['GET', 'POST', 'OPTIONS'],
  provideSheets: true,
  errorPrefix: 'CotizacionReports',
});
