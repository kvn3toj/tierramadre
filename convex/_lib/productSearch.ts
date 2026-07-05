/**
 * Pure product ranking for the GHL bot's `search-products` tool, kept free of
 * Convex IO so it is unit-testable (see tests/productSearch.test.ts). The
 * `ghl.searchProducts` query reads `productInventory` then delegates the
 * filter + rank here.
 *
 * Contract (GHL/02-SUPABASE §4 + 06-FLUJOS flow 1): return AT MOST 3 published,
 * available products within a 20% budget margin, ranked by piece-type match
 * then price. Reads the REAL catalog mirror — only rows the admin has flagged
 * `mostrarEnCatalogo` and that are `DISPONIBLE` are eligible (a piece already
 * VENDIDA / ASESOR must never be recommended).
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
]);

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

/** Higher = better. A resolved piece-type match dominates; a literal
 * `categoria` substring match (meaningful today mainly as a `gema_suelta`
 * sub-preference, e.g. "facetada") is a secondary boost, never able to
 * outrank a real piece-type hit. Price is the in-budget tiebreak. */
function relevance(p: SearchableProduct, criteria: SearchCriteria): number {
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
  // Tiebreak: pricier-within-budget first (mirrors the spec's secondary "precio DESC").
  score += p.precioCOP ?? 0;
  return score;
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
      p.estado === 'DISPONIBLE' &&
      typeof p.precioCOP === 'number' &&
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
    const pool = topRanked(
      eligibleProducts(items, criteria, enforceTipoPieza, enforcePriceFloor),
      criteria,
    );
    if (pool.length > 0) return pool;
  }
  return [];
}
