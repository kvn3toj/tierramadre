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
 * Derivarlo compra tres cosas: no hay nada que el pull pueda pisar, no hace
 * falta un reaper que pueda fallar y dejar una piedra bloqueada para siempre
 * (el vencimiento es el paso del tiempo), y la carrera se cierra sola porque
 * las mutations de Convex son serializables: leer las ventas pendientes e
 * insertar la nueva dentro de la misma mutation es atómico.
 *
 * Todo aquí es puro (ver tests/reservas.test.ts); la mutation solo aporta el IO.
 * Una excepción: `reservedItemIds` emite un `console.warn` si una `fechaVenta`
 * no se parsea, así que una fila corrupta es audible en vez de silenciosa.
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
  /** ISO 8601. En ISO el orden lexicográfico es el cronológico. */
  fechaVenta: string;
  /**
   * Solo `reservada` aparta. Se filtra también aquí, no solo en el rango del
   * índice, para que la función sea autocontenida: cualquiera puede leerla y
   * saber qué aparta sin ir a mirar cómo la consulta la mutation.
   */
  estado: string;
}

/**
 * El límite inferior del rango de índice que la mutation consulta. Se devuelve
 * como ISO porque `fechaVenta` es un string y el índice se recorre por rango
 * sobre ese string.
 */
export function reservaCutoffISO(
  now: number,
  ttlMs: number = RESERVA_TTL_MS,
): string {
  return new Date(now - ttlMs).toISOString();
}

/**
 * Los itemIds apartados por las ventas pendientes vigentes. Falla CERRADA:
 * una `fechaVenta` ilegible hace que esa venta reserve (conservador). Una
 * piedra estancada es visible y recuperable — alguien no puede venderla y
 * alguien la arregla. Una piedra vendida dos veces se descubre solo después
 * de dos pagos, y un cliente tiene que llevarse el no. Entre "temporalmente
 * invendible" y "vendida dos veces", esta lógica elige lo primero.
 * Excepto: una venta con `estado !== 'reservada'` y una fecha rota sigue sin
 * apartar (e.g. una `cancelada` corrupta no bloquea nada).
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
    const t = Date.parse(sale.fechaVenta);
    if (Number.isFinite(t)) {
      if (t < cutoff) continue;
    } else {
      // Fecha ilegible en una venta reservada: aparta conservadoramente.
      console.warn(
        `[reservas] unparseable fechaVenta in reservada sale: ${sale.fechaVenta}`,
      );
    }
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
 * Una fecha ilegible hace que esa venta NO sea reusable (por contraste con
 * `reservedItemIds`, que sí aparta). Reusar una venta que no se puede fechar
 * le daría al cliente una reserva de edad desconocida, y si esa edad se agota
 * entre que empieza el checkout y que llega el pago, la piedra se suelta sin
 * aviso.
 */
export function findReusableSale<T extends PendingSaleLike>(
  sales: T[],
  clientId: string,
  itemIds: string[],
  now: number,
  ttlMs: number = RESERVA_TTL_MS,
): T | null {
  const cutoff = now - ttlMs;
  const fingerprint = orderFingerprint(itemIds);
  for (const sale of sales) {
    if (sale.estado !== 'reservada') continue;
    const t = Date.parse(sale.fechaVenta);
    if (!Number.isFinite(t) || t < cutoff) continue;
    if (sale.clientId !== clientId) continue;
    if (orderFingerprint(sale.itemIds) === fingerprint) return sale;
  }
  return null;
}
