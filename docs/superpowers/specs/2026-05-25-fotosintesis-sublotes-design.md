# Fotosíntesis — Sub-lotes (Sub-batches) Design

- **Date:** 2026-05-25
- **Status:** Implemented 2026-05-25 (uncommitted on `main`, full `npm run build` green). See "Implementation notes" below for two deviations made during the build.
- **Area:** Fotosíntesis admin (`/admin/fotosintesis`)
- **Author:** Brainstormed with Claude (Opus 4.7)

## Problem

A large lote ("batch") arrives from a provider and is registered with many items.
The team wants to **group selected items from that lote into named sub-batches in
order to sell them**, while **keeping every sub-batch traceable back to the original
lote**. No lote→lote relationship exists today; lotes only link to a provider.

## Requirements (confirmed with user)

1. The **original lote stays the source of truth** — its strict accounting
   (preponderancia = 100%, `unidadesDeclaradas`, derived `costoBaseCOP`) is untouched.
2. A **sub-batch is a named group of items** drawn from one parent lote.
3. A sub-batch is **not** a sale. It can later **pre-fill a Venta** ("group first,
   sell later"). The existing Venta remains the real transaction.
4. The **same item may belong to multiple sub-batches simultaneously** (no
   cross-bundle exclusivity; uniqueness is only enforced at actual sale time, which
   the existing Venta flow already handles).
5. Sub-batches **sync to a new Google Sheets tab**, mirroring how `lots` and `sales`
   already sync (membership stored as a comma-separated item-ID list, exactly like
   `sales.itemIds` → `itemIdsJoined`).

## Assumed defaults (override if desired)

These two were presented with recommendations; this draft assumes the recommended
option. Flag either to change before implementation.

- **ID scheme:** hierarchical `{parentLoteId}-G{n}` → `B-001-G1`, `B-001-G2`
  (`G` = grupo). Makes the parent visible at a glance. Alternative: flat global
  sequence `SL-0001`.
- **Parent gating:** sub-batches can be created/edited when the parent lote is
  `cerrado` or `publicado` (items finalized); blocked on `cancelado`. Alternative:
  also allow `abierto`.

## Approaches considered

- **A — Dedicated `subLotes` table holding an `itemIds` list. ✅ Chosen.**
  Mirrors the proven `sales` pattern, links to parent via `parentLoteId`, syncs to a
  new tab. Natively supports an item living in multiple sub-batches. Full Sheets
  visibility. Leaves the lote's strict accounting alone.
- **B — Reuse `lots` with `parentLoteId` + `tipo:"sublote"`. ❌ Rejected.**
  Lote accounting (preponderancia 100%, `unidadesDeclaradas`, single `providerId`,
  `costoTotalCOP`) is meaningless for a curated sale-bundle, and the lot→item 1:N
  model breaks requirement 4 (an item has exactly one `loteId`).
- **C — Extend `sales` to allow draft/parent bundles. ❌ Rejected as storage.**
  A sub-batch is explicitly not a sale; sales force one client and sale-time
  exclusivity, conflicting with many-to-many bundles. Sales remain the _conversion
  target_, not the storage model.

## Data model

New Convex table `subLotes` (with the shared `...syncFields` spread:
`rowIndex`, `lastPulledAt`, `lastPushedAt`, `syncStatus`, `syncError`).

| Field           | Type                            | Notes                                                         |
| --------------- | ------------------------------- | ------------------------------------------------------------- |
| `subLoteId`     | `v.string()`                    | Natural key, e.g. `B-001-G1`. Allocated via `sequences`.      |
| `parentLoteId`  | `v.string()`                    | FK → `lots.loteId`. The traceability link.                    |
| `sede`          | `v.union("B","C","S","M")`      | Derived from parent lote.                                     |
| `nombre`        | `v.string()`                    | Bundle name, e.g. "Verdes alta gema".                         |
| `itemIds`       | `v.array(v.string())`           | Members → `productInventory.itemId`. Mirrors `sales.itemIds`. |
| `unidades`      | `v.number()`                    | Derived: `itemIds.length`.                                    |
| `totalCostoCOP` | `v.number()`                    | Derived: Σ member `costoBaseCOP`. Never user-set (BR-S3).     |
| `notas`         | `v.optional(v.string())`        |                                                               |
| `estado`        | `v.union("activa","archivada")` | Loose lifecycle.                                              |
| `createdAt`     | `v.string()`                    | ISO timestamp.                                                |

Indexes: `by_subLoteId`, `by_parentLote` (`["parentLoteId"]`), `by_estado`,
`by_rowIndex`, `by_syncStatus`.

**No new join table.** Membership lives as `itemIds` on the record (the `sales`
precedent), which handles "one item in many sub-batches" for free. Items keep their
original `productInventory.loteId` untouched — traceability holds on both sides.

## Business rules (server-enforced in mutations)

- **BR-S1 — same-parent only:** every item added must satisfy
  `item.loteId === parentLoteId`. Reject items from other lotes.
- **BR-S2 — no exclusivity:** an item may belong to multiple sub-batches. No
  cross-bundle uniqueness check (deliberate, per requirement 4).
- **BR-S3 — derived figures:** `unidades` and `totalCostoCOP` are always recomputed
  from `itemIds` on every mutation; never accepted from the client.
- **BR-S4 — parent gating:** create/edit allowed when parent `estado ∈ {cerrado,
publicado}`; rejected when `cancelado` (and `abierto` unless that gating is relaxed).
- **BR-S5 — dedupe membership:** `itemIds` is de-duplicated on write.

## Backend — `convex/subLotes.ts`

Mutations/queries (each mutation recomputes derived fields and schedules a Sheets push):

- `create({ parentLoteId, nombre, notas?, itemIds[] })` → allocates `subLoteId` via
  `allocateNext(ctx, sublotSequenceName(parentLoteId))`, validates BR-S1/S4,
  dedupes, computes derived fields, inserts with `estado:"activa"`, schedules
  `_pushToSheet({ mode:"append" })`.
- `addItems({ subLoteId, itemIds[] })` / `removeItems({ subLoteId, itemIds[] })` —
  mutate membership, re-derive, schedule patch push.
- `updateMeta({ subLoteId, nombre?, notas? })`.
- `archive({ subLoteId })` → `estado:"archivada"`.
- `list({ parentLoteId })` / `get({ subLoteId })` (queries for the UI).
- `_pushToSheet({ id, mode })` — internal, mirrors `lots._pushToSheet` /
  `products.pushToSheet`; denormalizes `itemIds` → `itemIdsJoined`.
- Pull-sync wiring so manual Sheet edits flow back, consistent with the other tabs.

Sequence helper (in `convex/sequences.ts`): `sublotSequenceName(parentLoteId)` →
`` `sublot:${parentLoteId}` ``; format `` `${parentLoteId}-G${n}` ``.

## Google Sheets sync — new `subLotes` tab

Column order (`COLUMN_MAPS.subLotes`):

| Col | Field           | Notes                                                 |
| --- | --------------- | ----------------------------------------------------- |
| A   | `subLoteId`     | Natural key (patch safety check).                     |
| B   | `parentLoteId`  |                                                       |
| C   | `sede`          |                                                       |
| D   | `nombre`        |                                                       |
| E   | `itemIdsJoined` | Comma-separated, denormalized at push (like `sales`). |
| F   | `unidades`      |                                                       |
| G   | `totalCostoCOP` |                                                       |
| H   | `estado`        |                                                       |
| I   | `notas`         |                                                       |
| J   | `createdAt`     |                                                       |

Touch-points that MUST stay aligned (per `columnMaps.ts` header note):

1. `convex/_lib/columnMaps.ts` — add `subLotes` to `FotoTable` union + `COLUMN_MAPS`.
2. `api/_lib/admin-table-config.ts` — add `TABLE_CONFIGS` entry + `idColumn:"subLoteId"`.
3. **Physical Sheets tab** — create a `subLotes` tab with the headers above (manual
   setup step; documented at hand-off).

## UI & routes

- **`/admin/fotosintesis/lots/:loteId/sublotes`** — list this lote's sub-batches +
  "New sub-batch" drawer: name it, multi-select items from the lote (thumbnails +
  cost), running `unidades`/`totalCosto`, save.
- **Sub-batch card** — name, item count, total cost, estado; actions: edit members,
  archive, **"Vender este grupo."**
- **Sell conversion** — "Vender este grupo" navigates to
  `/admin/fotosintesis/sales/new?fromSubLote=B-001-G1`, pre-filling the Venta's
  `itemIds`. The Venta stays the real transaction.
- **Entry points** — a "Sub-lotes" action on the lote summary page (`LoteResumenPage`)
  - a count badge on HomePage lote rows.

New components (under `src/pages/admin/Fotosintesis/`):
`SubLotesPage.tsx`, `components/SubLoteCard.tsx`, `components/NewSubLoteDrawer.tsx`,
`components/SubLoteItemPicker.tsx`; hook `hooks/useSubLotes.ts`. Routes added in
`src/App.tsx`. `VentaPage.tsx` reads the `fromSubLote` query param to pre-fill items.

## Files to create / modify

**Create**

- `convex/subLotes.ts`
- `src/pages/admin/Fotosintesis/SubLotesPage.tsx`
- `src/pages/admin/Fotosintesis/components/{SubLoteCard,NewSubLoteDrawer,SubLoteItemPicker}.tsx`
- `src/pages/admin/Fotosintesis/hooks/useSubLotes.ts`

**Modify**

- `convex/schema.ts` — add `subLotes` table.
- `convex/sequences.ts` — `sublotSequenceName` + sublote ID formatter.
- `convex/_lib/columnMaps.ts` — `FotoTable` + `COLUMN_MAPS.subLotes`.
- `api/_lib/admin-table-config.ts` — `TABLE_CONFIGS.subLotes` + `idColumn`.
- `src/App.tsx` — sub-lotes route.
- `src/pages/admin/Fotosintesis/LoteResumenPage.tsx` — entry point.
- `src/pages/admin/Fotosintesis/HomePage.tsx` — count badge.
- `src/pages/admin/Fotosintesis/VentaPage.tsx` — `fromSubLote` pre-fill.

## Out of scope (YAGNI for now)

- Per-sub-batch sale price / quote PDF.
- Auto-marking a sub-batch "vendida" when its items sell (ambiguous under
  many-to-many membership).
- Drag-and-drop reordering of members.
- Sub-batches spanning multiple parent lotes (BR-S1 forbids this by design).

## Implementation notes (deviations from the design above)

Two things surfaced while reading the real code; both were resolved conservatively
to avoid destabilizing the sales flow:

1. **Sell-conversion uses the existing per-item `?itemId=` param, NOT a multi-item
   `?fromSubLote=` prefill.** `VentaPage` is a _single-item_ sale flow
   (`itemId: string | null`, one product per Venta). Rebuilding it into a
   multi-item sale just to "sell a whole bundle" is a much larger, riskier change
   than this feature warrants. So each member item in a sub-lote card carries a
   "Vender" link to `/admin/fotosintesis/sales/new?itemId=<id>` (a param the Venta
   page already honors). **`VentaPage.tsx` was not modified.** Selling stays
   item-by-item through the proven path; the sub-lote provides the grouping +
   traceability. A true multi-item Venta is a separate future slice.

2. **Entry point is the HomePage lote list, not `LoteResumenPage`.**
   `LoteResumenPage` is the close-flow for _open_ lotes and redirects away once a
   lote isn't `abierto`, so it can't host a `cerrado`/`publicado` entry point. The
   sub-lote link instead lives on each `cerrado` row in `HomePage.tsx` (a `Boxes`
   icon-link in the column those rows already reserve), plus the page is reachable
   by direct URL. Published lotes aren't in the HomePage "active" list today;
   they reach sub-lotes by URL until a dedicated lote-detail page exists.

### Manual setup still required

The code pushes sub-lotes to a Sheets tab matched by patterns
`["sublotes", "sub-lotes", ...]`, but the **physical tab does not exist yet**.
Until someone creates a `Sublotes` tab in the Fotosíntesis spreadsheet with the
header row `subLoteId | parentLoteId | sede | nombre | itemIds | unidades |
totalCostoCOP | estado | notas | createdAt` (cols A–J), every sub-lote mutation
will succeed in Convex/UI but its background Sheets push will mark
`syncStatus: "error"` (handled gracefully, retryable via `subLotes.retryPush`).
The schema + sync wiring also reach the live deployment only after the next
`convex deploy` (runs automatically via `build:vercel` on push to `main`).

## Open questions for reviewer

1. Confirm ID scheme: `B-001-G1` (assumed) vs flat `SL-0001`.
2. Confirm parent gating: `cerrado`/`publicado` only (assumed) vs also `abierto`.
3. Any extra fields the team needs on the Sheets tab (e.g. responsible operator,
   target buyer note)?
