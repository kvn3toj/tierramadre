/**
 * La migración de ensayo v3 → v4, en dev.
 *
 * Corre primero acá, y de ahí sale el inventario con el que la doble corrida
 * puede comparar precios. Hasta que corra, dev reparte el gasto fijo entre menos
 * lotes de los que existen —66 contra los ~88 del SOT— y ningún número suyo es
 * comparable con la operación.
 *
 * **Por qué el conteo sale corto:** `contarLotesActivosDb` agrupa las piezas por
 * los lotes que existen como FILA en `lots`. Una pieza cuyo lote Convex nunca
 * conoció es invisible para él. 290 de los 513 ítems están en ese caso, y sus 28
 * lotes no entraban a la tabla porque `reconstruido` estaba fuera de la unión de
 * `estado` y porque no traen proveedor (`804458e`). Esta migración cierra las
 * dos cosas: el estado ya es del modelo, y el proveedor es el centinela.
 *
 * Toda la decisión vive en `_lib/migracionV4.ts`, que es PURO y devuelve un
 * PLAN. Acá solo hay IO: leer la hoja, y un shim delgado sobre `ctx.db` que
 * aplica lo planificado. Así el ensayo se puede repetir y revisar a ojo cuantas
 * veces haga falta antes de que algo toque la base.
 *
 * **Solo lee la hoja.** El `/api/get-table` de producción sirve lecturas; el
 * candado de `destinoEscritura` cubre las escrituras, y ninguna sale de acá. Lo
 * que se escribe es Convex dev, y `_aplicarPlan` exige serlo.
 */
import { v } from 'convex/values';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { internal } from './_generated/api';
import { exigeDeploymentDeDesarrollo } from './_lib/destinoEscritura';
import { normalizarFechaRecepcion } from './_lib/fechaSheet';
import { inferirSegmentoLote } from './_lib/segmentoLote';
import { NOMBRE_PROVEEDOR_CENTINELA } from './_lib/proveedorCentinela';
import {
  planificarPromocion,
  type PlanPromocion,
  formatearReporteExcepciones,
  mapearFilasInventario,
  mapearLotesHoja,
  planificarMigracion,
  type CasillaACrear,
  type LoteACrear,
  type PlanMigracion,
} from './_lib/migracionV4';

/** El `APP_URL` del deployment, que sirve los dos lectores de la hoja. */
function requiereAppUrl(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL missing on Convex deployment');
  return appUrl.replace(/\/$/, '');
}

/**
 * Exportada para que `convex/dobleCorrida.ts` (punto 8) lea la pestaña
 * Inventario por el mismo camino — mismo token, misma guarda de 0 filas — en
 * vez de duplicar el fetch.
 */
export async function leerTabla(
  ruta: string,
): Promise<Array<Record<string, string>>> {
  const token = process.env.ADMIN_SYNC_TOKEN;
  if (!token) throw new Error('ADMIN_SYNC_TOKEN missing on Convex deployment');

  const res = await fetch(`${requiereAppUrl()}${ruta}`, {
    headers: { 'x-admin-sync-token': token },
  });
  if (!res.ok) throw new Error(`${ruta} falló: HTTP ${res.status}`);

  const payload = (await res.json()) as {
    data?: { rows?: Array<Record<string, string>> };
    rows?: Array<Record<string, string>>;
  };
  const rows = payload.data?.rows ?? payload.rows ?? [];
  if (rows.length === 0) {
    // Una lectura vacía planificaría «nada que hacer» y se vería idéntica a un
    // ensayo exitoso. Es un fallo de transporte, no un no-op limpio.
    throw new Error(`${ruta} devolvió 0 filas — no se planifica sobre eso`);
  }
  return rows;
}

/** Lo que el planificador necesita saber de Convex. Solo lee. */
export const _estadoActual = internalQuery({
  args: {},
  handler: async (ctx) => {
    const lotes = await ctx.db.query('lots').collect();
    const casillas = await ctx.db.query('lotItems').collect();
    return {
      lotesConvex: lotes.map((l) => ({ loteId: l.loteId })),
      casillasConvex: casillas.map((c) => ({
        itemId: c.itemId,
        estadoCasilla: c.estadoCasilla,
      })),
    };
  },
});

/**
 * La fila centinela, idempotente por nombre.
 *
 * **No pasa por `providers._create` a propósito:** esa agenda un
 * `_pushToSheet` con `mode: 'append'` y escribiría una fila en la pestaña
 * Proveedores del SOT v3 vivo. Se inserta con `rowIndex: 0` y
 * `syncStatus: 'synced'` —el mismo recurso documentado en `lotsV4._create`—
 * para que los barridos de reintento del riel legacy no la tomen por pendiente.
 */
export const _asegurarCentinela = internalMutation({
  args: {},
  handler: async (ctx) => {
    exigeDeploymentDeDesarrollo(process.env.CONVEX_CLOUD_URL);

    const existente = await ctx.db
      .query('providers')
      .withIndex('by_nombre', (q) =>
        q.eq('nombreORazonSocial', NOMBRE_PROVEEDOR_CENTINELA),
      )
      .first();
    if (existente) return { id: existente._id, creado: false };

    const id = await ctx.db.insert('providers', {
      nombreORazonSocial: NOMBRE_PROVEEDOR_CENTINELA,
      tipo: 'otros',
      centinela: true,
      notas:
        'Fila centinela de las agrupaciones reconstruidas. NO es un proveedor: ' +
        'es el lugar donde apuntan los lotes cuyo proveedor real todavía no se ' +
        'sabe. Cada lote que la apunte está en el reporte de excepciones de la ' +
        'migración, para reemplazarla cuando se sepa.',
      rowIndex: 0,
      lastPulledAt: new Date().toISOString(),
      syncStatus: 'synced',
    });
    return { id, creado: true };
  },
});

/**
 * Aplica el plan. Guardado por deployment: hay que SER dev, no basta con no ser
 * producción.
 *
 * Idempotente por construcción — el planificador ya excluye lo que existe—, pero
 * se re-verifica fila por fila igual: entre planificar y aplicar puede haber
 * corrido otra cosa.
 */
export const _aplicarPlan = internalMutation({
  args: {
    lotesACrear: v.array(
      v.object({
        loteId: v.string(),
        estado: v.string(),
        providerNombre: v.optional(v.string()),
        fechaRecepcion: v.optional(v.string()),
        costoTotalCOP: v.number(),
        unidadesDeclaradas: v.number(),
        formaPago: v.optional(v.string()),
        sede: v.optional(v.string()),
        renombreLote: v.optional(v.string()),
        sinProveedor: v.boolean(),
        rowIndex: v.number(),
      }),
    ),
    casillasACrear: v.array(
      v.object({
        itemId: v.string(),
        loteId: v.string(),
        estadoCasilla: v.string(),
        ordenEnLote: v.number(),
        costoUnitarioRealCOP: v.optional(v.number()),
        nombre: v.optional(v.string()),
      }),
    ),
    centinelaId: v.id('providers'),
  },
  handler: async (ctx, { lotesACrear, casillasACrear, centinelaId }) => {
    exigeDeploymentDeDesarrollo(process.env.CONVEX_CLOUD_URL);

    const ahora = new Date().toISOString();
    const lotesCreados: string[] = [];
    const lotesOmitidos: { loteId: string; motivo: string }[] = [];

    for (const lote of lotesACrear) {
      const ya = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', lote.loteId))
        .first();
      if (ya) {
        lotesOmitidos.push({ loteId: lote.loteId, motivo: 'ya existía' });
        continue;
      }

      // El proveedor real se resuelve por NOMBRE; si no aparece, el lote va al
      // centinela en vez de a un proveedor elegido por parecido. Atribuirle
      // piedras ajenas a alguien es un error invisible una vez guardado.
      let providerId = centinelaId;
      const nombre = lote.providerNombre?.trim();
      if (nombre) {
        const provider = await ctx.db
          .query('providers')
          .withIndex('by_nombre', (q) => q.eq('nombreORazonSocial', nombre))
          .first();
        if (provider) providerId = provider._id;
      }

      await ctx.db.insert('lots', {
        loteId: lote.loteId,
        providerId,
        // El estado viaja como viene de la hoja. `normalizeLotEstado` ya lo
        // validó contra la unión antes de que llegara acá.
        estado: lote.estado as
          | 'abierto'
          | 'cerrado'
          | 'publicado'
          | 'cancelado'
          | 'reconstruido',
        fechaRecepcion: lote.fechaRecepcion ?? '',
        costoTotalCOP: lote.costoTotalCOP,
        unidadesDeclaradas: lote.unidadesDeclaradas,
        formaPago: lote.formaPago ?? '',
        sede: lote.sede,
        renombreLote: lote.renombreLote,
        mostrarComoLote: false,
        // La fila ya existe en la hoja y es la FUENTE de estos valores: no hay
        // nada que empujar de vuelta. `pending` encolaría una escritura
        // redundante contra una fila que se acaba de leer.
        rowIndex: lote.rowIndex,
        lastPulledAt: ahora,
        syncStatus: 'synced',
      });
      lotesCreados.push(lote.loteId);
    }

    const casillasCreadas: string[] = [];
    for (const casilla of casillasACrear) {
      const ya = await ctx.db
        .query('lotItems')
        .withIndex('by_itemId', (q) => q.eq('itemId', casilla.itemId))
        .first();
      if (ya) continue;

      await ctx.db.insert('lotItems', {
        loteId: casilla.loteId,
        itemId: casilla.itemId,
        // Campos del riel viejo. `costoBaseCOP` nace en cero a propósito: el
        // costo autoritativo de v4 es `costoUnitarioRealCOP`, CAPTURADO. El
        // helper que llenaba aquel prorrateaba el lote, que es lo que D6
        // prohíbe.
        preponderancia: 0,
        costoBaseCOP: 0,
        ordenEnLote: casilla.ordenEnLote,
        estadoCasilla: casilla.estadoCasilla,
        // Ausente cuando la hoja no lo trae. Nunca derivado.
        costoUnitarioRealCOP: casilla.costoUnitarioRealCOP,
      });
      casillasCreadas.push(casilla.itemId);
    }

    return {
      lotesCreados: lotesCreados.length,
      lotesOmitidos,
      casillasCreadas: casillasCreadas.length,
      ejemploLotes: lotesCreados.slice(0, 10),
      ejemploCasillas: casillasCreadas.slice(0, 10),
    };
  },
});

/**
 * Backfill de una sola vez: trunca el sufijo de hora de `lots.fechaRecepcion`
 * en los lotes que YA existen en dev (decisión de Kevin, 2026-08-02, bloqueo
 * #1 de la doble corrida). `_lib/sheetPullMaps.ts` y `mapearLotesHoja` ya
 * normalizan la entrada nueva; esto arregla los 122 de 128 lotes que entraron
 * ANTES de ese cambio. No relee la hoja — el valor ya está en Convex, solo
 * mal formateado; truncar en el lugar alcanza.
 *
 * Idempotente: un lote ya normalizado no cambia (`normalizarFechaRecepcion`
 * es estable sobre su propia salida).
 */
export const _normalizarFechasEnDev = internalMutation({
  args: {},
  handler: async (ctx) => {
    exigeDeploymentDeDesarrollo(process.env.CONVEX_CLOUD_URL);

    const lots = await ctx.db.query('lots').collect();
    let normalizados = 0;
    const sinNormalizar: string[] = [];

    for (const lote of lots) {
      const nueva = normalizarFechaRecepcion(lote.fechaRecepcion);
      if (nueva === lote.fechaRecepcion) continue;
      await ctx.db.patch(lote._id, { fechaRecepcion: nueva });
      normalizados++;
    }

    // Lo que sigue sin matchear AAAA-MM-DD tras normalizar no es basura
    // truncada a la fuerza — es una fecha genuinamente distinta que alguien
    // tiene que mirar, no adivinar.
    for (const lote of await ctx.db.query('lots').collect()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(lote.fechaRecepcion)) {
        sinNormalizar.push(lote.loteId);
      }
    }

    return { totalLots: lots.length, normalizados, sinNormalizar };
  },
});

/**
 * Backfill de una sola vez: marca `segmento: 'coleccion'` en los lotes
 * `LC-*` de dev (punto 5, dictamen de Kevin, 2026-08-02). Nunca pisa un
 * `segmento` ya marcado — corre de nuevo sin duplicar nada. No escribe
 * `'operacional'` en los demás: es el default implícito (`_lib/segmentoLote.ts`),
 * y marcar 113 filas cuando alcanza con las ~15 de colección sería ruido.
 */
export const _sembrarSegmentoEnDev = internalMutation({
  args: {},
  handler: async (ctx) => {
    exigeDeploymentDeDesarrollo(process.env.CONVEX_CLOUD_URL);

    const lots = await ctx.db.query('lots').collect();
    let sembrados = 0;
    const marcados: string[] = [];

    for (const lote of lots) {
      if (lote.segmento) continue;
      if (inferirSegmentoLote(lote.loteId) !== 'coleccion') continue;
      await ctx.db.patch(lote._id, { segmento: 'coleccion' });
      sembrados++;
      marcados.push(lote.loteId);
    }

    return { totalLots: lots.length, sembrados, marcados };
  },
});

/**
 * El ensayo. `dryRun: true` por defecto: hay que pedir explícitamente que
 * escriba.
 *
 * Devuelve el resumen del plan y el reporte de excepciones formateado, que es lo
 * que Kevin lee antes de dictaminar LC-03 y los lotes sin proveedor.
 */
export const ensayo = internalAction({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (
    ctx,
    { dryRun = true },
  ): Promise<{
    dryRun: boolean;
    filasHoja: { lotes: number; inventario: number };
    resumen: PlanMigracion['resumen'];
    reporte: string;
    aplicado?: {
      lotesCreados: number;
      lotesOmitidos: { loteId: string; motivo: string }[];
      casillasCreadas: number;
      ejemploLotes: string[];
      ejemploCasillas: string[];
    };
  }> => {
    const [filasLotes, filasInventario] = await Promise.all([
      leerTabla('/api/get-table?table=lots'),
      leerTabla('/api/get-inventory-rows'),
    ]);

    // `__rowIndex` es la fila física estampada por la API, no una posición en un
    // array compactado. Esa distinción es la que evita el defecto de deriva que
    // `_relinkRowIndexFromSheet` vino a reparar.
    const rowIndexPorLote = new Map<string, number>();
    for (const fila of filasLotes) {
      const loteId = String(fila.loteId ?? '').trim();
      if (!loteId || rowIndexPorLote.has(loteId)) continue;
      const fisica = Number(fila.__rowIndex);
      if (Number.isFinite(fisica)) rowIndexPorLote.set(loteId, fisica);
    }

    // Los dos mapeos revientan si se caen enteros. No es paranoia: la primera
    // corrida leyó el id de la pieza de `itemId` cuando la columna se llama
    // `item`, las 513 filas se cayeron al filtro, y el plan reportó «0 casillas
    // a crear» como si fuera un hecho.
    const lotesHoja = mapearLotesHoja(filasLotes);
    const filasHoja = mapearFilasInventario(filasInventario);

    const { lotesConvex, casillasConvex } = await ctx.runQuery(
      internal.migracionV4._estadoActual,
      {},
    );

    const plan = planificarMigracion({
      lotesHoja,
      lotesConvex,
      filasHoja,
      casillasConvex,
    });

    const base = {
      dryRun,
      filasHoja: {
        lotes: filasLotes.length,
        inventario: filasInventario.length,
      },
      resumen: plan.resumen,
      reporte: formatearReporteExcepciones(plan),
    };
    if (dryRun) return base;

    const { id: centinelaId } = await ctx.runMutation(
      internal.migracionV4._asegurarCentinela,
      {},
    );

    const aplicado = await ctx.runMutation(internal.migracionV4._aplicarPlan, {
      lotesACrear: plan.lotesACrear.map((l: LoteACrear) => ({
        loteId: l.loteId,
        estado: l.estado,
        providerNombre: l.providerNombre,
        fechaRecepcion: l.fechaRecepcion,
        costoTotalCOP: l.costoTotalCOP,
        unidadesDeclaradas: l.unidadesDeclaradas,
        formaPago: l.formaPago,
        sede: l.sede,
        renombreLote: l.renombreLote,
        sinProveedor: l.sinProveedor,
        rowIndex: rowIndexPorLote.get(l.loteId) ?? 0,
      })),
      casillasACrear: plan.casillasACrear.map((c: CasillaACrear) => ({
        itemId: c.itemId,
        loteId: c.loteId,
        estadoCasilla: c.estadoCasilla,
        ordenEnLote: c.ordenEnLote,
        costoUnitarioRealCOP: c.costoUnitarioRealCOP,
        nombre: c.nombre,
      })),
      centinelaId,
    });

    return { ...base, aplicado };
  },
});

/**
 * Aplica la promoción y **deja constancia de qué tocó**, que es lo que la vuelve
 * reversible sin adivinar.
 *
 * No hace falta guardar los valores previos: la promoción sólo toca filas donde
 * `estadoCasilla` está AUSENTE —es su precondición, la verifica `planificarPromocion`—
 * así que deshacerla es volver a ausentarlos. Lo que sí se guarda es lo que se ESCRIBIÓ,
 * para que revertir pueda negarse a pisar una casilla que alguien tocó después.
 */
export const _aplicarPromocion = internalMutation({
  args: {
    fuente: v.string(),
    aplicadas: v.array(
      v.object({
        itemId: v.string(),
        estadoCasilla: v.string(),
        costoUnitarioRealCOP: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { fuente, aplicadas }) => {
    const hechas: typeof aplicadas = [];
    for (const a of aplicadas) {
      const fila = await ctx.db
        .query('lotItems')
        .withIndex('by_itemId', (q) => q.eq('itemId', a.itemId))
        .first();
      // La precondición se re-verifica CONTRA LA BASE, no contra el plan: entre
      // planificar y aplicar pudo pasar cualquier cosa, y pisar una casilla que ya
      // es v4 le cambiaría el costo a alguien.
      if (!fila || fila.estadoCasilla) continue;
      await ctx.db.patch(fila._id, {
        estadoCasilla: a.estadoCasilla,
        ...(a.costoUnitarioRealCOP !== undefined
          ? { costoUnitarioRealCOP: a.costoUnitarioRealCOP }
          : {}),
      });
      hechas.push(a);
    }
    const id = await ctx.db.insert('promocionesV4', {
      ts: Date.now(),
      fuente,
      aplicadas: hechas,
    });
    return { id, promovidas: hechas.length };
  },
});

/**
 * La promoción de filas del riel viejo a casillas v4. `dryRun: true` por defecto:
 * hay que pedir explícitamente que escriba, igual que `ensayo`.
 *
 * Lee la misma hoja que `ensayo` y usa el mismo planificador de estado, así que las dos
 * ven exactamente lo mismo.
 */
export const promover = internalAction({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (
    ctx,
    { dryRun = true },
  ): Promise<{
    dryRun: boolean;
    plan: PlanPromocion;
    aplicado?: { id: string; promovidas: number };
  }> => {
    const filasInventario = await leerTabla('/api/get-inventory-rows');
    const filasHoja = mapearFilasInventario(filasInventario);
    const { casillasConvex } = await ctx.runQuery(
      internal.migracionV4._estadoActual,
      {},
    );
    const plan = planificarPromocion({ filasHoja, casillasConvex });
    if (dryRun) return { dryRun, plan };

    const aplicado = await ctx.runMutation(
      internal.migracionV4._aplicarPromocion,
      {
        fuente:
          'reparto juzgado — dictamen 2026-08-12, ver ' +
          'anima-bot/docs/reparto-juzgado-2026-08-12.md',
        aplicadas: plan.aPromover,
      },
    );
    return { dryRun, plan, aplicado: { ...aplicado, id: String(aplicado.id) } };
  },
});

/**
 * Deshace una promoción: vuelve a ausentar `estadoCasilla` y `costoUnitarioRealCOP`.
 *
 * **Se niega a pisar lo que cambió.** Si una casilla ya no tiene exactamente los valores
 * que esta promoción le escribió, alguien la clasificó o le corrigió el costo después —
 * revertirla borraría trabajo humano. Esas se saltan y se devuelven nombradas, para que
 * quien revierte sepa qué quedó afuera y por qué.
 */
export const _revertirPromocion = internalMutation({
  args: { id: v.id('promocionesV4') },
  handler: async (ctx, { id }) => {
    const p = await ctx.db.get(id);
    if (!p) throw new Error('No existe esa promoción.');
    const revertidas: string[] = [];
    const intactas: string[] = [];
    for (const a of p.aplicadas) {
      const fila = await ctx.db
        .query('lotItems')
        .withIndex('by_itemId', (q) => q.eq('itemId', a.itemId))
        .first();
      if (!fila) continue;
      const igual =
        fila.estadoCasilla === a.estadoCasilla &&
        fila.costoUnitarioRealCOP === a.costoUnitarioRealCOP;
      if (!igual) {
        intactas.push(a.itemId);
        continue;
      }
      await ctx.db.patch(fila._id, {
        estadoCasilla: undefined,
        costoUnitarioRealCOP: undefined,
      });
      revertidas.push(a.itemId);
    }
    await ctx.db.patch(id, { revertidaEn: Date.now() });
    return { revertidas: revertidas.length, intactas };
  },
});
