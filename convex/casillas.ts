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
import { requireBotSecret } from './_lib/botAuth';
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
      categoriaFiscalOrigen: lote.categoriaFiscalOrigen,
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
      gema: lote.gema,
      nombre: lote.nombre,
      fechaPago: lote.fechaPago,
      motor: await motorDelLoteDb(ctx, lote),
    }),
    estado: 'pendiente',
    intentos: 0,
    creadoEn: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 25 });
  // Cambiar el estado del lote (abierto → cerrado, publicación) mueve
  // `lotesActivos` e `inventarioActivoCOP`: el Tablero del período corriente
  // tiene que reflejarlo, no quedarse a la fecha del último recálculo.
  await ctx.scheduler.runAfter(0, internal.espejo._publicarTablero, {});
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
        categoriaFiscalOrigen: lote.categoriaFiscalOrigen,
        equilibrioRealUnidadCOP: p?.equilibrioRealUnidadCOP,
        precioObjetivoUnidadCOP: p?.precioObjetivoUnidadCOP,
      } as never),
      estado: 'pendiente',
      intentos: 0,
      creadoEn: ahora,
    });
  }
  await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 50 });
  // El costo capturado de una casilla es insumo directo de
  // `inventarioActivoCOP` — sin esto el Tablero quedaba a la fecha del
  // último recálculo del gasto fijo, no de la última clasificación.
  await ctx.scheduler.runAfter(0, internal.espejo._publicarTablero, {});
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
  /** El tipo de gema de la pieza. Nace heredado del lote y se corrige acá. */
  tipo: v.optional(v.string()),
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

/**
 * Adjuntar la foto de una casilla. Deliberadamente SEPARADA de `_guardar`:
 * aquélla estampa `clasificadaPor` / `clasificadaEn`, y adjuntar una foto no es
 * clasificar — hacerlo por ahí atribuiría la clasificación a quien sacó la foto,
 * hoy, aunque la pieza la haya clasificado otra persona ayer.
 *
 * Por el mismo motivo `fotoUrl` NO entra a `patchArgs`: si entrara,
 * `guardarViaBot` podría escribirla y el rastro volvería a falsearse.
 *
 * Tampoco toca `estadoCasilla`: la foto no es campo de completitud
 * (`camposFaltantes` no la mira) y una casilla sin foto sigue siendo publicable.
 */
export const _adjuntarFoto = internalMutation({
  args: { itemId: v.string(), fotoUrl: v.string() },
  handler: async (ctx, { itemId, fotoUrl }) => {
    const casilla = await ctx.db
      .query('lotItems')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();

    if (!casilla) throw new Error(`No existe la casilla ${itemId}.`);
    if (!casilla.estadoCasilla) {
      throw new Error(
        `El ítem ${itemId} es del riel viejo, no una casilla v4: su media es ` +
          `propiedad de la hoja y escribirla acá la dejaría en dos verdades.`,
      );
    }

    // Cadena vacía = borrar. Mismo criterio que `applyMedia` en el riel legacy
    // (`lotItems.ts:1093-1094`), copiado para que las dos rieles se comporten
    // igual el día que Fase 2 las junte.
    const normalizada = fotoUrl.trim();
    const valor = normalizada.length === 0 ? undefined : normalizada;

    await ctx.db.patch(casilla._id, { fotoUrl: valor });
    return { itemId, fotoUrl: valor };
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

/* ─────────────────────────────────────────────────────────────────────────────
 * W2 «Cerebro Creativo» desde Telegram.
 *
 * Las cuatro cáscaras de abajo son el mismo trato que hicieron las de
 * `movimientosV4`: `requireBotSecret` y delegación a los internals YA probados.
 * Cero lógica nueva — si una regla de clasificación cambia, cambia en un solo
 * lugar y las dos superficies la heredan.
 *
 * Las dos de lectura devuelven **costo unitario real y conciliación de costos**,
 * así que valen la misma advertencia que `precios.previewLoteViaBot`: el bot es
 * un solo llamador para todos sus usuarios, y quién puede mirar lo decide la
 * capacidad del lado del bot (`casillas:clasificar`) antes de llamar acá.
 * ────────────────────────────────────────────────────────────────────────── */

export const guardarViaBot = action({
  args: { botSecret: v.string(), telegramUserId: v.number(), ...patchArgs },
  handler: async (
    ctx,
    { botSecret, telegramUserId, ...args },
  ): Promise<{ itemId: string; completa: boolean; faltantes: string[] }> => {
    requireBotSecret(botSecret);
    // Igual que la web toma el email del caller verificado: la identidad del
    // clasificador no es un campo que el llamador elija.
    return await ctx.runMutation(internal.casillas._guardar, {
      ...args,
      clasificadaPor: `telegram:${telegramUserId}`,
    });
  },
});

export const publicarViaBot = action({
  args: {
    botSecret: v.string(),
    telegramUserId: v.number(),
    loteId: v.string(),
    forzarParcial: v.optional(v.boolean()),
    motivo: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { botSecret, telegramUserId, ...args },
  ): Promise<{ publicado: boolean; parcial: boolean; faltantes: string[] }> => {
    requireBotSecret(botSecret);
    return await ctx.runMutation(internal.casillas._publicar, {
      ...args,
      por: `telegram:${telegramUserId}`,
    });
  },
});

export const adjuntarFotoViaBot = action({
  args: { botSecret: v.string(), itemId: v.string(), fotoUrl: v.string() },
  handler: async (
    ctx,
    { botSecret, itemId, fotoUrl },
  ): Promise<{ itemId: string; fotoUrl?: string }> => {
    requireBotSecret(botSecret);
    return await ctx.runMutation(internal.casillas._adjuntarFoto, {
      itemId,
      fotoUrl,
    });
  },
});

/**
 * La casilla COMO LA VE EL BOT: un objeto que nombra cada campo, jamás un spread del
 * documento.
 *
 * Es la misma regla que `providers.list` aplica desde el blindaje de PII del
 * 2026-08-06, y por el mismo motivo: un spread manda al bot toda columna futura por
 * defecto —falla ABIERTA—, así que agregar mañana una columna con datos personales la
 * filtra en silencio. Acá una columna nueva simplemente no aparece hasta que alguien
 * la agregue a esta lista a propósito.
 *
 * No es hipotético: ya había pasado. `clasificadaPor` se agregó después del patrón y
 * lleva el EMAIL del staff para toda casilla clasificada desde la web (`guardar`, más
 * arriba, le pone `caller.email`). Viajaba al bot sin que nadie lo hubiera decidido.
 *
 * **Viaja a propósito** (decisión de Kevin, 2026-08-12): sirve para decir quién
 * clasificó la pieza. Lo que cambió no es que esté — es que está NOMBRADO.
 *
 * **Los doce campos de clasificación viajan** (2026-08-12, segunda vuelta). En la
 * primera versión de esta proyección se dejaron afuera porque ningún consumidor del
 * bot los leía. Eso resultó ser el síntoma de un bug, no una economía: el asistente
 * de casillas NUNCA lee la casilla guardada, arma un borrador vacío y por eso pide un
 * costo que ya existe — con lo cual una casilla migrada (367 de 388 en dev) no se
 * puede completar ni corregir. Se devuelven para que `comenzarPieza` pueda hidratar.
 *
 * Que hiciera falta agregarlos A MANO, uno por uno, es el diseño funcionando: con un
 * spread habrían estado ahí por accidente junto con todo lo demás.
 *
 * Lo que se queda afuera, y por qué:
 *
 *  - `_id`, `_creationTime`, `preponderancia`, `costoBaseCOP` — internos de Convex y
 *    campos del riel viejo, que en una casilla v4 valen 0.
 *  - `loteId` — el asistente ya sabe de qué lote es: lo pidió él.
 *  - `modalidadGrupo` — no lo lee nadie todavía. Cuando alguien lo necesite, se
 *    agrega acá y queda dicho quién lo pidió.
 */
function casillaParaBot(c: {
  itemId: string;
  estadoCasilla?: string;
  clasificadaPor?: string;
  clasificadaEn?: number;
  costoUnitarioRealCOP?: number;
  categoriaFiscal?: 'gema' | 'joya';
  calidad?: string;
  color?: string;
  corte?: string;
  ct?: number;
  gradoRareza?: string;
  tipo?: string;
  tipoJoya?: string;
  gramaje?: number;
  rangoVentaEsperadoCOP?: number;
  renombre?: string;
}) {
  return {
    itemId: c.itemId,
    estadoCasilla: c.estadoCasilla,
    clasificadaPor: c.clasificadaPor,
    clasificadaEn: c.clasificadaEn,
    // Los que el asistente necesita para hidratar el borrador al abrir la casilla.
    costoUnitarioRealCOP: c.costoUnitarioRealCOP,
    categoriaFiscal: c.categoriaFiscal,
    calidad: c.calidad,
    color: c.color,
    corte: c.corte,
    ct: c.ct,
    gradoRareza: c.gradoRareza,
    tipo: c.tipo,
    tipoJoya: c.tipoJoya,
    gramaje: c.gramaje,
    rangoVentaEsperadoCOP: c.rangoVentaEsperadoCOP,
    renombre: c.renombre,
  };
}

export const estadoDelLoteViaBot = action({
  args: { botSecret: v.string(), loteId: v.string() },
  handler: async (ctx, { botSecret, loteId }): Promise<unknown> => {
    requireBotSecret(botSecret);
    const e = await ctx.runQuery(internal.casillas._estadoDelLote, { loteId });
    // `null` se propaga tal cual: un lote que no existe no puede volverse un objeto a
    // medias, porque del otro lado eso produce una lista de trabajo equivocada.
    if (!e) return null;
    return {
      loteId: e.loteId,
      estado: e.estado,
      categoriaFiscalLote: e.categoriaFiscalLote,
      costoTotalCOP: e.costoTotalCOP,
      completeness: e.completeness,
      conciliacion: e.conciliacion,
      // Sigue siendo un ARRAY y con la misma longitud: la verificación de W1 sólo usa
      // `.length`, para comprobar que se crearon tantas casillas como unidades pedidas.
      casillas: e.casillas.map(casillaParaBot),
      // `publicacionParcial` NO viaja: lleva `por`, que es el otro email de staff de
      // este archivo (`publicar` le pone `caller.email`), y nadie lo lee.
    };
  },
});

export const porItemIdViaBot = action({
  args: { botSecret: v.string(), itemId: v.string() },
  handler: async (ctx, { botSecret, itemId }): Promise<unknown> => {
    requireBotSecret(botSecret);
    const c = await ctx.runQuery(internal.casillas._porItemId, { itemId });
    if (!c) return null;
    // El spread es de un objeto CONSTRUIDO por `casillaParaBot`, no del documento: sigue
    // fallando cerrada. Se usa el helper en vez de repetir la lista para que las dos
    // lecturas no puedan divergir.
    return {
      ...casillaParaBot(c),
      completa: c.completa,
      faltantes: c.faltantes,
    };
  },
});
