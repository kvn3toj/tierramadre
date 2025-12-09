/**
 * Vercel Serverless Function - Sync Inventory to Pricing Sheet
 *
 * This endpoint synchronizes products from the inventory sheet to the
 * pricing qualification sheet with professional styling and data validation.
 *
 * Best Practices Applied:
 * - Data validation with dropdowns (Google Sheets API)
 * - Conditional formatting for visual feedback
 * - Currency and number formatting
 * - Professional borders and alignment
 * - Optimized column widths
 *
 * @see https://developers.google.com/sheets/api/guides/batchupdate
 */

import { google } from 'googleapis';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Tierra Madre brand colors (RGB 0-1 scale for Google Sheets API)
const COLORS = {
  verdeOscuro: { red: 0.027, green: 0.47, blue: 0.34 },      // #047857
  verdeEsmeralda: { red: 0.02, green: 0.59, blue: 0.41 },    // #059669
  verdeMedio: { red: 0.13, green: 0.73, blue: 0.51 },        // #22BA82
  dorado: { red: 0.83, green: 0.69, blue: 0.22 },            // #D4AF37
  doradoClaro: { red: 0.99, green: 0.95, blue: 0.78 },       // #FDF2C7
  fondoClaro: { red: 0.94, green: 0.99, blue: 0.96 },        // #F0FDF4
  fondoDorado: { red: 1, green: 0.98, blue: 0.92 },          // #FFFAEB
  blanco: { red: 1, green: 1, blue: 1 },
  negro: { red: 0, green: 0, blue: 0 },
  grisClaro: { red: 0.95, green: 0.95, blue: 0.95 },         // #F2F2F2
  rojoClaro: { red: 0.99, green: 0.87, blue: 0.87 },         // #FCDEDE
  rojo: { red: 0.86, green: 0.21, blue: 0.27 },              // #DC3545
};

// Dropdown options for data validation
const DROPDOWN_OPTIONS = {
  puntuacionJurado: [0.1, 0.15, 0.2, 0.25, 0.3],
  factorCalidad: [0.2, 0.3, 0.4, 0.5, 0.6],
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
 * Apply comprehensive professional styling to pricing sheet
 * Based on Google Sheets API best practices
 */
async function applyProfessionalStyling(sheets, sheetId, rowCount) {
  const requests = [
    // ==========================================
    // 1. HEADER STYLING
    // ==========================================
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLORS.verdeOscuro,
            textFormat: {
              foregroundColor: COLORS.blanco,
              bold: true,
              fontSize: 11,
              fontFamily: 'Roboto',
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
            padding: { top: 8, bottom: 8, left: 4, right: 4 },
          },
        },
        fields: 'userEnteredFormat',
      },
    },

    // ==========================================
    // 2. DATA VALIDATION - Dropdown for Puntuación del Jurado (Column D)
    // ==========================================
    {
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount + 100, // Buffer for future rows
          startColumnIndex: 3, // Column D
          endColumnIndex: 4,
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: DROPDOWN_OPTIONS.puntuacionJurado.map(v => ({ userEnteredValue: String(v) })),
          },
          showCustomUi: true,
          strict: false,
        },
      },
    },

    // ==========================================
    // 3. DATA VALIDATION - Dropdown for Factor de Calidad (Column E)
    // ==========================================
    {
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount + 100,
          startColumnIndex: 4, // Column E
          endColumnIndex: 5,
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: DROPDOWN_OPTIONS.factorCalidad.map(v => ({ userEnteredValue: String(v) })),
          },
          showCustomUi: true,
          strict: false,
        },
      },
    },

    // ==========================================
    // 4. CURRENCY FORMATTING - Costo Inicial (Column B)
    // ==========================================
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount + 100,
          startColumnIndex: 1, // Column B
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'CURRENCY',
              pattern: '"$"#,##0',
            },
            horizontalAlignment: 'RIGHT',
          },
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      },
    },

    // ==========================================
    // 5. CURRENCY FORMATTING - Price columns (G, H, I)
    // ==========================================
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount + 100,
          startColumnIndex: 6, // Column G
          endColumnIndex: 9,   // Through Column I
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'CURRENCY',
              pattern: '"$"#,##0',
            },
            horizontalAlignment: 'RIGHT',
          },
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      },
    },

    // ==========================================
    // 6. NUMBER FORMATTING - Multiplier columns (C, D, E, F)
    // ==========================================
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount + 100,
          startColumnIndex: 2, // Column C
          endColumnIndex: 6,   // Through Column F
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'NUMBER',
              pattern: '0.00',
            },
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      },
    },

    // ==========================================
    // 7. ALTERNATING ROW COLORS
    // ==========================================
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId,
            startRowIndex: 1,
            endRowIndex: rowCount + 100,
            startColumnIndex: 0,
            endColumnIndex: 9,
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

    // ==========================================
    // 8. CONDITIONAL FORMATTING - High prices (green gradient)
    // ==========================================
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId,
            startRowIndex: 1,
            endRowIndex: rowCount + 100,
            startColumnIndex: 8, // Column I (Precio Final)
            endColumnIndex: 9,
          }],
          gradientRule: {
            minpoint: {
              color: COLORS.blanco,
              type: 'MIN',
            },
            midpoint: {
              color: COLORS.doradoClaro,
              type: 'PERCENTILE',
              value: '50',
            },
            maxpoint: {
              color: COLORS.dorado,
              type: 'MAX',
            },
          },
        },
        index: 1,
      },
    },

    // ==========================================
    // 9. COLUMN WIDTHS - Optimized
    // ==========================================
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 0, // Column A - Nombre
          endIndex: 1,
        },
        properties: { pixelSize: 200 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 1, // Column B - Costo
          endIndex: 2,
        },
        properties: { pixelSize: 120 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 2, // Columns C, D, E - Multipliers
          endIndex: 5,
        },
        properties: { pixelSize: 100 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 5, // Column F - Mult Final
          endIndex: 6,
        },
        properties: { pixelSize: 100 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 6, // Columns G, H, I - Prices
          endIndex: 9,
        },
        properties: { pixelSize: 140 },
        fields: 'pixelSize',
      },
    },

    // ==========================================
    // 10. ROW HEIGHT - Header
    // ==========================================
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 45 },
        fields: 'pixelSize',
      },
    },

    // ==========================================
    // 11. FREEZE HEADER ROW
    // ==========================================
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

    // ==========================================
    // 12. BORDERS - Professional outline
    // ==========================================
    {
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: rowCount + 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        top: { style: 'SOLID_MEDIUM', color: COLORS.verdeOscuro },
        bottom: { style: 'SOLID_MEDIUM', color: COLORS.verdeOscuro },
        left: { style: 'SOLID_MEDIUM', color: COLORS.verdeOscuro },
        right: { style: 'SOLID_MEDIUM', color: COLORS.verdeOscuro },
        innerHorizontal: { style: 'SOLID', color: COLORS.grisClaro },
        innerVertical: { style: 'SOLID', color: COLORS.grisClaro },
      },
    },

    // ==========================================
    // 13. SPECIAL STYLING - Golden accent for price column header
    // ==========================================
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 8, // Column I header
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLORS.dorado,
            textFormat: {
              foregroundColor: COLORS.negro,
              bold: true,
              fontSize: 11,
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },

    // ==========================================
    // 14. NAME COLUMN STYLING - Left align with padding
    // ==========================================
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount + 100,
          startColumnIndex: 0, // Column A
          endColumnIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'LEFT',
            textFormat: {
              fontFamily: 'Roboto',
              fontSize: 10,
            },
            padding: { left: 8 },
          },
        },
        fields: 'userEnteredFormat(horizontalAlignment,textFormat,padding)',
      },
    },
  ];

  // Clear existing conditional format rules first to avoid duplicates
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteConditionalFormatRule: {
            sheetId,
            index: 0,
          },
        }],
      },
    });
  } catch (e) {
    // Ignore if no rules exist
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests },
  });
}

/**
 * Apply basic brand styling to inventory sheet
 */
async function applyInventoryStyling(sheets, sheetId, rowCount) {
  const requests = [
    // Header styling
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLORS.verdeEsmeralda,
            textFormat: {
              foregroundColor: COLORS.blanco,
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    // Freeze header
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
    // Alternating colors
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId,
            startRowIndex: 1,
            endRowIndex: rowCount + 100,
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
    // Auto-resize
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 18,
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

    // Determine starting row for new entries
    const startRow = pricingRows.length + 1;

    // Prepare rows with formulas
    if (productsToAdd.length > 0) {
      const newRows = productsToAdd.map((product, index) => {
        const rowNum = startRow + index;
        return [
          product.nombre,                              // A: nombre
          product.costoInicial || '',                  // B: Costo Inicial
          3,                                           // C: Multiplicador de Calidad (default)
          '',                                          // D: Puntuación del Jurado (dropdown)
          '',                                          // E: Factor de Calidad (dropdown)
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
    }

    // Apply professional styling to pricing sheet
    const totalRows = pricingRows.length + productsToAdd.length;
    await applyProfessionalStyling(sheets, pricingSheet.sheetId, totalRows);

    // Apply basic styling to inventory sheet
    await applyInventoryStyling(sheets, inventorySheet.sheetId, inventoryRows.length);

    return res.status(200).json({
      success: true,
      message: productsToAdd.length > 0
        ? `Synced ${productsToAdd.length} products and applied professional styling`
        : 'Applied professional styling (no new products to sync)',
      synced: productsToAdd.length,
      products: productsToAdd.map(p => p.nombre),
      totalInInventory: inventoryData.length,
      totalInPricing: totalRows - 1,
      styling: {
        dropdowns: ['Puntuación del Jurado', 'Factor de Calidad'],
        currencyFormatting: ['Costo Inicial', 'Precio Unificado', 'Descuento', 'Precio Final'],
        conditionalFormatting: ['Alternating rows', 'Price gradient'],
        professionalBorders: true,
        optimizedWidths: true,
      },
    });

  } catch (error) {
    console.error('Error syncing sheets:', error);
    return res.status(500).json({
      error: 'Failed to sync sheets',
      message: error.message
    });
  }
}
