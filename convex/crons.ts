import { cronJobs } from 'convex/server';
import { api, internal } from './_generated/api';

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
 * reads the mirror to reconcile (Convex DB bandwidth) — the single biggest
 * recurring Convex-bandwidth consumer.
 *
 * FREE-TIER POLICY (spreadsheet-first, 2026-07-21): the SPREADSHEET is the
 * source of truth and dev reads it directly, so Convex must not burn bandwidth
 * polling all day. Throttled from 15 min → DAILY (96 pulls/day → 1). Urgent
 * out-of-band sheet edits are covered by the toolbar's manual "Resync from
 * sheet" button and the event-driven `/sync/foto` delta endpoint (Apps Script +
 * "🔄 Convex Sync"). To pause even the daily pull, set env `INVENTORY_PULL_CRON`
 * to anything other than "on" — `_pullFromSheet` no-ops (see products.ts).
 */
crons.interval(
  'pull inventory from sheet',
  { hours: 24 },
  internal.products._pullFromSheetCron,
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
  'pull asesores from sheet',
  { hours: 24 },
  api.clients.pullAsesoresFromSheet,
  {},
);

// Fotosíntesis v2 — the reverse direction (Sheet → Convex) for all 6 SOT tabs
// (providers, lots, clients, sales, subLotes, inventory) is event-driven, NOT
// cron-driven: a bound Apps Script captures edited cells and the manual
// "🔄 Convex Sync" button POSTs them to the convex/http.ts `/sync/foto`
// endpoint (delta mode). A periodic reconcile would re-read every (mostly idle)
// tab on each interval — the exact Vercel+Sheets+Convex bandwidth we avoid by
// syncing on demand — so the backstop below ships OFF: `reconcileBackstop`
// no-ops unless `FOTO_RECONCILE_CRON === "on"`. Flip that env flag to close the
// gap where an out-of-band SOT cell edit (e.g. Inventario `estado`) would
// otherwise wait for the manual "Sincronizar todo (completo)" button.
crons.interval(
  'reconcile foto tabs (backstop)',
  { minutes: 60 },
  internal.fotoSync.reconcileBackstop,
  {},
);

// ─── SOT v4 · Rescate del espejo ──────────────────────────────────────────
//
// El espejo v4 drena por EVENTO: cada mutación que encola agenda su propio
// `espejo:drenar` con `runAfter(0)`, así que el costo es proporcional a los
// eventos reales (decenas al día), no al barrido de 513 filas que apagó los
// crons de v3.
//
// Este cron es el segundo piso, no el motor: recoge lo que quedó atascado
// porque Sheets estaba caído, el token venció o la acción agendada murió. Cada
// fallo incrementa `intentos` en la fila, así que un atasco permanente queda
// visible en vez de reintentarse en silencio para siempre.
//
// Sale APAGADO (`ESPEJO_CRON`), igual que los otros dos. Encenderlo en prod es
// una decisión con medición detrás — el consumo se mide en la doble corrida.
crons.interval(
  'rescate del espejo v4',
  { minutes: 30 },
  internal.espejo.rescatar,
  {},
);

// ─── GHL commerce · Áreas 2 & 4 scheduler ────────────────────────────────
//
// Replaces the spec's Cloudflare `scheduler` worker: Convex crons run natively,
// so there is no extra platform to deploy. Times are UTC; Bogotá is UTC-5.

// Recompute ambassador scores nightly. 05:00 UTC ≈ 00:00 America/Bogotá.
crons.daily(
  'ambassador scoring',
  { hourUTC: 5, minuteUTC: 0 },
  internal.ambassadors.calculateScore,
  {},
);

// Flag online carts left unpaid > 4h. 23:00 UTC ≈ 18:00 America/Bogotá.
crons.cron(
  'abandoned cart nudge',
  '0 23 * * *',
  internal.ghl.nudgeAbandoned,
  {},
);

// Tag contacts with an unanswered outbound message older than 7 days
// (`sin-respuesta-7d`, scored −10 by Manage Scoring — GHL has no native
// trigger for this; see convex/ghl.ts::tagInactiveContacts). 07:00 UTC ≈
// 02:00 America/Bogotá — off-peak, clear of the 05:00 and 23:00 crons.
crons.cron(
  'tag inactive contacts (sin-respuesta-7d)',
  '0 7 * * *',
  internal.ghl.tagInactiveContacts,
  {},
);

export default crons;
