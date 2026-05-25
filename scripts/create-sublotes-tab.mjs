#!/usr/bin/env node
/**
 * Create the "Sublotes" tab in the Fotosíntesis SOT spreadsheet.
 *
 * The Fotosíntesis sub-lote feature pushes rows to a `subLotes` tab via
 * /api/admin-table-update (matched by patterns ["sublotes","sub-lotes",...]).
 * That tab doesn't exist yet, so this one-off script creates it with the
 * canonical header row (cols A–J), reusing the SAME OAuth2 client the sync
 * uses (api/_lib/google-clients.js) so write access is guaranteed.
 *
 * Idempotent: if the tab already exists it just (re)writes the header row.
 *
 * Usage:
 *   node scripts/create-sublotes-tab.mjs
 *
 * Auth: GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN (loaded from .env).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { getSheetsClient } from "../api/_lib/google-clients.js";

const SPREADSHEET_ID =
  process.env.FOTOSINTESIS_SPREADSHEET_ID?.trim() ||
  "18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM";

const TAB = "Sublotes";
// MUST match the positional order of COLUMN_MAPS.subLotes (convex) /
// TABLE_CONFIGS.subLotes.columns (api). Column E carries the comma-joined
// itemIds (pushed as `itemIdsJoined`); the header label is just human-facing.
const HEADERS = [
  "subLoteId",
  "parentLoteId",
  "sede",
  "nombre",
  "itemIds",
  "unidades",
  "totalCostoCOP",
  "estado",
  "notas",
  "createdAt",
];

// Mirror of findSheetByPattern: case-insensitive partial match.
const PATTERNS = ["sublotes", "sub-lotes"];

async function main() {
  const sheets = getSheetsClient();

  console.log(`Spreadsheet: ${SPREADSHEET_ID}`);
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const titles = meta.data.sheets.map((s) => s.properties.title);
  console.log(`Existing tabs: ${titles.join(", ")}`);

  const existing = titles.find((t) =>
    PATTERNS.some((p) => t.toLowerCase().includes(p)),
  );

  if (existing) {
    console.log(
      `Tab "${existing}" already exists — refreshing header row only.`,
    );
  } else {
    console.log(`Creating tab "${TAB}"…`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: TAB,
                gridProperties: { rowCount: 1000, columnCount: HEADERS.length },
              },
            },
          },
        ],
      },
    });
  }

  const targetTitle = existing ?? TAB;

  // Write the header row (A1:J1). Only row 1 is touched, so existing data
  // (if any) below the header is preserved.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${targetTitle}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });
  console.log(`Header row written: ${HEADERS.join(" | ")}`);

  // Style the header (bold, emerald bg, frozen) — cosmetic, best-effort.
  const refreshed = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheetId = refreshed.data.sheets.find(
    (s) => s.properties.title === targetTitle,
  )?.properties.sheetId;

  if (sheetId !== undefined) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.4, blue: 0.25 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                  },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: { frozenRowCount: 1 },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ],
      },
    });
    console.log("Header styled + frozen.");
  }

  console.log(
    `\n✅ "${targetTitle}" ready.\nView: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
  );
}

main().catch((err) => {
  console.error("Error:", err?.message ?? err);
  process.exit(1);
});
