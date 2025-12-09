/**
 * Script para analizar la hoja CUALIFICACION -PRECIO
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function analyzeHoja2() {
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

  console.log('=== Analizando Hoja 2: CUALIFICACION -PRECIO ===\n');

  // Get sheet metadata
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  console.log('=== Hojas disponibles ===');
  metadata.data.sheets.forEach((s, i) => {
    console.log(`${i + 1}. "${s.properties.title}" (ID: ${s.properties.sheetId})`);
  });

  // Find CUALIFICACION sheet
  const cualificacionSheet = metadata.data.sheets.find(s =>
    s.properties.title.toLowerCase().includes('cualificacion')
  );

  if (!cualificacionSheet) {
    console.log('\nNo se encontró la hoja CUALIFICACION');
    return;
  }

  const sheetName = cualificacionSheet.properties.title;
  console.log(`\n=== Analizando: "${sheetName}" ===\n`);

  // Get data with grid info
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [`'${sheetName}'!A1:Z10`],
    includeGridData: true,
  });

  const gridData = response.data.sheets[0].data[0];

  if (!gridData || !gridData.rowData) {
    console.log('No grid data found');
    return;
  }

  // Show headers
  const headerRow = gridData.rowData[0];
  console.log('=== HEADERS ===');
  headerRow.values.forEach((cell, i) => {
    const col = String.fromCharCode(65 + i);
    const value = cell.formattedValue || '';
    if (value) {
      console.log(`${col}: "${value.replace(/\n/g, ' ').trim()}"`);
    }
  });

  // Show validations in row 2
  console.log('\n=== VALIDACIONES EN FILA 2 ===');
  if (gridData.rowData[1]) {
    gridData.rowData[1].values.forEach((cell, i) => {
      const col = String.fromCharCode(65 + i);
      const header = headerRow.values[i]?.formattedValue?.replace(/\n/g, ' ').trim() || '';
      const validation = cell.dataValidation;

      if (validation) {
        console.log(`\n${col} (${header}):`);
        console.log(`  Tipo: ${validation.condition?.type || 'N/A'}`);
        if (validation.condition?.values) {
          const options = validation.condition.values.map(v => v.userEnteredValue);
          console.log(`  Opciones (${options.length}): ${options.slice(0, 5).join(', ')}${options.length > 5 ? '...' : ''}`);
        }
      }
    });
  }

  // Show first few rows of data
  console.log('\n=== PRIMERAS FILAS DE DATOS ===');
  for (let r = 1; r < Math.min(5, gridData.rowData.length); r++) {
    const row = gridData.rowData[r];
    if (row && row.values) {
      const values = row.values.map((cell, i) => {
        const col = String.fromCharCode(65 + i);
        return `${col}:${cell.formattedValue || ''}`;
      }).filter(v => v.split(':')[1]).slice(0, 8);
      console.log(`Fila ${r + 1}: ${values.join(' | ')}`);
    }
  }
}

analyzeHoja2().catch(console.error);
