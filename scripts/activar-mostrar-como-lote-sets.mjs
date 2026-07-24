/**
 * Activa `mostrarComoLote` (Lotes!U) SOLO en los 11 sets de Joyería Artesanal
 * C-023 → C-033, que son los que sí se venden como unidad (un set completo).
 *
 * Con esto el catálogo los expone como tarjeta agrupada y la ruta pública
 * `tierramadre.app/grupo/{loteId}` resuelve — que es a donde apunta el deck
 * `public/cotizacion-joyeria-artesanal.html`.
 *
 * NO toca ningún otro lote. En particular los lotes reconstruidos LC-01→LC-15
 * se quedan en FALSE a propósito: son agrupación administrativa (trazabilidad
 * de costo), no unidad de venta, y sus ítems deben seguir mostrándose sueltos.
 *
 * Tras aplicar hay que refrescar Convex: botón «Resync from sheet» del toolbar
 * de admin, o esperar el cron diario. Sin ese paso el catálogo no lo refleja.
 *
 * Uso:
 *   node scripts/activar-mostrar-como-lote-sets.mjs           # dry-run
 *   node scripts/activar-mostrar-como-lote-sets.mjs --apply   # escribe
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const COL_MOSTRAR = 20; // Lotes!U
const SETS = [
  'C-023',
  'C-024',
  'C-025',
  'C-026',
  'C-027',
  'C-028',
  'C-029',
  'C-030',
  'C-031',
  'C-032',
  'C-033',
];

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

const lotes = await read(`'Lotes'!A:U`);

// Localiza la fila de cada set y aborta si falta alguno.
const filas = [];
for (const id of SETS) {
  const idx = lotes.findIndex((r) => c(r[0]) === id);
  if (idx < 0) {
    console.error(
      `⛔ No encontré el lote ${id} en la pestaña Lotes. Abortado.`,
    );
    process.exit(1);
  }
  filas.push({
    id,
    fila: idx + 1,
    antes: c(lotes[idx][COL_MOSTRAR]),
    estado: c(lotes[idx][13]),
    unidades: c(lotes[idx][5]),
  });
}

console.log(`\n=== Activar mostrarComoLote · solo sets artesanales ===`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}\n`);
console.log(
  `${'lote'.padEnd(8)}${'fila'.padEnd(6)}${'estado'.padEnd(14)}${'uds'.padEnd(5)}antes → después`,
);
for (const f of filas) {
  console.log(
    `${f.id.padEnd(8)}${String(f.fila).padEnd(6)}${f.estado.padEnd(14)}${f.unidades.padEnd(5)}${(f.antes || '(vacío)').padEnd(9)} → TRUE`,
  );
}
console.log(`\nLotes a modificar: ${filas.length} (ningún otro se toca)`);

writeFileSync(
  'scripts/.backup-mostrarcomolote-sets.json',
  JSON.stringify({ fecha: '2026-07-23', col: 'Lotes!U', filas }, null, 2),
);
console.log('Backup: scripts/.backup-mostrarcomolote-sets.json');

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply para escribir.');
  process.exit(0);
}

const res = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: filas.map((f) => ({
      range: `'Lotes'!U${f.fila}`,
      values: [[true]],
    })),
  },
});
console.log(`\n✅ Celdas actualizadas: ${res.data.totalUpdatedCells}`);

// Verificación: los 11 en TRUE y los LC-* intactos en FALSE.
const after = await read(`'Lotes'!A:U`);
const byId = new Map(after.slice(1).map((r) => [c(r[0]), r]));
let ok = 0;
for (const f of filas) {
  const v = c(byId.get(f.id)?.[COL_MOSTRAR]);
  if (/^true$/i.test(v)) ok++;
  else console.log(`  ⚠️ ${f.id}: quedó "${v}"`);
}
const lcMal = after
  .slice(1)
  .filter(
    (r) => /^(LC|LR)-/.test(c(r[0])) && !/^false$/i.test(c(r[COL_MOSTRAR])),
  )
  .map((r) => c(r[0]));
console.log(`Verificado: sets en TRUE ${ok}/${filas.length}`);
console.log(
  lcMal.length
    ? `⚠️ Lotes reconstruidos que NO quedaron en FALSE: ${lcMal.join(', ')}`
    : `Lotes reconstruidos (LC-*/LR-*): intactos en FALSE ✓`,
);
console.log(
  `\nSiguiente paso: «Resync from sheet» en el toolbar de admin (o esperar el cron diario) para que Convex lo tome.`,
);
