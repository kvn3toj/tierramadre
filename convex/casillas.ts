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
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { requireAccessLevel, ROLES_COSTOS } from './_lib/authz';
import {
  casillaEstaCompleta,
  camposFaltantes,
  completenessDelLote,
  conciliarCostos,
  type CasillaW2,
} from './_lib/casillaW2';
import { filaCasillaParaEspejo, filaLoteParaEspejo } from './_lib/espejoFilas';
import { motorDelLoteDb, preciosPorItemDb } from './precios';
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
      costosVariables: lote.costosVariables,
      joya: lote.joya,
      motor: await motorDelLoteDb(ctx, lote),
    }),
    estado: 'pendiente',
    intentos: 0,
    creadoEn: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 25 });
}

/**
 * Re-encola TODAS las casillas del lote, con sus precios por unidad.
 *
 * **Todas, no solo la que se tocó.** El reparto del gasto fijo es POR PESO del
 * costo capturado, así que cambiar el costo de una casilla mueve el peso —y con
 * él el precio— de todas sus hermanas. Encolar solo la editada dejaría a las
 * otras en la hoja con precios calculados contra un reparto que ya no existe, y
 * el job de deriva lo denunciaría como edición humana.
 *
 * Los precios se escriben SOLO si el lote cotiza (costo capturado en todas +
 * conciliación Σ≈costo). Si no, van vacíos: una casilla PENDIENTE sin precio se
 * lee como pendiente; un número calculado a medias se lee como precio.
 */
async function encolarCasillasDelLote(
  ctx: MutationCtx,
  loteId: string,
): Promise<void> {
  const lote = await ctx.db
    .query('lots')
    .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
    .first();
  if (!lote) return;

  const casillas = (
    await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .collect()
  )
    .filter((c) => c.estadoCasilla)
    .sort((a, b) => a.ordenEnLote - b.ordenEnLote);
  if (!casillas.length) return;

  // El MISMO resolver que usa `espejo._filasEsperadas` para reconstruir la fila.
  // Si los dos no dieran idéntico, el job de deriva denunciaría como edición
  // humana una columna que el espejo acaba de escribir bien.
  const precios = await preciosPorItemDb(ctx);

  const ahora = Date.now();
  for (const casilla of casillas) {
    const p = precios.get(casilla.itemId);
    await ctx.db.insert('espejoOutbox', {
      pestana: 'Casillas',
      idFila: casilla.itemId,
      campos: filaCasillaParaEspejo({
        ...casilla,
        renombreLote: lote.renombreLote,
        equilibrioRealUnidadCOP: p?.equilibrioRealUnidadCOP,
        precioObjetivoUnidadCOP: p?.precioObjetivoUnidadCOP,
      } as never),
      estado: 'pendiente',
      intentos: 0,
      creadoEn: ahora,
    });
  }
  await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 50 });
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
} as const;

// `clasificadaPor` NO está en `patchArgs` a propósito: si el caller pudiera
// mandarlo, podría atribuirle la clasificación a cualquier email. Lo pone la
// action desde el caller ya verificado, igual que `publicar` hace con `por`.
const guardarArgs = {
  ...patchArgs,
  clasificadaPor: v.optional(v.string()),
} as const;

/** El estado de una casilla ya clasificada. */
const ESTADO_COMPLETA = 'DISPONIBLE';
const ESTADO_PENDIENTE = 'PENDIENTE_CLASIFICAR';

export const _guardar = internalMutation({
  args: guardarArgs,
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

    // Se encola el lote ENTERO, no solo esta casilla: el gasto fijo se reparte
    // por peso del costo, así que tocar un costo mueve el precio de todas las
    // hermanas. Ver `encolarCasillasDelLote`.
    await encolarCasillasDelLote(ctx, casilla.loteId);

    return { itemId, completa: faltantes.length === 0, faltantes };
  },
});

export const guardar = action({
  args: { idToken: v.string(), ...patchArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{ itemId: string; completa: boolean; faltantes: string[] }> => {
    const caller = await requireAccessLevel(idToken, [...ROLES_COSTOS]);
    // El email sale del caller VERIFICADO, no de los args: el rastro de
    // auditoría no puede ser un campo que el propio caller elige.
    return await ctx.runMutation(internal.casillas._guardar, {
      ...args,
      clasificadaPor: caller.email,
    });
  },
});

/**
 * El estado de clasificación de un lote: score, conciliación de costos y qué
 * casillas faltan. Es lo que alimenta la grilla de W2.
 */
export const _estadoDelLote = internalQuery({
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
    const caller = await requireAccessLevel(idToken, [...ROLES_COSTOS]);
    return await ctx.runMutation(internal.casillas._publicar, {
      ...args,
      por: caller.email,
    });
  },
});

/** Resuelve un QR de ítem a su casilla (entrada directa de W2). */
export const _porItemId = internalQuery({
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

/**
 * Las dos lecturas de W2, gateadas por rol.
 *
 * Devuelven `costoUnitarioRealCOP` de cada pieza y la conciliación contra el
 * costo del lote: es exactamente la estructura de costos que `previewLote` vino
 * a cerrar. Con el costo por pieza y el precio público del catálogo, el margen
 * sale por resta — no hace falta el preview para deducirlo.
 *
 * Mismo costo asumido que en `previewLote`: se pierde la reactividad. La grilla
 * de W2 vuelve a pedir tras publicar, y la casilla tras guardar.
 */
export const estadoDelLote = action({
  args: { idToken: v.string(), loteId: v.string() },
  handler: async (ctx, { idToken, loteId }): Promise<unknown> => {
    await requireAccessLevel(idToken, [...ROLES_COSTOS]);
    return await ctx.runQuery(internal.casillas._estadoDelLote, { loteId });
  },
});

export const porItemId = action({
  args: { idToken: v.string(), itemId: v.string() },
  handler: async (ctx, { idToken, itemId }): Promise<unknown> => {
    await requireAccessLevel(idToken, [...ROLES_COSTOS]);
    return await ctx.runQuery(internal.casillas._porItemId, { itemId });
  },
});
