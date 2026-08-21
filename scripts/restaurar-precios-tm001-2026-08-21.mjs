/**
 * Restaura el `precioFinalCOP` de los 4 ítems del lote TM-001 que el push del
 * 2026-08-20 02:36 dejó en blanco.
 *
 * QUÉ PASÓ (verificado contra prod el 2026-08-21). `computePrecioFinal(0)`
 * devuelve `undefined` a propósito ("no phantom 0"), y el re-fan de lote
 * recalcula el precio desde el costo. Con costo 0 el precio se vuelve
 * `undefined` y el push Convex→hoja escribe ese blanco en la columna M: se
 * borra en los DOS lados a la vez, por eso hoja y Convex coinciden y parece
 * que el precio nunca existió. El único escudo es `precioFinalManual: true`,
 * y ese sello sólo lo estampa el pull de la hoja (_lib/sheetPullMaps.ts:526)
 * o `_saveEdit` (products.ts:958).
 *
 * La prueba está en el propio lote TM-001, mismo día, mismo precio:
 *   #580 #581 #582 #583 #585 → pull a las 01:39-02:38 → flag → $150.000 vivos
 *   #577 #578 #579 #584      → push a las 02:36 SIN flag → sin precio
 *
 * POR QUÉ SE ESCRIBE EN LA HOJA Y NO EN CONVEX. La columna M es propiedad de
 * la hoja desde 2026-07-23 (_lib/pricing.ts). Escribir ahí y disparar el pull
 * es el mismo camino por el que sobrevivieron sus hermanos: el pull estampa
 * `precioFinalManual` y los blinda contra el próximo re-fan. Escribir directo
 * en Convex también sella, pero deja la hoja —que es el SOT— como la fuente
 * que hay que corregir después.
 *
 * PRECIOS: dictados por el dueño el 2026-08-21.
 *   #577 Dije Sol Solsticio  $150.000  (= sus hermanos #581/#582/#583/#585)
 *   #584 Dije Letra ( A )    $150.000  (= las letras E/V/Y)
 *   #578 Manilla Bicolor     $150.000
 *   #579 Pre Colombino       $260.000
 *
 * Escritura posicional sobre rango CERRADO (`values.update` por celda, nunca
 * `values.append` con rango abierto — ver CLAUDE.md, migración de sublotes).
 *
 * Uso:  node scripts/restaurar-precios-tm001-2026-08-21.mjs            # dry-run
 *       node scripts/restaurar-precios-tm001-2026-08-21.mjs --apply    # escribe
 *
 * Después de --apply, para que Convex se entere Y quede el sello:
 *       node scripts/sync-sot-convex.mjs --prod
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const STAMP = '2026-08-21';

const PRECIOS = [
  { item: 577, precio: 150000, nombre: 'Dije Sol Solsticio' },
  { item: 578, precio: 150000, nombre: 'Manilla Bicolor' },
  { item: 579, precio: 260000, nombre: 'Pre Colombino' },
  { item: 584, precio: 150000, nombre: 'Dije Letra ( A )' },
];

const NOTA = (p) =>
  `Precio restaurado ${STAMP}: $${p.toLocaleString('es-CO')}. El push del 2026-08-20 02:36 lo dejó en blanco — con costoBaseCOP 0 el re-fan derivó precio undefined y lo empujó a la hoja. Dictado por el dueño; el pull estampa precioFinalManual para que no vuelva a pasar.`;

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const auth = new GoogleAuth({
  credentials: JSON.parse(rawKey),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = new sheets_v4.Sheets({ auth });

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const values = res.data.values;
const H = values[0];
const colLetter = (i) => {
  let s = '',
    n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// Localización por CABECERA NOMBRADA, nunca por posición (CLAUDE.md).
const C_ITEM = H.indexOf('Item');
const C_NOMBRE = H.indexOf('Nombre');
const C_PRECIO = H.indexOf('precioFinalCOP');
const C_COSTO = H.indexOf('costoBaseCOP');
const C_OBS = H.indexOf('observacion');
for (const [n, i] of [
  ['Item', C_ITEM],
  ['precioFinalCOP', C_PRECIO],
  ['observacion', C_OBS],
])
  if (i < 0) {
    console.error(`No encuentro la cabecera "${n}"`);
    process.exit(1);
  }
console.log(
  `Cabeceras: Item=${colLetter(C_ITEM)} precioFinalCOP=${colLetter(C_PRECIO)} costoBaseCOP=${colLetter(C_COSTO)} observacion=${colLetter(C_OBS)}\n`,
);

const byItem = new Map();
values.forEach((r, i) => {
  if (i && r && r[C_ITEM] !== '' && r[C_ITEM] != null)
    byItem.set(String(r[C_ITEM]).trim(), { fila: i + 1, r });
});

const updates = [],
  backup = [],
  problemas = [];
const append = (prev, nota) =>
  (prev && String(prev).trim() ? String(prev).trim() + ' · ' : '') + nota;

for (const p of PRECIOS) {
  const hit = byItem.get(String(p.item));
  if (!hit) {
    problemas.push(`#${p.item} no existe en la hoja`);
    continue;
  }
  const { fila, r } = hit;
  const actual = r[C_PRECIO];
  // No sobrescribir: si ya tiene precio, algo cambió desde el diagnóstico.
  if (actual !== '' && actual != null && Number(actual) !== 0) {
    problemas.push(
      `#${p.item} YA tiene precio ${actual} — no se toca (revisar a mano)`,
    );
    continue;
  }
  const nombreHoja = String(r[C_NOMBRE] ?? '')
    .replace(/\n/g, ' ')
    .trim();
  console.log(
    `#${p.item} ${nombreHoja.padEnd(24)} fila ${fila}  costo=${r[C_COSTO] ?? '—'}  precio: (vacío) → $${p.precio.toLocaleString('es-CO')}`,
  );
  backup.push({
    item: p.item,
    fila,
    nombre: nombreHoja,
    precioAntes: actual ?? '',
    costoAntes: r[C_COSTO] ?? '',
    obsAntes: r[C_OBS] ?? '',
  });
  updates.push({
    range: `${TAB}!${colLetter(C_PRECIO)}${fila}`,
    values: [[p.precio]],
  });
  updates.push({
    range: `${TAB}!${colLetter(C_OBS)}${fila}`,
    values: [[append(r[C_OBS], NOTA(p.precio))]],
  });
}

const total = PRECIOS.reduce((a, p) => a + p.precio, 0);
console.log(
  `\nTotal a restaurar: $${total.toLocaleString('es-CO')} en ${PRECIOS.length} ítems · ${updates.length} celdas`,
);
if (problemas.length) {
  console.log('\n⚠ Problemas:');
  problemas.forEach((p) => console.log('  - ' + p));
}
if (updates.length === 0) {
  console.log('\nNada que escribir.');
  process.exit(0);
}

if (!APPLY) {
  console.log('\nDRY-RUN. Correr con --apply para escribir.');
  process.exit(0);
}

mkdirSync('scripts/.backups', { recursive: true });
const bpath = `scripts/.backups/precios-tm001-ANTES-${STAMP}.json`;
writeFileSync(bpath, JSON.stringify(backup, null, 2));
console.log('\nBackup →', bpath);

const w = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'RAW', data: updates },
});
console.log('Celdas actualizadas:', w.data.totalUpdatedCells);

// VERIFICACIÓN: releer la hoja y localizar por cabecera nombrada.
// `totalUpdatedCells` dice que la API respondió, no que la fila quedó donde debe.
const check = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const H2 = check.data.values[0];
const P2 = H2.indexOf('precioFinalCOP');
const I2 = H2.indexOf('Item');
let ok = 0;
console.log('\n── VERIFICACIÓN (releyendo la hoja) ──');
for (const p of PRECIOS) {
  const fila = check.data.values.find(
    (r, i) => i && String(r?.[I2] ?? '').trim() === String(p.item),
  );
  const leido = fila ? Number(fila[P2]) : null;
  const bien = leido === p.precio;
  if (bien) ok++;
  console.log(
    `  ${bien ? '✅' : '❌'} #${p.item} → leído $${(leido ?? 0).toLocaleString('es-CO')} (esperado $${p.precio.toLocaleString('es-CO')})`,
  );
}
console.log(`\n${ok}/${PRECIOS.length} verificados en la hoja.`);
console.log(
  `\nFalta que Convex se entere Y quede el sello precioFinalManual:\n` +
    `  node scripts/sync-sot-convex.mjs --prod\n`,
);
if (ok !== PRECIOS.length) process.exit(1);
