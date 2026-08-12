/**
 * Carga el costo del lote C-068 "Elementales" y lo prorratea entre sus ítems.
 *
 * Datos de factura (2026-07-22): 8.20 ct · 48 piezas · $735.000
 *
 * Método: prorrateo POR PIEZA (735.000 / 48 = 15.312,50 c/u).
 * No se puede prorratear por quilate porque ninguno de los 10 ítems del lote
 * tiene peso individual registrado.
 *
 * Supuesto explícito: los 9 ítems con `Cant.` suman 38 piezas; el ítem 496 no
 * tiene cantidad, así que se le asignan las 10 restantes (38 + 10 = 48). Con
 * ese reparto la suma de los costos por ítem da exactamente 735.000.
 *
 * Uso:
 *   node scripts/cargar-costo-lote-c068.mjs           # dry-run
 *   node scripts/cargar-costo-lote-c068.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';

const LOTE = 'C-068';
const COSTO_TOTAL = 735000;
const PESO_TOTAL_CT = 8.2;
const PIEZAS = 48;
const CANT_ITEM_496 = 10; // residual: 48 − 38 registradas

const COL = { ITEM: 0, NOMBRE: 2, PESO: 3, CANT: 6, COSTO: 11, LOTE: 23 };

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
const read = async (r) =>
  (await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: r })).data
    .values || [];

const inv = await read(`'Inventario'!A:Y`);
const lotes = await read(`'Lotes'!A:U`);

// --- Reparto de piezas ----------------------------------------------------
const filas = [];
for (let i = 1; i < inv.length; i++) {
  if (c(inv[i][COL.LOTE]) !== LOTE) continue;
  const item = c(inv[i][COL.ITEM]);
  const cantRegistrada = parseInt(c(inv[i][COL.CANT])) || 0;
  filas.push({
    fila: i + 1,
    item,
    nombre: c(inv[i][COL.NOMBRE]),
    cantRegistrada,
    costoActual: c(inv[i][COL.COSTO]),
  });
}

const sumaRegistrada = filas.reduce((a, f) => a + f.cantRegistrada, 0);
const sinCantidad = filas.filter((f) => !f.cantRegistrada);

if (sinCantidad.length !== 1 || sumaRegistrada + CANT_ITEM_496 !== PIEZAS) {
  console.error(
    `\n⛔ El reparto de piezas no cuadra: ${filas.length} ítems, ${sumaRegistrada} piezas ` +
      `registradas, ${sinCantidad.length} sin cantidad, declaradas ${PIEZAS}. Abortado.`,
  );
  process.exit(1);
}
sinCantidad[0].cantAsignada = CANT_ITEM_496;
filas.forEach((f) => (f.cant = f.cantRegistrada || f.cantAsignada));

// --- Prorrateo por pieza --------------------------------------------------
// Se reparte al céntimo y el residuo de redondeo va al ítem más grande, para
// que la suma cierre EXACTA contra la factura.
const porPieza = COSTO_TOTAL / PIEZAS;
filas.forEach((f) => (f.costo = Math.round(porPieza * f.cant)));
const desvio = COSTO_TOTAL - filas.reduce((a, f) => a + f.costo, 0);
if (desvio !== 0) {
  const mayor = filas.reduce((a, b) => (b.cant > a.cant ? b : a));
  mayor.costo += desvio;
  mayor.ajuste = desvio;
}

// --- Reporte --------------------------------------------------------------
console.log(`\n=== Lote ${LOTE} · "Elementales" ===`);
console.log(
  `Factura: ${PESO_TOTAL_CT} ct · ${PIEZAS} piezas · $${COSTO_TOTAL.toLocaleString('es-CO')}`,
);
console.log(`Costo por pieza: $${porPieza.toLocaleString('es-CO')}`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}\n`);
console.log(
  `${'fila'.padEnd(6)}${'item'.padEnd(6)}${'nombre'.padEnd(16)}${'piezas'.padEnd(8)}costo`,
);
for (const f of filas) {
  const marca = f.cantAsignada
    ? ' ← inferida'
    : f.ajuste
      ? ` (ajuste ${f.ajuste})`
      : '';
  console.log(
    `${String(f.fila).padEnd(6)}${f.item.padEnd(6)}${f.nombre.padEnd(16)}${String(f.cant).padEnd(8)}$${f.costo.toLocaleString('es-CO')}${marca}`,
  );
}
const suma = filas.reduce((a, f) => a + f.costo, 0);
console.log(
  `\nSuma prorrateada: $${suma.toLocaleString('es-CO')} · factura $${COSTO_TOTAL.toLocaleString('es-CO')} · ${suma === COSTO_TOTAL ? 'CUADRA ✓' : '⛔ NO CUADRA'}`,
);

const filaLote = lotes.findIndex((r) => c(r[0]) === LOTE) + 1;
console.log(
  `\nFila del lote en 'Lotes': ${filaLote} → costoTotalCOP=$${COSTO_TOTAL.toLocaleString('es-CO')} · pesoTotalQuilates=${PESO_TOTAL_CT} · unidadesDeclaradas=${PIEZAS}`,
);

// --- Backup ---------------------------------------------------------------
writeFileSync(
  'scripts/.backup-c068.json',
  JSON.stringify(
    { filas, loteFila: filaLote, loteAntes: lotes[filaLote - 1] },
    null,
    2,
  ),
);

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply para escribir.');
  process.exit(0);
}

// --- Escritura ------------------------------------------------------------
const data = filas.map((f) => ({
  range: `'Inventario'!L${f.fila}`,
  values: [[f.costo]],
}));
// cantidad inferida del ítem sin `Cant.`
const inferida = filas.find((f) => f.cantAsignada);
data.push({
  range: `'Inventario'!G${inferida.fila}`,
  values: [[inferida.cant]],
});
// fila del lote: peso total, costo total, unidades
data.push({ range: `'Lotes'!D${filaLote}`, values: [[PESO_TOTAL_CT]] });
data.push({ range: `'Lotes'!E${filaLote}`, values: [[COSTO_TOTAL]] });
data.push({ range: `'Lotes'!F${filaLote}`, values: [[PIEZAS]] });
data.push({
  range: `'Lotes'!M${filaLote}`,
  values: [
    [
      `Costo cargado 2026-07-22 desde factura: ${PESO_TOTAL_CT} ct · ${PIEZAS} piezas · $${COSTO_TOTAL}. Prorrateado por pieza entre los ${filas.length} ítems. Falta proveedor y fecha de recepción.`,
    ],
  ],
});

const res = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'USER_ENTERED', data },
});
console.log(`\n✅ Celdas actualizadas: ${res.data.totalUpdatedCells}`);

// --- Verificación ---------------------------------------------------------
const after = await read(`'Inventario'!A:Y`);
const byItem = new Map(after.slice(1).map((r) => [c(r[COL.ITEM]), r]));
let ok = 0;
let total = 0;
for (const f of filas) {
  const v =
    parseInt(c(byItem.get(f.item)?.[COL.COSTO]).replace(/[^\d]/g, '')) || 0;
  total += v;
  if (v === f.costo) ok++;
  else console.log(`  ⚠️ item ${f.item}: quedó ${v}, esperado ${f.costo}`);
}
console.log(
  `Verificados OK: ${ok}/${filas.length} · suma en hoja: $${total.toLocaleString('es-CO')}`,
);
