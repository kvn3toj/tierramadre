/**
 * Admin Product Update API
 *
 * Writes a single product row back to the 'Inventario' sheet. Called by
 * the Convex `products.pushToSheet` action after an admin saves an edit.
 *
 * Auth: shared secret in `x-admin-sync-token` header. Set the same value
 * as the `ADMIN_SYNC_TOKEN` env var on both Vercel and the Convex
 * deployment. This endpoint is NOT user-facing — it's a server-to-server
 * call from Convex actions.
 *
 * Two layouts, picked by `target` (or by `loteId` being set):
 *
 *  • LEGACY treasure sheet (target="legacy") — frozen A:U layout, read by
 *    get-treasure-sheets for the public catalog. Do NOT change its columns.
 *      A item       B fechaIngreso       C nombre        D peso (ct)
 *      E color      F calidad            G cantidad      H talla
 *      I medidas    J medidasValores     K categoría     L precioCOP
 *      M ubicación  N asesor             O estado        P qr
 *      Q colección  R caja               S (unused)      T asesorActual
 *      U estadoAsesor
 *
 *  • FOTOSÍNTESIS SOT (target="fotosintesis") — full layout driven by
 *    api/_lib/fotosintesis-inventory-columns.js (A:AQ today). The price block
 *    is: costoBaseCOP (L), precioFinalCOP (M, derived = costoBase × 2.6),
 *    (sin uso) (N, reserved/empty after the 2026-07-21 tier collapse); the
 *    remaining Fotosíntesis form fields (preponderancia, loteId, photos,
 *    minerals, etc.) follow from O/V onward. Run scripts/extend-fotosintesis-headers.mjs
 *    to widen a fresh sheet, or scripts/reorder-fotosintesis-price-columns.mjs
 *    to migrate an existing one after a column-order change.
 *
 * Strategy: locate the target row by COLUMN A (=== itemId), the item's true
 * identity key — NOT by the caller's `rowIndex`, which drifts when blank rows
 * are added/removed or the sheet is re-sorted. If the itemId is found, read
 * that row first to preserve fields we don't edit (notably `fechaIngreso` in
 * column B), then values.update it in place (self-correcting even if the
 * passed rowIndex is stale). If the itemId is NOT found, values.append a new
 * row (INSERT_ROWS) after the last data row. The response returns the ACTUAL
 * physical row written and the mode used ("updated" | "appended").
 */

import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withApiHandler,
  SPREADSHEET_ID,
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
import { resolveRowTarget } from './_lib/sheet-row-target.js';

type FotoColumn = {
  header: string;
  key: string;
  id?: boolean;
  preserve?: boolean;
  /** Numeric column: write as a real number, never a string. See merge below. */
  numeric?: boolean;
};
const FOTO_COLUMNS = FOTO_INVENTARIO_COLUMNS as FotoColumn[];

interface UpdateBody {
  itemId?: string;
  /** Optional stale hint only; the row is located by column-A === itemId. */
  rowIndex?: number;
  /**
   * Deprecated hint — the endpoint now auto-selects update vs append based on
   * whether itemId already exists in column A. Echoed back as `requestedMode`.
   */
  mode?: 'patch' | 'append';
  /** legacy = treasure sheet; fotosintesis = SOT Inventario when loteId set */
  target?: 'legacy' | 'fotosintesis';
  loteId?: string;
  fields?: {
    nombre?: string;
    peso?: string | number;
    color?: string;
    calidad?: string;
    cantidad?: string | number;
    talla?: string;
    medidas?: string;
    medidasValores?: string;
    categoria?: string;
    precioCOP?: string | number;
    ubicacion?: string;
    asesor?: string;
    estado?: string;
    qr?: string;
    coleccion?: string;
    caja?: string;
    asesorActual?: string;
    estadoAsesor?: string;
    // ── Fotosíntesis v2 fields (written only to the SOT Inventario tab) ──
    preponderancia?: string | number;
    loteId?: string;
    costoBaseCOP?: string | number;
    mostrarEnCatalogo?: string;
    procedencia?: string;
    observacion?: string;
    rendimientoEsperado?: string | number;
    cantidadEstimada?: string | number;
    nivelRareza?: string | number;
    calificacion?: string | number;
    tipoEsmeralda?: string;
    subtipoForm?: string;
    tipoJoya?: string;
    tecnicaJoya?: string;
    minerales?: string;
    complementos?: string;
    fotoUrl?: string;
    certificadoUrl?: string;
    formulaGema?: string;
    formulaJoya?: string;
    rangoDescuento?: string;
    // DERIVED final price → column M (replaces the former x1–x4 tiers).
    precioFinalCOP?: string | number;
  };
}

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/**
 * Estira el grid de la pestaña si la fila destino cae fuera. `values.update`
 * sobre un rango que excede el grid falla; `values.append` lo hacía solo, y era
 * lo único bueno que tenía.
 */
async function ensureRowCapacity(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetTitle: string,
  needed: number,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title,gridProperties.rowCount)',
  });
  const props = (meta.data.sheets ?? [])
    .map((sh) => sh.properties)
    .find((p) => p?.title === sheetTitle);
  if (!props?.gridProperties) return;
  const current = props.gridProperties.rowCount ?? 0;
  if (current >= needed) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          appendDimension: {
            sheetId: props.sheetId,
            dimension: 'ROWS',
            length: needed - current,
          },
        },
      ],
    },
  });
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    // Shared-secret auth (Convex action ↔ Vercel)
    const expectedToken = process.env.ADMIN_SYNC_TOKEN;
    const providedToken =
      (req.headers['x-admin-sync-token'] as string | undefined) ?? undefined;
    if (!expectedToken) {
      return sendError(
        res,
        500,
        'ADMIN_SYNC_TOKEN not configured on the server',
      );
    }
    if (!providedToken || providedToken !== expectedToken) {
      return sendError(res, 401, 'Unauthorized');
    }

    const body = (req.body ?? {}) as UpdateBody;
    const { itemId, rowIndex, fields, mode, target, loteId } = body;
    // rowIndex is NO LONGER required: the target row is located by column-A
    // (=== itemId) below, and a brand-new item has no row yet (it gets
    // appended). rowIndex is now only a caller hint we echo back for debugging.
    if (!itemId || !fields) {
      return sendError(res, 400, 'Missing itemId or fields');
    }
    // If a rowIndex IS supplied, keep the old sanity floor so an obviously
    // malformed hint (0, 1, negative, fractional) fails loud rather than
    // silently being ignored.
    if (
      rowIndex !== undefined &&
      (!Number.isInteger(rowIndex) || rowIndex < 2)
    ) {
      return sendError(
        res,
        400,
        'rowIndex, when provided, must be an integer ≥ 2',
      );
    }

    // Fotosíntesis items (loteId set) write to the SOT spreadsheet using the
    // full Inventario layout; everything else writes the legacy treasure
    // sheet, whose A:U layout is read by get-treasure-sheets and must NOT
    // change. `isFoto` picks the target + column strategy accordingly.
    const isFoto = target === 'fotosintesis' || Boolean(loteId);
    const spreadsheetId = isFoto ? FOTOSINTESIS_SPREADSHEET_ID : SPREADSHEET_ID;

    const { sheets } = ctx as { sheets: sheets_v4.Sheets };
    const sheetNames = await getSheetNames(sheets, spreadsheetId);
    const targetSheet =
      findSheetByPattern(sheetNames, ['inventario', 'inventory']) ||
      sheetNames[0];

    const fieldMap = fields as Record<string, unknown>;
    // Range width spans the full layout for the SOT (A:AQ today), the frozen
    // A:U for the legacy sheet. The extra SOT columns are seeded by
    // scripts/extend-fotosintesis-headers.mjs before this endpoint targets them.
    const lastCol = isFoto ? FOTO_INVENTARIO_LAST_COL : 'U';

    // ── Locate the target row by COLUMN A (=== itemId) — authoritative key ──
    // Column A === itemId is the item's true identity. Rather than trust the
    // caller's `rowIndex` (which drifts whenever blank rows are added/removed
    // or the sheet is re-sorted — the source of the 409 "sheet may have been
    // re-ordered" failures), we read the whole A column and find the physical
    // row whose value matches. This makes every patch self-correcting.
    const colAResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!A:A`,
    });
    const colA = (colAResp.data.values ?? []) as string[][];
    // Localización + fila destino en un helper puro (api/_lib/sheet-row-target.js)
    // para poder testear el objetivo sin hablar con Sheets. El test de regresión
    // del incidente 2026-08-03 vive ahí: lo que se verifica es la FILA EN A, no
    // que el endpoint devuelva 200.
    const { foundRow, targetRow, willAppend } = resolveRowTarget(colA, itemId);

    // When updating, read the located row first so we PRESERVE every column we
    // don't explicitly touch (notably fechaIngreso in column B). Appends start
    // from an empty row — there is nothing to preserve for a brand-new item.
    let existingRow: string[] = [];
    if (!willAppend) {
      const readRange = `${targetSheet}!A${foundRow}:${lastCol}${foundRow}`;
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: readRange,
      });
      existingRow = (existing.data.values?.[0] ?? []) as string[];

      // Defense in depth: the row we located by column A must STILL read back
      // as this itemId. It will by construction; this guards against a race
      // between the A:A scan and this read. We must never overwrite a
      // different item's row on a money-adjacent write path.
      const sheetItemId = s(existingRow[0]).trim();
      if (sheetItemId && sheetItemId !== String(itemId)) {
        return sendError(
          res,
          409,
          `Row ${foundRow} is item "${sheetItemId}", not "${itemId}". The sheet changed mid-write. Retry.`,
        );
      }
    }

    let merged: (string | number)[];
    if (isFoto) {
      // SOT: drive the row entirely from the shared column map so the order
      // never drifts from create-fotosintesis-sot.mjs / the migration script.
      merged = new Array(FOTO_COLUMNS.length).fill('');
      for (let i = 0; i < FOTO_COLUMNS.length; i++) {
        merged[i] = s(existingRow[i] ?? ''); // preserve untouched columns
      }
      for (let i = 0; i < FOTO_COLUMNS.length; i++) {
        const col = FOTO_COLUMNS[i];
        if (col.id) {
          merged[i] = String(itemId); // column A — natural key
        } else if (col.preserve) {
          continue; // e.g. fechaIngreso (B) — carry the existing value through
        } else if (col.key in fieldMap && fieldMap[col.key] !== undefined) {
          const value = fieldMap[col.key];
          // Numeric columns MUST be written as real numbers. With
          // valueInputOption:"USER_ENTERED", a decimal string like "13.5"
          // is parsed against the sheet's locale — in es-CO it becomes the
          // date 13/May (serial 46155), silently corrupting preponderancia,
          // prices, ratings, etc. Passing a JS number sidesteps locale
          // parsing entirely. Blank/non-numeric values fall back to string.
          if (
            col.numeric &&
            value !== '' &&
            value !== null &&
            Number.isFinite(Number(value))
          ) {
            merged[i] = Number(value);
          } else {
            merged[i] = s(value);
          }
        }
      }
    } else {
      // Legacy treasure sheet — positional A:U (unchanged behavior).
      merged = new Array(21).fill('');
      for (let i = 0; i < 21; i++) {
        merged[i] = s(existingRow[i] ?? '');
      }
      // Column A — itemId (preserve)
      merged[0] = String(itemId);
      // Column B — fechaIngreso (preserve via existingRow)
      // Column C — nombre
      if (fields.nombre !== undefined) merged[2] = s(fields.nombre);
      // Column D — peso
      if (fields.peso !== undefined) merged[3] = s(fields.peso);
      // Column E — color
      if (fields.color !== undefined) merged[4] = s(fields.color);
      // Column F — calidad
      if (fields.calidad !== undefined) merged[5] = s(fields.calidad);
      // Column G — cantidad
      if (fields.cantidad !== undefined) merged[6] = s(fields.cantidad);
      // Column H — talla
      if (fields.talla !== undefined) merged[7] = s(fields.talla);
      // Column I — medidas
      if (fields.medidas !== undefined) merged[8] = s(fields.medidas);
      // Column J — medidasValores
      if (fields.medidasValores !== undefined)
        merged[9] = s(fields.medidasValores);
      // Column K — categoría
      if (fields.categoria !== undefined) merged[10] = s(fields.categoria);
      // Column L — precioCOP
      if (fields.precioCOP !== undefined) merged[11] = s(fields.precioCOP);
      // Column M — ubicación
      if (fields.ubicacion !== undefined) merged[12] = s(fields.ubicacion);
      // Column N — asesor
      if (fields.asesor !== undefined) merged[13] = s(fields.asesor);
      // Column O — estado
      if (fields.estado !== undefined) merged[14] = s(fields.estado);
      // Column P — qr
      if (fields.qr !== undefined) merged[15] = s(fields.qr);
      // Column Q — colección
      if (fields.coleccion !== undefined) merged[16] = s(fields.coleccion);
      // Column R — caja
      if (fields.caja !== undefined) merged[17] = s(fields.caja);
      // Column S (unused) — preserve
      // Column T — asesorActual
      if (fields.asesorActual !== undefined)
        merged[19] = s(fields.asesorActual);
      // Column U — estadoAsesor
      if (fields.estadoAsesor !== undefined)
        merged[20] = s(fields.estadoAsesor);
    }

    let writtenRow: number;
    if (willAppend) {
      // NUEVA fila. NO `values.append` (2026-08-03): con un rango abierto Sheets
      // decide dónde ancla la "tabla" y puede escribir corrido. En Inventario
      // —102 columnas de grid contra las 57 del mapa— ancló en AT, la columna A
      // quedó vacía, y como el itemId no estaba en A el push siguiente volvía a
      // appendear: 21 filas basura por 10 ítems. Fila calculada + rango CERRADO.
      const targetRange = `${targetSheet}!A${targetRow}:${lastCol}${targetRow}`;

      // La fila destino tiene que estar vacía. Esta ruta toca plata: si hay algo
      // ahí, abortamos en vez de pisarlo.
      const occupiedResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: targetRange,
      });
      const occupied = (occupiedResp.data.values?.[0] ?? []) as string[];
      if (occupied.some((c) => s(c).trim() !== '')) {
        return sendError(
          res,
          409,
          `Row ${targetRow} is not empty; refusing to overwrite it with new item "${itemId}". The sheet changed mid-write. Retry.`,
        );
      }

      // El grid puede ser más corto que la fila destino; `values.update` falla
      // fuera de rango, así que lo estiramos antes.
      await ensureRowCapacity(sheets, spreadsheetId, targetSheet, targetRow);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: targetRange,
        valueInputOption: 'USER_ENTERED', // lets numbers/dates stay typed
        requestBody: { values: [merged] },
      });
      writtenRow = targetRow;
    } else {
      // UPDATE the located row in place (regardless of the passed rowIndex).
      const writeRange = `${targetSheet}!A${foundRow}:${lastCol}${foundRow}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: writeRange,
        valueInputOption: 'USER_ENTERED', // lets numbers/dates stay typed
        requestBody: { values: [merged] },
      });
      writtenRow = foundRow;
    }

    return sendSuccess(res, {
      itemId,
      // ACTUAL physical row written — callers should cache this as the fresh
      // rowIndex hint. Differs from the requested rowIndex when the sheet drifted.
      rowIndex: writtenRow,
      requestedRowIndex: rowIndex ?? null, // echo the caller's stale hint
      sheetName: targetSheet,
      spreadsheetId,
      // The mode actually taken. `requestedMode` echoes the (now-ignored) body flag.
      mode: willAppend ? 'appended' : 'updated',
      requestedMode: mode ?? null,
      updatedAt: new Date().toISOString(),
    });
  },
  {
    methods: ['POST', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'AdminProductUpdate',
  },
);
