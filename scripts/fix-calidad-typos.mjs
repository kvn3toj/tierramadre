/**
 * Script para corregir errores de tipeo en la columna Calidad
 * "Comercial Final" → "Comercial Fina"
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Mapeo de correcciones
const CORRECTIONS = {
  'Comercial Final': 'Comercial Fina',
};

async function fixCalidadTypos() {
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

  // Leer columna Calidad (G)
  console.log('=== Leyendo columna Calidad del INVENTARIO ===');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!G:G",
  });

  const values = response.data.values || [];
  const updates = [];

  // Encontrar celdas que necesitan corrección
  values.forEach((row, idx) => {
    const value = row[0];
    if (value && CORRECTIONS[value]) {
      updates.push({
        row: idx + 1, // 1-indexed
        oldValue: value,
        newValue: CORRECTIONS[value],
      });
    }
  });

  if (updates.length === 0) {
    console.log('No se encontraron valores que necesiten corrección.');
    return;
  }

  console.log(`\nEncontrados ${updates.length} valores a corregir:`);
  updates.forEach(u => console.log(`  Fila ${u.row}: "${u.oldValue}" → "${u.newValue}"`));

  // Aplicar correcciones
  console.log('\n=== Aplicando correcciones ===');

  const batchData = updates.map(u => ({
    range: `'INVENTARIO Tierra.Madre'!G${u.row}`,
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

fixCalidadTypos().catch(console.error);
