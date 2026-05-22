/**
 * Dump all data-validation rules (dropdowns, OneOfList ranges) from
 * every tab of the Fotosíntesis SOT. Used to cross-check that every
 * dropdown option in the sheet is also represented in the React UI.
 *
 * Usage: node scripts/dump-sheet-validations.mjs [SPREADSHEET_ID]
 */
import { GoogleAuth } from "google-auth-library";
import { sheets_v4 } from "@googleapis/sheets";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.production.local")) {
  const prodEnv = dotenv.parse(
    fs.readFileSync(".env.production.local", "utf8"),
  );
  if (prodEnv.GOOGLE_SERVICE_ACCOUNT_KEY) {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = prodEnv.GOOGLE_SERVICE_ACCOUNT_KEY;
  }
}

const SPREADSHEET_ID =
  process.argv[2] ||
  process.env.FOTOSINTESIS_SPREADSHEET_ID ||
  fs
    .readFileSync("docs/specs/2026-05-21-fotosintesis-sot-id.txt", "utf8")
    .split("\n")[0]
    .trim();

console.log("🎯 Spreadsheet:", SPREADSHEET_ID);

const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\s+/g, "");
const saCreds = JSON.parse(Buffer.from(saKey, "base64").toString("utf8"));
const auth = new GoogleAuth({
  credentials: saCreds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = new sheets_v4.Sheets({ auth });

// Pull every cell's dataValidation rule + header row for context
const meta = await sheets.spreadsheets.get({
  spreadsheetId: SPREADSHEET_ID,
  includeGridData: true,
  fields:
    "sheets(properties(title),data(rowData(values(formattedValue,dataValidation(condition(type,values))))))",
});

const dropdowns = {};
let totalDropdowns = 0;

for (const sheet of meta.data.sheets ?? []) {
  const tab = sheet.properties.title;
  const rows = sheet.data?.[0]?.rowData ?? [];
  const headerRow = rows[0]?.values ?? [];
  const headers = headerRow.map((c) => c.formattedValue ?? "");

  const perCol = new Map(); // colIndex → Set of values

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]?.values ?? [];
    for (let c = 0; c < cells.length; c++) {
      const dv = cells[c]?.dataValidation;
      if (!dv?.condition) continue;
      // ONE_OF_LIST = inline dropdown; ONE_OF_RANGE = reference dropdown
      if (
        dv.condition.type !== "ONE_OF_LIST" &&
        dv.condition.type !== "ONE_OF_RANGE"
      ) {
        continue;
      }
      if (!perCol.has(c))
        perCol.set(c, { type: dv.condition.type, values: new Set() });
      const entry = perCol.get(c);
      for (const v of dv.condition.values ?? []) {
        if (v.userEnteredValue !== undefined)
          entry.values.add(v.userEnteredValue);
      }
    }
  }

  if (perCol.size > 0) {
    dropdowns[tab] = {};
    for (const [c, entry] of [...perCol.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      const colHeader = headers[c] ?? `col${c}`;
      dropdowns[tab][colHeader] = {
        type: entry.type,
        options: [...entry.values],
      };
      totalDropdowns++;
    }
  }
}

console.log("\n📋 Dropdowns found:");
if (totalDropdowns === 0) {
  console.log("   (none — no data-validation rules on any cell in any tab)");
}
for (const [tab, cols] of Object.entries(dropdowns)) {
  console.log(`\n  📁 ${tab}`);
  for (const [col, { type, options }] of Object.entries(cols)) {
    console.log(`     • ${col} (${type}) [${options.length}]`);
    for (const o of options) console.log(`        - ${o}`);
  }
}

const outPath = "docs/specs/2026-05-21-sot-dropdowns.json";
fs.writeFileSync(outPath, JSON.stringify(dropdowns, null, 2));
console.log(`\n💾 Dumped to ${outPath}`);
