/**
 * Script para verificar productos con precios vacíos en Google Sheets
 * Columna M = precioCOP (precio nacional)
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function checkMissingPrices() {
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

  console.log('=== Verificando productos con precios vacíos ===\n');

  // Read columns A (Item), C (Nombre), M (precioCOP), P (Estado)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!A:R",
  });

  const rows = response.data.values || [];
  const headers = rows[0] || [];

  // Log header columns to understand structure
  console.log('=== Columnas encontradas ===');
  headers.forEach((h, i) => console.log(`  ${String.fromCharCode(65 + i)}: ${h}`));
  console.log();

  // Find column indices (based on actual header layout)
  const itemCol = 1;  // B (Item)
  const nombreCol = 3;  // D (Nombre)
  const precioCol = 13; // N (Precio COP)
  const estadoCol = 15; // P (UBICACION)

  const missingPrices = [];
  const zeroPrices = [];
  const validProducts = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item = row[itemCol];
    const nombre = row[nombreCol] || 'Sin nombre';
    const precio = row[precioCol];
    const estado = row[estadoCol] || '';

    // Skip empty rows
    if (!item || item === '' || item === '#') continue;

    const priceValue = precio ? parseInt(String(precio).replace(/[^0-9]/g, '')) : 0;

    if (!precio || precio === '' || precio === '-') {
      missingPrices.push({ item, nombre, precio: 'VACÍO', estado, row: i + 1 });
    } else if (priceValue === 0) {
      zeroPrices.push({ item, nombre, precio, estado, row: i + 1 });
    } else {
      validProducts.push({ item, nombre, precio: priceValue, estado });
    }
  }

  console.log(`=== Resumen ===`);
  console.log(`Total productos: ${validProducts.length + missingPrices.length + zeroPrices.length}`);
  console.log(`Con precio válido: ${validProducts.length}`);
  console.log(`Con precio vacío: ${missingPrices.length}`);
  console.log(`Con precio = 0: ${zeroPrices.length}`);

  if (missingPrices.length > 0) {
    console.log(`\n=== Productos SIN precio (columna M vacía) ===`);
    missingPrices.forEach(p => {
      console.log(`  Fila ${p.row}: Item #${p.item} - "${p.nombre}" [${p.estado}]`);
    });
  }

  if (zeroPrices.length > 0) {
    console.log(`\n=== Productos con precio = 0 ===`);
    zeroPrices.forEach(p => {
      console.log(`  Fila ${p.row}: Item #${p.item} - "${p.nombre}" [${p.estado}] - precio: "${p.precio}"`);
    });
  }

  // Check for "Hijos del sol" specifically
  console.log(`\n=== Buscando "Hijos del sol" ===`);
  const hijosDelSol = [...validProducts, ...missingPrices, ...zeroPrices].filter(
    p => p.nombre.toLowerCase().includes('hijos')
  );
  if (hijosDelSol.length > 0) {
    hijosDelSol.forEach(p => {
      console.log(`  Item #${p.item}: "${p.nombre}" - Precio: ${p.precio} [${p.estado}]`);
    });
  } else {
    console.log('  No encontrado en Google Sheets');
  }

  return { missingPrices, zeroPrices, validProducts };
}

checkMissingPrices().catch(console.error);
