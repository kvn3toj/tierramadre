/**
 * Safe wrapper for Convex client hooks.
 *
 * When `VITE_CONVEX_URL` is missing (e.g. preview deploys without env vars),
 * the hooks become no-ops: queries return `undefined` (matches Convex's
 * "loading" state, which pages already tolerate via `?? []`) and mutations
 * throw a clear error so callers can surface it instead of crashing the tree.
 */

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export const convexReady = !!import.meta.env.VITE_CONVEX_URL;
export const convexApi = api;

function makeUnconfiguredError(kind: "mutation" | "action") {
  return () =>
    Promise.reject(
      new Error(
        `Convex ${kind} unavailable: VITE_CONVEX_URL is not configured for this deployment.`,
      ),
    );
}

const noopQuery = (() => undefined) as unknown as typeof useQuery;
const noopMutation = (() =>
  makeUnconfiguredError("mutation")) as unknown as typeof useMutation;
const noopAction = (() =>
  makeUnconfiguredError("action")) as unknown as typeof useAction;

export const useConvexQuery = convexReady ? useQuery : noopQuery;
export const useConvexMutation = convexReady ? useMutation : noopMutation;
export const useConvexAction = convexReady ? useAction : noopAction;
