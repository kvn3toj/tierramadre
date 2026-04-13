/**
 * Safe dynamic imports for Convex. Allows hooks to be Convex-aware without
 * breaking the build when convex/_generated/api is not yet generated.
 *
 * Remove this file once Convex is permanent (Task 13 cleanup).
 */

// Dynamically loaded — null until import resolves. Module-level constants.
let _useQuery: typeof import('convex/react').useQuery | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _api: any = null;

try {
  const convexReact = await import('convex/react');
  _useQuery = convexReact.useQuery;
} catch {
  // convex/react not available — hooks will gracefully no-op
}

try {
  // @ts-expect-error — _generated/api may not exist yet until `npx convex dev` runs
  const generated = await import('../../convex/_generated/api');
  _api = generated.api;
} catch {
  // Generated API not available — hooks will gracefully no-op
}

export const useConvexQuery = _useQuery;
export const convexApi = _api;
export const convexReady = !!_useQuery && !!_api;
