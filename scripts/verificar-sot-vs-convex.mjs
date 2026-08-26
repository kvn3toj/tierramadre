/**
 * Coteja la pestaña "Inventario" del SOT contra la tabla productInventory de
 * Convex, ítem por ítem y campo por campo, usando el mapa canónico de columnas
 * (api/_lib/fotosintesis-inventory-columns.js).
 *
 * Existe porque `syncStatus: "synced"` NO prueba aterrizaje: sólo dice que el
 * POST devolvió 2xx. La única verificación real es leer las dos puntas y
 * compararlas, localizando por CABECERA NOMBRADA. Ver CLAUDE.md.
 *
 * Sólo lee. No escribe en ningún lado.
 *
 * Uso:
 *   node scripts/verificar-sot-vs-convex.mjs 544 546
 *   node scripts/verificar-sot-vs-convex.mjs --lote C-090
 *   node scripts/verificar-sot-vs-convex.mjs 484 --todos-los-campos
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { google } from 'googleapis';
import { config } from 'dotenv';
import { FOTO_INVENTARIO_COLUMNS } from '../api/_lib/fotosintesis-inventory-columns.js';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const argv = process.argv.slice(2);
const valOf = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const LOTE = valOf('--lote');
const TODOS = argv.includes('--todos-los-campos');
const IDS = argv.filter((a) => /^\d+$/.test(a));

const TAB = 'Inventario';
const SHEET_ID = process.env.FOTOSINTESIS_SPREADSHEET_ID;
if (!SHEET_ID) throw new Error('Falta FOTOSINTESIS_SPREADSHEET_ID');

// La credencial viaja en base64 en este repo. Nunca imprimirla.
const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim();
const creds = JSON.parse(
  raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'),
);
const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }),
});

// ── Convex ──────────────────────────────────────────────────────────────────
process.stderr.write('leyendo Convex prod…\n');
// Vía archivo, no por stdout capturado: el CLI envuelve las líneas cuando no
// escribe a una TTY y el JSON llega partido a la mitad.
const tmp = `${tmpdir()}/convex-inv-${process.pid}.jsonl`;
execFileSync(
  'sh',
  [
    '-c',
    `npx convex data --prod productInventory --format jsonLines --limit 2000 > ${tmp}`,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);
const dump = readFileSync(tmp, 'utf8');
rmSync(tmp, { force: true });
const convex = new Map();
for (const line of dump.trim().split('\n')) {
  const r = JSON.parse(line);
  convex.set(String(r.itemId), r);
}

// ── Hoja ────────────────────────────────────────────────────────────────────
process.stderr.write('leyendo la hoja…\n');
const { data } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const rows = data.values ?? [];
const headers = (rows[0] ?? []).map((h) => String(h).trim());
const colItem = headers.indexOf('Item');
const hoja = new Map();
rows.forEach((r, i) => {
  if (i === 0) return;
  const id = String(r[colItem] ?? '').trim();
  if (id) hoja.set(id, { row: r, sheetRow: i + 1 });
});

// ── Qué ítems ───────────────────────────────────────────────────────────────
let ids = IDS;
if (LOTE) {
  const delLote = [...convex.values()]
    .filter((r) => r.loteId === LOTE)
    .map((r) => String(r.itemId));
  ids = [...new Set([...ids, ...delLote])];
}
ids.sort((a, b) => Number(a) - Number(b));
if (!ids.length) throw new Error('Pasá ítems (ej. 544 546) o --lote C-090');

// Campos que NO se comparan: los `preserve` viven sólo en la hoja y Convex los
// espeja aparte, y `_sinUso` no es un campo.
// Se excluyen los `preserve`: son columnas que mantiene una persona en la hoja
// y que la app nunca escribe, así que Convex las espeja aparte y una diferencia
// ahí no dice nada sobre el sync. Y `preponderancia`, que Convex posee y está
// fuera del allowlist de pull a propósito — la hoja dice 0 y Convex undefined
// en todas las filas, puro ruido.
const COMPARABLES = FOTO_INVENTARIO_COLUMNS.filter(
  (c) =>
    c.key &&
    !c.key.startsWith('_') &&
    !c.preserve &&
    c.key !== 'item' &&
    c.key !== 'preponderancia',
);

const norm = (v) => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.join(', ');
  return String(v).replace(/\s+/g, ' ').trim();
};

let totalDif = 0;
for (const id of ids) {
  const h = hoja.get(id);
  const c = convex.get(id);
  console.log(`\n${'═'.repeat(78)}`);
  if (!h) {
    console.log(`#${id} — NO está en la hoja`);
    continue;
  }
  if (!c) {
    console.log(`#${id} — NO está en Convex`);
    continue;
  }
  console.log(
    `#${id} ${c.nombre ?? ''} · lote ${c.loteId ?? '—'} · hoja fila ${h.sheetRow} · Convex rowIndex ${c.rowIndex}` +
      `\n   pull ${c.lastPulledAt ?? '—'} · push ${c.lastPushedAt ?? '—'} · syncStatus ${c.syncStatus}`,
  );

  const difs = [];
  for (const col of COMPARABLES) {
    const ci = headers.indexOf(col.header);
    if (ci < 0) continue;
    const vh = norm(h.row[ci]);
    const vc = norm(c[col.key]);
    // "4.1" y "4.10" son el mismo peso: la hoja guarda número y Convex string.
    // Comparar como texto inventaría una diferencia que no existe.
    const ambosNum =
      vh !== '' && vc !== '' && !isNaN(Number(vh)) && !isNaN(Number(vc));
    const iguales = ambosNum ? Number(vh) === Number(vc) : vh === vc;
    if (!iguales) difs.push({ header: col.header, key: col.key, vh, vc });
    else if (TODOS)
      console.log(`   ·  ${col.header.padEnd(24)} ${vh || '(vacío)'}`);
  }

  if (!difs.length) {
    console.log(`   ✅ hoja y Convex coinciden en los ${COMPARABLES.length} campos comparables`);
  } else {
    totalDif += difs.length;
    console.log(`   ⚠️  ${difs.length} diferencia(s):`);
    for (const d of difs) {
      console.log(`      ${d.header} (${d.key})`);
      console.log(`         hoja  : ${d.vh.slice(0, 110) || '(vacío)'}`);
      console.log(`         convex: ${d.vc.slice(0, 110) || '(vacío)'}`);
    }
  }
}

console.log(`\n${'═'.repeat(78)}`);
console.log(
  totalDif === 0
    ? `✅ ${ids.length} ítem(s) verificados, sin diferencias entre la hoja y Convex.`
    : `⚠️  ${totalDif} diferencia(s) en ${ids.length} ítem(s).`,
);
