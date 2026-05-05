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

export const isConvexEnabled = DATA_SOURCE === "convex" && !!CONVEX_URL;

export const convexClient = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null;
