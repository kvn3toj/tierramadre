/**
 * Script para verificar valores en columna D (Puntuación del Jurado)
 * de la hoja CUALIFICACION -PRECIO
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function checkColumnD() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
    process.exit(1);
  }

  const credentials = JSON.parse(Buffer.from(key, 'base64').toString());
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get values from column D
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'CUALIFICACION -PRECIO'!D:D",
  });

  const values = response.data.values || [];
  const uniqueValues = new Map(); // value -> count

  console.log('=== Columna D: Puntuación del Jurado ===\n');

  values.slice(1).forEach((row, idx) => {
    const val = row[0];
    if (val !== undefined && val !== '') {
      uniqueValues.set(val, (uniqueValues.get(val) || 0) + 1);
    }
  });

  console.log('Valores únicos encontrados:');
  [...uniqueValues.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).forEach(([val, count]) => {
    console.log(`  ${val} (${count} veces)`);
  });

  // Check validation rules
  const fullMetadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: ["'CUALIFICACION -PRECIO'!D2"],
    includeGridData: true,
  });

  const gridData = fullMetadata.data.sheets[0].data[0];
  const cell = gridData.rowData?.[0]?.values?.[0];

  if (cell?.dataValidation) {
    console.log('\nValidación actual del dropdown:');
    console.log('  Tipo:', cell.dataValidation.condition?.type);
    const validValues = cell.dataValidation.condition?.values?.map(v => v.userEnteredValue) || [];
    console.log('  Valores permitidos:', validValues.join(', '));

    // Find values not in dropdown
    const invalidValues = [];
    uniqueValues.forEach((count, val) => {
      if (!validValues.includes(val)) {
        invalidValues.push(val);
      }
    });

    if (invalidValues.length > 0) {
      console.log('\n⚠️  Valores NO incluidos en el dropdown:');
      invalidValues.forEach(v => console.log(`  - ${v}`));
    }
  }
}

checkColumnD().catch(console.error);
