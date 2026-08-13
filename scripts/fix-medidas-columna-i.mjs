/**
 * Consolida las medidas reales en la columna I ("Medidas") del SOT v3 / Inventario.
 *
 * PROBLEMA (auditado 2026-08-11 sobre 523 filas de datos):
 *   La columna I nunca guardó una medida: guardaba la ETIQUETA DE FORMATO
 *   ("Largo x Ancho" / "Diámetro"), impuesta por un dropdown (validación
 *   ONE_OF_RANGE → Listas!D2:D3). El número real vive en J ("Medidas (valores)").
 *
 *     188 filas → I = etiqueta, J = valor real     ← se corrigen aquí
 *      19 filas → I = medida real, J vacío         ← ya correctas, no se tocan
 *       4 filas → I y J con valor                  ← I ya es real, no se tocan
 *     312 filas → I y J vacías                     ← sin dato que mover
 *
 *   Toda superficie que lee `medidas` a secas le mostraba "Largo x Ancho" al
 *   cliente, o nada. (`src/pages/treasure/ProductDetail/medidas.ts` mitiga esto
 *   en el detalle de producto, pero no en el resto del app.)
 *
 * QUÉ HACE:
 *   1. Copia J → I en las filas cuya I es una etiqueta de formato y cuya J
 *      tiene valor. J se CONSERVA intacta: `medidasValores` sigue siendo la
 *      fuente única de varias superficies (p.ej. quotation-card/ProductCard).
 *   2. Quita el dropdown de la columna I, que ya no describe su contenido y
 *      marcaría en rojo las 188 celdas nuevas como "dato inválido".
 *   3. Deja backup de los valores previos en scripts/.backups/ (ignorado por git).
 *
 * DESPUÉS DE APLICAR: correr en la hoja el menú «🔄 Convex Sync → Sincronizar
 * todo (completo)». El trigger onEdit es SIMPLE y no dispara con escrituras por
 * API, así que Convex no se entera solo — y como `convex/products.ts`
 * pushToSheet reescribe la columna `medidas` desde Convex, un `medidas` viejo
 * ahí revertiría esta corrección en la próxima edición del producto.
 *
 * Uso:  node scripts/fix-medidas-columna-i.mjs           # dry-run
 *       node scripts/fix-medidas-columna-i.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const SHEET_ID = 1819792669; // gid de la pestaña Inventario
const COL_I = 8; // índice 0-based
const COL_J = 9;

/** Las 2 etiquetas de formato que el dropdown metía en I en lugar de una medida. */
const FORMAT_LABELS = /^(largo\s*[x×]\s*ancho|di[áa]metro)$/i;
/** Textos que significan "sin medida", no una medida de cero. */
const EMPTY_VALUES = new Set(['', '-', '--', '0', 'n/a', 'anillo']);

const clean = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const isEmpty = (v) => EMPTY_VALUES.has(clean(v).toLowerCase());

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const sheets = new sheets_v4.Sheets({
  auth: new GoogleAuth({
    credentials: JSON.parse(rawKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'${TAB}'!A1:K1000`,
});
const rows = res.data.values || [];
const headers = rows[0] || [];
if (
  clean(headers[COL_I]) !== 'Medidas' ||
  clean(headers[COL_J]) !== 'Medidas (valores)'
) {
  console.error(
    `Cabeceras inesperadas — I="${headers[COL_I]}" J="${headers[COL_J]}". Aborto por seguridad.`,
  );
  process.exit(1);
}

const aMover = [];
const yaCorrectas = [];
const ambas = [];
const sinDato = [];
const etiquetaSinValor = [];
let lastDataRow = 1;

for (let r = 1; r < rows.length; r++) {
  const row = rows[r] || [];
  const item = clean(row[0]);
  const nombre = clean(row[2]);
  if (!item && !nombre) continue;
  lastDataRow = r + 1; // 1-based

  const I = clean(row[COL_I]);
  const J = clean(row[COL_J]);
  const rec = { fila: r + 1, item, nombre, I, J };

  if (FORMAT_LABELS.test(I)) {
    if (isEmpty(J)) etiquetaSinValor.push(rec);
    else aMover.push(rec);
  } else if (isEmpty(I) && isEmpty(J)) sinDato.push(rec);
  else if (!isEmpty(I) && isEmpty(J)) yaCorrectas.push(rec);
  else ambas.push(rec);
}

console.log(`\n=== ${TAB} — consolidar medidas en columna I ===`);
console.log(`  Filas de datos            : ${lastDataRow - 1}`);
console.log(`  J → I (se corrigen)       : ${aMover.length}`);
console.log(`  I ya tiene medida real    : ${yaCorrectas.length}  (sin tocar)`);
console.log(
  `  I y J con valor           : ${ambas.length}  (sin tocar, I ya es real)`,
);
console.log(
  `  Etiqueta en I y J vacía   : ${etiquetaSinValor.length}  (no hay dato que mover)`,
);
console.log(`  Ambas vacías              : ${sinDato.length}  (sin dato)`);

// Sólo interesan las discrepancias REALES: tras la corrección, la enorme
// mayoría de filas "I y J con valor" son la misma medida en las dos columnas.
// Se comparan normalizando separadores y unidad, que varían sin cambiar el dato.
const normMedida = (v) =>
  clean(v)
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/\s*mm$/, '')
    .replace(/\s+/g, '');
const discrepantes = ambas.filter((r) => normMedida(r.I) !== normMedida(r.J));

if (discrepantes.length) {
  console.log(
    '\n  ⚠️  I y J difieren de verdad — se respeta I, revisar a mano:',
  );
  discrepantes.forEach((r) =>
    console.log(
      `      f${r.fila} item ${r.item} "${r.nombre}"  I="${r.I}"  J="${r.J}"`,
    ),
  );
}

console.log('\n  Muestra de los cambios (10 primeros):');
aMover
  .slice(0, 10)
  .forEach((r) =>
    console.log(
      `      f${r.fila} item ${r.item} "${r.nombre}"  "${r.I}" → "${r.J}"`,
    ),
  );

if (!aMover.length) {
  console.log('\nNada que hacer.');
  process.exit(0);
}

if (!APPLY) {
  console.log('\nDRY-RUN. Volvé a correr con --apply para escribir.');
  process.exit(0);
}

// ── Backup antes de escribir ──────────────────────────────────────────────
mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  `./.backups/medidas-col-i-${lastDataRow}filas.json`,
  import.meta.url,
);
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      spreadsheetId: SOT3,
      tab: TAB,
      nota: 'Valores de I y J previos a fix-medidas-columna-i.mjs',
      validacionIRemovida: {
        rango: `I2:I${lastDataRow}`,
        regla: 'ONE_OF_RANGE =Listas!$D$2:$D$3, showCustomUi:true',
      },
      filas: aMover,
    },
    null,
    2,
  ),
);
console.log(`\nBackup → ${backupPath.pathname}`);

// ── 1. J → I, celda por celda (no toca nada más) ──────────────────────────
const CHUNK = 100;
for (let i = 0; i < aMover.length; i += CHUNK) {
  const slice = aMover.slice(i, i + CHUNK);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'RAW',
      data: slice.map((r) => ({
        range: `'${TAB}'!I${r.fila}`,
        values: [[r.J]],
      })),
    },
  });
  console.log(
    `  escritas ${Math.min(i + CHUNK, aMover.length)}/${aMover.length} celdas`,
  );
}

// ── 2. Quitar el dropdown de I: ya no describe su contenido ───────────────
// OJO: `setDataValidation` sin `rule` y `repeatCell` con `cell:{}` devuelven
// 200 y NO borran nada en este rango (comprobado celda por celda el 2026-08-11:
// I30 conservaba la regla tras ambas). El único borrado que sí toma es
// `updateCells` con una fila explícita `{}` por cada fila del rango.
await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    requests: [
      {
        updateCells: {
          range: {
            sheetId: SHEET_ID,
            startRowIndex: 1,
            endRowIndex: lastDataRow,
            startColumnIndex: COL_I,
            endColumnIndex: COL_I + 1,
          },
          fields: 'dataValidation',
          rows: Array.from({ length: lastDataRow - 1 }, () => ({
            values: [{}],
          })),
        },
      },
    ],
  },
});
console.log(`  dropdown removido de I2:I${lastDataRow}`);

console.log(
  '\n✅ Listo. Siguiente paso en la hoja: menú «🔄 Convex Sync → Sincronizar todo (completo)»\n' +
    '   (el trigger onEdit es simple y no dispara con escrituras por API).',
);
