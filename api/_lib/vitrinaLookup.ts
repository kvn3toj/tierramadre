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
  })) as { itemIds?: number[]; vencida?: boolean } | null;
  if (!doc || !Array.isArray(doc.itemIds)) return null;
  // Una vitrina VENCIDA no concede nada: `resolveGrant` la trata igual que a
  // un token que no existe y el llamante cae a `anon`, o sea sin `precioCOP`
  // en la proyección. Sin esta línea, el link vencido seguiría mostrando
  // precios en la grilla aunque la pantalla dijera «cotización vencida» — la
  // pantalla es cortesía, esto es lo que cuenta.
  if (doc.vencida) return null;
  return { itemIds: doc.itemIds };
};
