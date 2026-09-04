/**
 * El precio base de un ítem, en pesos, resolviendo el ancla en dólares.
 *
 * Hay dos rieles de precio y la diferencia importa donde se siembra una venta:
 *
 *   · ANCLADO EN DÓLARES (`precioFinalUSD`, columna BG > 0): el dólar es la
 *     verdad y el peso se deriva con la TRM oficial del día.
 *   · EN PESOS (lo normal): `precioFinalCOP`, columna M.
 *
 * Existe porque el catálogo ya resolvía el ancla (`mapRowToTreasureItem`) y las
 * pantallas de Fotosíntesis no: leían `precioFinalCOP` directo. Con #547 y #548
 * —los dos únicos ítems anclados— eso significaba que la vitrina mostraba un
 * precio y el escritorio de ventas sembraba otro, el provisional congelado a la
 * TRM del 2026-09-01. Al 2026-09-04 la brecha era de US$395 y US$837.
 *
 * Cuatro reglas que no son de estilo:
 *
 *   1. **`> 0` es la marca del ancla**, no «existe». Para desanclar un ítem se
 *      escribe 0 en la hoja, porque el pull omite a propósito la celda vaciada
 *      (`coerce: 'num'`, convex/_lib/sheetPullMaps.ts). Un 0 tratado como ancla
 *      pondría la pieza en $0.
 *   2. **Sin TRM utilizable se cae a `precioFinalCOP`, nunca a 0.** Un cero en
 *      un precio es «Consultar precio» en la vitrina y una venta en blanco en
 *      el escritorio — es el bug «$ 0 desde el ítem ~318» del 2026-07-22.
 *   3. **`precioCOP` es el último recurso y sólo por filas viejas.** Es el riel
 *      legacy (col L, retirada del espejo el 2026-05-29): sin columna, fuera
 *      del allowlist de pull y ~82% vacío. Se conserva acá porque las cuatro
 *      superficies ya hacían `?? item.precioCOP` y quitarlo cambiaría lo que
 *      ven hoy; no se agrega en ningún lugar nuevo.
 *   4. **Se redondea.** El COP no tiene centavos y el viaje de ida y vuelta
 *      (`round(USD × TRM) ÷ TRM`) sólo vuelve exacto tras redondear: 36.200
 *      vuelve 36.200, no 36.199.
 */
export interface ConPrecio {
  /** Columna M — el precio en pesos. */
  precioFinalCOP?: number;
  /** Columna BG — el ancla en dólares. > 0 ⇒ manda sobre M. */
  precioFinalUSD?: number;
  /** Riel legacy (col L retirada). Sólo para filas viejas. */
  precioCOP?: number;
}

/** ¿La fila está anclada en dólares? La presencia de un positivo ES la marca. */
export function estaAncladoEnUSD(usd: number | undefined): usd is number {
  return typeof usd === 'number' && Number.isFinite(usd) && usd > 0;
}

/** ¿La TRM sirve para derivar? Una tasa ausente, 0 o absurda, no. */
function trmUtilizable(trm: number | undefined): trm is number {
  return typeof trm === 'number' && Number.isFinite(trm) && trm > 0;
}

/**
 * Precio base en COP. `trmRate` viene de `useTRM()`; se pasa por parámetro para
 * que esto siga siendo una función pura y testeable.
 */
export function precioBaseCOP(
  item: ConPrecio | null | undefined,
  trmRate?: number,
): number | undefined {
  if (!item) return undefined;
  if (estaAncladoEnUSD(item.precioFinalUSD) && trmUtilizable(trmRate)) {
    return Math.round(item.precioFinalUSD * trmRate);
  }
  return item.precioFinalCOP ?? item.precioCOP;
}
