/**
 * Vercel Serverless Function - Get Treasure from Google Sheets
 *
 * This endpoint reads the treasure data from a Google Sheet
 * and returns it as JSON for the app to consume.
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'Inventario'; // Note: Sheet name in Google Sheets (external data source)

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return new sheets_v4.Sheets({ auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Parse price string to number
 * Handles formats like: $909,518 or $2,434,000 or 5000000
 */
function parsePrice(price) {
  if (!price || price === '') return 0;
  // Remove $ symbol, spaces, and handle both comma and dot as thousand separators
  let cleaned = String(price).replace(/[$\s]/g, '');
  // If has comma followed by 3 digits, comma is thousand separator
  if (/,\d{3}/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Otherwise comma might be decimal separator (European format)
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  }
  return parseInt(cleaned, 10) || 0;
}

/**
 * Parse decimal number (handles both . and , as decimal separator)
 */
function parseDecimal(value) {
  if (!value || value === '') return 0;
  const cleaned = String(value).replace(/,/g, '.');
  return parseFloat(cleaned) || 0;
}

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
 * Normalize header - remove newlines, extra spaces, trim
 */
function normalizeHeader(h) {
  if (!h) return '';
  return String(h).toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Map row data to treasure item
 *
 * UPDATED 2024-12-15 - Actual column structure:
 * A = Item (0)
 * B = FECHA INGRESO INVENTARIO (1)
 * C = Nombre (2)
 * D = Peso (ct) (3)
 * E = Color (4)
 * F = Calidad (5)
 * G = Cant. (6)
 * H = Talla (7)
 * I = Medidas tipo (8)
 * J = Medidas valores (9)
 * K = Imagen (10)
 * L = Precio COP (11)
 * M = UBICACION (12)
 * N = ASESOR (13)
 * O = ESTADO (14)
 * P = QR (15)
 * Q = Coleccion (16)
 * R = CAJA (17)
 */
function mapRowToTreasureItem(row, headers) {
  // Normalize all headers once
  const normalizedHeaders = headers.map(normalizeHeader);

  // Flexible column matching - finds column by partial match
  const getValue = (...columnNames) => {
    for (const columnName of columnNames) {
      const search = columnName.toLowerCase().trim();
      const index = normalizedHeaders.findIndex(header => {
        // Skip empty headers to avoid false matches
        if (!header) return false;
        // Exact match first
        if (header === search) return true;
        // For multi-word searches (like 'url imagen'), require exact match or header contains full search
        if (search.includes(' ')) {
          return header.includes(search) || header === search;
        }
        // Single word: allow partial matches
        return header.includes(search) || search.includes(header);
      });
      if (index >= 0 && row[index] !== undefined && row[index] !== '') {
        return row[index];
      }
    }
    return null;
  };

  // Also provide direct index access for known columns (fallback)
  const getByIndex = (index) => {
    return row[index] !== undefined && row[index] !== '' ? row[index] : null;
  };

  const peso = getValue('peso', 'peso ct', 'peso (ct)', 'weight', 'quilates', 'ct') || getByIndex(3);
  const pesoData = parsePeso(peso);

  // Get image URL from column K (Imagen) or column with URL
  const imageUrl = getValue('imagen', 'image', 'foto', 'photo', 'url imagen') || getByIndex(10) || '';

  // NOTE: precioCOP comes ONLY from CUALIFICACION-PRECIO sheet, not from Inventario
  // Set to 0 here, will be populated by fetchPricingData merge

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
    precioInternacional: 0, // Populated from CUALIFICACION-PRECIO sheet only
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
 * Returns a map of item number -> { precioCOP, precioInternacional }
 */
async function fetchPricingData(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'CUALIFICACION -PRECIO'!A:J", // Column A=Item, H=Internacional, J=Nacional
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return {};

    const pricingMap = {};
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const itemNum = parseInt(row[0]);
      if (isNaN(itemNum) || itemNum <= 0) continue;

      // Column H (index 7) = Precio Internacional (PFU)
      // Column J (index 9) = Precio Nacional (Descuento Nacional)
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

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if service account key is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable'
    });
  }

  try {
    const sheets = getSheetsClient();

    // First, get sheet metadata to find the correct sheet name
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    // Note: Sheet is named "Inventario" in Google Sheets (external data source)
    const targetSheet = sheetNames.find(name =>
      name.toLowerCase().includes('inventario') ||
      name.toLowerCase().includes('inventory')
    ) || sheetNames[0];

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
      return res.status(200).json({
        success: true,
        treasure: [],
        message: 'No data found in spreadsheet'
      });
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map rows to treasure items and merge with pricing data
    const treasure = dataRows
      .filter(row => row.length > 0 && row.some(cell => cell)) // Skip empty rows
      .map(row => {
        const item = mapRowToTreasureItem(row, headers);
        // Merge pricing from CUALIFICACION-PRECIO sheet
        const pricing = pricingMap[item.item];
        if (pricing) {
          item.precioCOP = pricing.precioCOP;
          item.precioInternacional = pricing.precioInternacional;
        }
        return item;
      })
      .filter(item => item.item > 0); // Only items with valid item number

    // Debug: include first row sample to verify data
    const sampleRow = dataRows[0] || [];
    const pricingCount = Object.keys(pricingMap).length;

    return res.status(200).json({
      success: true,
      treasure,
      count: treasure.length,
      sheetName: targetSheet,
      lastUpdated: new Date().toISOString(),
      // Debug info for troubleshooting column mapping
      _debug: {
        headers: headers.map((h, i) => `${String.fromCharCode(65 + i)}: ${h}`),
        sampleValues: sampleRow.slice(0, 16).map((v, i) => `${String.fromCharCode(65 + i)}: ${v}`),
        pricingItemsFound: pricingCount,
      }
    });

  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    return res.status(500).json({
      error: 'Failed to read treasure',
      message: error.message
    });
  }
}
