import { describe, it, expect } from 'vitest';
import {
  rankProducts,
  type SearchableProduct,
} from '../convex/_lib/productSearch';

/** Helper: a published, available product with sensible defaults. */
function prod(
  p: Partial<SearchableProduct> & { itemId: string },
): SearchableProduct {
  return {
    nombre: p.itemId,
    categoria: 'anillos',
    precioCOP: 1_000_000,
    estado: 'DISPONIBLE',
    mostrarEnCatalogo: true,
    ...p,
  };
}

describe('rankProducts', () => {
  it('returns [] for empty input', () => {
    expect(rankProducts([], {})).toEqual([]);
  });

  it('excludes unpublished products (mostrarEnCatalogo !== true)', () => {
    const out = rankProducts(
      [prod({ itemId: 'A', mostrarEnCatalogo: false }), prod({ itemId: 'B' })],
      {},
    );
    expect(out.map((p) => p.itemId)).toEqual(['B']);
  });

  it('excludes products that are not DISPONIBLE', () => {
    const out = rankProducts(
      [prod({ itemId: 'A', estado: 'VENDIDA' }), prod({ itemId: 'B' })],
      {},
    );
    expect(out.map((p) => p.itemId)).toEqual(['B']);
  });

  it('applies the 20% budget margin (1M budget admits 1.2M, rejects 1.3M)', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'in', precioCOP: 1_200_000 }),
        prod({ itemId: 'out', precioCOP: 1_300_000 }),
      ],
      { presupuesto: 1_000_000 },
    );
    expect(out.map((p) => p.itemId)).toEqual(['in']);
  });

  it('filters by resolved tipo pieza (tipoJoya), not by raw categoria text', () => {
    const out = rankProducts(
      [
        prod({
          itemId: 'ring',
          categoria: 'Muralla',
          tipoJoya: 'Anillo Mujer',
        }),
        prod({ itemId: 'dije', categoria: 'Muralla', tipoJoya: 'Dije' }),
      ],
      { categoria: 'anillo' },
    );
    expect(out.map((p) => p.itemId)).toEqual(['ring']);
  });

  it('a literal categoria substring match alone no longer forces a strict filter (the 2026-07-04 bug fix)', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'ring', categoria: 'Anillos', precioCOP: 1_000_000 }),
        prod({ itemId: 'neck', categoria: 'Collares', precioCOP: 1_000_000 }),
      ],
      { categoria: 'anillo' },
    );
    // Neither product resolves a tipoJoya/tipo piece type, so the strict pass
    // matches nothing and both degrade to the fallback — "ring" still ranks
    // first via the secondary categoria boost, but "neck" is no longer
    // excluded outright just because its categoria text doesn't contain
    // "anillo". This is the exact bug confirmed live: a real tipo_interes
    // value can never literally match the catalog's collection-name categoria.
    expect(out.map((p) => p.itemId)).toEqual(['ring', 'neck']);
  });

  it('returns at most 3 results', () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      prod({ itemId: `P${i}`, precioCOP: 100_000 + i }),
    );
    expect(rankProducts(items, {}).length).toBe(3);
  });

  it('ranks a resolved tipo-pieza match above non-matching, then pricier-in-budget first', () => {
    const out = rankProducts(
      [
        prod({
          itemId: 'cheapRing',
          tipoJoya: 'Anillo Mujer',
          precioCOP: 500_000,
        }),
        prod({
          itemId: 'dearRing',
          tipoJoya: 'Anillo Hombre',
          precioCOP: 1_500_000,
        }),
        prod({ itemId: 'dije', tipoJoya: 'Dije', precioCOP: 1_800_000 }),
      ],
      { categoria: 'anillo', presupuesto: 2_000_000 },
    );
    // Piece-type matches come first (dije excluded by the strict tipoJoya
    // filter), and among them the pricier-in-budget ranks first.
    expect(out.map((p) => p.itemId)).toEqual(['dearRing', 'cheapRing']);
  });

  it('infers gema_suelta from `tipo` without needing tipoJoya populated', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'gema', tipo: 'gema', categoria: 'Gema Facetada' }),
        prod({ itemId: 'bruto', tipo: 'bruto', categoria: undefined }),
        prod({ itemId: 'joya', tipoJoya: 'Dije' }),
      ],
      { categoria: 'gema_suelta' },
    );
    expect(out.map((p) => p.itemId).sort()).toEqual(['bruto', 'gema']);
  });

  it('infers gema_suelta from a legacy categoria value when `tipo` is missing (pre-Fotosíntesis-v2 rows)', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'legacyGema', categoria: 'Muralla' }),
        prod({ itemId: 'joya', tipoJoya: 'Dije' }),
      ],
      { categoria: 'gema_suelta' },
    );
    expect(out.map((p) => p.itemId)).toEqual(['legacyGema']);
  });

  it("an out-of-allowlist tipoJoya value (dirty legacy data) resolves to no signal, never a false 'otro' match", () => {
    const out = rankProducts(
      [
        // Real bug found in production: a typo'd collection name ("Murralla")
        // saved into the tipoJoya field by a miscapture.
        prod({ itemId: 'dirty', tipoJoya: 'Murralla', precioCOP: 900_000 }),
        prod({ itemId: 'clean', tipoJoya: 'Pulsera', precioCOP: 800_000 }),
      ],
      { categoria: 'otro' },
    );
    // "otro" never forces the strict filter, so both degrade to the fallback
    // ranked by price alone — proving "dirty" isn't silently swept in as a
    // match either (it would rank *above* "clean" on price if it were).
    expect(out.map((p) => p.itemId)).toEqual(['dirty', 'clean']);
  });

  // ── Graceful degradation ────────────────────────────────────────────────
  // The GHL bot passes `categoria = {{contact.tipo_interes}}` — a customer
  // intent value (e.g. "inversion", "anillo", "regalo"). The live catalog's
  // `categoria` field holds internal collection names ("Gema Facetada",
  // "Muralla", "Gola"…), so a real tipo_interes strict-matches NOTHING. Rather
  // than answer with an empty list while 59 emeralds sit in stock, the bot must
  // degrade to in-budget options.

  it('falls back to in-budget options when NO product matches the categoria (never empty when eligible pieces exist)', () => {
    const out = rankProducts(
      [
        prod({
          itemId: 'gema',
          categoria: 'Gema Facetada',
          precioCOP: 1_980_000,
        }),
        prod({ itemId: 'muralla', categoria: 'Muralla', precioCOP: 1_620_000 }),
      ],
      { categoria: 'inversion', presupuesto: 3_000_000 },
    );
    // "inversion" matches neither internal collection name → degrade instead of
    // returning [], pricier-in-budget first.
    expect(out.map((p) => p.itemId)).toEqual(['gema', 'muralla']);
  });

  it('degradation still respects the budget margin (never recommends a wildly over-budget piece)', () => {
    const out = rankProducts(
      [
        prod({
          itemId: 'inBudget',
          categoria: 'Muralla',
          precioCOP: 2_000_000,
        }),
        prod({ itemId: 'tooDear', categoria: 'Gola', precioCOP: 50_000_000 }),
      ],
      { categoria: 'anillo', presupuesto: 3_000_000 },
    );
    expect(out.map((p) => p.itemId)).toEqual(['inBudget']);
  });

  it('degradation still excludes unpublished / not-DISPONIBLE pieces', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'sold', categoria: 'Muralla', estado: 'VENDIDA' }),
        prod({ itemId: 'hidden', categoria: 'Gola', mostrarEnCatalogo: false }),
        prod({ itemId: 'live', categoria: 'Raíz', precioCOP: 900_000 }),
      ],
      { categoria: 'anillo' },
    );
    expect(out.map((p) => p.itemId)).toEqual(['live']);
  });

  it('prefers a strict tipoJoya match over the fallback when at least one resolves', () => {
    const out = rankProducts(
      [
        prod({
          itemId: 'ring',
          tipoJoya: 'Anillo Mujer',
          precioCOP: 1_000_000,
        }),
        prod({ itemId: 'gema', tipo: 'gema', precioCOP: 2_000_000 }),
      ],
      { categoria: 'anillo' },
    );
    // A real piece-type match exists → do NOT dilute it with a pricier gema
    // that has no signal for "anillo" at all.
    expect(out.map((p) => p.itemId)).toEqual(['ring']);
  });

  it('zero regression: with no tipoJoya/tipo/gema-categoria signal anywhere, behaves exactly like the pre-fix budget-only fallback', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'a', categoria: 'anillos', precioCOP: 1_000_000 }),
        prod({ itemId: 'b', categoria: 'collares', precioCOP: 1_500_000 }),
      ],
      { categoria: 'anillo', presupuesto: 2_000_000 },
    );
    // No product resolves a piece type (no tipoJoya/tipo, no gema-categoria
    // value) → strict pass is empty → falls back to budget+categoria-boost
    // ranking, same shape as today's deployed behavior — proving this change
    // is deployable before any catalog data migration happens.
    expect(out.map((p) => p.itemId)).toEqual(['a', 'b']);
  });

  // ── Budget floor (2026-07-04 fix) ───────────────────────────────────────
  // The bot only ever enforced a budget CEILING (presupuesto*1.2). A client
  // who declares a 5M-COP budget could be shown a 250k piece — technically
  // "in budget" but nowhere near what they asked for, which reads as an
  // unrelated outlier. Confirmed in production: a 5M-budget client was shown
  // 250k–1.3M rings alongside the intended match.

  it('does not recommend an item far below the declared budget when an in-range match exists (the price-floor fix)', () => {
    const out = rankProducts(
      [
        prod({
          itemId: 'inRange',
          tipoJoya: 'Anillo Mujer',
          precioCOP: 4_800_000,
        }),
        prod({
          itemId: 'wayCheaper',
          tipoJoya: 'Anillo Hombre',
          precioCOP: 250_000,
        }),
      ],
      { categoria: 'anillo', presupuesto: 5_000_000 },
    );
    // Both are real, in-budget-ceiling rings, but only "inRange" sits within
    // the 0.8x-1.2x window (4M-6M) — it must be preferred.
    expect(out.map((p) => p.itemId)).toEqual(['inRange']);
  });

  it('degrades to a below-floor piece only when nothing sits within the tight budget window', () => {
    const out = rankProducts(
      [
        prod({
          itemId: 'onlyOption',
          tipoJoya: 'Anillo Mujer',
          precioCOP: 250_000,
        }),
      ],
      { categoria: 'anillo', presupuesto: 5_000_000 },
    );
    // No 4M-6M ring in stock → better to show the only real ring available
    // than an empty list.
    expect(out.map((p) => p.itemId)).toEqual(['onlyOption']);
  });
});
