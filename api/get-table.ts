/**
 * Generic GET for Fotosíntesis v2 sheet tabs.
 *
 * Reads any of the four configured tabs (Proveedores, Lotes, Clientes,
 * Ventas) and returns rows keyed by header name. Used by Convex pull
 * actions and the future health dashboard. Server-to-server only —
 * gated by `ADMIN_SYNC_TOKEN` like the write side.
 *
 * Query params:
 *   ?table=providers | lots | clients | sales
 *
 * Response: { headers: string[], rows: Array<Record<string, string>> }
 */

import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withApiHandler,
  FOTOSINTESIS_SPREADSHEET_ID,
  sendError,
  sendSuccess,
  getSheetNames,
  findSheetByPattern,
} from './_lib/index.js';
import { TABLE_CONFIGS, isFotoTable } from './_lib/admin-table-config.js';
import { resolveGrant } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';

// Fotosíntesis SOT v2 is its own spreadsheet so that the legacy catalog
// (productInventory in SPREADSHEET_ID) stays untouched. Override via env
// FOTOSINTESIS_SPREADSHEET_ID for staging/local sheets.
const SPREADSHEET_ID = FOTOSINTESIS_SPREADSHEET_ID;

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    const expectedToken = process.env.ADMIN_SYNC_TOKEN;
    const providedToken =
      (req.headers['x-admin-sync-token'] as string | undefined) ?? undefined;
    if (!expectedToken) {
      return sendError(res, 500, 'ADMIN_SYNC_TOKEN not configured on server');
    }
    if (!providedToken || providedToken !== expectedToken) {
      return sendError(res, 401, 'Unauthorized');
    }

    // Resolved (not applied to the payload) — same reasoning as
    // get-inventory-rows.ts: this is a server-to-server route, already
    // gated above by ADMIN_SYNC_TOKEN, whose only caller (Convex) never
    // presents browser credentials. Gating on resolveGrant's `anon` result
    // would truncate the full-tab reads Convex pull actions depend on.
    // Resolved only so this endpoint is classified/audited by
    // tests/catalogEndpointsProjection.test.ts.
    const grant = await resolveGrant(req, { lookupVitrina });
    void grant;

    const tableParam = req.query.table;
    const table = Array.isArray(tableParam) ? tableParam[0] : tableParam;
    if (!table || !isFotoTable(table)) {
      return sendError(
        res,
        400,
        `Invalid or missing ?table param. Expected: providers | lots | clients | sales.`,
      );
    }

    const config = TABLE_CONFIGS[table];
    const { sheets } = ctx as { sheets: sheets_v4.Sheets };
    // Enumerate tabs from the Fotosíntesis SOT, NOT the legacy default.
    // (`getSheetNames` defaults to the legacy SPREADSHEET_ID — must pass
    // the new SOT id explicitly or tab lookup silently 404s.)
    const sheetNames = await getSheetNames(sheets, SPREADSHEET_ID);
    const targetSheet = findSheetByPattern(sheetNames, config.sheetTabPatterns);
    if (!targetSheet) {
      return sendError(
        res,
        404,
        `Sheet tab not found for table "${table}". Expected one of: ${config.sheetTabPatterns.join(', ')}`,
      );
    }

    const range = `${targetSheet}!A1:${config.lastColumnLetter}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    const values = (response.data.values ?? []) as string[][];
    if (values.length === 0) {
      return sendSuccess(res, { headers: [], rows: [] });
    }

    // Use the configured columns as the headers — accountants are free
    // to add display-only columns to the right of `lastColumnLetter`,
    // and we ignore them. The first sheet row is treated as a label
    // row and skipped.
    const headers = config.columns;
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj: Record<string, string> = { __rowIndex: String(i + 1) };
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = row?.[j] ?? '';
      }
      rows.push(obj);
    }

    return sendSuccess(res, { table, sheetName: targetSheet, headers, rows });
  },
  {
    methods: ['GET', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'GetTable',
  },
);
