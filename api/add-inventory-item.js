/**
 * Vercel Serverless Function - Add Item to Google Sheets Inventory
 *
 * This endpoint adds a new product to the inventory Google Sheet
 */

import { google } from 'googleapis';

// Sheet configuration - same as get-inventory-sheets
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

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
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Get the next available item number
 */
async function getNextItemNumber(sheets, sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });

  const values = response.data.values || [];
  let maxItem = 0;

  for (const row of values) {
    const num = parseInt(row[0]);
    if (!isNaN(num) && num > maxItem) {
      maxItem = num;
    }
  }

  return maxItem + 1;
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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
    const {
      nombre,
      peso,
      color,
      calidad,
      talla,
      medidas,
      costoTM,
      precioCOP,
      ubicacion,
      asesor,
      estado = 'DISPONIBLE',
      imagenUrl,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'nombre is required' });
    }

    const sheets = getSheetsClient();

    // Get sheet metadata to find the correct sheet name
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    const targetSheet = sheetNames.find(name =>
      name.toLowerCase().includes('inventario') ||
      name.toLowerCase().includes('inventory')
    ) || sheetNames[0];

    // Get next item number
    const nextItemNumber = await getNextItemNumber(sheets, targetSheet);

    // Format today's date
    const today = new Date();
    const fechaIngreso = `${today.getDate()}-${today.toLocaleString('es', { month: 'short' })}-${today.getFullYear()}`;

    // Prepare row data (matching the sheet columns)
    const rowData = [
      nextItemNumber,      // item
      fechaIngreso,        // fechaIngreso
      nombre,              // nombre
      peso || '',          // peso
      color || '',         // color
      calidad || '',       // calidad
      1,                   // cantidad
      talla || '',         // talla
      medidas || '',       // medidas
      costoTM || '',       // costoTM
      precioCOP || '',     // precioCOP
      ubicacion || '',     // ubicacion
      asesor || '',        // asesor
      estado,              // estado
      imagenUrl || '',     // imagen URL (if column exists)
    ];

    // Append the row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheet}!A:O`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData],
      },
    });

    return res.status(200).json({
      success: true,
      item: nextItemNumber,
      nombre,
      fechaIngreso,
      message: `Producto "${nombre}" agregado al inventario con el número ${nextItemNumber}`
    });

  } catch (error) {
    console.error('Error adding to inventory:', error);
    return res.status(500).json({
      error: 'Failed to add item to inventory',
      message: error.message
    });
  }
}
