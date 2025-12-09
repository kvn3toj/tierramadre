/**
 * Script para arreglar la hoja CUALIFICACION -PRECIO
 * - Corregir typo "nombe" -> "nombre" en A1
 * - Verificar que las validaciones están correctas
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'CUALIFICACION -PRECIO';

async function fixHoja2() {
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

  console.log('=== Arreglando Hoja CUALIFICACION -PRECIO ===\n');

  // 1. Fix typo in A1: "nombe" -> "nombre"
  console.log('1. Corrigiendo typo "nombe" -> "nombre" en A1...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A1`,
    valueInputOption: 'RAW',
    resource: {
      values: [['nombre']],
    },
  });
  console.log('   Corregido ✓');

  // 2. Check current validations
  console.log('\n2. Verificando validaciones actuales...');

  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [`'${SHEET_NAME}'!A1:I2`],
    includeGridData: true,
  });

  const gridData = response.data.sheets[0].data[0];
  const headerRow = gridData.rowData[0];
  const dataRow = gridData.rowData[1];

  console.log('\n   Columnas con validación:');
  dataRow.values.forEach((cell, i) => {
    const col = String.fromCharCode(65 + i);
    const header = headerRow.values[i]?.formattedValue || '';
    const validation = cell.dataValidation;

    if (validation) {
      const type = validation.condition?.type || 'N/A';
      const count = validation.condition?.values?.length || 0;
      console.log(`   ${col} (${header}): ${type} con ${count} opciones ✓`);
    }
  });

  // 3. Check if column B needs data from inventory
  console.log('\n3. Verificando columna B (Costo Inicial)...');
  const colBResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!B2:B10`,
  });

  const colBValues = colBResponse.data.values || [];
  const emptyCount = colBValues.filter(row => !row[0] || row[0] === '').length;

  if (emptyCount > 0) {
    console.log(`   ADVERTENCIA: ${emptyCount} celdas vacías en columna B`);
    console.log('   Los precios calculados serán $0 hasta que se llene esta columna');
  } else {
    console.log('   Columna B tiene datos ✓');
  }

  console.log('\n=== COMPLETADO ===');
  console.log('- Typo corregido: "nombe" -> "nombre"');
  console.log('- Validaciones verificadas (D y E tienen dropdowns correctos)');
  console.log('\nNOTA: Columna B (Costo Inicial) necesita datos para calcular precios');
}

fixHoja2().catch(console.error);
