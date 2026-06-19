import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

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

/**
 * Keep the embajador `clients` (the venta "Embajador asignado" dropdown source)
 * in step with the legacy Asesores tab. The one-shot `bulkImportFromLegacy` only
 * seeds Convex once; without this, an asesor added to the sheet never appears in
 * a sale until someone re-runs the import script by hand.
 *
 * Daily (not minutes): asesores change rarely and the action also fans out a SOT
 * Clientes push per changed row, so an idle run is cheap but a frequent one would
 * re-scan the sheet for nothing. New/changed rows propagate sheet → Convex → SOT.
 */
crons.interval(
  "pull asesores from sheet",
  { hours: 24 },
  api.clients.pullAsesoresFromSheet,
  {},
);

// Fotosíntesis v2 — the reverse direction (Sheet → Convex) for all 6 SOT tabs
// (providers, lots, clients, sales, subLotes, inventory) is now event-driven,
// NOT cron-driven: a bound Apps Script captures edited cells and the manual
// "🔄 Convex Sync" button POSTs them to the convex/http.ts `/sync/foto`
// endpoint (delta mode). A periodic reconcile cron is deliberately NOT
// scheduled here — it would re-read every (mostly idle) tab on each interval,
// the exact Vercel+Sheets+Convex bandwidth cost we avoid by syncing only on
// demand. The "Sincronizar todo (completo)" menu item covers dropped edits.
// If a dormant backstop is ever wanted, gate it on an env flag so it ships off:
//   crons.interval("reconcile foto tabs", { minutes: 60 }, internal.fotoSync.runFull, {});
//   // ...with `if (process.env.FOTO_RECONCILE_CRON !== "on") return;` in the action.

// ─── GHL commerce · Áreas 2 & 4 scheduler ────────────────────────────────
//
// Replaces the spec's Cloudflare `scheduler` worker: Convex crons run natively,
// so there is no extra platform to deploy. Times are UTC; Bogotá is UTC-5.

// Recompute ambassador scores nightly. 05:00 UTC ≈ 00:00 America/Bogotá.
crons.daily(
  "ambassador scoring",
  { hourUTC: 5, minuteUTC: 0 },
  internal.ambassadors.calculateScore,
  {},
);

// Flag online carts left unpaid > 4h. 23:00 UTC ≈ 18:00 America/Bogotá.
crons.cron(
  "abandoned cart nudge",
  "0 23 * * *",
  internal.ghl.nudgeAbandoned,
  {},
);

export default crons;
