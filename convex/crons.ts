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
  {}
);

export default crons;
