/**
 * Borra el lote C-001 (error, estado "cancelado", 0 ítems) de la pestaña Lotes
 * de SOT v3. Re-localiza por id, verifica que siga vacío, respalda y borra la fila.
 *
 * Uso:  node scripts/borrar-lote-c001.mjs           # dry-run
 *       node scripts/borrar-lote-c001.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const ID = 'C-001';

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

const meta = await sheets.spreadsheets.get({ spreadsheetId: SOT3 });
const loteSheetId = meta.data.sheets.find((s) => s.properties.title === 'Lotes')
  .properties.sheetId;

const inv =
  (
    await sheets.spreadsheets.values.get({
      spreadsheetId: SOT3,
      range: `'Inventario'!A:AZ`,
    })
  ).data.values || [];
const H = inv[0].map(c);
const LOTE = H.findIndex((h) => h.toLowerCase().includes('loteid'));
const itemCount = inv.slice(1).filter((r) => c(r[LOTE]) === ID).length;

const lotes =
  (
    await sheets.spreadsheets.values.get({
      spreadsheetId: SOT3,
      range: `'Lotes'!A:U`,
    })
  ).data.values || [];
const idx = lotes.findIndex((r) => c(r[0]) === ID);
if (idx < 0) {
  console.log(`${ID} no existe en Lotes — nada que borrar.`);
  process.exit(0);
}
const row = lotes[idx];
const estado = c(row[13]);

console.log(`\n=== Borrar lote ${ID} de 'Lotes' (SOT v3) ===`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}`);
console.log(
  `Fila ${idx + 1} · estado "${estado}" · ítems en Inventario: ${itemCount}`,
);

if (itemCount > 0) {
  console.error(
    `⛔ ${ID} tiene ${itemCount} ítems asignados. Abortado (se orfanarían).`,
  );
  process.exit(1);
}

writeFileSync(
  'scripts/.backup-borrar-c001.json',
  JSON.stringify(
    { fecha: '2026-07-24', loteSheetId, fila: idx + 1, valores: row },
    null,
    2,
  ),
);
console.log('Backup: scripts/.backup-borrar-c001.json');

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply para borrar.');
  process.exit(0);
}

await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: loteSheetId,
            dimension: 'ROWS',
            startIndex: idx,
            endIndex: idx + 1,
          },
        },
      },
    ],
  },
});
console.log(`\n✅ Fila borrada.`);
const after =
  (
    await sheets.spreadsheets.values.get({
      spreadsheetId: SOT3,
      range: `'Lotes'!A:A`,
    })
  ).data.values || [];
console.log(
  after.some((r) => c(r[0]) === ID)
    ? `⚠️ ${ID} aún presente`
    : `Verificado: ${ID} ya no está ✓`,
);
