/**
 * Script para verificar la alineación de columnas en Google Sheets
 * Muestra las primeras filas con sus valores por columna
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function checkColumnAlignment() {
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

  console.log('=== Verificando alineación de columnas ===\n');

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!A:R",
  });

  const rows = response.data.values || [];
  const headers = rows[0] || [];

  // Show headers with column letters
  console.log('=== HEADERS ===');
  headers.forEach((h, i) => {
    const col = String.fromCharCode(65 + i);
    const cleanHeader = String(h).replace(/\n/g, ' ').trim();
    console.log(`  ${col}: "${cleanHeader}"`);
  });

  // Show first 5 data rows
  console.log('\n=== PRIMERAS 5 FILAS DE DATOS ===');
  for (let i = 1; i <= Math.min(5, rows.length - 1); i++) {
    const row = rows[i];
    console.log(`\n--- Fila ${i + 1} ---`);
    headers.forEach((h, j) => {
      const col = String.fromCharCode(65 + j);
      const value = row[j] || '(vacío)';
      const cleanHeader = String(h).replace(/\n/g, ' ').trim().substring(0, 15);
      console.log(`  ${col} (${cleanHeader}): ${String(value).substring(0, 30)}`);
    });
  }

  // Specifically check columns M, N, O, P, Q for a few rows
  console.log('\n=== COLUMNAS M-Q (Precios y Ubicación) ===');
  console.log('Header M:', headers[12]?.replace(/\n/g, ' '));
  console.log('Header N:', headers[13]?.replace(/\n/g, ' '));
  console.log('Header O:', headers[14]?.replace(/\n/g, ' '));
  console.log('Header P:', headers[15]?.replace(/\n/g, ' '));
  console.log('Header Q:', headers[16]?.replace(/\n/g, ' '));

  console.log('\nValores para Items 1-5:');
  for (let i = 1; i <= 5; i++) {
    const row = rows[i];
    const item = row[1]; // B
    const nombre = row[3]; // D
    console.log(`\nItem #${item} "${nombre}":`);
    console.log(`  M (costo): ${row[12] || '(vacío)'}`);
    console.log(`  N (precio): ${row[13] || '(vacío)'}`);
    console.log(`  O (nac): ${row[14] || '(vacío)'}`);
    console.log(`  P (ubic): ${row[15] || '(vacío)'}`);
    console.log(`  Q (asesor): ${row[16] || '(vacío)'}`);
  }
}

checkColumnAlignment().catch(console.error);
