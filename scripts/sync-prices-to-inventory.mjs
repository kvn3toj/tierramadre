/**
 * Script para sincronizar precios de CUALIFICACION -PRECIO a INVENTARIO
 * Copia el Precio Nacional Final (columna I) al Precio COP (columna N) del inventario
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

/**
 * Normalize string for comparison: remove accents, newlines, extra spaces
 */
function normalizeForComparison(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function syncPricesToInventory() {
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

  // 1. Read pricing data from CUALIFICACION -PRECIO
  console.log('=== Leyendo CUALIFICACION -PRECIO ===');
  const pricingResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'CUALIFICACION -PRECIO'!A:I",
  });

  const pricingRows = pricingResponse.data.values || [];
  const pricingData = pricingRows.slice(1); // Skip header

  // Create price map by normalized name
  const priceMap = new Map();
  for (const row of pricingData) {
    const nombre = row[0];
    const precioNacional = row[8]; // Column I: Precio Nacional Final
    if (nombre && precioNacional) {
      const normalizedName = normalizeForComparison(nombre);
      priceMap.set(normalizedName, precioNacional);
    }
  }
  console.log(`  ${priceMap.size} productos con precio en CUALIFICACION`);

  // 2. Read inventory to get names
  console.log('\n=== Leyendo INVENTARIO ===');
  const inventoryResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!A:Q",
  });

  const inventoryRows = inventoryResponse.data.values || [];
  const inventoryHeader = inventoryRows[0];
  const inventoryData = inventoryRows.slice(1);
  console.log(`  ${inventoryData.length} productos en inventario`);

  // 3. Find products that need price update
  const updates = [];
  let matched = 0;
  let notMatched = 0;
  let alreadyHasPrice = 0;

  for (let i = 0; i < inventoryData.length; i++) {
    const row = inventoryData[i];
    const nombre = row[3]; // Column D: Nombre
    const currentPrice = row[13]; // Column N: Precio COP

    if (!nombre) continue;

    const normalizedName = normalizeForComparison(nombre);
    const newPrice = priceMap.get(normalizedName);

    if (newPrice) {
      const currentPriceNum = parseInt(String(currentPrice || '0').replace(/[$,\s]/g, '')) || 0;
      const newPriceNum = parseInt(String(newPrice).replace(/[$,\s]/g, '')) || 0;

      if (currentPriceNum === 0 && newPriceNum > 0) {
        updates.push({
          row: i + 2, // +2 because we skipped header and 1-indexed
          nombre: nombre.replace(/\n/g, ' ').trim(),
          oldPrice: currentPrice || '$0',
          newPrice,
        });
        matched++;
      } else if (currentPriceNum > 0) {
        alreadyHasPrice++;
      }
    } else {
      notMatched++;
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`  Productos a actualizar: ${updates.length}`);
  console.log(`  Ya tienen precio: ${alreadyHasPrice}`);
  console.log(`  Sin match en pricing: ${notMatched}`);

  if (updates.length === 0) {
    console.log('\nNo hay productos que necesiten actualización de precio.');
    return;
  }

  console.log(`\n=== Actualizaciones ===`);
  updates.slice(0, 10).forEach(u => {
    console.log(`  Fila ${u.row}: "${u.nombre}" - ${u.oldPrice} → ${u.newPrice}`);
  });
  if (updates.length > 10) {
    console.log(`  ... y ${updates.length - 10} más`);
  }

  // 4. Apply updates
  console.log('\n=== Aplicando actualizaciones ===');

  const batchData = updates.map(u => ({
    range: `'INVENTARIO Tierra.Madre'!N${u.row}`,
    values: [[u.newPrice]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: batchData,
    },
  });

  console.log(`✓ ${updates.length} precios actualizados en INVENTARIO`);
  console.log('\n=== COMPLETADO ===');
  console.log('Recarga la hoja de Google Sheets para ver los cambios.');
}

syncPricesToInventory().catch(console.error);
