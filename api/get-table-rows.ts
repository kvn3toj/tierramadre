/**
 * Targeted reader for the DELTA Sheet→Convex sync (changed-cells only).
 *
 * Given a set of dirty rows per Fotosíntesis SOT tab, reads ONLY those rows
 * (one `spreadsheets.values.batchGet` for the whole tab's dirty set) and
 * returns, per row, the natural key (column A) plus the CHANGED cells mapped
 * to their field-key. Convex then applies its writable allowlist + coercion.
 *
 * This keeps the column-index→field-key mapping on the Vercel side (where both
 * column declarations already live: FOTO_INVENTARIO_COLUMNS for the Inventario
 * tab, TABLE_CONFIGS[table].columns for the other five). The Apps Script sends
 * raw 0-based column indexes and never holds a column map of its own.
 *
 * Server-to-server only — gated by ADMIN_SYNC_TOKEN, like the write side and
 * the full-tab reader (api/get-table.ts).
 *
 * POST body:
 *   {
 *     table: "inventory" | "providers" | "lots" | "clients" | "sales" | "subLotes",
 *     entries: [{ rowIndex: number, colIdxs: number[] }]
 *   }
 *
 * Response:
 *   { table, sheetName, rows: [{ rowIndex, colA, cells: { <fieldKey>: <string> } }] }
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
import {
  FOTO_INVENTARIO_COLUMNS,
  FOTO_INVENTARIO_LAST_COL,
} from './_lib/fotosintesis-inventory-columns.js';
import { resolveGrant } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';

const SPREADSHEET_ID = FOTOSINTESIS_SPREADSHEET_ID;

type FotoColumn = { header: string; key: string };

interface DeltaEntry {
  rowIndex?: number;
  colIdxs?: number[];
}
interface RowsBody {
  table?: string;
  entries?: DeltaEntry[];
}

/** Resolve the per-tab column-key list, rightmost column, and tab patterns. */
function layoutFor(table: string): {
  keys: string[];
  lastCol: string;
  patterns: string[];
} | null {
  if (table === 'inventory') {
    return {
      keys: (FOTO_INVENTARIO_COLUMNS as FotoColumn[]).map((c) => c.key),
      lastCol: FOTO_INVENTARIO_LAST_COL,
      patterns: ['inventario', 'inventory'],
    };
  }
  if (isFotoTable(table)) {
    const cfg = TABLE_CONFIGS[table];
    return {
      keys: cfg.columns,
      lastCol: cfg.lastColumnLetter,
      patterns: cfg.sheetTabPatterns,
    };
  }
  return null;
}

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
    // get-inventory-rows.ts / get-table.ts: server-to-server only, already
    // gated above by ADMIN_SYNC_TOKEN. Convex, the only caller, never
    // presents browser credentials, so resolveGrant would always answer
    // `anon` here; gating on it would truncate the delta-sync rows the
    // Sheets->Convex mirror depends on. Resolved only so this endpoint is
    // classified/audited by tests/catalogEndpointsProjection.test.ts.
    const grant = await resolveGrant(req, { lookupVitrina });
    void grant;

    const body = (req.body ?? {}) as RowsBody;
    const table = body.table;
    if (!table) return sendError(res, 400, 'Missing table');
    const layout = layoutFor(table);
    if (!layout) {
      return sendError(
        res,
        400,
        `Invalid table "${table}". Expected: inventory | providers | lots | clients | sales | subLotes.`,
      );
    }

    const entries = Array.isArray(body.entries) ? body.entries : [];
    // Keep only valid, in-bounds rows (header is row 1). Dedupe by rowIndex,
    // unioning the changed column indexes so a row edited twice reads once.
    const byRow = new Map<number, Set<number>>();
    // Índices que el Apps Script mandó y esta cota descartó. Se acumulan para
    // avisar UNA vez, no por fila.
    const fueraDeRango = new Set<number>();
    for (const e of entries) {
      const r = Number(e.rowIndex);
      if (!Number.isInteger(r) || r < 2) continue;
      const set = byRow.get(r) ?? new Set<number>();
      for (const c of e.colIdxs ?? []) {
        const ci = Number(c);
        if (Number.isInteger(ci) && ci > 0 && ci < layout.keys.length) {
          set.add(ci); // ci > 0 → never resync column A (the natural key)
        } else if (Number.isInteger(ci) && ci >= layout.keys.length) {
          fueraDeRango.add(ci);
        }
      }
      byRow.set(r, set);
    }
    // La hoja tiene una columna que este código no conoce. NO es teórico: entre
    // el 2026-09-01 y el 2026-09-04 la hoja tuvo 59 cabeceras y la lista 58, y
    // toda edición en BG («Precio USD») se descartó acá sin error, sin marca y
    // sin registro. Un ancla de precio escrita a mano no llegaba a Convex y
    // nadie se enteró hasta auditar las dos puntas.
    //
    // El arreglo es agregar la columna a FOTO_INVENTARIO_COLUMNS; el largo de
    // ese array gobierna esta cota y los dos rangos de lectura a la vez.
    if (fueraDeRango.size > 0) {
      console.warn(
        `[get-table-rows] tabla "${table}": la hoja mandó ediciones en ` +
          `columna(s) ${[...fueraDeRango].sort((a, b) => a - b).join(', ')} ` +
          `(0-based) y el mapa sólo llega a ${layout.keys.length - 1}. ` +
          `Esas ediciones se están DESCARTANDO. Falta declararlas en ` +
          `api/_lib/fotosintesis-inventory-columns.js.`,
      );
    }
    if (byRow.size === 0) {
      return sendSuccess(res, { table, sheetName: null, rows: [] });
    }

    const { sheets } = ctx as { sheets: sheets_v4.Sheets };
    const sheetNames = await getSheetNames(sheets, SPREADSHEET_ID);
    const targetSheet = findSheetByPattern(sheetNames, layout.patterns);
    if (!targetSheet) {
      return sendError(
        res,
        404,
        `Sheet tab not found for "${table}". Expected one of: ${layout.patterns.join(', ')}`,
      );
    }

    const rowNumbers = Array.from(byRow.keys()).sort((a, b) => a - b);
    const ranges = rowNumbers.map(
      (r) => `'${targetSheet}'!A${r}:${layout.lastCol}${r}`,
    );
    const batch = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges,
    });
    const valueRanges = batch.data.valueRanges ?? [];

    const rows: Array<{
      rowIndex: number;
      colA: string;
      cells: Record<string, string>;
    }> = [];
    for (let i = 0; i < rowNumbers.length; i++) {
      const rowIndex = rowNumbers[i];
      const rowValues = (valueRanges[i]?.values?.[0] ?? []) as unknown[];
      const colA = String(rowValues[0] ?? '').trim();
      const cells: Record<string, string> = {};
      for (const ci of byRow.get(rowIndex)!) {
        const key = layout.keys[ci];
        if (!key) continue;
        cells[key] = String(rowValues[ci] ?? '');
      }
      rows.push({ rowIndex, colA, cells });
    }

    return sendSuccess(res, { table, sheetName: targetSheet, rows });
  },
  {
    methods: ['POST', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'GetTableRows',
  },
);
