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
 */
function parsePrice(price) {
  if (!price || price === '') return 0;
  const cleaned = String(price).replace(/[$,\s]/g, '').replace(/\./g, '');
  return parseInt(cleaned, 10) || 0;
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
 * Map row data to inventory item
 */
function mapRowToInventoryItem(row, headers) {
  const getValue = (columnName) => {
    const index = headers.findIndex(h =>
      h.toLowerCase().trim() === columnName.toLowerCase()
    );
    return index >= 0 ? row[index] : null;
  };

  const peso = getValue('peso') || getValue('weight') || getValue('quilates');
  const pesoData = parsePeso(peso);

  return {
    item: parseInt(getValue('item') || getValue('#') || getValue('numero') || 0),
    fechaIngreso: getValue('fechaIngreso') || getValue('fecha') || getValue('fecha ingreso') || '',
    nombre: getValue('nombre') || getValue('name') || getValue('descripcion') || '',
    peso: pesoData.value,
    color: getValue('color') || '',
    calidad: getValue('calidad') || getValue('quality') || '',
    cantidad: parseInt(getValue('cantidad') || getValue('qty') || 1),
    talla: getValue('talla') || getValue('cut') || getValue('corte') || '',
    medidas: getValue('medidas') || getValue('dimensions') || getValue('dimensiones') || '',
    costoTM: parsePrice(getValue('costoTM') || getValue('costo') || getValue('cost') || 0),
    precioCOP: parsePrice(getValue('precioCOP') || getValue('precio') || getValue('price') || 0),
    ubicacion: getValue('ubicacion') || getValue('location') || '',
    asesor: getValue('asesor') || getValue('advisor') || getValue('vendedor') || '',
    estado: getValue('estado') || getValue('status') || 'DISPONIBLE',
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
