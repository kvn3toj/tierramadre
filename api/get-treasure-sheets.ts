/**
 * Vercel Serverless Function - Get Treasure from Google Sheets
 *
 * Response body mirrors frontend `TreasureItem` (see src/types/index.ts).
 */

import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { TreasureItem, TreasureStatus } from '../src/types/index.ts';
import {
  withApiHandler,
  sendError,
  sendSuccess,
  CACHE,
  SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  normalizeHeader,
  parsePrice,
  parseDecimal,
} from './_lib/index.js';

type PesoParsed =
  | { value: number | string; isJewelry: true; metalType: 'Plata' | 'Oro 18k' }
  | { value: number | string; isJewelry: false; metalType?: undefined };

/**
 * Parse weight - can be carats or metal type
 */
function parsePeso(peso: string | number | null | undefined): PesoParsed {
  if (!peso) return { value: 0, isJewelry: false };
  const pesoStr = String(peso).trim().toLowerCase();

  if (pesoStr.includes('plata')) {
    return { value: 'Plata', isJewelry: true, metalType: 'Plata' };
  }
  if (pesoStr.includes('oro')) {
    return { value: 'Oro 18k', isJewelry: true, metalType: 'Oro 18k' };
  }

  const numValue = parseFloat(String(peso).replace(',', '.'));
  return { value: Number.isNaN(numValue) ? peso : numValue, isJewelry: false };
}

/**
 * Inventario Sheet Column Headers (EXACT MATCH)
 * Source: Google Sheets Inventario - Row 1
 *
 * A = Item (0)
 * B = FECHA INGRESO INVENTARIO (1)
 * C = Nombre (2)
 * D = Peso (ct) (3)
 * E = Color (4)
 * F = Calidad (5)
 * G = Cant. (6)
 * H = Talla (7)
 * I = Medidas (8)
 * J = Medidas (9) - valores
 * K = Categoría (10) - product category (e.g., Anillo en Plata, Aretes, Topitos)
 * L = Precio COP (11)
 * M = UBICACIÓN (12)
 * N = ASESOR (13)
 * O = ESTADO (14)
 * P = QR (15)
 * Q = Colección (16)
 * R = CAJA (17)
 * S = (18) - unused
 * T = ASESOR ACTUAL (19) - current product owner (overrides N for ownership)
 * U = ESTADO ASESOR (20) - state from current owner's perspective
 */
const INVENTARIO_HEADERS = {
  ITEM: 'item',
  FECHA_INGRESO: 'fecha ingreso inventario',
  NOMBRE: 'nombre',
  PESO: 'peso (ct)',
  COLOR: 'color',
  CALIDAD: 'calidad',
  CANTIDAD: 'cant.',
  TALLA: 'talla',
  MEDIDAS: 'medidas',
  CATEGORIA: 'categoría',
  PRECIO_COP: 'precio cop',
  UBICACION: 'ubicación',
  ASESOR: 'asesor',
  ESTADO: 'estado',
  QR: 'qr',
  COLECCION: 'colección',
  CAJA: 'caja',
  ASESOR_ACTUAL: 'asesor actual', // Column T (index 19)
  ESTADO_ASESOR: 'estado asesor', // Column U (index 20)
};

// Jewelry subcategory values from Column K (synced with CATEGORY_SUBCATEGORIES.joyas in gallery-constants.ts)
const JEWELRY_CATEGORIES = new Set([
  'anillo en plata',
  'aretes',
  'topitos',
  'pulsera',
  'dije',
  'anillo en oro',
]);

/**
 * Map row data to treasure item using exact header matching
 */
function mapRowToTreasureItem(row: string[], headers: string[]): TreasureItem {
  const normalizedHeaders = headers.map(normalizeHeader);

  // Find column index by exact header match (case-insensitive)
  const getColumnIndex = (headerName: string) => {
    const search = headerName.toLowerCase().trim();
    return normalizedHeaders.findIndex((h) => h === search);
  };

  // Get value by header name (exact match)
  const getValue = (headerName: string): string | null => {
    const index = getColumnIndex(headerName);
    if (index >= 0 && row[index] !== undefined && row[index] !== '') {
      return String(row[index]);
    }
    return null;
  };

  // Fallback to index if header not found
  const getByIndex = (index: number): string | null => {
    return row[index] !== undefined && row[index] !== ''
      ? String(row[index])
      : null;
  };

  const peso = getValue(INVENTARIO_HEADERS.PESO) || getByIndex(3);
  const pesoData = parsePeso(peso);

  const item: TreasureItem = {
    item: parseInt(
      String(getValue(INVENTARIO_HEADERS.ITEM) || getByIndex(0) || '0'),
      10,
    ),
    fechaIngreso:
      getValue(INVENTARIO_HEADERS.FECHA_INGRESO) || getByIndex(1) || '',
    nombre: getValue(INVENTARIO_HEADERS.NOMBRE) || getByIndex(2) || '',
    peso:
      typeof pesoData.value === 'number'
        ? pesoData.value
        : parseDecimal(peso ?? ''),
    color: getValue(INVENTARIO_HEADERS.COLOR) || getByIndex(4) || '',
    calidad: getValue(INVENTARIO_HEADERS.CALIDAD) || getByIndex(5) || '',
    cantidad: parseInt(
      String(getValue(INVENTARIO_HEADERS.CANTIDAD) || getByIndex(6) || '1'),
      10,
    ),
    talla: getValue(INVENTARIO_HEADERS.TALLA) || getByIndex(7) || '',
    medidas: getValue(INVENTARIO_HEADERS.MEDIDAS) || getByIndex(8) || '',
    medidasValores: getByIndex(9) || '',
    categoria: (
      getValue(INVENTARIO_HEADERS.CATEGORIA) ||
      getByIndex(10) ||
      ''
    ).trim(),
    precioCOP: parsePrice(
      getValue(INVENTARIO_HEADERS.PRECIO_COP) || getByIndex(11),
    ),
    precioInternacional: 0,
    ubicacion: getValue(INVENTARIO_HEADERS.UBICACION) || getByIndex(12) || '',
    asesor: getValue(INVENTARIO_HEADERS.ASESOR) || getByIndex(13) || '',
    estado: (
      getValue(INVENTARIO_HEADERS.ESTADO) ||
      getByIndex(14) ||
      'DISPONIBLE'
    ).toUpperCase() as TreasureStatus,
    qr: getValue(INVENTARIO_HEADERS.QR) || getByIndex(15) || '',
    coleccion: getValue(INVENTARIO_HEADERS.COLECCION) || getByIndex(16) || '',
    caja: getValue(INVENTARIO_HEADERS.CAJA) || getByIndex(17) || '',
    asesorActual:
      getValue(INVENTARIO_HEADERS.ASESOR_ACTUAL) || getByIndex(19) || '',
    estadoAsesor: (
      getValue(INVENTARIO_HEADERS.ESTADO_ASESOR) ||
      getByIndex(20) ||
      ''
    ).toUpperCase() as TreasureStatus | '',
    isJewelry: pesoData.isJewelry,
    ...(pesoData.metalType ? { metalType: pesoData.metalType } : {}),
  };

  // Also flag as jewelry if categoria matches a known jewelry subcategory (e.g. items with numeric peso)
  if (
    !item.isJewelry &&
    item.categoria &&
    JEWELRY_CATEGORIES.has(item.categoria.toLowerCase().trim())
  ) {
    item.isJewelry = true;
  }

  return item;
}

type PricingRow = { precioCOP: number; precioInternacional: number };

/**
 * Fetch pricing data from CUALIFICACION-PRECIO sheet
 */
async function fetchPricingData(
  sheets: sheets_v4.Sheets,
): Promise<Record<number, PricingRow>> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'CUALIFICACION -PRECIO'!A:J",
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return {};

    const pricingMap: Record<number, PricingRow> = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const itemNum = parseInt(String(row[0]), 10);
      if (isNaN(itemNum) || itemNum <= 0) continue;

      const precioInternacional = parsePrice(row[7]);
      const precioNacional = parsePrice(row[9]);

      if (precioInternacional > 0 || precioNacional > 0) {
        pricingMap[itemNum] = {
          precioCOP: precioNacional > 0 ? precioNacional : precioInternacional,
          precioInternacional: precioInternacional,
        };
      }
    }

    return pricingMap;
  } catch (error: unknown) {
    console.warn(
      'Could not fetch pricing data:',
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    const { sheets } = ctx as { sheets: sheets_v4.Sheets };
    const sheetNames = await getSheetNames(sheets);
    const targetSheet =
      findSheetByPattern(sheetNames, ['inventario', 'inventory']) ||
      sheetNames[0];

    // Fetch treasure and pricing data in parallel
    const [treasureResponse, pricingMap] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${targetSheet}!A:Z`,
      }),
      fetchPricingData(sheets),
    ]);

    const rows = treasureResponse.data.values;

    if (!rows || rows.length === 0) {
      return sendSuccess(res, {
        treasure: [],
        message: 'No data found in spreadsheet',
      });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const treasure = dataRows
      // Capture each data row's TRUE 1-based physical sheet row BEFORE any
      // compaction. rows[0] is the header (physical row 1), so dataRows[idx]
      // is rows[idx + 1] → physical row idx + 2. Threading this through the
      // filter/map below keeps the real row number even after blank/invalid
      // rows are dropped, which is what the Convex sync bridge relies on.
      .map((row, idx) => ({ row, sheetRow: idx + 2 }))
      .filter(({ row }) => row.length > 0 && row.some((cell) => cell))
      .map(({ row, sheetRow }) => {
        const item = mapRowToTreasureItem(
          row.map((c) => (c == null ? '' : String(c))) as string[],
          (headers as string[]).map((c) => String(c)),
        );
        // Preserve the original physical sheet row (never reordered/reindexed).
        item.sheetRow = sheetRow;
        // Only add precioInternacional from CUALIFICACION sheet (precioCOP comes from Inventario column L)
        const pricing = pricingMap[item.item];
        if (pricing) {
          item.precioInternacional = pricing.precioInternacional;
        }
        return item;
      })
      .filter((item) => item.item > 0);

    const sampleRow = dataRows[0] || [];
    const pricingCount = Object.keys(pricingMap).length;

    // The _debug block exposes the sheet's header labels + the first row's raw cell
    // values to the client. Useful for column-mapping diagnostics, but it leaks the
    // internal sheet layout to every catalog visitor, so gate it behind an explicit
    // `?debug=1` AND a non-production environment.
    const includeDebug =
      Boolean(req.query.debug) && process.env.NODE_ENV !== 'production';

    return sendSuccess(res, {
      treasure,
      count: treasure.length,
      sheetName: targetSheet,
      lastUpdated: new Date().toISOString(),
      ...(includeDebug
        ? {
            _debug: {
              headers: headers.map(
                (h, i) => `${String.fromCharCode(65 + i)}: ${h}`,
              ),
              sampleValues: sampleRow
                .slice(0, 21)
                .map((v, i) => `${String.fromCharCode(65 + i)}: ${v}`),
              pricingItemsFound: pricingCount,
            },
          }
        : {}),
    });
  },
  {
    methods: ['GET', 'OPTIONS'],
    cache: CACHE.NONE,
    provideSheets: true,
    errorPrefix: 'GetTreasureSheets',
  },
);
