/**
 * Briefing diario del bot — resumen de movimientos POR_CONFIRMAR.
 *
 * Pura, sin `ctx`. Es la función que decide QUÉ campos viajan al bot; se
 * testea directamente para probar la ausencia de datos de pago sin necesitar
 * un movimiento real en base. `listarPendientesViaBot` (action, en
 * `movimientosV4.ts`) es el cascarón que lee de `ctx.db` y le aplica esta
 * función a cada fila.
 */

export interface MovimientoPendienteRaw {
  movimientoId: string;
  tipo: string;
  itemIds: string[];
  registradoPor: string;
  ts: number;
}

export interface PendienteResumen {
  movimientoId: string;
  tipo: string;
  itemIds: string[];
  registradoPor: string;
  horasEsperando: number;
}

/**
 * Da forma al resumen que sale hacia el bot/briefing -- deliberadamente NO
 * incluye `venta` ni ningún dato de pago. Separada de la query para poder
 * probar esta ausencia sin un movimiento real en base.
 */
export function aResumenPendiente(
  mov: MovimientoPendienteRaw,
  ahoraMs: number,
): PendienteResumen {
  return {
    movimientoId: mov.movimientoId,
    tipo: mov.tipo,
    itemIds: mov.itemIds,
    registradoPor: mov.registradoPor,
    horasEsperando: Math.floor((ahoraMs - mov.ts) / 3600000),
  };
}
