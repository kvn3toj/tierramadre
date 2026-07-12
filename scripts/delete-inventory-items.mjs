/**
 * Delete specific inventory items COMPLETELY — from the legacy sheet AND the
 * Convex mirror — in the correct order so they don't re-sync back.
 *
 * WHY: an item lives in two places — the legacy "Inventario" sheet (which the
 * public app reads) and the Convex mirror. Deleting only one side fails:
 *   - Convex only  → the 15-min pull re-creates it from the sheet;
 *   - sheet only   → the Convex mirror row lingers (pull never deletes).
 * So this deletes the SHEET row(s) first, then the Convex row via the
 * `adminOps:deleteProductByItemId` mutation (must be deployed).
 *
 * DEFAULT TARGET: 441 (dup of 311). Override with args:
 *   node scripts/delete-inventory-items.mjs 441 512 ...
 *
 * SAFETY: dry-run by default (prints the plan). Pass --apply to execute.
 * Backs up the tab to scripts/.backups before deleting; deletes rows bottom-up.
 *
 * REQUIRES GOOGLE_SERVICE_ACCOUNT_KEY in .env.local (edit access to the sheet)
 * and an authenticated `npx convex` CLI for the Convex-side delete.
 *
 *   node scripts/delete-inventory-items.mjs            # dry-run, target 441
 *   node scripts/delete-inventory-items.mjs --apply    # execute
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import { getSheetsClient } from '../api/_lib/google-clients.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SPREADSHEET_ID =
  process.env.SPREADSHEET_ID?.trim() ||
  '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const APPLY = process.argv.includes('--apply');
const TARGETS = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
const ITEM_IDS = TARGETS.length ? TARGETS : ['441'];

const norm = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const cell = (r, i) => String(r?.[i] ?? '').trim();

async function main() {
  console.log(`Target itemIds: ${ITEM_IDS.join(', ')}\n`);
  const sheets = await getSheetsClient();

  // 1. Resolve the "Inventario" tab (gid + title).
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tab =
    (meta.data.sheets || []).find((s) =>
      norm(s.properties?.title).includes('inventario'),
    ) || meta.data.sheets?.[0];
  if (!tab) throw new Error('No sheets found');
  const sheetId = tab.properties.sheetId;
  const title = tab.properties.title;

  // 2. Read raw rows (physical order) + locate item column.
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!A:Z`,
  });
  const rows = resp.data.values || [];
  let headerIdx = rows.findIndex((r) => norm(r[0]) === 'item');
  if (headerIdx < 0) headerIdx = 0;
  const header = (rows[headerIdx] || []).map(norm);
  const ITEM_COL = header.indexOf('item') >= 0 ? header.indexOf('item') : 0;
  const NOMBRE_COL =
    header.indexOf('nombre') >= 0 ? header.indexOf('nombre') : 2;

  // 3. Collect physical rows matching the targets.
  const wanted = new Set(ITEM_IDS);
  const hits = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const id = cell(rows[i], ITEM_COL);
    if (wanted.has(id)) {
      hits.push({
        physRow: i + 1,
        itemId: id,
        nombre: cell(rows[i], NOMBRE_COL),
      });
    }
  }

  if (hits.length === 0) {
    console.log('No matching sheet rows found.');
  } else {
    console.log(`Sheet rows to delete (${hits.length}):`);
    for (const h of hits)
      console.log(`  row ${h.physRow} | item ${h.itemId} | "${h.nombre}"`);
  }

  if (!APPLY) {
    console.log('\nDry-run — nothing changed. Re-run with --apply.');
    return;
  }

  // 4. Backup, then delete sheet rows bottom-up.
  if (hits.length) {
    const backupDir = path.join('scripts', '.backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      path.join(backupDir, `delete-items-${stamp}.json`),
      JSON.stringify({ SPREADSHEET_ID, sheetId, title, rows, hits }, null, 2),
    );
    const requests = hits
      .map((h) => h.physRow)
      .sort((a, b) => b - a)
      .map((physRow) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: physRow - 1,
            endIndex: physRow,
          },
        },
      }));
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    });
    console.log(`\n✓ Deleted ${requests.length} sheet row(s).`);
  }

  // 5. Now delete the Convex mirror rows (won't re-sync — sheet row is gone).
  for (const itemId of ITEM_IDS) {
    try {
      const out = execFileSync(
        'npx',
        [
          'convex',
          'run',
          '--prod',
          'adminOps:deleteProductByItemId',
          JSON.stringify({ itemId }),
        ],
        { encoding: 'utf8' },
      );
      console.log(
        `  Convex delete ${itemId}: ${out.trim().replace(/\s+/g, ' ')}`,
      );
    } catch (e) {
      console.error(`  Convex delete ${itemId} FAILED: ${e.message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
