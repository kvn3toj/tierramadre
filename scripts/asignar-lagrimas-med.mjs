/**
 * Asigna las 2 "Lágrima" que siguen en C-070 (factura Lote 3 / Edwin, códigos 3.2
 * y 3.3) a lotes MED NUEVOS y frescos (MED-025, MED-026 — no se reusan IDs borrados
 * que siguen huérfanos en Convex prod).
 *
 *   MED-025 ← Lágrima $884.097 (código 3.2)
 *   MED-026 ← Lágrima $419.946 (código 3.3)
 *
 * Crea la fila de lote (proveedor Edwin Mauricio Ruiz, sede MED, contado/efectivo,
 * costoTotalCOP = costo de la gema) y reasigna el loteId del ítem de C-070 → MED.
 *
 * Uso:  node scripts/asignar-lagrimas-med.mjs           # dry-run
 *       node scripts/asignar-lagrimas-med.mjs --apply
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

const inv = await read(`'Inventario'!A:AZ`);
const lotes = await read(`'Lotes'!A:U`);
const H = inv[0].map(c);
const iLike = (n) =>
  H.findIndex((h) => h.toLowerCase().includes(n.toLowerCase()));
const COL = { item: 0, nombre: 2, costo: 11, lote: iLike('loteid') };
const LOTE_L = String.fromCharCode(65 + COL.lote); // X

const PLAN = [
  { med: 'MED-025', cod: '3.2', costo: 884097 },
  { med: 'MED-026', cod: '3.3', costo: 419946 },
];

const existentes = new Set(lotes.slice(1).map((r) => c(r[0])));
const moves = [];
for (const p of PLAN) {
  if (existentes.has(p.med)) {
    console.error(`⛔ ${p.med} ya existe. Abortado.`);
    process.exit(1);
  }
  const idx = inv.findIndex(
    (r, i) =>
      i > 0 && c(r[COL.lote]) === 'C-070' && money(r[COL.costo]) === p.costo,
  );
  if (idx < 0) {
    console.error(
      `⛔ No hallé Lágrima $${p.costo} en C-070 (${p.med}). Abortado.`,
    );
    process.exit(1);
  }
  moves.push({
    ...p,
    fila: idx + 1,
    item: c(inv[idx][COL.item]),
    nombre: c(inv[idx][COL.nombre]),
  });
}

console.log(
  `\n=== Asignar Lágrimas de C-070 a MED nuevos · ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'} ===\n`,
);
moves.forEach((m) =>
  console.log(
    `  ${m.med} (cód ${m.cod}) ← "${m.nombre}" item ${m.item} ($${m.costo.toLocaleString('es-CO')}) · fila Inv ${m.fila}`,
  ),
);

writeFileSync(
  'scripts/.backup-lagrimas-med.json',
  JSON.stringify(
    {
      fecha: '2026-07-24',
      moves: moves.map((m) => ({
        item: m.item,
        fila: m.fila,
        loteAntes: 'C-070',
        loteDespues: m.med,
      })),
    },
    null,
    2,
  ),
);
console.log('\nBackup: scripts/.backup-lagrimas-med.json');

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply.');
  process.exit(0);
}

// 1) reasignar loteId de los ítems  ·  2) crear filas de lote MED
const data = moves.map((m) => ({
  range: `'Inventario'!${LOTE_L}${m.fila}`,
  values: [[m.med]],
}));
const N = 21;
let cursor = lotes.length + 1;
for (const m of moves) {
  const row = new Array(N).fill('');
  row[0] = m.med; // loteId
  row[1] = 'Edwin Mauricio Ruiz'; // providerNombre
  row[4] = m.costo; // costoTotalCOP
  row[5] = 1; // unidadesDeclaradas
  row[6] = 'contado'; // formaPago
  row[7] = 'efectivo'; // metodoContado
  row[12] = `Reconciliado 2026-07-24: gema "${m.nombre}" (item ${m.item}), factura Lote 3 código ${m.cod}, costo $${m.costo}. Reasignada desde C-070. Verificar fecha de recepción en factura.`;
  row[13] = 'abierto'; // estado
  row[17] = 'MED'; // sede
  data.push({ range: `'Lotes'!A${cursor}:U${cursor}`, values: [row] });
  cursor++;
}
const res = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'USER_ENTERED', data },
});
console.log(
  `\n✅ Celdas actualizadas: ${res.data.totalUpdatedCells} (2 reasignaciones + 2 lotes nuevos)`,
);

const after = await read(`'Inventario'!A:AZ`);
let ok = 0;
for (const m of moves) if (c(after[m.fila - 1]?.[COL.lote]) === m.med) ok++;
const c070 = after.slice(1).filter((r) => c(r[COL.lote]) === 'C-070').length;
console.log(
  `Verificado: reasignados ${ok}/2 · C-070 ahora tiene ${c070} ítems`,
);
