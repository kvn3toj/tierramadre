/**
 * Idempotently create the "Movimientos Asesor" tab on the Fotosíntesis SOT
 * spreadsheet — the kardex of asesor handoffs/returns backing
 * `convex/asesorMovements.ts`.
 *
 * Safe to re-run: `ensureSheet` (api/_lib/sheets-helpers.js) no-ops if the
 * tab already exists. Never touches any other tab or existing data.
 *
 * Run: node scripts/create-fotosintesis-movimientos-tab.mjs
 */

import dotenv from "dotenv";
import { getSheetsClient } from "../api/_lib/google-clients.js";
import { ensureSheet, getSheetNames } from "../api/_lib/sheets-helpers.js";
import { FOTOSINTESIS_SPREADSHEET_ID } from "../api/_lib/constants.js";

// Prefer .env.local (developer machine) over .env.production.local (Vercel)
dotenv.config({ path: ".env.local" });
if (!process.env.GOOGLE_OAUTH_REFRESH_TOKEN)
  dotenv.config({ path: ".env.production.local" });
if (!process.env.GOOGLE_OAUTH_REFRESH_TOKEN) dotenv.config();

const TAB_NAME = "Movimientos Asesor";

// Must match COLUMN_MAPS.movimientosAsesor (convex/_lib/columnMaps.ts) and
// TABLE_CONFIGS.movimientosAsesor (api/_lib/admin-table-config.ts).
const HEADERS = [
  "movimientoId",
  "fecha",
  "tipo",
  "itemId",
  "itemNombre",
  "asesorNombre",
  "cantidad",
  "estadoAnterior",
  "estadoNuevo",
  "registradoPor",
  "notas",
];

async function main() {
  const sheets = getSheetsClient();

  const before = await getSheetNames(sheets, FOTOSINTESIS_SPREADSHEET_ID);
  if (before.includes(TAB_NAME)) {
    console.log(`✅ "${TAB_NAME}" ya existe — nada que hacer.`);
    return;
  }

  console.log(`📝 Creando pestaña "${TAB_NAME}" en la SOT Fotosíntesis...`);
  const created = await ensureSheet(
    sheets,
    TAB_NAME,
    HEADERS,
    FOTOSINTESIS_SPREADSHEET_ID,
  );
  if (!created) {
    console.log(`ℹ️  "${TAB_NAME}" ya existía (carrera con otro proceso).`);
    return;
  }

  // Header formatting to match the other SOT tabs (bold white on emerald).
  const after = await sheets.spreadsheets.get({
    spreadsheetId: FOTOSINTESIS_SPREADSHEET_ID,
  });
  const sheetMeta = after.data.sheets.find(
    (s) => s.properties.title === TAB_NAME,
  );
  const sheetId = sheetMeta?.properties?.sheetId;
  if (sheetId !== undefined) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: FOTOSINTESIS_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                  },
                  backgroundColor: { red: 0, green: 0.55, blue: 0.38 },
                  horizontalAlignment: "CENTER",
                  verticalAlignment: "MIDDLE",
                  wrapStrategy: "WRAP",
                },
              },
              fields:
                "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy)",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: HEADERS.length,
              },
            },
          },
        ],
      },
    });
  }

  console.log(`✅ "${TAB_NAME}" creada con ${HEADERS.length} columnas (A–${String.fromCharCode(64 + HEADERS.length)}).`);
}

main().catch((e) => {
  console.error("❌", e.message);
  if (e.response?.data) console.error(JSON.stringify(e.response.data, null, 2));
  process.exit(1);
});
