/**
 * ⚠️ La lista de aros va en Listas!AC, NO en Listas!I. Listas!I es `caja`
 * (el desplegable de Inventario!T) y A–AB están TODAS ocupadas: la primera
 * pasada de este script escribió en I y pisó esa lista, restaurada después
 * desde la revisión 808 de Drive. Antes de elegir una columna de Listas,
 * comprobar qué validaciones ya la referencian.
 *
 * Desdobla la vieja columna H del SOT v3 / Inventario, que mezclaba dos cosas.
 *
 * PROBLEMA (auditado 2026-08-11 sobre 523 filas):
 *   H se llamaba "Talla" pero guardaba la FORMA DE TALLA de la gema (Redonda,
 *   Esmeralda, Lágrima, Baguette…) en ~486 filas y el ARO DEL ANILLO (5, 6, 7,
 *   8, 9) en 37 — todas ellas de categoría "Anillo en Plata"/"Anillo en Oro".
 *   Un solo campo para dos magnitudes distintas: la app no podía mostrar el
 *   aro sin mostrar el corte en su lugar, y viceversa.
 *
 * QUÉ HACE:
 *   1. H1: "Talla" → "Corte".
 *   2. Crea BF "Talla (anillo)" y mueve ahí los 37 aros, dejando su H vacía.
 *      BF va AL FINAL y no junto a H: la hoja es un espejo POSICIONAL
 *      (api/_lib/fotosintesis-inventory-columns.js) y meter una columna en el
 *      medio correría todo lo que va detrás en las 523 filas.
 *   3. Parte la lista del desplegable: Listas!C mezclaba los aros (C2:C7 =
 *      0,5,6,7,8,9) con los cortes. C queda sólo con cortes; los aros pasan a
 *      Listas!AC. Se reapunta la validación de H (cortes) y se crea la de BF
 *      (aros).
 *   4. Deja backup de los valores previos en scripts/.backups/ (ignorado por git).
 *
 * NO TOCA las 14 filas de anillos cuya H trae un corte ("Ovalo", "Varias"…):
 * ese dato es correcto donde está; lo que no existe es su aro.
 *
 * DESPUÉS DE APLICAR: correr en la hoja el menú «🔄 Convex Sync → Sincronizar
 * todo (completo)». El trigger onEdit es SIMPLE y no dispara con escrituras por
 * API, así que Convex no se entera solo.
 *
 * Uso:  node scripts/split-corte-y-talla-anillo.mjs           # dry-run
 *       node scripts/split-corte-y-talla-anillo.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  FOTO_INVENTARIO_COLUMNS,
  columnIndexToLetter,
} from '../api/_lib/fotosintesis-inventory-columns.js';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const SHEET_ID = 1819792669;
const COL_H = 7;

// La posición de BF no se escribe a mano: sale del mapa de columnas, que es la
// fuente de verdad del orden. Si mañana se añade otra columna antes, esto sigue
// apuntando al lugar correcto.
const BF_INDEX = FOTO_INVENTARIO_COLUMNS.findIndex(
  (c) => c.key === 'tallaAnillo',
);
if (BF_INDEX < 0) {
  console.error(
    'No existe la columna `tallaAnillo` en FOTO_INVENTARIO_COLUMNS. Aborto.',
  );
  process.exit(1);
}
const BF_LETTER = columnIndexToLetter(BF_INDEX);
const BF_HEADER = FOTO_INVENTARIO_COLUMNS[BF_INDEX].header;

const clean = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
/** Un aro es un número pelado (5, 6, 6.5…). Todo lo demás es una forma de talla. */
const esAro = (v) => /^\d+([.,]\d+)?$/.test(clean(v));

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

// ── Leer estado actual ────────────────────────────────────────────────────
const [inv, listas] = await Promise.all([
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB}'!A1:${BF_LETTER}1000`,
  }),
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: "'Listas'!A1:J60",
  }),
]);

const rows = inv.data.values || [];
const headers = rows[0] || [];
const headerH = clean(headers[COL_H]);
if (headerH !== 'Talla' && headerH !== 'Corte') {
  console.error(`H1 inesperado: "${headerH}". Aborto por seguridad.`);
  process.exit(1);
}
const headerBF = clean(headers[BF_INDEX]);
if (headerBF && headerBF !== BF_HEADER) {
  console.error(
    `${BF_LETTER}1 ya tiene otro encabezado: "${headerBF}". Aborto para no pisar una columna ajena.`,
  );
  process.exit(1);
}

const aros = [];
let cortes = 0;
let vacias = 0;
let lastDataRow = 1;
for (let r = 1; r < rows.length; r++) {
  const row = rows[r] || [];
  const item = clean(row[0]);
  const nombre = clean(row[2]);
  if (!item && !nombre) continue;
  lastDataRow = r + 1;
  const H = clean(row[COL_H]);
  if (!H) vacias++;
  else if (esAro(H))
    aros.push({ fila: r + 1, item, nombre, aro: H, categoria: clean(row[10]) });
  else cortes++;
}

// ── Listas: separar aros de cortes ────────────────────────────────────────
const listasRows = listas.data.values || [];
const colC = listasRows.slice(1).map((r) => clean(r?.[2]));
const cortesLista = colC.filter((v) => v && !esAro(v));

// La lista de aros NO se hereda de la vieja columna mezclada: allí sólo había
// 0, 5, 6, 7, 8 y 9. El "0" no es un aro (era relleno) y faltaban los medios
// (4.5, 6.5…), que sí se usan. Se genera 4→12 en pasos de 0.5 y se suma
// cualquier valor que ya exista en los datos y no caiga en esa rejilla, para
// no dejar una fila fuera de su propio desplegable.
const arosBase = [];
for (let n = 4; n <= 12; n += 0.5) arosBase.push(String(n));
const arosEnDatos = [...new Set(aros.map((a) => a.aro.replace(',', '.')))];
const arosLista = [
  ...arosBase,
  ...arosEnDatos.filter((v) => !arosBase.includes(v)),
].sort((a, b) => Number(a) - Number(b));

console.log(
  `\n=== ${TAB} — desdoblar H en Corte + ${BF_LETTER} "${BF_HEADER}" ===`,
);
console.log(`  Filas de datos                : ${lastDataRow - 1}`);
console.log(`  H1                            : "${headerH}" → "Corte"`);
console.log(`  Aros a mover H → ${BF_LETTER}          : ${aros.length}`);
console.log(`  Cortes que se quedan en H     : ${cortes}`);
console.log(`  H vacía                       : ${vacias}`);
console.log(`  Listas!C → cortes             : ${cortesLista.length}`);
console.log(
  `  Listas!AC → aros              : ${arosLista.length}  [${arosLista.join(', ')}]`,
);

const porCategoria = new Map();
aros.forEach((a) =>
  porCategoria.set(a.categoria, (porCategoria.get(a.categoria) || 0) + 1),
);
console.log('\n  Categoría de las filas con aro:');
for (const [c, n] of porCategoria)
  console.log(`      ${String(n).padStart(3)}  ${c}`);
const noAnillo = aros.filter((a) => !/^anillo/i.test(a.categoria));
if (noAnillo.length) {
  console.log(
    '\n  ⚠️  Filas con aro que NO son anillo — revisar antes de aplicar:',
  );
  noAnillo.forEach((a) =>
    console.log(`      f${a.fila} "${a.nombre}" cat="${a.categoria}"`),
  );
}

console.log('\n  Muestra (10 primeras):');
aros
  .slice(0, 10)
  .forEach((a) =>
    console.log(
      `      f${a.fila} item ${a.item} "${a.nombre}"  H="${a.aro}" → ${BF_LETTER}="${a.aro}"`,
    ),
  );

if (!APPLY) {
  console.log('\nDRY-RUN. Volvé a correr con --apply para escribir.');
  process.exit(0);
}

// ── Backup ────────────────────────────────────────────────────────────────
mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  './.backups/corte-talla-anillo.json',
  import.meta.url,
);
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      spreadsheetId: SOT3,
      tab: TAB,
      nota: 'Estado previo a split-corte-y-talla-anillo.mjs',
      headerHPrevio: headerH,
      listasColCPrevia: colC.filter(Boolean),
      arosMovidos: aros,
    },
    null,
    2,
  ),
);
console.log(`\nBackup → ${backupPath.pathname}`);

// ── 1. Encabezados: H1 y BF1 ──────────────────────────────────────────────
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'RAW',
    data: [
      { range: `'${TAB}'!H1`, values: [['Corte']] },
      { range: `'${TAB}'!${BF_LETTER}1`, values: [[BF_HEADER]] },
    ],
  },
});
console.log(`  encabezados: H1="Corte", ${BF_LETTER}1="${BF_HEADER}"`);

// ── 2. Mover los aros y vaciar su H ───────────────────────────────────────
const CHUNK = 100;
for (let i = 0; i < aros.length; i += CHUNK) {
  const slice = aros.slice(i, i + CHUNK);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'RAW',
      data: slice.flatMap((a) => [
        { range: `'${TAB}'!${BF_LETTER}${a.fila}`, values: [[a.aro]] },
        { range: `'${TAB}'!H${a.fila}`, values: [['']] },
      ]),
    },
  });
  console.log(
    `  movidos ${Math.min(i + CHUNK, aros.length)}/${aros.length} aros`,
  );
}

// ── 3. Listas: C sólo cortes, I los aros ──────────────────────────────────
const maxLen = Math.max(cortesLista.length, colC.length);
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'RAW',
    data: [
      { range: "'Listas'!C1", values: [['corte']] },
      {
        range: `'Listas'!C2:C${maxLen + 1}`,
        values: Array.from({ length: maxLen }, (_, i) => [
          cortesLista[i] ?? '',
        ]),
      },
      { range: "'Listas'!AC1", values: [['tallaAnillo']] },
      {
        range: `'Listas'!AC2:AC${arosLista.length + 1}`,
        values: arosLista.map((v) => [v]),
      },
    ],
  },
});
console.log(
  `  Listas: C=${cortesLista.length} cortes, AC=${arosLista.length} aros`,
);

// ── 4. Validaciones: H → cortes, BF → aros ────────────────────────────────
// `updateCells` con filas explícitas es el único borrado/seteo que toma de
// verdad en este libro (setDataValidation y repeatCell devuelven 200 sin
// aplicar — comprobado el 2026-08-11 sobre la columna I).
const nFilas = lastDataRow - 1;
const dvRule = (range) => ({
  condition: {
    type: 'ONE_OF_RANGE',
    values: [{ userEnteredValue: range }],
  },
  showCustomUi: true,
  strict: false,
});
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
            startColumnIndex: COL_H,
            endColumnIndex: COL_H + 1,
          },
          fields: 'dataValidation',
          rows: Array.from({ length: nFilas }, () => ({
            values: [
              { dataValidation: dvRule(`=Listas!$C$2:$C$${maxLen + 1}`) },
            ],
          })),
        },
      },
      {
        updateCells: {
          range: {
            sheetId: SHEET_ID,
            startRowIndex: 1,
            endRowIndex: lastDataRow,
            startColumnIndex: BF_INDEX,
            endColumnIndex: BF_INDEX + 1,
          },
          fields: 'dataValidation',
          rows: Array.from({ length: nFilas }, () => ({
            values: [
              {
                dataValidation: dvRule(
                  `=Listas!$I$2:$I$${arosLista.length + 1}`,
                ),
              },
            ],
          })),
        },
      },
    ],
  },
});
console.log(
  `  validaciones: H→Listas!C (cortes), ${BF_LETTER}→Listas!AC (aros)`,
);

console.log(
  '\n✅ Listo. Siguiente paso en la hoja: menú «🔄 Convex Sync → Sincronizar todo (completo)».',
);
