/**
 * Vercel Serverless Function - Setup Asesores Sheet
 *
 * Creates a new "Asesores" tab in the inventory spreadsheet
 * and populates it with assessor data extracted from inventory.
 */

import { google } from 'googleapis';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const ASESORES_SHEET_NAME = 'Asesores';

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
 * Extract unique asesores from inventory data
 */
function extractAsesores(rows, asesorColumnIndex) {
  const normalizeName = (name) => {
    const str = String(name || '');
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        result += str[i].toUpperCase();
      }
    }
    return result;
  };

  const formatDisplayName = (name) => {
    return String(name || '')
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const seenNormalized = new Set();
  const asesoresMap = new Map();

  rows.forEach(row => {
    const name = row[asesorColumnIndex];
    if (!name || String(name).trim() === '') return;

    const displayName = formatDisplayName(name);
    const normalized = normalizeName(name);

    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      asesoresMap.set(normalized, {
        name: displayName,
        productCount: 1,
      });
    } else {
      const existing = asesoresMap.get(normalized);
      existing.productCount += 1;
    }
  });

  return Array.from(asesoresMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
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

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable'
    });
  }

  try {
    const sheets = getSheetsClient();

    // Get spreadsheet metadata
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);

    // Check if Asesores sheet already exists
    const asesoresSheetExists = sheetNames.some(
      name => name.toLowerCase() === ASESORES_SHEET_NAME.toLowerCase()
    );

    // Find inventory sheet
    const inventorySheet = sheetNames.find(name =>
      name.toLowerCase().includes('inventario') ||
      name.toLowerCase().includes('inventory')
    ) || sheetNames[0];

    // Read inventory data to extract asesores
    const inventoryResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${inventorySheet}'!A:Z`,
    });

    const rows = inventoryResponse.data.values || [];

    if (rows.length === 0) {
      return res.status(400).json({
        error: 'No inventory data found',
        availableSheets: sheetNames
      });
    }

    // Find asesor column
    const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');
    const asesorColumnIndex = headers.findIndex(h =>
      h.includes('asesor') || h.includes('advisor') || h.includes('vendedor')
    );

    if (asesorColumnIndex === -1) {
      return res.status(400).json({
        error: 'No asesor column found in inventory',
        headers: rows[0]
      });
    }

    // Extract unique asesores with product counts
    const dataRows = rows.slice(1);
    const asesores = extractAsesores(dataRows, asesorColumnIndex);

    if (asesores.length === 0) {
      return res.status(400).json({
        error: 'No asesores found in inventory data'
      });
    }

    // Create Asesores sheet if it doesn't exist
    if (!asesoresSheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: ASESORES_SHEET_NAME,
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10,
                },
              },
            },
          }],
        },
      });
    } else {
      // Clear existing data if sheet exists
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${ASESORES_SHEET_NAME}'!A:J`,
      });
    }

    // Prepare header row
    const headerRow = [
      'ID',
      'Nombre',
      'Slug',
      'Productos',
      'WhatsApp',
      'Instagram',
      'Estado',
      'Fecha Registro',
      'Notas',
    ];

    // Prepare data rows
    const today = new Date().toISOString().split('T')[0];
    const dataRowsFormatted = asesores.map((asesor, index) => [
      `ASE-${String(index + 1).padStart(3, '0')}`,        // ID
      asesor.name,                                          // Nombre
      asesor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), // Slug
      asesor.productCount,                                  // Productos
      '',                                                   // WhatsApp (to fill)
      '',                                                   // Instagram (to fill)
      'Activo',                                             // Estado
      today,                                                // Fecha Registro
      '',                                                   // Notas
    ]);

    // Write all data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${ASESORES_SHEET_NAME}'!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headerRow, ...dataRowsFormatted],
      },
    });

    // Format header row (bold, background color)
    const asesoresSheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const asesoresSheetId = asesoresSheetMeta.data.sheets.find(
      s => s.properties.title === ASESORES_SHEET_NAME
    )?.properties.sheetId;

    if (asesoresSheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: asesoresSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.1, green: 0.4, blue: 0.25 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: asesoresSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 9,
                },
              },
            },
          ],
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Created "${ASESORES_SHEET_NAME}" sheet with ${asesores.length} asesores`,
      asesores: asesores.map(a => a.name),
      count: asesores.length,
      sheetCreated: !asesoresSheetExists,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
    });

  } catch (error) {
    console.error('Error setting up Asesores sheet:', error);
    return res.status(500).json({
      error: 'Failed to setup Asesores sheet',
      message: error.message
    });
  }
}
