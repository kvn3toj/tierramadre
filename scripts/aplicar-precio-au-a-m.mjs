/**
 * Copia el precio oficial de la columna AU ("Caja: precio venta") a la columna M
 * (`precioFinalCOP`) del SOT v3 — que es la que lee la app.
 *
 * Decisión de negocio (2026-07-23): el precio final que ve el cliente es el de
 * AU, no `costoBaseCOP × 2.6`. La columna L (costo) NO se toca: el costo sigue
 * siendo derivado del lote y es la base fiscal y de comisiones.
 *
 * Qué hace exactamente:
 *   - Sólo filas con AU > 0 (las demás conservan su fórmula =REDONDEAR(L*2.6)).
 *   - Escribe AU como VALOR ESTÁTICO en M, reemplazando la fórmula. Es
 *     necesario: mientras M sea una fórmula sobre L, el precio nunca puede
 *     apartarse del costo.
 *   - Guarda un backup JSON del M anterior (fórmula o valor) para revertir.
 *
 * Después de aplicar hay que empujar el cambio a Convex:
 *   node scripts/sync-sot-convex.mjs            # dev
 *   node scripts/sync-sot-convex.mjs --prod     # producción
 * El pull marca `precioFinalManual: true` en cada fila, de modo que un re-fan
 * del lote ya no vuelve a poner costo × 2.6 encima.
 *
 * Uso:
 *   node scripts/aplicar-precio-au-a-m.mjs                # DRY-RUN (no escribe)
 *   node scripts/aplicar-precio-au-a-m.mjs --apply
 *   node scripts/aplicar-precio-au-a-m.mjs --apply --solo 89,97
 *   node scripts/aplicar-precio-au-a-m.mjs --revertir <backup.json>
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync, readFileSync } from 'node:fs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const COL_ITEM = 0; // A
const COL_NOMBRE = 2; // C
const COL_L = 11; // L costoBaseCOP
const COL_M = 12; // M precioFinalCOP
const COL_ESTADO = 16; // Q
const COL_AU = 46; // AU "Caja: precio venta"

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const valOf = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const soloRaw = valOf('--solo');
const SOLO = soloRaw ? new Set(soloRaw.split(',').map((s) => s.trim())) : null;
const REVERTIR = valOf('--revertir');

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

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[$\s,]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n) => n.toLocaleString('es-CO');

// ── modo revertir ───────────────────────────────────────────────────────────
if (REVERTIR) {
  const backup = JSON.parse(readFileSync(REVERTIR, 'utf8'));
  console.log(
    `\n↩️  Revirtiendo ${backup.celdas.length} celdas de M desde ${REVERTIR}\n`,
  );
  if (!APPLY) {
    console.log('DRY-RUN. Añade --apply para escribir de verdad.');
    process.exit(0);
  }
  const res = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: backup.celdas.map((c) => ({
        range: `'${TAB}'!M${c.fila}`,
        values: [[c.antes]],
      })),
    },
  });
  console.log(`✅ Revertidas ${res.data.totalUpdatedCells} celdas.`);
  process.exit(0);
}

// ── lectura ─────────────────────────────────────────────────────────────────
const [valores, formulas] = await Promise.all(
  ['UNFORMATTED_VALUE', 'FORMULA'].map((r) =>
    sheets.spreadsheets.values
      .get({
        spreadsheetId: SOT3,
        range: `'${TAB}'!A:AU`,
        valueRenderOption: r,
      })
      .then((x) => x.data.values || []),
  ),
);

const objetivo = [];
const saltadas = { sinAU: 0, filtradas: 0, yaIgual: 0 };

for (let i = 1; i < valores.length; i++) {
  const v = valores[i];
  const f = formulas[i] || [];
  const item = String(v?.[COL_ITEM] ?? '').trim();
  if (!item || !Number.isFinite(Number(item))) continue;
  if (SOLO && !SOLO.has(item)) {
    saltadas.filtradas++;
    continue;
  }
  const au = num(v[COL_AU]);
  if (au <= 0) {
    saltadas.sinAU++;
    continue;
  }
  const mActual = num(v[COL_M]);
  if (mActual === au) {
    saltadas.yaIgual++;
    continue;
  }
  objetivo.push({
    fila: i + 1,
    item,
    nombre: String(v[COL_NOMBRE] ?? '')
      .replace(/\s+/g, ' ')
      .trim(),
    estado: String(v[COL_ESTADO] ?? ''),
    costoL: num(v[COL_L]),
    antes: f[COL_M] ?? '',
    antesValor: mActual,
    despues: au,
  });
}

console.log(
  `\n=== AU → M (precioFinalCOP) · ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'} ===`,
);
console.log(`hoja: SOT-v3 / ${TAB}   ·   columna L (costo): NO SE TOCA\n`);
console.log(
  `${'fila'.padEnd(6)}${'item'.padEnd(7)}${'nombre'.padEnd(26)}${'costo L'.padStart(13)}${'M antes'.padStart(14)}${'M después'.padStart(14)}${'x'.padStart(7)}  estado`,
);
for (const o of objetivo.slice(0, 40)) {
  const mult = o.costoL ? (o.despues / o.costoL).toFixed(2) : '—';
  console.log(
    `${String(o.fila).padEnd(6)}${o.item.padEnd(7)}${o.nombre.slice(0, 25).padEnd(26)}${fmt(o.costoL).padStart(13)}${fmt(o.antesValor).padStart(14)}${fmt(o.despues).padStart(14)}${String(mult).padStart(7)}  ${o.estado}`,
  );
}
if (objetivo.length > 40)
  console.log(`   … y ${objetivo.length - 40} filas más`);

const sumAntes = objetivo.reduce((a, o) => a + o.antesValor, 0);
const sumDespues = objetivo.reduce((a, o) => a + o.despues, 0);
console.log(
  `\nfilas a cambiar: ${objetivo.length}` +
    `   ·  sin AU (intactas): ${saltadas.sinAU}` +
    `   ·  ya iguales: ${saltadas.yaIgual}` +
    (SOLO ? `   ·  fuera del filtro --solo: ${saltadas.filtradas}` : ''),
);
console.log(
  `precio total:  ${fmt(sumAntes)}  →  ${fmt(sumDespues)}   (${sumDespues - sumAntes >= 0 ? '+' : ''}${fmt(sumDespues - sumAntes)})`,
);

const bajoCosto = objetivo.filter((o) => o.costoL > 0 && o.despues < o.costoL);
if (bajoCosto.length) {
  console.log(
    `\n⚠️  ${bajoCosto.length} fila(s) quedarían POR DEBAJO DEL COSTO:`,
  );
  for (const o of bajoCosto)
    console.log(
      `     item ${o.item} ${o.nombre.slice(0, 24)}  costo ${fmt(o.costoL)} > precio ${fmt(o.despues)}`,
    );
}

if (!objetivo.length) {
  console.log('\nNada que hacer.');
  process.exit(0);
}
if (!APPLY) {
  console.log('\nDRY-RUN — no se escribió nada. Añade --apply para aplicar.');
  process.exit(0);
}

// ── backup + escritura ──────────────────────────────────────────────────────
const stamp = process.env.BACKUP_STAMP || String(Date.now());
const backupPath = `scripts/.backup-precio-au-m-${stamp}.json`;
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      hoja: SOT3,
      tab: TAB,
      columna: 'M',
      celdas: objetivo.map((o) => ({
        fila: o.fila,
        item: o.item,
        antes: o.antes,
        despues: o.despues,
      })),
    },
    null,
    2,
  ),
);
console.log(`\n💾 Backup: ${backupPath}`);

const CHUNK = 200;
let escritas = 0;
for (let i = 0; i < objetivo.length; i += CHUNK) {
  const lote = objetivo.slice(i, i + CHUNK);
  const res = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'RAW', // valor estático: reemplaza la fórmula de M
      data: lote.map((o) => ({
        range: `'${TAB}'!M${o.fila}`,
        values: [[o.despues]],
      })),
    },
  });
  escritas += res.data.totalUpdatedCells ?? 0;
  console.log(`   escritas ${escritas}/${objetivo.length}…`);
}

// ── verificación ────────────────────────────────────────────────────────────
const after = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'${TAB}'!A:AU`,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const byItem = new Map(
  (after.data.values || [])
    .slice(1)
    .map((r) => [String(r[COL_ITEM] ?? '').trim(), r]),
);
let ok = 0;
const malas = [];
for (const o of objetivo) {
  const got = num(byItem.get(o.item)?.[COL_M]);
  if (got === o.despues) ok++;
  else malas.push({ item: o.item, esperado: o.despues, obtenido: got });
}
console.log(
  `\n✅ Verificado: ${ok}/${objetivo.length} celdas con el precio de AU.`,
);
for (const m of malas.slice(0, 10))
  console.log(
    `   ⚠️ item ${m.item}: esperado ${fmt(m.esperado)}, quedó ${fmt(m.obtenido)}`,
  );

console.log(
  `\nSiguiente paso — empujar a Convex:\n` +
    `   node scripts/sync-sot-convex.mjs           # dev\n` +
    `   node scripts/sync-sot-convex.mjs --prod    # producción\n` +
    `\nRevertir la hoja si hace falta:\n` +
    `   node scripts/aplicar-precio-au-a-m.mjs --revertir ${backupPath} --apply\n`,
);
