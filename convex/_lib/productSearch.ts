/**
 * Pure product ranking for the GHL bot's `search-products` tool, kept free of
 * Convex IO so it is unit-testable (see tests/productSearch.test.ts). The
 * `ghl.searchProducts` query reads `productInventory` then delegates the
 * filter + rank here.
 *
 * Contract (GHL/02-SUPABASE §4 + 06-FLUJOS flow 1): return AT MOST 3 published,
 * available products within a 20% budget margin, ranked by category match then
 * price. Reads the REAL catalog mirror — only rows the admin has flagged
 * `mostrarEnCatalogo` and that are `DISPONIBLE` are eligible (a piece already
 * VENDIDA / ASESOR must never be recommended).
 */

/** 20% headroom over the declared budget (matches the spec's `presupuesto*1.2`). */
export const BUDGET_MARGIN = 1.2;
/** The bot shows three options per the spec. */
export const MAX_RESULTS = 3;

export interface SearchableProduct {
  itemId: string;
  nombre?: string;
  categoria?: string;
  precioCOP?: number;
  estado?: string;
  mostrarEnCatalogo?: boolean;
  fotoUrl?: string;
  certificadoUrl?: string;
}

export interface SearchCriteria {
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

/** Higher = better. Category match dominates; price is the in-budget tiebreak. */
function relevance(p: SearchableProduct, criteria: SearchCriteria): number {
  let score = 0;
  if (criteria.categoria && matchesCategoria(p.categoria, criteria.categoria)) {
    score += 1_000_000;
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

/**
 * Published + DISPONIBLE + in-budget pieces. `enforceCategoria` gates the
 * (hard) categoria filter: the strict pass demands a match, the fallback pass
 * drops it while keeping every other guard (published / available / budget).
 */
function eligibleProducts(
  items: SearchableProduct[],
  criteria: SearchCriteria,
  enforceCategoria: boolean,
): SearchableProduct[] {
  const presupuestoMax = criteria.presupuesto
    ? criteria.presupuesto * BUDGET_MARGIN
    : Infinity;

  return items.filter(
    (p) =>
      p.mostrarEnCatalogo === true &&
      p.estado === "DISPONIBLE" &&
      typeof p.precioCOP === "number" &&
      (p.precioCOP as number) <= presupuestoMax &&
      (!enforceCategoria ||
        !criteria.categoria ||
        matchesCategoria(p.categoria, criteria.categoria)),
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

/**
 * Filter to published+available+in-budget products and return the top
 * `MAX_RESULTS`, most relevant first. Pure: takes plain objects, no Convex types.
 *
 * Graceful degradation: the strict pass keeps the categoria hard-filter so a
 * genuine category match is never diluted by off-category pieces. But because
 * the GHL bot passes `categoria = {{contact.tipo_interes}}` (a customer intent
 * like "inversion"/"anillo") while the catalog's `categoria` field holds
 * internal collection names ("Gema Facetada"/"Muralla"/"Gola"), a real
 * tipo_interes strict-matches nothing. When that happens we fall back to
 * in-budget options instead of answering with an empty list while pieces are in
 * stock — categoria still boosts ranking, just no longer excludes. (A proper
 * tipo_interes → collection taxonomy map is the follow-up that would make
 * categoria meaningful again; see GHL/ESTADO-Y-PROXIMOS-PASOS.md.)
 */
export function rankProducts(
  items: SearchableProduct[],
  criteria: SearchCriteria,
): SearchableProduct[] {
  const strict = topRanked(eligibleProducts(items, criteria, true), criteria);
  if (strict.length > 0) return strict;
  return topRanked(eligibleProducts(items, criteria, false), criteria);
}
