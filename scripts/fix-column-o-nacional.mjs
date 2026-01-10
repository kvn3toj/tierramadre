/**
 * Script para arreglar columna O (Precio Nacional)
 * - Agrega fórmula =ROUND(N*0.8, 0) para calcular precio nacional (-20%)
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function fixColumnO() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
    process.exit(1);
  }

  const credentials = JSON.parse(Buffer.from(key, 'base64').toString());
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = new sheets_v4.Sheets({ auth });

  console.log('=== Arreglando columna O (Precio Nacional) ===\n');

  // First, read to know how many rows we have
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!B:B", // Item column
  });

  const rows = response.data.values || [];
  const dataRows = rows.length - 1; // Exclude header

  console.log(`Total filas de datos: ${dataRows}`);

  // Create formulas for column O (Precio Nacional = Precio COP * 0.8)
  const formulas = [];
  for (let i = 2; i <= rows.length; i++) {
    // Formula: if N has a value, calculate 80%, otherwise empty
    formulas.push([`=IF(N${i}="","",ROUND(N${i}*0.8,0))`]);
  }

  console.log(`Aplicando fórmula a ${formulas.length} filas...`);

  // Apply formulas to column O
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'INVENTARIO Tierra.Madre'!O2:O${rows.length}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: formulas,
    },
  });

  console.log('\n=== Verificando resultados ===');

  // Read back first 5 rows to verify
  const verifyResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!N2:O6",
  });

  const verifyRows = verifyResponse.data.values || [];
  console.log('\nPrimeras 5 filas (N: Precio COP, O: Precio Nacional):');
  verifyRows.forEach((row, i) => {
    console.log(`  Fila ${i + 2}: N=${row[0] || '(vacío)'} → O=${row[1] || '(vacío)'}`);
  });

  console.log('\n=== COMPLETADO ===');
  console.log('La columna O ahora calcula automáticamente el 80% del precio COP.');
  console.log('\nNOTA: La validación de datos (dropdown) en columna O debe removerse manualmente en Google Sheets.');
}

fixColumnO().catch(console.error);
