/**
 * Fix 1C — the catalog invalidation sentinel's decision logic.
 *
 * See convex/_lib/catalogVersion.ts and
 * docs/audits/2026-08-12-convex-usage-audit.md §4.
 *
 * What these tests protect is the GUARD, not the counter. Bumping is harmless
 * in isolation; bumping too often is not. Every bump invalidates the cached
 * catalog for every visitor, and each invalidation costs one full
 * `publishedCatalog` scan per active client — the exact cost Fix 1C removes.
 * The daily sheet pull touches hundreds of rows, nearly all unpublished, so an
 * unguarded bump would reproduce the original blow-up through a different door.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  bumpCatalogVersion,
  bumpCatalogVersionIfPublished,
} from '../convex/_lib/catalogVersion';

/** Minimal MutationCtx double — only the `db` surface the helper touches. */
function makeCtx(existing: { _id: string; v: number } | null) {
  const patch = vi.fn(async () => {});
  const insert = vi.fn(async () => 'new-id');
  return {
    ctx: {
      db: {
        query: () => ({ first: async () => existing }),
        patch,
        insert,
      },
    } as never,
    patch,
    insert,
  };
}

describe('bumpCatalogVersion', () => {
  it('increments the existing singleton', async () => {
    const { ctx, patch, insert } = makeCtx({ _id: 'cv1', v: 7 });
    await bumpCatalogVersion(ctx);
    expect(insert).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch.mock.calls[0][1]).toMatchObject({ v: 8 });
  });

  it('seeds the singleton the first time', async () => {
    const { ctx, patch, insert } = makeCtx(null);
    await bumpCatalogVersion(ctx);
    expect(patch).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][1]).toMatchObject({ v: 1 });
  });

  it('never throws — a failed bump must not roll back the business write', async () => {
    const ctx = {
      db: {
        query: () => ({
          first: async () => {
            throw new Error('db exploded');
          },
        }),
      },
    } as never;
    await expect(bumpCatalogVersion(ctx)).resolves.toBeUndefined();
  });
});

describe('bumpCatalogVersionIfPublished — the load-bearing guard', () => {
  it('does NOT bump when the row is unpublished before and after', async () => {
    // The common case: the sheet pull and most admin edits touch reserved rows.
    const { ctx, patch, insert } = makeCtx({ _id: 'cv1', v: 3 });
    await bumpCatalogVersionIfPublished(
      ctx,
      { mostrarEnCatalogo: false },
      { mostrarEnCatalogo: false },
    );
    expect(patch).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('bumps when an already-published row changes (the SALE case)', async () => {
    const { ctx, patch } = makeCtx({ _id: 'cv1', v: 3 });
    await bumpCatalogVersionIfPublished(
      ctx,
      { mostrarEnCatalogo: true },
      { mostrarEnCatalogo: true },
    );
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('bumps on publish (false → true)', async () => {
    const { ctx, patch } = makeCtx({ _id: 'cv1', v: 3 });
    await bumpCatalogVersionIfPublished(
      ctx,
      { mostrarEnCatalogo: false },
      { mostrarEnCatalogo: true },
    );
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('bumps on UNpublish (true → false) — else the piece lingers in every cache', async () => {
    const { ctx, patch } = makeCtx({ _id: 'cv1', v: 3 });
    await bumpCatalogVersionIfPublished(
      ctx,
      { mostrarEnCatalogo: true },
      { mostrarEnCatalogo: false },
    );
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('treats absent/undefined mostrarEnCatalogo as unpublished', async () => {
    // Legacy rows predate the flag; they are not in the public catalog.
    const { ctx, patch, insert } = makeCtx({ _id: 'cv1', v: 3 });
    await bumpCatalogVersionIfPublished(ctx, {}, {});
    await bumpCatalogVersionIfPublished(ctx, null, undefined);
    expect(patch).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
