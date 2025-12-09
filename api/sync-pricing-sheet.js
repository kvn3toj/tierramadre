/**
 * Vercel Serverless Function - Sync Inventory to Pricing Sheet
 *
 * This endpoint synchronizes products from the inventory sheet to the
 * pricing qualification sheet, adding missing products with formulas
 * and applying brand styling.
 */

import { google } from 'googleapis';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Tierra Madre brand colors (RGB 0-1 scale for Google Sheets API)
const COLORS = {
  verdeOscuro: { red: 0.027, green: 0.47, blue: 0.34 },    // #047857
  verdeEsmeralda: { red: 0.02, green: 0.59, blue: 0.41 },  // #059669
  dorado: { red: 0.83, green: 0.69, blue: 0.22 },          // #D4AF37
  fondoClaro: { red: 0.94, green: 0.99, blue: 0.96 },      // #F0FDF4
  blanco: { red: 1, green: 1, blue: 1 },
  negro: { red: 0, green: 0, blue: 0 },
};

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
 * Find sheet by name pattern
 */
async function findSheet(sheets, pattern) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = metadata.data.sheets.find(s =>
    s.properties.title.toLowerCase().includes(pattern.toLowerCase())
  );

  return sheet ? {
    name: sheet.properties.title,
    sheetId: sheet.properties.sheetId,
  } : null;
}

/**
 * Normalize header for comparison
 */
function normalizeHeader(h) {
  if (!h) return '';
  return String(h).toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Get column value by flexible header matching
 */
function getValue(row, headers, ...columnNames) {
  const normalizedHeaders = headers.map(normalizeHeader);
  for (const columnName of columnNames) {
    const search = columnName.toLowerCase().trim();
    const index = normalizedHeaders.findIndex(header => {
      if (!header) return false;
      return header === search || header.includes(search) || search.includes(header);
    });
    if (index >= 0 && row[index] !== undefined && row[index] !== '') {
      return row[index];
    }
  }
  return null;
}

/**
 * Parse price string to number
 */
function parsePrice(price) {
  if (!price || price === '') return 0;
  let cleaned = String(price).replace(/[$\s]/g, '');
  if (/,\d{3}/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  }
  return parseInt(cleaned, 10) || 0;
}

/**
 * Apply brand styling to a sheet
 */
async function applyBrandStyling(sheets, sheetId, rowCount) {
  const requests = [
    // Header row styling
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLORS.verdeOscuro,
            textFormat: {
              foregroundColor: COLORS.blanco,
              bold: true,
              fontSize: 11,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    },
    // Alternating row colors for data
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId,
            startRowIndex: 1,
            endRowIndex: rowCount + 1,
          }],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=ISEVEN(ROW())' }],
            },
            format: {
              backgroundColor: COLORS.fondoClaro,
            },
          },
        },
        index: 0,
      },
    },
    // Freeze header row
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    // Auto-resize columns
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 10,
        },
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests },
  });
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
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

    // Find both sheets
    const inventorySheet = await findSheet(sheets, 'inventario');
    const pricingSheet = await findSheet(sheets, 'cualificacion');

    if (!inventorySheet) {
      return res.status(404).json({
        error: 'Inventory sheet not found',
        message: 'Could not find a sheet containing "inventario" in its name'
      });
    }

    if (!pricingSheet) {
      return res.status(404).json({
        error: 'Pricing sheet not found',
        message: 'Could not find a sheet containing "cualificacion" in its name'
      });
    }

    // Read inventory data
    const inventoryResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${inventorySheet.name}!A:Z`,
    });

    const inventoryRows = inventoryResponse.data.values || [];
    if (inventoryRows.length < 2) {
      return res.status(200).json({
        success: true,
        message: 'No inventory data to sync',
        synced: 0,
      });
    }

    const inventoryHeaders = inventoryRows[0];
    const inventoryData = inventoryRows.slice(1);

    // Read pricing data
    const pricingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${pricingSheet.name}!A:A`,
    });

    const pricingRows = pricingResponse.data.values || [];
    const existingNames = new Set(
      pricingRows.slice(1).map(row => (row[0] || '').toLowerCase().trim())
    );

    // Find products not in pricing sheet
    const productsToAdd = [];
    for (const row of inventoryData) {
      const nombre = getValue(row, inventoryHeaders, 'nombre', 'name', 'descripcion', 'producto');
      const costoTM = getValue(row, inventoryHeaders, 'costo t.madre', 'costo t madre', 'costotm', 'costo tm', 'costo', 'cost');

      if (nombre && !existingNames.has(nombre.toLowerCase().trim())) {
        productsToAdd.push({
          nombre: nombre.trim(),
          costoInicial: parsePrice(costoTM),
        });
      }
    }

    if (productsToAdd.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All products are already synced',
        synced: 0,
        totalInInventory: inventoryData.length,
        totalInPricing: pricingRows.length - 1,
      });
    }

    // Determine starting row for new entries
    const startRow = pricingRows.length + 1;

    // Prepare rows with formulas
    const newRows = productsToAdd.map((product, index) => {
      const rowNum = startRow + index;
      return [
        product.nombre,                              // A: nombre
        product.costoInicial || '',                  // B: Costo Inicial
        3,                                           // C: Multiplicador de Calidad (default)
        '',                                          // D: Puntuación del Jurado (empty for dropdown)
        '',                                          // E: Factor de Calidad (empty for dropdown)
        `=C${rowNum}+D${rowNum}+E${rowNum}`,        // F: Multiplicador Final
        `=B${rowNum}*F${rowNum}`,                   // G: Precio Unificado
        `=G${rowNum}*0.2`,                          // H: Descuento Nacional (20%)
        `=G${rowNum}-H${rowNum}`,                   // I: Precio Nacional Final
      ];
    });

    // Append new rows
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${pricingSheet.name}!A:I`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: newRows,
      },
    });

    // Apply brand styling
    const totalRows = pricingRows.length + newRows.length;
    await applyBrandStyling(sheets, pricingSheet.sheetId, totalRows);

    // Also apply styling to inventory sheet
    await applyBrandStyling(sheets, inventorySheet.sheetId, inventoryRows.length);

    return res.status(200).json({
      success: true,
      message: `Synced ${productsToAdd.length} products to pricing sheet`,
      synced: productsToAdd.length,
      products: productsToAdd.map(p => p.nombre),
      totalInInventory: inventoryData.length,
      totalInPricing: totalRows - 1,
      stylingApplied: true,
    });

  } catch (error) {
    console.error('Error syncing sheets:', error);
    return res.status(500).json({
      error: 'Failed to sync sheets',
      message: error.message
    });
  }
}
