/**
 * BR-2 — el candado de preponderancia del cierre de lote, en puro.
 *
 * La preponderancia nació para repartir el costo del lote entre sus ítems.
 * Desde el 2026-07-24 ese reparto no existe (el costo es sheet-owned y una
 * edición de preponderancia no deriva costoBaseCOP), así que en un lote SIN
 * costo el número no alimenta nada: exigir que sume 100% era ceremonia, y
 * tuvo a C-090 (patrón "Recuperado", costo $0, 11 ítems en 0%) atascado en
 * "abierto" sin camino al catálogo. Decisión de producto del 2026-08-18:
 * la exigencia sigue al costo.
 *
 * Un lote CON costo sigue exigiendo la suma ≡ 100 ± 0.01, igual que siempre.
 *
 * Consumidores: `lots._close` (la autoridad, servidor) y los espejos de UI
 * (`CapturaLotePage.canCloseLot`, `LoteResumenPage.br2Ok`) — la UI refleja
 * pero nunca decide sola.
 */

export function loteExigePreponderancia(lote: {
  costoTotalCOP?: number | null;
}): boolean {
  return (lote.costoTotalCOP ?? 0) > 0;
}

/**
 * El error de cierre por BR-2, o `null` si el cierre puede proceder.
 * El mensaje es EL MISMO que `_close` lanzaba inline — los operadores y los
 * tests de copiloto ya lo conocen; no se reescribe gratis.
 */
export function errorCierrePreponderancia(
  lote: { costoTotalCOP?: number | null },
  sumaPreponderancia: number,
): string | null {
  if (!loteExigePreponderancia(lote)) return null;
  if (Math.abs(sumaPreponderancia - 100) <= 0.01) return null;
  return `Preponderancia ${sumaPreponderancia.toFixed(2)}% ≠ 100%. Ajusta los ítems antes de cerrar.`;
}
