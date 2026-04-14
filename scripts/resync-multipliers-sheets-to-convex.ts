/**
 * Resync guestMultiplier from Sheets (source of truth) to Convex
 * for existing invitations whose values diverged during the
 * "env var had trailing \n" bug window.
 *
 * Usage:
 *   CONVEX_URL=https://wandering-parrot-148.convex.cloud \
 *     npx tsx scripts/resync-multipliers-sheets-to-convex.ts --dry-run
 *   CONVEX_URL=https://wandering-parrot-148.convex.cloud \
 *     npx tsx scripts/resync-multipliers-sheets-to-convex.ts
 *
 * Only touches invitations with status active|pending (matches
 * updateMultiplier mutation rules).
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { sheets_v4 } from "@googleapis/sheets";
import { OAuth2Client } from "google-auth-library";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("CONVEX_URL not found in environment");
const convex = new ConvexHttpClient(CONVEX_URL);

const APP_SPREADSHEET_ID =
  process.env.APP_SPREADSHEET_ID?.trim() || "1DuOhuPcHFBhliGJG_imKWA_Yyx4dAmvmmKr4Dp2TXoM";
const INVITATIONS_SHEET = "Invitations";

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']|["']$/g, "").replace(/\\n/g, "").replace(/[\r\n]/g, "").trim();
}

function getSheetsClient() {
  const clientId = cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = cleanEnv(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID, _SECRET, and _REFRESH_TOKEN required");
  }
  const auth = new OAuth2Client(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return new sheets_v4.Sheets({ auth });
}

function sanitizeMultiplier(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(4.0, Math.max(1.0, n)) * 10) / 10;
}

type SheetRow = {
  invitationId: string;
  shortCode: string;
  creatorEmail: string;
  status: string;
  guestMultiplier: number | null;
};

function parseRow(row: (string | number | undefined)[]): SheetRow {
  return {
    invitationId: String(row[0] ?? ""),
    shortCode: String(row[1] ?? ""),
    creatorEmail: String(row[2] ?? "").toLowerCase().trim(),
    status: String(row[13] ?? "").toLowerCase().trim(),
    guestMultiplier: sanitizeMultiplier(row[17]),
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(dryRun ? "=== DRY RUN ===" : "=== LIVE ===");
  console.log(`Convex: ${CONVEX_URL}\n`);

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${INVITATIONS_SHEET}'!A:R`,
  });
  const rows = res.data.values ?? [];
  if (rows.length <= 1) {
    console.log("No invitation data.");
    return;
  }

  // Dedupe by invitationId, keep last row (most recent edit)
  const byId = new Map<string, SheetRow>();
  for (const row of rows.slice(1)) {
    const parsed = parseRow(row);
    if (!parsed.invitationId || !parsed.shortCode) continue;
    byId.set(parsed.invitationId, parsed);
  }

  const candidates = Array.from(byId.values()).filter(
    (r) => (r.status === "active" || r.status === "pending") && r.guestMultiplier != null
  );
  console.log(`Active/pending with multiplier set in Sheets: ${candidates.length}\n`);

  let updated = 0;
  let alreadyInSync = 0;
  let errors = 0;

  for (const r of candidates) {
    try {
      const conv = (await convex.query(api.invitations.getByShortCode, {
        shortCode: r.shortCode,
      })) as Record<string, unknown> | null;

      if (!conv) {
        console.log(`  MISSING in Convex: ${r.shortCode}`);
        errors++;
        continue;
      }

      const convMult = conv.guestMultiplier != null ? Number(conv.guestMultiplier) : null;
      const sheetMult = r.guestMultiplier;

      if (convMult === sheetMult) {
        alreadyInSync++;
        continue;
      }

      console.log(
        `  ${r.shortCode} (${r.creatorEmail}): Convex=${convMult} → Sheets=${sheetMult}`
      );

      if (!dryRun) {
        await convex.mutation(api.invitations.updateMultiplier, {
          shortCode: r.shortCode,
          creatorEmail: r.creatorEmail,
          guestMultiplier: sheetMult as number,
        });
        updated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR ${r.shortCode}: ${msg}`);
      errors++;
    }
  }

  console.log(`\nAlready in sync: ${alreadyInSync}`);
  console.log(dryRun ? `Would update: diff count above` : `Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
