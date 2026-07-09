/**
 * Per-table config for the generic /api/admin-table-update endpoint.
 *
 * The `columns` array MUST match the Convex side's COLUMN_MAPS in
 * convex/_lib/columnMaps.ts. A drift between these two declarations is
 * the most likely failure mode for Fotosíntesis sync — verify with the
 * scripts/verify-column-maps.ts checker before merging schema changes.
 *
 * `sheetTabPatterns` is fed to findSheetByPattern (case-insensitive
 * partial match). `idColumn` is the column name that serves as the
 * natural key — column A of the sheet. On `mode: "patch"` we sanity
 * check that column A of the target row matches `idValue` before
 * overwriting.
 *
 * `lastColumnLetter` defines the rightmost column included in the
 * range (`A:lastColumnLetter`); add columns by extending `columns` AND
 * bumping this letter.
 */

export type FotoTable =
  | 'providers'
  | 'lots'
  | 'clients'
  | 'sales'
  | 'subLotes'
  | 'movimientosAsesor';

export interface TableConfig {
  sheetTabPatterns: string[];
  columns: string[];
  idColumn: string;
  lastColumnLetter: string;
}

export const TABLE_CONFIGS: Record<FotoTable, TableConfig> = {
  providers: {
    sheetTabPatterns: ['proveedores', 'providers'],
    columns: [
      'nombreORazonSocial',
      'nit',
      'cedula',
      'direccion',
      'telefono',
      'email',
      'tipo',
      'notas',
    ],
    idColumn: 'nombreORazonSocial',
    lastColumnLetter: 'H',
  },
  lots: {
    sheetTabPatterns: ['lotes', 'lots'],
    columns: [
      'loteId',
      'providerNombre',
      'fechaRecepcion',
      'pesoTotalQuilates',
      'costoTotalCOP',
      'unidadesDeclaradas',
      'formaPago',
      'metodoContado',
      'fechaVencimiento',
      'numeroCuotas',
      'numeroFactura',
      'urlFactura',
      'notas',
      'estado', // N
      // ── Fotosíntesis form fields (append-only, O onward) ──
      'renombreLote', // O
      'tratamiento', // P
      'mina', // Q
      'sede', // R
      'operadorNombre', // S
      'operadorRol', // T
    ],
    idColumn: 'loteId',
    lastColumnLetter: 'T',
  },
  clients: {
    sheetTabPatterns: ['clientes', 'clients'],
    columns: [
      'nombre',
      'nit',
      'cedula',
      'direccion',
      'telefono',
      'email',
      'tipo',
      'asesorId',
    ],
    idColumn: 'nombre',
    lastColumnLetter: 'H',
  },
  sales: {
    sheetTabPatterns: ['ventas', 'sales'],
    columns: [
      'saleId',
      'fechaVenta',
      'itemIdsJoined',
      'clientNombre',
      'precioAcordadoCOP',
      'descuentoCOP',
      'totalCOP',
      'comisionCOP',
      'formaPago',
      'metodoContado',
      'fechaVencimiento',
      'numeroCuotas',
      'carnetUrl',
      'certificadoUrl',
      'estado',
    ],
    idColumn: 'saleId',
    lastColumnLetter: 'O',
  },
  subLotes: {
    sheetTabPatterns: ['sublotes', 'sub-lotes', 'sublotes (sale-bundles)'],
    columns: [
      'subLoteId',
      'parentLoteId',
      'sede',
      'nombre',
      'itemIdsJoined',
      'unidades',
      'totalCostoCOP',
      'estado',
      'notas',
      'createdAt',
    ],
    idColumn: 'subLoteId',
    lastColumnLetter: 'J',
  },
  // Kardex de movimientos con asesores — append-only (see convex/asesorMovements.ts).
  movimientosAsesor: {
    sheetTabPatterns: [
      'movimientos asesor',
      'movimientos',
      'movimientosasesor',
    ],
    columns: [
      'movimientoId',
      'fecha',
      'tipo',
      'itemId',
      'itemNombre',
      'asesorNombre',
      'cantidad',
      'precio',
      'estadoAnterior',
      'estadoNuevo',
      'registradoPor',
      'entregadoPorNombre',
      'condicion',
      'kardexEventId',
      'notas',
    ],
    idColumn: 'movimientoId',
    lastColumnLetter: 'O',
  },
};

export function isFotoTable(x: unknown): x is FotoTable {
  return (
    x === 'providers' ||
    x === 'lots' ||
    x === 'clients' ||
    x === 'sales' ||
    x === 'subLotes' ||
    x === 'movimientosAsesor'
  );
}
