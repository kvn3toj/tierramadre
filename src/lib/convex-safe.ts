/**
 * Safe wrapper for Convex client hooks.
 *
 * When `VITE_CONVEX_URL` is missing (e.g. preview deploys without env vars),
 * the hooks become no-ops: queries return `undefined` (matches Convex's
 * "loading" state, which pages already tolerate via `?? []`) and mutations
 * throw a clear error so callers can surface it instead of crashing the tree.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useAction, useConvex } from 'convex/react';
import type { FunctionReference } from 'convex/server';
import { api } from '../../convex/_generated/api';
import { requireAuthTokenOrLogout } from '../utils/sessionToken';

export const convexReady = !!import.meta.env.VITE_CONVEX_URL;
export const convexApi = api;

function makeUnconfiguredError(kind: 'mutation' | 'action') {
  return () =>
    Promise.reject(
      new Error(
        `Convex ${kind} unavailable: VITE_CONVEX_URL is not configured for this deployment.`,
      ),
    );
}

const noopQuery = (() => undefined) as unknown as typeof useQuery;
const noopMutation = (() =>
  makeUnconfiguredError('mutation')) as unknown as typeof useMutation;
const noopAction = (() =>
  makeUnconfiguredError('action')) as unknown as typeof useAction;

export const useConvexQuery = convexReady ? useQuery : noopQuery;
export const useConvexMutation = convexReady ? useMutation : noopMutation;
export const useConvexAction = convexReady ? useAction : noopAction;

// Imperative client for one-shot queries/mutations at commit time (the
// Fotosynthia execute layer resolves refs + dispatches mutations on demand
// rather than holding always-on subscriptions). Returns null when Convex is
// unconfigured so callers can degrade gracefully instead of throwing at mount.
const noopConvexClient = (() => null) as unknown as typeof useConvex;
export const useConvexClient = convexReady ? useConvex : noopConvexClient;

/**
 * Like useConvexAction, but automatically attaches a fresh Google ID token to
 * every call. The staff-only Fotosíntesis actions (sales/lots/lotItems/
 * subLotes/providers/clients) all verify this token server-side via
 * requireAccessLevel (convex/_lib/authz.ts) — AdminRoute only hides the UI,
 * this is the real gate. Callers pass every arg except `idToken`.
 */
export function useAuthedConvexAction<Args extends { idToken: string }, Result>(
  actionRef: FunctionReference<'action', 'public', Args, Result>,
) {
  const run = useConvexAction(actionRef) as unknown as (
    args: Args,
  ) => Promise<Result>;
  return useCallback(
    (args: Omit<Args, 'idToken'>) => {
      const idToken = requireAuthTokenOrLogout();
      if (!idToken) {
        return Promise.reject(
          new Error(
            'No autenticado. Volvé a iniciar sesión e intentá de nuevo.',
          ),
        );
      }
      return run({ ...args, idToken } as Args);
    },
    [run],
  );
}
