/**
 * Script para sincronizar la hoja CUALIFICACION -PRECIO con INVENTARIO
 * - Mantiene el mismo orden que el inventario
 * - Elimina duplicados
 * - Preserva datos de pricing existentes cuando los hay
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

async function syncPricingSheet() {
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

  // 1. Leer datos del inventario
  console.log('=== Leyendo INVENTARIO ===');
  const inventoryResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'INVENTARIO Tierra.Madre'!A:N",
  });

  const inventoryRows = inventoryResponse.data.values || [];
  const inventoryHeaders = inventoryRows[0];
  const inventoryData = inventoryRows.slice(1);

  // Encontrar índices de columnas en inventario
  const findIdx = (headers, ...names) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h && h.toLowerCase().includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const invNombreIdx = findIdx(inventoryHeaders, 'nombre', 'name');
  const invCostoIdx = findIdx(inventoryHeaders, 'costo t.madre', 'costo');

  console.log(`  Columna Nombre: ${invNombreIdx} (${inventoryHeaders[invNombreIdx]})`);
  console.log(`  Columna Costo: ${invCostoIdx} (${inventoryHeaders[invCostoIdx]})`);
  console.log(`  Total productos en inventario: ${inventoryData.length}`);

  // Extraer productos del inventario (nombre y costo)
  const inventoryProducts = inventoryData
    .map(row => ({
      nombre: (row[invNombreIdx] || '').trim(),
      costo: row[invCostoIdx] || '',
    }))
    .filter(p => p.nombre); // Solo productos con nombre

  console.log(`  Productos válidos: ${inventoryProducts.length}`);

  // 2. Leer datos existentes de pricing para preservar valores
  console.log('\n=== Leyendo CUALIFICACION -PRECIO ===');
  const pricingResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'CUALIFICACION -PRECIO'!A:I",
  });

  const pricingRows = pricingResponse.data.values || [];
  const pricingHeaders = pricingRows[0];
  const pricingData = pricingRows.slice(1);

  console.log(`  Filas existentes: ${pricingData.length}`);

  // Crear mapa de datos de pricing existentes por nombre
  const existingPricing = new Map();
  for (const row of pricingData) {
    const nombre = (row[0] || '').trim().toLowerCase();
    if (nombre && !existingPricing.has(nombre)) {
      existingPricing.set(nombre, {
        costoInicial: row[1] || '',
        multCalidad: row[2] || '3.00',
        puntJurado: row[3] || '',
        factorCalidad: row[4] || '',
        // Las columnas F, G, H, I son fórmulas, no las preservamos
      });
    }
  }
  console.log(`  Productos con pricing existente: ${existingPricing.size}`);

  // 3. Preparar nuevas filas para pricing
  console.log('\n=== Preparando nueva hoja de pricing ===');

  const newPricingRows = [];
  const seenNames = new Set();

  for (const product of inventoryProducts) {
    const nombreLower = product.nombre.toLowerCase();

    // Evitar duplicados
    if (seenNames.has(nombreLower)) {
      continue;
    }
    seenNames.add(nombreLower);

    // Buscar datos de pricing existentes
    const existing = existingPricing.get(nombreLower);

    // Parsear costo
    let costo = product.costo;
    if (typeof costo === 'string') {
      costo = costo.replace(/[$\s,]/g, '').replace(/\./g, '');
      costo = parseInt(costo) || '';
    }

    const rowNum = newPricingRows.length + 2; // +2 porque empezamos en fila 2

    newPricingRows.push([
      product.nombre,                                    // A: nombre
      existing?.costoInicial || costo || '',            // B: Costo Inicial
      existing?.multCalidad || '3.00',                  // C: Multiplicador de Calidad
      existing?.puntJurado || '',                       // D: Puntuación del Jurado
      existing?.factorCalidad || '',                    // E: Factor de Calidad
      `=C${rowNum}+D${rowNum}+E${rowNum}`,             // F: Multiplicador Final (fórmula)
      `=B${rowNum}*F${rowNum}`,                        // G: Precio Unificado (fórmula)
      `=G${rowNum}*0.2`,                               // H: Descuento Nacional 20% (fórmula)
      `=G${rowNum}-H${rowNum}`,                        // I: Precio Nacional Final (fórmula)
    ]);
  }

  console.log(`  Productos únicos para pricing: ${newPricingRows.length}`);

  // 4. Limpiar hoja de pricing (mantener header) y escribir nuevos datos
  console.log('\n=== Actualizando hoja CUALIFICACION -PRECIO ===');

  // Primero, limpiar todas las filas de datos (mantener header)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: "'CUALIFICACION -PRECIO'!A2:I1000",
  });
  console.log('  Datos antiguos limpiados');

  // Escribir nuevos datos
  if (newPricingRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "'CUALIFICACION -PRECIO'!A2",
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: newPricingRows,
      },
    });
    console.log(`  ${newPricingRows.length} productos escritos`);
  }

  console.log('\n=== COMPLETADO ===');
  console.log(`La hoja CUALIFICACION -PRECIO ahora tiene ${newPricingRows.length} productos`);
  console.log('en el mismo orden que INVENTARIO, sin duplicados.');
  console.log('\nRecarga la hoja de Google Sheets para ver los cambios.');
}

syncPricingSheet().catch(console.error);
