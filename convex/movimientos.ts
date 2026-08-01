/**
 * W3 — registrar un movimiento sobre casillas v4.
 *
 * Riel paralelo al kardex legacy (`asesorMovements`) y a `sales.create`, que
 * quedan intactos. La unificación de esos dos es la decisión abierta #9 de la
 * spec, y hacerla ahora tocaría código desplegado en producción; acá se
 * construye el modelo nuevo sobre las casillas v4, que nadie más usa todavía.
 *
 * Toda la validación vive en `_lib/movimientoW3.ts`. Acá: leer, aplicar
 * efectos, recalcular y encolar al espejo.
 */
import { v } from 'convex/values';
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { requireAccessLevel, ROLES_COSTOS } from './_lib/authz';
import {
  efectoSobreCasilla,
  puedeAplicarseSobre,
  puedeVenderse,
  validarMovimiento,
  type MovimientoInput,
} from './_lib/movimientoW3';
import {
  filaCasillaParaEspejo,
  filaMovimientoParaEspejo,
} from './_lib/espejoFilas';
import { planificarRecalculo } from './_lib/recalculo';
import { configVigente, contarLotesActivosDb } from './precios';
import { allocateNext } from './sequences';
import type { Id } from './_generated/dataModel';

const ventaValidator = v.object({
  cliente: v.string(),
  precioVentaRealCOP: v.number(),
  comisionPct: v.optional(v.number()),
  pagoComisionesA: v.optional(v.string()),
  formaPago: v.string(),
  efectivo: v.optional(
    v.object({
      numeroRecibo: v.string(),
      recibidoPor: v.string(),
      /**
       * Cuándo entró la plata a caja. Opcional: el recibo se hace en el
       * momento de la venta y la plata puede llegar a caja días después, así
       * que exigirla bloquearía registrar la venta el día que ocurrió.
       */
      fechaIngresoCaja: v.optional(v.string()),
      ubicacion: v.optional(v.string()),
    }),
  ),
  transferencia: v.optional(
    v.object({
      numeroCuenta: v.string(),
      titular: v.string(),
      banco: v.string(),
      numeroTransaccion: v.string(),
    }),
  ),
  credito: v.optional(
    v.object({ fechaInicio: v.string(), fechaPago: v.string() }),
  ),
});

const registrarArgs = {
  tipo: v.union(
    v.literal('VENTA'),
    v.literal('CONSIGNACION'),
    v.literal('DEVOLUCION'),
    v.literal('ASESOR'),
  ),
  fecha: v.string(),
  itemIds: v.array(v.string()),
  entregadoPor: v.string(),
  recibidoPor: v.string(),
  condicion: v.optional(v.string()),
  notas: v.optional(v.string()),
  venta: v.optional(ventaValidator),
  origenKardexEventId: v.optional(v.string()),
  /**
   * Idempotencia: un reintento con el mismo token devuelve el movimiento ya
   * creado en vez de registrar la venta dos veces. El schema declara los
   * `create` como MONEY-CRITICAL y este lo es tanto como los demás.
   */
  clientToken: v.optional(v.string()),
} as const;

// `registradoPor` fuera del validator público: quién registró una venta no
// puede ser un campo que el propio caller elige.
const registrarInternoArgs = {
  ...registrarArgs,
  registradoPor: v.optional(v.string()),
} as const;

export const _registrar = internalMutation({
  args: registrarInternoArgs,
  handler: async (ctx, args) => {
    const { registradoPor = 'sistema', clientToken, ...movimiento } = args;

    // Replay: mismo token, mismo resultado. Sin esto, un doble clic o un
    // reintento del cliente registran la venta dos veces.
    if (clientToken) {
      const prior = await ctx.db
        .query('commitTokens')
        .withIndex('by_token', (q) => q.eq('token', clientToken))
        .unique();
      if (prior) {
        const sigue = await ctx.db.get(prior.primaryId as Id<'movimientos'>);
        if (sigue) {
          return JSON.parse(prior.result) as {
            movimientoId: string;
            kardexEventId: string;
            nuevoEstado: string;
          };
        }
        await ctx.db.delete(prior._id);
      }
    }

    validarMovimiento(movimiento as MovimientoInput);

    const casillas = [];
    for (const itemId of args.itemIds) {
      const casilla = await ctx.db
        .query('lotItems')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!casilla?.estadoCasilla) {
        throw new Error(
          `El ítem ${itemId} no es una casilla v4. El riel viejo se mueve por ` +
            `su propio kardex.`,
        );
      }
      casillas.push(casilla);
    }

    // `VENDIDA` es terminal para CUALQUIER tipo, no solo frente a otra venta:
    // una devolución sobre una pieza vendida la devolvía a DISPONIBLE y
    // revertía la venta sin dejar rastro ni disparar recálculo.
    for (const casilla of casillas) {
      const veredicto = puedeAplicarseSobre(args.tipo, {
        itemId: casilla.itemId,
        estadoCasilla: casilla.estadoCasilla!,
      });
      if (!veredicto.ok) throw new Error(veredicto.motivo);
    }

    // El candado anti doble-venta por modalidad, ANTES de escribir nada.
    if (args.tipo === 'VENTA') {
      for (const casilla of casillas) {
        const hermanas = casilla.modalidadGrupo
          ? (
              await ctx.db
                .query('lotItems')
                .withIndex('by_loteId', (q) => q.eq('loteId', casilla.loteId))
                .collect()
            ).filter(
              (h) =>
                h.modalidadGrupo === casilla.modalidadGrupo &&
                h.itemId !== casilla.itemId,
            )
          : [];

        const veredicto = puedeVenderse(
          { estadoCasilla: casilla.estadoCasilla! },
          hermanas.map((h) => ({
            itemId: h.itemId,
            estadoCasilla: h.estadoCasilla ?? '',
          })),
        );
        if (!veredicto.ok) {
          throw new Error(
            `No se puede vender el ítem ${casilla.itemId}: ${veredicto.motivo}`,
          );
        }
      }
    }

    // Solo la VENTA puede apagar un lote; consignación, devolución y asesor no
    // mueven el divisor POR TIPO (`_lib/recalculo`). Contar el inventario para
    // ellos eran dos barridos de tres tablas garantizadamente inútiles, en el
    // mismo proyecto que apagó sus crons por ancho de banda.
    const recalculaPorTipo = args.tipo === 'VENTA';
    const lotesAntes = recalculaPorTipo
      ? await contarLotesActivosDb(ctx)
      : { lotesActivos: 0, unidadesActivas: 0 };

    const ts = Date.now();
    // El id NO sale de `Date.now()` solo: dos registros en el mismo
    // milisegundo producían `MOV-x` idéntico, y como el espejo hace upsert por
    // id, uno de los dos movimientos desaparecía de la hoja aunque existiera en
    // Convex. La secuencia lo hace único; el ts queda como dato, no como clave.
    const n = await allocateNext(ctx, 'movimientos');
    const movimientoId = `MOV-${String(n).padStart(6, '0')}`;
    const kardexEventId = `KE-${String(n).padStart(6, '0')}`;
    const nuevoEstado = efectoSobreCasilla(args.tipo);

    // El renombre del lote viaja denormalizado en la fila de la casilla. Se
    // resuelve una vez por lote y no una por casilla: un movimiento de 20 piezas
    // del mismo lote haría 20 lecturas idénticas.
    const renombrePorLote = new Map<string, string | undefined>();
    for (const loteId of new Set(casillas.map((c) => c.loteId))) {
      const l = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .first();
      renombrePorLote.set(loteId, l?.renombreLote);
    }

    for (const casilla of casillas) {
      await ctx.db.patch(casilla._id, { estadoCasilla: nuevoEstado });
      // Re-encolar la casilla: su estado es un campo espejado. Sin esto la
      // hoja sigue diciendo DISPONIBLE sobre una pieza ya vendida — el mismo
      // defecto que el job de deriva encontró al publicar un lote. La regla es
      // general: toda mutación que cambie un campo espejado vuelve a encolar.
      await ctx.db.insert('espejoOutbox', {
        pestana: 'Casillas',
        idFila: casilla.itemId,
        campos: filaCasillaParaEspejo({
          ...casilla,
          estadoCasilla: nuevoEstado,
          renombreLote: renombrePorLote.get(casilla.loteId),
        } as never),
        estado: 'pendiente',
        intentos: 0,
        creadoEn: ts,
      });
    }

    const movId = await ctx.db.insert('movimientos', {
      movimientoId,
      kardexEventId,
      tipo: args.tipo,
      fecha: args.fecha,
      itemIds: args.itemIds,
      entregadoPor: args.entregadoPor,
      recibidoPor: args.recibidoPor,
      condicion: args.condicion,
      notas: args.notas,
      venta: args.venta,
      origenKardexEventId: args.origenKardexEventId,
      registradoPor,
      ts,
    });

    // La config se lee PEREZOSAMENTE, solo si el tipo puede recalcular. Antes
    // se leía siempre y `configVigenteEn` lanza si no hay regla para esa fecha:
    // un backfill de kardex con fecha anterior al 2026-07-01 no se podía
    // registrar, aunque una devolución no toque ningún precio.
    if (recalculaPorTipo) {
      const config = await configVigente(ctx, args.fecha);
      const lotesDespues = await contarLotesActivosDb(ctx);
      const plan = planificarRecalculo({
        evento: 'VENTA',
        config,
        lotesActivosAntes: lotesAntes.lotesActivos,
        lotesActivosDespues: lotesDespues.lotesActivos,
        unidadesActivas: lotesDespues.unidadesActivas,
        ts,
      });
      if (plan.recalcula && plan.traza) {
        await ctx.db.insert('recalculos', {
          ...plan.traza,
          motivo: plan.motivo,
        });
      }
    }

    await ctx.db.insert('espejoOutbox', {
      pestana: 'Movimientos',
      idFila: movimientoId,
      // Armada en `_lib/espejoFilas.ts` y no acá: ahí vive la regla de datos
      // sensibles del canon —la cuenta y el titular no viajan— y se puede
      // testear sin arnés. Inline, esa regla dependía de que cada quien que
      // tocara este objeto se acordara de ella.
      campos: filaMovimientoParaEspejo({
        movimientoId,
        kardexEventId,
        tipo: args.tipo,
        fecha: args.fecha,
        itemIds: args.itemIds,
        entregadoPor: args.entregadoPor,
        recibidoPor: args.recibidoPor,
        condicion: args.condicion,
        origenKardexEventId: args.origenKardexEventId,
        venta: args.venta,
      }),
      estado: 'pendiente',
      intentos: 0,
      creadoEn: ts,
    });

    // Una sola vez por movimiento, no por casilla: el drenaje toma la cola
    // entera y agendar N veces solo multiplica trabajo idéntico.
    await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 25 });
    // Una VENTA mueve `ventasMesCOP` y saca la pieza de `inventarioActivoCOP`
    // aunque no haya recalculado el divisor (el lote puede seguir con
    // hermanas vivas). Consignación/devolución no cambian ningún número del
    // Tablero, pero republicar es idempotente — más simple que discriminar
    // por tipo acá.
    await ctx.scheduler.runAfter(0, internal.espejo._publicarTablero, {});

    const resultado = {
      movimientoId,
      kardexEventId,
      nuevoEstado,
    };

    if (clientToken) {
      await ctx.db.insert('commitTokens', {
        token: clientToken,
        kind: 'movimientos.registrar',
        primaryId: movId,
        result: JSON.stringify(resultado),
        createdAt: new Date().toISOString(),
      });
    }

    return resultado;
  },
});

export const registrar = action({
  args: { idToken: v.string(), ...registrarArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{
    movimientoId: string;
    kardexEventId: string;
    nuevoEstado: string;
  }> => {
    const caller = await requireAccessLevel(idToken, [...ROLES_COSTOS]);
    return await ctx.runMutation(internal.movimientos._registrar, {
      ...args,
      registradoPor: caller.email,
    });
  },
});

// `porItem` (el historial de una pieza) se RETIRÓ. Era una query PÚBLICA que
// devolvía el documento entero del movimiento, incluyendo `venta.transferencia`
// con número de cuenta y titular del cliente. Los itemIds son secuenciales, así
// que enumerar el ledger completo era un `for`. No la consumía nadie. Cuando la
// UI necesite el historial, vuelve como action gateada.

/**
 * Las piezas hoy en consignación — la bandeja de graduación de W5.
 *
 * Interna: un `lotItems` entero trae `costoUnitarioRealCOP`. Se sirve por la
 * action `enConsignacionSeguro`, que además recorta a lo que la bandeja
 * necesita.
 */
export const _enConsignacion = internalQuery({
  args: {},
  handler: async (ctx) => {
    const casillas = await ctx.db.query('lotItems').collect();
    return casillas
      .filter((c) => c.estadoCasilla === 'EN_CONSIGNACION')
      .map((c) => ({
        itemId: c.itemId,
        loteId: c.loteId,
        renombre: c.renombre,
        ordenEnLote: c.ordenEnLote,
      }));
  },
});

export const enConsignacion = action({
  args: { idToken: v.string() },
  handler: async (
    ctx,
    { idToken },
  ): Promise<
    { itemId: string; loteId: string; renombre?: string; ordenEnLote: number }[]
  > => {
    await requireAccessLevel(idToken, [...ROLES_COSTOS]);
    return await ctx.runQuery(internal.movimientos._enConsignacion, {});
  },
});
