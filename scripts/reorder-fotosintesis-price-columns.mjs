#!/usr/bin/env node
/**
 * One-time migration: reorder the LIVE Fotosíntesis SOT "Inventario" tab so the
 * price columns sit consecutively right after "Precio COP" (L):
 *
 *     … K Categoría | L Precio COP | M costoBaseCOP | N precioEmbajadorCOP |
 *       O precioConscienteCOP | P UBICACIÓN | …
 *
 * Before: costoBaseCOP was at W (22), precioEmbajadorCOP at AP (41),
 * precioConscienteCOP at AQ (42). This brings the live grid in line with the
 * new order in api/_lib/fotosintesis-inventory-columns.js.
 *
 * HOW — uses spreadsheets.batchUpdate `moveDimension`, NOT a values rewrite, so
 * each column's DATA, header cell, data-validation dropdowns and formatting all
 * travel with the column. Three sequential moves (each request sees the result
 * of the previous one in the same batch):
 *     1. move col 22 (costoBaseCOP)        → index 12
 *     2. move col 41 (precioEmbajadorCOP)  → index 13
 *     3. move col 42 (precioConscienteCOP) → index 14
 *
 * SAFETY:
 *   • Dry-run by DEFAULT. Pass --apply to write.
 *   • Guards on the live header row: only proceeds if it matches the exact
 *     pre-migration order. If it already matches the new order it's a no-op;
 *     anything else aborts with a diff (never blindly reorders).
 *   • Backs up the whole tab (values) to scripts/.backups/ before writing.
 *   • Cross-checks the move math against the live FOTO_INVENTARIO_HEADERS so a
 *     drift between this script and the columns file aborts before any write.
 *   • Re-reads the header after applying and verifies it equals the new order.
 *
 * Usage:
 *   node scripts/reorder-fotosintesis-price-columns.mjs            # preview
 *   node scripts/reorder-fotosintesis-price-columns.mjs --apply    # migrate
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

// Exact header row the live sheet must have BEFORE this migration runs.
// (Matches the pre-reorder FOTO_INVENTARIO_COLUMNS order.)
const OLD_HEADERS = [
  "Item",
  "FECHA INGRESO INVENTARIO",
  "Nombre",
  "Peso (ct)",
  "Color",
  "Calidad",
  "Cant.",
  "Talla",
  "Medidas",
  "Medidas (valores)",
  "Categoría",
  "Precio COP", // L (11)
  "UBICACIÓN",
  "ASESOR",
  "ESTADO",
  "QR",
  "Colección",
  "CAJA",
  "preponderancia",
  "ASESOR ACTUAL",
  "ESTADO ASESOR",
  "loteId",
  "costoBaseCOP", // W (22)  → moves to M (12)
  "mostrarEnCatalogo",
  "procedencia",
  "observacion",
  "rendimientoEsperado",
  "cantidadEstimada",
  "nivelRareza",
  "calificacion",
  "tipoEsmeralda",
  "subtipoForm",
  "tipoJoya",
  "tecnicaJoya",
  "minerales",
  "complementos",
  "fotoUrl",
  "certificadoUrl",
  "formulaGema",
  "formulaJoya",
  "rangoDescuento",
  "precioEmbajadorCOP", // AP (41) → moves to N (13)
  "precioConscienteCOP", // AQ (42) → moves to O (14)
];

// Sequential moveDimension requests (COLUMNS). Each destinationIndex is in the
// coordinate frame produced by the previous move in this list.
const MOVES = [
  { start: 22, end: 23, dest: 12, label: "costoBaseCOP → M" },
  { start: 41, end: 42, dest: 13, label: "precioEmbajadorCOP → N" },
  { start: 42, end: 43, dest: 14, label: "precioConscienteCOP → O" },
];

/** Mirror Sheets `moveDimension` on a JS array (destination in pre-move frame). */
function applyMove(arr, start, end, dest) {
  const block = arr.slice(start, end);
  const rest = [...arr.slice(0, start), ...arr.slice(end)];
  const insertAt = dest <= start ? dest : dest - (end - start);
  return [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
}

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
  // ── 0. Cross-check the move math against the edited columns file ──────────
  const derived = MOVES.reduce(
    (acc, m) => applyMove(acc, m.start, m.end, m.dest),
    OLD_HEADERS,
  );
  if (!eq(derived, FOTO_INVENTARIO_HEADERS)) {
    console.error(
      "✗ Move math does not reproduce FOTO_INVENTARIO_HEADERS.\n" +
        "  This script and api/_lib/fotosintesis-inventory-columns.js have drifted.\n" +
        diff(derived, FOTO_INVENTARIO_HEADERS),
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
    console.log("✓ Live header already matches the new order — nothing to do.");
    return;
  }

  // The live header must be the pre-migration order. We tolerate ONE known,
  // benign cosmetic drift: column B is mislabeled "Item" in the live sheet (its
  // data is fechaIngreso — empty for current rows). Every other column —
  // including the four price-relevant positions — must match exactly so the
  // positional moveDimension lands data correctly. The full header row is
  // rewritten to the canonical order after the move, which also fixes B.
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
      "✗ Live header diverges from the expected pre-migration order beyond the\n" +
        "  one tolerated cosmetic drift (column B). Aborting to avoid corrupting\n" +
        "  an unexpected layout. Blocking mismatches:\n" +
        blocking.join("\n"),
    );
    process.exit(1);
  }
  // Hard-assert the move-critical anchors by header name (belt and suspenders).
  const ANCHORS = [
    [11, "Precio COP"],
    [22, "costoBaseCOP"],
    [41, "precioEmbajadorCOP"],
    [42, "precioConscienteCOP"],
  ];
  for (const [idx, name] of ANCHORS) {
    if (liveHeaders[idx] !== name) {
      console.error(
        `✗ Expected "${name}" at ${columnIndexToLetter(idx)} but found "${liveHeaders[idx] ?? ""}". Aborting.`,
      );
      process.exit(1);
    }
  }
  for (const i of TOLERATED_LABEL_DRIFT) {
    if (liveHeaders[i] !== OLD_HEADERS[i]) {
      console.log(
        `ℹ Tolerated header drift at ${columnIndexToLetter(i)}: live="${liveHeaders[i] ?? ""}" → will be rewritten to "${FOTO_INVENTARIO_HEADERS[i]}".`,
      );
    }
  }
  console.log(
    "✓ Live layout is the pre-migration order (data columns aligned).\n",
  );

  console.log("Planned moves (applied as one ordered batch):");
  for (const m of MOVES) {
    console.log(
      `   ${columnIndexToLetter(m.start)} (${m.label})  →  ${columnIndexToLetter(m.dest)}`,
    );
  }
  console.log(
    `\nResulting price block: L Precio COP | M costoBaseCOP | N precioEmbajadorCOP | O precioConscienteCOP\n`,
  );

  // ── 3. Backup the whole tab (values) before touching anything ─────────────
  const lastCol = FOTO_INVENTARIO_LAST_COL;
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!A:${lastCol}`,
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
  const backupFile = path.join(backupDir, `inventario-reorder-${stamp}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      { spreadsheetId: SPREADSHEET_ID, sheetId, title, lastCol, values },
      null,
      2,
    ),
  );
  console.log(`✓ Backup written: ${backupFile}`);

  // ── 4. Apply the reorder ──────────────────────────────────────────────────
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: MOVES.map((m) => ({
        moveDimension: {
          source: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: m.start,
            endIndex: m.end,
          },
          destinationIndex: m.dest,
        },
      })),
    },
  });
  console.log("✓ moveDimension batch applied.");

  // ── 4b. Rewrite the header row to the canonical order. moveDimension already
  // carried each moved column's header cell, but this also fixes the column B
  // mislabel and guarantees every label matches the columns file. Row 1 only —
  // data rows are never touched here.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!A1:${lastCol}1`,
    valueInputOption: "RAW",
    requestBody: { values: [FOTO_INVENTARIO_HEADERS] },
  });
  console.log(
    "✓ Header row rewritten to the canonical order (B mislabel fixed).",
  );

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
