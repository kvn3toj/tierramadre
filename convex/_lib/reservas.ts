/**
 * Reserva derivada — apartar una piedra sin guardar que está apartada.
 *
 * Un ítem está reservado si y solo si alguna venta `reservada` más joven que
 * el TTL contiene su `itemId`. No hay campo de reserva, y esa es la decisión
 * central del diseño: `productInventory.estado` está en el allowlist de pull
 * desde la hoja (`convex/_lib/sheetPullMaps.ts`), así que un `RESERVADA`
 * escrito ahí lo soltaría el siguiente pull —en mitad de un pago— y ensuciaría
 * el SOT con un estado transitorio.
 *
 * La ventana de la reserva se ancla en `_creationTime`, NO en `fechaVenta`,
 * por el mismo motivo un campo más abajo: `sales.fechaVenta` TAMBIÉN está en
 * el allowlist de pull (`convex/_lib/sheetPullMaps.ts:265`, `coerce: 'str'`).
 * Un pull de Sheets a mitad de un pago puede reescribir esa celda en un
 * formato no-ISO (p. ej. `19/08/2026`), que ordena por debajo del cutoff y
 * saca la fila del rango del índice antes de que llegue a memoria — ningún
 * chequeo posterior puede recuperar una fila que el índice ya descartó.
 * `_creationTime` es propiedad de Convex, nunca se pull-ea, y es un número:
 * no hay string que parsear mal ni sistema externo que pueda soltar una
 * reserva reescribiéndolo.
 *
 * Derivarlo compra tres cosas: no hay nada que el pull pueda pisar, no hace
 * falta un reaper que pueda fallar y dejar una piedra bloqueada para siempre
 * (el vencimiento es el paso del tiempo), y la carrera se cierra sola porque
 * las mutations de Convex son serializables: leer las ventas pendientes e
 * insertar la nueva dentro de la misma mutation es atómico.
 *
 * Todo aquí es puro (ver tests/reservas.test.ts); la mutation solo aporta el IO.
 */

/** Cuánto se aparta una piedra entre que empieza el checkout y llega el pago. */
export const RESERVA_TTL_MS = 30 * 60 * 1000;

/**
 * Tope de ítems por pedido. Un pedido legítimo de esmeraldas no se acerca, y
 * acota el daño de una llamada abusiva al endpoint público.
 */
export const MAX_ITEMS_POR_PEDIDO = 10;

export interface PendingSaleLike {
  /** `sales.clientId`, como string — comparado, nunca deferenciado. */
  clientId: string;
  itemIds: string[];
  /**
   * `sales._creationTime` — epoch ms, propiedad de Convex. No usar
   * `fechaVenta`: ver el comentario de cabecera de este módulo.
   */
  creationTime: number;
  /**
   * Solo `reservada` aparta. Se filtra también aquí, no solo en el rango del
   * índice, para que la función sea autocontenida: cualquiera puede leerla y
   * saber qué aparta sin ir a mirar cómo la consulta la mutation.
   */
  estado: string;
  /**
   * `sales.saleId` — sólo para poder NOMBRAR la venta que aparta una piedra
   * cuando se le niega la venta a un vendedor en el mostrador. Opcional
   * porque los predicados de reserva no lo necesitan.
   */
  saleId?: string;
  /**
   * `sales.multiplicador` — el markup con el que se cobró esta reserva.
   * `undefined` en toda fila anterior a este campo; se trata como x1 al
   * comparar (ver `findReusableSale`), no como "no comparable".
   */
  multiplicador?: number;
}

/**
 * Los itemIds apartados por las ventas pendientes vigentes.
 */
export function reservedItemIds(
  sales: PendingSaleLike[],
  now: number,
  ttlMs: number = RESERVA_TTL_MS,
): Set<string> {
  const cutoff = now - ttlMs;
  const held = new Set<string>();
  for (const sale of sales) {
    if (sale.estado !== 'reservada') continue;
    if (sale.creationTime < cutoff) continue;
    for (const itemId of sale.itemIds) held.add(itemId);
  }
  return held;
}

/** Clave estable de un conjunto de ítems, independiente del orden. */
export function orderFingerprint(itemIds: string[]): string {
  return [...itemIds].sort().join(',');
}

/**
 * La venta pendiente que este mismo cliente ya tiene por estos mismos ítems, si
 * existe. Es lo que hace idempotente un doble clic en «Pagar»: sin esto, el
 * segundo clic chocaría contra la reserva que dejó el primero y el cliente
 * vería que su propia piedra «ya no está disponible».
 *
 * El multiplicador entra en la clave de deduplicación a propósito: dos
 * pedidos por los mismos ítems del mismo cliente NO son el mismo pedido si se
 * cobran a markups distintos (bot a x1 a las 08:00, vitrina a x2,6 a las
 * 08:10 — o al revés). Reusar la reserva más vieja filtraría el markup en
 * cualquiera de las dos direcciones. Una reserva sin `multiplicador`
 * (anterior a este campo) se trata como x1, así compara sensatamente contra
 * pedidos nuevos en vez de quedar para siempre irreusable o, peor, coincidir
 * con cualquier markup.
 */
export function findReusableSale<T extends PendingSaleLike>(
  sales: T[],
  clientId: string,
  itemIds: string[],
  now: number,
  ttlMs: number = RESERVA_TTL_MS,
  multiplicador: number = 1,
): T | null {
  const cutoff = now - ttlMs;
  const fingerprint = orderFingerprint(itemIds);
  for (const sale of sales) {
    if (sale.estado !== 'reservada') continue;
    if (sale.creationTime < cutoff) continue;
    if (sale.clientId !== clientId) continue;
    if ((sale.multiplicador ?? 1) !== multiplicador) continue;
    if (orderFingerprint(sale.itemIds) === fingerprint) return sale;
  }
  return null;
}

/** El ítem apartado y la venta que lo aparta. */
export interface ReservationConflict {
  itemId: string;
  /** `saleId` de la venta que lo tiene apartado, para poder nombrarla. */
  saleId: string;
}

/**
 * El primer ítem del pedido que otra venta tiene apartado, o `null`.
 *
 * Existe para el riel POS (`convex/sales._create`), que hasta hoy sólo miraba
 * `productInventory.estado`: una piedra con un pago en línea en curso sigue
 * `DISPONIBLE` —la reserva es derivada, justamente para que el pull de la
 * hoja no pueda pisarla—, así que el mostrador la vendía encima. Cerrar el
 * hueco del lado online y dejarlo abierto del lado de la tienda no cierra
 * nada: la piedra es una sola.
 *
 * Devuelve QUÉ ítem y de QUÉ venta, no un booleano, porque el vendedor
 * necesita saber qué cancelar. Recorre en el orden en que el llamante pidió
 * los ítems —no en el orden de las ventas— para que el mensaje señale el
 * primer ítem de SU lista y sea reproducible.
 */
export function findReservationConflict(
  sales: PendingSaleLike[],
  itemIds: string[],
  now: number,
  ttlMs: number = RESERVA_TTL_MS,
): ReservationConflict | null {
  const cutoff = now - ttlMs;
  for (const itemId of itemIds) {
    for (const sale of sales) {
      if (sale.estado !== 'reservada') continue;
      if (sale.creationTime < cutoff) continue;
      if (!sale.itemIds.includes(itemId)) continue;
      return { itemId, saleId: sale.saleId ?? '(sin saleId)' };
    }
  }
  return null;
}
