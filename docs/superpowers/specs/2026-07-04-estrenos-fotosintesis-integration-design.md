# Estrenos carousel — Fotosíntesis integration

## Problem

The home page "Estrenos" (newest products) carousel appears frozen — same products for weeks. Root cause (confirmed live against production): `useNewestProducts` / `/api/get-newest-products` only scans Google Drive's `products/{item} - {name}/` folder structure for image upload dates. Since ~May 21, 2026, all new inventory has been captured through **Fotosíntesis** (this repo's own Convex-backed inventory tool, `convex/` + `src/pages/admin/Fotosintesis/`), whose photos are stored as a `fotoUrl` field on the Convex `productInventory` record — never inside that Drive folder structure. Fotosíntesis items are therefore structurally invisible to Estrenos, even though they already show up everywhere else in the public catalog (grid, search, product detail) via the existing `useFotosintesisCatalog` → `useTreasure` bridge.

This is not a caching bug. The API returns fresh (non-cached) data; both the legacy Sheet and Drive genuinely have no entries newer than May 21, 2026.

## Decisions (confirmed with user)

1. **Merge, don't replace.** Estrenos shows newest-first across both Fotosíntesis (Convex) and legacy Drive-scanned items, combined. Legacy items already in rotation don't abruptly disappear.
2. **"New" = published to catalog**, not "captured in inventory." A `publishedAt` timestamp is stamped the first time an item's `mostrarEnCatalogo` flips to `true`. An item sitting in reserve for weeks before being published still counts as new the day it's published.
3. **Individual items only.** Lote/sublote bundle cards (`isLote: true`) are excluded from Estrenos. They have no single natural photo/price and no existing publish-time tracking; adding that is out of scope here.
4. **No new Convex query, no new API endpoint, no new caching layer.** The Fotosíntesis→public-catalog data path already exists (`useFotosintesisCatalog` reads `products.publishedCatalog` reactively; `useTreasure` merges it into the `treasure` array already passed into `useNewestProducts`). This design only adds a `publishedAt` field to that existing path and a merge step in `useNewestProducts`.

## Architecture

```
Convex productInventory (mostrarEnCatalogo flips true)
        │  stamp publishedAt (once, first time — see "first publish wins" below)
        ▼
products.publishedCatalog query  →  projects publishedAt
        ▼
useFotosintesisCatalog  →  maps publishedAt onto TreasureItem
        ▼
useTreasure (existing merge, unchanged)
        │
        ▼
useNewestProducts(treasure, limit)
        │  Drive-scan candidates (existing, unchanged): sort by imageCreatedTime desc
        │  Fotosíntesis candidates (new): treasure items with publishedAt set and
        │    !isLote, sort by publishedAt desc
        │  merge both lists by their respective date, sort desc, slice to `limit`
        ▼
ProductsSection ("Estrenos" carousel) — unchanged
```

## Changes

### 1. Convex schema

`convex/schema.ts` (~line 163, next to `mostrarEnCatalogo`): add

```ts
publishedAt: v.optional(v.number()), // ms epoch; stamped once, see publishState.ts
```

### 2. Shared idempotent stamping helper

New `convex/_lib/publishState.ts`:

```ts
export function withPublishStamp(
  current:
    | { mostrarEnCatalogo?: boolean; publishedAt?: number }
    | null
    | undefined,
  next: boolean,
): { mostrarEnCatalogo: boolean; publishedAt?: number } {
  const patch: { mostrarEnCatalogo: boolean; publishedAt?: number } = {
    mostrarEnCatalogo: next,
  };
  if (next && !current?.publishedAt) patch.publishedAt = Date.now();
  return patch;
}
```

**First publish wins.** `publishedAt` is set once and never cleared or reset. This matters because `convex/lots.ts` has an existing `reopen()` → edit → `publish()` cycle: reopening a published lot demotes every member to `mostrarEnCatalogo: false` (line ~562) so nothing stays live mid-edit, then republishing flips them back to `true` (line ~488). Without the idempotency guard, every ordinary "fix a typo and republish" edit would push already-published items back to the top of Estrenos. `withPublishStamp` prevents that: `publishedAt` is only set when the current document has none yet.

There are four call sites that flip `mostrarEnCatalogo`, all of which must route through this helper instead of setting the field directly:

| Call site    | File:line                                                                                                                    | Context                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Create       | `convex/lotItems.ts:~226`                                                                                                    | New item inserted, possibly published from creation (`args.mostrarEnCatalogo`)                        |
| Update       | `convex/lotItems.ts:~626-635`                                                                                                | Single-item edit drawer toggles the flag                                                              |
| Bulk publish | `convex/lots.ts:~481-491` (`publish` mutation)                                                                               | Every item in a closed lot flips to published                                                         |
| Sheet sync   | `convex/fotoSync.ts` `upsertTable` (~line 207+) via `convex/_lib/sheetPullMaps.ts`'s `mostrarEnCatalogo: { coerce: "bool" }` | Ops edits the `mostrarEnCatalogo` cell directly in the SOT spreadsheet; delta-synced back into Convex |

Unpublish (`convex/lots.ts` `reopen`, ~line 562) is untouched — it only ever sets `mostrarEnCatalogo: false`, never touches `publishedAt`.

### 3. Query projection

`convex/products.ts` `publishedCatalog` (~lines 273-311): add `publishedAt: row.publishedAt,` to the projected object returned per row.

### 4. Frontend type + mapping

- `src/types/index.ts` `TreasureItem` (~line 282): add `publishedAt?: number`.
- `src/hooks/useFotosintesisCatalog.ts`: add `publishedAt?: number` to the `PublishedRow` interface (~line 35) and pass it through in `mapRowToTreasureItem` (~line 113). **Not** added to `mapGroupToTreasureItem` (lote bundle mapping) — group cards stay excluded from Estrenos per decision #3.

### 5. `useNewestProducts.ts` merge logic

The Drive-scan fetch, localStorage cache, and stale-while-revalidate logic (lines 57-185) are unchanged. Only the final assembly (currently lines 187-220, which maps `newestProductsData` alone) changes to:

1. Build legacy candidates from `newestProductsData` as today (each carries `imageCreatedTime` as its sort date), matched against `treasure` for full metadata.
2. Build Fotosíntesis candidates by filtering `treasure` for items with `publishedAt != null && !item.isLote`, using `publishedAt` as the sort date.
3. Concatenate both candidate lists, sort descending by sort date, slice to `limit`.

Item numbers cannot collide between the two sources (legacy and Fotosíntesis share one sequential item-number counter), so no additional dedup step is needed.

## Testing

- **`convex/_lib/publishState.test.ts`** (new, vitest — this repo already unit-tests pure `convex/_lib/*` functions this way, see `tests/productSearch.test.ts`): table-test `withPublishStamp` — first publish stamps, already-published is a no-op (timestamp preserved), unpublish clears nothing, re-publish after unpublish preserves the original timestamp.
- **`useNewestProducts` merge step**: unit test with synthetic Drive-fetch + `treasure` fixtures asserting correct interleaved sort order, `limit` slicing, and that `isLote` items are excluded even if they somehow carried a `publishedAt`.
- **Manual verification**: after deploying, confirm a Fotosíntesis item published after this change appears in the live Estrenos carousel, and that existing legacy items already in rotation still appear until pushed out by newer items from either source.

## Out of scope

- Lote/sublote bundle cards appearing in Estrenos (decision #3).
- Any change to the Drive-scan HTTP caching (`CACHE.MEDIUM`), the in-memory `folderCache` TTL, or the localStorage SWR cache for the legacy path.
- Local dev environment parity (`.env`/`.env.local` lack `VITE_CONVEX_URL`/`CONVEX_URL`, so the Fotosíntesis contribution is silently empty in local dev unless those are set) — a pre-existing environment gap, not introduced by this change.
