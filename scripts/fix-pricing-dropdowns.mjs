/**
 * Script para limpiar y re-aplicar validaciones en hoja CUALIFICACION -PRECIO
 * Solo aplica a las filas con datos, no a filas vacías
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Opciones de dropdown para pricing
const DROPDOWN_OPTIONS = {
  puntuacionJurado: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5],
  factorCalidad: [0.1, 0.2, 0.3, 0.4, 0.6, 0.8],
};

async function fixPricingDropdowns() {
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

  // Get sheet info
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const pricingSheet = metadata.data.sheets.find(s =>
    s.properties.title.toLowerCase().includes('cualificacion')
  );

  if (!pricingSheet) {
    console.error('No se encontró la hoja CUALIFICACION');
    process.exit(1);
  }

  const sheetId = pricingSheet.properties.sheetId;
  const sheetName = pricingSheet.properties.title;
  console.log(`Sheet: "${sheetName}" (ID: ${sheetId})`);

  // Count rows with data
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A:A`,
  });
  const rowCount = dataResponse.data.values?.filter(r => r[0] && r[0].trim()).length || 0;
  console.log(`Filas con datos: ${rowCount}`);

  // PASO 1: Limpiar TODAS las validaciones existentes en columnas D y E
  console.log('\n=== PASO 1: Limpiando validaciones existentes ===');

  const clearRequests = [
    // Limpiar columna D (Puntuación del Jurado) - desde fila 2 hasta 500
    {
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 500,
          startColumnIndex: 3, // D
          endColumnIndex: 4,
        },
        rule: null,
      },
    },
    // Limpiar columna E (Factor de Calidad) - desde fila 2 hasta 500
    {
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 500,
          startColumnIndex: 4, // E
          endColumnIndex: 5,
        },
        rule: null,
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests: clearRequests },
  });
  console.log('Validaciones limpiadas');

  // PASO 2: Re-aplicar validaciones SOLO hasta las filas con datos
  console.log('\n=== PASO 2: Aplicando validaciones correctas ===');

  const endRow = rowCount + 1; // +1 para incluir la última fila con datos

  const validationRequests = [
    // Puntuación del Jurado (D) - índice 3
    {
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: endRow,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: DROPDOWN_OPTIONS.puntuacionJurado.map(v => ({ userEnteredValue: String(v) })),
          },
          inputMessage: '📊 Puntuación del Jurado\nBasado en evaluación experta',
          showCustomUi: true,
          strict: false,
        },
      },
    },
    // Factor de Calidad (E) - índice 4
    {
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: endRow,
          startColumnIndex: 4,
          endColumnIndex: 5,
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: DROPDOWN_OPTIONS.factorCalidad.map(v => ({ userEnteredValue: String(v) })),
          },
          inputMessage: '💎 Factor de Calidad:\n0.1 = Comercial Estándar\n0.2 = Superior\n0.3 = Fina\n0.4 = SuperFina\n0.6 = Esencial\n0.8 = Sublime',
          showCustomUi: true,
          strict: false,
        },
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests: validationRequests },
  });

  console.log(`✓ Puntuación del Jurado -> Columna D (filas 2-${endRow})`);
  console.log(`✓ Factor de Calidad -> Columna E (filas 2-${endRow})`);

  console.log('\n=== COMPLETADO ===');
  console.log(`Validaciones aplicadas solo a las ${rowCount} filas con datos.`);
  console.log('Las filas vacías ya no tendrán dropdowns.');
}

fixPricingDropdowns().catch(console.error);
