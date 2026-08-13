/**
 * Shared write path for the `mostrarEnCatalogo` publish flag. Every call
 * site that can flip this flag (lotItems.create, lotItems.updateGemaFields,
 * lots.publish, and the Sheet→Convex delta sync in fotoSync.ts) must route
 * through this helper instead of setting the field directly, so `publishedAt`
 * is stamped exactly once, the first time an item is published — and so the
 * lot's denormalized provenance (`mina` / `tratamiento`) is stamped alongside
 * it. Routing a new publish site around this helper will silently ship items
 * to the public catalog with no provenance; there is a test for that.
 *
 * "First publish wins": lots.reopen() demotes a published lot back to
 * mostrarEnCatalogo:false so it can be edited, then lots.publish() flips it
 * back to true. Without this guard, that ordinary edit-and-republish cycle
 * would push already-published items back to the top of the Estrenos
 * carousel every time. The returned patch omits `publishedAt` whenever no
 * new stamp is needed, so a caller spreading it into a db.patch() call never
 * overwrites an existing timestamp with undefined.
 */
import type { QueryCtx } from '../_generated/server';

export interface LotProvenance {
  mina?: string;
  tratamiento?: string;
}

/**
 * Resolve a lot's provenance for denormalization onto an item at publish time.
 *
 * One point read on the `by_loteId` index, and only on the publish transition —
 * a write path that runs rarely. It replaces the per-execution `lots` lookup the
 * public catalog used to do on EVERY read, for every anonymous visitor.
 *
 * Returns `undefined` when there is no lote (legacy/orphan rows, which the
 * public catalog excludes anyway) or the lote is missing.
 */
export async function lotProvenance(
  ctx: QueryCtx,
  loteId: string | undefined,
): Promise<LotProvenance | undefined> {
  if (!loteId) return undefined;
  const lot = await ctx.db
    .query('lots')
    .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
    .first();
  if (!lot) return undefined;
  return { mina: lot.mina, tratamiento: lot.tratamiento };
}

export interface PublishPatch extends LotProvenance {
  mostrarEnCatalogo: boolean;
  publishedAt?: number;
}

export function withPublishStamp(
  current:
    | { mostrarEnCatalogo?: boolean; publishedAt?: number }
    | null
    | undefined,
  next: boolean,
  provenance?: LotProvenance,
): PublishPatch {
  const patch: PublishPatch = {
    mostrarEnCatalogo: next,
  };
  if (next && !current?.publishedAt) {
    patch.publishedAt = Date.now();
  }
  // BANDWIDTH: denormalize the lot's `mina` / `tratamiento` onto the item at
  // publish time so `products.publishedCatalog` can read them straight off the
  // row. It used to resolve them with a per-lote `lots` point read on EVERY
  // execution (products.ts:498-513), which put those lot documents into the
  // query's reactive read set — so any write to a published lot, including the
  // routine `_markPushed` / `_markPushFailed` after each sheet push, re-ran the
  // whole public catalog for every connected anonymous visitor.
  // See docs/audits/2026-08-12-convex-usage-audit.md §4, Fix 1B.
  //
  // Re-stamped on EVERY publish, not just the first (unlike `publishedAt`): a
  // reopen → edit → republish cycle can legitimately change the lot's mina or
  // tratamiento, and the catalog must show the current value.
  if (next && provenance) {
    patch.mina = provenance.mina;
    patch.tratamiento = provenance.tratamiento;
  }
  return patch;
}
