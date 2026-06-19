/**
 * Type declarations for the shared ConvexHttpClient helper (convex-client.js).
 *
 * The client is nullable (null when CONVEX_URL is unset). Every call site guards
 * with `isConvexEnabled` / `if (!convexClient)` before use, which narrows it to a
 * non-null `ConvexHttpClient` — so `.query()` / `.mutation()` calls are type-safe.
 */
import type { ConvexHttpClient } from "convex/browser";

export declare const isConvexEnabled: boolean;
export declare const convexClient: ConvexHttpClient | null;
