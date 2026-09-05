/**
 * El precio base de una pieza, en pesos, del lado del servidor.
 *
 * Gemelo de `src/utils/precioBase.ts`. Existe separado y no importado porque
 * Convex no puede importar de `src/`: el bundle del servidor es otro. Los dos
 * tienen que decir lo MISMO, y por eso comparten test de equivalencia.
 *
 * POR QUÉ EXISTE (incidente del 2026-09-04):
 * `convex/ghl.ts` cobraba por `product.precioCOP`, el riel LEGACY que perdió su
 * columna en el espejo SOT el 2026-05-29 y que hoy está en 0 o ausente en casi
 * todo el inventario. La vitrina, en cambio, muestra `precioFinalCOP`. O sea:
 * el catálogo mostraba un precio y el checkout no encontraba ninguno.
 *
 * El resultado para el cliente era el peor orden posible: veía la pieza con
 * precio, la agregaba, escribía nombre, celular y correo — y recién ahí el
 * servidor tiraba `PRECIO_NO_DISPONIBLE`. Ocho piezas del lote TM-001 estaban
 * exactamente así el 2026-09-04, con precio en la vitrina y 0 en `precioCOP`.
 *
 * LA TRM NO ENTRA ACÁ, A PROPÓSITO.
 * El ancla en dólares (`precioFinalUSD`, columna BG) necesita la TRM del día
 * para derivar el COP, y el diseño del precio anclado (spec 2026-09-01 §2)
 * decidió que **Convex nunca toca una tasa de cambio**: la TRM vive en
 * `/api/trm` y la resuelve el cliente. `createOrder` es una `mutation`, así que
 * ni siquiera podría ir a buscarla.
 *
 * Y recibirla del cliente sería peor: la propia `createOrder` dice «never trust
 * client-supplied amounts» y recarga precio y stock de la base justamente para
 * que nadie mande el número que quiere. Un multiplicador de precio que llega
 * por la red es exactamente eso.
 *
 * Consecuencia, escrita para que no se descubra por sorpresa: para una pieza
 * anclada en dólares, el checkout cobra `precioFinalCOP` — el COP provisional
 * de la hoja — y no `USD × TRM del día`. Hoy son dos piezas (#547 y #548) y la
 * diferencia es de +$1,2M y +$2,6M sobre lo publicado. Cerrar esa brecha pide
 * una decisión de diseño (¿un snapshot de TRM firmado por el servidor? ¿mover
 * el cobro a una action?), no un parche acá.
 */

/** ¿La fila está anclada en dólares? Un positivo finito ES la marca. */
export function estaAncladoEnUSD(usd: number | undefined): usd is number {
  return typeof usd === 'number' && Number.isFinite(usd) && usd > 0;
}

export interface ConPrecio {
  /** Columna M — el precio en pesos. Lo que lee el catálogo. */
  precioFinalCOP?: number;
  /** Columna BG — el ancla en dólares. Ver la nota sobre la TRM arriba. */
  precioFinalUSD?: number;
}

/**
 * Precio base en COP para cobrar. `trmRate` queda en la firma para que el día
 * que exista una TRM confiable del lado del servidor el cambio sea de una
 * línea en el llamador — no para que alguien le pase la del cliente.
 *
 * Devuelve `undefined` —no 0— cuando no hay precio: el 0 es un cobro real de
 * cero pesos y `precioBaseEsValido` lo rechaza, pero quien llama tiene que
 * poder distinguir «gratis» de «no sé cuánto vale».
 */
export function precioBaseCOP(
  item: ConPrecio | null | undefined,
  trmRate?: number,
): number | undefined {
  if (!item) return undefined;
  if (
    estaAncladoEnUSD(item.precioFinalUSD) &&
    typeof trmRate === 'number' &&
    Number.isFinite(trmRate) &&
    trmRate > 0
  ) {
    return Math.round(item.precioFinalUSD * trmRate);
  }
  return item.precioFinalCOP;
}
