/**
 * W1 «Cerebro Racional» — el alta de lote del modelo SOT v4.
 *
 * Riel PARALELO al de `lots.ts`, no un reemplazo. Comparten la tabla `lots` y la
 * numeración, pero se comportan distinto en lo que importa:
 *
 *  - **Guardar crea N casillas vacías**, no ítems capturados. La clasificación
 *    es otro momento y puede ser otra persona (modelo «2 Cerebros»).
 *  - **No agenda ningún push legacy.** El `APP_URL` del deployment de dev apunta
 *    a producción, así que `products.pushToSheet` desde acá escribiría en el SOT
 *    v3 vivo (reconocimiento §5.5). El espejo v4 sale por `espejoOutbox`.
 *  - **No crea filas en `productInventory`.** Crearlas sembraría un precio con el
 *    multiplicador plano 2,6× (`_lib/pricing.ts`), justo el vicio que el Modelo
 *    v2 erradica. La materialización es trabajo de la migración (Fase 2).
 *
 * Toda la lógica branchy vive en módulos puros testeados (`_lib/loteV4`,
 * `_lib/casillasV4`, `_lib/recalculo`); aquí solo hay `ctx.db`.
 */
import { action, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { requireAccessLevel, ROLES_COSTOS } from './_lib/authz';
import { allocateNext, formatLotId, lotSequenceName } from './sequences';
import { validarLoteV4 } from './_lib/loteV4';
import { planificarCasillas, siguienteItemIdNumerico } from './_lib/casillasV4';
import { planificarRecalculo } from './_lib/recalculo';
import { configVigente, contarLotesActivosDb, motorDelLoteDb } from './precios';
import { filaLoteParaEspejo } from './_lib/espejoFilas';

const costoVariableValidator = v.object({
  concepto: v.string(),
  montoCOP: v.number(),
});

const joyaValidator = v.object({
  tipoJoya: v.string(),
  mineral: v.string(),
  gramaje: v.number(),
  costoPorGramoCOP: v.number(),
  cantidadJoyas: v.optional(v.number()),
  presupuestoJoyaCOP: v.optional(v.number()),
});

const gemaValidator = v.object({
  tipoGema: v.string(),
  cantidadGemas: v.number(),
  corteGema: v.string(),
  pesoTotalCt: v.number(),
  calidadPromedio: v.string(),
  medidaPromedio: v.string(),
  pesoGemaPromedioCt: v.number(),
  costoPorCtCOP: v.number(),
});

const createArgs = {
  sede: v.string(),
  providerId: v.id('providers'),
  fechaRecepcion: v.string(),
  /** El campo que decide el régimen fiscal. Sin default, por contrato. */
  categoriaFiscal: v.union(
    v.literal('gema'),
    v.literal('joya'),
    v.literal('mixta'),
  ),
  costoCompraCOP: v.number(),
  unidadesDeclaradas: v.number(),
  formaPago: v.string(),
  metodoContado: v.optional(v.string()),
  fechaVencimiento: v.optional(v.string()),
  numeroCuotas: v.optional(v.number()),
  costosVariables: v.optional(v.array(costoVariableValidator)),
  abonoCOP: v.optional(v.number()),
  joya: v.optional(joyaValidator),
  gema: v.optional(gemaValidator),
  /** Descripción de COMPRA (W1). `renombreLote` es el comercial (W2). */
  nombre: v.optional(v.string()),
  /** Cuándo se PAGÓ. `fechaVencimiento` (cuándo se debe) es otra cosa. */
  fechaPago: v.optional(v.string()),
  renombreLote: v.optional(v.string()),
  tratamiento: v.optional(v.string()),
  mina: v.optional(v.string()),
  pesoTotalQuilates: v.optional(v.number()),
  numeroFactura: v.optional(v.string()),
  notas: v.optional(v.string()),
  operadorNombre: v.optional(v.string()),
  /** Idempotencia, igual que `lots.create`: un reintento no crea dos lotes. */
  clientToken: v.optional(v.string()),
} as const;

export const _create = internalMutation({
  args: createArgs,
  handler: async (ctx, args) => {
    // 0. Replay: mismo token, mismo lote. Sin esto un doble clic crea dos lotes
    //    con dos juegos de casillas y quema dos números de secuencia.
    if (args.clientToken) {
      const prior = await ctx.db
        .query('commitTokens')
        .withIndex('by_token', (q) => q.eq('token', args.clientToken!))
        .unique();
      if (prior) {
        const sigue = await ctx.db.get(prior.primaryId as Id<'lots'>);
        if (sigue) {
          return JSON.parse(prior.result) as {
            id: Id<'lots'>;
            loteId: string;
            casillas: string[];
          };
        }
        await ctx.db.delete(prior._id);
      }
    }

    // 1. Las reglas duras, antes de tocar la base.
    const validado = validarLoteV4({
      categoriaFiscal: args.categoriaFiscal,
      costoCompraCOP: args.costoCompraCOP,
      unidadesDeclaradas: args.unidadesDeclaradas,
      formaPago: args.formaPago,
      fechaRecepcion: args.fechaRecepcion,
      metodoContado: args.metodoContado,
      fechaVencimiento: args.fechaVencimiento,
      numeroCuotas: args.numeroCuotas,
      costosVariables: args.costosVariables,
      abonoCOP: args.abonoCOP,
      joya: args.joya,
      gema: args.gema,
    });

    const provider = await ctx.db.get(args.providerId);
    if (!provider) throw new Error('El proveedor no existe.');

    // 2. Id de lote, por la misma secuencia que el riel viejo: los dos comparten
    //    numeración, así que no puede haber un B-042 en cada modelo.
    const n = await allocateNext(ctx, lotSequenceName(args.sede));
    const loteId = formatLotId(n, args.sede);

    const lotesAntes = await contarLotesActivosDb(ctx);

    // 3. El lote. `costoTotalCOP` guarda el landed cost (compra + variables),
    //    que es lo que el motor absorbe; `costosVariables` queda desglosado al
    //    lado para poder decir de qué fue cada ajuste.
    const lotId: Id<'lots'> = await ctx.db.insert('lots', {
      loteId,
      sede: args.sede,
      providerId: args.providerId,
      fechaRecepcion: args.fechaRecepcion,
      costoTotalCOP: validado.costoTotalCOP,
      unidadesDeclaradas: validado.unidadesDeclaradas,
      formaPago: args.formaPago,
      metodoContado: args.metodoContado,
      fechaVencimiento: args.fechaVencimiento,
      numeroCuotas: args.numeroCuotas,
      renombreLote: args.renombreLote,
      tratamiento: args.tratamiento,
      mina: args.mina,
      pesoTotalQuilates: args.pesoTotalQuilates,
      numeroFactura: args.numeroFactura,
      notas: args.notas,
      operadorNombre: args.operadorNombre,
      operadorRol: 'captura',
      estado: 'abierto',

      categoriaFiscal: validado.categoriaFiscal,
      joya: validado.joya,
      gema: validado.gema,
      nombre: args.nombre,
      fechaPago: args.fechaPago,
      costoCompraCOP: validado.costoCompraCOP,
      costosVariables: args.costosVariables,
      abonoCOP: validado.abonoCOP,
      saldoCOP: validado.saldoCOP,
      origenModelo: 'v4',

      // El riel v4 no espeja por el camino viejo. `rowIndex` queda en 0 y
      // `syncStatus` en 'synced' para que los barridos de reintento del riel
      // legacy no lo tomen como pendiente e intenten empujarlo al SOT v3.
      rowIndex: 0,
      lastPulledAt: new Date().toISOString(),
      syncStatus: 'synced',
    });

    // 4. Las casillas. Los itemIds se piden mirando LOS DOS rieles: las casillas
    //    v4 no tienen fila de inventario y serían invisibles para el allocator
    //    viejo, que asignaría un número ya impreso en un QR.
    const inventario = await ctx.db.query('productInventory').collect();
    const casillasExistentes = await ctx.db.query('lotItems').collect();
    const primerItemIdNumerico = siguienteItemIdNumerico(
      inventario.map((p) => p.itemId),
      casillasExistentes.map((c) => c.itemId),
    );

    const casillas = planificarCasillas({
      loteId,
      unidadesDeclaradas: validado.unidadesDeclaradas,
      primerItemIdNumerico,
      categoriaFiscalLote: validado.categoriaFiscal,
      tipoGemaLote: validado.gema?.tipoGema,
    });
    for (const casilla of casillas) await ctx.db.insert('lotItems', casilla);

    // 5. El recálculo del gasto fijo. El alta suma un lote activo solo cuando
    //    sus casillas ya existen — por eso se cuenta DESPUÉS de insertarlas.
    const config = await configVigente(ctx, args.fechaRecepcion);
    const lotesDespues = await contarLotesActivosDb(ctx);
    const plan = planificarRecalculo({
      evento: 'ALTA_LOTE',
      config,
      lotesActivosAntes: lotesAntes.lotesActivos,
      lotesActivosDespues: lotesDespues.lotesActivos,
      unidadesActivas: lotesDespues.unidadesActivas,
      ts: Date.now(),
    });
    if (plan.recalcula && plan.traza) {
      await ctx.db.insert('recalculos', { ...plan.traza, motivo: plan.motivo });
    }

    // 6. El espejo, en cola. Si Sheets no responde, la mutation NO falla:
    //    Convex es la verdad y la hoja es una vista.
    await ctx.db.insert('espejoOutbox', {
      pestana: 'Lotes',
      idFila: loteId,
      campos: filaLoteParaEspejo({
        loteId,
        fechaRecepcion: args.fechaRecepcion,
        proveedor: provider.nombreORazonSocial,
        categoriaFiscal: validado.categoriaFiscal,
        costoCompraCOP: validado.costoCompraCOP,
        costosVariablesCOP: validado.costosVariablesCOP,
        costoTotalCOP: validado.costoTotalCOP,
        unidadesDeclaradas: validado.unidadesDeclaradas,
        abonoCOP: validado.abonoCOP,
        saldoCOP: validado.saldoCOP,
        formaPago: args.formaPago,
        estado: 'abierto',
        sede: args.sede,
        renombreLote: args.renombreLote,
        costosVariables: args.costosVariables,
        joya: args.joya,
        gema: args.gema,
        nombre: args.nombre,
        fechaPago: args.fechaPago,
        // Se calcula DESPUÉS del recálculo del paso 5: el alta de este lote ya
        // movió el divisor, y el motor tiene que reflejar el fijo nuevo, no el
        // que regía hace tres líneas.
        motor: await motorDelLoteDb(ctx, {
          fechaRecepcion: args.fechaRecepcion,
          categoriaFiscal: validado.categoriaFiscal,
          costoCompraCOP: validado.costoCompraCOP,
          costoTotalCOP: validado.costoTotalCOP,
          unidadesDeclaradas: validado.unidadesDeclaradas,
          costosVariables: args.costosVariables,
        }),
      }),
      estado: 'pendiente',
      intentos: 0,
      creadoEn: Date.now(),
    });

    // Drenaje por evento: el espejo se pone al día solo, sin cron de barrido.
    // Si falla, la fila queda en cola y el cron de rescate la recoge.
    await ctx.scheduler.runAfter(0, internal.espejo.drenar, { limite: 25 });
    // El alta puede haber movido `lotesActivos` (paso 5): el Tablero del
    // período corriente tiene que reflejar el fijo nuevo, no el de ayer.
    await ctx.scheduler.runAfter(0, internal.espejo._publicarTablero, {});

    const resultado = {
      id: lotId,
      loteId,
      casillas: casillas.map((c) => c.itemId),
      recalculo: plan.recalcula ? plan.traza : undefined,
    };

    if (args.clientToken) {
      await ctx.db.insert('commitTokens', {
        token: args.clientToken,
        kind: 'lotsV4.create',
        primaryId: lotId,
        result: JSON.stringify(resultado),
        createdAt: new Date().toISOString(),
      });
    }

    return resultado;
  },
});

export const create = action({
  args: { idToken: v.string(), ...createArgs },
  // El tipo de retorno se anota a mano por la inferencia circular de Convex:
  // `internal.lotsV4` vive en `_generated/api`, que a su vez tipa este archivo.
  // Sin la anotación, TS7022. Mismo remedio que `lots.create`.
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{
    id: Id<'lots'>;
    loteId: string;
    casillas: string[];
    recalculo?: { valorAnterior: number; valorNuevo: number };
  }> => {
    await requireAccessLevel(idToken, [...ROLES_COSTOS]);
    return await ctx.runMutation(internal.lotsV4._create, args);
  },
});

// `casillasDeLote` se retiró: query PÚBLICA que devolvía cada casilla entera,
// con su `costoUnitarioRealCOP`. Nadie la consumía — la grilla de W2 usa
// `casillas.estadoDelLote`. Duplicaba la exposición sin dar nada.
