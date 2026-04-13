/**
 * One-shot migration: Google Sheets → Convex
 *
 * Usage:
 *   npx tsx scripts/migrate-sheets-to-convex.ts --dry-run
 *   npx tsx scripts/migrate-sheets-to-convex.ts --table invitations
 *   npx tsx scripts/migrate-sheets-to-convex.ts --table productViews
 *   npx tsx scripts/migrate-sheets-to-convex.ts --table all
 *   npx tsx scripts/migrate-sheets-to-convex.ts --table all --verify
 *
 * Requires: CONVEX_URL and GOOGLE_SERVICE_ACCOUNT_KEY in .env.local or environment.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("CONVEX_URL not found in environment");

const convex = new ConvexHttpClient(CONVEX_URL);

// Sheets config — matches api/_lib/constants.js
const APP_SPREADSHEET_ID = process.env.APP_SPREADSHEET_ID?.trim() || "1DuOhuPcHFBhliGJG_imKWA_Yyx4dAmvmmKr4Dp2TXoM";
const INVITATIONS_SHEET = "Invitations";
const PRODUCT_VIEWS_SHEET = "ProductViews";

// ─── Google Sheets client ───────────────────────────────────────────

async function getSheetsClient() {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyRaw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not found");
  const key = JSON.parse(keyRaw);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

// ─── Parsers ────────────────────────────────────────────────────────

function sanitizeMultiplier(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(Math.min(4.0, Math.max(1.0, n)) * 10) / 10;
}

function normalizeStatus(raw: unknown): "active" | "pending" | "expired" {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "active") return "active";
  if (s === "pending") return "pending";
  return "expired";
}

function parseInvitationRow(row: (string | number | undefined)[]) {
  return {
    invitationId: String(row[0] ?? ""),
    shortCode: String(row[1] ?? ""),
    creatorEmail: String(row[2] ?? "").toLowerCase().trim(),
    creatorName: String(row[3] ?? ""),
    creatorRole: String(row[4] ?? "Asesor") || undefined,
    guestName: row[5] ? String(row[5]) : undefined,
    guestContact: row[6] ? String(row[6]) : undefined,
    contactType: row[7] ? String(row[7]) : undefined,
    createdAt: String(row[8] ?? new Date().toISOString()),
    activatedAt: row[9] ? String(row[9]) : undefined,
    expiresAt: row[10] ? String(row[10]) : undefined,
    pricingMode: String(row[11] ?? "with_prices"),
    durationHours: parseInt(String(row[12] ?? ""), 10) || 876000,
    status: normalizeStatus(row[13]),
    pin: row[14] ? String(row[14]) : undefined,
    boundToken: row[15] ? String(row[15]) : undefined,
    guestCurrencyMode: row[16] ? String(row[16]) : undefined,
    guestMultiplier: sanitizeMultiplier(row[17]),
  };
}

function parseProductViewRow(row: (string | number | undefined)[]) {
  return {
    timestamp: String(row[0] ?? new Date().toISOString()),
    itemId: String(row[1] ?? ""),
    productName: row[2] ? String(row[2]) : undefined,
    sessionId: row[3] ? String(row[3]) : undefined,
    referrer: row[4] ? String(row[4]) : undefined,
    deviceType: row[5] ? String(row[5]) : undefined,
    browser: row[6] ? String(row[6]) : undefined,
    country: row[7] ? String(row[7]) : undefined,
    userName: row[8] ? String(row[8]) : undefined,
    userEmail: row[9] ? String(row[9]) : undefined,
    userRole: row[10] ? String(row[10]) : undefined,
    inviterName: row[11] ? String(row[11]) : undefined,
  };
}

// ─── Migration logic ────────────────────────────────────────────────

async function migrateInvitations(sheets: ReturnType<typeof google.sheets>, dryRun: boolean) {
  console.log("\n=== Migrating Invitations ===");
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${INVITATIONS_SHEET}'!A:R`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) {
    console.log("No invitation data found.");
    return 0;
  }

  const dataRows = rows.slice(1); // skip header
  console.log(`Found ${dataRows.length} invitation rows.`);

  // Deduplicate by invitationId (keep last occurrence)
  const byId = new Map<string, ReturnType<typeof parseInvitationRow>>();
  let skipped = 0;
  for (const row of dataRows) {
    const parsed = parseInvitationRow(row);
    if (!parsed.invitationId || !parsed.shortCode) {
      skipped++;
      continue;
    }
    byId.set(parsed.invitationId, parsed);
  }

  console.log(`Unique invitations: ${byId.size} (skipped ${skipped} invalid rows)`);

  if (dryRun) {
    console.log("[DRY RUN] Would insert", byId.size, "invitations.");
    return byId.size;
  }

  let inserted = 0;
  const batch = Array.from(byId.values());
  for (let i = 0; i < batch.length; i += 50) {
    const chunk = batch.slice(i, i + 50);
    await Promise.all(
      chunk.map(async (inv) => {
        try {
          // Check if already exists
          const existing = await convex.query(api.invitations.getByShortCode, {
            shortCode: inv.shortCode,
          });
          if (existing) {
            console.log(`  SKIP (exists): ${inv.shortCode}`);
            return;
          }
          await convex.mutation(api.invitations._migrateInsert, {
            invitationId: inv.invitationId,
            shortCode: inv.shortCode,
            creatorEmail: inv.creatorEmail,
            creatorName: inv.creatorName,
            creatorRole: inv.creatorRole,
            guestName: inv.guestName,
            guestContact: inv.guestContact,
            contactType: inv.contactType,
            status: inv.status,
            createdAt: inv.createdAt,
            activatedAt: inv.activatedAt,
            expiresAt: inv.expiresAt,
            pricingMode: inv.pricingMode,
            durationHours: inv.durationHours,
            guestCurrencyMode: inv.guestCurrencyMode,
            guestMultiplier: inv.guestMultiplier,
            pin: inv.pin,
            boundToken: inv.boundToken,
          });
          inserted++;
          if (inserted % 10 === 0) console.log(`  Inserted ${inserted}/${byId.size}`);
        } catch (err) {
          console.error(`  ERROR inserting ${inv.shortCode}:`, err);
        }
      })
    );
  }

  console.log(`Inserted ${inserted} invitations.`);
  return inserted;
}

async function migrateProductViews(sheets: ReturnType<typeof google.sheets>, dryRun: boolean) {
  console.log("\n=== Migrating ProductViews ===");
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${PRODUCT_VIEWS_SHEET}'!A:L`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) {
    console.log("No product view data found.");
    return 0;
  }

  const dataRows = rows.slice(1);
  console.log(`Found ${dataRows.length} product view rows.`);

  if (dryRun) {
    console.log("[DRY RUN] Would insert", dataRows.length, "product views.");
    return dataRows.length;
  }

  let inserted = 0;
  for (let i = 0; i < dataRows.length; i += 100) {
    const chunk = dataRows.slice(i, i + 100);
    await Promise.all(
      chunk.map(async (row) => {
        const parsed = parseProductViewRow(row);
        if (!parsed.itemId) return;
        try {
          await convex.mutation(api.productViews.track, parsed);
          inserted++;
        } catch (err) {
          console.error(`  ERROR inserting view for item ${parsed.itemId}:`, err);
        }
      })
    );
    if (i % 500 === 0 && i > 0) console.log(`  Progress: ${i}/${dataRows.length}`);
  }

  console.log(`Inserted ${inserted} product views.`);
  return inserted;
}

// ─── CLI ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verify = args.includes("--verify");
  const tableArg = args.find((_, i) => args[i - 1] === "--table") ?? "all";

  if (dryRun) console.log("=== DRY RUN MODE ===\n");

  const sheets = await getSheetsClient();

  if (tableArg === "invitations" || tableArg === "all") {
    await migrateInvitations(sheets, dryRun);
  }
  if (tableArg === "productViews" || tableArg === "all") {
    await migrateProductViews(sheets, dryRun);
  }

  if (verify && !dryRun) {
    console.log("\n=== Verification ===");
    const sheetsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${INVITATIONS_SHEET}'!A:A`,
    });
    const sheetsCount = (sheetsRes.data.values?.length ?? 1) - 1;
    console.log(`Sheets invitations: ${sheetsCount}`);
    console.log("(Compare with Convex dashboard count)");
  }

  console.log("\nDone.");
}

main().catch(console.error);
