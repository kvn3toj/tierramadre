/**
 * Vercel Serverless Function - Get Inventory from Google Sheets
 *
 * This endpoint reads the inventory data from a Google Sheet
 * and returns it as JSON for the app to consume.
 */

import { google } from 'googleapis';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'Inventario'; // Adjust if different

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
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
 * Map row data to inventory item
 */
function mapRowToInventoryItem(row, headers) {
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

  const peso = getValue('peso', 'peso (ct)', 'weight', 'quilates', 'ct');
  const pesoData = parsePeso(peso);

  // Get image URL from column Q (URL Imagen) - plain text URL for API
  // Column L contains IMAGE() formulas which don't return URLs when read via API
  const imageUrl = getValue('url imagen', 'image url', 'imagen url', 'imagen', 'image', 'foto', 'photo') || '';

  return {
    item: parseInt(getValue('item', '#', 'numero', 'no.') || 0),
    fechaIngreso: getValue('fecha ingreso', 'fechaingreso', 'fecha', 'date') || '',
    nombre: getValue('nombre', 'name', 'descripcion', 'producto') || '',
    peso: typeof pesoData.value === 'number' ? pesoData.value : parseDecimal(peso),
    color: getValue('color') || '',
    calidad: getValue('calidad', 'quality') || '',
    cantidad: parseInt(getValue('cant', 'cant.', 'cantidad', 'qty') || 1),
    talla: getValue('talla', 'cut', 'corte', 'shape') || '',
    medidas: getValue('medidas', 'dimensions', 'dimensiones', 'size') || '',
    costoTM: parsePrice(getValue('costo t.madre', 'costo t madre', 'costotm', 'costo tm', 'costo', 'cost')),
    precioCOP: parsePrice(getValue('precio cop', 'preciocop', 'precio', 'price', 'valor')),
    ubicacion: getValue('ubicacion', 'location', 'lugar') || '',
    asesor: getValue('asesor', 'advisor', 'vendedor', 'seller') || '',
    estado: (getValue('estado', 'status', 'disponibilidad') || 'DISPONIBLE').toUpperCase(),
    imageUrl: imageUrl,
    isJewelry: pesoData.isJewelry,
    metalType: pesoData.metalType,
  };
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
    const targetSheet = sheetNames.find(name =>
      name.toLowerCase().includes('inventario') ||
      name.toLowerCase().includes('inventory')
    ) || sheetNames[0];

    // Read all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheet}!A:Z`,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        inventory: [],
        message: 'No data found in spreadsheet'
      });
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map rows to inventory items
    const inventory = dataRows
      .filter(row => row.length > 0 && row.some(cell => cell)) // Skip empty rows
      .map(row => mapRowToInventoryItem(row, headers))
      .filter(item => item.item > 0); // Only items with valid item number

    return res.status(200).json({
      success: true,
      inventory,
      count: inventory.length,
      sheetName: targetSheet,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    return res.status(500).json({
      error: 'Failed to read inventory',
      message: error.message
    });
  }
}
