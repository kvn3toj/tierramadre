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
 *    api/_lib/fotosintesis-inventory-columns.js (A:AQ today). The price
 *    fields are grouped right after Precio COP (L): costoBaseCOP (M),
 *    precioEmbajadorCOP (N), precioConscienteCOP (O); the remaining
 *    Fotosíntesis form fields (preponderancia, loteId, photos, minerals,
 *    etc.) follow from V onward. Run scripts/extend-fotosintesis-headers.mjs
 *    to widen a fresh sheet, or scripts/reorder-fotosintesis-price-columns.mjs
 *    to migrate an existing one after a column-order change.
 *
 * Strategy: read the current row first to preserve fields we don't edit
 * (notably `fechaIngreso` in column B). Then write the merged row back via
 * values.update over the layout's full range.
 */

import type { sheets_v4 } from "@googleapis/sheets";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  withApiHandler,
  SPREADSHEET_ID,
  FOTOSINTESIS_SPREADSHEET_ID,
  sendError,
  sendSuccess,
  getSheetNames,
  findSheetByPattern,
} from "./_lib/index.js";
import {
  FOTO_INVENTARIO_COLUMNS,
  FOTO_INVENTARIO_LAST_COL,
} from "./_lib/fotosintesis-inventory-columns.js";

type FotoColumn = {
  header: string;
  key: string;
  id?: boolean;
  preserve?: boolean;
};
const FOTO_COLUMNS = FOTO_INVENTARIO_COLUMNS as FotoColumn[];

interface UpdateBody {
  itemId?: string;
  rowIndex?: number;
  /** patch = update existing row; append reserved for future use */
  mode?: "patch" | "append";
  /** legacy = treasure sheet; fotosintesis = SOT Inventario when loteId set */
  target?: "legacy" | "fotosintesis";
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
    precioEmbajadorCOP?: string | number;
    precioConscienteCOP?: string | number;
  };
}

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
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
      (req.headers["x-admin-sync-token"] as string | undefined) ?? undefined;
    if (!expectedToken) {
      return sendError(
        res,
        500,
        "ADMIN_SYNC_TOKEN not configured on the server",
      );
    }
    if (!providedToken || providedToken !== expectedToken) {
      return sendError(res, 401, "Unauthorized");
    }

    const body = (req.body ?? {}) as UpdateBody;
    const { itemId, rowIndex, fields, mode, target, loteId } = body;
    if (!itemId || !rowIndex || !fields) {
      return sendError(res, 400, "Missing itemId, rowIndex, or fields");
    }
    if (!Number.isInteger(rowIndex) || rowIndex < 2) {
      return sendError(res, 400, "rowIndex must be an integer ≥ 2");
    }

    // Fotosíntesis items (loteId set) write to the SOT spreadsheet using the
    // full Inventario layout; everything else writes the legacy treasure
    // sheet, whose A:U layout is read by get-treasure-sheets and must NOT
    // change. `isFoto` picks the target + column strategy accordingly.
    const isFoto = target === "fotosintesis" || Boolean(loteId);
    const spreadsheetId = isFoto ? FOTOSINTESIS_SPREADSHEET_ID : SPREADSHEET_ID;

    const { sheets } = ctx as { sheets: sheets_v4.Sheets };
    const sheetNames = await getSheetNames(sheets, spreadsheetId);
    const targetSheet =
      findSheetByPattern(sheetNames, ["inventario", "inventory"]) ||
      sheetNames[0];

    const fieldMap = fields as Record<string, unknown>;
    // Range spans the full layout for the SOT (A:AQ today), the frozen A:U
    // for the legacy sheet. The extra SOT columns are seeded by
    // scripts/extend-fotosintesis-headers.mjs before this endpoint targets them.
    const lastCol = isFoto ? FOTO_INVENTARIO_LAST_COL : "U";
    const range = `${targetSheet}!A${rowIndex}:${lastCol}${rowIndex}`;
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
        `Row ${rowIndex} is item "${sheetItemId}", not "${itemId}". The sheet may have been re-ordered. Resync from sheet before retrying.`,
      );
    }

    let merged: string[];
    if (isFoto) {
      // SOT: drive the row entirely from the shared column map so the order
      // never drifts from create-fotosintesis-sot.mjs / the migration script.
      merged = new Array(FOTO_COLUMNS.length).fill("");
      for (let i = 0; i < FOTO_COLUMNS.length; i++) {
        merged[i] = s(existingRow[i] ?? ""); // preserve untouched columns
      }
      for (let i = 0; i < FOTO_COLUMNS.length; i++) {
        const col = FOTO_COLUMNS[i];
        if (col.id) {
          merged[i] = String(itemId); // column A — natural key
        } else if (col.preserve) {
          continue; // e.g. fechaIngreso (B) — carry the existing value through
        } else if (col.key in fieldMap && fieldMap[col.key] !== undefined) {
          merged[i] = s(fieldMap[col.key]);
        }
      }
    } else {
      // Legacy treasure sheet — positional A:U (unchanged behavior).
      merged = new Array(21).fill("");
      for (let i = 0; i < 21; i++) {
        merged[i] = s(existingRow[i] ?? "");
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

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED", // lets numbers/dates stay typed
      requestBody: { values: [merged] },
    });

    return sendSuccess(res, {
      itemId,
      rowIndex,
      sheetName: targetSheet,
      spreadsheetId,
      mode: mode ?? "patch",
      updatedAt: new Date().toISOString(),
    });
  },
  {
    methods: ["POST", "OPTIONS"],
    provideSheets: true,
    errorPrefix: "AdminProductUpdate",
  },
);
