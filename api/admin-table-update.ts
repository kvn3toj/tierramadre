/**
 * Admin Table Update API — generic write-back endpoint for Fotosíntesis v2.
 *
 * Writes a single row to one of the Fotosíntesis tabs (Proveedores,
 * Lotes, Clientes, Ventas). Called by Convex `_pushToSheet` actions
 * after a mutation patches a Convex mirror.
 *
 * Auth: shared `ADMIN_SYNC_TOKEN` between Convex and Vercel.
 *
 * Body:
 *   {
 *     table: "providers" | "lots" | "clients" | "sales",
 *     rowIndex: number (>= 2),
 *     mode: "patch" | "append",
 *     idValue: string,                           // value of the natural-key column
 *     fields: Record<string, string>             // all column values, keyed by column name
 *   }
 *
 * Strategy mirrors admin-product-update.ts (parity completed 2026-08-19,
 * incidente TM-001):
 *   - Resolve target tab via findSheetByPattern.
 *   - LOCATE the target row by the natural key in COLUMN A (with rename
 *     semantics via `previousIdValue`) — NEVER by the caller's `rowIndex`,
 *     which drifts and, in the old append mode, OVERWROTE whatever row the
 *     stale hint pointed at (TM-001, pisada por un push de C-090). The hint
 *     is now an echoed debugging aid only.
 *   - Existing row → merge preserving untouched cells, closed-range update.
 *   - New row → first truly free row, via writeNewRowGuarded (stretch grid →
 *     occupied-row guard → closed-range update; see _lib/sheet-new-row.ts).
 *   - Respond with the ACTUAL physical row written and the mode taken.
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
import { resolveTableRowTarget } from './_lib/table-row-target.js';
import { writeNewRowGuarded } from './_lib/sheet-new-row.js';

// Writes go to the Fotosíntesis v2 SOT, not the legacy live-catalog sheet.
const SPREADSHEET_ID = FOTOSINTESIS_SPREADSHEET_ID;

interface UpdateBody {
  table?: string;
  rowIndex?: number;
  mode?: 'patch' | 'append';
  idValue?: string;
  /**
   * On a rename, the OLD natural-key value still in column A of the sheet.
   * The safety check uses this (instead of `idValue`) to detect a row-shift
   * conflict, then column A is overwritten with `idValue` in the merge.
   */
  previousIdValue?: string;
  fields?: Record<string, unknown>;
}

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/**
 * Conserva una celda intacta sin convertir números en texto. Ver la nota larga
 * en api/admin-product-update.ts: escribir "0.1785" con `USER_ENTERED` lo hace
 * pasar por el idioma de la hoja, y devolver el número no.
 */
function preservar(v: unknown): string | number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return s(v);
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

    const body = (req.body ?? {}) as UpdateBody;
    const { table, rowIndex, mode, idValue, previousIdValue, fields } = body;

    if (!table || !isFotoTable(table)) {
      return sendError(
        res,
        400,
        `Invalid table "${table}". Expected: providers | lots | clients | sales | subLotes | movimientosAsesor.`,
      );
    }
    if (!rowIndex || !Number.isInteger(rowIndex) || rowIndex < 2) {
      return sendError(res, 400, 'rowIndex must be an integer ≥ 2');
    }
    if (!fields || typeof fields !== 'object') {
      return sendError(res, 400, 'Missing fields object');
    }
    if (mode !== 'patch' && mode !== 'append') {
      return sendError(res, 400, 'mode must be "patch" or "append"');
    }
    if (typeof idValue !== 'string' || idValue.length === 0) {
      return sendError(res, 400, 'Missing idValue');
    }

    const config = TABLE_CONFIGS[table];
    const { sheets } = ctx as { sheets: sheets_v4.Sheets };

    // Enumerate tabs from the Fotosíntesis SOT, NOT the legacy default.
    // (`getSheetNames` defaults to the legacy SPREADSHEET_ID — must pass
    // the new SOT id explicitly or tab lookup silently 404s.)
    const sheetNames = await getSheetNames(sheets, SPREADSHEET_ID);
    const targetSheet =
      findSheetByPattern(sheetNames, config.sheetTabPatterns) ?? null;
    if (!targetSheet) {
      return sendError(
        res,
        500,
        `Sheet tab not found for table "${table}". Expected one of: ${config.sheetTabPatterns.join(', ')}`,
      );
    }

    // ── Locate the target row by COLUMN A (natural key) — never the hint ──
    // Incidente TM-001 (2026-08-19): el modo "append" escribía en el rowIndex
    // del caller sin mirar la columna A y pisó una fila ajena. La localización
    // (con la vuelta del rename) vive en _lib/table-row-target.ts con su test.
    const colAResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheet}!A:A`,
      // Ver la nota en admin-product-update.ts: una clave formateada no iguala
      // a la clave real y el endpoint APPENDEA una fila duplicada en vez de
      // actualizar. Acá las claves son de ventas, lotes y comisiones.
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const colA = (colAResp.data.values ?? []) as string[][];
    const { targetRow, willAppend, matchedKey } = resolveTableRowTarget(
      colA,
      idValue,
      previousIdValue,
    );

    // Existing row → read it to preserve untouched cells (lets the sheet keep
    // notes/manually-added columns past our last managed column).
    // `unknown[]`, no `string[]`: ver la nota de tipo en admin-product-update.ts.
    let existingRow: unknown[] = [];
    if (!willAppend) {
      const readRange = `${targetSheet}!A${targetRow}:${config.lastColumnLetter}${targetRow}`;
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: readRange,
        // Mismo motivo que en api/admin-product-update.ts: esta fila se lee
        // para conservar lo que nadie tocó y se reescribe tal cual salió, así
        // que leerla FORMATEADA (el default de la API) le pasa el formato de
        // pantalla a cada celda preservada. Estas tablas son de plata —ventas,
        // comisiones, lotes—, y acá el daño sería el mismo: decimales
        // recortados, porcentajes redondeados y ceros contables convertidos en
        // el texto "-".
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
      existingRow = existing.data.values?.[0] ?? [];

      // Defense in depth: the located row must still read back as the key we
      // matched. Guards the race between the A:A scan and this read — this
      // path writes money-adjacent tables and must never hit a foreign row.
      const sheetIdValue = s(existingRow[0]).trim();
      if (sheetIdValue && sheetIdValue !== matchedKey) {
        return sendError(
          res,
          409,
          `Row ${targetRow} of ${targetSheet} is "${sheetIdValue}", not "${matchedKey}". The sheet changed mid-write. Retry.`,
        );
      }
    }

    // Build the merged row positionally (column A = index 0).
    const merged: (string | number)[] = new Array(config.columns.length).fill(
      '',
    );
    for (let i = 0; i < config.columns.length; i++) {
      merged[i] = preservar(existingRow[i]);
    }
    for (let i = 0; i < config.columns.length; i++) {
      const col = config.columns[i];
      if (Object.prototype.hasOwnProperty.call(fields, col)) {
        merged[i] = s(fields[col]);
      }
    }

    let writtenRow: number;
    if (willAppend) {
      // NUEVA fila: estirar grid → guard de fila ocupada → update cerrado.
      // Secuencia compartida con admin-product-update (incidente 0571).
      const written = await writeNewRowGuarded(sheets, {
        spreadsheetId: SPREADSHEET_ID,
        sheetTitle: targetSheet,
        targetRow,
        lastCol: config.lastColumnLetter,
        values: merged,
      });
      if (written.status === 'occupied') {
        return sendError(
          res,
          409,
          `Row ${targetRow} of ${targetSheet} is not empty; refusing to overwrite it with new row "${idValue}". The sheet changed mid-write. Retry.`,
        );
      }
      writtenRow = targetRow;
    } else {
      const writeRange = `${targetSheet}!A${targetRow}:${config.lastColumnLetter}${targetRow}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: writeRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [merged] },
      });
      writtenRow = targetRow;
    }

    return sendSuccess(res, {
      table,
      // ACTUAL physical row written — differs from the caller's hint when the
      // sheet drifted. Callers should cache this as the fresh rowIndex.
      rowIndex: writtenRow,
      requestedRowIndex: rowIndex,
      // The mode actually taken; `requestedMode` echoes the body flag.
      mode: willAppend ? 'appended' : 'updated',
      requestedMode: mode,
      sheetName: targetSheet,
      updatedAt: new Date().toISOString(),
    });
  },
  {
    methods: ['POST', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'AdminTableUpdate',
  },
);
