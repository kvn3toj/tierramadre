/**
 * Script para verificar valores en columna O (Ubicación)
 * de la hoja INVENTARIO Tierra.Madre
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function checkColumnO() {
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

  // Get values from column O
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!O:O",
  });

  const values = response.data.values || [];
  const uniqueValues = new Map();

  console.log('=== Columna O: ' + (values[0]?.[0] || 'Sin header') + ' ===\n');

  values.slice(1).forEach((row) => {
    const val = row[0];
    if (val !== undefined && val !== '') {
      uniqueValues.set(val, (uniqueValues.get(val) || 0) + 1);
    }
  });

  console.log('Valores únicos encontrados:');
  [...uniqueValues.entries()].sort((a, b) => b[1] - a[1]).forEach(([val, count]) => {
    console.log(`  "${val}" (${count} veces)`);
  });

  // Check validation rules
  const fullMetadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: ["'INVENTARIO Tierra.Madre'!O2"],
    includeGridData: true,
  });

  const gridData = fullMetadata.data.sheets[0].data[0];
  const cell = gridData.rowData?.[0]?.values?.[0];

  if (cell?.dataValidation) {
    console.log('\nValidación actual del dropdown:');
    console.log('  Tipo:', cell.dataValidation.condition?.type);
    const validValues = cell.dataValidation.condition?.values?.map(v => v.userEnteredValue) || [];
    console.log('  Valores permitidos:', validValues.join(', '));

    const invalidValues = [];
    uniqueValues.forEach((count, val) => {
      if (!validValues.includes(val)) {
        invalidValues.push(val);
      }
    });

    if (invalidValues.length > 0) {
      console.log('\n⚠️  Valores NO incluidos en el dropdown:');
      invalidValues.forEach(v => console.log(`  - "${v}"`));
    } else {
      console.log('\n✓ Todos los valores están en el dropdown');
    }
  } else {
    console.log('\nNo hay validación de dropdown en esta columna.');
  }
}

checkColumnO().catch(console.error);
