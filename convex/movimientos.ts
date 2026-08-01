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
import { action, internalMutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireAccessLevel } from './_lib/authz';
import {
  efectoSobreCasilla,
  puedeVenderse,
  validarMovimiento,
  type MovimientoInput,
} from './_lib/movimientoW3';
import { planificarRecalculo } from './_lib/recalculo';
import { configVigente, contarLotesActivosDb } from './precios';

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
  registradoPor: v.optional(v.string()),
} as const;

export const _registrar = internalMutation({
  args: registrarArgs,
  handler: async (ctx, args) => {
    const { registradoPor = 'sistema', ...movimiento } = args;
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

    // El candado anti doble-venta, ANTES de escribir nada.
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

    const lotesAntes = await contarLotesActivosDb(ctx);

    const ts = Date.now();
    const kardexEventId = `KE-${ts}`;
    const nuevoEstado = efectoSobreCasilla(args.tipo);

    for (const casilla of casillas) {
      await ctx.db.patch(casilla._id, { estadoCasilla: nuevoEstado });
    }

    const movimientoId = `MOV-${ts}`;
    await ctx.db.insert('movimientos', {
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

    // Recálculo: solo la venta puede apagar un lote. Consignación y devolución
    // no mueven el divisor — la pieza sigue viva en el inventario.
    const config = await configVigente(ctx, args.fecha);
    const lotesDespues = await contarLotesActivosDb(ctx);
    const plan = planificarRecalculo({
      evento:
        args.tipo === 'VENTA'
          ? 'VENTA'
          : args.tipo === 'DEVOLUCION'
            ? 'DEVOLUCION'
            : 'CONSIGNACION',
      config,
      lotesActivosAntes: lotesAntes.lotesActivos,
      lotesActivosDespues: lotesDespues.lotesActivos,
      unidadesActivas: lotesDespues.unidadesActivas,
      ts,
    });
    if (plan.recalcula && plan.traza) {
      await ctx.db.insert('recalculos', { ...plan.traza, motivo: plan.motivo });
    }

    await ctx.db.insert('espejoOutbox', {
      pestana: 'Movimientos',
      idFila: movimientoId,
      campos: {
        movimientoId,
        kardexEventId,
        tipo: args.tipo,
        fecha: args.fecha,
        items: args.itemIds.join(', '),
        entregadoPor: args.entregadoPor,
        recibidoPor: args.recibidoPor,
        cliente: args.venta?.cliente ?? '',
        precioVentaRealCOP: args.venta
          ? String(args.venta.precioVentaRealCOP)
          : '',
        comisionPct: args.venta?.comisionPct
          ? String(args.venta.comisionPct)
          : '',
        formaPago: args.venta?.formaPago ?? '',
        origenKardexEventId: args.origenKardexEventId ?? '',
        condicion: args.condicion ?? '',
      },
      estado: 'pendiente',
      intentos: 0,
      creadoEn: ts,
    });

    return {
      movimientoId,
      kardexEventId,
      nuevoEstado,
      recalculo: plan.recalcula ? plan.traza : undefined,
    };
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
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.movimientos._registrar, {
      ...args,
      registradoPor: args.registradoPor ?? caller.email,
    });
  },
});

/** El historial de una pieza — la cadena consignación → venta, trazada. */
export const porItem = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const todos = await ctx.db
      .query('movimientos')
      .withIndex('by_ts')
      .collect();
    return todos
      .filter((m) => m.itemIds.includes(itemId))
      .sort((a, b) => b.ts - a.ts);
  },
});

/** Las piezas hoy en consignación — la bandeja de graduación de W5. */
export const enConsignacion = query({
  args: {},
  handler: async (ctx) => {
    const casillas = await ctx.db.query('lotItems').collect();
    return casillas.filter((c) => c.estadoCasilla === 'EN_CONSIGNACION');
  },
});
