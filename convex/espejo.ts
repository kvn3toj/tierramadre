/**
 * El drenaje de la cola del espejo hacia «SOT v4 · Espejo (PRUEBAS)».
 *
 * Contrato, en orden de importancia:
 *
 *  1. **Un fallo de Sheets NUNCA revienta la mutation de origen.** Convex es la
 *     verdad; la hoja es una vista. Por eso el espejo es una cola drenada por
 *     una acción aparte, y no una escritura dentro del alta del lote.
 *  2. **Upsert idempotente por id.** Un reintento tras un timeout no puede dejar
 *     el lote dos veces en la hoja (ver `_lib/espejoUpsert.ts`).
 *  3. **Push-only.** Se lee la hoja solo para ubicar la fila y respetar el orden
 *     de sus cabeceras. Nada de lo leído vuelve a Convex como dato.
 */
import { v } from 'convex/values';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { internal } from './_generated/api';
import { CABECERAS_CASILLAS, CABECERAS_LOTES } from './_lib/espejoFilas';
import {
  asegurarPestana,
  columnaA1,
  escribirRango,
  espejoSpreadsheetId,
  leerRango,
  obtenerAccessToken,
  TEXTO_LEEME,
} from './_lib/espejoSheets';
import { planificarUpsert } from './_lib/espejoUpsert';

const CABECERAS_POR_PESTANA: Record<string, readonly string[]> = {
  Lotes: CABECERAS_LOTES,
  Casillas: CABECERAS_CASILLAS,
};

export const _pendientes = internalQuery({
  args: { limite: v.optional(v.number()) },
  handler: async (ctx, { limite = 25 }) => {
    return await ctx.db
      .query('espejoOutbox')
      .withIndex('by_estado', (q) => q.eq('estado', 'pendiente'))
      .take(limite);
  },
});

export const _marcarEnviado = internalMutation({
  args: { id: v.id('espejoOutbox') },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      estado: 'enviado',
      enviadoEn: Date.now(),
      ultimoError: undefined,
    });
  },
});

export const _marcarError = internalMutation({
  args: { id: v.id('espejoOutbox'), error: v.string(), intentos: v.number() },
  handler: async (ctx, { id, error, intentos }) => {
    // Queda en 'pendiente' con intentos++, para que el próximo drenaje lo
    // reintente. `estado: 'error'` se reserva para lo que no tiene arreglo
    // automático, y hoy nada lo marca: preferimos reintentar.
    await ctx.db.patch(id, {
      intentos: intentos + 1,
      ultimoError: error.slice(0, 500),
    });
  },
});

/**
 * Escribe la pestaña Léeme. Se llama sola en el primer drenaje.
 *
 * Es la única defensa real contra que alguien edite la hoja creyendo que cambia
 * algo: decirlo donde se ve.
 */
export const escribirLeeme = internalAction({
  args: {},
  handler: async () => {
    const token = await obtenerAccessToken();
    const libro = espejoSpreadsheetId();
    await asegurarPestana(token, libro, 'Léeme');
    await escribirRango(
      token,
      libro,
      'Léeme!A1:A20',
      TEXTO_LEEME.map((f) => [...f]),
    );
    return { ok: true };
  },
});

/**
 * Drena la cola. Manual en dev (el plan no enciende crons: este proyecto ya
 * apagó los suyos por ancho de banda).
 */
export const drenar = internalAction({
  args: { limite: v.optional(v.number()) },
  handler: async (ctx, { limite }) => {
    const pendientes = await ctx.runQuery(internal.espejo._pendientes, {
      limite,
    });
    if (!pendientes.length) return { drenadas: 0, fallidas: 0 };

    const token = await obtenerAccessToken();
    const libro = espejoSpreadsheetId();

    let drenadas = 0;
    let fallidas = 0;

    for (const fila of pendientes) {
      try {
        const cabeceras = CABECERAS_POR_PESTANA[fila.pestana];
        if (!cabeceras) {
          throw new Error(
            `pestaña desconocida "${fila.pestana}": el espejo no sabe qué ` +
              `cabeceras escribirle.`,
          );
        }

        await asegurarPestana(token, libro, fila.pestana);

        // Se lee la cabecera real y la columna de ids: el orden lo manda la
        // hoja, y la fila se ubica por id, nunca por un contador.
        const [filaCabecera = []] = await leerRango(
          token,
          libro,
          `${fila.pestana}!1:1`,
        );
        const columnaIds = await leerRango(
          token,
          libro,
          `${fila.pestana}!A2:A`,
        );

        const plan = planificarUpsert({
          cabeceras: [...cabeceras],
          filaCabecera,
          idsExistentes: columnaIds.map((f) => f[0] ?? ''),
          idFila: fila.idFila,
          campos: fila.campos,
        });

        if (plan.necesitaCabeceras) {
          await escribirRango(token, libro, `${fila.pestana}!A1`, [
            [...cabeceras],
          ]);
        }

        const ancho = columnaA1(plan.valores.length - 1);
        const destino =
          plan.accion === 'update'
            ? `${fila.pestana}!A${plan.filaHoja}:${ancho}${plan.filaHoja}`
            : `${fila.pestana}!A${columnaIds.length + 2}:${ancho}${columnaIds.length + 2}`;

        await escribirRango(token, libro, destino, [plan.valores]);
        await ctx.runMutation(internal.espejo._marcarEnviado, { id: fila._id });
        drenadas++;
      } catch (err) {
        fallidas++;
        await ctx.runMutation(internal.espejo._marcarError, {
          id: fila._id,
          error: err instanceof Error ? err.message : String(err),
          intentos: fila.intentos,
        });
      }
    }

    return { drenadas, fallidas };
  },
});
