/**
 * Siembra `categoriaFiscal` por inferencia — decisión de Kevin, 2026-08-02
 * (bloqueo #2 de la doble corrida: 0 de 128 lotes de dev la tenían).
 *
 * **Nunca pisa una categoría ya capturada.** Un lote con `categoriaFiscal`
 * puesta a mano se salta, siempre — esto solo llena el vacío, y lo que llena
 * queda marcado `'inferida'` (nunca `'capturada'`), con el aviso
 * `CATEGORIA_INFERIDA` viajando en cada precio (`_lib/motorUnidad.ts`) y el
 * sufijo en el espejo (`_lib/espejoFilas.ts`).
 *
 * Toda la decisión de qué es gema y qué es joya vive en
 * `_lib/categoriaFiscalInferencia.ts`, puro. Acá solo hay IO: leer el
 * `nombre` de cada ítem desde el SOT v3 (mismo camino que
 * `migracionV4:leerTabla` + `mapearFilasInventario` — no se reinventa),
 * cruzarlo con las casillas de Convex, y aplicar.
 */
import { v } from 'convex/values';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { internal } from './_generated/api';
import { exigeDeploymentDeDesarrollo } from './_lib/destinoEscritura';
import { leerTabla } from './migracionV4';
import { mapearFilasInventario } from './_lib/migracionV4';
import {
  inferirCategoriaFiscalLote,
  type InferenciaLote,
} from './_lib/categoriaFiscalInferencia';

/** Lo que el planificador necesita saber de Convex. Solo lee. */
export const _estadoActual = internalQuery({
  args: {},
  handler: async (ctx) => {
    const lots = await ctx.db.query('lots').collect();
    const lotItems = await ctx.db.query('lotItems').collect();
    return {
      lots: lots.map((l) => ({
        loteId: l.loteId,
        categoriaFiscal: l.categoriaFiscal,
      })),
      lotItems: lotItems.map((c) => ({ loteId: c.loteId, itemId: c.itemId })),
    };
  },
});

/**
 * Aplica las inferencias. Guardado por deployment, y re-verifica `categoriaFiscal`
 * fila por fila antes de escribir — entre planificar y aplicar puede haber
 * corrido otra cosa (p. ej. alguien capturó la categoría a mano mientras tanto).
 */
export const _aplicar = internalMutation({
  args: {
    inferencias: v.array(
      v.object({
        loteId: v.string(),
        categoriaFiscal: v.union(
          v.literal('gema'),
          v.literal('joya'),
          v.literal('mixta'),
        ),
        porItem: v.optional(
          v.array(
            v.object({
              itemId: v.string(),
              categoriaFiscal: v.union(v.literal('gema'), v.literal('joya')),
            }),
          ),
        ),
      }),
    ),
  },
  handler: async (ctx, { inferencias }) => {
    exigeDeploymentDeDesarrollo(process.env.CONVEX_CLOUD_URL);

    let lotesSembrados = 0;
    let casillasSembradas = 0;
    const omitidos: { loteId: string; motivo: string }[] = [];

    for (const inf of inferencias) {
      const lote = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', inf.loteId))
        .first();
      if (!lote) {
        omitidos.push({ loteId: inf.loteId, motivo: 'ya no existe' });
        continue;
      }
      if (lote.categoriaFiscal) {
        omitidos.push({
          loteId: inf.loteId,
          motivo: 'ya tenía categoría capturada',
        });
        continue;
      }

      await ctx.db.patch(lote._id, {
        categoriaFiscal: inf.categoriaFiscal,
        categoriaFiscalOrigen: 'inferida',
      });
      lotesSembrados++;

      if (inf.categoriaFiscal === 'mixta' && inf.porItem) {
        for (const it of inf.porItem) {
          const casilla = await ctx.db
            .query('lotItems')
            .withIndex('by_itemId', (q) => q.eq('itemId', it.itemId))
            .first();
          if (!casilla || casilla.categoriaFiscal) continue;
          await ctx.db.patch(casilla._id, {
            categoriaFiscal: it.categoriaFiscal,
          });
          casillasSembradas++;
        }
      }
    }

    return { lotesSembrados, casillasSembradas, omitidos };
  },
});

/**
 * El ensayo. `dryRun: true` por defecto — hay que pedir explícitamente que
 * escriba, igual que `migracionV4:ensayo`.
 */
export const ejecutar = internalAction({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (
    ctx,
    { dryRun = true },
  ): Promise<{
    dryRun: boolean;
    resumen: {
      lotesSinCategoria: number;
      lotesInferibles: number;
      lotesSinCasillas: number;
      porCategoria: { gema: number; joya: number; mixta: number };
    };
    aplicado?: {
      lotesSembrados: number;
      casillasSembradas: number;
      omitidos: { loteId: string; motivo: string }[];
    };
  }> => {
    const filasInventario = await leerTabla('/api/get-inventory-rows');
    const filasHoja = mapearFilasInventario(filasInventario);
    const nombrePorItem = new Map(filasHoja.map((f) => [f.itemId, f.nombre]));

    const { lots, lotItems } = await ctx.runQuery(
      internal.categoriaFiscalInferencia._estadoActual,
      {},
    );

    const itemsPorLote = new Map<
      string,
      { itemId: string; nombre?: string }[]
    >();
    for (const c of lotItems) {
      itemsPorLote.set(c.loteId, [
        ...(itemsPorLote.get(c.loteId) ?? []),
        { itemId: c.itemId, nombre: nombrePorItem.get(c.itemId) },
      ]);
    }

    const sinCategoria = lots.filter((l) => !l.categoriaFiscal);
    let lotesSinCasillas = 0;
    const inferencias: InferenciaLote[] = [];
    for (const lote of sinCategoria) {
      const items = itemsPorLote.get(lote.loteId);
      if (!items?.length) {
        lotesSinCasillas++;
        continue;
      }
      inferencias.push(inferirCategoriaFiscalLote(lote.loteId, items));
    }

    const resumen = {
      lotesSinCategoria: sinCategoria.length,
      lotesInferibles: inferencias.length,
      lotesSinCasillas,
      porCategoria: {
        gema: inferencias.filter((i) => i.categoriaFiscal === 'gema').length,
        joya: inferencias.filter((i) => i.categoriaFiscal === 'joya').length,
        mixta: inferencias.filter((i) => i.categoriaFiscal === 'mixta').length,
      },
    };

    if (dryRun) return { dryRun, resumen };

    const aplicado = await ctx.runMutation(
      internal.categoriaFiscalInferencia._aplicar,
      {
        inferencias: inferencias.map((i) => ({
          loteId: i.loteId,
          categoriaFiscal: i.categoriaFiscal,
          porItem: i.porItem
            ? [...i.porItem.entries()].map(([itemId, categoriaFiscal]) => ({
                itemId,
                categoriaFiscal,
              }))
            : undefined,
        })),
      },
    );

    return { dryRun, resumen, aplicado };
  },
});
