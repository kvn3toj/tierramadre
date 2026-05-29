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
 * ⚠ PUSH-ONLY for the Fotosíntesis-v2 columns (everything past column X /
 * "ESTADO ASESOR"): convex/products.ts pushToSheet WRITES every column in this
 * list, but the pull validators (_upsertFromSheet / _upsertManyFromSheet) only
 * mirror the legacy A–X set back into Convex. So a hand-edit to a v2 column on
 * the sheet (precioEmbajadorCOP, precioConscienteCOP, preponderancia, loteId,
 * mostrarEnCatalogo, the form fields…) will NOT sync back — Convex is the
 * source of truth for those. Edit them through the admin UI, not the sheet.
 * (Audit F6. If two-way editing is ever needed, extend both pull validators.)
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
  // ── Price block (L–O) — kept consecutive for at-a-glance pricing ──
  { header: "Precio COP", key: "precioCOP" }, // L — base retail price
  { header: "costoBaseCOP", key: "costoBaseCOP" }, // M — costoTotalCOP × preponderancia%
  { header: "precioEmbajadorCOP", key: "precioEmbajadorCOP" }, // N — x1–x4 tier
  { header: "precioConscienteCOP", key: "precioConscienteCOP" }, // O — x1–x4 tier
  // ── Inventory / status descriptive fields (P–X) ──
  { header: "UBICACIÓN", key: "ubicacion" }, // P
  { header: "ASESOR", key: "asesor" }, // Q
  { header: "ESTADO", key: "estado" }, // R
  { header: "QR", key: "qr" }, // S
  { header: "Colección", key: "coleccion" }, // T
  { header: "CAJA", key: "caja" }, // U
  { header: "preponderancia", key: "preponderancia" }, // V — % of lot (Fotosíntesis)
  { header: "ASESOR ACTUAL", key: "asesorActual" }, // W
  { header: "ESTADO ASESOR", key: "estadoAsesor" }, // X
  // ── Fotosíntesis v2 extension (Y onward) ──
  { header: "loteId", key: "loteId" }, // Y — owning lot
  { header: "mostrarEnCatalogo", key: "mostrarEnCatalogo" }, // Z
  { header: "procedencia", key: "procedencia" }, // AA
  { header: "observacion", key: "observacion" }, // AB
  { header: "rendimientoEsperado", key: "rendimientoEsperado" }, // AC — bruto
  { header: "cantidadEstimada", key: "cantidadEstimada" }, // AD — bruto
  { header: "nivelRareza", key: "nivelRareza" }, // AE
  { header: "calificacion", key: "calificacion" }, // AF
  { header: "tipoEsmeralda", key: "tipoEsmeralda" }, // AG
  { header: "subtipoForm", key: "subtipoForm" }, // AH — 9-subtype selector
  { header: "tipoJoya", key: "tipoJoya" }, // AI
  { header: "tecnicaJoya", key: "tecnicaJoya" }, // AJ
  { header: "minerales", key: "minerales" }, // AK — comma-joined
  { header: "complementos", key: "complementos" }, // AL — comma-joined
  { header: "fotoUrl", key: "fotoUrl" }, // AM
  { header: "certificadoUrl", key: "certificadoUrl" }, // AN
  { header: "formulaGema", key: "formulaGema" }, // AO
  { header: "formulaJoya", key: "formulaJoya" }, // AP
  { header: "rangoDescuento", key: "rangoDescuento" }, // AQ
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
