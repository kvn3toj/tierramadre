/**
 * Carga la Factura de la Colección Madres en los 14 ítems "LOTE X CT" (SOT v3):
 * peso (ct), calidad, costoBaseCOP (L) y precioFinalCOP (M). Corrige de paso los
 * costos mal cargados de 4.4 y 4.5. Verifica que el Nombre de cada ítem coincida
 * con su código antes de escribir.
 *
 * Además: asigna MED-005 = "Semi Cuadrada" (código 3.4 de la factura Lote 3,
 * costo $591.240 en C-070) — reasigna su loteId, corrige el costoTotal del lote
 * (typo $491.240 → $591.240) y actualiza su nota.
 *
 * costoBaseCOP y precioFinalCOP ya son SHEET-OWNED (no los sobreescribe Convex).
 *
 * Uso:  node scripts/cargar-factura-madres.mjs           # dry-run
 *       node scripts/cargar-factura-madres.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';

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
const money = (s) => Number(String(s ?? '').replace(/[^\d.-]/g, '')) || 0;
const read = async (r) =>
  (await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: r })).data
    .values || [];

// Factura Colección Madres (total $3.136.000). precio = costo × 3.
// calidad mapeada al vocabulario SOT: SUPERFINO→COMERCIAL SÚPER FINA, FINO→COMERCIAL FINA,
// SUPERIOR→COMERCIAL SUPERIOR, Estandar→COMERCIAL ESTÁNDAR.
const MADRES = [
  {
    item: '266',
    cod: '1.6',
    peso: 0.12,
    cal: 'COMERCIAL SÚPER FINA',
    costo: 95400,
    precio: 286200,
  },
  {
    item: '267',
    cod: '1.7',
    peso: 0.34,
    cal: 'COMERCIAL SÚPER FINA',
    costo: 270300,
    precio: 810900,
  },
  {
    item: '268',
    cod: '1.8',
    peso: 0.19,
    cal: 'COMERCIAL SÚPER FINA',
    costo: 151050,
    precio: 453150,
  },
  {
    item: '273',
    cod: '2.3',
    peso: 0.51,
    cal: 'COMERCIAL FINA',
    costo: 311100,
    precio: 933300,
  },
  {
    item: '277',
    cod: '2.7',
    peso: 0.18,
    cal: 'COMERCIAL FINA',
    costo: 109800,
    precio: 329400,
  },
  {
    item: '279',
    cod: '2.9',
    peso: 0.34,
    cal: 'COMERCIAL FINA',
    costo: 207400,
    precio: 622200,
  },
  {
    item: '281',
    cod: '3.2',
    peso: 0.25,
    cal: 'COMERCIAL SUPERIOR',
    costo: 100000,
    precio: 300000,
  },
  {
    item: '282',
    cod: '3.3',
    peso: 0.34,
    cal: 'COMERCIAL SUPERIOR',
    costo: 136000,
    precio: 408000,
  },
  {
    item: '284',
    cod: '3.5',
    peso: 0.39,
    cal: 'COMERCIAL SUPERIOR',
    costo: 156000,
    precio: 468000,
  },
  {
    item: '285',
    cod: '3.6',
    peso: 0.33,
    cal: 'COMERCIAL SUPERIOR',
    costo: 132000,
    precio: 396000,
  },
  {
    item: '288',
    cod: '3.9',
    peso: 0.39,
    cal: 'COMERCIAL SUPERIOR',
    costo: 156000,
    precio: null,
  }, // sin precio en factura
  {
    item: '292',
    cod: '4.4',
    peso: 0.69,
    cal: 'COMERCIAL ESTÁNDAR',
    costo: 193200,
    precio: 579600,
  },
  {
    item: '293',
    cod: '4.5',
    peso: 1.5,
    cal: 'COMERCIAL ESTÁNDAR',
    costo: 420000,
    precio: 1260000,
  },
  {
    item: '297',
    cod: '4.9',
    peso: 1.7,
    cal: 'COMERCIAL ESTÁNDAR',
    costo: 476000,
    precio: 1428000,
  },
];

const inv = await read(`'Inventario'!A:AZ`);
const lotes = await read(`'Lotes'!A:U`);
const H = inv[0].map(c);
const iLike = (n) =>
  H.findIndex((h) => h.toLowerCase().includes(n.toLowerCase()));
const COL = {
  item: 0,
  nombre: 2,
  peso: 3,
  cal: 5,
  costo: 11,
  precio: 12,
  lote: iLike('loteid'),
};
const L = { peso: 'D', cal: 'F', costo: 'L', precio: 'M' };

const rowByItem = new Map(inv.map((r, i) => [c(r[COL.item]), i + 1]));

// ── Validación: nombre coincide con código ─────────────────────────────────
const data = [];
console.log(
  `\n=== Cargar Factura Colección Madres · ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'} ===\n`,
);
console.log(
  `${'item'.padEnd(5)}${'cod'.padEnd(5)}${'peso'.padEnd(6)}${'calidad'.padEnd(22)}${'costo'.padEnd(11)}precio`,
);
for (const m of MADRES) {
  const fila = rowByItem.get(m.item);
  if (!fila) {
    console.error(`⛔ item ${m.item} no existe. Abortado.`);
    process.exit(1);
  }
  const nombre = c(inv[fila - 1][COL.nombre]);
  if (nombre !== m.cod) {
    console.error(
      `⛔ item ${m.item}: nombre "${nombre}" ≠ código "${m.cod}". Abortado por seguridad.`,
    );
    process.exit(1);
  }
  data.push({ range: `'Inventario'!${L.peso}${fila}`, values: [[m.peso]] });
  data.push({ range: `'Inventario'!${L.cal}${fila}`, values: [[m.cal]] });
  data.push({ range: `'Inventario'!${L.costo}${fila}`, values: [[m.costo]] });
  if (m.precio != null)
    data.push({
      range: `'Inventario'!${L.precio}${fila}`,
      values: [[m.precio]],
    });
  console.log(
    `${m.item.padEnd(5)}${m.cod.padEnd(5)}${String(m.peso).padEnd(6)}${m.cal.padEnd(22)}$${m.costo.toLocaleString('es-CO').padEnd(10)}${m.precio != null ? '$' + m.precio.toLocaleString('es-CO') : '(en blanco)'}`,
  );
}

// ── MED-005 = Semi Cuadrada 3.4 ($591.240 en C-070) ────────────────────────
const semiIdx = inv.findIndex(
  (r, i) =>
    i > 0 && c(r[COL.lote]) === 'C-070' && money(r[COL.costo]) === 591240,
);
if (semiIdx < 0) {
  console.error(`⛔ No hallé "Semi Cuadrada" $591.240 en C-070. Abortado.`);
  process.exit(1);
}
const semiFila = semiIdx + 1;
const semiNombre = c(inv[semiIdx][COL.nombre]);
const medFila = lotes.findIndex((r) => c(r[0]) === 'MED-005') + 1;
console.log(
  `\nMED-005 ← "${semiNombre}" (item ${c(inv[semiIdx][COL.item])}, fila ${semiFila}, $591.240)`,
);
console.log(
  `  + corrige costoTotalCOP MED-005: $491.240 → $591.240 (typo) + nota`,
);
const LOTE_L = String.fromCharCode(65 + COL.lote); // X
data.push({
  range: `'Inventario'!${LOTE_L}${semiFila}`,
  values: [['MED-005']],
});
data.push({ range: `'Lotes'!E${medFila}`, values: [[591240]] });
data.push({
  range: `'Lotes'!M${medFila}`,
  values: [
    [
      `Reconciliado 2026-07-24 (factura Lote 3, código 3.4): gema "${semiNombre}" (item ${c(inv[semiIdx][COL.item])}), costo real $591.240. El $491.240 declarado era typo. Reasignada desde C-070.`,
    ],
  ],
});

// ── Backup ─────────────────────────────────────────────────────────────────
writeFileSync(
  'scripts/.backup-factura-madres.json',
  JSON.stringify(
    {
      fecha: '2026-07-24',
      madresAntes: MADRES.map((m) => {
        const f = rowByItem.get(m.item);
        return { item: m.item, fila: f, fila_valores: inv[f - 1] };
      }),
      semiCuadrada: {
        item: c(inv[semiIdx][COL.item]),
        fila: semiFila,
        loteAntes: 'C-070',
      },
      med005LoteAntes: lotes[medFila - 1],
    },
    null,
    2,
  ),
);
console.log('\nBackup: scripts/.backup-factura-madres.json');
console.log(`Celdas a escribir: ${data.length}`);

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply.');
  process.exit(0);
}

const res = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'USER_ENTERED', data },
});
console.log(`\n✅ Celdas actualizadas: ${res.data.totalUpdatedCells}`);

// ── Verificación ───────────────────────────────────────────────────────────
const after = await read(`'Inventario'!A:AZ`);
const byItem = new Map(after.slice(1).map((r) => [c(r[COL.item]), r]));
let ok = 0;
for (const m of MADRES) {
  const r = byItem.get(m.item);
  if (r && money(r[COL.costo]) === m.costo) ok++;
}
const semiAfter = c(byItem.get(c(inv[semiIdx][COL.item]))?.[COL.lote]);
console.log(
  `Verificado: costos Madres ${ok}/14 · Semi Cuadrada loteId="${semiAfter}"`,
);
const sinCosto = after
  .slice(1)
  .filter(
    (r) =>
      r.some((x) => c(x) !== '') &&
      /lote x ct/i.test(c(r[iLike('estado')])) &&
      money(r[COL.costo]) <= 0,
  ).length;
console.log(
  `LOTE X CT aún sin costo: ${sinCosto} (quedan 1.1 y 2.5, no estaban en la factura)`,
);
