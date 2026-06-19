/**
 * Single source of truth for the Fotosíntesis SOT "Inventario" tab layout.
 *
 * This is the column order for the SOT spreadsheet (FOTOSINTESIS_SPREADSHEET_ID)
 * ONLY. The legacy treasure sheet (SPREADSHEET_ID, read by get-treasure-sheets
 * for the public catalog) keeps its own A:U layout and is written through the
 * `target: "legacy"` branch in admin-product-update.ts — never touch it here.
 *
 * POSITIONAL MIRROR: the sheet is a positional, push-only mirror holding live
 * data — admin-product-update.ts rebuilds each row from this list by key, so
 * the array order IS the column order. Index 0 is column A, index 1 is B, etc.
 *
 * TWO-WAY EDITING (delta sync): convex/products.ts pushToSheet WRITES every
 * column in this list. The reverse direction (Sheet → Convex) is handled by the
 * bound Apps Script + convex/fotoSync.ts: an edit is captured per-cell and
 * synced back, restricted to the WRITABLE allowlist in convex/_lib/sheetPullMaps.ts.
 * That allowlist intentionally EXCLUDES the derived columns `costoBaseCOP` (L)
 * and `preponderancia` (U) — a sheet edit must never overwrite a figure Convex
 * computes — and treats `loteId` (X) as a FLAG field (the mirror is updated but
 * lot membership is reconciled in the app). Everything else in A–AP does sync
 * back. (Audit F6, superseded by the delta sync.)
 *
 * Changing the order (or inserting/removing a column) requires a one-time
 * migration of the live sheet so existing rows realign:
 *   - append-only widening → scripts/extend-fotosintesis-headers.mjs
 *   - reorder existing columns → scripts/reorder-fotosintesis-price-columns.mjs
 *     (uses moveDimension so each column's data + dropdowns travel with it).
 *
 * Consumers (must all read from this list):
 *   - api/admin-product-update.ts   (writes a row for target="fotosintesis")
 *   - convex/products.ts pushToSheet (builds the `fields` payload)
 *   - scripts/create-fotosintesis-sot.mjs   (seeds the header row on create)
 *   - scripts/extend-fotosintesis-headers.mjs (migrates a live sheet's headers)
 *   - scripts/reorder-fotosintesis-price-columns.mjs (one-time live reorder)
 *
 * `key` matches the productInventory field name and the `fields` payload key
 * sent by convex/products.ts pushToSheet. Columns flagged `preserve: true`
 * are never overwritten on a patch (their value carries through from the
 * existing sheet row) — `Item` (natural key, set explicitly) and
 * `fechaIngreso` (stamped once at first append).
 */

export const FOTO_INVENTARIO_COLUMNS = [
  // ── Identity + descriptive block (A–K) ──
  { header: "Item", key: "item", id: true }, // A — natural key (itemId)
  { header: "FECHA INGRESO INVENTARIO", key: "fechaIngreso", preserve: true }, // B
  { header: "Nombre", key: "nombre" }, // C
  { header: "Peso (ct)", key: "peso" }, // D
  { header: "Color", key: "color" }, // E
  { header: "Calidad", key: "calidad" }, // F
  { header: "Cant.", key: "cantidad" }, // G
  { header: "Talla", key: "talla" }, // H
  { header: "Medidas", key: "medidas" }, // I
  { header: "Medidas (valores)", key: "medidasValores" }, // J
  { header: "Categoría", key: "categoria" }, // K
  // ── Price block (L–N) — kept consecutive for at-a-glance pricing ──
  // NOTE: the legacy "Precio COP" (precioCOP) column was retired from this SOT
  // mirror on 2026-05-29 (audit: column was ~82% empty; the public price is the
  // ambassador tier in `precioEmbajadorCOP`). The `precioCOP` field still exists
  // in Convex (productInventory) as an app-only value — it is no longer mirrored
  // to or pulled from this sheet. See scripts/delete-fotosintesis-column-l.mjs.
  { header: "costoBaseCOP", key: "costoBaseCOP" }, // L — costoTotalCOP × preponderancia%
  { header: "precioEmbajadorCOP", key: "precioEmbajadorCOP" }, // M — x1–x4 tier
  { header: "precioConscienteCOP", key: "precioConscienteCOP" }, // N — x1–x4 tier
  // ── Inventory / status descriptive fields (O–W) ──
  { header: "UBICACIÓN", key: "ubicacion" }, // O
  { header: "ASESOR", key: "asesor" }, // P
  { header: "ESTADO", key: "estado" }, // Q
  { header: "QR", key: "qr" }, // R
  { header: "Colección", key: "coleccion" }, // S
  { header: "CAJA", key: "caja" }, // T
  { header: "preponderancia", key: "preponderancia" }, // U — % of lot (Fotosíntesis)
  { header: "ASESOR ACTUAL", key: "asesorActual" }, // V
  { header: "ESTADO ASESOR", key: "estadoAsesor" }, // W
  // ── Fotosíntesis v2 extension (X onward) ──
  { header: "loteId", key: "loteId" }, // X — owning lot
  { header: "mostrarEnCatalogo", key: "mostrarEnCatalogo" }, // Y
  { header: "procedencia", key: "procedencia" }, // Z
  { header: "observacion", key: "observacion" }, // AA
  { header: "rendimientoEsperado", key: "rendimientoEsperado" }, // AB — bruto
  { header: "cantidadEstimada", key: "cantidadEstimada" }, // AC — bruto
  { header: "nivelRareza", key: "nivelRareza" }, // AD
  { header: "calificacion", key: "calificacion" }, // AE
  { header: "tipoEsmeralda", key: "tipoEsmeralda" }, // AF
  { header: "subtipoForm", key: "subtipoForm" }, // AG — 9-subtype selector
  { header: "tipoJoya", key: "tipoJoya" }, // AH
  { header: "tecnicaJoya", key: "tecnicaJoya" }, // AI
  { header: "minerales", key: "minerales" }, // AJ — comma-joined
  { header: "complementos", key: "complementos" }, // AK — comma-joined
  { header: "fotoUrl", key: "fotoUrl" }, // AL
  { header: "certificadoUrl", key: "certificadoUrl" }, // AM
  { header: "formulaGema", key: "formulaGema" }, // AN
  { header: "formulaJoya", key: "formulaJoya" }, // AO
  { header: "rangoDescuento", key: "rangoDescuento" }, // AP
];

/** Ordered header labels (row 1 of the Inventario tab). */
export const FOTO_INVENTARIO_HEADERS = FOTO_INVENTARIO_COLUMNS.map(
  (c) => c.header,
);

/** Convert a 0-based column index to its A1 letter (0→A, 25→Z, 26→AA…). */
export function columnIndexToLetter(index) {
  let n = index;
  let letter = "";
  do {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

/** Rightmost column letter for the full Inventario layout (e.g. "AQ"). */
export const FOTO_INVENTARIO_LAST_COL = columnIndexToLetter(
  FOTO_INVENTARIO_COLUMNS.length - 1,
);
