/**
 * Script para sincronizar precios de inventory.ts a Google Sheets
 * Actualiza columna N (Precio COP) con los precios del inventario local
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Prices from inventory.ts - mapped by item number
const LOCAL_PRICES = {
  1: 635000,
  2: 185000,
  3: 294000,
  4: 674000,
  5: 499000,
  6: 443000,
  7: 567000,
  8: 299000,
  9: 238000,
  10: 357000,
  11: 294000,
  12: 170000,
  13: 166000,
  14: 134000,
  15: 303000,
  16: 222000,
  17: 154000,
  18: 299000,
  19: 791000,
  20: 270000,
  21: 548000,
  22: 383000,
  23: 195000,
  24: 148000,
  25: 166000,
  26: 85000,
  27: 418000,
  28: 134000,
  29: 862000,  // Hijos del sol
  30: 625000,
  31: 222000,
  32: 199000,
  33: 291000,
  34: 274000,
  35: 304200,
  36: 205000,
  37: 168000,
  38: 240000,
  39: 254000,
  40: 222000,
  41: 380000,
  42: 6004000,
  43: 221226,
  44: 5368000,
  45: 5320000,
  46: 9566667,
  47: 27600000,
  48: 380000,
  49: 377778,
  50: 340000,
  51: 377778,
  52: 340000,
  53: 377778,
  54: 425000,
  55: 425000,
  56: 560000,
  61: 299296,
  62: 560000,
  63: 622222,
  64: 3333333,
  65: 3571429,
  66: 469231,
  67: 444112,
  68: 305000,
  69: 330000,
  70: 483750,
  71: 176250,
  72: 306000,
  73: 262500,
  74: 250000,
  75: 226000,
  76: 549000,
  77: 324000,
  78: 198000,
  79: 382000,
  80: 472000,
  81: 580000,
  82: 115000,
  83: 92500,
  84: 122500,
  85: 134800,
  91: 0, // Viento Nocturno - price unknown
};

async function syncPricesToSheets() {
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

  console.log('=== Sincronizando precios a Google Sheets ===\n');

  // Read current data to find rows by item number
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!A:R",
  });

  const rows = response.data.values || [];
  const updates = [];

  // Column indices (based on actual layout)
  const itemCol = 1;  // B (Item)
  const precioCol = 13; // N (Precio COP)

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const itemStr = row[itemCol];
    if (!itemStr || itemStr === '' || itemStr === '#') continue;

    const itemNum = parseInt(itemStr);
    const currentPrecio = row[precioCol];
    const localPrice = LOCAL_PRICES[itemNum];

    // Only update if local price exists and current is empty
    if (localPrice && (!currentPrecio || currentPrecio === '')) {
      updates.push({
        range: `'INVENTARIO Tierra.Madre'!N${i + 1}`,
        values: [[localPrice]],
        description: `Fila ${i + 1}: Item #${itemNum} -> $${localPrice.toLocaleString('es-CO')}`,
      });
    }
  }

  if (updates.length === 0) {
    console.log('No hay precios para actualizar.');
    return;
  }

  console.log(`=== Encontrados ${updates.length} precios para actualizar ===\n`);
  updates.forEach(u => console.log(`  ${u.description}`));

  // Confirm before updating
  console.log('\n=== Aplicando actualizaciones ===');

  const batchData = updates.map(u => ({
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

  console.log(`\n${updates.length} precios actualizados en Google Sheets.`);
  console.log('\n=== COMPLETADO ===');
}

syncPricesToSheets().catch(console.error);
