/**
 * Public-catalog invalidation sentinel — Fix 1C of
 * docs/audits/2026-08-12-convex-usage-audit.md.
 *
 * ## The problem this solves
 *
 * Convex bills Database I/O on documents **scanned**, not on bytes returned
 * (the docs are explicit: "data not returned due to a `filter` counts as
 * scanned"). `products.publishedCatalog` was an anonymously-subscribed
 * reactive query that `.collect()`s every published row — 81-field documents —
 * on each visitor connect AND again, for every connected visitor, on every
 * write into its read set. Cost scaled as `visitors × writes`. It burned
 * 759.76 MB in Aug 2026: 63% of the entire team's 1 GB quota.
 *
 * There is no cheap way to *watch* rows in Convex. A "narrow" reactive query
 * over the same rows scans exactly the same bytes, because `.collect()` returns
 * whole documents and there is no projection at the database layer. Reading
 * less means reading FEWER and SMALLER documents — never fewer fields.
 *
 * Hence this table: visitors subscribe to ONE ~100-byte document instead of the
 * whole catalog, and refetch the heavy payload as a one-shot only when it moves.
 *
 * ## The invariant, and why a missed bump is survivable
 *
 * Every mutation that changes what the public catalog renders should call
 * `bumpCatalogVersion`. That is a real invariant across several write paths,
 * and the honest risk is that a future one forgets.
 *
 * So the client does NOT trust this sentinel alone: it also applies a TTL
 * (see `CATALOG_CACHE_TTL_MS` in src/hooks/useFotosintesisCatalog.ts). A missed
 * bump therefore degrades to "stale for up to the TTL" — exactly the behaviour
 * of a plain cached catalog — and never to "stale forever". The sentinel buys
 * seconds-level freshness for the changes that matter; the TTL is the floor
 * that makes forgetting it a performance nit rather than a correctness bug.
 *
 * The change that most needs the sentinel is a SALE: with a TTL alone, a stone
 * that just sold stays visible in the catalog for the length of the window, and
 * for one-of-a-kind emeralds that means two customers believing they can buy
 * the same stone.
 */

import type { MutationCtx } from '../_generated/server';

/**
 * Increment the catalog sentinel. Call from any mutation that changes what
 * `products.publishedCatalog` returns — publish/unpublish, `estado`
 * transitions (above all a sale), price, photo, or the projected Fotosíntesis
 * characteristics.
 *
 * Lazily seeds the singleton on first use. Cost is one document read plus one
 * write, against a one-row table — negligible next to the full-catalog scan it
 * saves on the read side.
 *
 * Never throws: a failed bump must not roll back the business write that
 * triggered it. The TTL floor covers the miss.
 */
export async function bumpCatalogVersion(ctx: MutationCtx): Promise<void> {
  try {
    const existing = await ctx.db.query('catalogVersion').first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        v: existing.v + 1,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.insert('catalogVersion', { v: 1, updatedAt: Date.now() });
  } catch (err) {
    // Swallowed deliberately — see the doc comment above. Surfacing this would
    // fail a sale or an edit over a cache hint.
    console.error(
      '[catalogVersion] bump failed (cache falls back to TTL)',
      err,
    );
  }
}

/** Minimal shape needed to decide whether a row is catalog-visible. */
type PublishState = { mostrarEnCatalogo?: boolean } | null | undefined;

/**
 * Bump ONLY when the touched row is, or is becoming, publicly visible.
 *
 * ⚠️ This guard is not an optimization — it is load-bearing. Every bump
 * invalidates the cached catalog for EVERY visitor, and each invalidation costs
 * one full `publishedCatalog` scan per active client. Bumping indiscriminately
 * would reproduce the exact blow-up Fix 1C removes: the daily sheet pull alone
 * touches hundreds of rows, almost all unpublished, and would otherwise
 * invalidate the catalog hundreds of times for nothing.
 *
 * Pass the row as it was BEFORE the patch and as it will be AFTER. Either side
 * being published is enough — an unpublish has to invalidate too, or the piece
 * lingers in every visitor's cache after being pulled from the catalog.
 */
export async function bumpCatalogVersionIfPublished(
  ctx: MutationCtx,
  before: PublishState,
  after: PublishState,
): Promise<void> {
  const wasVisible = before?.mostrarEnCatalogo === true;
  const isVisible = after?.mostrarEnCatalogo === true;
  if (!wasVisible && !isVisible) return;
  await bumpCatalogVersion(ctx);
}
