/**
 * Pure helpers for the Fotosíntesis v2 · Slice 2 BR-2/BR-5 math.
 *
 * Lifted out of the `lots.ts` / `lotItems.ts` mutation handlers so they can
 * be unit-tested without the Convex test harness. The handlers re-use these
 * — there is intentionally only one source of truth.
 */

export type TipoItem = "gema" | "joya" | "insumo" | "lote";

/** Item shape used by close-lot validation — just enough fields to discriminate. */
export interface CloseValidationItem {
  preponderancia: number;
  tipo?: TipoItem;
}

/**
 * BR-2 escape hatch: a lot containing only insumos opts out of the
 * "sum of preponderancia ≡ 100" rule, because insumos compute their
 * preponderancia from `cantidad × costoUnitario / lot.costoTotalCOP`
 * and the cost rarely lands exactly on the lot total.
 *
 * Returns false for an empty list (cannot close a lot with no items
 * regardless of tipo).
 */
export function isInsumoOnlyLot(items: CloseValidationItem[]): boolean {
  if (items.length === 0) return false;
  return items.every((it) => it.tipo === "insumo");
}

/**
 * Result of an insumo BR-5 math pass: the row gets `costoBaseCOP` from
 * cantidad × costoUnitario directly, and we back-derive preponderancia
 * for analytics + display.
 */
export interface InsumoTotals {
  costoBaseCOP: number;
  preponderancia: number;
}

/**
 * Compute costoBaseCOP and back-derived preponderancia for an insumo
 * line item. Returns rounded integers / centi-percent.
 *
 * Throws when cantidad or costoUnitario are non-positive — server-side
 * mutation should re-throw with a user-friendly message.
 */
export function computeInsumoTotals(args: {
  cantidad: number;
  costoUnitarioCOP: number;
  lotCostoTotalCOP: number;
}): InsumoTotals {
  const { cantidad, costoUnitarioCOP, lotCostoTotalCOP } = args;
  if (cantidad <= 0) throw new Error("Insumo requiere cantidad > 0");
  if (costoUnitarioCOP <= 0)
    throw new Error("Insumo requiere costo unitario > 0");
  const costoBaseCOP = Math.round(cantidad * costoUnitarioCOP);
  const preponderancia =
    lotCostoTotalCOP > 0
      ? Math.round((costoBaseCOP / lotCostoTotalCOP) * 100 * 100) / 100
      : 0;
  return { costoBaseCOP, preponderancia };
}

/**
 * Decide whether a new draft item would push the cumulative
 * preponderancia past 100% by more than the 0.01% tolerance.
 *
 * The rule is relaxed only when the new item is insumo AND every
 * previously-saved item is also insumo (in that case BR-2 is fully
 * skipped at close-time anyway, see `isInsumoOnlyLot`).
 */
export function wouldOverflowHundred(args: {
  existing: CloseValidationItem[];
  candidate: { tipo: TipoItem; preponderancia: number };
}): boolean {
  const { existing, candidate } = args;
  const sumExisting = existing.reduce((s, it) => s + it.preponderancia, 0);
  const projected = sumExisting + candidate.preponderancia;
  if (projected <= 100.01) return false;
  // The insumo-only escape: if all existing are insumo and the new one is
  // insumo, BR-2 is gone at close-time so we don't pre-block here either.
  if (
    candidate.tipo === "insumo" &&
    existing.length > 0 &&
    existing.every((it) => it.tipo === "insumo")
  ) {
    return false;
  }
  return true;
}
