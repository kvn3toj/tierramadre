/**
 * Whole-tab reader for the Fotosíntesis SOT "Inventario" tab — the inventory
 * analogue of api/get-table.ts (which only knows the five non-inventory tabs).
 *
 * Used by the FULL-reconcile mode of the Sheet→Convex sync (the
 * "Sincronizar todo (completo)" fallback) when delta tracking may have missed
 * an out-of-band edit. Delta mode uses api/get-table-rows.ts instead.
 *
 * Returns every data row keyed by the productInventory field name (the `key`
 * column of FOTO_INVENTARIO_COLUMNS) plus `__rowIndex` and `__colA`. The `id`
 * / `preserve` flags only matter for writes, so they are ignored here.
 *
 * Server-to-server only — gated by ADMIN_SYNC_TOKEN.
 *
 * Response: { sheetName, rows: Array<Record<string,string> & { __rowIndex, __colA }> }
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
import {
  FOTO_INVENTARIO_COLUMNS,
  FOTO_INVENTARIO_LAST_COL,
} from './_lib/fotosintesis-inventory-columns.js';
import { resolveGrant } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';

const SPREADSHEET_ID = FOTOSINTESIS_SPREADSHEET_ID;

type FotoColumn = { header: string; key: string };

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

    // Resolved (not applied to the payload): this route is server-to-server
    // only, already gated above by ADMIN_SYNC_TOKEN — a Convex-held shared
    // secret stronger than any browser session. resolveGrant only inspects
    // browser credentials (Authorization: Bearer / ?vitrina=), which Convex
    // never sends, so it would always resolve `anon` here; gating the
    // response on that would silently truncate every legitimate sync read to
    // 11 public fields and break the Sheets->Convex full reconcile (the
    // entire point of this endpoint is the full row, unprojected). Resolved
    // only so this endpoint is classified/audited by
    // tests/catalogEndpointsProjection.test.ts, same as every other
    // catalog-reading endpoint.
    const grant = await resolveGrant(req, { lookupVitrina });
    void grant;

    const keys = (FOTO_INVENTARIO_COLUMNS as FotoColumn[]).map((c) => c.key);
    const { sheets } = ctx as { sheets: sheets_v4.Sheets };
    const sheetNames = await getSheetNames(sheets, SPREADSHEET_ID);
    const targetSheet = findSheetByPattern(sheetNames, [
      'inventario',
      'inventory',
    ]);
    if (!targetSheet) {
      return sendError(res, 404, `Inventario tab not found in the SOT.`);
    }

    const range = `'${targetSheet}'!A1:${FOTO_INVENTARIO_LAST_COL}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    const values = (response.data.values ?? []) as unknown[][];
    if (values.length <= 1) {
      return sendSuccess(res, { sheetName: targetSheet, rows: [] });
    }

    // Row 1 is the header; data starts at row 2 (1-based sheet index = i + 1).
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i] ?? [];
      const colA = String(row[0] ?? '').trim();
      if (!colA) continue; // skip blank rows
      const obj: Record<string, string> = {
        __rowIndex: String(i + 1),
        __colA: colA,
      };
      for (let j = 0; j < keys.length; j++) {
        obj[keys[j]] = String(row[j] ?? '');
      }
      rows.push(obj);
    }

    return sendSuccess(res, { sheetName: targetSheet, rows });
  },
  {
    methods: ['GET', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'GetInventoryRows',
  },
);
