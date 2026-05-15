import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

/**
 * Pull the latest inventory from Google Sheets every 5 minutes.
 * Pending/error rows are not clobbered — see _upsertFromSheet.
 */
crons.interval(
  "pull inventory from sheet",
  { minutes: 5 },
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
