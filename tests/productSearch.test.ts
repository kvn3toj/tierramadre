import { describe, it, expect } from 'vitest';
import {
  rankProducts,
  disponibilidadNota,
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

  it('shares DISPONIBLE AND VENDIDA, but withholds other estados (Kevin req 2026-07-06)', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'sold', estado: 'VENDIDA' }),
        prod({ itemId: 'live', estado: 'DISPONIBLE' }),
        prod({ itemId: 'asesor', estado: 'ASESOR' }),
        prod({ itemId: 'apartada', estado: 'APARTADA' }),
      ],
      {},
    );
    // VENDIDA is now included as a style reference; ASESOR/APARTADA are not.
    expect(out.map((p) => p.itemId).sort()).toEqual(['live', 'sold']);
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

  it('infers gema_suelta from "Piedra Cristal" (2026-07-06 catalog audit: a live Fotosíntesis categoria value missing from GEMA_CATEGORIAS)', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'cristal', categoria: 'Piedra Cristal' }),
        prod({ itemId: 'joya', tipoJoya: 'Dije' }),
      ],
      { categoria: 'gema_suelta' },
    );
    expect(out.map((p) => p.itemId)).toEqual(['cristal']);
  });

  // ── Legacy Inventario-sheet categoria vocabulary (2026-07-06 catalog audit) ──
  // The pre-Fotosíntesis "Inventario" sheet (items 1-322, still cron-mirrored
  // for base fields and eligible for the bot via the legacy-DISPONIBLE union)
  // uses `categoria` as a controlled piece-type vocabulary — "Anillo en
  // Plata"/"Anillo en Oro", "Topitos", "Dije", "Pulsera", "Gema", "Piedras",
  // "Lote de Gemas" (see get-treasure-sheets.ts JEWELRY_CATEGORIES and the
  // live audit in GHL/product-catalog-audit-2026-07-06.md) — a DIFFERENT axis
  // than the Fotosíntesis-era `categoria` (gem-cut/collection names covered by
  // GEMA_CATEGORIAS). Without this, every legacy piece-type item only ever
  // reaches the bot through the secondary categoria-substring boost, never the
  // strict match tier, even though "Anillo en Plata" unambiguously means ring.

  it('resolves a strict anillo match from the legacy "Anillo en Plata"/"Anillo en Oro" categoria', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'plata', categoria: 'Anillo en Plata' }),
        prod({ itemId: 'oro', categoria: 'Anillo en Oro' }),
        prod({ itemId: 'other', categoria: 'Pulsera' }),
      ],
      { categoria: 'anillo' },
    );
    expect(out.map((p) => p.itemId).sort()).toEqual(['oro', 'plata']);
  });

  it('resolves topito/dije from the legacy "Topitos"/"Dije" categoria', () => {
    const topitoOut = rankProducts(
      [
        prod({ itemId: 'topito', categoria: 'Topitos' }),
        prod({ itemId: 'other', categoria: 'Pulsera' }),
      ],
      { categoria: 'topito' },
    );
    expect(topitoOut.map((p) => p.itemId)).toEqual(['topito']);

    const dijeOut = rankProducts(
      [
        prod({ itemId: 'dije', categoria: 'Dije' }),
        prod({ itemId: 'other', categoria: 'Pulsera' }),
      ],
      { categoria: 'dije' },
    );
    expect(dijeOut.map((p) => p.itemId)).toEqual(['dije']);
  });

  it.each(['Gema', 'Piedras', 'Lote de Gemas'])(
    'resolves gema_suelta from the legacy categoria "%s", hard-excluding a resolved-but-different piece type',
    (legacyCategoria) => {
      const out = rankProducts(
        [
          prod({ itemId: 'candidate', categoria: legacyCategoria }),
          // A distractor that resolves to a DIFFERENT concrete bucket ('dije').
          // Before the fix, `legacyCategoria` resolves to no signal too, so
          // both would survive the relaxed fallback step together. After the
          // fix, only 'candidate' passes the strict gema_suelta filter.
          prod({ itemId: 'distractor', tipoJoya: 'Dije' }),
        ],
        { categoria: 'gema_suelta' },
      );
      expect(out.map((p) => p.itemId)).toEqual(['candidate']);
    },
  );

  it('resolves "otro" from the legacy "Pulsera"/"Joyas" categoria, never as a specific bucket', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'pulsera', categoria: 'Pulsera' }),
        prod({ itemId: 'joyas', categoria: 'Joyas' }),
        prod({ itemId: 'ring', categoria: 'Anillo en Plata' }),
      ],
      { categoria: 'anillo' },
    );
    // "otro" items never resolve to "anillo" — only the real ring strict-matches.
    expect(out.map((p) => p.itemId)).toEqual(['ring']);
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
    // "otro" never forces the strict filter, so both degrade to the fallback.
    // With no declared budget the fallback ranks cheaper-first (the 2026-07-05
    // safety net), so "clean" (800k) leads "dirty" (900k). The point stands:
    // "dirty" is NOT boosted above "clean" as a false tipo match.
    expect(out.map((p) => p.itemId)).toEqual(['clean', 'dirty']);
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

  it('degradation still excludes unpublished / non-shareable-estado pieces', () => {
    const out = rankProducts(
      [
        // ASESOR is a withheld estado (unlike VENDIDA, which is now shared).
        prod({ itemId: 'asesor', categoria: 'Muralla', estado: 'ASESOR' }),
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

  // ── No-budget safety net (2026-07-05 incident) ──────────────────────────
  // With NO declared budget there is no 1.2× ceiling, so the "pricier-first"
  // tiebreak used to surface the single most expensive stones in the vault to
  // a client who never asked — a "3 millones" lead was shown 611M–930M COP
  // pieces. When no budget is known, ranking must fall back to cheaper-first
  // so an over-budget outlier can never lead.
  it('never leads with the most-expensive piece when no budget is declared', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'vault', precioCOP: 930_000_000 }),
        prod({ itemId: 'mid', precioCOP: 3_000_000 }),
        prod({ itemId: 'entry', precioCOP: 900_000 }),
      ],
      {}, // no presupuesto — the exact failure condition
    );
    expect(out.map((p) => p.itemId)).toEqual(['entry', 'mid', 'vault']);
    expect(out[0].itemId).not.toBe('vault');
  });

  it('still prefers pricier-within-budget first when a budget IS declared', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'lower', precioCOP: 2_600_000 }),
        prod({ itemId: 'upper', precioCOP: 3_400_000 }),
      ],
      { presupuesto: 3_000_000 }, // both inside the 2.4M–3.6M window
    );
    expect(out.map((p) => p.itemId)).toEqual(['upper', 'lower']);
  });

  // ── Positive-price guard (2026-07-06 incident) ──────────────────────────
  // An unpriced/incomplete inventory row captured as `precioCOP: 0` is still a
  // number, so it used to pass the eligibility filter. With no budget declared
  // the cheaper-first tiebreak then sorted those $0 rows to the very top — the
  // bot recommended "3 empty $0 pieces" whose Vitrina link rendered empty
  // (the rows aren't in the public Sheets catalog). A positive-price floor
  // must exclude them entirely.
  it('excludes $0 / unpriced rows so they can never be recommended (no budget)', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'unpriced1', precioCOP: 0 }),
        prod({ itemId: 'unpriced2', precioCOP: 0 }),
        prod({ itemId: 'real', precioCOP: 1_200_000 }),
      ],
      {}, // no presupuesto — the exact failure condition
    );
    expect(out.map((p) => p.itemId)).toEqual(['real']);
  });

  it('returns [] rather than recommending $0 rows when every eligible piece is unpriced', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'unpriced1', precioCOP: 0 }),
        prod({ itemId: 'unpriced2', precioCOP: 0 }),
      ],
      {},
    );
    expect(out).toEqual([]);
  });

  // ── Nameless-row guard (2026-07-06 catalog audit) ───────────────────────
  // A blank sheet row (no `Nombre`) can still get a stray nonzero `precioCOP`
  // (a real example found live: item 319, empty nombre/categoria, precioCOP
  // 521 — clearly a data-entry artifact, not a priced product) — the positive-
  // price guard alone doesn't catch it, and with no budget declared the
  // cheaper-first tiebreak would rank it first. The bot cannot show a
  // WhatsApp line or a Vitrina page for a piece with no name.
  it('excludes rows with no nombre even when precioCOP is a small positive number', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'ghostRow', nombre: '', precioCOP: 521 }),
        prod({ itemId: 'real', precioCOP: 1_200_000 }),
      ],
      {}, // no presupuesto — cheaper-first would otherwise lead with the ghost row
    );
    expect(out.map((p) => p.itemId)).toEqual(['real']);
  });

  // ── VENDIDA as style reference (Kevin req 2026-07-06) ────────────────────
  it('can fill a thin category entirely from VENDIDA pieces (no DISPONIBLE in stock)', () => {
    const out = rankProducts(
      [
        prod({
          itemId: 'r1',
          tipoJoya: 'Anillo Mujer',
          estado: 'VENDIDA',
          precioCOP: 3_000_000,
        }),
        prod({
          itemId: 'r2',
          tipoJoya: 'Anillo Mujer',
          estado: 'VENDIDA',
          precioCOP: 5_000_000,
        }),
      ],
      { categoria: 'anillo' },
    );
    expect(out.map((p) => p.itemId).sort()).toEqual(['r1', 'r2']);
  });

  // ── Qualitative price tiers + spread (Kevin req 2026-07-06) ──────────────
  // With no numeric budget, results are sampled across the price band so the
  // client sees DIFFERENT prices. A tier hint ("precio moderado") biases which
  // third of the sorted range the sample is drawn from.
  const nineRings = () =>
    Array.from({ length: 9 }, (_, i) =>
      prod({ itemId: `p${i + 1}`, precioCOP: (i + 1) * 1_000_000 }),
    );

  it("tier 'economico' draws from the lowest price third", () => {
    const out = rankProducts(nineRings(), { priceTier: 'economico' });
    expect(out.map((p) => p.precioCOP)).toEqual([
      1_000_000, 2_000_000, 3_000_000,
    ]);
  });

  it("tier 'moderado' draws from the middle price third", () => {
    const out = rankProducts(nineRings(), { priceTier: 'moderado' });
    expect(out.map((p) => p.precioCOP)).toEqual([
      4_000_000, 5_000_000, 6_000_000,
    ]);
  });

  it("tier 'alto' draws from the top price third", () => {
    const out = rankProducts(nineRings(), { priceTier: 'alto' });
    expect(out.map((p) => p.precioCOP)).toEqual([
      7_000_000, 8_000_000, 9_000_000,
    ]);
  });

  it('with no budget and no tier, returns an evenly-spread range (not the 3 cheapest)', () => {
    const out = rankProducts(nineRings(), {});
    expect(out.map((p) => p.precioCOP)).toEqual([
      1_000_000, 5_000_000, 9_000_000,
    ]);
  });

  it('applies the tier spread within the matching piece-type group (real "anillo moderado" case)', () => {
    const rings = Array.from({ length: 9 }, (_, i) =>
      prod({
        itemId: `ring${i + 1}`,
        tipoJoya: 'Anillo Mujer',
        precioCOP: (i + 1) * 1_000_000,
      }),
    );
    // A non-ring distractor must not dilute the ring selection.
    const out = rankProducts(
      [
        ...rings,
        prod({ itemId: 'dije', tipoJoya: 'Dije', precioCOP: 5_000_000 }),
      ],
      { categoria: 'anillo', priceTier: 'moderado' },
    );
    expect(out.map((p) => p.itemId)).toEqual(['ring4', 'ring5', 'ring6']);
  });

  it('a numeric budget overrides a tier hint (budget is the stronger signal)', () => {
    const out = rankProducts(
      [
        prod({ itemId: 'inWindowLow', precioCOP: 2_500_000 }),
        prod({ itemId: 'inWindowHigh', precioCOP: 3_400_000 }),
        prod({ itemId: 'tooDear', precioCOP: 9_000_000 }),
      ],
      { presupuesto: 3_000_000, priceTier: 'alto' },
    );
    // Budget window (2.4M–3.6M) wins: the 9M piece is excluded despite 'alto',
    // and within the window it's pricier-first.
    expect(out.map((p) => p.itemId)).toEqual(['inWindowHigh', 'inWindowLow']);
  });
});

// ── Availability disclosure text (2026-07-06 catalog audit, VENDIDA share) ──
// `productos[].disponible` (convex/ghl.ts) is a bare boolean — rendered
// literally in a GHL WhatsApp merge tag it would show "true"/"false" to a
// client. This pure helper turns it into ready-to-concatenate Spanish text
// so WF-04's message needs only ONE extra merge tag per piece, no GHL-side
// conditional logic.
describe('disponibilidadNota', () => {
  it('returns an empty string for an available (DISPONIBLE) piece', () => {
    expect(disponibilidadNota('DISPONIBLE')).toBe('');
  });

  it('returns a customer-facing disclosure for a sold (VENDIDA) piece', () => {
    expect(disponibilidadNota('VENDIDA')).toBe(
      ' (pieza vendida — ejemplo de estilo, pregúntame por una similar)',
    );
  });
});
