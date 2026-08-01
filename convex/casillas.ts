/**
 * W2 «Cerebro Creativo» — llenar la casilla y publicar el lote.
 *
 * Clasificar es corregir defaults heredados, no digitar de cero: la casilla nace
 * con lo que se sabe del lote y quien clasifica ajusta lo que corresponda.
 *
 * Toda regla vive en `_lib/casillaW2.ts` (completeness, conciliación de costos);
 * aquí solo hay `ctx.db`. Las casillas v4 no tocan `productInventory` ni agendan
 * pushes legacy — ver la cabecera de `lotsV4.ts`.
 */
import { v } from 'convex/values';
import { action, internalMutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireAccessLevel } from './_lib/authz';
import {
  casillaEstaCompleta,
  camposFaltantes,
  completenessDelLote,
  conciliarCostos,
  type CasillaW2,
} from './_lib/casillaW2';
import { filaCasillaParaEspejo, filaLoteParaEspejo } from './_lib/espejoFilas';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

/**
 * Re-encola la fila del lote al espejo.
 *
 * Existe porque el job de deriva encontró que publicar cambiaba el estado en
 * Convex y dejaba la hoja diciendo «abierto». No era una edición a mano: era el
 * espejo quedándose viejo. Toda mutación que cambie un campo espejado tiene que
 * volver a encolar, o el espejo miente en silencio.
 */
async function encolarLote(ctx: MutationCtx, id: Id<'lots'>): Promise<void> {
  const lote = await ctx.db.get(id);
  if (!lote) return;
  const proveedor = await ctx.db.get(lote.providerId);
  await ctx.db.insert('espejoOutbox', {
    pestana: 'Lotes',
    idFila: lote.loteId,
    campos: filaLoteParaEspejo({
      loteId: lote.loteId,
      fechaRecepcion: lote.fechaRecepcion,
      proveedor: proveedor?.nombreORazonSocial ?? '',
      categoriaFiscal: lote.categoriaFiscal ?? '',
      costoCompraCOP: lote.costoCompraCOP ?? lote.costoTotalCOP,
      costosVariablesCOP: (lote.costosVariables ?? []).reduce(
        (a, c) => a + c.montoCOP,
        0,
      ),
      costoTotalCOP: lote.costoTotalCOP,
      unidadesDeclaradas: lote.unidadesDeclaradas,
      abonoCOP: lote.abonoCOP ?? 0,
      saldoCOP: lote.saldoCOP ?? 0,
      formaPago: lote.formaPago,
      estado: lote.estado,
      sede: lote.sede,
      renombreLote: lote.renombreLote,
    }),
    estado: 'pendiente',
    intentos: 0,
    creadoEn: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 25 });
}

const patchArgs = {
  itemId: v.string(),
  categoriaFiscal: v.optional(v.union(v.literal('gema'), v.literal('joya'))),
  costoUnitarioRealCOP: v.optional(v.number()),
  renombre: v.optional(v.string()),
  calidad: v.optional(v.string()),
  color: v.optional(v.string()),
  corte: v.optional(v.string()),
  ct: v.optional(v.number()),
  gradoRareza: v.optional(v.string()),
  tipoJoya: v.optional(v.string()),
  gramaje: v.optional(v.number()),
  rangoVentaEsperadoCOP: v.optional(v.number()),
  clasificadaPor: v.optional(v.string()),
} as const;

/** El estado de una casilla ya clasificada. */
const ESTADO_COMPLETA = 'DISPONIBLE';
const ESTADO_PENDIENTE = 'PENDIENTE_CLASIFICAR';

export const _guardar = internalMutation({
  args: patchArgs,
  handler: async (ctx, { itemId, clasificadaPor, ...campos }) => {
    const casilla = await ctx.db
      .query('lotItems')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();

    if (!casilla) throw new Error(`No existe la casilla ${itemId}.`);
    if (!casilla.estadoCasilla) {
      throw new Error(
        `El ítem ${itemId} es del riel viejo, no una casilla v4: su costo es ` +
          `propiedad de la hoja y editarlo acá lo dejaría en dos verdades.`,
      );
    }

    // Solo se pisan los campos que vienen. Un `undefined` es «no lo toqués»,
    // no «borralo»: quien clasifica guarda a medias muchas veces.
    const patch: Record<string, unknown> = {};
    for (const [k, valor] of Object.entries(campos)) {
      if (valor !== undefined) patch[k] = valor;
    }

    const resultante = { ...casilla, ...patch } as CasillaW2;
    const faltantes = camposFaltantes(resultante);

    // El estado sigue a la completitud, en los dos sentidos: si alguien borra
    // un dato obligatorio, la casilla vuelve a pendiente en vez de quedar
    // publicable con un hueco.
    patch.estadoCasilla =
      faltantes.length === 0
        ? casilla.estadoCasilla === ESTADO_PENDIENTE
          ? ESTADO_COMPLETA
          : casilla.estadoCasilla
        : ESTADO_PENDIENTE;

    if (clasificadaPor) {
      patch.clasificadaPor = clasificadaPor;
      patch.clasificadaEn = Date.now();
    }

    await ctx.db.patch(casilla._id, patch);

    await ctx.db.insert('espejoOutbox', {
      pestana: 'Casillas',
      idFila: itemId,
      campos: filaCasillaParaEspejo({ ...casilla, ...patch } as never),
      estado: 'pendiente',
      intentos: 0,
      creadoEn: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 25 });

    return { itemId, completa: faltantes.length === 0, faltantes };
  },
});

export const guardar = action({
  args: { idToken: v.string(), ...patchArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{ itemId: string; completa: boolean; faltantes: string[] }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.casillas._guardar, {
      ...args,
      clasificadaPor: args.clasificadaPor ?? caller.email,
    });
  },
});

/**
 * El estado de clasificación de un lote: score, conciliación de costos y qué
 * casillas faltan. Es lo que alimenta la grilla de W2.
 */
export const estadoDelLote = query({
  args: { loteId: v.string() },
  handler: async (ctx, { loteId }) => {
    const lote = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .first();
    if (!lote) return null;

    const casillas = (
      await ctx.db
        .query('lotItems')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .collect()
    )
      .filter((c) => c.estadoCasilla)
      .sort((a, b) => a.ordenEnLote - b.ordenEnLote);

    return {
      loteId,
      estado: lote.estado,
      categoriaFiscalLote: lote.categoriaFiscal,
      costoTotalCOP: lote.costoTotalCOP,
      completeness: completenessDelLote(casillas as CasillaW2[]),
      // Contra el costo de compra PURO, no el landed: los costos variables son
      // del lote y no le pertenecen a ninguna pieza. Compararlos contra la suma
      // de las casillas inventaría una diferencia que no existe.
      conciliacion: conciliarCostos(
        lote.costoCompraCOP ?? lote.costoTotalCOP,
        casillas.map((c) => c.costoUnitarioRealCOP),
      ),
      publicacionParcial: lote.publicacionParcial,
      casillas,
    };
  },
});

export const _publicar = internalMutation({
  args: {
    loteId: v.string(),
    por: v.string(),
    /** Publicar con casillas incompletas. Exige motivo y queda registrado. */
    forzarParcial: v.optional(v.boolean()),
    motivo: v.optional(v.string()),
  },
  handler: async (ctx, { loteId, por, forzarParcial, motivo }) => {
    const lote = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .first();
    if (!lote) throw new Error(`No existe el lote ${loteId}.`);
    if (lote.origenModelo !== 'v4') {
      throw new Error(
        `${loteId} no es un lote v4: publicalo por el flujo de siempre.`,
      );
    }

    const casillas = (
      await ctx.db
        .query('lotItems')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .collect()
    ).filter((c) => c.estadoCasilla);

    const score = completenessDelLote(casillas as CasillaW2[]);

    if (!score.listoParaPublicar) {
      if (!forzarParcial) {
        throw new Error(
          `El lote ${loteId} tiene ${score.incompletas.length} casilla(s) sin ` +
            `clasificar (${score.incompletas.join(', ')}). Completalas o ` +
            `publicá parcial de forma explícita, con motivo.`,
        );
      }
      if (!motivo?.trim()) {
        throw new Error(
          'Publicar parcial exige un motivo: sin registro, «se publicó ' +
            'parcial» se vuelve el estado normal y nadie sabe qué falta.',
        );
      }
      await ctx.db.patch(lote._id, {
        estado: 'publicado',
        publicacionParcial: {
          ts: Date.now(),
          por,
          motivo,
          casillasIncompletas: score.incompletas,
        },
      });
      await encolarLote(ctx, lote._id);
      return { publicado: true, parcial: true, faltantes: score.incompletas };
    }

    await ctx.db.patch(lote._id, { estado: 'publicado' });
    await encolarLote(ctx, lote._id);
    return { publicado: true, parcial: false, faltantes: [] };
  },
});

export const publicar = action({
  args: {
    idToken: v.string(),
    loteId: v.string(),
    forzarParcial: v.optional(v.boolean()),
    motivo: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{ publicado: boolean; parcial: boolean; faltantes: string[] }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.casillas._publicar, {
      ...args,
      por: caller.email,
    });
  },
});

/** Resuelve un QR de ítem a su casilla (entrada directa de W2). */
export const porItemId = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const casilla = await ctx.db
      .query('lotItems')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!casilla?.estadoCasilla) return null;
    return {
      ...casilla,
      completa: casillaEstaCompleta(casilla as CasillaW2),
      faltantes: camposFaltantes(casilla as CasillaW2),
    };
  },
});
