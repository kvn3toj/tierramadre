import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load .env.local
config({ path: '.env.local' });

async function getHeaders() {
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
  const spreadsheetId = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

  // Get headers from row 1
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'INVENTARIO Tierra.Madre'!A1:T1",
  });

  const headers = response.data.values[0];
  console.log('=== ESTRUCTURA REAL DE COLUMNAS ===\n');
  headers.forEach((header, idx) => {
    const col = String.fromCharCode(65 + idx);
    const isEmpty = !header || header.trim() === '';
    const display = isEmpty ? '(VACÍA)' : header.replace(/\n/g, ' ').trim();
    console.log(`${col} (índice ${idx}): ${display}`);
  });

  console.log('\n=== ÍNDICES PARA DROPDOWNS ===');

  const findIndex = (search) => headers.findIndex(h => h && h.toLowerCase().includes(search));

  console.log('Color:', findIndex('color'));
  console.log('Calidad:', findIndex('calidad'));
  console.log('Talla:', findIndex('talla'));
  console.log('UBICACION:', findIndex('ubicacion'));
  console.log('ESTADO:', findIndex('estado'));

  // Find Medidas columns
  const medidaIndices = [];
  headers.forEach((h, i) => {
    if (h && h.toLowerCase().includes('medid')) {
      medidaIndices.push({ idx: i, header: h.replace(/\n/g, ' ').trim() });
    }
  });
  console.log('Medidas columns:', medidaIndices);

  // También verificar una fila de datos para confirmar alineación
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'INVENTARIO Tierra.Madre'!A2:J2",
  });

  console.log('\n=== FILA 2 (DATOS) ===');
  const row2 = dataResponse.data.values?.[0] || [];
  row2.forEach((val, idx) => {
    const col = String.fromCharCode(65 + idx);
    console.log(`${col} (${idx}): "${val}"`);
  });

  // Verificar validaciones existentes
  const sheetResponse = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: ["'INVENTARIO Tierra.Madre'!E2:F2"],
    includeGridData: true,
  });

  console.log('\n=== VALIDACIONES EN E2 y F2 ===');
  const gridData = sheetResponse.data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values || [];
  gridData.forEach((cell, idx) => {
    const col = idx === 0 ? 'E' : 'F';
    console.log(`${col}: valor="${cell.formattedValue || ''}", tiene validación: ${!!cell.dataValidation}`);
    if (cell.dataValidation) {
      const vals = cell.dataValidation.condition?.values?.slice(0, 3).map(v => v.userEnteredValue);
      console.log(`   Opciones: ${vals?.join(', ')}...`);
    }
  });
}

getHeaders().catch(console.error);
