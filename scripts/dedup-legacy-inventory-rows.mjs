/**
 * Remove duplicate physical rows from the LEGACY inventory sheet (1mghR6),
 * the one `/api/get-treasure-sheets` reads for the public catalog + QR page.
 *
 * WHY
 *   The legacy "Inventario" tab contains duplicate rows for some items — a
 *   stale ORPHAN (blank medidas / old name) plus a CORRECTED copy. The 15-min
 *   `products._pullFromSheet` cron reads both rows and the orphan (processed
 *   last / emptier) clobbers the Convex mirror, silently reverting Fotosíntesis
 *   edits (medidas, nombre, corte) on every pull. See item #441: rowIndex
 *   drifted 324 → 338 and "Vida"/"6.5 x 4.5 mm" reverted to "Registro de Vida".
 *
 * WHAT
 *   For every item number that appears in more than one physical data row, keep
 *   ONE row and delete the rest. Keep-priority: (1) has non-empty medidas, then
 *   (2) most non-empty cells overall, then (3) topmost row. That keeps the
 *   corrected row and drops the stale orphan(s).
 *
 * SAFETY
 *   - Dry-run by default: prints the exact deletion plan; changes nothing.
 *   - `--apply` executes. Before deleting it writes a full JSON backup of the
 *     tab to scripts/.backups/.
 *   - Deletes rows BOTTOM-UP (descending physical row) so indices never shift
 *     mid-batch.
 *   - Reads RAW physical rows (no API compaction), so row numbers are exact.
 *
 * REQUIRES  GOOGLE_SERVICE_ACCOUNT_KEY in .env.local (same creds the app uses
 *           to write the legacy sheet). The service account must have edit
 *           access to the spreadsheet.
 *
 *   node scripts/dedup-legacy-inventory-rows.mjs            # dry-run
 *   node scripts/dedup-legacy-inventory-rows.mjs --apply    # execute
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getSheetsClient } from '../api/_lib/google-clients.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SPREADSHEET_ID =
  process.env.SPREADSHEET_ID?.trim() ||
  '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const APPLY = process.argv.includes('--apply');

const norm = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const cell = (r, i) => String(r?.[i] ?? '').trim();

async function main() {
  const sheets = await getSheetsClient();

  // ── 1. Resolve the "Inventario" tab (numeric gid + title). ────────────────
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tab =
    (meta.data.sheets || []).find((s) =>
      norm(s.properties?.title).includes('inventario'),
    ) || meta.data.sheets?.[0];
  if (!tab) throw new Error('No sheets found in spreadsheet');
  const sheetId = tab.properties.sheetId;
  const title = tab.properties.title;
  console.log(`Sheet: "${title}" (gid ${sheetId}) in ${SPREADSHEET_ID}\n`);

  // ── 2. Read all raw rows in physical order (no compaction). ───────────────
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!A:Z`,
  });
  const rows = resp.data.values || [];
  if (rows.length === 0) {
    console.log('Empty tab — nothing to do.');
    return;
  }

  // ── 3. Locate the header row + key columns (by name, index fallback — the
  //       same resolution get-treasure-sheets uses: item=A/0, nombre=2,
  //       medidas=8). ──────────────────────────────────────────────────────
  let headerIdx = rows.findIndex((r) => norm(r[0]) === 'item');
  if (headerIdx < 0) headerIdx = 0;
  const header = (rows[headerIdx] || []).map(norm);
  const colOf = (name, fallback) => {
    const i = header.indexOf(norm(name));
    return i >= 0 ? i : fallback;
  };
  const ITEM_COL = colOf('item', 0);
  const NOMBRE_COL = colOf('nombre', 2);
  const MEDIDAS_COL = colOf('medidas', 8);

  // ── 4. Group physical data rows by item number. ───────────────────────────
  const nonEmpty = (r) => r.filter((c) => String(c ?? '').trim() !== '').length;
  const byItem = new Map(); // itemNum -> [{ physRow, score, nombre, medidas }]
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const itemNum = parseInt(cell(r, ITEM_COL), 10);
    if (!Number.isInteger(itemNum) || itemNum <= 0) continue; // skip blanks
    const entry = {
      physRow: i + 1, // 1-based physical sheet row
      score: nonEmpty(r),
      nombre: cell(r, NOMBRE_COL),
      medidas: cell(r, MEDIDAS_COL),
    };
    if (!byItem.has(itemNum)) byItem.set(itemNum, []);
    byItem.get(itemNum).push(entry);
  }

  // ── 5. Decide which rows to delete (keep richest per item). ───────────────
  const hasMed = (e) => (e.medidas !== '' ? 1 : 0);
  const toDelete = [];
  for (const [itemNum, list] of byItem) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(
      (a, b) =>
        hasMed(b) - hasMed(a) || b.score - a.score || a.physRow - b.physRow,
    );
    const keep = sorted[0];
    for (const e of sorted.slice(1)) {
      toDelete.push({ itemNum, del: e, keep });
    }
  }

  if (toDelete.length === 0) {
    console.log('✓ No duplicate item rows found. Nothing to delete.');
    return;
  }

  const items = new Set(toDelete.map((d) => d.itemNum));
  console.log(
    `Found ${toDelete.length} orphan row(s) across ${items.size} item(s):\n`,
  );
  for (const d of [...toDelete].sort((a, b) => a.itemNum - b.itemNum)) {
    console.log(
      `  item ${d.itemNum}: DELETE row ${d.del.physRow} ` +
        `[nombre="${d.del.nombre}" medidas="${d.del.medidas}"]  ` +
        `KEEP row ${d.keep.physRow} ` +
        `[nombre="${d.keep.nombre}" medidas="${d.keep.medidas}"]`,
    );
  }

  if (!APPLY) {
    console.log('\nDry-run — nothing changed. Re-run with --apply to delete.');
    console.log(
      `View: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
    );
    return;
  }

  // ── 6. Backup the whole tab before mutating. ──────────────────────────────
  const backupDir = path.join('scripts', '.backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(
    backupDir,
    `legacy-inventory-dedup-${stamp}.json`,
  );
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      { spreadsheetId: SPREADSHEET_ID, sheetId, title, rows, toDelete },
      null,
      2,
    ),
  );
  console.log(`\n✓ Backup written: ${backupFile}`);

  // ── 7. Delete rows BOTTOM-UP so indices don't shift mid-batch. ────────────
  const requests = [...new Set(toDelete.map((d) => d.del.physRow))]
    .sort((a, b) => b - a)
    .map((physRow) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: physRow - 1, // 0-based, inclusive
          endIndex: physRow, // exclusive
        },
      },
    }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });
  console.log(`✓ Deleted ${requests.length} orphan row(s).`);
  console.log(
    '\nNext: the 15-min pull now mirrors one clean row per item. Re-apply any\n' +
      'edits that had been reverted (medidas/nombre/corte on 441 etc.).',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
