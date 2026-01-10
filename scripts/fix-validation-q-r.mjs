/**
 * Script para arreglar validaciones de columnas Q y R
 * - Q (ASESOR): Remover validación ESTADO - crear validación con nombres de asesores
 * - R (QR): Remover validación - no debe tener dropdown
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Lista de asesores reales del inventario
const ASESORES = [
  'M.CAMPUZANO',
  'M.ECHEVERRY',
  'A.MOLANO',
  'M.GOMEZ',
  'M.RESTREPO',
  'LA VIKINGA',
  'O.FLOREZ',
  'J.M.Escobar',
  'K.PINEDA',
  'LA NEGRA',
  'J.Florez',
  'D.Suarez',
  'Pablito',
  'K.Michel Moreno',
  'KEVIN- HERMANO',
];

async function fixValidationQR() {
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

  console.log('=== Arreglando validaciones de columnas Q y R ===\n');

  // Get sheet ID
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = metadata.data.sheets.find(s =>
    s.properties.title.toLowerCase().includes('inventario')
  );

  const sheetId = sheet.properties.sheetId;
  console.log('Sheet:', sheet.properties.title);

  const requests = [
    // 1. Remove wrong validation from column Q (ASESOR)
    {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startColumnIndex: 16, // Column Q (0-indexed)
          endColumnIndex: 17,
          startRowIndex: 1,
          endRowIndex: 200,
        },
        rule: null, // Remove validation
      },
    },
    // 2. Add correct ASESOR validation to column Q
    {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startColumnIndex: 16, // Column Q
          endColumnIndex: 17,
          startRowIndex: 1,
          endRowIndex: 200,
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: ASESORES.map(a => ({ userEnteredValue: a })),
          },
          showCustomUi: true,
          strict: false, // Allow other values
        },
      },
    },
    // 3. Remove validation from column R (QR)
    {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startColumnIndex: 17, // Column R (0-indexed)
          endColumnIndex: 18,
          startRowIndex: 1,
          endRowIndex: 200,
        },
        rule: null,
      },
    },
    // 4. Remove validation from column S (also QR)
    {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startColumnIndex: 18, // Column S
          endColumnIndex: 19,
          startRowIndex: 1,
          endRowIndex: 200,
        },
        rule: null,
      },
    },
  ];

  console.log('Aplicando cambios...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests },
  });

  console.log('\n=== Verificando cambios ===');

  // Verify changes
  const verifyResponse = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [`'${sheet.properties.title}'!Q2:S2`],
    includeGridData: true,
  });

  const verifyData = verifyResponse.data.sheets[0].data[0];
  if (verifyData && verifyData.rowData && verifyData.rowData[0]) {
    verifyData.rowData[0].values.forEach((cell, i) => {
      const col = String.fromCharCode(81 + i); // Q, R, S
      const validation = cell.dataValidation;
      if (validation) {
        const firstVal = validation.condition?.values?.[0]?.userEnteredValue || '';
        console.log(`${col}2: Validación con "${firstVal}..."`);
      } else {
        console.log(`${col}2: Sin validación ✓`);
      }
    });
  }

  console.log('\n=== COMPLETADO ===');
  console.log('- Columna Q (ASESOR): Ahora tiene lista de asesores correcta');
  console.log('- Columna R (QR): Sin validación');
  console.log('- Columna S (QR): Sin validación');
}

fixValidationQR().catch(console.error);
