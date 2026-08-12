/**
 * Pone ESTADO = DISPONIBLE en los 5 sublotes nuevos de #501 y #504 (535–539).
 *
 * POR QUÉ: las altas del inventario manuscrito heredan del padre sólo lo
 * estructural, y #501/#504 tienen la columna ESTADO vacía — así que 535–539
 * nacieron sin estado. 93A/93B sí lo heredaron (#93 estaba DISPONIBLE).
 * Decisión de Kevin (2026-08-12): los cinco son stock disponible.
 *
 * ESTADO está en el allowlist del pull (`convex/_lib/sheetPullMaps.ts`), así
 * que la hoja es la que manda y el valor viaja a Convex en el próximo sync.
 *
 * Uso:  node scripts/estado-disponible-sublotes-20260812.mjs           # dry-run
 *       node scripts/estado-disponible-sublotes-20260812.mjs --apply
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
const OBJETIVO = ['535', '536', '537', '538', '539'];
/** Ya deberían estar DISPONIBLE por herencia de #93: se comprueban, no se tocan. */
const CONTROL = ['93A', '93B'];
const VALOR = 'DISPONIBLE';

const clean = (v) => String(v ?? '').trim();
const colLetter = (i) => {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

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

const leer = async () => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB}'!A1:BA600`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return res.data.values || [];
};

let rows = await leer();
const headers = rows[0] || [];
const idx = (nombre) => {
  const hits = headers
    .map((h, i) => (clean(h) === nombre ? i : -1))
    .filter((i) => i >= 0);
  if (hits.length !== 1) {
    console.error(
      `Cabecera "${nombre}": ${hits.length} coincidencias. Aborto.`,
    );
    process.exit(1);
  }
  return hits[0];
};
const COL_ITEM = idx('Item');
const COL_ESTADO = idx('ESTADO');
const COL_NOMBRE = idx('Nombre');

// La columna ESTADO tiene desplegable: un valor fuera de lista queda en rojo.
const listas = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: 'Listas!G1:G10',
});
const valores = (listas.data.values || []).slice(1).map((r) => clean(r?.[0]));
if (!valores.includes(VALOR)) {
  console.error(
    `"${VALOR}" no está en la lista de ESTADO (Listas!G2:G10 = ${valores.filter(Boolean).join(', ')}). Aborto.`,
  );
  process.exit(1);
}

const filaDe = (id, rs = rows) =>
  rs.findIndex((r, i) => i > 0 && clean(r?.[COL_ITEM]) === id) + 1;

console.log(`\n=== ESTADO → ${VALOR} · columna ${colLetter(COL_ESTADO)} ===`);
const aEscribir = [];
for (const id of OBJETIVO) {
  const fila = filaDe(id);
  if (!fila) {
    console.error(`  ❌ ${id}: no existe en la hoja. Aborto.`);
    process.exit(1);
  }
  const actual = clean(rows[fila - 1][COL_ESTADO]);
  console.log(
    `  ${id}  f${fila}  "${clean(rows[fila - 1][COL_NOMBRE])}"  estado actual: ${actual || '(vacío)'}`,
  );
  if (actual === VALOR) continue;
  if (actual !== '') {
    console.error(
      `  ❌ ${id} ya tiene un estado ("${actual}") distinto de ${VALOR}. No lo piso. Aborto.`,
    );
    process.exit(1);
  }
  aEscribir.push({ id, fila });
}

console.log('\n  Control (heredados de #93, no se tocan):');
for (const id of CONTROL) {
  const fila = filaDe(id);
  console.log(
    `  ${id}  f${fila}  estado: ${clean(rows[fila - 1][COL_ESTADO]) || '(vacío)'}`,
  );
}

if (!aEscribir.length) {
  console.log('\n✓ Nada que hacer.\n');
  process.exit(0);
}
console.log(`\n  A escribir: ${aEscribir.map((e) => e.id).join(', ')}`);

if (!APPLY) {
  console.log('\nDRY-RUN. Correr con --apply para escribir.\n');
  process.exit(0);
}

mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  `./.backups/estado-sublotes-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  import.meta.url,
);
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      proposito: 'ESTADO previo de 535–539 antes de ponerlos en DISPONIBLE',
      spreadsheetId: SOT3,
      columna: 'ESTADO',
      filas: aEscribir.map((e) => ({
        itemId: e.id,
        fila: e.fila,
        valorPrevio: rows[e.fila - 1][COL_ESTADO] ?? '',
      })),
    },
    null,
    2,
  ),
);
console.log(`\nBackup → ${backupPath.pathname}`);

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'RAW',
    data: aEscribir.map((e) => ({
      range: `'${TAB}'!${colLetter(COL_ESTADO)}${e.fila}`,
      values: [[VALOR]],
    })),
  },
});

// Verificación: releer y ubicar por itemId, no por fila memorizada.
rows = await leer();
let fallas = 0;
for (const id of [...OBJETIVO, ...CONTROL]) {
  const fila = filaDe(id, rows);
  const leido = clean(rows[fila - 1][COL_ESTADO]);
  const ok = leido === VALOR;
  if (!ok) fallas++;
  console.log(`  ${ok ? '✓' : '✗'} ${id} f${fila} estado="${leido}"`);
}
console.log(
  fallas
    ? `\n❌ ${fallas} fila(s) no quedaron en ${VALOR}.\n`
    : `\n✅ Los 7 sublotes nuevos quedan en ${VALOR}. Falta el sync para que viaje a Convex.\n`,
);
process.exit(fallas ? 1 : 0);
