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
import {
  CABECERAS_CASILLAS,
  CABECERAS_LOTES,
  CABECERAS_MOVIMIENTOS,
  filaCasillaParaEspejo,
  filaLoteParaEspejo,
} from './_lib/espejoFilas';
import { detectarDeriva } from './_lib/derivaEspejo';
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
  Movimientos: CABECERAS_MOVIMIENTOS,
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
 * Compara el espejo contra Convex y REPORTA lo que se editó a mano.
 *
 * No corrige nada. Absorber la edición reintroduciría el pull —con su
 * incapacidad de distinguir «alguien lo puso a propósito» de «nunca se
 * escribió», el incidente de `mostrarEnCatalogo` que casi saca 285 piezas de la
 * vitrina—, y pisarla en silencio le haría perder el trabajo a quien la hizo.
 * Reportar deja la decisión donde debe estar: en un humano.
 *
 * Manual en dev, como pide el plan.
 */
export const reportarDeriva = internalAction({
  args: { pestana: v.string() },
  handler: async (ctx, { pestana }) => {
    const cabeceras = CABECERAS_POR_PESTANA[pestana];
    if (!cabeceras) throw new Error(`pestaña desconocida "${pestana}".`);

    const token = await obtenerAccessToken();
    const libro = espejoSpreadsheetId();

    const filas = await leerRango(token, libro, `${pestana}!A1:ZZ`);
    const [cabeceraHoja = [], ...cuerpo] = filas;
    const filasEspejo = cuerpo.map((fila) =>
      Object.fromEntries(cabeceraHoja.map((c, i) => [c, fila[i] ?? ''])),
    );

    const filasConvex: Record<string, string>[] = await ctx.runQuery(
      internal.espejo._filasEsperadas,
      { pestana },
    );

    return detectarDeriva({
      cabeceras: [...cabeceras],
      idCabecera: cabeceras[0],
      filasEspejo,
      filasConvex,
    });
  },
});

/**
 * Lo que el espejo DEBERÍA tener hoy, reconstruido desde Convex. Se usa solo
 * para comparar: no se escribe.
 */
export const _filasEsperadas = internalQuery({
  args: { pestana: v.string() },
  handler: async (ctx, { pestana }) => {
    if (pestana === 'Lotes') {
      const lotes = await ctx.db.query('lots').collect();
      const porId = new Map(
        (await ctx.db.query('providers').collect()).map((p) => [
          p._id,
          p.nombreORazonSocial,
        ]),
      );
      return lotes
        .filter((l) => l.origenModelo === 'v4')
        .map((l) =>
          filaLoteParaEspejo({
            loteId: l.loteId,
            fechaRecepcion: l.fechaRecepcion,
            proveedor: porId.get(l.providerId) ?? '',
            categoriaFiscal: l.categoriaFiscal ?? '',
            costoCompraCOP: l.costoCompraCOP ?? l.costoTotalCOP,
            costosVariablesCOP: (l.costosVariables ?? []).reduce(
              (a, c) => a + c.montoCOP,
              0,
            ),
            costoTotalCOP: l.costoTotalCOP,
            unidadesDeclaradas: l.unidadesDeclaradas,
            abonoCOP: l.abonoCOP ?? 0,
            saldoCOP: l.saldoCOP ?? 0,
            formaPago: l.formaPago,
            estado: l.estado,
            sede: l.sede,
            renombreLote: l.renombreLote,
          }),
        );
    }

    if (pestana === 'Casillas') {
      const casillas = await ctx.db.query('lotItems').collect();
      return casillas
        .filter((c) => c.estadoCasilla)
        .map((c) => filaCasillaParaEspejo(c as never));
    }

    return [];
  },
});

/**
 * El rescate: drena lo que el camino por evento no logró.
 *
 * El modelo es HÍBRIDO. El drenaje normal se agenda con `runAfter(0)` apenas se
 * encola, así que el costo es proporcional a los eventos reales —decenas al día,
 * no el barrido de 513 filas que apagó los crons de v3—. Este cron es el
 * segundo piso: recoge lo que quedó atascado porque Sheets estaba caído, el
 * token venció, o la acción agendada murió.
 *
 * Apagado por defecto (`ESPEJO_CRON`), el mismo idioma que `INVENTORY_PULL_CRON`
 * y `FOTO_RECONCILE_CRON`. Encenderlo en prod es una decisión con medición
 * detrás, no un default.
 */
export const rescatar = internalAction({
  args: {},
  handler: async (ctx): Promise<{ drenadas: number; fallidas: number }> => {
    if (process.env.ESPEJO_CRON !== 'on') {
      return { drenadas: 0, fallidas: 0 };
    }
    return await ctx.runAction(internal.espejo.drenar, { limite: 50 });
  },
});

/**
 * Drena la cola.
 *
 * Se agenda sola con `runAfter(0)` desde cada mutación que encola, y el cron de
 * rescate la vuelve a llamar cada 30 minutos para lo que haya quedado atascado.
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
