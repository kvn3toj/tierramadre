#!/usr/bin/env node
/**
 * One-time migration: DELETE the obsolete "Precio COP" column (L, index 11)
 * from the LIVE Fotosíntesis SOT "Inventario" tab.
 *
 *     Before: … K Categoría | L Precio COP | M costoBaseCOP | N precioEmbajadorCOP | O precioConscienteCOP | …
 *     After:  … K Categoría | L costoBaseCOP | M precioEmbajadorCOP | N precioConscienteCOP | …
 *
 * The legacy "Precio COP" column was ~82% empty and is no longer mirrored: the
 * public price is the ambassador tier (precioEmbajadorCOP), and the Convex
 * `productInventory.precioCOP` field is kept app-only (written by the capture
 * UI, read by the patrones analytics) but is NO LONGER synced to/from this
 * sheet. This brings the live grid in line with the new layout in
 * api/_lib/fotosintesis-inventory-columns.js (precioCOP entry removed).
 *
 * HOW — uses spreadsheets.batchUpdate `deleteDimension` (COLUMNS, 11→12), NOT a
 * values rewrite, so Sheets shifts every column M..AQ left by one and carries
 * their data, header cells, data-validation dropdowns and formatting with them.
 *
 * SAFETY:
 *   • Dry-run by DEFAULT. Pass --apply to write.
 *   • Guards on the live header row: only proceeds if it is the expected
 *     PRE-deletion order (= the new FOTO_INVENTARIO_HEADERS with "Precio COP"
 *     re-inserted at index 11). If it already matches the new (post-deletion)
 *     order it's a no-op; anything else aborts with a diff (never blind-deletes).
 *   • Hard-asserts liveHeaders[11] === "Precio COP" before deleting index 11.
 *   • Backs up the whole tab (values) to scripts/.backups/ before writing.
 *   • Re-reads the header after applying and verifies it equals the new order.
 *
 * ⚠ DEPLOY ORDER: the SOT readers/writers map columns positionally from
 * FOTO_INVENTARIO_COLUMNS. Run this ONLY AFTER the code change (precioCOP
 * removed from that file) is deployed to production, and in a quiet window with
 * no concurrent admin edits / sheet-sync button clicks — otherwise a push/pull
 * during the gap would land one column off. (Same deploy-window caveat as the
 * 2026-05-27 price-column reorder.)
 *
 * Usage:
 *   node scripts/delete-fotosintesis-column-l.mjs            # preview
 *   node scripts/delete-fotosintesis-column-l.mjs --apply    # migrate
 *
 * Auth: GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN (loaded from .env),
 * reusing the same client the live sync uses (api/_lib/google-clients.js).
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { getSheetsClient } from "../api/_lib/google-clients.js";
import {
  FOTO_INVENTARIO_HEADERS,
  FOTO_INVENTARIO_LAST_COL,
  columnIndexToLetter,
} from "../api/_lib/fotosintesis-inventory-columns.js";

const SPREADSHEET_ID =
  process.env.FOTOSINTESIS_SPREADSHEET_ID?.trim() ||
  "18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM";

const APPLY = process.argv.includes("--apply");

// The column being deleted (0-based index, header label).
const DELETE_INDEX = 11; // column L
const DELETE_HEADER = "Precio COP";

// Expected PRE-deletion header = the new (post-edit) header with "Precio COP"
// re-inserted at index 11. The live sheet must look exactly like this (modulo
// the one tolerated cosmetic B drift) before we delete.
const OLD_HEADERS = [
  ...FOTO_INVENTARIO_HEADERS.slice(0, DELETE_INDEX),
  DELETE_HEADER,
  ...FOTO_INVENTARIO_HEADERS.slice(DELETE_INDEX),
];

function eq(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function diff(actual, expected) {
  const lines = [];
  const n = Math.max(actual.length, expected.length);
  for (let i = 0; i < n; i++) {
    if (actual[i] !== expected[i]) {
      lines.push(
        `   ${columnIndexToLetter(i)}: live="${actual[i] ?? ""}" expected="${expected[i] ?? ""}"`,
      );
    }
  }
  return lines.join("\n");
}

async function main() {
  // ── 0. Sanity: the new headers must NOT already contain "Precio COP" ──────
  if (FOTO_INVENTARIO_HEADERS.includes(DELETE_HEADER)) {
    console.error(
      `✗ FOTO_INVENTARIO_HEADERS still contains "${DELETE_HEADER}".\n` +
        "  Remove the precioCOP entry from api/_lib/fotosintesis-inventory-columns.js\n" +
        "  before running this migration (this script deletes the LIVE column to\n" +
        "  match the edited columns file).",
    );
    process.exit(1);
  }

  const sheets = getSheetsClient();
  console.log(`Spreadsheet: ${SPREADSHEET_ID}`);
  console.log(
    APPLY
      ? "MODE: --apply (will write)\n"
      : "MODE: dry-run (no writes — pass --apply to migrate)\n",
  );

  // ── 1. Locate the Inventario tab ──────────────────────────────────────────
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tab = (meta.data.sheets ?? []).find((s) =>
    ["inventario", "inventory"].some((p) =>
      s.properties.title.toLowerCase().includes(p),
    ),
  );
  if (!tab) {
    console.error("✗ No 'Inventario' tab found.");
    process.exit(1);
  }
  const title = tab.properties.title;
  const sheetId = tab.properties.sheetId;
  console.log(`Tab: "${title}" (sheetId ${sheetId})`);

  // ── 2. Read + guard the live header row ───────────────────────────────────
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!1:1`,
  });
  const liveHeaders = (headerRes.data.values?.[0] ?? []).map((h) => String(h));

  if (eq(liveHeaders, FOTO_INVENTARIO_HEADERS)) {
    console.log(
      "✓ Live header already matches the new (post-deletion) order — nothing to do.",
    );
    return;
  }

  // The live header must be the pre-deletion order. We tolerate ONE known,
  // benign cosmetic drift: column B was historically mislabeled "Item" in the
  // live sheet (its data is fechaIngreso). The header is rewritten to canonical
  // after the delete, which also fixes B.
  const TOLERATED_LABEL_DRIFT = new Set([1]); // index 1 = column B
  const blocking = [];
  for (let i = 0; i < Math.max(liveHeaders.length, OLD_HEADERS.length); i++) {
    if (liveHeaders[i] !== OLD_HEADERS[i] && !TOLERATED_LABEL_DRIFT.has(i)) {
      blocking.push(
        `   ${columnIndexToLetter(i)}: live="${liveHeaders[i] ?? ""}" expected="${OLD_HEADERS[i] ?? ""}"`,
      );
    }
  }
  if (blocking.length > 0) {
    console.error(
      "✗ Live header diverges from the expected pre-deletion order beyond the\n" +
        "  one tolerated cosmetic drift (column B). Aborting to avoid corrupting\n" +
        "  an unexpected layout. Blocking mismatches:\n" +
        blocking.join("\n"),
    );
    process.exit(1);
  }
  // Hard-assert the delete anchor by header name (belt and suspenders).
  if (liveHeaders[DELETE_INDEX] !== DELETE_HEADER) {
    console.error(
      `✗ Expected "${DELETE_HEADER}" at ${columnIndexToLetter(DELETE_INDEX)} but found ` +
        `"${liveHeaders[DELETE_INDEX] ?? ""}". Aborting (refusing to delete the wrong column).`,
    );
    process.exit(1);
  }
  for (const i of TOLERATED_LABEL_DRIFT) {
    if (liveHeaders[i] !== OLD_HEADERS[i]) {
      console.log(
        `ℹ Tolerated header drift at ${columnIndexToLetter(i)}: live="${liveHeaders[i] ?? ""}" → will be rewritten to "${FOTO_INVENTARIO_HEADERS[i]}".`,
      );
    }
  }
  console.log(
    "✓ Live layout is the pre-deletion order (delete anchor confirmed at L).\n",
  );

  console.log(
    `Planned delete: column ${columnIndexToLetter(DELETE_INDEX)} ("${DELETE_HEADER}") — shifts M..AQ left by one.`,
  );
  console.log(
    `Resulting price block: L costoBaseCOP | M precioEmbajadorCOP | N precioConscienteCOP\n`,
  );

  // ── 3. Backup the whole tab (values) before touching anything ─────────────
  // Read at the PRE-deletion width (new lastCol + 1 = the old rightmost column).
  const oldLastCol = columnIndexToLetter(FOTO_INVENTARIO_HEADERS.length); // 42 cols → "AQ"
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!A:${oldLastCol}`,
  });
  const values = dataRes.data.values ?? [];
  const rowCount = Math.max(0, values.length - 1);
  console.log(`Data rows in tab: ${rowCount}`);

  if (!APPLY) {
    console.log("\nDry-run complete. Re-run with --apply to migrate.");
    console.log(
      `View: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
    );
    return;
  }

  const backupDir = path.join("scripts", ".backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(
    backupDir,
    `inventario-delete-col-l-${stamp}.json`,
  );
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      { spreadsheetId: SPREADSHEET_ID, sheetId, title, oldLastCol, values },
      null,
      2,
    ),
  );
  console.log(`✓ Backup written: ${backupFile}`);

  // ── 4. Apply the deletion ─────────────────────────────────────────────────
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: DELETE_INDEX,
              endIndex: DELETE_INDEX + 1,
            },
          },
        },
      ],
    },
  });
  console.log(
    `✓ deleteDimension applied (column ${columnIndexToLetter(DELETE_INDEX)} removed).`,
  );

  // ── 4b. Rewrite the header row to the canonical order. deleteDimension
  // already shifted the surviving header cells, but this guarantees every label
  // matches the columns file (and fixes any tolerated B drift). Row 1 only.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!A1:${FOTO_INVENTARIO_LAST_COL}1`,
    valueInputOption: "RAW",
    requestBody: { values: [FOTO_INVENTARIO_HEADERS] },
  });
  console.log("✓ Header row rewritten to the canonical order.");

  // ── 5. Verify the live header now equals the new order ────────────────────
  const afterRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!1:1`,
  });
  const afterHeaders = (afterRes.data.values?.[0] ?? []).map((h) => String(h));
  if (!eq(afterHeaders, FOTO_INVENTARIO_HEADERS)) {
    console.error(
      "✗ Post-migration header does NOT match the new order. Restore from\n" +
        `  ${backupFile} if needed. Mismatches:\n` +
        diff(afterHeaders, FOTO_INVENTARIO_HEADERS),
    );
    process.exit(1);
  }
  console.log("✓ Verified: live header now matches the new column order.");
  console.log(
    `\nDone. View: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
  );
}

main().catch((err) => {
  console.error("Error:", err?.message ?? err);
  process.exit(1);
});
