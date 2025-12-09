/**
 * Script de Corrección de Inconsistencias en Inventario de Esmeraldas
 *
 * Corrige automáticamente errores de escritura en las columnas:
 * - F: Color
 * - G: Calidad
 * - I: Talla
 * - J: Medidas
 *
 * Uso:
 *   node scripts/fix-inventory-inconsistencies.mjs          # Preview sin aplicar
 *   node scripts/fix-inventory-inconsistencies.mjs --apply  # Aplicar correcciones
 */

import { google } from 'googleapis';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function loadEnv() {
  try {
    const envPath = join(projectRoot, '.env.local');
    const envContent = await readFile(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex);
          let value = trimmed.slice(eqIndex + 1);
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    // .env.local not found, continue with existing env vars
  }
}

await loadEnv();

// Configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Column indices (0-based) - Ajustado según estructura real del sheet
// Basado en las capturas: D=Nombre, E=Peso, F=Color, G=Calidad, H=Cant, I=Talla, J=Medidas
const COLUMNS = {
  COLOR: 5,      // F (index 5)
  CALIDAD: 6,    // G (index 6)
  TALLA: 8,      // I (index 8)
  MEDIDAS: 9,    // J (index 9)
};

// Correction mappings
const CORRECTIONS = {
  talla: {
    // Esmeralda variations
    'smerald': 'Esmeralda',
    'Esmerald': 'Esmeralda',
    'esmerald': 'Esmeralda',
    'esmeralda': 'Esmeralda',
    'Emerald': 'Esmeralda',
    'emerald': 'Esmeralda',

    // Cuadrada variations
    'Cuadrac': 'Cuadrada',
    'cuadrac': 'Cuadrada',
    'cuadrad': 'Cuadrada',
    'cuadrada': 'Cuadrada',
    'Cuadrado': 'Cuadrada',
    'cuadrado': 'Cuadrada',

    // Corazón variations
    'Corazon': 'Corazón',
    'corazon': 'Corazón',
    'corazón': 'Corazón',

    // Lágrima/Pera variations
    'lagrima': 'Pera',
    'Lagrima': 'Pera',
    'lágrima': 'Pera',
    'Lágrima': 'Pera',
    'pera': 'Pera',

    // Óvalo variations
    'Ovalo': 'Ovalada',
    'ovalo': 'Ovalada',
    'óvalo': 'Ovalada',
    'Óvalo': 'Ovalada',
    'ovalada': 'Ovalada',

    // Redonda variations
    'redonda': 'Redonda',
    'Redond': 'Redonda',
    'redond': 'Redonda',

    // Cushion - keep as is but fix case
    'cushion': 'Cushion',
    'CUSHION': 'Cushion',
  },

  color: {
    // Verde Menta
    'verde menta': 'Verde Menta',
    'Verde menta': 'Verde Menta',
    'VERDE MENTA': 'Verde Menta',

    // Verde Natural
    'verde natural': 'Verde Natural',
    'Verde natural': 'Verde Natural',
    'VERDE NATURAL': 'Verde Natural',

    // Verde Vivido/Vívido
    'verde vivido': 'Verde Vivido',
    'Verde vivido': 'Verde Vivido',
    'VERDE VIVIDO': 'Verde Vivido',
    'Verde Vívido': 'Verde Vivido',
    'verde vívido': 'Verde Vivido',

    // Verde Limón
    'verde limon': 'Verde Limón',
    'Verde limon': 'Verde Limón',
    'verde limón': 'Verde Limón',
    'VERDE LIMON': 'Verde Limón',

    // Verde Muzo
    'verde muzo': 'Verde Muzo',
    'Verde muzo': 'Verde Muzo',
    'VERDE MUZO': 'Verde Muzo',

    // Verde Azulado
    'verde azulado': 'Verde Azulado',
    'Verde azulado': 'Verde Azulado',

    // Verde Oscuro
    'verde oscuro': 'Verde Oscuro',
    'Verde oscuro': 'Verde Oscuro',
  },

  calidad: {
    // Comercial SuperFina
    'Comercial SuperFina': 'Comercial SuperFina',
    'comercial superfina': 'Comercial SuperFina',
    'Comercial Superfina': 'Comercial SuperFina',
    'Comercial super fina': 'Comercial SuperFina',

    // Comercial Fina
    'comercial fina': 'Comercial Fina',
    'Comercial fina': 'Comercial Fina',

    // Comercial Superior
    'comercial superior': 'Comercial Superior',
    'Comercial superior': 'Comercial Superior',

    // Comercial Final
    'comercial final': 'Comercial Final',
    'Comercial final': 'Comercial Final',

    // Comercial Estandar
    'Comercial Estandar': 'Comercial Estándar',
    'comercial estandar': 'Comercial Estándar',
    'Estandar': 'Comercial Estándar',
    'estandar': 'Comercial Estándar',

    // Plata comercial
    'Plata - comercial': 'Plata - comercial',
    'plata - comercial': 'Plata - comercial',
    'Plata-comercial': 'Plata - comercial',
    'plata comercial': 'Plata - comercial',

    // Fina
    'fina': 'Fina',
    'FINA': 'Fina',

    // Esencial
    'esencial': 'Esencial',
    'ESENCIAL': 'Esencial',

    // Sublime
    'sublime': 'Sublime',
    'SUBLIME': 'Sublime',
  },

  medidas: {
    // Largo Ancho format
    'largo Ancho': 'Largo x Ancho',
    'Largo Ancho': 'Largo x Ancho',
    'largo ancho': 'Largo x Ancho',
    'LargoAncho': 'Largo x Ancho',
    'largo x ancho': 'Largo x Ancho',

    // Diámetro
    'Diametro': 'Diámetro',
    'diametro': 'Diámetro',
    'DIAMETRO': 'Diámetro',
    'diámetro': 'Diámetro',
  },
};

/**
 * Initialize Google Sheets API client
 */
function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Find sheet by name pattern
 */
async function findSheet(sheets, pattern) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = metadata.data.sheets.find(s =>
    s.properties.title.toLowerCase().includes(pattern.toLowerCase())
  );

  return sheet ? {
    name: sheet.properties.title,
    sheetId: sheet.properties.sheetId,
  } : null;
}

/**
 * Apply correction if value matches a correction rule
 */
function applyCorrection(value, type) {
  if (!value || typeof value !== 'string') return { value, corrected: false };

  const trimmed = value.trim();
  const corrections = CORRECTIONS[type] || {};

  // Check for exact match first
  if (corrections[trimmed]) {
    return {
      value: corrections[trimmed],
      corrected: corrections[trimmed] !== trimmed,
      original: trimmed,
    };
  }

  // Check for case-insensitive match
  const lowerValue = trimmed.toLowerCase();
  for (const [key, correctedValue] of Object.entries(corrections)) {
    if (key.toLowerCase() === lowerValue) {
      return {
        value: correctedValue,
        corrected: correctedValue !== trimmed,
        original: trimmed,
      };
    }
  }

  return { value: trimmed, corrected: false };
}

/**
 * Analyze and correct inventory data
 */
async function analyzeAndCorrect(sheets, sheetName, apply = false) {
  console.log('\n' + '='.repeat(60));
  console.log(' ANÁLISIS DE INCONSISTENCIAS - INVENTARIO TIERRA MADRE');
  console.log('='.repeat(60));

  // Read all data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    console.log('No hay datos para analizar.');
    return { changes: [], stats: {} };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  console.log(`\nFilas de datos: ${dataRows.length}`);
  console.log(`Columnas: ${headers.length}`);

  // Track changes
  const changes = [];
  const stats = {
    talla: { total: 0, corrected: 0, unique: new Set() },
    color: { total: 0, corrected: 0, unique: new Set() },
    calidad: { total: 0, corrected: 0, unique: new Set() },
    medidas: { total: 0, corrected: 0, unique: new Set() },
  };

  // Analyze each row
  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const actualRow = rowIndex + 2; // Excel row (1-indexed + header)

    // Analyze Color (Column F)
    if (row[COLUMNS.COLOR]) {
      const result = applyCorrection(row[COLUMNS.COLOR], 'color');
      stats.color.total++;
      stats.color.unique.add(row[COLUMNS.COLOR]);
      if (result.corrected) {
        stats.color.corrected++;
        changes.push({
          row: actualRow,
          column: 'F',
          columnIndex: COLUMNS.COLOR,
          field: 'Color',
          original: result.original,
          corrected: result.value,
        });
      }
    }

    // Analyze Calidad (Column G)
    if (row[COLUMNS.CALIDAD]) {
      const result = applyCorrection(row[COLUMNS.CALIDAD], 'calidad');
      stats.calidad.total++;
      stats.calidad.unique.add(row[COLUMNS.CALIDAD]);
      if (result.corrected) {
        stats.calidad.corrected++;
        changes.push({
          row: actualRow,
          column: 'G',
          columnIndex: COLUMNS.CALIDAD,
          field: 'Calidad',
          original: result.original,
          corrected: result.value,
        });
      }
    }

    // Analyze Talla (Column I)
    if (row[COLUMNS.TALLA]) {
      const result = applyCorrection(row[COLUMNS.TALLA], 'talla');
      stats.talla.total++;
      stats.talla.unique.add(row[COLUMNS.TALLA]);
      if (result.corrected) {
        stats.talla.corrected++;
        changes.push({
          row: actualRow,
          column: 'I',
          columnIndex: COLUMNS.TALLA,
          field: 'Talla',
          original: result.original,
          corrected: result.value,
        });
      }
    }

    // Analyze Medidas (Column J)
    if (row[COLUMNS.MEDIDAS]) {
      const result = applyCorrection(row[COLUMNS.MEDIDAS], 'medidas');
      stats.medidas.total++;
      stats.medidas.unique.add(row[COLUMNS.MEDIDAS]);
      if (result.corrected) {
        stats.medidas.corrected++;
        changes.push({
          row: actualRow,
          column: 'J',
          columnIndex: COLUMNS.MEDIDAS,
          field: 'Medidas',
          original: result.original,
          corrected: result.value,
        });
      }
    }
  }

  // Print statistics
  console.log('\n' + '-'.repeat(60));
  console.log(' ESTADÍSTICAS');
  console.log('-'.repeat(60));

  for (const [field, data] of Object.entries(stats)) {
    console.log(`\n${field.toUpperCase()}:`);
    console.log(`  Total: ${data.total}`);
    console.log(`  Valores únicos: ${data.unique.size}`);
    console.log(`  Correcciones necesarias: ${data.corrected}`);
    if (data.unique.size > 0 && data.unique.size <= 20) {
      console.log(`  Valores encontrados: ${[...data.unique].join(', ')}`);
    }
  }

  // Print changes
  if (changes.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log(' CAMBIOS A APLICAR');
    console.log('-'.repeat(60));

    const groupedChanges = {};
    for (const change of changes) {
      const key = `${change.field}: "${change.original}" → "${change.corrected}"`;
      if (!groupedChanges[key]) groupedChanges[key] = [];
      groupedChanges[key].push(change.row);
    }

    for (const [change, rows] of Object.entries(groupedChanges)) {
      console.log(`\n  ${change}`);
      console.log(`    Filas afectadas: ${rows.length} (${rows.slice(0, 5).join(', ')}${rows.length > 5 ? '...' : ''})`);
    }

    console.log(`\nTotal de celdas a corregir: ${changes.length}`);
  } else {
    console.log('\n✅ No se encontraron inconsistencias que corregir.');
  }

  // Apply changes if requested
  if (apply && changes.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log(' APLICANDO CORRECCIONES...');
    console.log('-'.repeat(60));

    // Prepare batch update data
    const data = changes.map(change => ({
      range: `${sheetName}!${change.column}${change.row}`,
      values: [[change.corrected]],
    }));

    // Apply in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          valueInputOption: 'RAW',
          data: batch,
        },
      });
      console.log(`  Aplicadas ${Math.min(i + BATCH_SIZE, data.length)} de ${data.length} correcciones...`);
    }

    console.log('\n✅ Correcciones aplicadas exitosamente!');
  } else if (changes.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log(' MODO PREVIEW - No se aplicaron cambios');
    console.log(' Ejecuta con --apply para aplicar las correcciones');
    console.log('='.repeat(60));
  }

  return { changes, stats };
}

/**
 * Save report to file
 */
async function saveReport(changes, stats, applied) {
  const reportsDir = join(__dirname, '..', 'reports');
  await mkdir(reportsDir, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    applied,
    totalChanges: changes.length,
    statistics: {
      talla: { total: stats.talla.total, corrected: stats.talla.corrected, uniqueValues: [...stats.talla.unique] },
      color: { total: stats.color.total, corrected: stats.color.corrected, uniqueValues: [...stats.color.unique] },
      calidad: { total: stats.calidad.total, corrected: stats.calidad.corrected, uniqueValues: [...stats.calidad.unique] },
      medidas: { total: stats.medidas.total, corrected: stats.medidas.corrected, uniqueValues: [...stats.medidas.unique] },
    },
    changes: changes.map(c => ({
      row: c.row,
      column: c.column,
      field: c.field,
      original: c.original,
      corrected: c.corrected,
    })),
  };

  const reportPath = join(reportsDir, `inventory-corrections-${Date.now()}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReporte guardado en: ${reportPath}`);

  return reportPath;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply') || args.includes('-a');

  console.log('\n🌿 Corrector de Inconsistencias - Tierra Madre Inventario');
  console.log(`Modo: ${apply ? 'APLICAR CORRECCIONES' : 'PREVIEW (solo lectura)'}`);

  // Check for credentials
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.error('\n❌ Error: GOOGLE_SERVICE_ACCOUNT_KEY no está configurada');
    console.error('Asegúrate de tener la variable de entorno configurada.');
    process.exit(1);
  }

  try {
    const sheets = getSheetsClient();

    // Find inventory sheet
    const inventorySheet = await findSheet(sheets, 'inventario');
    if (!inventorySheet) {
      console.error('\n❌ Error: No se encontró la hoja de inventario');
      process.exit(1);
    }

    console.log(`\nHoja encontrada: "${inventorySheet.name}"`);

    // Analyze and optionally correct
    const { changes, stats } = await analyzeAndCorrect(sheets, inventorySheet.name, apply);

    // Save report
    if (changes.length > 0) {
      await saveReport(changes, stats, apply);
    }

    console.log('\n' + '='.repeat(60));
    console.log(' PROCESO COMPLETADO');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 403) {
      console.error('Verifica que la cuenta de servicio tenga acceso al documento.');
    }
    process.exit(1);
  }
}

main();
