/**
 * Safe wrapper for Convex client hooks.
 *
 * Exposes static imports so builds work with any ES target. The
 * `convexReady` flag is derived from `VITE_CONVEX_URL` to let hooks
 * gracefully skip Convex queries when the client wasn't configured.
 */

import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const useConvexQuery = useQuery;
export const useConvexMutation = useMutation;
export const useConvexAction = useAction;
export const convexApi = api;
export const convexReady = !!import.meta.env.VITE_CONVEX_URL;
