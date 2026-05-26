import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

/**
 * Pull the latest inventory from Google Sheets into the Convex `productInventory`
 * mirror. Pending/error rows are not clobbered — see _upsertFromSheet.
 *
 * Scope: this mirror is read ONLY by admin surfaces (ProductManagementPage,
 * Fotosíntesis HomePage / ProductoSpotlight / LoteResumenPage). The customer
 * Treasure Browser reads legacy products straight from /api/get-treasure-sheets
 * and Fotosíntesis products from products.publishedCatalog — neither depends on
 * this cron. So the interval only governs how fast OUT-OF-BAND sheet edits show
 * up in the admin panel; the toolbar's manual "Resync from sheet" button covers
 * urgent cases.
 *
 * Every run fetches the whole sheet (Vercel + Sheets bandwidth) and full-table
 * reads the mirror to reconcile (Convex DB bandwidth). At 5 min that was 288
 * pulls/day even when idle; 15 min cuts that ~3× with no customer impact.
 */
crons.interval(
  "pull inventory from sheet",
  { minutes: 15 },
  api.products.pullFromSheet,
  {},
);

// Fotosíntesis v2 — `providers`, `lots`, `clients`, `sales` rely on the
// generic /api/get-table.ts primitive but their per-table pullFromSheet
// actions are not yet implemented. The capture flow goes Convex →
// Sheets (push), which doesn't need pull. Manual sheet edits won't
// reflect into Convex until pull actions land — schedule them here
// when implementing.

export default crons;
