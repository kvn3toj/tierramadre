/**
 * Efectos de un movimiento W3 confirmado: estado de casilla y espejo.
 *
 * Extraído de `movimientos._registrar` -- el maker-checker que viene después
 * (Telegram) confirma un movimiento en un momento distinto al de su
 * registro, y va a necesitar disparar exactamente estos mismos efectos sin
 * duplicar el cuerpo.
 *
 * El recálculo del fijo NO vive acá: lo orquesta el CALLER, porque necesita
 * leer `lotesActivos` antes de este helper (para `lotesAntes`) y otra vez
 * después de él (para `lotesDespues`, una vez patcheadas las casillas). Ver
 * `debeRecalcular` en `_lib/movimientoW3.ts` para la decisión de CUÁNDO
 * recalcular.
 */
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { efectoSobreCasilla, type TipoMovimiento } from './movimientoW3';
import {
  filaCasillaParaEspejo,
  filaMovimientoParaEspejo,
  type FilaMovimiento,
} from './espejoFilas';
import type { Id } from '../_generated/dataModel';

export interface ParamsEfectos {
  tipo: TipoMovimiento;
  casillas: Array<
    Record<string, unknown> & {
      _id: Id<'lotItems'>;
      itemId: string;
      loteId: string;
    }
  >;
  movimientoId: string;
  kardexEventId: string;
  fecha: string;
  itemIds: string[];
  entregadoPor: string;
  recibidoPor: string;
  condicion?: string;
  origenKardexEventId?: string;
  venta?: FilaMovimiento['venta'];
  renombrePorLote: Map<string, string | undefined>;
  ts: number;
}

/**
 * Efectos de CONFIRMAR un movimiento: estado de casilla y espejo. El
 * recálculo del fijo NO vive acá -- lo orquesta el caller, porque necesita
 * leer `lotesActivos` ANTES de que este helper patchee las casillas. Ver
 * `debeRecalcular` en `_lib/movimientoW3.ts` para la decisión de CUÁNDO.
 */
export async function aplicarEfectosConfirmacion(
  ctx: MutationCtx,
  p: ParamsEfectos,
): Promise<void> {
  const nuevoEstado = efectoSobreCasilla(p.tipo);

  for (const casilla of p.casillas) {
    await ctx.db.patch(casilla._id, { estadoCasilla: nuevoEstado });
    // Re-encolar la casilla: su estado es un campo espejado. Sin esto la
    // hoja sigue diciendo el estado viejo sobre una pieza ya movida -- el
    // mismo defecto que el job de deriva encontró al publicar un lote. La
    // regla es general: toda mutación que cambie un campo espejado vuelve a
    // encolar.
    await ctx.db.insert('espejoOutbox', {
      pestana: 'Casillas',
      idFila: casilla.itemId,
      campos: filaCasillaParaEspejo({
        ...casilla,
        estadoCasilla: nuevoEstado,
        renombreLote: p.renombrePorLote.get(casilla.loteId),
      } as never),
      estado: 'pendiente',
      intentos: 0,
      creadoEn: p.ts,
    });
  }

  await ctx.db.insert('espejoOutbox', {
    pestana: 'Movimientos',
    idFila: p.movimientoId,
    // Armada en `_lib/espejoFilas.ts` y no acá: ahí vive la regla de datos
    // sensibles del canon -- la cuenta y el titular no viajan -- y se puede
    // testear sin arnés. Inline, esa regla dependía de que cada quien que
    // tocara este objeto se acordara de ella.
    campos: filaMovimientoParaEspejo({
      movimientoId: p.movimientoId,
      kardexEventId: p.kardexEventId,
      tipo: p.tipo,
      fecha: p.fecha,
      itemIds: p.itemIds,
      entregadoPor: p.entregadoPor,
      recibidoPor: p.recibidoPor,
      condicion: p.condicion,
      origenKardexEventId: p.origenKardexEventId,
      venta: p.venta,
    }),
    estado: 'pendiente',
    intentos: 0,
    creadoEn: p.ts,
  });

  // Una sola vez por movimiento, no por casilla: el drenaje toma la cola
  // entera y agendar N veces solo multiplica trabajo idéntico.
  await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 25 });
  // Una VENTA mueve `ventasMesCOP` y saca la pieza de `inventarioActivoCOP`
  // aunque no haya recalculado el divisor (el lote puede seguir con
  // hermanas vivas). Consignación/devolución no cambian ningún número del
  // Tablero, pero republicar es idempotente -- más simple que discriminar
  // por tipo acá.
  await ctx.scheduler.runAfter(0, internal.espejo._publicarTablero, {});
}
