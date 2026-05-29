#!/usr/bin/env node
/**
 * Seed the Fotosíntesis SOT (Inventario-Fotosíntesis · SOT v2) with
 * `setDataValidation` rules — the dropdowns Maritza already relies on
 * in the legacy sheet `1mghR6...!INVENTARIO Tierra.Madre`.
 *
 * Why: the SOT was created clean (`scripts/create-fotosintesis-sot.mjs`)
 * without any data-validation rules. Without dropdowns, Maritza loses the
 * guardrails she has in the legacy sheet — she can type "AAA" in Calidad,
 * "verde-verde" in Color, or invent a new Estado, and the next pull will
 * either drift silently or blow the Convex v.union validator.
 *
 * Single source of truth: `src/data/vocabularies.ts`. Re-running this
 * script after an edit there propagates the new options to the sheet.
 *
 * Tabs touched: Proveedores, Lotes, Inventario, Clientes, Ventas.
 *
 * Idempotent: every call clears the target columns first, then re-applies.
 * Safe to re-run as vocabularies evolve.
 *
 * Usage:
 *   node scripts/seed-sot-dropdowns.mjs                    # uses SOT id from docs/specs/2026-05-21-fotosintesis-sot-id.txt
 *   node scripts/seed-sot-dropdowns.mjs <SPREADSHEET_ID>   # override
 *   node scripts/seed-sot-dropdowns.mjs --dry-run          # plan only, no writes
 */
import { GoogleAuth } from "google-auth-library";
import { sheets_v4 } from "@googleapis/sheets";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.production.local")) {
  const prodEnv = dotenv.parse(
    fs.readFileSync(".env.production.local", "utf8"),
  );
  if (prodEnv.GOOGLE_SERVICE_ACCOUNT_KEY) {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = prodEnv.GOOGLE_SERVICE_ACCOUNT_KEY;
  }
}

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const overrideId = argv.find((a) => !a.startsWith("--"));

const SPREADSHEET_ID =
  overrideId ||
  process.env.FOTOSINTESIS_SPREADSHEET_ID ||
  fs
    .readFileSync(
      path.join(
        __dirname,
        "..",
        "docs/specs/2026-05-21-fotosintesis-sot-id.txt",
      ),
      "utf8",
    )
    .split("\n")[0]
    .trim();

console.log("🎯 Target SOT:", SPREADSHEET_ID);
if (dryRun) console.log("🧪 Dry-run — no writes will be sent");

// ─── Load vocabularies from src/data/vocabularies.ts ─────────────────
//
// `vocabularies.ts` is TypeScript, but the lists we need are plain
// string-literal arrays that look the same after compilation. Node can't
// import .ts directly — we grep the values out instead. Cheap, robust,
// and avoids a tsc/tsx dependency for a one-shot seed script.

function loadVocabularies() {
  const file = fs.readFileSync(
    path.join(__dirname, "..", "src/data/vocabularies.ts"),
    "utf8",
  );

  function extractArray(name) {
    const re = new RegExp(
      `export const ${name} = \\[([\\s\\S]*?)\\] as const;`,
    );
    const m = file.match(re);
    if (!m)
      throw new Error(`Vocabulary "${name}" not found in vocabularies.ts`);
    const body = m[1];
    const values = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) =>
      x[1].replace(/\\"/g, '"'),
    );
    if (values.length === 0)
      throw new Error(`Vocabulary "${name}" yielded zero string literals`);
    return values;
  }

  return {
    COLORS: extractArray("COLORS"),
    CALIDADES: extractArray("CALIDADES"),
    TALLAS: extractArray("TALLAS"),
    MEDIDAS_FORMATO: extractArray("MEDIDAS_FORMATO"),
    CATEGORIAS: extractArray("CATEGORIAS"),
    UBICACIONES: extractArray("UBICACIONES"),
    PRODUCT_ESTADOS: extractArray("PRODUCT_ESTADOS"),
    COLECCIONES: extractArray("COLECCIONES"),
    CAJAS: extractArray("CAJAS"),
    PROVIDER_TIPOS: extractArray("PROVIDER_TIPOS"),
    CLIENT_TIPOS: extractArray("CLIENT_TIPOS"),
    FORMA_PAGO: extractArray("FORMA_PAGO"),
    METODO_CONTADO: extractArray("METODO_CONTADO"),
    LOT_ESTADOS: extractArray("LOT_ESTADOS"),
    SALE_ESTADOS: extractArray("SALE_ESTADOS"),
  };
}

// ─── Tab layout — must mirror `scripts/create-fotosintesis-sot.mjs` ──
//
// Column index = position in the corresponding HEADERS array (0-based).
// If you change those headers there, update the indices here.

const TAB_RULES = (V) => ({
  Proveedores: [
    // tipo (G, idx 6): gemas | joyas | insumos | otros
    { col: 6, name: "tipo", values: V.PROVIDER_TIPOS },
  ],
  Lotes: [
    // formaPago (G, idx 6): contado | credito | esmereogenesis | bajo_pedido | consignacion
    { col: 6, name: "formaPago", values: V.FORMA_PAGO },
    // metodoContado (H, idx 7): efectivo | transferencia
    { col: 7, name: "metodoContado", values: V.METODO_CONTADO },
    // estado (N, idx 13): abierto | cerrado | publicado
    { col: 13, name: "estado", values: V.LOT_ESTADOS },
  ],
  Inventario: [
    // Layout from FOTO_INVENTARIO_COLUMNS (price block grouped at L–N; the
    // legacy "Precio COP" column L was retired 2026-05-29, shifting every
    // column from costoBaseCOP onward one position left):
    // 0 Item, 1 FechaIngreso, 2 Nombre, 3 Peso, 4 Color, 5 Calidad,
    // 6 Cant., 7 Talla, 8 Medidas, 9 Medidas (valor), 10 Categoría,
    // 11 costoBaseCOP, 12 precioEmbajadorCOP, 13 precioConscienteCOP,
    // 14 UBICACIÓN, 15 ASESOR, 16 ESTADO, 17 QR, 18 Colección, 19 CAJA,
    // 20 preponderancia, 21 ASESOR ACTUAL, 22 ESTADO ASESOR
    { col: 4, name: "Color", values: V.COLORS },
    { col: 5, name: "Calidad", values: V.CALIDADES },
    { col: 7, name: "Talla", values: V.TALLAS },
    { col: 8, name: "Medidas (formato)", values: V.MEDIDAS_FORMATO },
    { col: 10, name: "Categoría", values: V.CATEGORIAS },
    { col: 14, name: "UBICACIÓN", values: V.UBICACIONES },
    // ESTADO uses the productInventory v.union order; "" is filtered out
    // because Sheets won't accept an empty string in a ONE_OF_LIST.
    {
      col: 16,
      name: "ESTADO",
      values: V.PRODUCT_ESTADOS.filter((v) => v !== ""),
    },
    { col: 18, name: "Colección", values: V.COLECCIONES },
    { col: 19, name: "CAJA", values: V.CAJAS },
  ],
  Clientes: [
    // tipo (G, idx 6): embajador | final
    { col: 6, name: "tipo", values: V.CLIENT_TIPOS },
  ],
  Ventas: [
    // formaPago (I, idx 8): same 5 values as Lotes
    { col: 8, name: "formaPago", values: V.FORMA_PAGO },
    // metodoContado (J, idx 9): efectivo | transferencia
    { col: 9, name: "metodoContado", values: V.METODO_CONTADO },
    // estado (O, idx 14): reservada | confirmada | cancelada
    { col: 14, name: "estado", values: V.SALE_ESTADOS },
  ],
});

// ─── Helpers ─────────────────────────────────────────────────────────

function colLetter(index) {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function buildValidationRequest(sheetId, colIndex, options, rowCount) {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1, // skip header
        endRowIndex: rowCount,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1,
      },
      rule: {
        condition: {
          type: "ONE_OF_LIST",
          values: options.map((v) => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        // strict: false → Sheets warns but doesn't block. Matches the
        // legacy behavior so Maritza isn't locked out if she pastes
        // legacy values that aren't in the new list yet.
        strict: false,
      },
    },
  };
}

function buildClearRequest(sheetId, colIndex, rowCount) {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1,
      },
      rule: null,
    },
  };
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const V = loadVocabularies();
  console.log(
    `📚 Vocabularies loaded: ${Object.entries(V)
      .map(([k, v]) => `${k}(${v.length})`)
      .join(", ")}`,
  );

  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\s+/g, "");
  if (!saKey) {
    console.error("❌ GOOGLE_SERVICE_ACCOUNT_KEY missing");
    process.exit(1);
  }
  const creds = JSON.parse(Buffer.from(saKey, "base64").toString("utf8"));
  const auth = new GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = new sheets_v4.Sheets({ auth });

  // Pull sheet metadata so we can map tab title → sheetId and grid size.
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields:
      "sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))",
  });

  const tabIndex = new Map();
  for (const s of meta.data.sheets ?? []) {
    tabIndex.set(s.properties.title, {
      sheetId: s.properties.sheetId,
      rowCount: s.properties.gridProperties?.rowCount ?? 1000,
    });
  }

  const rules = TAB_RULES(V);
  const requests = [];
  const plan = [];

  for (const [tab, ruleList] of Object.entries(rules)) {
    const tabInfo = tabIndex.get(tab);
    if (!tabInfo) {
      console.warn(`⚠ Tab "${tab}" not found in SOT — skipping`);
      continue;
    }
    // Apply down to the end of the existing grid. Sheets auto-extends
    // dataValidation when new rows are inserted via values.update, so we
    // don't need to over-extend past rowCount.
    const endRow = tabInfo.rowCount;

    for (const rule of ruleList) {
      requests.push(buildClearRequest(tabInfo.sheetId, rule.col, endRow));
      requests.push(
        buildValidationRequest(tabInfo.sheetId, rule.col, rule.values, endRow),
      );
      plan.push(
        `  • ${tab}!${colLetter(rule.col)} ${rule.name} → ${rule.values.length} options`,
      );
    }
  }

  console.log("\n📋 Plan:");
  for (const line of plan) console.log(line);
  console.log(`\n📦 ${requests.length} batchUpdate requests prepared`);

  if (dryRun) {
    console.log("🧪 Dry-run complete. Re-run without --dry-run to apply.");
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  console.log("\n✅ Validations applied");
  console.log(
    `   https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`,
  );
}

main().catch((err) => {
  console.error("❌", err.message);
  if (err.response?.data)
    console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
