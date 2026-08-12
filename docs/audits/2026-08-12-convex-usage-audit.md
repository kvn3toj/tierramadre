# Convex Usage Audit — tierramadre.app (2026-08-12)

**Team:** `dev-tec` · **Project:** TM-SOT · **Prod:** `grand-hippopotamus-162` · **Dev:** `flexible-wolverine-803`
**Billing window:** Aug 01 – Aug 31, 2026 (UTC), measured 2026-08-12
**Predecessors:** [`convex-usage-audit-2026-06-15.md`](./convex-usage-audit-2026-06-15.md) · [`../specs/2026-07-21-convex-nuevo-proyecto-tm-sot.md`](../specs/2026-07-21-convex-nuevo-proyecto-tm-sot.md)

---

## Verdict: do NOT move. Two functions are 85% of the burn.

A third team migration would reset the counter and reproduce this in ~3–4 weeks, because
it does not touch the cause. The cause is two queries, both in `convex/products.ts`,
both fixable without a data migration.

---

## 1. What is actually over

Only **one** resource is over the free cap. Everything else is at or near zero:

| Resource         | Used       | Cap    | Status                     |
| ---------------- | ---------- | ------ | -------------------------- |
| **Database I/O** | **1.2 GB** | 1 GB   | 🔴 **over — the only one** |
| File Storage     | 0 B        | 1 GB   | ✅ (photos live in Drive)  |
| Data Egress      | 204.81 KB  | 1 GB   | ✅ 0.02%                   |
| Search Storage   | 0 B        | 512 MB | ✅                         |
| Search Queries   | 0 Query-GB | 3K     | ✅                         |
| Deployments      | 2          | 40     | ✅                         |

Same resource as June (then 1.12 GB), different cause. June's cause was the 15-min
sheet-pull cron; that is fixed and stayed fixed — `INVENTORY_PULL_CRON=off` and
`FOTO_RECONCILE_CRON=off` are verified live, and `convex/crons.ts` now has only six
jobs, the two expensive ones gated off and the other four daily one-shots.

## 2. Breakdown by function (Database I/O)

| #   | Function                    | Deployment | Read          | Share     |
| --- | --------------------------- | ---------- | ------------- | --------- |
| 1   | `products.publishedCatalog` | **Prod**   | **759.76 MB** | **63.3%** |
| 2   | `products.list`             | **Prod**   | **255.77 MB** | **21.3%** |
| 3   | `espejo._publicarTablero`   | Dev        | 25.90 MB      | 2.2%      |
| 4   | `products.publishedCatalog` | Dev        | 20.87 MB      | 1.7%      |
| 5   | `lotsV4._create`            | Dev        | 19.79 MB      | 1.6%      |
| 6   | `lotItems._create`          | Prod       | 16.60 MB      | 1.4%      |

**Top two = 1,015.53 MB of 1,200 MB = 84.6%.**

Rows 3 and 5 (`espejo`, `lotsV4`) do not exist on `main` — they are SOT v4 work on
branch `feat/w1-w3-sot-v4`, deployed to Dev only. Small today, but see §6.

---

## 3. The finding that explains why June's fixes did not hold

**Convex bills Database I/O on documents _scanned_, not on bytes _returned_.**

From the Convex limits documentation: Database I/O is _"document and index data
transferred between Convex functions and the underlying database"_, and explicitly,
_"data not returned due to a `filter` counts as scanned."_

Both hot queries carry extensive, well-reasoned field-projection code, with comments
stating it reduces bandwidth:

- `products.ts:103-125` — _"BANDWIDTH: project to ONLY the fields the admin list/table actually renders…"_
- `products.ts:515-521` — _"Project ONLY the fields the customer catalog consumes…"_

That projection is real work and it is not wasted — but it reduces the **Data Egress**
meter, which sits at **204.81 KB of 1 GB (0.02%)**. It does nothing for Database I/O,
because `.collect()` has already pulled the full documents out of the database before
the `.map()` on line 126 / line 522 runs.

`productInventory` is a **81-field table** (`convex/schema.ts:159-340`). Every published
row is read whole, every execution, no matter how few fields are returned.

**Implication for every fix below: the lever is the number of documents read and how
often, never the shape of what is returned.**

---

## 4. Driver #1 — `products.publishedCatalog` · 759.76 MB (63%)

**`convex/products.ts:475`**, collect at **`convex/products.ts:485-488`**.

This is the public, **anonymously-subscribed** customer catalog query. It is
index-scoped (`by_mostrarEnCatalogo`, `schema.ts:340`) — that part is correct and was
June's fix. The cost is not per-execution size; it is **execution count**.

### Why it executes so much

1. **It is subscribed from nearly every page.** `useFotosintesisCatalog`
   (`src/hooks/useFotosintesisCatalog.ts:189`) feeds `useTreasure`, which is mounted by
   at least 12 surfaces including `components/home/Home.tsx`, `pages/vitrina/VitrinaPage.tsx`
   (the public `/v/:token` shared links), `pages/ambassadors/profile/AsesorProfilePage.tsx`,
   `pages/treasure/ProductDetail/ProductDetailPage.tsx` and `components/ios/MoreSheetSearch.tsx`.
   Every anonymous visitor opens a live websocket subscription and pays one full
   execution on connect.
2. **Every write into its read set re-runs it for every connected visitor.** That is the
   multiplier: cost is `visitors × writes`, not `visitors + writes`.
3. **The read set is wider than the index.** Lines `505-508` do a `lots` point read per
   distinct `loteId`. Those lot documents join the reactive read set, so _any_ edit to a
   published lot re-runs the whole catalog for every subscriber.

### The measurement that proves it is execution count, not row count

`publishedCatalog` reads a strict subset of what `products.list` reads (published rows ⊂
all inventory rows), so its bytes-per-execution is strictly smaller. With
`B_pc < B_pl`, `759.76 = E_pc × B_pc` and `255.77 = E_pl × B_pl`:

```
E_pc  =  759.76 / B_pc  >  759.76 / B_pl  =  2.97 × (255.77 / B_pl)  =  2.97 × E_pl
```

**`publishedCatalog` executes at least 3× more often than `products.list`** — and
`products.list` is staff-gated (a handful of people) while this one is anonymous. The
true ratio is far higher. This is a traffic-and-reactivity problem.

### Fixes, in order of value

**Fix 1A — serve the catalog one-shot + cached, not as a live subscription.** _(This is
June's Fix #2, which was written up, needed sign-off, and was never applied. Verified: no
cache layer exists, and `convex/http.ts` has only the two `/sync/foto` routes.)_
A product catalog does not need realtime. Fetch once via a cached HTTP action or
`ConvexHttpClient` behind an `api/` endpoint, cache in `localStorage` with a 5–10 min TTL
the way batch thumbnails already are, refresh on navigation.
Collapses executions from `visitors × writes` to `cache misses`.

- **Estimated saving: 600–720 MB** (80–95% of 759.76 MB).
- **Risk:** medium — customers lose instant catalog updates; admins keep realtime on
  their own pages. This changes the data path and is the one item here that needs Kevin's
  sign-off on product behavior, not just on code.

**Fix 1B — denormalize `mina` / `tratamiento` onto the item at publish time.**
Deletes lines `498-513` and removes the `lots` documents from the reactive read set, so a
lot edit stops re-running the catalog for every connected visitor.

- **Estimated saving:** modest in direct bytes, but removes an entire re-run trigger. Stacks with 1A.
- **Risk:** low — same values, resolved once at publish instead of on every read.

**Fix 1C — if 1A is rejected, split the query.** Keep a tiny reactive
`publishedIndex` (`itemId` + `publishedAt` only) so new items still appear live, and serve
the 30-field payload one-shot. Preserves the realtime feel at a fraction of the scan.

- **Risk:** low–medium; more code than 1A.

## 5. Driver #2 — `products.list` · 255.77 MB (21%)

**`convex/products.ts:51`**. Two branches: indexed when `estado` is passed
(`products.ts:76-79`), **full-table `.collect()` when it is not** (`products.ts:80`).

Staff-gated, but held as a **live subscription from 11 call sites**, so it re-reads its
set on every `productInventory` write while any admin tab is open. Three call sites take
the unfiltered full-table branch:

| Call site                                                               | Passes `estado`?             |
| ----------------------------------------------------------------------- | ---------------------------- |
| `pages/admin/Fotosintesis/HomePage.tsx:59`                              | ❌ **full table**            |
| `pages/admin/Fotosintesis/ItemsPage.tsx:132`                            | ❌ **full table**            |
| `pages/admin/ProductManagement/etiquetas/EtiquetasPage.tsx:131`         | ❌ **full table**            |
| `pages/admin/ProductManagement/ProductManagementPage.tsx:276`           | ✅ (when a filter is active) |
| `pages/admin/Fotosintesis/MovimientosKardexPage.tsx:184,220,233`        | ✅                           |
| `pages/admin/Fotosintesis/components/ProductoSpotlight.tsx:165,171,175` | ✅                           |

**`HomePage.tsx:59` is the clearest win in the whole audit.** The code's own comment at
`products.ts:119` states _"Fotosíntesis HomePage → only `estado`"_ — the page reads a
single field, and pays a full 81-field table scan on every write to get it. It should call
a dedicated count/aggregate query, not `list`.

- **Fix:** give `HomePage` a purpose-built counts query; pass `estado` or paginate on
  `ItemsPage` / `EtiquetasPage`.
- **Estimated saving: 100–180 MB** (40–70% of 255.77 MB).
- **Risk:** low — admin UX only, no data-path change.

**Also worth checking:** `products.list` is called by anima-bot's `listProducts`
(`products.ts:46-49`). If the bot polls it on a timer rather than on demand, that is pure
recurring full-table cost with no user attached. Not visible from the code in this repo —
worth a look in `anima-bot/src/fotosintesis/client.ts`.

## 6. Dev deployment · 66.56 MB (5.5%) — gate it before the merge

`espejo._publicarTablero` (25.9 MB), `publishedCatalog` Dev (20.87 MB) and
`lotsV4._create` (19.79 MB) all come from `feat/w1-w3-sot-v4`, unmerged. That branch
already burns 5.5% of the team cap from a dev deployment alone, and June's audit found the
same pattern (dev crons costing as much as prod). Per the 07-21 spec §2 _"Dev = hoja, no
Convex"_, dev should not be holding catalog subscriptions at all. Worth gating before that
branch merges and its write volume lands in Prod.

---

## 7. Recommended order

| Step | Action                                                                | Saving          | Risk   | Needs sign-off |
| ---- | --------------------------------------------------------------------- | --------------- | ------ | -------------- |
| 1    | Fix 1C on `HomePage.tsx:59` — counts query instead of `products.list` | ~80–140 MB      | low    | no             |
| 2    | Fix 1B — denormalize `mina`/`tratamiento`, drop the `lots` reads      | trigger removal | low    | no             |
| 3    | Fix 1A — cache the public catalog, drop the live subscription         | ~600–720 MB     | medium | **yes**        |
| 4    | `estado` / pagination on `ItemsPage`, `EtiquetasPage`                 | ~40–60 MB       | low    | no             |
| 5    | Point dev at the sheet, not Convex (07-21 spec §2)                    | ~45 MB          | low    | no             |

**Projected result:** 1.2 GB → **~185–490 MB**, i.e. 18–49% of the free cap, with
headroom for growth. Steps 1, 2 and 4 alone (no product-behavior change, no sign-off)
land around **~950 MB** — under the cap, but without margin. Step 3 is what buys the margin.

> Backend changes need a Convex deploy to take effect (`npx convex deploy`). Editing files
> does nothing until deployed. Per project rules, git/build/deploy stays in Kevin's hands.

## 8. Open measurement

The savings above are estimates with stated methodology, derived from the Database I/O
breakdown plus the code. One screenshot would convert them into measurements: the
**Function Calls** tab of the same Usage page. Dividing 759.76 MB and 255.77 MB by their
call counts gives exact bytes-per-execution, which pins how much of driver #1 is visitor
connects versus write-triggered re-runs — and therefore how much Fix 1A specifically buys.
The ranking and the verdict do not depend on it.
