# Convex Usage Audit — tierramadre.app

**Date:** 2026-06-15
**Deployment:** `wonderful-tortoise-984.convex.cloud` (team Heaven, production)
**Goal:** Bring monthly usage back under the free-tier cap so the Starter plan charges ≈ $0.

---

## UPDATE 2026-06-15 — confirmed from the Usage tab

The only resource over the free cap is **Database Bandwidth: 1.12 GB / 1 GB**
(team-wide, summed across all projects + deployments). Everything else is well
under: function calls 89K/1M, DB storage 25 MB/512 MB, file storage 2.6 MB/1 GB.

**TM-dev-2 is a minor contributor (16K function calls).** The team pool is
dominated by **coomunity-mvp-v2 (72K)** — chiefly `notifications.deliverDueCampaigns`
(~21K/mo) — and by **dev deployments running crons** (deliverDueCampaigns is 21K in
Dev *as well as* Prod; TM `pullFromSheet` is 4.2K Dev vs 1.4K Prod).

So the TM-side ranking below is secondary. The real levers, in order:

1. **Gate crons off on dev/preview deployments** — biggest free win. Applied to TM
   via a `DISABLE_CRONS` env flag in `convex/crons.ts`. Apply the same pattern to
   **coomunity-mvp-v2's** `crons.ts` (separate repo) — that's where the bandwidth is.
2. Widen / optimize coomunity-mvp-v2's `deliverDueCampaigns` (runs ~every 2 min).
3. The TM fixes below still trim TM's slice but won't move the team cap much alone.

---

## TL;DR

The codebase is already well-optimized: the sheet-pull cron skips no-op writes
(delta-aware), and the public catalog query is index-scoped with minimal field
projection. The remaining drains are a few **traffic-independent** patterns that
run forever regardless of how many customers visit — which fits a "small business
that still blew the cap" profile.

**Before changing anything, confirm the actual resource** in the Convex dashboard:
Team **Heaven** → **Team Settings → Usage**. It tells you whether you hit
*function calls*, *database I/O*, or *egress* — and that decides which fixes below
matter most. The ranking here assumes the steady, always-on costs are the culprit.

Also set a **spend limit** on the Starter plan (Billing tab) as a hard guardrail.

---

## Ranked drivers + fixes

### 1. 15-min full-table reconcile read — `convex/products.ts:1236`  ⬅ most likely top burner

```ts
// inside _upsertManyFromSheet (runs every cron pull)
const existingItems = await ctx.db.query("productInventory").collect();
```

Every 15 minutes the cron reads the **entire** `productInventory` mirror
(thousands of legacy rows) to diff it against the sheet — **96 full-table scans/day,
~2,880/month**, whether or not anything changed. The *write* side is already
delta-gated (`products.ts:1285-1289`), but the *read* is unconditional. This is
pure database I/O/egress with zero customer dependency.

- **Fix A (safe, 1 line):** widen the interval in `convex/crons.ts:24` from
  `{ minutes: 15 }` → `{ minutes: 30 }` (or 60). The in-file comment confirms this
  cron only controls how fast *out-of-band sheet edits* appear in the **admin**
  panel, and the toolbar "Resync from sheet" button covers urgent cases. 30 min
  halves this cost; 60 min quarters it. Customers are unaffected.
- **Fix B (bigger, optional):** gate the pull on a cheap "changed since" signal so
  it only does the full reconcile when the sheet actually changed (e.g. a sheet
  `lastEdited` cell or a row-count/hash check before the `.collect()`).
- **Impact:** high. **Risk:** low (Fix A is reversible and within the documented
  freshness envelope).

### 2. Public catalog live subscriptions — `src/hooks/useTreasure.ts` → `products.publishedCatalog` / `publishedGroups`

The customer Treasure Browser opens a **persistent websocket subscription** per
visitor to `publishedCatalog` (`products.ts:224`) and `publishedGroups`
(`products.ts:291`). Cost scales with traffic: one query execution on every
visitor connect, plus a re-run for all connected visitors whenever a *published*
row changes. The queries themselves are already lean (index-scoped to
`mostrarEnCatalogo`, minimal field projection) — good — but a product catalog
doesn't need realtime.

- **Fix:** serve the public catalog as a **cached one-shot** instead of a live
  subscription — fetch once via the `/sync`-style HTTP route or `ConvexHttpClient`,
  cache in `localStorage` with a short TTL (e.g. 5-10 min) the way thumbnails are
  cached, and refresh on navigation rather than holding an open subscription.
- **Impact:** high **if** the Usage tab points at function calls/egress and you
  have real catalog traffic. **Risk:** medium — customers lose instant realtime
  updates (acceptable for a catalog; admins still see realtime on their own pages).
  Needs your sign-off because it changes the data path.

### 3. Admin full-table `.collect()` subscriptions

Admin pages hold live subscriptions to full-table queries that re-read the whole
table on every write while the page is open:

- `products.list` (no `estado` filter) → `productInventory.collect()` — `products.ts:59`
  - mounted live in `ProductManagementPage.tsx:269` and `HomePage.tsx:55`
- `sales.list`, `lots.list`, `clients.list`, `providers.list` — `HomePage.tsx`,
  `LotesPage.tsx`, `DirectorioPage.tsx`, `VentaPage.tsx`

Bounded by staff count (a few people), but a single admin leaving the dashboard
open all day = continuous full-table re-reads on every cron/edit write.

- **Fix:** pass an `estado` filter (uses the `by_estado` index) where the page only
  needs available stock; paginate the legacy product list; or make the heaviest
  lists one-shot with a manual "refresh" affordance.
- **Impact:** medium. **Risk:** low-medium (admin UX only).

### 4. `productViews` — per-view insert + unbounded growth

`productViews.track` (`convex/productViews.ts:8`) inserts one row per product view
(a function call + write each), and the table has **no cleanup** — it grows
forever, so storage creeps up month over month.

- **Fix A:** session-dedupe — skip `track()` if the same `sessionId`+`itemId` was
  already recorded this session (cuts repeat-view function calls).
- **Fix B:** add a cleanup cron that deletes `productViews` older than N months
  (e.g. keep 6 months) to cap storage.
- **Impact:** low-medium (function calls scale with browsing; storage is a slow
  creep). **Risk:** low — Fix A slightly coarsens analytics granularity; Fix B
  drops old history (confirm retention you want).

---

## Recommended order

1. **Now (non-code):** add payment method on team Heaven → Starter; set a spend
   limit; read the Usage tab to confirm the resource.
2. **Quick win:** Fix #1A (cron 15 → 30/60 min). One line, reversible. Deploy.
3. **If Usage points at function calls/egress + you have catalog traffic:** Fix #2
   (cache the public catalog).
4. **Housekeeping:** Fix #4B (productViews cleanup cron) to stop storage creep.

> All backend changes require a Convex deploy to take effect
> (`npx convex deploy`, or your normal pipeline). Editing the files alone does
> nothing until deployed. Per project rules, git/build/deploy stays in your hands.
