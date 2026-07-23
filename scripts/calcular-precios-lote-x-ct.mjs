/**
 * Calcula precioFinalCOP para los ítems "LOTE X CT" que ya tienen costo
 * pero quedaron sin precio.
 *
 * Regla SOT v3: precioFinalCOP = ROUND(costoBaseCOP × 2.6)
 * Se escribe como FÓRMULA (=ROUND(L{fila}*2.6)), que es la convención de la
 * hoja: 441 de 471 filas con precio la usan. Así el precio sigue al costo si
 * el costo se corrige después.
 *
 * Uso:
 *   node scripts/calcular-precios-lote-x-ct.mjs           # dry-run
 *   node scripts/calcular-precios-lote-x-ct.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const MULT = 2.6;
const ESTADO = 'LOTE X CT';

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const sheets = new sheets_v4.Sheets({
  auth: new GoogleAuth({
    credentials: JSON.parse(rawKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

const c = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const num = (v) => {
  const x = c(v)
    .replace(/[$.\s]/g, '')
    .replace(/,/g, '');
  return x && x !== '-' && Number.isFinite(+x) ? +x : null;
};

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'Inventario'!A:Q`,
  valueRenderOption: 'FORMULA',
});
const rows = res.data.values || [];

const objetivo = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (c(r[16]) !== ESTADO) continue; // Q = ESTADO
  const costo = num(r[11]); // L
  const precio = c(r[12]); // M
  if (!costo) continue; // sin costo → no se puede calcular
  if (precio) continue; // ya tiene precio → no tocar
  objetivo.push({
    fila: i + 1,
    item: c(r[0]),
    nombre: c(r[2]),
    costo,
    precio: Math.round(costo * MULT),
  });
}

console.log(`\n=== precioFinalCOP para ítems "${ESTADO}" ===`);
console.log(
  `Regla: ROUND(costoBaseCOP × ${MULT}) · Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}\n`,
);
console.log(
  `${'fila'.padEnd(6)}${'item'.padEnd(6)}${'cód.'.padEnd(7)}${'costo'.padEnd(13)}precio final`,
);
for (const o of objetivo) {
  console.log(
    `${String(o.fila).padEnd(6)}${o.item.padEnd(6)}${o.nombre.padEnd(7)}$${o.costo.toLocaleString('es-CO').padEnd(12)}$${o.precio.toLocaleString('es-CO')}`,
  );
}
const sumaC = objetivo.reduce((a, o) => a + o.costo, 0);
const sumaP = objetivo.reduce((a, o) => a + o.precio, 0);
console.log(
  `\nTotal: ${objetivo.length} ítems · costo $${sumaC.toLocaleString('es-CO')} → precio $${sumaP.toLocaleString('es-CO')}`,
);

if (!objetivo.length) process.exit(0);
if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply para escribir.');
  process.exit(0);
}

const data = objetivo.map((o) => ({
  range: `'Inventario'!M${o.fila}`,
  values: [[`=ROUND(L${o.fila}*${MULT})`]],
}));
const w = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'USER_ENTERED', data },
});
console.log(`\n✅ Celdas actualizadas: ${w.data.totalUpdatedCells}`);

// Verificación: leer el valor calculado por Sheets
const after = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'Inventario'!A:M`,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const byItem = new Map(
  (after.data.values || []).slice(1).map((r) => [c(r[0]), r]),
);
let ok = 0;
for (const o of objetivo) {
  const v = num(byItem.get(o.item)?.[12]);
  if (v === o.precio) ok++;
  else console.log(`  ⚠️ item ${o.item}: quedó ${v}, esperado ${o.precio}`);
}
console.log(`Verificados OK: ${ok}/${objetivo.length}`);
