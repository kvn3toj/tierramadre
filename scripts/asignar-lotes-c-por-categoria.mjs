/**
 * Asigna lote a TODOS los ítems del Inventario (SOT v3) que están SIN loteId,
 * agrupándolos POR CATEGORÍA en lotes nuevos con IDs consecutivos C-XXX
 * (continuando la secuencia C existente). Un lote por categoría (no uno por ítem).
 *
 * Cada lote nuevo:
 *   loteId = C-NNN (consecutivo) · renombreLote = categoría · estado 'reconstruido'
 *   costoTotalCOP = Σ costoBaseCOP de sus ítems · pesoTotalQuilates = Σ Ct numéricos
 *   unidadesDeclaradas = # ítems · mostrarComoLote = FALSE (no se publica como lote)
 *
 * Nota: costoBaseCOP (col L) lo DERIVA Convex (lote.costoTotalCOP × preponderancia)
 * y lo reescribe; aquí solo tomamos el valor actual para el costoTotal informativo.
 *
 * Idempotente: solo escribe en ítems con loteId vacío y crea lotes que no existan.
 *
 * Uso:  node scripts/asignar-lotes-c-por-categoria.mjs           # dry-run
 *       node scripts/asignar-lotes-c-por-categoria.mjs --apply
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
const numCt = (s) => {
  const n = Number(
    String(s ?? '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, ''),
  );
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const read = async (r) =>
  (await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: r })).data
    .values || [];

const inv = await read(`'Inventario'!A:AZ`);
const lotes = await read(`'Lotes'!A:U`);
const H = inv[0].map(c);
const iLike = (n) =>
  H.findIndex((h) => h.toLowerCase().includes(n.toLowerCase()));
const IC = {
  item: 0,
  nombre: 2,
  peso: 3,
  cat: iLike('categor'),
  costo: iLike('costobase') >= 0 ? iLike('costobase') : 11,
  estado: iLike('estado'),
  lote: iLike('loteid'),
};
const LOTE_COL_LETTER = String.fromCharCode(65 + IC.lote); // X

// Siguiente número C libre
const cNums = lotes
  .slice(1)
  .map((r) => c(r[0]))
  .map((id) => (id.match(/^C-(\d+)$/) || [])[1])
  .filter(Boolean)
  .map(Number);
const existentes = new Set(lotes.slice(1).map((r) => c(r[0])));
let nextC = (cNums.length ? Math.max(...cNums) : 0) + 1;
const nextCId = () => {
  let id;
  do {
    id = `C-${String(nextC).padStart(3, '0')}`;
    nextC++;
  } while (existentes.has(id));
  existentes.add(id);
  return id;
};

// Ítems sin lote → agrupar por categoría
const filas = [];
for (let i = 1; i < inv.length; i++) {
  const r = inv[i];
  if (!r || !r.some((x) => c(x) !== '')) continue;
  if (c(r[IC.lote]) !== '') continue;
  filas.push({
    fila: i + 1,
    item: c(r[IC.item]),
    cat: c(r[IC.cat]) || 'Sin categoría',
    estado: c(r[IC.estado]),
    costo: money(r[IC.costo]),
    ct: numCt(r[IC.peso]),
  });
}
const byCat = new Map();
for (const f of filas) {
  if (!byCat.has(f.cat)) byCat.set(f.cat, []);
  byCat.get(f.cat).push(f);
}
// orden: por # de ítems desc
const grupos = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length);

const nuevosLotes = [];
for (const [cat, its] of grupos) {
  const loteId = nextCId();
  const costoTotal = its.reduce((a, f) => a + f.costo, 0);
  const pesoTotal = its.reduce((a, f) => a + f.ct, 0);
  const vend = its.filter((f) => /vendid/i.test(f.estado)).length;
  its.forEach((f) => (f.loteId = loteId));
  nuevosLotes.push({
    loteId,
    cat,
    n: its.length,
    costoTotal,
    pesoTotal,
    vend,
    its,
  });
}

console.log(`\n=== Asignar lotes C-XXX por categoría (ítems sin lote) ===`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}`);
console.log(
  `Ítems sin lote: ${filas.length} → ${nuevosLotes.length} lotes nuevos (C-${String((cNums.length ? Math.max(...cNums) : 0) + 1).padStart(3, '0')} en adelante)\n`,
);
console.log(
  `${'loteId'.padEnd(8)}${'categoría'.padEnd(20)}${'items'.padEnd(7)}${'(vendidos)'.padEnd(11)}${'pesoCt'.padEnd(9)}costoTotal`,
);
for (const l of nuevosLotes) {
  console.log(
    `${l.loteId.padEnd(8)}${l.cat.slice(0, 18).padEnd(20)}${String(l.n).padEnd(7)}${String(l.vend).padEnd(11)}${l.pesoTotal.toFixed(1).padEnd(9)}${fmt(l.costoTotal)}`,
  );
}
console.log(
  `\nΣ ítems: ${filas.length} · Σ costo: ${fmt(nuevosLotes.reduce((a, l) => a + l.costoTotal, 0))}`,
);

// Backup
writeFileSync(
  'scripts/.backup-asignar-c-categoria.json',
  JSON.stringify(
    {
      fecha: '2026-07-24',
      loteColLetter: LOTE_COL_LETTER,
      itemsAntes: filas.map((f) => ({
        fila: f.fila,
        item: f.item,
        loteAntes: '',
      })),
      lotesTabAntes: lotes,
    },
    null,
    2,
  ),
);
console.log('Backup: scripts/.backup-asignar-c-categoria.json');

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply para escribir.');
  process.exit(0);
}

// Escritura: 1) loteId en Inventario · 2) filas nuevas en Lotes
const dataInv = filas.map((f) => ({
  range: `'Inventario'!${LOTE_COL_LETTER}${f.fila}`,
  values: [[f.loteId]],
}));
const N = 21;
let cursor = lotes.length + 1;
const dataLotes = [];
for (const l of nuevosLotes) {
  const row = new Array(N).fill('');
  row[0] = l.loteId;
  row[3] = l.pesoTotal || '';
  row[4] = l.costoTotal || '';
  row[5] = l.n;
  row[12] = `Lote RECONSTRUIDO 2026-07-24 por categoría "${l.cat}" (ítems que estaban sin lote). costoTotalCOP = Σ costoBaseCOP actual de sus ítems. ${l.vend ? l.vend + ' vendidos incluidos.' : ''}`;
  row[13] = 'reconstruido';
  row[14] = l.cat;
  row[20] = 'FALSE';
  dataLotes.push({ range: `'Lotes'!A${cursor}:U${cursor}`, values: [row] });
  cursor++;
}
const res = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: [...dataInv, ...dataLotes],
  },
});
console.log(
  `\n✅ Celdas actualizadas: ${res.data.totalUpdatedCells} · ítems: ${dataInv.length} · lotes creados: ${dataLotes.length}`,
);

// Verificación
const after = await read(`'Inventario'!A:AZ`);
const byFila = new Map(after.map((r, i) => [i + 1, r]));
let ok = 0;
for (const f of filas) if (c(byFila.get(f.fila)?.[IC.lote]) === f.loteId) ok++;
const sinLoteAfter = after
  .slice(1)
  .filter((r) => r.some((x) => c(x) !== '') && c(r[IC.lote]) === '').length;
console.log(
  `Verificado: ítems con su loteId ${ok}/${filas.length} · ítems SIN lote restantes: ${sinLoteAfter}`,
);
