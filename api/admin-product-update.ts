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
 * Sheet column layout (must match get-treasure-sheets.ts):
 *   A item       B fechaIngreso       C nombre        D peso (ct)
 *   E color      F calidad            G cantidad      H talla
 *   I medidas    J medidasValores     K categoría     L precioCOP
 *   M ubicación  N asesor             O estado        P qr
 *   Q colección  R caja               S (unused)      T asesorActual
 *   U estadoAsesor
 *
 * Strategy: read the current row first to preserve fields we don't edit
 * (notably `fechaIngreso` in column B and the unused column S). Then
 * write the merged row back via values.update on `Inventario!A{n}:U{n}`.
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

interface UpdateBody {
  itemId?: string;
  rowIndex?: number;
  /** patch = update existing row; append reserved for future use */
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
  };
}

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse, ctx: Record<string, unknown>) => {
    // Shared-secret auth (Convex action ↔ Vercel)
    const expectedToken = process.env.ADMIN_SYNC_TOKEN;
    const providedToken =
      (req.headers['x-admin-sync-token'] as string | undefined) ?? undefined;
    if (!expectedToken) {
      return sendError(
        res,
        500,
        'ADMIN_SYNC_TOKEN not configured on the server'
      );
    }
    if (!providedToken || providedToken !== expectedToken) {
      return sendError(res, 401, 'Unauthorized');
    }

    const body = (req.body ?? {}) as UpdateBody;
    const { itemId, rowIndex, fields, mode, target, loteId } = body;
    if (!itemId || !rowIndex || !fields) {
      return sendError(res, 400, 'Missing itemId, rowIndex, or fields');
    }
    if (!Number.isInteger(rowIndex) || rowIndex < 2) {
      return sendError(res, 400, 'rowIndex must be an integer ≥ 2');
    }

    const spreadsheetId =
      target === 'fotosintesis' || loteId
        ? FOTOSINTESIS_SPREADSHEET_ID
        : SPREADSHEET_ID;

    const { sheets } = ctx as { sheets: sheets_v4.Sheets };
    const sheetNames = await getSheetNames(sheets, spreadsheetId);
    const targetSheet =
      findSheetByPattern(sheetNames, ['inventario', 'inventory']) || sheetNames[0];

    // Read the existing row so we preserve untouched columns (notably B / S)
    const range = `${targetSheet}!A${rowIndex}:U${rowIndex}`;
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const existingRow = (existing.data.values?.[0] ?? []) as string[];

    // Sanity-check: column A of the sheet row must match the itemId we're updating
    const sheetItemId = s(existingRow[0]).trim();
    if (sheetItemId && sheetItemId !== String(itemId)) {
      return sendError(
        res,
        409,
        `Row ${rowIndex} is item "${sheetItemId}", not "${itemId}". The sheet may have been re-ordered. Resync from sheet before retrying.`
      );
    }

    // Build the merged row (positional, A through U)
    // Untouched columns fall through from existingRow.
    const merged: string[] = new Array(21).fill('');
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
    if (fields.medidasValores !== undefined) merged[9] = s(fields.medidasValores);
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
    if (fields.asesorActual !== undefined) merged[19] = s(fields.asesorActual);
    // Column U — estadoAsesor
    if (fields.estadoAsesor !== undefined) merged[20] = s(fields.estadoAsesor);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED', // lets numbers/dates stay typed
      requestBody: { values: [merged] },
    });

    return sendSuccess(res, {
      itemId,
      rowIndex,
      sheetName: targetSheet,
      spreadsheetId,
      mode: mode ?? 'patch',
      updatedAt: new Date().toISOString(),
    });
  },
  {
    methods: ['POST', 'OPTIONS'],
    provideSheets: true,
    errorPrefix: 'AdminProductUpdate',
  }
);
