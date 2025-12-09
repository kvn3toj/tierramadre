/**
 * Script para arreglar las validaciones de datos desalineadas
 * - Remover validación de columna O (Precio Nacional - no debe tener dropdown)
 * - Verificar validación de columna P (UBICACION)
 * - Verificar validación de columna Q (ASESOR)
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function fixDataValidation() {
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

  console.log('=== Arreglando validación de datos ===\n');

  // First, get the sheet ID
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = metadata.data.sheets.find(s =>
    s.properties.title.toLowerCase().includes('inventario')
  );

  if (!sheet) {
    console.error('No se encontró la hoja de inventario');
    process.exit(1);
  }

  const sheetId = sheet.properties.sheetId;
  console.log('Sheet ID:', sheetId);
  console.log('Sheet Name:', sheet.properties.title);

  // Get current data validations
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [`'${sheet.properties.title}'!O:Q`],
    includeGridData: true,
  });

  const gridData = response.data.sheets[0].data[0];

  console.log('\n=== Validaciones actuales ===');
  if (gridData && gridData.rowData) {
    // Check header row validations
    const headerRow = gridData.rowData[0];
    if (headerRow && headerRow.values) {
      headerRow.values.forEach((cell, i) => {
        const col = String.fromCharCode(79 + i); // O, P, Q
        const validation = cell.dataValidation;
        console.log(`Columna ${col}: ${validation ? 'Tiene validación' : 'Sin validación'}`);
        if (validation) {
          console.log(`  Tipo: ${validation.condition?.type || 'N/A'}`);
          if (validation.condition?.values) {
            console.log(`  Valores: ${validation.condition.values.map(v => v.userEnteredValue).join(', ')}`);
          }
        }
      });
    }

    // Check row 2 validations
    const row2 = gridData.rowData[1];
    if (row2 && row2.values) {
      console.log('\n=== Validaciones en fila 2 ===');
      row2.values.forEach((cell, i) => {
        const col = String.fromCharCode(79 + i); // O, P, Q
        const validation = cell.dataValidation;
        console.log(`${col}2: ${validation ? 'Tiene validación' : 'Sin validación'}`);
        if (validation && validation.condition?.values) {
          const vals = validation.condition.values.map(v => v.userEnteredValue).slice(0, 5);
          console.log(`  Opciones: ${vals.join(', ')}${validation.condition.values.length > 5 ? '...' : ''}`);
        }
      });
    }
  }

  // Remove data validation from column O (should not have dropdown)
  console.log('\n=== Removiendo validación de columna O ===');

  const requests = [
    {
      // Clear data validation from column O (all rows)
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startColumnIndex: 14, // Column O (0-indexed)
          endColumnIndex: 15,
          startRowIndex: 1, // Skip header
          endRowIndex: 200, // Enough rows
        },
        rule: null, // Remove validation
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests },
  });

  console.log('Validación removida de columna O');

  // Verify
  console.log('\n=== Verificando cambios ===');
  const verifyResponse = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [`'${sheet.properties.title}'!O2:Q2`],
    includeGridData: true,
  });

  const verifyData = verifyResponse.data.sheets[0].data[0];
  if (verifyData && verifyData.rowData && verifyData.rowData[0]) {
    verifyData.rowData[0].values.forEach((cell, i) => {
      const col = String.fromCharCode(79 + i);
      const validation = cell.dataValidation;
      console.log(`${col}2: ${validation ? 'Aún tiene validación' : 'SIN validación ✓'}`);
    });
  }

  console.log('\n=== COMPLETADO ===');
  console.log('La columna O (Precio Nacional) ya no tiene dropdown.');
}

fixDataValidation().catch(console.error);
