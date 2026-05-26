#!/usr/bin/env node
/**
 * Migrate the LIVE Fotosíntesis SOT spreadsheet so its `Lotes` and
 * `Inventario` tabs carry every field the data-entry forms now capture.
 *
 * Why this exists: the forms (EditLotDrawer, Gema/Bruto/Joya fields, the
 * x1–x4 price multiplier, item photos) and the Convex mirror grew new
 * fields, but the push-only Sheets mirror was still on the original
 * Lotes!A:N / Inventario!A:U layout, silently dropping them. This brings
 * the live headers up to date.
 *
 * SAFETY — append-only, header-only:
 *   • Only row 1 (the header row) is written; data rows are never touched.
 *   • The grid is only ever WIDENED (columnCount can grow, never shrink),
 *     so no column or its data is deleted.
 *   • Re-running is a no-op beyond re-asserting the header labels.
 *
 * Column order is the single source of truth in
 * api/_lib/fotosintesis-inventory-columns.js (Inventario) and the
 * LOTES_HEADERS constant below (must match COLUMN_MAPS.lots /
 * TABLE_CONFIGS.lots).
 *
 * Usage:
 *   node scripts/extend-fotosintesis-headers.mjs            # apply
 *   node scripts/extend-fotosintesis-headers.mjs --dry-run  # preview only
 *
 * Auth: GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN (loaded from .env),
 * reusing the same client the live sync uses (api/_lib/google-clients.js).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { getSheetsClient } from "../api/_lib/google-clients.js";
import {
  FOTO_INVENTARIO_HEADERS,
  columnIndexToLetter,
} from "../api/_lib/fotosintesis-inventory-columns.js";

const SPREADSHEET_ID =
  process.env.FOTOSINTESIS_SPREADSHEET_ID?.trim() ||
  "18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM";

const DRY_RUN = process.argv.includes("--dry-run");

// Must stay aligned with convex/_lib/columnMaps.ts#lots and
// api/_lib/admin-table-config.ts#lots.columns.
const LOTES_HEADERS = [
  "loteId",
  "providerNombre",
  "fechaRecepcion",
  "pesoTotalQuilates",
  "costoTotalCOP",
  "unidadesDeclaradas",
  "formaPago",
  "metodoContado",
  "fechaVencimiento",
  "numeroCuotas",
  "numeroFactura",
  "urlFactura",
  "notas",
  "estado",
  "renombreLote",
  "tratamiento",
  "mina",
  "sede",
  "operadorNombre",
  "operadorRol",
];

const TARGETS = [
  { patterns: ["inventario", "inventory"], headers: FOTO_INVENTARIO_HEADERS },
  { patterns: ["lotes", "lots"], headers: LOTES_HEADERS },
];

async function main() {
  const sheets = getSheetsClient();
  console.log(`Spreadsheet: ${SPREADSHEET_ID}`);
  if (DRY_RUN) console.log("DRY-RUN — no writes will be made.\n");

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tabs = meta.data.sheets ?? [];

  for (const target of TARGETS) {
    const tab = tabs.find((s) =>
      target.patterns.some((p) => s.properties.title.toLowerCase().includes(p)),
    );
    if (!tab) {
      console.warn(
        `⚠ No tab matching [${target.patterns.join(", ")}] — skipping.`,
      );
      continue;
    }

    const title = tab.properties.title;
    const sheetId = tab.properties.sheetId;
    const currentCols = tab.properties.gridProperties?.columnCount ?? 26;
    const neededCols = target.headers.length;
    const lastCol = columnIndexToLetter(neededCols - 1);

    // Read the existing header row to report what changes.
    const before = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${title}'!1:1`,
    });
    const beforeHeaders = before.data.values?.[0] ?? [];

    console.log(`\n── ${title} ──`);
    console.log(
      `   grid columns: ${currentCols} → ${Math.max(currentCols, neededCols)}`,
    );
    target.headers.forEach((h, i) => {
      const old = beforeHeaders[i];
      if (old === undefined || old === "") {
        console.log(`   + ${columnIndexToLetter(i)}: "${h}" (new)`);
      } else if (old !== h) {
        console.log(`   ~ ${columnIndexToLetter(i)}: "${old}" → "${h}"`);
      }
    });

    if (DRY_RUN) continue;

    // 1. Widen the grid if needed (never shrink — guarded by Math.max).
    if (neededCols > currentCols) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId,
                  gridProperties: { columnCount: neededCols },
                },
                fields: "gridProperties.columnCount",
              },
            },
          ],
        },
      });
    }

    // 2. Write the full header row (row 1 only — data rows untouched).
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${title}'!A1:${lastCol}1`,
      valueInputOption: "RAW",
      requestBody: { values: [target.headers] },
    });

    // 3. Restyle the header row (bold, emerald, frozen) across the full width.
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0, green: 0.55, blue: 0.38 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                  },
                  horizontalAlignment: "CENTER",
                  verticalAlignment: "MIDDLE",
                  wrapStrategy: "WRAP",
                },
              },
              fields:
                "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ],
      },
    });

    console.log(`   ✅ ${title} headers updated (A1:${lastCol}1).`);
  }

  console.log(
    `\n${DRY_RUN ? "Dry-run complete." : "Done."} View: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
  );
}

main().catch((err) => {
  console.error("Error:", err?.message ?? err);
  process.exit(1);
});
