# `tipo_interes` → `categoria` — empirical mapping analysis

> Corte: **2 jul 2026**. Proposal for human review — **inferred, NOT confirmed by the
> business team.** Do NOT wire into `rankProducts` until the team validates it.

## TL;DR (read this first)

**An empirical `tipo_interes` (piece type) → `categoria` (collection) mapping CANNOT be
reliably derived from the available data, because the two fields describe *orthogonal*
things.** `tipo_interes` is a **jewelry-piece type** (topito, candonga, anillo, dije…),
while `categoria` is a **loose-gem / cut taxonomy** (Gema Facetada, Muralla, Gola, Raíz,
Piedra Natural). The catalog is ~93% loose emeralds, so almost no product name or
categoria carries piece-type signal. See the frequency tables below for the evidence, and
the "Recommendation" section for what to do instead.

## Data source (proxy — live Convex was not reachable)

Live Convex export was **not possible in this environment**: no `CONVEX_DEPLOYMENT` /
deploy key is present (`npx convex run` errors with *"No CONVEX_DEPLOYMENT set"*), so
`productInventory` could not be queried directly.

Proxy used instead: the most recent cached SOT-Inventario snapshot committed in the repo —
`scripts/.backups/inventario-reorder-2026-05-27T21-45-50-038Z.json` (a raw Google Sheets
`values` dump of the *Inventario* tab, the same sheet the `products.pullFromSheet` cron
mirrors into `productInventory`). Cross-checked against
`scripts/.backups/inventario-delete-col-l-2026-05-29T10-37-10-691Z.json` — consistent.

**Caveats:**
- Snapshot is from **27 May 2026**; the live table has grown since (GHL status doc notes
  ~386 total rows / 59 published as of 1 Jul). Of the 368 snapshot rows, only **45 have
  any name/categoria content** (the rest are empty sheet rows).
- The snapshot's `categoria` distribution nonetheless **matches the live one reported in
  `GHL/ESTADO-Y-PROXIMOS-PASOS.md`** (Gema Facetada / Muralla / Gola / Raíz / Piedra
  Natural + a block of uncategorized), so it is a fair structural proxy for the taxonomy —
  even if absolute counts are lower than production.

## `categoria` distribution (45 rows with content)

| categoria       | count |
| --------------- | ----- |
| Gema Facetada   | 14    |
| Muralla         | 10    |
| (sin categoría) | 9     |
| Gola            | 6     |
| Raíz            | 5     |
| Piedra Natural  | 1     |

## Frequency table: piece-type keyword → categoria of matching products

Each `tipo_interes` keyword was pattern-matched (accent-insensitive) against every
product's **`Nombre` + `tipoJoya` + `subtipoForm`** text (the widest name/description
signal available in the sheet).

| tipo_interes  | total matches | categoria breakdown of matches                          | confidence |
| ------------- | ------------- | ------------------------------------------------------- | ---------- |
| `topito`      | 1             | 1 (sin categoría)                                       | ⚠️ none    |
| `candonga`    | 0             | —                                                       | ⚠️ none    |
| `anillo`      | 1             | 1 (sin categoría)                                       | ⚠️ none    |
| `dije`        | 1             | 1 Muralla                                               | ⚠️ none    |
| `gema_suelta` | 25            | 14 Gema Facetada · 6 Gola · 4 Raíz · 1 Piedra Natural   | ⚠️ low†    |
| `set`         | 0             | —                                                       | ⚠️ none    |
| `otro`        | n/a           | (catch-all, not mapped)                                 | n/a        |

† `gema_suelta` "matches" 25 rows only because its regex (`gema|piedra|facetad|suelt…`)
overlaps the *loose-gem* taxonomy itself — it is matching the categoria vocabulary, not an
independent product-name signal. Every piece-type flagged for the business (`topito`,
`candonga`, `anillo`, `dije`, `set`) matches **≤ 1 product** → **all are low-confidence
by the "< 5 matches" rule; effectively unmappable.**

## Why the mapping doesn't exist in the data (root cause)

The `subtipoForm` column is the tell:

| subtipoForm                | count | meaning                    |
| -------------------------- | ----- | -------------------------- |
| `Gema`                     | 25    | loose emerald (a stone)    |
| (vacío)                    | 13    | unclassified               |
| `Lote` / `LOTE DE JOYAS`   | 5     | a lot/batch                |
| `Joya`                     | 2     | a finished jewelry piece   |

Only **2 of 45** rows are finished jewelry (`Joya`); **25 are loose gems** (`Gema`). And
the handful of rows that DO carry a real piece type live in the **`tipoJoya`** column —
which is populated on just **5–6 rows**, and those rows have an **empty `categoria`**:

| Nombre                          | categoria | tipoJoya       |
| ------------------------------- | --------- | -------------- |
| La grandeza de Dios             | Muralla   | Dije           |
| Rocas Seleccionadas             | Muralla   | Murralla       |
| Canutillos Asteroides Verdes III| Muralla   | Murralla       |
| Monturas Topitos Plata Rodinada | *(empty)* | Topitos Peq    |
| Ancestrales del Mar             | *(empty)* | Aretes         |
| Belleza Del Caribe              | *(empty)* | Anillo Mujer   |

So the three actual finished-jewelry pieces (Topito, Aretes, Anillo) have **no
categoria at all**, and product *names* are poetic ("Belleza Del Caribe", "La grandeza de
Dios") rather than descriptive — they carry zero piece-type signal.

**Conclusion:** `categoria` ≠ a piece-type axis. It classifies the *emerald* (cut/origin
collection), not the *jewelry form*. A `tipo_interes → categoria` lookup would be mapping
between two unrelated dimensions, and the data confirms there's no empirical basis for it.

## Proposed mapping (LOW CONFIDENCE — do not ship without team sign-off)

Given the catalog is overwhelmingly loose emeralds and the piece-type signal is nearly
absent, the only defensible "mapping" is a **weak default toward the dominant loose-gem
collections**, with everything flagged low-confidence:

| tipo_interes  | proposed categoria (best guess) | basis                                        | confidence |
| ------------- | ------------------------------- | -------------------------------------------- | ---------- |
| `gema_suelta` | `Gema Facetada`                 | modal categoria among loose-gem rows (14/25) | ⚠️ low     |
| `anillo`      | *(no reliable mapping)*         | 1 match, uncategorized                        | ❌ none     |
| `topito`      | *(no reliable mapping)*         | 1 match, uncategorized                        | ❌ none     |
| `candonga`    | *(no reliable mapping)*         | 0 matches                                     | ❌ none     |
| `dije`        | *(no reliable mapping)*         | 1 match (Muralla) — n=1, not significant      | ❌ none     |
| `set`         | *(no reliable mapping)*         | 0 matches                                     | ❌ none     |
| `otro`        | *(no mapping — leave open)*     | catch-all                                     | n/a        |

Every row except `gema_suelta` has **< 5 matching products** → all flagged low/no
confidence per the stated threshold. `gema_suelta` clears the count only by matching the
categoria vocabulary itself, so even it is not a true independent signal.

## Recommendation (for the business team)

The current `rankProducts` fix already handles this correctly: it **degrades gracefully**
to in-budget options when `categoria` (fed from `{{contact.tipo_interes}}`) matches
nothing — which, per this analysis, is essentially always. Rather than a fabricated
piece→collection lookup, the durable fix is one of:

1. **Add a real piece-type field to the catalog.** Populate `tipoJoya` (or a new
   `formaJoya`) across inventory so `tipo_interes` can match a like-for-like axis. This is
   the only path to a *correct* mapping. (Note: the catalog is ~93% loose gems today, so
   most pieces would legitimately map to "gema suelta".)
2. **Have the team hand-author the map** as a business decision (they know which collection
   they'd steer an "anillo" lead toward), rather than inferring it from thin data.
3. **Keep the current graceful degradation** (budget-based) until (1) or (2) lands — no
   code change needed; the bot already returns sensible in-budget pieces.

## How to wire this in IF approved

The plug-in point is `convex/_lib/productSearch.ts::rankProducts`. Today the `categoria`
argument flows straight from `{{contact.tipo_interes}}` and is used as a soft ranking
signal (strict pass first, then in-budget fallback). To insert a piece-type → collection
lookup, normalise the incoming value **before** the categoria comparison:

- In `rankProducts`, where the `categoria` criterion is read (the strict-match pass that
  compares `intent.categoria` against each product's `categoria`), add a translation step:

  ```ts
  // At the top of productSearch.ts (proposal — values TBD by the business team):
  const TIPO_INTERES_TO_CATEGORIA: Record<string, string> = {
    gema_suelta: "Gema Facetada", // ⚠️ low confidence — see GHL/tipo-interes-mapping-analysis.md
    // anillo / topito / candonga / dije / set: intentionally UNMAPPED (fall through to budget)
  };

  // Inside rankProducts, before the strict categoria filter:
  const effectiveCategoria =
    (criteria.categoria &&
      TIPO_INTERES_TO_CATEGORIA[criteria.categoria.toLowerCase()]) ||
    criteria.categoria;
  ```

  Then feed `effectiveCategoria` into the existing categoria comparison instead of the raw
  `criteria.categoria`. Unmapped piece types keep flowing through to the current in-budget
  fallback (no regression). Add TDD cases in `tests/productSearch.test.ts` mirroring the
  existing "falls back to in-budget…" tests, asserting that a mapped `tipo_interes` now
  strict-matches its collection while an unmapped one still degrades.

**Do not implement this yet** — the lookup values above are inferred, not confirmed. Ship
only after the team validates (or replaces) the table.
