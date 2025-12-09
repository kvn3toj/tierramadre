/**
 * Script para eliminar validación de dropdown en columna D (Puntuación del Jurado)
 * de la hoja CUALIFICACION -PRECIO
 *
 * El problema: El dropdown espera "0.1" pero los valores tienen formato "0.10"
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function fixColumnD() {
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

  // Get sheet metadata
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const pricingSheet = metadata.data.sheets.find(s =>
    s.properties.title.includes('CUALIFICACION')
  );

  if (!pricingSheet) {
    console.error('No se encontró la hoja CUALIFICACION -PRECIO');
    process.exit(1);
  }

  const sheetId = pricingSheet.properties.sheetId;
  const sheetName = pricingSheet.properties.title;
  console.log(`Sheet: "${sheetName}" (ID: ${sheetId})`);

  // Remove validation from column D (index 3)
  console.log('\nEliminando validación de dropdown de columna D...');

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        setDataValidation: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: 500,
            startColumnIndex: 3, // D
            endColumnIndex: 4,
          },
          rule: null, // Remove validation
        },
      }],
    },
  });

  console.log('✓ Validación de dropdown eliminada de columna D (Puntuación del Jurado)');
  console.log('\nRecarga la hoja de Google Sheets para ver los cambios.');
}

fixColumnD().catch(console.error);
