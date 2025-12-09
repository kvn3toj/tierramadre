import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function checkPricingSheet() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const credentials = JSON.parse(Buffer.from(key, 'base64').toString());
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get headers
  const headersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'CUALIFICACION -PRECIO'!A1:I1",
  });

  console.log('=== HEADERS DE CUALIFICACION -PRECIO ===');
  const headers = headersResponse.data.values[0];
  headers.forEach((h, idx) => {
    const col = String.fromCharCode(65 + idx);
    console.log(`${col} (índice ${idx}): ${h}`);
  });

  // Check validations in row 2
  const sheetResponse = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: ["'CUALIFICACION -PRECIO'!A2:I2"],
    includeGridData: true,
  });

  console.log('\n=== VALIDACIONES EN FILA 2 ===');
  const gridData = sheetResponse.data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values || [];
  gridData.forEach((cell, idx) => {
    const col = String.fromCharCode(65 + idx);
    const hasValidation = cell.dataValidation ? true : false;
    console.log(`${col}: valor="${cell.formattedValue || ''}", validación: ${hasValidation}`);
    if (hasValidation && cell.dataValidation.condition?.values) {
      const vals = cell.dataValidation.condition.values.slice(0, 5).map(v => v.userEnteredValue);
      console.log(`   Opciones: ${vals.join(', ')}...`);
    }
  });

  // Check row count
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'CUALIFICACION -PRECIO'!A:A",
  });
  const totalRows = dataResponse.data.values?.length || 0;
  const rowsWithData = dataResponse.data.values?.filter(r => r[0] && r[0].trim()).length || 0;
  console.log(`\nTotal filas: ${totalRows}`);
  console.log(`Filas con nombre: ${rowsWithData}`);

  // Get sheet metadata to find sheetId
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const pricingSheet = metadata.data.sheets.find(s =>
    s.properties.title.toLowerCase().includes('cualificacion')
  );
  console.log(`\nSheet ID: ${pricingSheet?.properties.sheetId}`);
}

checkPricingSheet().catch(console.error);
