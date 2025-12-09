/**
 * Script para auto-llenar Factor de Calidad en hoja CUALIFICACION -PRECIO
 * Usa VLOOKUP para buscar la Calidad del producto en INVENTARIO
 * y SWITCH para convertirla al factor numérico correspondiente
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function autoFillFactorCalidad() {
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
  const rowsWithData = dataResponse.data.values?.filter(r => r[0] && r[0].trim()).length || 0;
  console.log(`Filas con datos: ${rowsWithData}`);

  // PASO 1: Eliminar validación de dropdown en columna E
  console.log('\n=== PASO 1: Eliminando validación dropdown de columna E ===');

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        setDataValidation: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: 500,
            startColumnIndex: 4, // E
            endColumnIndex: 5,
          },
          rule: null, // Eliminar validación
        },
      }],
    },
  });
  console.log('Validación eliminada de columna E');

  // PASO 2: Preparar fórmulas para cada fila
  console.log('\n=== PASO 2: Preparando fórmulas VLOOKUP+SWITCH ===');

  // La fórmula busca el nombre del producto en columna D del inventario
  // y devuelve la Calidad de columna G (4ta columna del rango D:G)
  // Luego convierte la Calidad textual al factor numérico
  const formulas = [];
  for (let row = 2; row <= rowsWithData; row++) {
    // Fórmula que busca por nombre y convierte Calidad a Factor
    const formula = `=IFERROR(SWITCH(VLOOKUP(A${row},'INVENTARIO Tierra.Madre'!$D:$G,4,FALSE),"Comercial Estándar",0.1,"Comercial Superior",0.2,"Comercial Fina",0.3,"Comercial SuperFina",0.4,"Esencial",0.6,"Sublime",0.8,"Fina",0.3,"Plata - comercial",0.1,"Comercial Final",0.3,""),"")`;
    formulas.push([formula]);
  }

  console.log(`Preparadas ${formulas.length} fórmulas`);

  // PASO 3: Escribir fórmulas en columna E
  console.log('\n=== PASO 3: Escribiendo fórmulas en columna E ===');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!E2:E${rowsWithData}`,
    valueInputOption: 'USER_ENTERED', // Importante para que interprete fórmulas
    resource: {
      values: formulas,
    },
  });

  console.log(`✓ ${formulas.length} fórmulas escritas en columna E (filas 2-${rowsWithData})`);

  console.log('\n=== COMPLETADO ===');
  console.log('El Factor de Calidad ahora se calcula automáticamente');
  console.log('basado en la Calidad del producto en INVENTARIO.');
  console.log('\nMapeo aplicado:');
  console.log('  Comercial Estándar → 0.1');
  console.log('  Comercial Superior → 0.2');
  console.log('  Comercial Fina → 0.3');
  console.log('  Comercial SuperFina → 0.4');
  console.log('  Esencial → 0.6');
  console.log('  Sublime → 0.8');
}

autoFillFactorCalidad().catch(console.error);
