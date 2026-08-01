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
import {
  action,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { internal } from './_generated/api';
import { requireAccessLevel, ROLES_COSTOS } from './_lib/authz';
import {
  efectoSobreCasilla,
  puedeAplicarseSobre,
  puedeVenderse,
  validarMovimiento,
  type MovimientoInput,
} from './_lib/movimientoW3';
import { filaCasillaParaEspejo } from './_lib/espejoFilas';
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

    const lotesAntes = await contarLotesActivosDb(ctx);

    const ts = Date.now();
    const kardexEventId = `KE-${ts}`;
    const nuevoEstado = efectoSobreCasilla(args.tipo);

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
        } as never),
        estado: 'pendiente',
        intentos: 0,
        creadoEn: ts,
      });
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

    // Una sola vez por movimiento, no por casilla: el drenaje toma la cola
    // entera y agendar N veces solo multiplica trabajo idéntico.
    await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 25 });

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
