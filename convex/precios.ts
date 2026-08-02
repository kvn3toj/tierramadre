/**
 * La cara de Convex del motor de precios: resuelve de la base lo que el motor
 * puro necesita (la config vigente y el gasto fijo unitario) y delega el cálculo
 * a `_lib/motorPrecios` + `_lib/previewLote`.
 *
 * Toda la aritmética vive en los módulos puros, testeados en
 * `tests/motorPrecios.test.ts` y `tests/previewLote.test.ts`. Aquí solo hay
 * lecturas de `ctx.db` — el patrón del repo, que no tiene arnés para invocar
 * handlers (ver reconocimiento §5.2).
 *
 * ¿Por qué el fijo unitario NO se recuenta en cada lectura? Porque el preview de
 * W1 se pide mientras el operador escribe el costo. Recontar el inventario ahí
 * serían dos barridos de tabla por pulsación, sobre un proyecto que ya apagó sus
 * crons por ancho de banda. El conteo caro se hace cuando el inventario CAMBIA
 * (alta o venta, `_lib/recalculo`) y deja su resultado en `recalculos`; leer el
 * vigente es una query indexada que devuelve una fila.
 *
 * El preview es una **action gateada por rol**, no una query pública: devuelve
 * la estructura de costos (fijo vigente, lotes activos, K, piso, margen) y eso
 * no puede quedar detrás de una convención del frontend. Ver `previewLote`.
 */
import { v } from 'convex/values';
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { requireAccessLevel, ROLES_COSTOS } from './_lib/authz';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  CONFIG_PRECIOS_2026_07,
  configVigenteEn,
  costoFijoUnitario,
  type ConfigPrecios,
} from './_lib/motorPrecios';
import { construirPreviewLote } from './_lib/previewLote';
import { preciosDelLote, type PrecioUnidad } from './_lib/motorUnidad';
import { metricasDelLote } from './_lib/motorLote';
import {
  configDelPeriodo,
  construirTablero,
  type VentaDelPeriodo,
} from './_lib/tablero';
import type { FilaTablero, MotorParaEspejo } from './_lib/espejoFilas';
import { agruparUnidadesPorLote, loteEstaActivo } from './_lib/recalculo';

/** Lee las reglas de la tabla y elige la vigente para `fecha`. */
export async function configVigente(
  ctx: QueryCtx,
  fecha: string,
): Promise<ConfigPrecios> {
  const filas = await ctx.db.query('configPrecios').collect();
  if (!filas.length) {
    throw new Error(
      'configPrecios está vacía: corré `precios:seedConfig` antes de cotizar. ' +
        'Sin reglas no hay divisor, y adivinarlo es justo lo que rompió la hoja.',
    );
  }
  return configVigenteEn(
    filas.map((f) => ({
      vigenteDesde: f.vigenteDesde,
      gastosFijosMensualesCOP: f.gastosFijosMensualesCOP,
      comisionPct: f.comisionPct,
      ivaJoyaPct: f.ivaJoyaPct,
      margenNetoDeseadoPct: f.margenNetoDeseadoPct,
      remateHasta: f.remateHasta,
      multRemateGema: f.multRemateGema,
      multRemateJoya: f.multRemateJoya,
      ventasEstimadasMesCOP: f.ventasEstimadasMesCOP,
    })),
    fecha,
  );
}

/**
 * Cuenta los lotes activos: los que tienen ≥1 unidad no vendida (decisión D2).
 *
 * Caro a propósito y llamado solo cuando el inventario cambia. Barre
 * `productInventory` agrupando por `loteId` en vez de consultar ítem por ítem —
 * 235 lecturas puntuales contra un barrido es la diferencia entre caber y no
 * caber en el free-tier.
 *
 * Cubre los dos rieles: las piezas legacy traen su estado en `productInventory`;
 * las casillas v4 lo traen en `lotItems.estadoCasilla` y todavía no tienen fila
 * de inventario (ver reconocimiento §5.6).
 */
export async function contarLotesActivosDb(
  ctx: QueryCtx | MutationCtx,
): Promise<{ lotesActivos: number; unidadesActivas: number }> {
  const lots = await ctx.db.query('lots').collect();

  // La unión de los dos rieles vive en `_lib/recalculo`, deduplicada por
  // itemId. Antes se hacía acá con dos `push` sobre el mismo array, y eso
  // funcionaba solo mientras una casilla v4 NO tuviera fila en
  // `productInventory`. La migración de ensayo crea las casillas sobre ítems
  // que ya existen ahí, así que a partir de ella cada pieza aparecía dos veces
  // y `unidadesActivas` salía al doble.
  const porLote = agruparUnidadesPorLote({
    // `coleccion` es OTRO negocio (punto 5, 2026-08-02): nunca absorbe el
    // gasto fijo de la comercializadora, así que no cuenta en D2 — ni como
    // lote activo ni en `unidadesActivas`. Así era el modelo histórico.
    lotesVivos: lots
      .filter((l) => l.estado !== 'cancelado' && l.segmento !== 'coleccion')
      .map((l) => l.loteId),
    inventario: await ctx.db.query('productInventory').collect(),
    casillas: await ctx.db.query('lotItems').collect(),
  });

  let lotesActivos = 0;
  let unidadesActivas = 0;
  for (const unidades of porLote.values()) {
    const activas = unidades.filter((e) => e !== 'VENDIDA').length;
    unidadesActivas += activas;
    if (loteEstaActivo(unidades.map((estado) => ({ estado })))) lotesActivos++;
  }

  return { lotesActivos, unidadesActivas };
}

/**
 * El gasto fijo unitario vigente: se CALCULA, siempre, con la config vigente y
 * el conteo real de lotes activos.
 *
 * Antes leía el `valorNuevo` del último recálculo, como caché. Esa versión tenía
 * tres agujeros que la revisión adversarial destapó, y los tres nacían de servir
 * un número guardado en vez del número verdadero:
 *
 *  1. **Ignoraba la config.** Dar de alta una `configPrecios` nueva (subir los
 *     gastos fijos) no cambiaba ningún precio hasta que alguien diera de alta o
 *     vendiera un lote v4. Toda la maquinaria de `vigenteDesde` quedaba muerta.
 *  2. **Un evento retroactivo reprecia el presente.** El recálculo elige config
 *     por la fecha de NEGOCIO del evento pero se ordena por `ts` de reloj: cargar
 *     hoy un lote con fecha de julio dejaba el catálogo entero cotizando con el
 *     gasto fijo de julio.
 *  3. **El riel viejo movía el divisor sin dejar traza.** `planificarRecalculo`
 *     solo lo llaman los caminos v4; agotar diez lotes legacy por `sales.create`
 *     cambiaba el conteo real y el número servido seguía igual.
 *
 * El costo de calcular siempre son dos barridos de tabla. Es asumible porque
 * esto ya no cuelga de una query reactiva: `previewLote` es una action gateada y
 * con debounce, así que corre por interacción, no por tecla. `recalculos` queda
 * como lo que dice ser —la traza de auditoría de por qué cambió un precio—, no
 * como caché.
 *
 * Devuelve `undefined` si no hay lotes activos: no hay entre qué repartir, y
 * devolver 0 haría cotizar todo sin absorber estructura, que es exactamente el
 * defecto `E6 = 0` de la hoja.
 */
export async function costoFijoUnitarioVigente(
  ctx: QueryCtx,
  config: ConfigPrecios,
): Promise<{ costoFijoUnitarioCOP?: number; lotesActivos: number }> {
  const { lotesActivos } = await contarLotesActivosDb(ctx);
  if (lotesActivos <= 0) return { lotesActivos: 0 };
  return {
    costoFijoUnitarioCOP: costoFijoUnitario(
      config.gastosFijosMensualesCOP,
      lotesActivos,
    ),
    lotesActivos,
  };
}

/**
 * Los precios por unidad de todas las casillas v4, en una sola pasada.
 *
 * **Existe para que haya UN solo camino.** Los precios se calculan en dos
 * lugares —al encolar la fila del espejo, y al reconstruir la fila esperada para
 * el job de deriva— y si los dos no dan idéntico, el job denuncia como edición
 * humana una columna que el espejo escribió bien. Ya pasó con `renombreLote`, y
 * el comentario que lo documenta está en `espejo._filasEsperadas`.
 *
 * El gasto fijo unitario es UNO solo (sale del conteo global de lotes activos),
 * pero la CONFIG depende de la fecha de cada lote: una regla nueva no reprecia
 * retroactivamente un lote de julio. Por eso se cuenta una vez y se resuelve la
 * config por lote.
 */
export async function preciosPorItemDb(
  ctx: QueryCtx | MutationCtx,
): Promise<Map<string, PrecioUnidad>> {
  const salida = new Map<string, PrecioUnidad>();

  const configs = await ctx.db.query('configPrecios').collect();
  if (!configs.length) return salida;

  const { lotesActivos } = await contarLotesActivosDb(ctx);
  if (lotesActivos <= 0) return salida;

  const casillasPorLote = new Map<string, typeof casillas>();
  const casillas = await ctx.db.query('lotItems').collect();
  for (const c of casillas) {
    if (!c.estadoCasilla) continue;
    casillasPorLote.set(c.loteId, [
      ...(casillasPorLote.get(c.loteId) ?? []),
      c,
    ]);
  }

  for (const lote of await ctx.db.query('lots').collect()) {
    const delLote = casillasPorLote.get(lote.loteId);
    if (!delLote?.length) continue;

    let config: ConfigPrecios;
    try {
      config = configVigenteEn(configs, lote.fechaRecepcion);
    } catch {
      // Un lote con fecha anterior a toda la configuración conocida no se
      // cotiza. Caer a la config más nueva sería inventarle un régimen.
      continue;
    }

    const { cotiza, porItem } = preciosDelLote({
      costoCompraLoteCOP: lote.costoCompraCOP ?? lote.costoTotalCOP,
      casillas: delLote.map((c) => ({
        itemId: c.itemId,
        costoUnitarioRealCOP: c.costoUnitarioRealCOP,
        categoriaFiscal: c.categoriaFiscal,
      })),
      categoriaFiscalLote: lote.categoriaFiscal,
      categoriaFiscalOrigen: lote.categoriaFiscalOrigen,
      segmento: lote.segmento,
      costosVariablesLoteCOP: (lote.costosVariables ?? []).reduce(
        (a, c) => a + c.montoCOP,
        0,
      ),
      costoFijoUnitarioLoteCOP: costoFijoUnitario(
        config.gastosFijosMensualesCOP,
        lotesActivos,
      ),
      config,
    });
    if (!cotiza) continue;
    for (const [itemId, precio] of porItem) salida.set(itemId, precio);
  }

  return salida;
}

/**
 * Las trece del motor para la fila de UN lote, o `undefined` si no cotiza.
 *
 * Mismo criterio de un-solo-camino que `preciosPorItemDb`: lo llaman el enqueuer
 * y la reconstrucción del job de deriva, así que no pueden divergir.
 *
 * No cotiza cuando falta el costo capturado (el caso C-085, cuyo «precio» era
 * 100% gasto fijo), cuando el lote es `mixta` (se resuelve casilla por casilla)
 * o cuando no tiene categoría fiscal — que es el estado en que la migración de
 * ensayo deja a los 28 lotes reconstruidos, a propósito: no se les inventa.
 */
export async function motorDelLoteDb(
  ctx: QueryCtx | MutationCtx,
  lote: {
    fechaRecepcion: string;
    categoriaFiscal?: 'gema' | 'joya' | 'mixta';
    costoCompraCOP?: number;
    costoTotalCOP: number;
    unidadesDeclaradas: number;
    costosVariables?: { concepto: string; montoCOP: number }[];
    /** `'coleccion'` no se precifica por absorción (punto 5, 2026-08-02). */
    segmento?: 'operacional' | 'coleccion';
  },
  contexto?: { configs: ConfigPrecios[]; lotesActivos: number },
): Promise<MotorParaEspejo | undefined> {
  if (lote.segmento === 'coleccion') return undefined;
  if (lote.categoriaFiscal !== 'gema' && lote.categoriaFiscal !== 'joya') {
    return undefined;
  }
  const costoCompraCOP = lote.costoCompraCOP ?? lote.costoTotalCOP;
  if (!Number.isFinite(costoCompraCOP) || costoCompraCOP <= 0) return undefined;

  const configs =
    contexto?.configs ??
    (await ctx.db.query('configPrecios').collect()).map((f) => ({
      vigenteDesde: f.vigenteDesde,
      gastosFijosMensualesCOP: f.gastosFijosMensualesCOP,
      comisionPct: f.comisionPct,
      ivaJoyaPct: f.ivaJoyaPct,
      margenNetoDeseadoPct: f.margenNetoDeseadoPct,
      remateHasta: f.remateHasta,
      multRemateGema: f.multRemateGema,
      multRemateJoya: f.multRemateJoya,
      ventasEstimadasMesCOP: f.ventasEstimadasMesCOP,
    }));
  if (!configs.length) return undefined;

  const lotesActivos =
    contexto?.lotesActivos ?? (await contarLotesActivosDb(ctx)).lotesActivos;
  if (lotesActivos <= 0) return undefined;

  let config: ConfigPrecios;
  try {
    config = configVigenteEn(configs, lote.fechaRecepcion);
  } catch {
    return undefined;
  }

  const m = metricasDelLote({
    costoCompraCOP,
    costosVariablesCOP: (lote.costosVariables ?? []).reduce(
      (a, c) => a + c.montoCOP,
      0,
    ),
    costoFijoUnitarioCOP: costoFijoUnitario(
      config.gastosFijosMensualesCOP,
      lotesActivos,
    ),
    unidadesDeclaradas: lote.unidadesDeclaradas,
    categoriaFiscal: lote.categoriaFiscal,
    config,
    fecha: lote.fechaRecepcion,
  });

  return { ...m, recalculadoEn: new Date().toISOString() };
}

/**
 * El Tablero de un período, calculado desde la base.
 *
 * `inventarioActivoCOP` suma **solo costos CAPTURADOS** de casillas no vendidas.
 * Las piezas del riel viejo sin `costoUnitarioRealCOP` no contribuyen, así que es
 * un PISO del inventario, no su total — el Léeme lo dice. Derivarlo del costo del
 * lote sería el prorrateo que D6 prohíbe.
 */
export async function tableroDelPeriodoDb(
  ctx: QueryCtx | MutationCtx,
  periodo: string,
): Promise<FilaTablero | undefined> {
  const configs = await ctx.db.query('configPrecios').collect();
  if (!configs.length) return undefined;

  let config: ConfigPrecios;
  try {
    config = configDelPeriodo(
      configs.map((f) => ({
        vigenteDesde: f.vigenteDesde,
        gastosFijosMensualesCOP: f.gastosFijosMensualesCOP,
        comisionPct: f.comisionPct,
        ivaJoyaPct: f.ivaJoyaPct,
        margenNetoDeseadoPct: f.margenNetoDeseadoPct,
        remateHasta: f.remateHasta,
        multRemateGema: f.multRemateGema,
        multRemateJoya: f.multRemateJoya,
        ventasEstimadasMesCOP: f.ventasEstimadasMesCOP,
      })),
      periodo,
    );
  } catch {
    return undefined;
  }

  const { lotesActivos } = await contarLotesActivosDb(ctx);
  const precios = await preciosPorItemDb(ctx);

  // Otro negocio, otra celda (punto 5): un lote 'coleccion' no absorbe el
  // fijo y su costo no puede sumarse al inventario operativo — es justo el
  // defecto que infló `inventarioActivoCOP` "25× arriba", midiendo los dos
  // negocios en una sola vara.
  const segmentoPorLote = new Map(
    (await ctx.db.query('lots').collect()).map((l) => [l.loteId, l.segmento]),
  );

  let inventarioActivoCOP = 0;
  let inventarioColeccionCOP = 0;
  const kPorItem = new Map<string, number>();
  for (const c of await ctx.db.query('lotItems').collect()) {
    if (!c.estadoCasilla) continue;
    const k = precios.get(c.itemId);
    if (k) kPorItem.set(c.itemId, k.KUnidadCOP);
    if (c.estadoCasilla !== 'VENDIDA' && c.costoUnitarioRealCOP) {
      if (segmentoPorLote.get(c.loteId) === 'coleccion') {
        inventarioColeccionCOP += c.costoUnitarioRealCOP;
      } else {
        inventarioActivoCOP += c.costoUnitarioRealCOP;
      }
    }
  }

  // Las ventas del período, del ledger de W3. Solo las que se pueden medir: una
  // venta cuya pieza no tiene K no puede aportar margen, y estimárselo sería
  // inventar el número que este Tablero existe para dejar de inventar.
  const ventas: VentaDelPeriodo[] = [];
  for (const mov of await ctx.db.query('movimientos').collect()) {
    if (mov.tipo !== 'VENTA' || !mov.venta) continue;
    if (mov.fecha.slice(0, 7) !== periodo) continue;
    for (const itemId of mov.itemIds) {
      const K = kPorItem.get(itemId);
      const casilla = await ctx.db
        .query('lotItems')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      const categoria =
        casilla?.categoriaFiscal ?? precios.get(itemId)?.categoriaFiscal;
      if (K === undefined || !categoria) continue;
      ventas.push({
        // El precio del movimiento es del EVENTO, que puede cubrir varias
        // piezas. Se reparte por peso del K, el mismo criterio del motor.
        precioVentaRealCOP:
          mov.venta.precioVentaRealCOP *
          (K / mov.itemIds.reduce((a, id) => a + (kPorItem.get(id) ?? 0), 0)),
        KUnidadCOP: K,
        categoriaFiscal: categoria,
      });
    }
  }

  const t = construirTablero({
    periodo,
    config,
    lotesActivos,
    inventarioActivoCOP,
    inventarioColeccionCOP,
    ventas,
  });
  return {
    ...t,
    ventasMesCOP: Math.round(t.ventasMesCOP),
    actualizadoEn: new Date().toISOString(),
  };
}

/**
 * El preview del motor para W1, antes de guardar.
 *
 * Recibe lo que el operador está escribiendo y devuelve K, el equilibrio real,
 * el objetivo y las advertencias. No escribe nada.
 *
 * **Interna a propósito.** Devuelve datos de COSTO —el gasto fijo vigente, el
 * conteo de lotes activos, K, el piso y el margen—, así que no puede ser una
 * query pública: cualquiera con la URL del deployment podría llamarla. El único
 * camino de entrada es la action `previewLote`, que verifica identidad y rol
 * antes de llegar acá. `AdminRoute` esconde botones; no protege el backend.
 */
export const _previewLote = internalQuery({
  args: {
    costoCompraCOP: v.number(),
    costosVariablesCOP: v.optional(v.number()),
    categoriaFiscal: v.union(
      v.literal('gema'),
      v.literal('joya'),
      v.literal('mixta'),
    ),
    unidadesDeclaradas: v.optional(v.number()),
    /** `AAAA-MM-DD`. La decide el cliente para que el motor no lea el reloj. */
    fecha: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await configVigente(ctx, args.fecha);
    const { costoFijoUnitarioCOP, lotesActivos } =
      await costoFijoUnitarioVigente(ctx, config);

    if (costoFijoUnitarioCOP === undefined) {
      return {
        disponible: false as const,
        motivo:
          'no hay lotes activos: sin ellos el gasto fijo no tiene entre qué ' +
          'repartirse y no se puede cotizar.',
      };
    }

    return {
      disponible: true as const,
      costoFijoUnitarioCOP,
      lotesActivos,
      ...construirPreviewLote({
        costoCompraCOP: args.costoCompraCOP,
        costosVariablesCOP: args.costosVariablesCOP,
        categoriaFiscal: args.categoriaFiscal,
        costoFijoUnitarioCOP,
        fecha: args.fecha,
        config,
        unidadesDeclaradas: args.unidadesDeclaradas,
        lotesActivos,
      }),
    };
  },
});

/**
 * La puerta del preview: verifica identidad y rol ANTES de tocar los datos.
 *
 * Es una action y no una query porque `requireAccessLevel` necesita `fetch`
 * (verifica el token contra Google y el rol contra el roster). El costo de
 * perder la reactividad es deliberado: un endpoint reactivo que devuelve la
 * estructura de costos es un endpoint público que devuelve la estructura de
 * costos, y `AdminRoute` solo esconde botones.
 *
 * `ROLES_COSTOS` vive en `_lib/authz.ts` para que la frontera tenga un dueño
 * solo, en vez de repetirse endpoint por endpoint.
 */
export const previewLote = action({
  args: {
    idToken: v.string(),
    costoCompraCOP: v.number(),
    costosVariablesCOP: v.optional(v.number()),
    categoriaFiscal: v.union(
      v.literal('gema'),
      v.literal('joya'),
      v.literal('mixta'),
    ),
    unidadesDeclaradas: v.optional(v.number()),
    fecha: v.string(),
  },
  handler: async (ctx, { idToken, ...args }): Promise<unknown> => {
    await requireAccessLevel(idToken, [...ROLES_COSTOS]);
    return await ctx.runQuery(internal.precios._previewLote, args);
  },
});

/**
 * Siembra la configuración de julio 2026. Idempotente por `vigenteDesde`: correrlo
 * dos veces no duplica la regla ni la pisa.
 */
export const seedConfig = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existentes = await ctx.db.query('configPrecios').collect();
    if (
      existentes.some(
        (f) => f.vigenteDesde === CONFIG_PRECIOS_2026_07.vigenteDesde,
      )
    ) {
      return { creada: false, motivo: 'la regla ya existe' };
    }
    await ctx.db.insert('configPrecios', {
      ...CONFIG_PRECIOS_2026_07,
      notas:
        'Semilla del Modelo v2 tras reparar B5 el 2026-07-25: $33.651.815 de ' +
        'gasto fijo mensual. El divisor sale de COUNT(lotes activos), no de B6.',
    });
    return { creada: true };
  },
});
