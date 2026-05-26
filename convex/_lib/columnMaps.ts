/**
 * Column order for each Fotosíntesis v2 sheet tab.
 *
 * The order in these arrays is the order columns appear in Sheets — A is
 * index 0, B is index 1, etc. Both Convex (when marshaling row data
 * before pushing) and Vercel (when receiving the push and writing the
 * row) read from this list, so they MUST stay aligned with `idColumn` in
 * api/_lib/admin-table-config.ts.
 *
 * Adding a column: append to the array AND extend the corresponding tab
 * in the spreadsheet AND update TABLE_CONFIGS on the Vercel side.
 *
 * `id` placeholder columns (loteId, saleId) live at index 0 and serve as
 * the natural-key safety check on patch operations (column A must match
 * the document being updated).
 */

export type FotoTable = "providers" | "lots" | "clients" | "sales" | "subLotes";

export const COLUMN_MAPS: Record<FotoTable, readonly string[]> = {
  providers: [
    "nombreORazonSocial", // A — natural key for proveedores
    "nit",
    "cedula",
    "direccion",
    "telefono",
    "email",
    "tipo",
    "notas",
  ],
  lots: [
    "loteId", // A — natural key
    "providerNombre", // B — denormalized at push time
    "fechaRecepcion",
    "pesoTotalQuilates",
    "costoTotalCOP",
    "unidadesDeclaradas",
    "formaPago",
    "metodoContado",
    "fechaVencimiento",
    "numeroCuotas",
    "numeroFactura",
    "urlFactura",
    "notas",
    "estado", // N
    // ── Fotosíntesis form fields (append-only, O onward) ──
    "renombreLote", // O — alias interno
    "tratamiento", // P
    "mina", // Q
    "sede", // R — bóveda / loteId prefix
    "operadorNombre", // S
    "operadorRol", // T
  ],
  clients: [
    "nombre", // A — natural key
    "nit",
    "cedula",
    "direccion",
    "telefono",
    "email",
    "tipo",
    "asesorId",
  ],
  sales: [
    "saleId", // A — natural key
    "fechaVenta",
    "itemIdsJoined", // denormalized at push time (comma-separated)
    "clientNombre", // denormalized at push time
    "precioAcordadoCOP",
    "descuentoCOP",
    "totalCOP",
    "comisionCOP",
    "formaPago",
    "metodoContado",
    "fechaVencimiento",
    "numeroCuotas",
    "carnetUrl",
    "certificadoUrl",
    "estado",
  ],
  subLotes: [
    "subLoteId", // A — natural key
    "parentLoteId", // B — FK to lots.loteId
    "sede", // C
    "nombre", // D
    "itemIdsJoined", // E — denormalized at push time (comma-separated)
    "unidades", // F — derived
    "totalCostoCOP", // G — derived
    "estado", // H
    "notas", // I
    "createdAt", // J
  ],
} as const;

export function marshalRow(
  table: FotoTable,
  row: Record<string, unknown>,
): Record<string, string> {
  const cols = COLUMN_MAPS[table];
  const out: Record<string, string> = {};
  for (const col of cols) {
    const v = row[col];
    out[col] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}
