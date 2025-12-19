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
  // Columns: A=Item, B=Nombre, H=Precio Internacional (PFU), J=Precio Nacional
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
  // Column A = Item, Column H = Precio Internacional (PFU), Column J = Precio Nacional
  const priceMap = new Map();
  for (const row of pricingData) {
    const item = parseInt(String(row[0]).replace(/\D/g, ''), 10);
    const precioInternacional = parsePrice(row[7]); // Column H (0-indexed = 7)
    const precioNacional = parsePrice(row[9]); // Column J (0-indexed = 9)

    if (item && precioInternacional > 0) {
      priceMap.set(item, {
        precioInternacional,
        precioNacional,
      });
      console.log(`  Item ${item}: Internacional=$${precioInternacional.toLocaleString()}, Nacional=$${precioNacional.toLocaleString()}`);
    }
  }

  console.log(`\n  ${priceMap.size} productos con precios en CUALIFICACION`);

  // 2. Read current inventory.ts
  const inventoryPath = path.join(__dirname, '../src/data/inventory.ts');
  let inventoryContent = fs.readFileSync(inventoryPath, 'utf-8');

  // 3. Update inventory items with precioInternacional
  let updatedCount = 0;
  let skippedCount = 0;

  for (const [itemNum, prices] of priceMap.entries()) {
    // Find the item in inventory.ts and add precioInternacional after precioCOP
    const itemPattern = new RegExp(
      `(item:\\s*${itemNum},\\s*[\\s\\S]*?precioCOP:\\s*\\d+,)`,
      'g'
    );

    const match = inventoryContent.match(itemPattern);
    if (match) {
      // Check if already has precioInternacional
      if (inventoryContent.includes(`item: ${itemNum},`) &&
          inventoryContent.match(new RegExp(`item:\\s*${itemNum},[\\s\\S]*?precioInternacional:`))) {
        console.log(`  Item ${itemNum}: ya tiene precioInternacional, actualizando...`);
        // Update existing value
        const updatePattern = new RegExp(
          `(item:\\s*${itemNum},[\\s\\S]*?)precioInternacional:\\s*\\d+`,
          'g'
        );
        inventoryContent = inventoryContent.replace(updatePattern, `$1precioInternacional: ${prices.precioInternacional}`);
        updatedCount++;
      } else {
        // Add new precioInternacional field
        inventoryContent = inventoryContent.replace(
          itemPattern,
          `$1\n    precioInternacional: ${prices.precioInternacional},`
        );
        updatedCount++;
        console.log(`  Item ${itemNum}: agregado precioInternacional=$${prices.precioInternacional.toLocaleString()}`);
      }
    } else {
      console.log(`  Item ${itemNum}: no encontrado en inventory.ts`);
      skippedCount++;
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
