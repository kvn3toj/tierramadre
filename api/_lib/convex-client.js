/**
 * Shared ConvexHttpClient for Vercel serverless functions.
 *
 * Usage:
 *   import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
 *   if (isConvexEnabled) {
 *     const result = await convexClient.mutation(api.invitations.generate, args);
 *   }
 */

import { ConvexHttpClient } from "convex/browser";

// Trim env values — Vercel can leak trailing newlines when vars are pasted via CLI/dashboard.
const CONVEX_URL = process.env.CONVEX_URL?.trim();
const DATA_SOURCE = process.env.DATA_SOURCE?.trim();

// Convex is the production backend. The frontend reads from Convex whenever
// VITE_CONVEX_URL is set (src/lib/convex-safe.ts), so the API must WRITE to
// Convex under the same condition — otherwise reads/writes split-brain
// (invitations, product views, guest pricing would land in Sheets while the UI
// reads them from Convex, and no cron syncs them back). So the gate fires on
// CONVEX_URL presence; DATA_SOURCE="sheets" is an explicit kill-switch to force
// the legacy Sheets path (e.g. an incident rollback).
//
// ⚠️ For this to stay coherent, CONVEX_URL must be set everywhere VITE_CONVEX_URL
// is. See .env.example.
export const isConvexEnabled = !!CONVEX_URL && DATA_SOURCE !== "sheets";

// Divergence guard: warn once at cold start if CONVEX_URL is present but
// DATA_SOURCE is set to something other than the two understood values. This
// catches a deployment that still relied on the old DATA_SOURCE==="convex" gate
// (or a typo) instead of silently flipping behavior.
if (
  CONVEX_URL &&
  DATA_SOURCE &&
  DATA_SOURCE !== "convex" &&
  DATA_SOURCE !== "sheets"
) {
  console.warn(
    `[convex-client] CONVEX_URL is set but DATA_SOURCE="${DATA_SOURCE}" (expected "convex" or "sheets"). Treating Convex as ENABLED.`,
  );
}

export const convexClient = CONVEX_URL
  ? new ConvexHttpClient(CONVEX_URL)
  : null;
