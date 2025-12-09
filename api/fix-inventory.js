/**
 * Vercel Serverless Function - Fix Inventory Inconsistencies
 *
 * Corrige automáticamente errores de escritura en las columnas:
 * - F: Color
 * - G: Calidad
 * - I: Talla
 * - J: Medidas
 *
 * Endpoints:
 *   GET  /api/fix-inventory         - Preview de cambios
 *   POST /api/fix-inventory         - Aplicar correcciones
 */

import { google } from 'googleapis';

// Configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Column indices (0-based) - Verified 2024-12-09
// A=vacío, B=Item, C=FECHA INGRESO, D=Nombre, E=Peso, F=Color, G=Calidad, H=Cant, I=Talla
// J=Medidas(tipo), K=Medidas(valores), L=Imagen, M=costo, N=Precio, O=UBICACION, P=ASESOR
// Q=ESTADO, R=QR, S=URL Imagen
const COLUMNS = {
  COLOR: 5,      // F (index 5) - Color
  CALIDAD: 6,    // G (index 6) - Calidad
  TALLA: 8,      // I (index 8) - Talla/Shape
  MEDIDAS: 9,    // J (index 9) - Medidas tipo (largo Ancho)
};

// Correction mappings
// Note: Values are normalized (newlines → spaces) before matching
const CORRECTIONS = {
  talla: {
    // Esmeralda variations
    'smerald': 'Esmeralda',
    'Esmerald': 'Esmeralda',
    'esmerald': 'Esmeralda',
    'esmeralda': 'Esmeralda',
    'Emerald': 'Esmeralda',
    'emerald': 'Esmeralda',
    'Esmeralda': 'Esmeralda', // Fix trailing space

    // Cuadrada variations
    'Cuadrac': 'Cuadrada',
    'cuadrac': 'Cuadrada',
    'cuadrad': 'Cuadrada',
    'cuadrada': 'Cuadrada',
    'Cuadrado': 'Cuadrada',
    'cuadrado': 'Cuadrada',

    // Corazón variations
    'Corazon': 'Corazón',
    'corazon': 'Corazón',
    'corazón': 'Corazón',

    // Lágrima/Pera variations
    'lagrima': 'Pera',
    'Lagrima': 'Pera',
    'lágrima': 'Pera',
    'Lágrima': 'Pera',
    'pera': 'Pera',

    // Óvalo variations
    'Ovalo': 'Ovalada',
    'ovalo': 'Ovalada',
    'óvalo': 'Ovalada',
    'Óvalo': 'Ovalada',
    'ovalada': 'Ovalada',

    // Redonda variations
    'redonda': 'Redonda',
    'Redond': 'Redonda',
    'redond': 'Redonda',

    // Cushion
    'cushion': 'Cushion',
    'CUSHION': 'Cushion',

    // Baguette
    'baguette': 'Baguette',
    'BAGUETTE': 'Baguette',

    // Marquesa
    'marquesa': 'Marquesa',
    'MARQUESA': 'Marquesa',
  },

  color: {
    // Verde Menta
    'verde menta': 'Verde Menta',
    'Verde menta': 'Verde Menta',
    'VERDE MENTA': 'Verde Menta',

    // Verde Natural (handles newlines after normalization)
    'verde natural': 'Verde Natural',
    'Verde natural': 'Verde Natural',
    'VERDE NATURAL': 'Verde Natural',
    'Verde Natural': 'Verde Natural', // Fix trailing space

    // Verde Vivido/Vívido
    'verde vivido': 'Verde Vivido',
    'Verde vivido': 'Verde Vivido',
    'VERDE VIVIDO': 'Verde Vivido',
    'Verde Vívido': 'Verde Vivido',
    'verde vívido': 'Verde Vivido',

    // Verde Limón
    'verde limon': 'Verde Limón',
    'Verde limon': 'Verde Limón',
    'verde limón': 'Verde Limón',
    'VERDE LIMON': 'Verde Limón',
    'Verde Limón': 'Verde Limón', // Fix trailing space

    // Verde Muzo
    'verde muzo': 'Verde Muzo',
    'Verde muzo': 'Verde Muzo',
    'VERDE MUZO': 'Verde Muzo',

    // Verde Azulado
    'verde azulado': 'Verde Azulado',
    'Verde azulado': 'Verde Azulado',

    // Verde Oscuro
    'verde oscuro': 'Verde Oscuro',
    'Verde oscuro': 'Verde Oscuro',
  },

  calidad: {
    // Comercial SuperFina (all variations including with newlines after normalization)
    'Comercial SuperFina': 'Comercial SuperFina',
    'comercial superfina': 'Comercial SuperFina',
    'Comercial Superfina': 'Comercial SuperFina',
    'Comercial super fina': 'Comercial SuperFina',
    'Comercial_SuperFina': 'Comercial SuperFina',

    // Comercial Fina
    'comercial fina': 'Comercial Fina',
    'Comercial fina': 'Comercial Fina',
    'Comercial Fina': 'Comercial Fina', // Fix spacing

    // Comercial Superior
    'comercial superior': 'Comercial Superior',
    'Comercial superior': 'Comercial Superior',
    'Comercial Superior': 'Comercial Superior', // Fix spacing

    // Comercial Final
    'comercial final': 'Comercial Final',
    'Comercial final': 'Comercial Final',
    'Comercial Final': 'Comercial Final', // Fix spacing

    // Comercial Estándar
    'Comercial Estandar': 'Comercial Estándar',
    'comercial estandar': 'Comercial Estándar',
    'Comercial Estándar': 'Comercial Estándar',
    'Estandar': 'Comercial Estándar',
    'estandar': 'Comercial Estándar',

    // Plata comercial (various formats)
    'Plata - comercial': 'Plata - comercial',
    'plata - comercial': 'Plata - comercial',
    'Plata -comercial': 'Plata - comercial',
    'Plata- comercial': 'Plata - comercial',
    'Plata-comercial': 'Plata - comercial',
    'plata comercial': 'Plata - comercial',

    // comercial alone
    'comercial': 'Comercial Estándar',

    // Fina
    'fina': 'Fina',
    'FINA': 'Fina',

    // Esencial
    'esencial': 'Esencial',
    'ESENCIAL': 'Esencial',

    // Sublime
    'sublime': 'Sublime',
    'SUBLIME': 'Sublime',
  },

  medidas: {
    // Largo Ancho format (handles newlines after normalization)
    'largo Ancho': 'Largo x Ancho',
    'Largo Ancho': 'Largo x Ancho',
    'largo ancho': 'Largo x Ancho',
    'LargoAncho': 'Largo x Ancho',
    'largo x ancho': 'Largo x Ancho',

    // Diámetro
    'Diametro': 'Diámetro',
    'diametro': 'Diámetro',
    'DIAMETRO': 'Diámetro',
    'diámetro': 'Diámetro',
  },
};

/**
 * Initialize Google Sheets API client
 */
function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
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
 * Normalize value - remove newlines, extra spaces
 */
function normalizeValue(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/\n/g, ' ')      // Replace newlines with spaces
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
    .trim();                   // Trim edges
}

/**
 * Apply correction if value matches a correction rule
 */
function applyCorrection(value, type) {
  if (!value || typeof value !== 'string') return { value, corrected: false };

  const original = value; // Keep original WITH spaces/newlines for comparison
  const normalized = normalizeValue(value);
  const corrections = CORRECTIONS[type] || {};

  // Check for exact match first (on normalized value)
  if (corrections[normalized]) {
    const correctedValue = corrections[normalized];
    return {
      value: correctedValue,
      // Corrected if the corrected value differs from original (including whitespace)
      corrected: correctedValue !== original,
      original: original,
    };
  }

  // Check for case-insensitive match
  const lowerValue = normalized.toLowerCase();
  for (const [key, correctedValue] of Object.entries(corrections)) {
    if (key.toLowerCase() === lowerValue) {
      return {
        value: correctedValue,
        corrected: correctedValue !== original,
        original: original,
      };
    }
  }

  // If no correction found but value has issues (spaces/newlines), normalize it
  if (normalized !== original) {
    return {
      value: normalized,
      corrected: true,
      original: original,
    };
  }

  return { value: normalized, corrected: false };
}

/**
 * Analyze and correct inventory data
 */
async function analyzeAndCorrect(sheets, sheetName, apply = false) {
  // Read all data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    return { changes: [], stats: {}, message: 'No data to analyze' };
  }

  const dataRows = rows.slice(1);

  // Track changes
  const changes = [];
  const stats = {
    talla: { total: 0, corrected: 0, unique: new Set() },
    color: { total: 0, corrected: 0, unique: new Set() },
    calidad: { total: 0, corrected: 0, unique: new Set() },
    medidas: { total: 0, corrected: 0, unique: new Set() },
  };

  // Analyze each row
  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const actualRow = rowIndex + 2;

    // Analyze Color (Column F)
    if (row[COLUMNS.COLOR]) {
      const result = applyCorrection(row[COLUMNS.COLOR], 'color');
      stats.color.total++;
      stats.color.unique.add(row[COLUMNS.COLOR]);
      if (result.corrected) {
        stats.color.corrected++;
        changes.push({
          row: actualRow,
          column: 'F',
          columnIndex: COLUMNS.COLOR,
          field: 'Color',
          original: result.original,
          corrected: result.value,
        });
      }
    }

    // Analyze Calidad (Column G)
    if (row[COLUMNS.CALIDAD]) {
      const result = applyCorrection(row[COLUMNS.CALIDAD], 'calidad');
      stats.calidad.total++;
      stats.calidad.unique.add(row[COLUMNS.CALIDAD]);
      if (result.corrected) {
        stats.calidad.corrected++;
        changes.push({
          row: actualRow,
          column: 'G',
          columnIndex: COLUMNS.CALIDAD,
          field: 'Calidad',
          original: result.original,
          corrected: result.value,
        });
      }
    }

    // Analyze Talla (Column I)
    if (row[COLUMNS.TALLA]) {
      const result = applyCorrection(row[COLUMNS.TALLA], 'talla');
      stats.talla.total++;
      stats.talla.unique.add(row[COLUMNS.TALLA]);
      if (result.corrected) {
        stats.talla.corrected++;
        changes.push({
          row: actualRow,
          column: 'I',
          columnIndex: COLUMNS.TALLA,
          field: 'Talla',
          original: result.original,
          corrected: result.value,
        });
      }
    }

    // Analyze Medidas (Column J)
    if (row[COLUMNS.MEDIDAS]) {
      const result = applyCorrection(row[COLUMNS.MEDIDAS], 'medidas');
      stats.medidas.total++;
      stats.medidas.unique.add(row[COLUMNS.MEDIDAS]);
      if (result.corrected) {
        stats.medidas.corrected++;
        changes.push({
          row: actualRow,
          column: 'J',
          columnIndex: COLUMNS.MEDIDAS,
          field: 'Medidas',
          original: result.original,
          corrected: result.value,
        });
      }
    }
  }

  // Apply changes if requested
  if (apply && changes.length > 0) {
    const data = changes.map(change => ({
      range: `${sheetName}!${change.column}${change.row}`,
      values: [[change.corrected]],
    }));

    // Apply in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          valueInputOption: 'RAW',
          data: batch,
        },
      });
    }
  }

  return {
    changes: changes.map(c => ({
      row: c.row,
      column: c.column,
      field: c.field,
      original: c.original,
      corrected: c.corrected,
    })),
    stats: {
      talla: { total: stats.talla.total, corrected: stats.talla.corrected, uniqueValues: [...stats.talla.unique] },
      color: { total: stats.color.total, corrected: stats.color.corrected, uniqueValues: [...stats.color.unique] },
      calidad: { total: stats.calidad.total, corrected: stats.calidad.corrected, uniqueValues: [...stats.calidad.unique] },
      medidas: { total: stats.medidas.total, corrected: stats.medidas.corrected, uniqueValues: [...stats.medidas.unique] },
    },
    applied: apply,
    totalRows: dataRows.length,
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if service account key is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable'
    });
  }

  const apply = req.method === 'POST';

  try {
    const sheets = getSheetsClient();

    // Find inventory sheet
    const inventorySheet = await findSheet(sheets, 'inventario');
    if (!inventorySheet) {
      return res.status(404).json({
        error: 'Inventory sheet not found',
        message: 'Could not find a sheet containing "inventario" in its name'
      });
    }

    // Analyze and optionally correct
    const result = await analyzeAndCorrect(sheets, inventorySheet.name, apply);

    // Group changes by correction type for summary
    const changesSummary = {};
    for (const change of result.changes) {
      const key = `${change.field}: "${change.original}" → "${change.corrected}"`;
      if (!changesSummary[key]) changesSummary[key] = 0;
      changesSummary[key]++;
    }

    return res.status(200).json({
      success: true,
      mode: apply ? 'APPLIED' : 'PREVIEW',
      sheetName: inventorySheet.name,
      totalRows: result.totalRows,
      totalChanges: result.changes.length,
      statistics: result.stats,
      changesSummary,
      changes: result.changes.slice(0, 100), // Limit to first 100 for response size
      message: apply
        ? `Successfully applied ${result.changes.length} corrections`
        : `Found ${result.changes.length} corrections to apply. Use POST to apply.`,
    });

  } catch (error) {
    console.error('Error fixing inventory:', error);
    return res.status(500).json({
      error: 'Failed to process inventory',
      message: error.message
    });
  }
}
