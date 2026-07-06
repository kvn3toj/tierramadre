/**
 * Pure product ranking for the GHL bot's `search-products` tool, kept free of
 * Convex IO so it is unit-testable (see tests/productSearch.test.ts). The
 * `ghl.searchProducts` query reads `productInventory` then delegates the
 * filter + rank here.
 *
 * Contract (GHL/02-SUPABASE §4 + 06-FLUJOS flow 1): return AT MOST 3 published
 * products within a 20% budget margin, ranked by piece-type match then price.
 * Reads the REAL catalog mirror — only rows the admin has flagged
 * `mostrarEnCatalogo` (or legacy rows) whose estado is SHAREABLE are eligible.
 *
 * Shareable estados (Kevin req 2026-07-06): `DISPONIBLE` AND `VENDIDA`. Thin
 * live-stock categories (e.g. anillos de compromiso) would otherwise return an
 * empty/short result, so sold pieces are surfaced as style references — the
 * `ghl.searchProducts` caller marks them `disponible:false` so a client can be
 * shown they're examples, not buyable. Any OTHER estado (ASESOR / APARTADA / …)
 * is never shared.
 *
 * Qualitative price (Kevin req 2026-07-06): when the client gives no numeric
 * budget but a tier hint ("precio moderado" → `priceTier:'moderado'`), results
 * are drawn as an evenly-spread sample across the matching price band, so the
 * client sees genuinely DIFFERENT prices instead of three near-identical
 * cheapest pieces. See `PriceTier`, `tierBand`, `spreadAcross`, `selectByPrice`.
 *
 * Piece-type matching (2026-07-04 fix, see GHL/tipo-interes-mapping-analysis.md):
 * the GHL bot passes `criteria.categoria = {{contact.tipo_interes}}` — a
 * customer-facing piece-type intent (topito/candonga/anillo/dije/gema_suelta/
 * set/otro). The catalog's OWN `categoria` field is an unrelated axis (gem
 * cut/collection: "Gema Facetada"/"Muralla"/"Gola"/"Raíz"/"Piedra Natural") —
 * comparing the two directly can never match by construction, which used to
 * force every search into the budget-only fallback. `tipoJoya` (populated on
 * finished-jewelry captures) and `tipo`/legacy `categoria` (for loose gems,
 * ~93% of the catalog) are the real piece-type signal; see
 * `resolvedTipoPieza`. The wire-level argument name stays `categoria` (zero
 * coordination with the live GHL workflow) but is treated as a piece-type
 * intent from the first line it's read.
 */

/** 20% headroom over the declared budget (matches the spec's `presupuesto*1.2`). */
export const BUDGET_MARGIN = 1.2;
/** The bot shows three options per the spec. */
export const MAX_RESULTS = 3;

/** Estados whose pieces may be surfaced to a client (Kevin req 2026-07-06).
 * `DISPONIBLE` is buyable; `VENDIDA` is shown as a style reference for thin
 * categories. Every other estado is withheld. Compared case-insensitively. */
export const SHAREABLE_ESTADOS = new Set(['DISPONIBLE', 'VENDIDA']);

/** Qualitative price bands used when the client gives no numeric budget. */
export type PriceTier = 'economico' | 'moderado' | 'alto';

export interface SearchableProduct {
  itemId: string;
  nombre?: string;
  categoria?: string;
  /** Finished-jewelry piece type (capture form, TIPOS_JOYA vocabulary). Only
   * populated when the item was captured as `tipo === "joya"`. */
  tipoJoya?: string;
  /** Item kind from the capture wizard: "gema" | "bruto" | "joya" | "insumo" | "lote". */
  tipo?: string;
  precioCOP?: number;
  estado?: string;
  mostrarEnCatalogo?: boolean;
  fotoUrl?: string;
  certificadoUrl?: string;
}

export interface SearchCriteria {
  /** Carries the GHL bot's `tipo_interes` value (piece-type intent), NOT the
   * catalog's own `categoria` field — see the module docstring. */
  categoria?: string;
  presupuesto?: number;
  ocasion?: string;
  /** Qualitative price hint, used ONLY when `presupuesto` is absent
   * ("precio moderado" → 'moderado'). A numeric budget is the stronger signal
   * and takes precedence — see `rankProducts`. */
  priceTier?: PriceTier;
}

/** Case-insensitive categoria match: exact OR substring (so "anillos" ⊇ "anillo"). */
function matchesCategoria(productCategoria?: string, wanted?: string): boolean {
  if (!productCategoria || !wanted) return false;
  const a = productCategoria.trim().toLowerCase();
  const b = wanted.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * `tipoJoya` (capture-form) → `tipo_interes` (GHL bucket) allowlist. A
 * `tipoJoya` value NOT in this list (dirty free text — e.g. a miscaptured
 * collection name like "Murralla") resolves to no signal, never a fabricated
 * match — see GHL/tipo-interes-mapping-analysis.md for why that's safer than
 * guessing. `"otro"` is only ever reached via a recognized-but-generic value
 * (Aretes/Pulsera/Cadena/Expansión); it is never inferred from absence.
 */
const TIPOJOYA_TO_TIPO_INTERES: Record<string, string> = {
  'topitos peq': 'topito',
  'topitos grandes': 'topito',
  'topitos hombre': 'topito',
  'anillo mujer': 'anillo',
  'anillo hombre': 'anillo',
  dije: 'dije',
  set: 'set',
  candonga: 'candonga',
  aretes: 'otro',
  pulsera: 'otro',
  cadena: 'otro',
  expansión: 'otro',
};

/** `categoria` values that only ever come from the loose-gem capture form
 * (src/data/vocabularies.ts TIPOS_ESMERALDA). A legacy row with one of these
 * and no `tipoJoya`/`tipo` is a loose stone, not a labeling gap. Includes
 * "gola", an observed live variant of "Cola". */
const GEMA_CATEGORIAS = new Set([
  'muralla',
  'piedra natural',
  'canutillo',
  'cola',
  'gola',
  'raíz',
  'gema facetada',
  'piedra cristal',
]);

/**
 * `categoria` values from the PRE-Fotosíntesis "Inventario" sheet (items
 * 1-322, still cron-mirrored for base fields and bot-eligible via the
 * legacy-DISPONIBLE union in `ghl.ts::searchProducts`) — a controlled
 * piece-type vocabulary, matching `JEWELRY_CATEGORIES` in
 * api/get-treasure-sheets.ts. A DIFFERENT axis than the Fotosíntesis-era
 * `categoria` (gem-cut/collection names, see `GEMA_CATEGORIAS`) — this is
 * the legacy sheet's OWN piece-type label, not an inferred/guessed mapping
 * (see GHL/product-catalog-audit-2026-07-06.md). Only unambiguous labels are
 * mapped; "Joyas" (generic finished-jewelry, n=3 live) resolves to "otro"
 * rather than a fabricated "set" — same conservative rule as
 * `TIPOJOYA_TO_TIPO_INTERES`.
 */
const LEGACY_CATEGORIA_TO_TIPO_INTERES: Record<string, string> = {
  'anillo en plata': 'anillo',
  'anillo en oro': 'anillo',
  topitos: 'topito',
  dije: 'dije',
  gema: 'gema_suelta',
  piedras: 'gema_suelta',
  'lote de gemas': 'gema_suelta',
  pulsera: 'otro',
  joyas: 'otro',
};

/**
 * The `tipo_interes` bucket a product resolves to, or `undefined` when there
 * is no reliable signal. Never infers `"otro"` from absence.
 */
function resolvedTipoPieza(p: SearchableProduct): string | undefined {
  const tj = p.tipoJoya?.trim().toLowerCase();
  if (tj) return TIPOJOYA_TO_TIPO_INTERES[tj]; // undefined if not in the allowlist
  if (p.tipo === 'gema' || p.tipo === 'bruto') return 'gema_suelta';
  const cat = p.categoria?.trim().toLowerCase();
  if (cat && GEMA_CATEGORIAS.has(cat)) return 'gema_suelta'; // legacy rows with no `tipo`
  if (cat && LEGACY_CATEGORIA_TO_TIPO_INTERES[cat])
    return LEGACY_CATEGORIA_TO_TIPO_INTERES[cat]; // pre-Fotosíntesis piece-type categoria
  return undefined;
}

/** True only for a recognized, resolved piece-type match. `"otro"` never
 * forces the strict filter (too generic a bucket to exclude everything on). */
function matchesTipoPieza(p: SearchableProduct, wanted?: string): boolean {
  if (!wanted) return false;
  const w = wanted.trim().toLowerCase();
  if (w === 'otro') return false;
  return resolvedTipoPieza(p) === w;
}

/** Piece-type/occasion relevance, WITHOUT any price component. A resolved
 * piece-type match dominates; a literal `categoria` substring match (meaningful
 * today mainly as a `gema_suelta` sub-preference, e.g. "facetada") is a
 * secondary boost, never able to outrank a real piece-type hit. */
function pieceRelevance(
  p: SearchableProduct,
  criteria: SearchCriteria,
): number {
  let score = 0;
  if (matchesTipoPieza(p, criteria.categoria)) {
    score += 1_000_000;
  } else if (
    criteria.categoria &&
    matchesCategoria(p.categoria, criteria.categoria)
  ) {
    score += 500_000;
  }
  if (
    criteria.ocasion &&
    p.nombre &&
    p.nombre.toLowerCase().includes(criteria.ocasion.trim().toLowerCase())
  ) {
    score += 100_000;
  }
  return score;
}

/** Full ranking score for the DECLARED-BUDGET path. Price is the in-budget
 * tiebreak: with a budget the pool is bounded by the 1.2× ceiling, so
 * "pricier-first" means "closest to what the client can spend" (the spec's
 * secondary "precio DESC"). The no-budget path does NOT use this — it spreads
 * across the price band instead (see `selectByPrice`). */
function relevance(p: SearchableProduct, criteria: SearchCriteria): number {
  return pieceRelevance(p, criteria) + (p.precioCOP ?? 0);
}

/** The price band (a slice of the ascending-price-sorted pool) a qualitative
 * tier maps to: económico = lowest third, moderado = middle third, alto = top
 * third. Small pools (≤ MAX_RESULTS) or a degenerate middle slice fall back to
 * the whole pool so a tier hint never yields an empty result. */
function tierBand(
  sortedAsc: SearchableProduct[],
  tier: PriceTier,
): SearchableProduct[] {
  const n = sortedAsc.length;
  if (n <= MAX_RESULTS) return sortedAsc;
  const third = Math.ceil(n / 3);
  if (tier === 'economico') return sortedAsc.slice(0, third);
  if (tier === 'alto') return sortedAsc.slice(n - third);
  const middle = sortedAsc.slice(third, n - third);
  return middle.length > 0 ? middle : sortedAsc;
}

/** Evenly sample up to MAX_RESULTS items across a price-sorted band so the
 * client sees genuinely DIFFERENT prices, not three near-identical ones. */
function spreadAcross(sortedAsc: SearchableProduct[]): SearchableProduct[] {
  const n = sortedAsc.length;
  if (n <= MAX_RESULTS) return sortedAsc;
  const picks: SearchableProduct[] = [];
  for (let i = 0; i < MAX_RESULTS; i++) {
    // Indices 0 … n-1 spaced evenly: first, middle, last.
    picks.push(sortedAsc[Math.round((i * (n - 1)) / (MAX_RESULTS - 1))]);
  }
  return picks;
}

/** No-numeric-budget selection: return a price SPREAD across the eligible pool
 * (biased to the tier band when given), replacing the old cheaper-first
 * tiebreak so a "precio moderado"-style client sees a real range of prices.
 *
 * The pool is already piece-type-scoped by `rankProducts`' degradation: when a
 * real tipo match exists, the strict step passes ONLY those pieces here, so no
 * further group filtering is needed (and filtering here would wrongly drop the
 * legitimate categoria-substring filler the 2026-07-04 fix restored). The
 * 2026-07-05 extreme-outlier protection still holds — results are returned
 * ascending, so the spread never LEADS with the most expensive piece. */
function selectByPrice(
  pool: SearchableProduct[],
  criteria: SearchCriteria,
): SearchableProduct[] {
  if (pool.length === 0) return [];
  const sortedAsc = pool
    .slice()
    .sort((a, b) => (a.precioCOP ?? 0) - (b.precioCOP ?? 0));
  const band = criteria.priceTier
    ? tierBand(sortedAsc, criteria.priceTier)
    : sortedAsc;
  return spreadAcross(band).slice(0, MAX_RESULTS);
}

/** Lower bound of the budget window (the spec's ~0.8× floor). Without this a
 * declared 5M-COP budget could surface a 250k piece — technically "in
 * budget" (below the 1.2× ceiling) but nowhere near what the client asked
 * for, which reads as an unrelated outlier (confirmed in production: a
 * client with a 5M budget was shown 250k–1.3M rings). */
export const BUDGET_MARGIN_LOW = 0.8;

/**
 * Published + DISPONIBLE + in-budget pieces. `enforceTipoPieza` gates the
 * (hard) piece-type filter and `enforcePriceFloor` gates the (hard) budget
 * floor — each independently droppable so `rankProducts` can degrade one
 * axis at a time instead of an all-or-nothing fallback.
 */
function eligibleProducts(
  items: SearchableProduct[],
  criteria: SearchCriteria,
  enforceTipoPieza: boolean,
  enforcePriceFloor: boolean,
): SearchableProduct[] {
  const presupuestoMax = criteria.presupuesto
    ? criteria.presupuesto * BUDGET_MARGIN
    : Infinity;
  const presupuestoMin =
    enforcePriceFloor && criteria.presupuesto
      ? criteria.presupuesto * BUDGET_MARGIN_LOW
      : 0;

  return items.filter(
    (p) =>
      p.mostrarEnCatalogo === true &&
      // DISPONIBLE + VENDIDA are shareable (Kevin req 2026-07-06); every other
      // estado (ASESOR/APARTADA/…) is withheld. See SHAREABLE_ESTADOS.
      SHAREABLE_ESTADOS.has((p.estado ?? '').toUpperCase()) &&
      // A blank sheet row (no Nombre) can still carry a stray positive
      // precioCOP (real example, 2026-07-06 catalog audit: item 319, empty
      // nombre/categoria, precioCOP 521) — the positive-price guard alone
      // doesn't catch it, and the bot can't render a WhatsApp line or Vitrina
      // page for a piece with no name.
      Boolean(p.nombre?.trim()) &&
      // Must be a POSITIVE price. A `0`/missing-but-captured-as-0 price is a
      // number, so without this guard an unpriced incomplete row passes the
      // filter, and — with no budget declared — the cheaper-first tiebreak
      // (`relevance`: score += -price) sorts those $0 rows straight to the top
      // three. That surfaced the "3 empty $0 pieces + empty Vitrina link"
      // incident (2026-07-06): the bot recommended unpriced records that the
      // public Sheets-backed catalog can't even render.
      typeof p.precioCOP === 'number' &&
      (p.precioCOP as number) > 0 &&
      (p.precioCOP as number) <= presupuestoMax &&
      (p.precioCOP as number) >= presupuestoMin &&
      (!enforceTipoPieza ||
        !criteria.categoria ||
        matchesTipoPieza(p, criteria.categoria)),
  );
}

function topRanked(
  pool: SearchableProduct[],
  criteria: SearchCriteria,
): SearchableProduct[] {
  return pool
    .map((p) => ({ p, score: relevance(p, criteria) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((x) => x.p);
}

/** Degradation order: most-precise pool first, most-lenient last. Each step
 * drops exactly one constraint relative to the previous, so a client only
 * sees a poorer match (wrong price range, or no piece-type signal) when the
 * better one genuinely has nothing in stock. */
const DEGRADATION_STEPS = [
  { enforceTipoPieza: true, enforcePriceFloor: true },
  { enforceTipoPieza: true, enforcePriceFloor: false },
  { enforceTipoPieza: false, enforcePriceFloor: true },
  { enforceTipoPieza: false, enforcePriceFloor: false },
] as const;

/**
 * Filter to published+available+in-budget products and return the top
 * `MAX_RESULTS`, most relevant first. Pure: takes plain objects, no Convex types.
 *
 * Graceful degradation across two independent axes — piece type and budget
 * range — tried from strictest to most lenient (see `DEGRADATION_STEPS`):
 * the first non-empty pool wins. `tipoJoya` isn't populated yet for most of
 * the catalog, and a declared budget doesn't always have a piece within
 * ±20% in stock, so this never answers with an empty list while ANY
 * published/available/in-budget-ceiling piece exists; a literal `categoria`
 * substring match still boosts ranking as a secondary signal (see
 * `relevance`), just no longer excludes anything on its own.
 */
export function rankProducts(
  items: SearchableProduct[],
  criteria: SearchCriteria,
): SearchableProduct[] {
  for (const { enforceTipoPieza, enforcePriceFloor } of DEGRADATION_STEPS) {
    const eligible = eligibleProducts(
      items,
      criteria,
      enforceTipoPieza,
      enforcePriceFloor,
    );
    if (eligible.length === 0) continue;
    // WITH a numeric budget: pricier-in-budget-first (bounded by the 1.2×
    // ceiling). WITHOUT one: spread across the price band so the client sees
    // different prices, biased to the qualitative tier when supplied.
    return criteria.presupuesto
      ? topRanked(eligible, criteria)
      : selectByPrice(eligible, criteria);
  }
  return [];
}

/**
 * Customer-facing availability disclosure for a piece's `estado`, ready to
 * concatenate directly after its name/price in a WhatsApp message — GHL's
 * merge tags do plain substitution, not conditionals, so a boolean
 * `disponible` flag alone would render literally as "true"/"false". Empty
 * string for a buyable (DISPONIBLE) piece so it adds nothing to the message.
 */
export function disponibilidadNota(estado: string | undefined): string {
  if ((estado ?? '').toUpperCase() === 'VENDIDA') {
    return ' (pieza vendida — ejemplo de estilo, pregúntame por una similar)';
  }
  return '';
}
