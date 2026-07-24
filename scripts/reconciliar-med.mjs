/**
 * Cierra la reconciliación de los lotes MED-* (compras a Edwin Mauricio Ruiz,
 * Medellín, 13-14 jul 2026) contra las gemas ya cargadas bajo el lote fantasma
 * C-070.
 *
 * FUSIÓN (3 sólidos): reasigna la gema de C-070 a su lote MED (por costo exacto)
 * y documenta la reconciliación en las notas del lote:
 *   MED-004 ← "Cuadrada"      ($790.162)
 *   MED-006 ← "Semi Cuadrada" ($629.919)
 *   MED-007 ← "Lágrima"       ($618.868 ≈ $618.838)
 *
 * PENDIENTES: MED-001, MED-005, MED-012 no se pudieron ubicar de forma fiable
 *   (MED-001: único match es un insumo de otro proveedor; MED-005: costo no
 *   aparece; MED-012: 8 gemas $2.071.050 sin cargar). Se marcan en notas.
 *
 * Uso:  node scripts/reconciliar-med.mjs           # dry-run
 *       node scripts/reconciliar-med.mjs --apply
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
const NOM = 2,
  COSTO = iLike('costobase') >= 0 ? iLike('costobase') : 11,
  LOTE = iLike('loteid');
const LOTE_L = String.fromCharCode(65 + LOTE); // X
const NOTAS_L = 'M'; // Lotes col 12

// ── Fusión: encontrar la gema exacta en C-070 y su fila ────────────────────
const FUSION = [
  { med: 'MED-004', cost: 790162, nombre: 'Cuadrada' },
  { med: 'MED-006', cost: 629919, nombre: 'Semi Cuadrada' },
  { med: 'MED-007', cost: 618868, nombre: 'Lágrima' },
];
const moves = [];
for (const f of FUSION) {
  const idx = inv.findIndex(
    (r, i) => i > 0 && c(r[LOTE]) === 'C-070' && money(r[COSTO]) === f.cost,
  );
  if (idx < 0) {
    console.error(
      `⛔ No hallé en C-070 un ítem con costo ${f.cost} (${f.med}). Abortado.`,
    );
    process.exit(1);
  }
  moves.push({
    ...f,
    fila: idx + 1,
    item: c(inv[idx][0]),
    nombreReal: c(inv[idx][NOM]),
  });
}

// ── Notas por lote ─────────────────────────────────────────────────────────
const loteRow = (id) => lotes.findIndex((r) => c(r[0]) === id) + 1;
const notas = {
  'MED-004': `Reconciliado 2026-07-24: su gema es "${moves.find((m) => m.med === 'MED-004').nombreReal}" (item ${moves.find((m) => m.med === 'MED-004').item}), reasignada desde el lote fantasma C-070 por costo exacto ($790.162).`,
  'MED-006': `Reconciliado 2026-07-24: su gema es "${moves.find((m) => m.med === 'MED-006').nombreReal}" (item ${moves.find((m) => m.med === 'MED-006').item}), reasignada desde C-070 por costo exacto ($629.919).`,
  'MED-007': `Reconciliado 2026-07-24: su gema es "${moves.find((m) => m.med === 'MED-007').nombreReal}" (item ${moves.find((m) => m.med === 'MED-007').item}), reasignada desde C-070 (costo $618.868 ≈ $618.838).`,
  'MED-001': `PENDIENTE de itemizar 2026-07-24: no se ubica la gema. El único match de costo ($22.400) es un insumo "Chatones Redondos 5mm" de otro proveedor (Joyería Legado, C-065) — probablemente coincidencia. Requiere factura física de Edwin.`,
  'MED-005': `PENDIENTE de itemizar 2026-07-24: el costo $491.240 no aparece en ningún ítem del catálogo. Gema sin cargar. Requiere factura física de Edwin.`,
  'MED-012': `PENDIENTE de itemizar 2026-07-24: 8 gemas ($2.071.050) sin cargar — no se ubican en ningún lote. Requiere factura física de Edwin.`,
};

console.log(
  `\n=== Reconciliación MED · modo ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'} ===\n`,
);
console.log('FUSIÓN (reasignar gema C-070 → su MED):');
moves.forEach((m) =>
  console.log(
    `  ${m.med} ← item ${m.item} "${m.nombreReal}" ($${m.cost.toLocaleString('es-CO')}) · fila Inv ${m.fila}`,
  ),
);
console.log('\nNOTAS pendientes:');
['MED-001', 'MED-005', 'MED-012'].forEach((id) =>
  console.log(`  ${id}: ${notas[id].slice(0, 70)}…`),
);

// backup
writeFileSync(
  'scripts/.backup-reconciliar-med.json',
  JSON.stringify(
    {
      fecha: '2026-07-24',
      movesAntes: moves.map((m) => ({
        item: m.item,
        fila: m.fila,
        loteAntes: 'C-070',
        loteDespues: m.med,
      })),
      lotesTabAntes: lotes.filter((r) => /^MED-/.test(c(r[0]))),
    },
    null,
    2,
  ),
);
console.log('\nBackup: scripts/.backup-reconciliar-med.json');

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply.');
  process.exit(0);
}

// ── Escritura ──────────────────────────────────────────────────────────────
const data = [];
for (const m of moves)
  data.push({ range: `'Inventario'!${LOTE_L}${m.fila}`, values: [[m.med]] });
for (const [id, texto] of Object.entries(notas)) {
  const fila = loteRow(id);
  if (fila > 0)
    data.push({ range: `'Lotes'!${NOTAS_L}${fila}`, values: [[texto]] });
}
const res = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'USER_ENTERED', data },
});
console.log(
  `\n✅ Celdas actualizadas: ${res.data.totalUpdatedCells} (3 reasignaciones + 6 notas)`,
);

// verificación
const after = await read(`'Inventario'!A:AZ`);
let ok = 0;
for (const m of moves) if (c(after[m.fila - 1]?.[LOTE]) === m.med) ok++;
const c070 = after.slice(1).filter((r) => c(r[LOTE]) === 'C-070').length;
console.log(
  `Verificado: reasignados ${ok}/3 · C-070 ahora tiene ${c070} ítems (antes 13)`,
);
