/**
 * Script para sincronizar precios de CUALIFICACION-PRECIO a inventory.ts
 * Lee Column H (Precio Internacional) y Column J (Precio Nacional) de Google Sheets
 * y actualiza el archivo inventory.ts con precioInternacional
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
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
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = new sheets_v4.Sheets({ auth });

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
  // Column H = International price, Column J = National price (after 20% discount)
  const priceMap = new Map();
  for (const row of pricingData) {
    const item = parseInt(String(row[0]).replace(/\D/g, ''), 10);
    const precioInternacional = parsePrice(row[7]); // Column H (0-indexed = 7)
    const precioNacional = parsePrice(row[9]); // Column J (0-indexed = 9)

    if (item && precioInternacional > 0) {
      priceMap.set(item, { internacional: precioInternacional, nacional: precioNacional });
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

  for (const [itemNum, prices] of priceMap.entries()) {
    const { internacional, nacional } = prices;

    // First, check if this item exists in the file
    const itemExistsRegex = new RegExp(`item:\\s*${itemNum},`);
    if (!itemExistsRegex.test(inventoryContent)) {
      console.log(`  Item ${itemNum}: no encontrado en inventory.ts`);
      skippedCount++;
      continue;
    }

    // 1. Update precioCOP (national price)
    const updateCOPRegex = new RegExp(
      `(item:\\s*${itemNum},[^}]*precioCOP:\\s*)\\d+`,
    );
    if (nacional > 0 && updateCOPRegex.test(inventoryContent)) {
      inventoryContent = inventoryContent.replace(updateCOPRegex, `$1${nacional}`);
    }

    // 2. Update or add precioInternacional
    const hasIntlPriceRegex = new RegExp(
      `item:\\s*${itemNum},[^}]*precioInternacional:`
    );

    if (hasIntlPriceRegex.test(inventoryContent)) {
      // Update existing precioInternacional
      const updateRegex = new RegExp(
        `(item:\\s*${itemNum},[^}]*precioInternacional:\\s*)\\d+`,
      );
      inventoryContent = inventoryContent.replace(updateRegex, `$1${internacional}`);
    } else {
      // Add precioInternacional after precioCOP
      const addRegex = new RegExp(
        `(item:\\s*${itemNum},[^}]*precioCOP:\\s*\\d+,)`,
      );

      if (addRegex.test(inventoryContent)) {
        inventoryContent = inventoryContent.replace(
          addRegex,
          `$1\n    precioInternacional: ${internacional},`
        );
      }
    }

    console.log(`  Item ${itemNum}: Nacional=$${nacional.toLocaleString()}, Internacional=$${internacional.toLocaleString()}`);
    updatedCount++;
  }

  // 4. Write updated inventory.ts
  fs.writeFileSync(inventoryPath, inventoryContent, 'utf-8');

  console.log(`\n=== RESUMEN ===`);
  console.log(`  Actualizados: ${updatedCount}`);
  console.log(`  No encontrados: ${skippedCount}`);
  console.log(`\n✓ inventory.ts actualizado`);
}

syncPricesFromSheets().catch(console.error);
