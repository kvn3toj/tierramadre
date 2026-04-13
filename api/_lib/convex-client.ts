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

const CONVEX_URL = process.env.CONVEX_URL;

export const isConvexEnabled = process.env.DATA_SOURCE === "convex" && !!CONVEX_URL;

export const convexClient = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null;
