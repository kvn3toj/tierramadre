/**
 * Script para corregir valores en columna O (Ubicación)
 * de la hoja INVENTARIO Tierra.Madre
 *
 * Problemas:
 * - " BOVEDA  \nOFI" → "BOVEDA OFI"
 * - " ASESOR" → "ASESOR"
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Valid values for the dropdown
const VALID_VALUES = ['ASESOR', 'BOVEDA OFI', 'BOVEDA', 'EN PROCESO', 'CLIENTE'];

function normalizeUbicacion(value) {
  if (!value) return value;

  // Remove leading/trailing whitespace, normalize internal whitespace and newlines
  const normalized = value
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // Check if it matches a valid value
  for (const valid of VALID_VALUES) {
    if (normalized === valid.toUpperCase()) {
      return valid;
    }
  }

  return normalized;
}

async function fixColumnO() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
    process.exit(1);
  }

  const credentials = JSON.parse(Buffer.from(key, 'base64').toString());
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get values from column O
  console.log('=== Leyendo columna O (UBICACIÓN) ===');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!O:O",
  });

  const values = response.data.values || [];
  const updates = [];

  values.slice(1).forEach((row, idx) => {
    const val = row[0];
    if (val !== undefined && val !== '') {
      const corrected = normalizeUbicacion(val);
      if (corrected !== val) {
        updates.push({
          row: idx + 2, // 1-indexed, skip header
          oldValue: val.replace(/\n/g, '\\n'),
          newValue: corrected,
        });
      }
    }
  });

  if (updates.length === 0) {
    console.log('No se encontraron valores que necesiten corrección.');
    return;
  }

  console.log(`\nEncontrados ${updates.length} valores a corregir:`);
  updates.slice(0, 10).forEach(u => {
    console.log(`  Fila ${u.row}: "${u.oldValue}" → "${u.newValue}"`);
  });
  if (updates.length > 10) {
    console.log(`  ... y ${updates.length - 10} más`);
  }

  // Apply corrections
  console.log('\n=== Aplicando correcciones ===');

  const batchData = updates.map(u => ({
    range: `'INVENTARIO Tierra.Madre'!O${u.row}`,
    values: [[u.newValue]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      valueInputOption: 'RAW',
      data: batchData,
    },
  });

  console.log(`✓ ${updates.length} valores corregidos`);
  console.log('\n=== COMPLETADO ===');
  console.log('Recarga la hoja de Google Sheets para ver los cambios.');
}

fixColumnO().catch(console.error);
