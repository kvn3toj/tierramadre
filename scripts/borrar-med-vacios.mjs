/**
 * Borra de la pestaña `Lotes` (SOT v3) los lotes MED-* VACÍOS: costo nominal ($1),
 * 0 ítems en Inventario y sin descripción/notas/renombre. Los MED con costo real
 * (MED-001, 004, 005, 006, 007, 012) NO se tocan.
 *
 * Re-localiza cada fila por loteId (no por número fijo), respalda las filas antes de
 * borrar y elimina filas enteras (deleteDimension) de mayor a menor para no desfasar.
 *
 * Uso:  node scripts/borrar-med-vacios.mjs           # dry-run
 *       node scripts/borrar-med-vacios.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const BORRAR = [
  'MED-002',
  'MED-003',
  'MED-008',
  'MED-009',
  'MED-010',
  'MED-011',
  'MED-014',
  'MED-015',
  'MED-016',
  'MED-017',
  'MED-018',
  'MED-019',
  'MED-020',
  'MED-021',
  'MED-022',
  'MED-023',
  'MED-024',
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
const money = (s) => Number(String(s ?? '').replace(/[^\d.-]/g, '')) || 0;

// sheetId de la pestaña 'Lotes'
const meta = await sheets.spreadsheets.get({ spreadsheetId: SOT3 });
const loteSheet = meta.data.sheets.find((s) => s.properties.title === 'Lotes');
if (!loteSheet) {
  console.error('No encontré la pestaña Lotes');
  process.exit(1);
}
const loteSheetId = loteSheet.properties.sheetId;

const lotes =
  (
    await sheets.spreadsheets.values.get({
      spreadsheetId: SOT3,
      range: `'Lotes'!A:U`,
    })
  ).data.values || [];

// Re-localiza + valida que siga vacío
const rowsToDelete = [];
const backup = [];
for (const id of BORRAR) {
  const idx = lotes.findIndex((r) => c(r[0]) === id);
  if (idx < 0) {
    console.log(`  (aviso) ${id} ya no existe, se omite`);
    continue;
  }
  const r = lotes[idx];
  const costo = money(r[4]);
  const desc = c(r[12]) || c(r[14]);
  if (costo > 1 || desc) {
    console.error(
      `⛔ ${id} ya no está vacío (costo $${costo}, desc "${desc}"). Abortado por seguridad.`,
    );
    process.exit(1);
  }
  rowsToDelete.push({ id, row1: idx + 1 }); // 1-based
  backup.push({ id, row1: idx + 1, valores: r });
}

rowsToDelete.sort((a, b) => b.row1 - a.row1); // desc
console.log(`\n=== Borrar MED-* vacíos de 'Lotes' (SOT v3) ===`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}`);
console.log(`A borrar: ${rowsToDelete.length}`);
rowsToDelete
  .slice()
  .sort((a, b) => a.row1 - b.row1)
  .forEach((x) => console.log(`  fila ${x.row1}  ${x.id}`));

// Agrupa en rangos contiguos (0-based half-open) para deleteDimension
const del0 = rowsToDelete.map((x) => x.row1 - 1).sort((a, b) => b - a); // desc
const ranges = [];
for (const i of del0) {
  const last = ranges[ranges.length - 1];
  if (last && i + 1 === last.start)
    last.start = i; // contiguo hacia arriba
  else ranges.push({ start: i, end: i + 1 });
}
console.log(
  `Rangos deleteDimension (0-based): ${ranges.map((r) => `[${r.start},${r.end})`).join(' ')}`,
);

writeFileSync(
  'scripts/.backup-med-borrados.json',
  JSON.stringify({ fecha: '2026-07-24', loteSheetId, backup }, null, 2),
);
console.log('Backup: scripts/.backup-med-borrados.json');

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply para borrar.');
  process.exit(0);
}

// Borra de mayor a menor (los rangos ya vienen desc por start)
const requests = ranges
  .sort((a, b) => b.start - a.start)
  .map((r) => ({
    deleteDimension: {
      range: {
        sheetId: loteSheetId,
        dimension: 'ROWS',
        startIndex: r.start,
        endIndex: r.end,
      },
    },
  }));
await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { requests },
});
console.log(`\n✅ Filas borradas: ${rowsToDelete.length}`);

// Verificación
const after =
  (
    await sheets.spreadsheets.values.get({
      spreadsheetId: SOT3,
      range: `'Lotes'!A:A`,
    })
  ).data.values || [];
const still = BORRAR.filter((id) => after.some((r) => c(r[0]) === id));
console.log(
  still.length
    ? `⚠️ Aún presentes: ${still.join(', ')}`
    : `Verificado: ninguno de los 17 sigue en la hoja ✓`,
);
const medLeft = after
  .flat()
  .map(c)
  .filter((x) => /^MED-/.test(x));
console.log(`MED-* restantes: ${medLeft.length} → ${medLeft.join(', ')}`);
