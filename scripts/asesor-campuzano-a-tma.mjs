/**
 * Reasigna a TMÄ el inventario disponible que estaba a nombre de M.Campuzano.
 *
 * QUÉ HACE: en Inventario del SOT v3, escribe P="TMÄ" en las filas donde
 * P (ASESOR) = "M.Campuzano" Y Q (ESTADO) = "DISPONIBLE". Nada más.
 *
 * QUÉ NO TOCA — las otras 36 filas de M.Campuzano, porque su ESTADO no es
 * DISPONIBLE: 16 "LOTE X CT", 11 "VENDIDA", 6 "ASESOR", 2 "ESMEREOGENESIS",
 * 1 "CONSIGNACION". Una venta ya cerrada conserva quién la hizo.
 *
 * P no tiene validación de datos (comprobado 2026-08-11), así que "TMÄ" entra
 * como texto libre sin quedar marcado en rojo. Ojo: en la pestaña Asesores el
 * mismo actor figura como ASE-019 "Tierra Mädre", y 7 filas de P dicen
 * "Tierra Madre" — "TMÄ" es una tercera grafía del mismo nombre.
 *
 * DESPUÉS DE APLICAR: correr en la hoja el menú «🔄 Convex Sync → Sincronizar
 * todo (completo)». El trigger onEdit es SIMPLE y no dispara con escrituras
 * por API, así que Convex no se entera solo.
 *
 * Uso:  node scripts/asesor-campuzano-a-tma.mjs           # dry-run
 *       node scripts/asesor-campuzano-a-tma.mjs --apply
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
const COL_ASESOR = 15; // P
const COL_ESTADO = 16; // Q
const DESDE = 'M.Campuzano';
const HACIA = 'TMÄ';
const ESTADO_OBJETIVO = 'DISPONIBLE';

const clean = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

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
const { data } = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'${TAB}'!A1:Q1000`,
});
const rows = data.values || [];
const headers = rows[0] || [];

// La hoja es un espejo posicional: si P/Q dejaran de ser ASESOR/ESTADO,
// escribiríamos sobre otra cosa. Se aborta antes de tocar nada.
if (clean(headers[COL_ASESOR]) !== 'ASESOR') {
  console.error(
    `P1 esperaba "ASESOR" y trae "${clean(headers[COL_ASESOR])}". Aborto.`,
  );
  process.exit(1);
}
if (clean(headers[COL_ESTADO]) !== 'ESTADO') {
  console.error(
    `Q1 esperaba "ESTADO" y trae "${clean(headers[COL_ESTADO])}". Aborto.`,
  );
  process.exit(1);
}

const objetivo = [];
const omitidas = new Map();
for (let r = 1; r < rows.length; r++) {
  const row = rows[r] || [];
  const item = clean(row[0]);
  const nombre = clean(row[2]);
  if (!item && !nombre) continue;
  const asesor = clean(row[COL_ASESOR]);
  const estado = clean(row[COL_ESTADO]);
  if (asesor !== DESDE) continue;
  if (estado === ESTADO_OBJETIVO)
    objetivo.push({ fila: r + 1, item, nombre, estado });
  else
    omitidas.set(
      estado || '(vacío)',
      (omitidas.get(estado || '(vacío)') || 0) + 1,
    );
}

console.log(
  `\n=== ${TAB}: P "${DESDE}" → "${HACIA}" donde Q = "${ESTADO_OBJETIVO}" ===`,
);
console.log(`  Filas a cambiar : ${objetivo.length}`);
console.log(`  Filas de ${DESDE} que NO se tocan (otro ESTADO):`);
[...omitidas.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([e, n]) => console.log(`      ${String(n).padStart(3)}  ${e}`));

console.log('\n  Muestra (10 primeras):');
objetivo
  .slice(0, 10)
  .forEach((o) => console.log(`      f${o.fila} item ${o.item} "${o.nombre}"`));

if (!objetivo.length) {
  console.log('\nNada que hacer.');
  process.exit(0);
}

if (!APPLY) {
  console.log('\nDRY-RUN. Volvé a correr con --apply para escribir.');
  process.exit(0);
}

// ── Backup ────────────────────────────────────────────────────────────────
mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  './.backups/asesor-campuzano-a-tma.json',
  import.meta.url,
);
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      spreadsheetId: SOT3,
      tab: TAB,
      nota: `Estado previo: estas filas tenían P="${DESDE}"`,
      desde: DESDE,
      hacia: HACIA,
      filas: objetivo,
    },
    null,
    2,
  ),
);
console.log(`\nBackup → ${backupPath.pathname}`);

// ── Escribir ──────────────────────────────────────────────────────────────
const CHUNK = 100;
for (let i = 0; i < objetivo.length; i += CHUNK) {
  const slice = objetivo.slice(i, i + CHUNK);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'RAW',
      data: slice.map((o) => ({
        range: `'${TAB}'!P${o.fila}`,
        values: [[HACIA]],
      })),
    },
  });
  console.log(
    `  escritas ${Math.min(i + CHUNK, objetivo.length)}/${objetivo.length}`,
  );
}

// ── Verificar releyendo ───────────────────────────────────────────────────
const check = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'${TAB}'!A1:Q1000`,
});
const after = check.data.values || [];
let ok = 0;
let mal = [];
objetivo.forEach((o) => {
  const v = clean(after[o.fila - 1]?.[COL_ASESOR]);
  if (v === HACIA) ok++;
  else mal.push(`f${o.fila} = "${v}"`);
});
let quedan = 0;
for (let r = 1; r < after.length; r++) {
  if (
    clean(after[r]?.[COL_ASESOR]) === DESDE &&
    clean(after[r]?.[COL_ESTADO]) === ESTADO_OBJETIVO
  )
    quedan++;
}
console.log(
  `\n  Verificación: ${ok}/${objetivo.length} escritas como "${HACIA}"`,
);
if (mal.length) console.log(`  ⚠️  no coinciden: ${mal.join(', ')}`);
console.log(`  Filas "${DESDE}" + "${ESTADO_OBJETIVO}" restantes: ${quedan}`);

if (ok === objetivo.length && quedan === 0) {
  console.log(
    '\n✅ Listo. Siguiente paso en la hoja: menú «🔄 Convex Sync → Sincronizar todo (completo)».',
  );
} else {
  console.log(
    '\n❌ La verificación no cerró. Revisar antes de sincronizar a Convex.',
  );
  process.exit(1);
}
