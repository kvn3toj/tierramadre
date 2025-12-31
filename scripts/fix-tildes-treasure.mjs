/**
 * Script para corregir tildes en el inventario de Google Sheets
 * - Columna G (Calidad): Estandar → Estándar
 * - Columna H (Talla): Corazon → Corazón, Ovalo → Óvalo, Lagrima → Lágrima
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Mapeo de correcciones para Calidad (Columna G)
const CALIDAD_CORRECTIONS = {
  'Comercial Estandar': 'Comercial Estándar',
  'Estandar': 'Estándar',
};

// Mapeo de correcciones para Talla (Columna H)
const TALLA_CORRECTIONS = {
  'Corazon': 'Corazón',
  'Ovalo': 'Óvalo',
  'Lagrima': 'Lágrima',
};

async function fixTildes() {
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
  const allUpdates = [];

  // === Fix Calidad (Column G) ===
  console.log('=== Leyendo columna Calidad (G) ===');
  const calidadResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!G:G",
  });

  const calidadValues = calidadResponse.data.values || [];
  calidadValues.forEach((row, idx) => {
    const value = row[0];
    if (value && CALIDAD_CORRECTIONS[value]) {
      allUpdates.push({
        range: `'INVENTARIO Tierra.Madre'!G${idx + 1}`,
        values: [[CALIDAD_CORRECTIONS[value]]],
        description: `G${idx + 1}: "${value}" → "${CALIDAD_CORRECTIONS[value]}"`,
      });
    }
  });

  // === Fix Talla (Column H) ===
  console.log('=== Leyendo columna Talla (H) ===');
  const tallaResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!H:H",
  });

  const tallaValues = tallaResponse.data.values || [];
  tallaValues.forEach((row, idx) => {
    const value = row[0];
    if (value && TALLA_CORRECTIONS[value]) {
      allUpdates.push({
        range: `'INVENTARIO Tierra.Madre'!H${idx + 1}`,
        values: [[TALLA_CORRECTIONS[value]]],
        description: `H${idx + 1}: "${value}" → "${TALLA_CORRECTIONS[value]}"`,
      });
    }
  });

  // === Fix Nombre (Column C) - Corazon in names ===
  console.log('=== Leyendo columna Nombre (C) ===');
  const nombreResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!C:C",
  });

  const nombreValues = nombreResponse.data.values || [];
  nombreValues.forEach((row, idx) => {
    const value = row[0];
    if (value && value.includes('Corazon')) {
      const newValue = value.replace(/Corazon/g, 'Corazón');
      allUpdates.push({
        range: `'INVENTARIO Tierra.Madre'!C${idx + 1}`,
        values: [[newValue]],
        description: `C${idx + 1}: "${value}" → "${newValue}"`,
      });
    }
  });

  if (allUpdates.length === 0) {
    console.log('\n✓ No se encontraron valores que necesiten corrección de tildes.');
    return;
  }

  console.log(`\n=== Encontrados ${allUpdates.length} valores a corregir ===`);
  allUpdates.forEach(u => console.log(`  ${u.description}`));

  // Aplicar correcciones
  console.log('\n=== Aplicando correcciones ===');

  const batchData = allUpdates.map(u => ({
    range: u.range,
    values: u.values,
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      valueInputOption: 'RAW',
      data: batchData,
    },
  });

  console.log(`✓ ${allUpdates.length} valores corregidos`);
  console.log('\n=== COMPLETADO ===');
  console.log('Recarga la hoja de Google Sheets para ver los cambios.');
}

fixTildes().catch(console.error);
