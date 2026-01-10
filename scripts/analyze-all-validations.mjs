/**
 * Script para analizar TODAS las validaciones de datos en la hoja
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function analyzeAllValidations() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
    process.exit(1);
  }

  const credentials = JSON.parse(Buffer.from(key, 'base64').toString());
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = new sheets_v4.Sheets({ auth });

  console.log('=== Analizando TODAS las validaciones ===\n');

  // Get full sheet with grid data
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: ["'INVENTARIO Tierra.Madre'!A1:Z5"],
    includeGridData: true,
  });

  const gridData = response.data.sheets[0].data[0];

  if (!gridData || !gridData.rowData) {
    console.log('No grid data found');
    return;
  }

  // Row 1 = Headers
  const headerRow = gridData.rowData[0];
  const headers = headerRow.values.map((cell, i) => ({
    col: String.fromCharCode(65 + i),
    value: cell.formattedValue || cell.userEnteredValue?.stringValue || '',
    hasValidation: !!cell.dataValidation,
  }));

  console.log('=== HEADERS ===');
  headers.forEach(h => {
    if (h.value) {
      console.log(`${h.col}: "${h.value.replace(/\n/g, ' ').trim()}" ${h.hasValidation ? '[VALIDACIÓN]' : ''}`);
    }
  });

  // Row 2 = First data row
  console.log('\n=== VALIDACIONES EN FILA 2 ===');
  const dataRow = gridData.rowData[1];
  dataRow.values.forEach((cell, i) => {
    const col = String.fromCharCode(65 + i);
    const header = headers[i]?.value?.replace(/\n/g, ' ').trim() || '';
    const validation = cell.dataValidation;

    if (validation) {
      console.log(`\n${col} (${header}):`);
      console.log(`  Tipo: ${validation.condition?.type || 'N/A'}`);
      if (validation.condition?.values) {
        const options = validation.condition.values.map(v => v.userEnteredValue);
        console.log(`  Opciones (${options.length}): ${options.slice(0, 6).join(', ')}${options.length > 6 ? '...' : ''}`);
      }
    }
  });

  // Summary table
  console.log('\n\n=== RESUMEN DE COLUMNAS CON VALIDACIÓN ===');
  console.log('Col | Header            | Validación');
  console.log('----|-------------------|------------');

  dataRow.values.forEach((cell, i) => {
    const col = String.fromCharCode(65 + i);
    const header = (headers[i]?.value?.replace(/\n/g, ' ').trim() || '').substring(0, 17).padEnd(17);
    const validation = cell.dataValidation;

    if (validation && validation.condition?.values) {
      const firstOption = validation.condition.values[0]?.userEnteredValue || '';
      console.log(`${col.padEnd(3)} | ${header} | ${firstOption}...`);
    }
  });
}

analyzeAllValidations().catch(console.error);
