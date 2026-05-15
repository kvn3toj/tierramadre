# Fotosíntesis admin redesign — design spec

**Date:** 2026-05-06
**Status:** Approved (awaiting plan)
**Branch:** `feature/fotosintesis-redesign` (to create)
**Replaces:** the just-shipped `LedgerHero` redesign on `main` (2026-05-06, uncommitted) — that work served as a stepping stone; this redesign supersedes it.

---

## Why

The current `/admin/products` page (codename **Fotosíntesis**) is a flat ledger: title hero, sticky toolbar, list of rows, edit drawer. It supports search, filter, bulk mark-as-sold/available, and a Convex sync.

Two gaps:

1. **No product-pattern intelligence.** Admins can see _what_ is sold, but not _what kinds_ of products tend to sell — color × calidad × peso × procedencia coincidences. The data exists (sold items, audit log); we just don't surface it.
2. **No "+ Add product" entry point.** New products only enter the catalog by editing the Google Sheet manually. The admin can edit and sync but cannot create.

The redesign also pivots the visual language. The atelier (Cormorant + brass + paper) and the contemporary admin (LedgerHero) experiments are both replaced by **the rest of the app's vocabulary** — liquid glass + iOS-semantic + emerald — applied with restraint: pure cool neutrals, emerald as the only chromatic accent, and a single signature element (chroma-sampled rows) that no other admin tool has.

---

## Intent

**Who.** Kevin + 2–4 collaborators inside Tierra Madre. Mix of admins and asesores. Spanish-speaking, working in COP. Open the tool between phone calls and mine visits — switching context fast.

**What.** Find a stone → see what similar stones have sold and at what price → update its status, price, location, or images → know who else is touching it. Plus: add a brand-new stone the moment it arrives at the workshop.

**Feel.** A jeweler's bench at midday. Surfaces neutral so chroma sings. Instruments precise but not cold. Not generic SaaS. Not antique editorial.

---

## Design vocabulary

### Domain

- **Bandeja** — the velvet-lined tray a jeweler slides a stone onto for examination. The persistent inspector panel is a bandeja.
- **Loupe / 10x** — magnification by hand, not by zoom. A circular detail window for the selected stone.
- **Jardín** — the inclusions Colombian emeralds are known for. Identity, not flaw.
- **Veta** — the geological vein where stones form. Metaphor for the row's left edge.
- **Procedencia** — Muzo / Cosquez / Chivor / Coscuez. Provenance is identity in this market.
- **Quilates** — carat weight; precision matters, two decimals always.
- **Patrón** — the recurring (color × calidad × peso × procedencia) combinations that have sold multiple times. Read like geological strata.

### Color world (cool neutrals + emerald only)

| Token                       | Light     | Dark      | Use                                     |
| --------------------------- | --------- | --------- | --------------------------------------- |
| `paper` / `vault`           | `#FFFFFF` | `#0B0D0C` | Canvas                                  |
| `paper-soft` / `vault-2`    | `#FAFAFA` | `#131614` | Bandeja background, hover               |
| `paper-mute` / `vault-3`    | `#F4F5F4` | `#1B1F1D` | Inputs, cards inside bandeja            |
| `paper-edge` / `vault-edge` | `#EAECEB` | `#262B28` | Subtle separators                       |
| `ink` / `vault-ink`         | `#0B100E` | `#EFF1EF` | Primary text                            |
| `ink-2` / `vault-ink-2`     | `#4A5251` | `#B0B6B3` | Secondary text                          |
| `ink-3` / `vault-ink-3`     | `#8B9290` | `#7B807E` | Tertiary text, labels                   |
| `emerald`                   | `#005C42` | `#7CCDA9` | Primary accent (mode-aware)             |
| `gold`                      | `#C9A24C` | `#C9A24C` | ASESOR status pip only (existing token) |
| `crimson`                   | `#B33A2F` | `#B33A2F` | VENDIDA status pip only                 |

Hairlines: `rgba(11,16,14,0.06)` light / `rgba(255,255,255,0.05)` dark.
Rules: `rgba(11,16,14,0.10)` light / `rgba(255,255,255,0.09)` dark.
Strong edges: `rgba(11,16,14,0.18)` light / `rgba(255,255,255,0.18)` dark.

**No cream, no umber, no warm undertones.** Existing `atelier` and `calcita` tokens are not used here.

### Signature — _chroma sampling_

Every product row's left edge takes its color from the dominant chroma of the stone's photo. Scrolling the ledger feels like walking past a tray of stones — the ambient color shifts. The bandeja inherits the selected stone's chroma as a subtle inner-glow on the active row.

**Implementation.** Client-side sampling on the existing thumbnail URL: load the thumbnail to an offscreen canvas at the size already cached, sample a 1×1 downscale, store hex in a `useChromaSamples(thumbnails)` hook with a 24h `localStorage` cache (parallel to `useBatchThumbnails`). No server changes; no new API endpoint.

Fallback when no thumbnail or sampling fails: emerald token at 40% opacity.

### Defaults rejected

| Default                      | Replaced with                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 4-tile KPI row               | One live count + sparkline + 3 micro counters (right-aligned, mono digits). One consequential number, ambient context.                   |
| Thumbnail → name → price row | Chroma bar (5×38 px) → carat (mono, big) → thumbnail → name + procedencia → price → status pip. The eye lands on color and weight first. |
| Inspector with stacked tabs  | Bandeja: stone hero + loupe (one continuous surface) + three flat cards (Patrones, Historial, Bloqueo). No tabset.                       |

---

## Architecture

### Layout (Workbench Split)

```
┌─────────────────────────────────────────────────────────────┐
│  HERO (full-bleed, glass strip on scroll)                   │
│   Atelier · Inventario                                       │
│   Fotosíntesis                          [+ Nueva piedra]     │
│   ┌────────────────────────────────┐    [Resincronizar]      │
│   │  482   ▁▃▅█▆█  Disp 312 ●     │    ● Sincr · hace 4 min │
│   │  EN EL ESPEJO   Asesor 88 ●    │                         │
│   │                  Vend  82 ●    │                         │
│   └────────────────────────────────┘                         │
├─────────────────────────────────────┬───────────────────────┤
│  TOOLBAR  search · seg · filtros    │   BANDEJA              │
├─────────────────────────────────────┤   ┌────────────────┐   │
│  ║ 2.40CT  [thumb]  Venus       … │   │ stone hero +   │   │
│  │ 3.12CT  [thumb]  Esperanza   ● │   │ loupe          │   │
│  ║ 1.80CT  [thumb]  Aurora       ● │   └────────────────┘   │
│  ║ 4.21CT  [thumb]  Selene       ● │   ┌ Patrones ──────┐   │
│  ║ 2.05CT  [thumb]  Verde Mar   ● │   │ bar chart      │   │
│  ║ 1.55CT  [thumb]  Lluvia       ● │   └────────────────┘   │
│                                     │   ┌ Historial ─────┐   │
│                                     │   │ activity feed  │   │
│                                     │   └────────────────┘   │
│                                     │   ┌ Bloqueo ───────┐   │
│                                     │   │ lock state     │   │
│                                     │   └────────────────┘   │
└─────────────────────────────────────┴───────────────────────┘
                                       (BulkActionBar fixed bottom)
```

- Desktop ≥ `1080px`: split is `1.6fr 1fr`, bandeja persistent.
- Tablet `768–1079px`: ledger full width, bandeja becomes a right-side **sheet** that opens on row click and overlays at 480px width.
- Phone `< 768px`: bandeja is a bottom sheet (snap to 60vh, drag to expand).

When **no row is selected**, the bandeja shows an "overview" state: the patrones card lists the global top combinations, historial shows the last 5 admin edits across all items, and the lock card lists items currently locked. Empty state never feels empty.

### Component map

```
ProductManagementPage.tsx                  REWRITE
├── FotoHero.tsx                           NEW   (replaces LedgerHero)
├── AdminToolbar.tsx                       SIMPLIFY (search · segmented · filters)
├── InventoryRow.tsx                       REWRITE (chroma bar + new column order)
├── ChromaBar.tsx                          NEW
├── Bandeja.tsx                            NEW
│   ├── StoneHero.tsx                      NEW   (image + loupe + meta)
│   ├── PatronCard.tsx                     NEW   (proportional bar chart)
│   ├── HistorialCard.tsx                  NEW   (activity rows)
│   └── BloqueoCard.tsx                    NEW   (lock state)
├── EditDrawer.tsx                         EXTEND (adds "create" mode)
├── StatusPip.tsx                          KEEP
├── BulkActionBar.tsx                      EXTRACT (was inline in ProductManagementPage)
└── hooks/
    ├── useBatchThumbnails.ts              KEEP
    ├── useChromaSamples.ts                NEW   (client-side dominant color)
    └── usePatrones.ts                     NEW   (patron query wrapper)
```

`LedgerHero.tsx` is **deleted** — its surface vocabulary (Cormorant, brass, watermark gem, Roman numerals) is incompatible with the new direction. Its layout (breadcrumb + title + lead + meter) inspired the new `FotoHero` but no code is reused.

---

## Data layer

### Convex changes

**File: `convex/products.ts`**

1. **NEW mutation: `createProduct`**
   - Args: `{ itemId, editorEmail, editorName, fields: Partial<ProductFields> }`
   - Validates `itemId` is unique in `productInventory`
   - Determines next `rowIndex` (max + 1 in the table)
   - Inserts the doc with `syncStatus: "pending"` and `lastPulledAt: now`
   - Inserts a `productEdits` row with all fields as `before: null → after: <value>`
   - Schedules `pushToSheet` action with `mode: "append"` (new flag)

2. **NEW query: `patronesFor`**
   - Args: `{ itemId: string, lookbackDays?: number = 90 }`
   - Returns `{ combos: Array<{ key, label, count, medianPriceCOP }>, total }` where each combo is similar items that **sold** in the lookback window.
   - "Similar" = same `coleccion` if known; same `procedencia` (parsed from `coleccion` or `nombre`); same quality bucket (A/AA/AAA); peso within ±0.5 ct.
   - Sorted desc by `count`, top 5 returned.

3. **NEW query: `patronesGlobalTop`** (for bandeja's no-selection state)
   - Args: `{ lookbackDays?: number = 90 }`
   - Returns the top 5 attribute combinations across **all** sold items.

4. **NEW query: `recentEdits`**
   - Args: `{ limit?: number = 5 }`
   - Returns the last N `productEdits` (any item) — for the bandeja overview state.

5. **MODIFY action: `pushToSheet`**
   - Add `mode: "patch" | "append"` (default `"patch"`).
   - When `mode === "append"`, call `sheets.spreadsheets.values.append` instead of `update` for the new row.

**File: `convex/schema.ts`**

No schema changes. All new features read existing fields.

### Frontend hooks

**`src/hooks/useChromaSamples.ts`** — new.

```ts
export function useChromaSamples(thumbnails: Record<number, { url: string }>): {
  samples: Record<number, string>;
  ready: boolean;
};
```

- Reads thumbnails URL map.
- For each URL not already in `localStorage["tm-chroma-samples-v1"]`, queues a load via `Image()`, draws to a 1×1 canvas, reads the pixel, converts to hex.
- Persists to `localStorage` (cap at 1000 entries, LRU pruning).
- TTL 7 days (regenerated if the thumbnail URL changes).
- Returns the map synchronously from cache, hydrates async.

**`src/hooks/usePatrones.ts`** — thin wrapper around `useConvexQuery(api.products.patronesFor, ...)` with `'skip'` when no item selected.

---

## New features

### 1. + Nueva piedra (create flow)

- Hero button `+ Nueva piedra` opens the existing `EditDrawer` in **create mode**.
- Create mode differences from edit mode:
  - Title: "Nueva piedra" instead of `<itemId> · <nombre>`.
  - Save button reads "Crear y sincronizar" instead of "Guardar".
  - All fields blank (no `before` values).
  - `itemId` field is **required** and validated against `productInventory.by_itemId`.
  - `pushToSheet` runs in `mode: "append"`.
- After save: drawer closes, toast `Creada · {itemId} · sincronizando con la hoja`, the new row appears in the list (Convex reactivity).
- Conflict UX: if `itemId` is already taken, inline error "Ya existe una piedra con este número" before submission.

### 2. Patrones (coincidences)

- Bandeja shows top 5 combos for the selected item.
- Bar chart: full-width bar = top combo, proportional widths for others.
- Below: median price across the combo (helpful for pricing the current item against its cohort).
- No selection → top 5 global combos.

### 3. Quick-inline edit (price, ubicacion, coleccion)

- Cell hover shows a `╱` cursor + 1px right-edge accent.
- Click → cell becomes an `<input>` inline (price uses formatted COP, ubicacion/coleccion use a select with existing values + free entry).
- Enter or blur saves via `saveEdit` mutation (single field).
- Esc cancels.
- Lock claim happens on edit start; released on save/cancel.

### 4. Bulk price / coleccion / ubicacion

- Extend `BulkActionBar`. Today: mark available, mark sold.
- Add three new buttons:
  - **Cambiar precio** → opens a small popover: `[+/-] [number] [%/$]` — applies a delta or sets absolute. Confirms.
  - **Cambiar colección** → popover with combobox of existing collections.
  - **Cambiar ubicación** → popover with combobox of existing locations.
- All four call `saveEditMany` with a partial patch.

### 5. Audit history (Historial card)

- Bandeja's Historial card shows the latest 5 entries from `productEdits` for the selected item.
- Format: `<editor> <action> · hace <relative>`. e.g., `Ana editó precio · hace 2 d`.
- Click "Ver más" → expands to last 20 entries inline.
- No new query needed — `editHistory` already exists in `convex/products.ts`.

### 6. Lock indicator (Bloqueo card + row)

- Row: when `productLocks` has an entry for the row's `itemId`, show a small lock dot in the status column (after the estado pip), tinted gold if `holderEmail !== currentUser`, neutral if it's me.
- Bandeja's Bloqueo card: "Libre · ningún editor activo" or "Ana edita esta piedra · hace 38 s · [Solicitar control]".
- "Solicitar control" calls `claimLock` with force flag (releases the existing lock if it's older than 30s of inactivity).

### 7. Image health flag

- Row uses the existing `useBatchThumbnails` map. When `thumbnails[itemId]` is `undefined` and the row is loaded, show a tiny ⊘ icon next to the carat — "sin imagen". No new mechanism; just surfacing the existing data.
- (Direct image upload from the admin is **out of scope**, see below.)

### 8. Theme awareness

- Page uses `useTheme().palette.mode` to pick `light | dark` token sets.
- All new components consume tokens via a single `useFotoTokens(mode)` helper that returns the resolved palette object — keeps tokens out of inline styles and makes the swap easy.

---

## States

| State                        | Behavior                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading (Convex `undefined`) | 8 row skeletons in the ledger; bandeja shows 4 skeleton cards. Hero shows the live count as `—`.                                                                                               |
| Empty (no products)          | Existing `EmptyState` reused, restyled to new tokens.                                                                                                                                          |
| Filtered empty               | "Sin coincidencias" + suggestion to clear filters.                                                                                                                                             |
| Convex unavailable           | Existing `ConvexUnavailable` reused, restyled.                                                                                                                                                 |
| Resyncing                    | Spark dot pulses faster (~600ms); button shows "Sincronizando…".                                                                                                                               |
| Push pending                 | Row's status pip gets a 3px hairline ring (existing pattern).                                                                                                                                  |
| Push errored                 | Row's status pip turns crimson; clicking opens a small "Reintentar" popover that calls `retryPush`.                                                                                            |
| Lock conflict                | When opening a row that's locked by someone else, bandeja's stone hero shows a 30%-opacity overlay + "Ana edita esta piedra" + "Solicitar control" CTA. Drawer cannot open until lock claimed. |

---

## Migration plan

The current `LedgerHero` redesign on `main` is uncommitted. We:

1. Create `feature/fotosintesis-redesign` from `main`.
2. Delete `LedgerHero.tsx` (its uncommitted improvements to `AdminToolbar.tsx`, `ProductManagementPage.tsx`, `InventoryRow.tsx`, `IOSMoreSheet.tsx`, `e2e/admin-products.spec.ts` — keep the Convex/state/test changes; revert only the visual ones).
3. Build new components fresh in this branch.
4. Existing E2E spec (`e2e/admin-products.spec.ts`) needs updating for new selectors but the seeded fixture and overall flow stay the same.
5. Merge to `main` once visual QA + e2e pass.

The new `Bandeja` panel is an **additive** UI surface — no data model changes, no API breakage, no consumer outside `/admin/products` sees any difference.

---

## Out of scope (phase 2)

These are deliberately deferred:

- **Direct image upload from admin** (today images go via Drive folder; a "Subir imagen" inside Bandeja's StoneHero requires Drive API write + auth integration that's heavier than this redesign).
- **CSV / PDF export** of the filtered view.
- **Saved views / pinned filters** ("Muzo AAA 2-3ct under $5M" → one click).
- **Snapshots / freeze in time** (end-of-month inventory PDF).
- **Heatmap** of color × calidad (the proposals showed it but the Patrones bar chart is sufficient for v1).

These are documented so we don't lose them, but they don't ship in this redesign.

---

## Testing

- **Unit (Vitest):** `useChromaSamples` (deterministic with a stub canvas), patron-bucket logic (peso ±0.5 ct, quality buckets), createProduct duplicate-itemId rejection.
- **E2E (Playwright):** existing `admin-products.spec.ts` updated for new selectors. New cases: "+ Nueva piedra → fill → save → row appears", "click row → bandeja shows stone hero", "lock conflict → cannot edit", "patrones card shows 5 combos when an item with sold cohorts is selected".
- **Visual QA:** desktop light, desktop dark, tablet light, phone bottom-sheet — manually before merge.

---

## Risks & open questions

- **Chroma sampling cost.** First-load samples ~500 thumbnails on the client. Each is one canvas read on a 200-pixel image → ≈ 1 ms each, so ~500 ms total spread over the load. Acceptable. Cached after first load.
- **Patrones query cost.** `patronesFor` scans `productInventory` filtered by `estado === "VENDIDA"` then groups in memory. With ≈ 80 sold items today and typical fan-out of 5 buckets, this is O(80) per query. Convex indexes `by_estado` so the filter is index-scan; no concern at current data volume.
- **Lock takeover semantics.** "Solicitar control" force-releases after 30s of inactivity — needs a definition of "inactivity" (`claimedAt` is creation time; we don't have a `lastActivityAt`). Decision for the plan: rely on `expiresAt` (5-min auto-expire from current schema) and only allow force-release after `claimedAt > 30s`.
- **Auto theme handoff.** The rest of the app uses `getAtelier(theme.palette.mode)`. We're introducing a new token namespace. Decision for the plan: add `getFoto(mode)` next to `getAtelier(mode)` in the design system; do not modify `atelier`.

---

## What gets shipped

A redesigned `/admin/products` that:

- Uses cool neutrals + emerald only — theme-aware, both modes first-class.
- Shows one consequential live count + sparkline + 3 micro counters in a quiet hero.
- Surfaces every product row as a chroma-sampled band — the row's color is the stone's color.
- Holds a persistent Bandeja inspector with stone hero + loupe + Patrones + Historial + Bloqueo.
- Lets admins create new products from the page (`+ Nueva piedra`).
- Surfaces existing audit and lock data that today is captured but invisible.
- Adds bulk price / colección / ubicación on top of the existing bulk-mark.
- Adds quick-inline edit for price, ubicación, colección directly in the row.

No new routes. No data model changes. No breaking changes to the public app.
