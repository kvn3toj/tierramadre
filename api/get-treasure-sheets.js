/**
 * Vercel Serverless Function - Get Treasure from Google Sheets
 *
 * This endpoint reads the treasure data from a Google Sheet
 * and returns it as JSON for the app to consume.
 */

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

/**
 * Parse weight - can be carats or metal type
 */
function parsePeso(peso) {
  if (!peso) return { value: 0, isJewelry: false };
  const pesoStr = String(peso).trim().toLowerCase();

  if (pesoStr.includes('plata')) {
    return { value: 'Plata', isJewelry: true, metalType: 'Plata' };
  }
  if (pesoStr.includes('oro')) {
    return { value: 'Oro 18k', isJewelry: true, metalType: 'Oro 18k' };
  }

  const numValue = parseFloat(String(peso).replace(',', '.'));
  return { value: isNaN(numValue) ? peso : numValue, isJewelry: false };
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
};

/**
 * Map row data to treasure item using exact header matching
 */
function mapRowToTreasureItem(row, headers) {
  const normalizedHeaders = headers.map(normalizeHeader);

  // Find column index by exact header match (case-insensitive)
  const getColumnIndex = (headerName) => {
    const search = headerName.toLowerCase().trim();
    return normalizedHeaders.findIndex(h => h === search);
  };

  // Get value by header name (exact match)
  const getValue = (headerName) => {
    const index = getColumnIndex(headerName);
    if (index >= 0 && row[index] !== undefined && row[index] !== '') {
      return row[index];
    }
    return null;
  };

  // Fallback to index if header not found
  const getByIndex = (index) => {
    return row[index] !== undefined && row[index] !== '' ? row[index] : null;
  };

  const peso = getValue(INVENTARIO_HEADERS.PESO) || getByIndex(3);
  const pesoData = parsePeso(peso);

  return {
    item: parseInt(getValue(INVENTARIO_HEADERS.ITEM) || getByIndex(0) || 0),
    fechaIngreso: getValue(INVENTARIO_HEADERS.FECHA_INGRESO) || getByIndex(1) || '',
    nombre: getValue(INVENTARIO_HEADERS.NOMBRE) || getByIndex(2) || '',
    peso: typeof pesoData.value === 'number' ? pesoData.value : parseDecimal(peso),
    color: getValue(INVENTARIO_HEADERS.COLOR) || getByIndex(4) || '',
    calidad: getValue(INVENTARIO_HEADERS.CALIDAD) || getByIndex(5) || '',
    cantidad: parseInt(getValue(INVENTARIO_HEADERS.CANTIDAD) || getByIndex(6) || 1),
    talla: getValue(INVENTARIO_HEADERS.TALLA) || getByIndex(7) || '',
    medidas: getValue(INVENTARIO_HEADERS.MEDIDAS) || getByIndex(8) || '',
    medidasValores: getByIndex(9) || '',
    categoria: getValue(INVENTARIO_HEADERS.CATEGORIA) || getByIndex(10) || '',
    precioCOP: parsePrice(getValue(INVENTARIO_HEADERS.PRECIO_COP) || getByIndex(11)),
    precioInternacional: 0,
    ubicacion: getValue(INVENTARIO_HEADERS.UBICACION) || getByIndex(12) || '',
    asesor: getValue(INVENTARIO_HEADERS.ASESOR) || getByIndex(13) || '',
    estado: (getValue(INVENTARIO_HEADERS.ESTADO) || getByIndex(14) || 'DISPONIBLE').toUpperCase(),
    qr: getValue(INVENTARIO_HEADERS.QR) || getByIndex(15) || '',
    coleccion: getValue(INVENTARIO_HEADERS.COLECCION) || getByIndex(16) || '',
    caja: getValue(INVENTARIO_HEADERS.CAJA) || getByIndex(17) || '',
    isJewelry: pesoData.isJewelry,
    metalType: pesoData.metalType,
  };
}

/**
 * Fetch pricing data from CUALIFICACION-PRECIO sheet
 */
async function fetchPricingData(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'CUALIFICACION -PRECIO'!A:J",
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return {};

    const pricingMap = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const itemNum = parseInt(row[0]);
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
  } catch (error) {
    console.warn('Could not fetch pricing data:', error.message);
    return {};
  }
}

export default withApiHandler(async (req, res, { sheets }) => {
  const sheetNames = await getSheetNames(sheets);
  const targetSheet = findSheetByPattern(sheetNames, ['inventario', 'inventory']) || sheetNames[0];

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
    .filter(row => row.length > 0 && row.some(cell => cell))
    .map(row => {
      const item = mapRowToTreasureItem(row, headers);
      // Only add precioInternacional from CUALIFICACION sheet (precioCOP comes from Inventario column L)
      const pricing = pricingMap[item.item];
      if (pricing) {
        item.precioInternacional = pricing.precioInternacional;
      }
      return item;
    })
    .filter(item => item.item > 0);

  const sampleRow = dataRows[0] || [];
  const pricingCount = Object.keys(pricingMap).length;

  return sendSuccess(res, {
    treasure,
    count: treasure.length,
    sheetName: targetSheet,
    lastUpdated: new Date().toISOString(),
    _debug: {
      headers: headers.map((h, i) => `${String.fromCharCode(65 + i)}: ${h}`),
      sampleValues: sampleRow.slice(0, 16).map((v, i) => `${String.fromCharCode(65 + i)}: ${v}`),
      pricingItemsFound: pricingCount,
    },
  });
}, { methods: ['GET', 'OPTIONS'], cache: CACHE.NONE, provideSheets: true, errorPrefix: 'GetTreasureSheets' });
