/**
 * Utilidad de mantenimiento del riel v4 — borrar lotes de PRUEBA en dev.
 *
 * Existe por una razón concreta: los lotes que se crearon para verificar la
 * Fase 1 cuentan como lotes activos, y el divisor del gasto fijo sale de ese
 * conteo. Dejarlos ahí bajaría el fijo unitario con mercancía que no existe, y
 * los totales de la doble corrida no conciliarían contra v3.
 *
 * Tres guardas, porque esto borra:
 *
 *  1. Solo toca lotes con `origenModelo: 'v4'`. Un lote del riel viejo lanza.
 *  2. Solo toca lotes cuyos ids le pasen EXPLÍCITAMENTE. No hay «borrá todo».
 *  3. Se niega a correr en el deployment de producción.
 *
 * Es `internalMutation`: no es invocable desde ningún cliente.
 */
import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { esDeploymentDeProduccion } from './_lib/destinoEscritura';

/**
 * Cuántas piezas hay por estado, y cuántos lotes se mantienen activos SOLO por
 * piezas con el estado en blanco.
 *
 * El schema admite `estado: ''` para filas legacy que llegaron de la hoja con la
 * celda vacía. Como «activo» se define por negación (`!== 'VENDIDA'`), una pieza
 * vendida cuya celda quedó vacía cuenta como viva e infla el divisor, que baja
 * el gasto fijo por lote y subcotiza todo el catálogo. Este diagnóstico dice si
 * eso es teórico o real.
 */
export const diagnosticoEstados = internalQuery({
  args: {},
  handler: async (ctx) => {
    const porEstado: Record<string, number> = {};
    const porLote = new Map<string, string[]>();

    for (const item of await ctx.db.query('productInventory').collect()) {
      const estado = item.estado ?? '(ausente)';
      porEstado[estado] = (porEstado[estado] ?? 0) + 1;
      if (item.loteId) {
        porLote.set(item.loteId, [...(porLote.get(item.loteId) ?? []), estado]);
      }
    }

    // Lotes cuya única razón de estar activos son piezas con estado en blanco.
    const activosSoloPorVacio: string[] = [];
    for (const [loteId, estados] of porLote) {
      const noVendidas = estados.filter((e) => e !== 'VENDIDA');
      if (noVendidas.length > 0 && noVendidas.every((e) => e === '')) {
        activosSoloPorVacio.push(loteId);
      }
    }

    return {
      porEstado,
      lotesConPiezas: porLote.size,
      activosSoloPorEstadoVacio: activosSoloPorVacio.length,
      ejemplos: activosSoloPorVacio.slice(0, 10),
    };
  },
});

export const limpiarLotesDePrueba = internalMutation({
  args: { loteIds: v.array(v.string()) },
  handler: async (ctx, { loteIds }) => {
    if (esDeploymentDeProduccion(process.env.CONVEX_CLOUD_URL)) {
      throw new Error(
        'Esta utilidad es de dev. En producción no se borran lotes: se cancelan ' +
          'por el flujo normal, que deja rastro.',
      );
    }
    if (!loteIds.length) {
      throw new Error('Pasá los loteIds a borrar. No existe «borrá todo».');
    }

    const borrado = {
      lotes: [] as string[],
      casillas: 0,
      movimientos: 0,
      outbox: 0,
    };

    for (const loteId of loteIds) {
      const lote = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .first();
      if (!lote) continue;
      if (lote.origenModelo !== 'v4') {
        throw new Error(
          `${loteId} no es un lote v4. Esta utilidad no toca el riel viejo.`,
        );
      }

      const casillas = await ctx.db
        .query('lotItems')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .collect();

      const itemIds = new Set(casillas.map((c) => c.itemId));

      // Los movimientos que tocan SOLO piezas de este lote. Uno que mezcle
      // piezas de otro lote no se borra: sería reescribir el historial ajeno.
      for (const mov of await ctx.db.query('movimientos').collect()) {
        if (mov.itemIds.every((id) => itemIds.has(id))) {
          await ctx.db.delete(mov._id);
          borrado.movimientos++;
        }
      }

      for (const fila of await ctx.db.query('espejoOutbox').collect()) {
        if (fila.idFila === loteId || itemIds.has(fila.idFila)) {
          await ctx.db.delete(fila._id);
          borrado.outbox++;
        }
      }

      for (const casilla of casillas) {
        await ctx.db.delete(casilla._id);
        borrado.casillas++;
      }

      await ctx.db.delete(lote._id);
      borrado.lotes.push(loteId);
    }

    // Los recálculos NO se borran. Antes esta función barría la tabla entera,
    // fuera del loop y sin filtro: si ningún loteId existía igual la vaciaba, y
    // se llevaba puesta la traza de lotes que nadie tocó. `recalculos` es el
    // registro de por qué cambió un precio; borrarlo deja esa pregunta sin
    // respuesta.
    //
    // Ya no hace falta para lo que se usaba: `costoFijoUnitarioVigente` dejó de
    // leer el último recálculo como caché y ahora cuenta el inventario real, así
    // que una traza vieja no puede servir un divisor equivocado.

    return borrado;
  },
});
