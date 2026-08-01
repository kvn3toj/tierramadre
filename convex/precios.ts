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
 * W1 es una query reactiva: se re-ejecuta con cada tecla mientras el operador
 * escribe el costo. Recontar el inventario ahí serían dos barridos de tabla por
 * pulsación, sobre un proyecto que ya apagó sus crons por ancho de banda. El
 * conteo caro se hace cuando el inventario CAMBIA (alta o venta, `_lib/recalculo`)
 * y deja su resultado en `recalculos`; leer el vigente es una query indexada que
 * devuelve una fila.
 */
import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  CONFIG_PRECIOS_2026_07,
  configVigenteEn,
  costoFijoUnitario,
  type ConfigPrecios,
} from './_lib/motorPrecios';
import { construirPreviewLote } from './_lib/previewLote';
import { loteEstaActivo, type EstadoUnidad } from './_lib/recalculo';

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
  const vivos = lots.filter((l) => l.estado !== 'cancelado');

  const porLote = new Map<string, EstadoUnidad[]>();
  for (const l of vivos) porLote.set(l.loteId, []);

  for (const item of await ctx.db.query('productInventory').collect()) {
    if (!item.loteId) continue;
    porLote.get(item.loteId)?.push(item.estado);
  }

  // Casillas v4: viven solo en lotItems hasta que W2 las complete.
  for (const casilla of await ctx.db.query('lotItems').collect()) {
    if (!casilla.estadoCasilla) continue;
    porLote.get(casilla.loteId)?.push(casilla.estadoCasilla);
  }

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
 * El gasto fijo unitario vigente: el `valorNuevo` del último recálculo.
 *
 * Si todavía no hay ninguno (base recién sembrada), lo calcula una vez contando
 * el inventario. Devuelve `undefined` si no hay lotes activos — no hay entre qué
 * repartir, y devolver 0 haría cotizar todo sin absorber estructura, que es
 * exactamente el defecto `E6 = 0` de la hoja.
 */
export async function costoFijoUnitarioVigente(
  ctx: QueryCtx,
  config: ConfigPrecios,
): Promise<{ costoFijoUnitarioCOP?: number; lotesActivos: number }> {
  const ultimo = await ctx.db
    .query('recalculos')
    .withIndex('by_ts')
    .order('desc')
    .first();

  if (ultimo) {
    return {
      costoFijoUnitarioCOP: ultimo.valorNuevo,
      lotesActivos: ultimo.divisorUsado,
    };
  }

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
 * El preview del motor para W1, antes de guardar.
 *
 * Recibe lo que el operador está escribiendo y devuelve K, el equilibrio real,
 * el objetivo y las advertencias. No escribe nada.
 *
 * NOTA DE ALCANCE: expone el gasto fijo vigente y el conteo de lotes activos, que
 * son datos de costo. Hoy solo lo consume la ruta de admin (detrás de
 * `AdminRoute`), pero es una query pública de Convex. Gatearla por rol antes de
 * prod está anotado en el doc de cierre.
 */
export const previewLote = query({
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
      }),
    };
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
