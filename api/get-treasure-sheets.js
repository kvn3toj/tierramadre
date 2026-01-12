/**
 * Vercel Serverless Function - Get Treasure from Google Sheets
 *
 * This endpoint reads the treasure data from a Google Sheet
 * and returns it as JSON for the app to consume.
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  initApi,
  sendError,
  sendSuccess,
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
 * Map row data to treasure item
 *
 * Column structure:
 * A = Item (0), B = FECHA INGRESO (1), C = Nombre (2), D = Peso (ct) (3),
 * E = Color (4), F = Calidad (5), G = Cant. (6), H = Talla (7),
 * I = Medidas tipo (8), J = Medidas valores (9), K = Imagen (10) - DEPRECATED,
 * L = Precio COP (11), M = UBICACION (12), N = ASESOR (13), O = ESTADO (14),
 * P = QR (15), Q = Coleccion (16), R = CAJA (17)
 *
 * NOTE: imageUrl from column K is FALLBACK. Primary images come from Google Drive.
 */
function mapRowToTreasureItem(row, headers) {
  const normalizedHeaders = headers.map(normalizeHeader);

  const getValue = (...columnNames) => {
    for (const columnName of columnNames) {
      const search = columnName.toLowerCase().trim();
      const index = normalizedHeaders.findIndex(header => {
        if (!header) return false;
        if (header === search) return true;
        if (search.includes(' ')) {
          return header.includes(search) || header === search;
        }
        return header.includes(search) || search.includes(header);
      });
      if (index >= 0 && row[index] !== undefined && row[index] !== '') {
        return row[index];
      }
    }
    return null;
  };

  const getByIndex = (index) => {
    return row[index] !== undefined && row[index] !== '' ? row[index] : null;
  };

  const peso = getValue('peso', 'peso ct', 'peso (ct)', 'weight', 'quilates', 'ct') || getByIndex(3);
  const pesoData = parsePeso(peso);
  const imageUrl = getValue('imagen', 'image', 'foto', 'photo', 'url imagen') || getByIndex(10) || '';

  return {
    item: parseInt(getValue('item', '#', 'numero', 'no.') || getByIndex(0) || 0),
    fechaIngreso: getValue('fecha ingreso', 'fechaingreso', 'fecha', 'date') || getByIndex(1) || '',
    nombre: getValue('nombre', 'name', 'descripcion', 'producto') || getByIndex(2) || '',
    peso: typeof pesoData.value === 'number' ? pesoData.value : parseDecimal(peso),
    color: getValue('color') || getByIndex(4) || '',
    calidad: getValue('calidad', 'quality') || getByIndex(5) || '',
    cantidad: parseInt(getValue('cant', 'cant.', 'cantidad', 'qty') || getByIndex(6) || 1),
    talla: getValue('talla', 'cut', 'corte', 'shape') || getByIndex(7) || '',
    medidas: getValue('medidas', 'medida', 'dimensions', 'dimensiones', 'size') || getByIndex(8) || '',
    medidasValores: getByIndex(9) || '',
    precioCOP: 0, // Populated from CUALIFICACION-PRECIO sheet only
    precioInternacional: 0,
    ubicacion: getValue('ubicacion', 'ubicacion', 'location', 'lugar') || getByIndex(12) || '',
    asesor: getValue('asesor', 'advisor', 'vendedor', 'seller') || getByIndex(13) || '',
    estado: (getValue('estado', 'status', 'disponibilidad') || getByIndex(14) || 'DISPONIBLE').toUpperCase(),
    qr: getValue('qr') || getByIndex(15) || '',
    coleccion: getValue('coleccion', 'coleccion', 'collection', 'catalogo', 'catalogo') || getByIndex(16) || '',
    caja: getValue('caja', 'box') || getByIndex(17) || '',
    imageUrl: imageUrl,
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

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  try {
    const sheets = getSheetsClient(true);
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
        const pricing = pricingMap[item.item];
        if (pricing) {
          item.precioCOP = pricing.precioCOP;
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

  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    return sendError(res, 500, 'Failed to read treasure', error.message);
  }
}
