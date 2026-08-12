/**
 * Resolves a stateful vitrina token to its item ids via Convex.
 * Returns null for anything that does not resolve — resolveGrant treats that
 * exactly like "no credential presented".
 */
import { convexClient, isConvexEnabled } from './convex-client.js';
import { api } from '../../convex/_generated/api.js';
import type { VitrinaLookup } from './catalogGrant.js';

export const lookupVitrina: VitrinaLookup = async (token) => {
  if (!isConvexEnabled || !convexClient) return null;
  const doc = (await convexClient.query(api.vitrinas.getByToken, {
    token,
  })) as { itemIds?: number[] } | null;
  if (!doc || !Array.isArray(doc.itemIds)) return null;
  return { itemIds: doc.itemIds };
};
