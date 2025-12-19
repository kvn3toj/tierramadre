/**
 * Script para sincronizar precios de CUALIFICACION-PRECIO a inventory.ts
 * Lee Column H (Precio Internacional) y Column J (Precio Nacional) de Google Sheets
 * y actualiza el archivo inventory.ts con precioInternacional
 */
import { google } from 'googleapis';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

/**
 * Parse price string to number
 */
function parsePrice(price) {
  if (!price || price === '') return 0;
  const cleaned = String(price).replace(/[$,\s]/g, '').replace(/\./g, '');
  return parseInt(cleaned, 10) || 0;
}

async function syncPricesFromSheets() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
    process.exit(1);
  }

  const credentials = JSON.parse(Buffer.from(key, 'base64').toString());
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Read pricing data from CUALIFICACION-PRECIO
  console.log('=== Leyendo CUALIFICACION -PRECIO ===');
  const pricingResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'CUALIFICACION -PRECIO'!A:J",
  });

  const pricingRows = pricingResponse.data.values || [];
  const header = pricingRows[0] || [];
  const pricingData = pricingRows.slice(1);

  console.log('Header columns:', header);
  console.log(`  ${pricingData.length} filas de datos`);

  // Create price map by Item number
  const priceMap = new Map();
  for (const row of pricingData) {
    const item = parseInt(String(row[0]).replace(/\D/g, ''), 10);
    const precioInternacional = parsePrice(row[7]); // Column H (0-indexed = 7)

    if (item && precioInternacional > 0) {
      priceMap.set(item, precioInternacional);
    }
  }

  console.log(`\n  ${priceMap.size} productos con precios en CUALIFICACION`);

  // 2. Read current inventory.ts
  const inventoryPath = path.join(__dirname, '../src/data/inventory.ts');
  let inventoryContent = fs.readFileSync(inventoryPath, 'utf-8');

  // 3. Update inventory items with precioInternacional
  // Strategy: Find each item block and insert/update precioInternacional after precioCOP
  let updatedCount = 0;
  let skippedCount = 0;

  for (const [itemNum, precioIntl] of priceMap.entries()) {
    // More specific pattern: find "item: X," followed by content until "precioCOP: Y,"
    // and ensure we stay within the same object (don't cross to next item)

    // First, check if this item exists in the file
    const itemExistsRegex = new RegExp(`item:\\s*${itemNum},`);
    if (!itemExistsRegex.test(inventoryContent)) {
      console.log(`  Item ${itemNum}: no encontrado en inventory.ts`);
      skippedCount++;
      continue;
    }

    // Check if already has precioInternacional for this item
    // Find the item block and check within it
    const hasIntlPriceRegex = new RegExp(
      `item:\\s*${itemNum},[^}]*precioInternacional:`
    );

    if (hasIntlPriceRegex.test(inventoryContent)) {
      // Update existing precioInternacional
      const updateRegex = new RegExp(
        `(item:\\s*${itemNum},[^}]*precioInternacional:\\s*)\\d+`,
      );
      inventoryContent = inventoryContent.replace(updateRegex, `$1${precioIntl}`);
      console.log(`  Item ${itemNum}: actualizado precioInternacional=$${precioIntl.toLocaleString()}`);
      updatedCount++;
    } else {
      // Add precioInternacional after precioCOP
      // Pattern: find "item: X," ... "precioCOP: Y," and add precioInternacional after it
      const addRegex = new RegExp(
        `(item:\\s*${itemNum},[^}]*precioCOP:\\s*\\d+,)`,
      );

      if (addRegex.test(inventoryContent)) {
        inventoryContent = inventoryContent.replace(
          addRegex,
          `$1\n    precioInternacional: ${precioIntl},`
        );
        console.log(`  Item ${itemNum}: agregado precioInternacional=$${precioIntl.toLocaleString()}`);
        updatedCount++;
      } else {
        console.log(`  Item ${itemNum}: no se pudo encontrar precioCOP`);
        skippedCount++;
      }
    }
  }

  // 4. Write updated inventory.ts
  fs.writeFileSync(inventoryPath, inventoryContent, 'utf-8');

  console.log(`\n=== RESUMEN ===`);
  console.log(`  Actualizados: ${updatedCount}`);
  console.log(`  No encontrados: ${skippedCount}`);
  console.log(`\n✓ inventory.ts actualizado`);
}

syncPricesFromSheets().catch(console.error);
