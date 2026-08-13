/**
 * One-shot import: legacy Google Sheets `Asesores` tab → Convex `clients`
 * with tipo: "embajador".
 *
 * Reads from the legacy production sheet (the same one `get-asesores.ts`
 * reads), normalizes, and forwards to `clients.bulkImportFromLegacy`.
 * That mutation is idempotent — re-running is safe.
 *
 * Why this exists: the dropdown coverage report (2026-05-21) flagged that
 * Fotosíntesis ventas need a `clientId` of type "embajador", but the 27
 * canonical asesores live only in the legacy Asesores tab. Without this
 * import, the first sale to "Isa la Negra Vikinga" 404s the client lookup.
 *
 * Usage:
 *   CONVEX_URL=https://<tu-deployment>.convex.cloud \
 *   npx tsx scripts/import-asesores-to-convex.ts             # apply
 *   npx tsx scripts/import-asesores-to-convex.ts --dry-run   # preview only
 *   npx tsx scripts/import-asesores-to-convex.ts --no-push   # insert without pushing rows to SOT
 *
 * Requires: CONVEX_URL (or VITE_CONVEX_URL) + GOOGLE_SERVICE_ACCOUNT_KEY in env.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { GoogleAuth } from "google-auth-library";
import { sheets_v4 } from "@googleapis/sheets";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });
if (
  !process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
  fs.existsSync(".env.production.local")
) {
  const prodEnv = dotenv.parse(
    fs.readFileSync(".env.production.local", "utf8"),
  );
  if (prodEnv.GOOGLE_SERVICE_ACCOUNT_KEY) {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = prodEnv.GOOGLE_SERVICE_ACCOUNT_KEY;
  }
}

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const noPush = argv.includes("--no-push");

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("CONVEX_URL not found in environment");

const LEGACY_SHEET_ID = "1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU";
const ASESORES_TAB = "Asesores";

function getSheetsClient(): sheets_v4.Sheets {
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\s+/g, "");
  if (!saKey) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY missing");
  const creds = JSON.parse(Buffer.from(saKey, "base64").toString("utf8"));
  const auth = new GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return new sheets_v4.Sheets({ auth });
}

function findIndex(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] ?? "")
      .toLowerCase()
      .trim();
    for (const a of aliases) if (h.includes(a)) return i;
  }
  return -1;
}

async function readLegacyAsesores() {
  const sheets = getSheetsClient();
  console.log(`📥 Reading ${LEGACY_SHEET_ID}!${ASESORES_TAB}...`);
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: LEGACY_SHEET_ID,
    range: `'${ASESORES_TAB}'!A:Z`,
  });
  const rows = resp.data.values ?? [];
  if (rows.length === 0) throw new Error("Asesores tab is empty");

  const headers = rows[0].map((h) => String(h ?? "").trim());
  const nameIdx = findIndex(headers, ["nombre", "name"]);
  const slugIdx = findIndex(headers, ["slug"]);
  const whatsappIdx = findIndex(headers, ["whatsapp", "telefono", "phone"]);
  const instagramIdx = findIndex(headers, ["instagram", "email"]);
  const estadoIdx = findIndex(headers, ["estado", "status"]);

  if (nameIdx === -1)
    throw new Error(`No name column found. Headers: ${headers.join(" | ")}`);

  const parsed: Array<{
    nombre: string;
    email?: string;
    telefono?: string;
    asesorId?: string;
    estado: string;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = String(row[nameIdx] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!nombre) continue;
    const estado = String(row[estadoIdx] ?? "Activo").trim();
    const emailRaw = instagramIdx !== -1 ? row[instagramIdx] : undefined;
    const email = emailRaw
      ? String(emailRaw).trim().toLowerCase() || undefined
      : undefined;
    const telefono =
      whatsappIdx !== -1 && row[whatsappIdx]
        ? String(row[whatsappIdx]).trim()
        : undefined;
    const asesorId =
      slugIdx !== -1 && row[slugIdx] ? String(row[slugIdx]).trim() : undefined;
    parsed.push({ nombre, email, telefono, asesorId, estado });
  }
  return parsed;
}

async function main() {
  const convex = new ConvexHttpClient(CONVEX_URL!);

  const rows = await readLegacyAsesores();
  const activeRows = rows.filter(
    (r) => !["inactivo", "inactive"].includes(r.estado.toLowerCase()),
  );
  console.log(
    `📋 Asesores found: ${rows.length} (active: ${activeRows.length})`,
  );

  const payload = activeRows.map((r) => ({
    nombre: r.nombre,
    email: r.email,
    telefono: r.telefono,
    asesorId: r.asesorId,
  }));

  if (dryRun) {
    console.log("\n🧪 Dry-run — would send the following rows:");
    for (const r of payload) {
      console.log(`  • ${r.nombre}${r.email ? ` <${r.email}>` : ""}`);
    }
    console.log(`\nTotal payload: ${payload.length} rows`);
    return;
  }

  console.log(
    `\n🚀 Calling clients.bulkImportFromLegacy (pushToSot=${!noPush})...`,
  );
  const result = await convex.mutation(api.clients.bulkImportFromLegacy, {
    rows: payload,
    pushToSot: !noPush,
  });

  console.log("\n✅ Done");
  console.log(`   total:   ${result.total}`);
  console.log(`   created: ${result.created}`);
  console.log(`   skipped: ${result.skipped}`);
  if (result.skipped > 0) {
    console.log("\n   Skipped (already existed):");
    for (const d of result.details.filter(
      (d: { status: string }) => d.status === "skipped",
    )) {
      console.log(`     • ${d.nombre}${d.reason ? ` (${d.reason})` : ""}`);
    }
  }
  if (result.created > 0) {
    console.log("\n   Created:");
    for (const d of result.details.filter(
      (d: { status: string }) => d.status === "created",
    )) {
      console.log(`     • ${d.nombre}`);
    }
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
