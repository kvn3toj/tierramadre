/**
 * Corrige el costo del padre retirado #93: 469.120 → 0.
 *
 * POR QUÉ: el plan del inventario manuscrito (2026-08-12) dice, con todas las
 * letras, que los tres padres subdivididos «quedan retirados, no borrados:
 * costo 0, cant 0, fuera del catálogo». #501 y #504 quedaron en 0; #93 no,
 * porque su fila del payload traía `469120` — que es la BASE DEL REPARTO (el
 * costo corregido del papel, el que se divide entre 93A y 93B), no el valor
 * final del padre.
 *
 * El efecto de dejarlo así es un doble conteo en C-045:
 *   #93 469.120 + (93A 223.771 + 93B 245.349) = 938.240, el doble de lo real.
 * Es exactamente el patrón que §5 de la reconciliación del 2026-07-24 señala
 * como la causa del 100% de los errores de costo del SOT (la hoja estaba
 * inflada 21,2M, entera por doble conteo estructural).
 *
 * La columna L es SHEET-OWNED desde el 2026-07-24, así que la corrección va acá
 * y el pull la lleva a Convex.
 *
 * Uso:  node scripts/corregir-costo-padre-93.mjs           # dry-run
 *       node scripts/corregir-costo-padre-93.mjs --apply
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
const ITEM = '93';
const HIJOS = ['93A', '93B'];

const clean = (v) => String(v ?? '').trim();

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
  range: `'${TAB}'!A1:BA600`,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const rows = res.data.values || [];
const headers = rows[0] || [];

// Columna por cabecera, nunca por índice fijo.
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
const COL_COSTO = idx('costoBaseCOP');
const COL_CANT = idx('Cant.');
const COL_NOMBRE = idx('Nombre');

const filaDe = (id) =>
  rows.findIndex((r, i) => i > 0 && clean(r?.[COL_ITEM]) === id) + 1;

const fila = filaDe(ITEM);
if (!fila) {
  console.error(`No encuentro el ítem ${ITEM}.`);
  process.exit(1);
}
const actual = Number(rows[fila - 1][COL_COSTO] ?? 0);
const cant = Number(rows[fila - 1][COL_CANT] ?? 0);
const sumaHijos = HIJOS.reduce((s, h) => {
  const f = filaDe(h);
  return s + (f ? Number(rows[f - 1][COL_COSTO] ?? 0) : 0);
}, 0);

console.log(
  `\n=== #${ITEM} "${clean(rows[fila - 1][COL_NOMBRE])}" (fila ${fila}) ===`,
);
console.log(
  `  Cant.            : ${cant}  ${cant === 0 ? '(retirado ✓)' : '⚠️ NO está retirado'}`,
);
console.log(`  costoBaseCOP hoy : ${actual.toLocaleString('es-CO')}`);
console.log(`  Σ hijos (93A+93B): ${sumaHijos.toLocaleString('es-CO')}`);
console.log(
  `  C-045 cuenta hoy : ${(actual + sumaHijos).toLocaleString('es-CO')}`,
);
console.log(
  `  → tras la corrección: ${sumaHijos.toLocaleString('es-CO')} (una sola vez)`,
);

if (cant !== 0) {
  console.error(
    '\n❌ #93 no está en cant 0. No es el padre retirado que espero. Aborto.',
  );
  process.exit(1);
}
if (sumaHijos === 0) {
  console.error('\n❌ No encuentro los costos de 93A/93B. Aborto.');
  process.exit(1);
}
if (actual === 0) {
  console.log('\n✓ Ya está en 0. Nada que hacer.');
  process.exit(0);
}
if (actual !== sumaHijos) {
  console.error(
    `\n❌ El costo del padre (${actual}) no coincide con Σ hijos (${sumaHijos}). ` +
      `Revisar a mano antes de tocar nada.`,
  );
  process.exit(1);
}

if (!APPLY) {
  console.log('\nDRY-RUN. Correr con --apply para escribir.\n');
  process.exit(0);
}

mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  `./.backups/costo-padre-93-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  import.meta.url,
);
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      proposito: 'costoBaseCOP de #93 antes de llevarlo a 0 (padre retirado)',
      spreadsheetId: SOT3,
      fila,
      columna: 'costoBaseCOP',
      valorPrevio: actual,
      filaCompleta: rows[fila - 1],
    },
    null,
    2,
  ),
);
console.log(`\nBackup → ${backupPath.pathname}`);

await sheets.spreadsheets.values.update({
  spreadsheetId: SOT3,
  range: `'${TAB}'!${String.fromCharCode(65 + COL_COSTO)}${fila}`,
  valueInputOption: 'RAW',
  requestBody: { values: [[0]] },
});

// Verificación: releer y ubicar por cabecera.
const check = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'${TAB}'!A1:BA600`,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const rows2 = check.data.values || [];
const f2 =
  rows2.findIndex((r, i) => i > 0 && clean(r?.[COL_ITEM]) === ITEM) + 1;
const leido = Number(rows2[f2 - 1][COL_COSTO] ?? -1);
console.log(
  `\n${leido === 0 ? '✅' : '❌'} #${ITEM} costoBaseCOP = ${leido} (esperado 0)\n` +
    `   C-045 ahora cuenta $${sumaHijos.toLocaleString('es-CO')} una sola vez.\n` +
    `   Falta el sync a Convex para que el costo viaje.\n`,
);
process.exit(leido === 0 ? 0 : 1);
