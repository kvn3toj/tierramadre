/**
 * W3 vía Telegram — fase 1 (reserva) y fase 2 (confirmar/rechazar) del
 * maker-checker. La web sigue usando `movimientos.ts _registrar` sin cambios;
 * este archivo es SOLO el camino del bot.
 */
import { v } from 'convex/values';
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { requireBotSecret } from './_lib/botAuth';
import {
  debeRecalcular,
  puedeAplicarseSobre,
  puedeVenderse,
  validarMotivoRechazo,
  validarMovimiento,
  type MovimientoInput,
} from './_lib/movimientoW3';
import { aplicarEfectosConfirmacion } from './_lib/movimientoEfectos';
import {
  aResumenPendiente,
  type PendienteResumen,
} from './_lib/resumenPendiente';
import { configVigente, contarLotesActivosDb } from './precios';
import { planificarRecalculo } from './_lib/recalculo';
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

const registrarPendienteArgs = {
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
  clientToken: v.optional(v.string()),
} as const;

export const _registrarPendiente = internalMutation({
  args: { ...registrarPendienteArgs, registradoPor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { registradoPor = 'sistema', clientToken, ...movimiento } = args;

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
            estadoMovimiento: 'POR_CONFIRMAR';
          };
        }
        await ctx.db.delete(prior._id);
      }
    }

    validarMovimiento(movimiento as MovimientoInput);

    const casillas = [];
    for (const itemId of movimiento.itemIds) {
      const casilla = await ctx.db
        .query('lotItems')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!casilla?.estadoCasilla) {
        throw new Error(
          `El ítem ${itemId} no es una casilla v4. El riel viejo se mueve por su propio kardex.`,
        );
      }
      casillas.push(casilla);
    }

    for (const casilla of casillas) {
      const veredicto = puedeAplicarseSobre(movimiento.tipo, {
        itemId: casilla.itemId,
        estadoCasilla: casilla.estadoCasilla!,
      });
      if (!veredicto.ok) throw new Error(veredicto.motivo);
    }

    if (movimiento.tipo === 'VENTA') {
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
            `No se puede reservar el ítem ${casilla.itemId}: ${veredicto.motivo}`,
          );
        }
      }
    }

    const ts = Date.now();
    const n = await allocateNext(ctx, 'movimientos');
    const movimientoId = `MOV-${String(n).padStart(6, '0')}`;
    const kardexEventId = `KE-${String(n).padStart(6, '0')}`;

    for (const casilla of casillas) {
      await ctx.db.patch(casilla._id, { estadoCasilla: 'RESERVADA' });
      // Deliberado: SIN espejoOutbox acá. El espejo nunca ve la reserva --
      // solo ve el estado final si se confirma. Ver spec §3.
    }

    const movId = await ctx.db.insert('movimientos', {
      movimientoId,
      kardexEventId,
      tipo: movimiento.tipo,
      fecha: movimiento.fecha,
      itemIds: movimiento.itemIds,
      entregadoPor: movimiento.entregadoPor,
      recibidoPor: movimiento.recibidoPor,
      condicion: movimiento.condicion,
      notas: movimiento.notas,
      venta: movimiento.venta,
      origenKardexEventId: movimiento.origenKardexEventId,
      registradoPor,
      ts,
      estadoMovimiento: 'POR_CONFIRMAR',
    });

    const resultado = {
      movimientoId,
      kardexEventId,
      estadoMovimiento: 'POR_CONFIRMAR' as const,
    };

    if (clientToken) {
      await ctx.db.insert('commitTokens', {
        token: clientToken,
        kind: 'movimientosV4.registrarPendiente',
        primaryId: movId,
        result: JSON.stringify(resultado),
        createdAt: new Date().toISOString(),
      });
    }

    return resultado;
  },
});

/**
 * Fase 2 del maker-checker: resolver un pendiente. Ambas mutations comparten
 * esta lectura porque las dos exigen lo mismo antes de tocar nada: que el
 * movimiento exista y que siga POR_CONFIRMAR -- resolverlo dos veces (una
 * confirmación tardía sobre un rechazo ya aplicado, o viceversa) revertiría o
 * duplicaría efectos ya aplicados sobre la casilla.
 */
async function cargarPorMovimientoId(ctx: any, movimientoId: string) {
  const mov = await ctx.db
    .query('movimientos')
    .filter((q: any) => q.eq(q.field('movimientoId'), movimientoId))
    .first();
  if (!mov) throw new Error(`Movimiento ${movimientoId} no existe.`);
  if (mov.estadoMovimiento !== 'POR_CONFIRMAR') {
    throw new Error(
      `Movimiento ${movimientoId} ya está ${mov.estadoMovimiento ?? 'CONFIRMADO'}; no se puede resolver dos veces.`,
    );
  }
  return mov;
}

/**
 * Reverifica, justo antes de tocar nada, que cada casilla del movimiento
 * siga RESERVADA. La reserva de `_registrarPendiente` NO es un candado
 * exclusivo: `casillas._guardar` (el guardado W2 del Cerebro Creativo)
 * fuerza `estadoCasilla` a `PENDIENTE_CLASIFICAR` sin mirar el estado
 * actual cuando el patch deja incompleto un campo requerido -- eso puede
 * clobberear una RESERVADA mientras este pendiente todavía espera
 * confirmación o rechazo, dejándola libre para que otro movimiento la
 * venda. Confirmar o rechazar ciegamente sobre esa casilla revertiría esa
 * venta nueva sin dejar rastro (el mismo hueco que el candado terminal de
 * `puedeAplicarseSobre` existe para cerrar).
 *
 * Por eso ambas mutations recargan el estado real de cada casilla antes de
 * aplicar cualquier efecto o patch, y si alguna ya no está RESERVADA (o ya
 * no existe), abortan sin tocar ni una sola casilla ni el movimiento: es un
 * conflicto real que alguien tiene que investigar, no algo que deba
 * resolverse solo en silencio.
 */
async function cargarCasillasReservadas(ctx: any, itemIds: string[]) {
  const casillas = [];
  for (const itemId of itemIds) {
    const casilla = await ctx.db
      .query('lotItems')
      .withIndex('by_itemId', (q: any) => q.eq('itemId', itemId))
      .first();
    const estadoActual =
      casilla?.estadoCasilla ?? 'SIN_CASILLA (fue eliminada)';
    if (estadoActual !== 'RESERVADA') {
      throw new Error(
        `El ítem ${itemId} ya no está RESERVADA (estado actual: ${estadoActual}); ` +
          `algo más la tocó mientras este movimiento esperaba resolución. No se ` +
          `aplicó ningún efecto -- hay que investigar antes de confirmar o rechazar.`,
      );
    }
    casillas.push(casilla);
  }
  return casillas;
}

export const _confirmar = internalMutation({
  args: {
    movimientoId: v.string(),
    resueltoPor: v.string(),
    clientToken: v.optional(v.string()),
  },
  handler: async (ctx, { movimientoId, resueltoPor, clientToken }) => {
    if (clientToken) {
      const prior = await ctx.db
        .query('commitTokens')
        .withIndex('by_token', (q) => q.eq('token', clientToken))
        .unique();
      if (prior)
        return JSON.parse(prior.result) as { estadoMovimiento: 'CONFIRMADO' };
    }

    const mov = await cargarPorMovimientoId(ctx, movimientoId);

    const casillas = await cargarCasillasReservadas(ctx, mov.itemIds);

    const lotesAntes = debeRecalcular(mov.tipo)
      ? await contarLotesActivosDb(ctx)
      : { lotesActivos: 0, unidadesActivas: 0 };

    const renombrePorLote = new Map<string, string | undefined>();
    for (const loteId of new Set(casillas.map((c) => c.loteId))) {
      const l = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .first();
      renombrePorLote.set(loteId, l?.renombreLote);
    }

    await aplicarEfectosConfirmacion(ctx, {
      tipo: mov.tipo,
      casillas: casillas as never,
      movimientoId: mov.movimientoId,
      kardexEventId: mov.kardexEventId,
      fecha: mov.fecha,
      itemIds: mov.itemIds,
      entregadoPor: mov.entregadoPor,
      recibidoPor: mov.recibidoPor,
      condicion: mov.condicion,
      origenKardexEventId: mov.origenKardexEventId,
      venta: mov.venta,
      renombrePorLote,
      ts: Date.now(),
    });

    if (debeRecalcular(mov.tipo)) {
      const config = await configVigente(ctx, mov.fecha);
      const lotesDespues = await contarLotesActivosDb(ctx);
      const plan = planificarRecalculo({
        evento: 'VENTA',
        config,
        lotesActivosAntes: lotesAntes.lotesActivos,
        lotesActivosDespues: lotesDespues.lotesActivos,
        unidadesActivas: lotesDespues.unidadesActivas,
        ts: Date.now(),
      });
      if (plan.recalcula && plan.traza) {
        await ctx.db.insert('recalculos', {
          ...plan.traza,
          motivo: plan.motivo,
        });
      }
    }

    await ctx.db.patch(mov._id, {
      estadoMovimiento: 'CONFIRMADO',
      resueltoPor,
      resueltoEn: Date.now(),
    });

    const resultado = { estadoMovimiento: 'CONFIRMADO' as const };
    if (clientToken) {
      await ctx.db.insert('commitTokens', {
        token: clientToken,
        kind: 'movimientosV4.confirmar',
        primaryId: mov._id,
        result: JSON.stringify(resultado),
        createdAt: new Date().toISOString(),
      });
    }
    return resultado;
  },
});

export const _rechazar = internalMutation({
  args: {
    movimientoId: v.string(),
    resueltoPor: v.string(),
    motivo: v.string(),
    clientToken: v.optional(v.string()),
  },
  handler: async (ctx, { movimientoId, resueltoPor, motivo, clientToken }) => {
    validarMotivoRechazo(motivo);

    if (clientToken) {
      const prior = await ctx.db
        .query('commitTokens')
        .withIndex('by_token', (q) => q.eq('token', clientToken))
        .unique();
      if (prior)
        return JSON.parse(prior.result) as { estadoMovimiento: 'RECHAZADO' };
    }

    const mov = await cargarPorMovimientoId(ctx, movimientoId);

    const casillas = await cargarCasillasReservadas(ctx, mov.itemIds);
    for (const casilla of casillas) {
      await ctx.db.patch(casilla._id, { estadoCasilla: 'DISPONIBLE' });
      // Sin espejoOutbox: el espejo nunca vio la reserva, así que no hay nada que corregir.
    }

    await ctx.db.patch(mov._id, {
      estadoMovimiento: 'RECHAZADO',
      motivoRechazo: motivo.trim(),
      resueltoPor,
      resueltoEn: Date.now(),
    });

    const resultado = { estadoMovimiento: 'RECHAZADO' as const };
    if (clientToken) {
      await ctx.db.insert('commitTokens', {
        token: clientToken,
        kind: 'movimientosV4.rechazar',
        primaryId: mov._id,
        result: JSON.stringify(resultado),
        createdAt: new Date().toISOString(),
      });
    }
    return resultado;
  },
});

/**
 * anima-bot bridge — fase 1 (reserva) vía Telegram, con secreto compartido en
 * vez del token de Google Sign-In (ver `_lib/botAuth.ts`). Reusa `_registrarPendiente`
 * sin cambios; `autoConfirmar` es solo azúcar para llamadores que ya tienen
 * potestad de confirmación (p.ej. el propio dueño resolviendo su venta al
 * vuelo) -- sigue pasando por las DOS mutations internas, así que el
 * candado de re-verificación de `_confirmar` (ver comentario sobre
 * `cargarCasillasReservadas`) sigue aplicando igual.
 */
export const registrarViaBot = action({
  args: {
    botSecret: v.string(),
    telegramUserId: v.number(),
    autoConfirmar: v.optional(v.boolean()),
    ...registrarPendienteArgs,
  },
  handler: async (
    ctx,
    { botSecret, telegramUserId, autoConfirmar, ...args },
  ): Promise<{
    movimientoId: string;
    kardexEventId: string;
    estadoMovimiento: 'POR_CONFIRMAR' | 'CONFIRMADO';
  }> => {
    requireBotSecret(botSecret);
    const pendiente = await ctx.runMutation(
      internal.movimientosV4._registrarPendiente,
      {
        ...args,
        registradoPor: `telegram:${telegramUserId}`,
      },
    );
    if (!autoConfirmar) return pendiente;
    const confirmado = await ctx.runMutation(
      internal.movimientosV4._confirmar,
      {
        movimientoId: pendiente.movimientoId,
        resueltoPor: `telegram:${telegramUserId}`,
      },
    );
    return { ...pendiente, estadoMovimiento: confirmado.estadoMovimiento };
  },
});

/**
 * anima-bot bridge — fase 2 (confirmar/rechazar) vía Telegram. Reusa
 * `_confirmar`/`_rechazar` sin cambios; `motivo` se normaliza a `''` cuando
 * no viene, porque `validarMotivoRechazo` (Tarea 5), dentro de `_rechazar`,
 * ya rechaza un motivo vacío -- así que no hace falta duplicar esa
 * validación acá.
 */
export const resolverViaBot = action({
  args: {
    botSecret: v.string(),
    telegramUserId: v.number(),
    movimientoId: v.string(),
    accion: v.union(v.literal('confirmar'), v.literal('rechazar')),
    motivo: v.optional(v.string()),
    clientToken: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { botSecret, telegramUserId, movimientoId, accion, motivo, clientToken },
  ): Promise<{ estadoMovimiento: 'CONFIRMADO' | 'RECHAZADO' }> => {
    requireBotSecret(botSecret);
    if (accion === 'confirmar') {
      return await ctx.runMutation(internal.movimientosV4._confirmar, {
        movimientoId,
        resueltoPor: `telegram:${telegramUserId}`,
        clientToken,
      });
    }
    return await ctx.runMutation(internal.movimientosV4._rechazar, {
      movimientoId,
      resueltoPor: `telegram:${telegramUserId}`,
      motivo: motivo ?? '',
      clientToken,
    });
  },
});

/**
 * Briefing diario del bot — pendientes que llevan más de `masHorasQue`
 * esperando confirmación. Deliberadamente NO devuelve `venta` ni ningún dato
 * de pago: `aResumenPendiente` (pura, en `_lib/resumenPendiente.ts`) es quien
 * decide la forma exacta de lo que sale de acá, y se testea aparte para
 * probar esa ausencia sin necesitar un movimiento real en base.
 */
export const listarPendientesViaBot = action({
  args: { botSecret: v.string(), masHorasQue: v.number() },
  handler: async (
    ctx,
    { botSecret, masHorasQue },
  ): Promise<PendienteResumen[]> => {
    requireBotSecret(botSecret);
    const corte = Date.now() - masHorasQue * 3600 * 1000;
    const todos = await ctx.runQuery(
      internal.movimientosV4._listarPendientesInterno,
      {},
    );
    const ahora = Date.now();
    return todos
      .filter((m) => m.ts <= corte)
      .map((m) => aResumenPendiente(m, ahora));
  },
});

export const _listarPendientesInterno = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('movimientos')
      .filter((q) => q.eq(q.field('estadoMovimiento'), 'POR_CONFIRMAR'))
      .collect();
  },
});
