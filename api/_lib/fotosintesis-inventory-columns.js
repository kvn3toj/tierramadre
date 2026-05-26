/**
 * Single source of truth for the Fotosíntesis SOT "Inventario" tab layout.
 *
 * This is the column order for the SOT spreadsheet (FOTOSINTESIS_SPREADSHEET_ID)
 * ONLY. The legacy treasure sheet (SPREADSHEET_ID, read by get-treasure-sheets
 * for the public catalog) keeps its own A:U layout and is written through the
 * `target: "legacy"` branch in admin-product-update.ts — never touch it here.
 *
 * APPEND-ONLY CONTRACT: the sheet is a positional, push-only mirror holding
 * live data. Never reorder or insert a column in the middle — only append new
 * ones at the end. Index 0 is column A, index 1 is B, etc.
 *
 * Consumers (must all read from this list):
 *   - api/admin-product-update.ts   (writes a row for target="fotosintesis")
 *   - convex/products.ts pushToSheet (builds the `fields` payload)
 *   - scripts/create-fotosintesis-sot.mjs   (seeds the header row on create)
 *   - scripts/extend-fotosintesis-headers.mjs (migrates a live sheet's headers)
 *
 * `key` matches the productInventory field name and the `fields` payload key
 * sent by convex/products.ts pushToSheet. Columns flagged `preserve: true`
 * are never overwritten on a patch (their value carries through from the
 * existing sheet row) — `Item` (natural key, set explicitly) and
 * `fechaIngreso` (stamped once at first append).
 */

export const FOTO_INVENTARIO_COLUMNS = [
  // ── Legacy catalog block (A–U) — order frozen to match get-treasure-sheets ──
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
  { header: "Precio COP", key: "precioCOP" }, // L
  { header: "UBICACIÓN", key: "ubicacion" }, // M
  { header: "ASESOR", key: "asesor" }, // N
  { header: "ESTADO", key: "estado" }, // O
  { header: "QR", key: "qr" }, // P
  { header: "Colección", key: "coleccion" }, // Q
  { header: "CAJA", key: "caja" }, // R
  { header: "preponderancia", key: "preponderancia" }, // S — % of lot (Fotosíntesis)
  { header: "ASESOR ACTUAL", key: "asesorActual" }, // T
  { header: "ESTADO ASESOR", key: "estadoAsesor" }, // U
  // ── Fotosíntesis v2 extension (append-only, V onward) ──
  { header: "loteId", key: "loteId" }, // V — owning lot
  { header: "costoBaseCOP", key: "costoBaseCOP" }, // W — costoTotalCOP × preponderancia%
  { header: "mostrarEnCatalogo", key: "mostrarEnCatalogo" }, // X
  { header: "procedencia", key: "procedencia" }, // Y
  { header: "observacion", key: "observacion" }, // Z
  { header: "rendimientoEsperado", key: "rendimientoEsperado" }, // AA — bruto
  { header: "cantidadEstimada", key: "cantidadEstimada" }, // AB — bruto
  { header: "nivelRareza", key: "nivelRareza" }, // AC
  { header: "calificacion", key: "calificacion" }, // AD
  { header: "tipoEsmeralda", key: "tipoEsmeralda" }, // AE
  { header: "subtipoForm", key: "subtipoForm" }, // AF — 9-subtype selector
  { header: "tipoJoya", key: "tipoJoya" }, // AG
  { header: "tecnicaJoya", key: "tecnicaJoya" }, // AH
  { header: "minerales", key: "minerales" }, // AI — comma-joined
  { header: "complementos", key: "complementos" }, // AJ — comma-joined
  { header: "fotoUrl", key: "fotoUrl" }, // AK
  { header: "certificadoUrl", key: "certificadoUrl" }, // AL
  { header: "formulaGema", key: "formulaGema" }, // AM
  { header: "formulaJoya", key: "formulaJoya" }, // AN
  { header: "rangoDescuento", key: "rangoDescuento" }, // AO
  { header: "precioEmbajadorCOP", key: "precioEmbajadorCOP" }, // AP — x1–x4 tier
  { header: "precioConscienteCOP", key: "precioConscienteCOP" }, // AQ — x1–x4 tier
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
