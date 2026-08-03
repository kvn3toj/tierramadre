/**
 * W3 vía Telegram — fase 1 (reserva) y fase 2 (confirmar/rechazar) del
 * maker-checker. La web sigue usando `movimientos.ts _registrar` sin cambios;
 * este archivo es SOLO el camino del bot.
 */
import { v } from 'convex/values';
import { action, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { requireBotSecret } from './_lib/botAuth';
import {
  puedeAplicarseSobre,
  puedeVenderse,
  validarMovimiento,
  type MovimientoInput,
} from './_lib/movimientoW3';
import { aplicarEfectosConfirmacion } from './_lib/movimientoEfectos';
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
