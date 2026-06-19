/**
 * Mirror the read path that /api/get-table and /api/admin-table-update use
 * against the FOTOSINTESIS_SPREADSHEET_ID and confirm every tab + range is
 * reachable with the configured patterns.
 *
 * Catches the regression class where `getSheetNames(sheets)` silently
 * enumerates the legacy `SPREADSHEET_ID` instead of the Fotosíntesis SOT
 * — both endpoints must pass the new id explicitly.
 *
 * Usage:
 *   node scripts/smoke-fotosintesis-endpoints.mjs [SPREADSHEET_ID]
 *
 * Defaults to the id stored in docs/specs/2026-05-21-fotosintesis-sot-id.txt.
 * Auth: uses the service account key from .env.production.local (the same
 * one Vercel runs with).
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
if (!saKey) {
  console.error("❌ GOOGLE_SERVICE_ACCOUNT_KEY missing");
  process.exit(1);
}
const saCreds = JSON.parse(Buffer.from(saKey, "base64").toString("utf8"));
const auth = new GoogleAuth({
  credentials: saCreds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = new sheets_v4.Sheets({ auth });

// Mirror sheets-helpers.js#getSheetNames(sheets, spreadsheetId)
async function getSheetNames(s, id) {
  const meta = await s.spreadsheets.get({ spreadsheetId: id });
  return (meta.data.sheets ?? []).map((t) => t.properties.title);
}

// Mirror sheets-helpers.js#findSheetByPattern
function findSheetByPattern(names, patterns) {
  return (
    names.find((n) => {
      const lower = n.toLowerCase();
      return patterns.some((p) => lower.includes(p.toLowerCase()));
    }) || null
  );
}

// Mirror api/_lib/admin-table-config.ts#TABLE_CONFIGS
const CONFIGS = {
  providers: {
    patterns: ["proveedores", "providers"],
    col: "H",
    columns: [
      "nombreORazonSocial",
      "nit",
      "cedula",
      "direccion",
      "telefono",
      "email",
      "tipo",
      "notas",
    ],
  },
  lots: {
    patterns: ["lotes", "lots"],
    col: "T",
    columns: [
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
      "estado", // N
      // ── Fotosíntesis form fields (append-only, O onward) ──
      "renombreLote", // O
      "tratamiento", // P
      "mina", // Q
      "sede", // R
      "operadorNombre", // S
      "operadorRol", // T
    ],
  },
  clients: {
    patterns: ["clientes", "clients"],
    col: "H",
    columns: [
      "nombre",
      "nit",
      "cedula",
      "direccion",
      "telefono",
      "email",
      "tipo",
      "asesorId",
    ],
  },
  sales: {
    patterns: ["ventas", "sales"],
    col: "O",
    columns: [
      "saleId",
      "fechaVenta",
      "itemIdsJoined",
      "clientNombre",
      "precioAcordadoCOP",
      "descuentoCOP",
      "totalCOP",
      "comisionCOP",
      "formaPago",
      "metodoContado",
      "fechaVencimiento",
      "numeroCuotas",
      "carnetUrl",
      "certificadoUrl",
      "estado",
    ],
  },
  subLotes: {
    patterns: ["sublotes", "sub-lotes", "sublotes (sale-bundles)"],
    col: "J",
    columns: [
      "subLoteId",
      "parentLoteId",
      "sede",
      "nombre",
      "itemIdsJoined",
      "unidades",
      "totalCostoCOP",
      "estado",
      "notas",
      "createdAt",
    ],
  },
};

const names = await getSheetNames(sheets, SPREADSHEET_ID);
console.log("\n📁 Tabs discovered:", names.join(", "));

let failed = false;
for (const [table, cfg] of Object.entries(CONFIGS)) {
  const tab = findSheetByPattern(names, cfg.patterns);
  if (!tab) {
    console.error(
      `   ✗ ${table.padEnd(10)} → 404 no tab matched ${cfg.patterns.join("/")}`,
    );
    failed = true;
    continue;
  }
  const range = `${tab}!A1:${cfg.col}`;
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const rows = r.data.values ?? [];
  const header = rows[0] ?? [];
  const expectedCols = cfg.columns.length;
  const actualCols = header.length;
  const colMatch =
    actualCols === expectedCols ? "✓" : `⚠ expected ${expectedCols}`;
  console.log(
    `   ✓ ${table.padEnd(10)} → tab="${tab}" rows=${rows.length} cols=${actualCols} ${colMatch}`,
  );
}

if (failed) {
  console.error("\n❌ One or more tabs unreachable — endpoint would 404.");
  process.exit(1);
}
console.log(
  "\n✅ All Fotosíntesis tabs reachable. Endpoints will resolve cleanly.",
);
