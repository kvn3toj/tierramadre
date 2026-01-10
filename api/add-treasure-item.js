/**
 * Vercel Serverless Function - Add Item to Google Sheets Treasure
 *
 * This endpoint adds a new product to the treasure Google Sheet
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

// Sheet configuration - same as get-treasure-sheets
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

/**
 * Add product to pricing sheet with formulas
 */
async function addToPricingSheet(sheets, nombre, costoTM) {
  try {
    // Find pricing sheet
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const pricingSheet = metadata.data.sheets.find(s =>
      s.properties.title.toLowerCase().includes('cualificacion')
    );

    if (!pricingSheet) {
      console.log('Pricing sheet not found, skipping sync');
      return;
    }

    const sheetName = pricingSheet.properties.title;

    // Get current row count to determine row number for formulas
    const countResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
    });

    const rowNum = (countResponse.data.values?.length || 1) + 1;

    // Prepare row with formulas
    const newRow = [
      nombre,                              // A: nombre
      costoTM || '',                       // B: Costo Inicial
      3,                                   // C: Multiplicador de Calidad (default)
      '',                                  // D: Puntuacion del Jurado (empty for dropdown)
      '',                                  // E: Factor de Calidad (empty for dropdown)
      `=C${rowNum}+D${rowNum}+E${rowNum}`, // F: Multiplicador Final
      `=B${rowNum}*F${rowNum}`,            // G: Precio Unificado
      `=G${rowNum}*0.2`,                   // H: Descuento Nacional (20%)
      `=G${rowNum}-H${rowNum}`,            // I: Precio Nacional Final
    ];

    // Append to pricing sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:I`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [newRow],
      },
    });

    console.log(`Added "${nombre}" to pricing sheet at row ${rowNum}`);
  } catch (error) {
    console.error('Error adding to pricing sheet:', error);
    // Don't throw - this is a secondary operation
  }
}

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
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return new sheets_v4.Sheets({ auth });
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
    // Note: Sheet is named "Inventario" in Google Sheets (external data source)
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

    // Get the row number where the item was inserted to add QR formula
    const updatedRows = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheet}!A:A`,
    });
    const newRowNumber = updatedRows.data.values?.length || 2;

    // Generate and add QR formula in column R for the new row
    // QR points to Tierra Madre Studio app: /product/{itemId}
    const qrFormula = `=IF(A${newRowNumber}<>"",IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=1B5E20&data=" & ENCODEURL("https://tierra-madre-studio.vercel.app/product/" & A${newRowNumber})),"")`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheet}!R${newRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[qrFormula]],
      },
    });

    // Also add to pricing sheet for qualification
    await addToPricingSheet(sheets, nombre, costoTM);

    return res.status(200).json({
      success: true,
      item: nextItemNumber,
      nombre,
      fechaIngreso,
      qrGenerated: true,
      message: `Producto "${nombre}" agregado a los tesoros con el numero ${nextItemNumber} (QR generado automaticamente)`
    });

  } catch (error) {
    console.error('Error adding to treasure:', error);
    return res.status(500).json({
      error: 'Failed to add item to treasure',
      message: error.message
    });
  }
}
