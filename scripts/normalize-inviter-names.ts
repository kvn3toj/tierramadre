/**
 * Normalize inviterName / creatorName in Convex to match the canonical
 * Asesor name from the Asesores sheet.
 *
 * Root cause: invitations were created using Google profile name (user.name),
 * which doesn't always match the canonical name in the Asesores sheet.
 * productViews.guestActivity filters by exact match, so the /mi-perfil feed
 * returns 0 views for most asesores.
 *
 * This script:
 *   1. Reads Asesores sheet → email → canonical name mapping.
 *   2. Walks through Convex productViews and invitations.
 *   3. For invitations: looks up creatorEmail → canonical name, patches creatorName.
 *   4. For productViews: joins on inviterName raw → searches invitations/sheets
 *      to resolve to an email, then patches inviterName.
 *
 * Requires a new Convex mutation `_normalizeInviterName` deployed alongside.
 * Falls back to using existing updateMultiplier-style mutations if needed.
 *
 * Usage:
 *   CONVEX_URL=https://<tu-deployment>.convex.cloud \
 *     npx tsx scripts/normalize-inviter-names.ts --dry-run
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { sheets_v4 } from "@googleapis/sheets";
import { OAuth2Client } from "google-auth-library";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("CONVEX_URL not found");
const convex = new ConvexHttpClient(CONVEX_URL);

const APP_SPREADSHEET_ID =
  process.env.APP_SPREADSHEET_ID?.trim() || "1DuOhuPcHFBhliGJG_imKWA_Yyx4dAmvmmKr4Dp2TXoM";
const MAIN_SPREADSHEET_ID =
  process.env.SPREADSHEET_ID?.trim() || "1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU";

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']|["']$/g, "").replace(/\\n/g, "").replace(/[\r\n]/g, "").trim();
}

function getSheetsClient() {
  const auth = new OAuth2Client(
    cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_ID),
    cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET)
  );
  auth.setCredentials({ refresh_token: cleanEnv(process.env.GOOGLE_OAUTH_REFRESH_TOKEN) });
  return new sheets_v4.Sheets({ auth });
}

async function loadAsesoresMapping(sheets: sheets_v4.Sheets) {
  // Try APP_SPREADSHEET, then CATALOG, then common sheet names.
  const candidates = [
    { id: MAIN_SPREADSHEET_ID, sheet: "Asesores" },
    { id: MAIN_SPREADSHEET_ID, sheet: "asesores" },
    { id: APP_SPREADSHEET_ID, sheet: "Asesores" },
  ];

  for (const { id, sheet } of candidates) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: `'${sheet}'!A:Z`,
      });
      const rows = res.data.values ?? [];
      if (rows.length <= 1) continue;
      const headers = rows[0].map((h) => String(h).toLowerCase());
      const nameCol = headers.findIndex((h) => h.includes("nombre") || h.includes("name"));
      // Legacy quirk: Asesores sheet stores email in the "Instagram" column.
      const emailCol = headers.findIndex(
        (h) => h.includes("email") || h.includes("correo") || h.includes("instagram")
      );
      if (nameCol < 0 || emailCol < 0) continue;
      const byEmail = new Map<string, string>();
      for (const row of rows.slice(1)) {
        const name = String(row[nameCol] ?? "").trim();
        const email = String(row[emailCol] ?? "").toLowerCase().trim();
        if (name && email) byEmail.set(email, name);
      }
      if (byEmail.size > 0) {
        console.log(`Loaded ${byEmail.size} asesores from ${id}/${sheet}`);
        return byEmail;
      }
    } catch {
      // try next
    }
  }
  throw new Error("Could not find Asesores sheet");
}

async function loadNameToEmailFromInvitations(sheets: sheets_v4.Sheets) {
  // Invitations sheet stores creatorName (Google name) + creatorEmail together.
  // Use it to bridge raw-name → email → canonical.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'Invitations'!A:R`,
  });
  const rows = res.data.values ?? [];
  const byRawName = new Map<string, string>(); // rawCreatorName -> creatorEmail
  for (const row of rows.slice(1)) {
    const email = String(row[2] ?? "").toLowerCase().trim();
    const rawName = String(row[3] ?? "").trim();
    if (rawName && email) byRawName.set(rawName, email);
  }
  return byRawName;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(dryRun ? "=== DRY RUN ===" : "=== LIVE ===");
  console.log(`Convex: ${CONVEX_URL}\n`);

  const sheets = getSheetsClient();
  const asesorByEmail = await loadAsesoresMapping(sheets);
  const rawNameToEmail = await loadNameToEmailFromInvitations(sheets);

  // Build: rawName -> canonicalName via email bridge
  const rawToCanonical = new Map<string, string>();
  for (const [rawName, email] of rawNameToEmail) {
    const canonical = asesorByEmail.get(email);
    if (canonical && canonical !== rawName) {
      rawToCanonical.set(rawName, canonical);
    }
  }

  console.log(`\nResolved ${rawToCanonical.size} raw→canonical name mappings:`);
  for (const [raw, canonical] of rawToCanonical) {
    console.log(`  "${raw}" → "${canonical}"`);
  }

  if (rawToCanonical.size === 0) {
    console.log("\nNothing to normalize.");
    return;
  }

  // ─── Preview impact ──────────────────────────────────────────
  console.log(`\n=== Impact preview ===`);
  for (const [raw, canonical] of rawToCanonical) {
    const views = (await convex.query(api.productViews.guestActivity, {
      inviterName: raw,
      limit: 10000,
    })) as Record<string, unknown>[];
    if (views.length > 0) {
      console.log(`  "${raw}" → "${canonical}": ${views.length} productViews`);
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] To apply: re-run without --dry-run`);
    return;
  }

  console.log(`\n=== Applying patches ===`);
  let totalViews = 0;
  let totalInvitations = 0;

  for (const [raw, canonical] of rawToCanonical) {
    const viewRes = (await convex.mutation(api.productViews._normalizeInviterName, {
      oldName: raw,
      newName: canonical,
    })) as { patched: number };
    const invRes = (await convex.mutation(api.invitations._normalizeCreatorName, {
      oldName: raw,
      newName: canonical,
    })) as { patched: number };
    totalViews += viewRes.patched;
    totalInvitations += invRes.patched;
    console.log(
      `  "${raw}" → "${canonical}": ${viewRes.patched} views, ${invRes.patched} invitations patched`
    );
  }

  console.log(`\nTotal: ${totalViews} views + ${totalInvitations} invitations patched.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
