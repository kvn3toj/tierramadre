/**
 * El registro del beneficiario: una sola transacción que crea la persona, sus
 * necesidades y sus capacidades, y mueve el contador de la raíz (o del kit legado).
 *
 * Es una sola mutation a propósito. Si el beneficiario quedara creado y las necesidades
 * fallaran, tendríamos una persona registrada sin turno — que en el §9 es peor que no
 * estar registrado, porque parece atendida y no lo está.
 *
 * **Pivote 31-08:** el código viene de una raíz (líder que invita), no de un kit. Un
 * código se usa UNA vez: es de una persona, se lo dio quien la invitó. Los códigos de
 * kit ya emitidos siguen resolviendo por el camino legado.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeApp, nuevoTokenOpaco } from './lib/guardas';
import { normalizarBolsa } from './lib/bolsas';
import { esCodigoDeRaiz } from './lib/codigos';
import { raizDeCodigo } from './raices';
import { sumarStat } from './stats';

/** Token opaco del carnet (D-1). El mismo generador que usa el panel de la raíz. */
const nuevoCardToken = nuevoTokenOpaco;

async function siguienteDeSecuencia(
  ctx: { db: any },
  name: string,
  inicial: number,
): Promise<number> {
  const fila = await ctx.db
    .query('sequences')
    .withIndex('by_name', (q: any) => q.eq('name', name))
    .unique();

  if (!fila) {
    await ctx.db.insert('sequences', { name, value: inicial });
    return inicial;
  }
  const siguiente = fila.value + 1;
  await ctx.db.patch(fila._id, { value: siguiente });
  return siguiente;
}

export const registrarBeneficiario = mutation({
  args: {
    secret: v.string(),
    codigo: v.number(),
    name: v.string(),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    googleId: v.optional(v.string()),
    ubicacion: v.string(),
    edad: v.number(),
    genero: v.string(),
    /**
     * Los tres consentimientos son OBLIGATORIOS como argumento, no opcionales.
     * Fail-closed no es "si viene undefined asumimos false" — es no dejar que exista
     * el undefined. El form manda `false` explícito cuando la casilla está desmarcada.
     */
    habeasData: v.boolean(),
    donorVisibilityConsent: v.boolean(),
    imageConsent: v.boolean(),
    assistedBy: v.optional(v.string()),
    /** Idempotencia: mismo token en cada reintento del MISMO envío (ver schema). */
    clientToken: v.optional(v.string()),
    needs: v.array(
      v.object({
        whatINeed: v.string(),
        whyItMatters: v.string(),
        categoria: v.optional(v.string()),
      }),
    ),
    capacities: v.optional(
      v.array(v.object({ title: v.string(), description: v.string() })),
    ),
  },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    if (!args.habeasData) {
      throw new Error(
        'No se puede registrar sin consentimiento de habeas data (§10.1). ' +
          'Se recoge en presencia, guiado por el facilitador, antes del registro digital.',
      );
    }
    if (args.needs.length === 0) {
      throw new Error('Un registro sin necesidades no toma turno (§9). Al menos una.');
    }

    // ── Replay: si este envío YA se confirmó y la respuesta se perdió, devolver la
    // credencial existente en vez de quemar el "código ya usado" contra la misma persona.
    if (args.clientToken) {
      const previo = await ctx.db
        .query('beneficiaries')
        .withIndex('by_clientToken', (q) => q.eq('clientToken', args.clientToken))
        .first();
      if (previo) {
        return { cardNumber: previo.cardNumber, cardToken: previo.cardToken, beneficiaryId: previo._id };
      }
    }

    // ── Resolver el código: raíz primero, kit legado después ──────────────────
    const raiz = await raizDeCodigo(ctx, args.codigo);
    let kit: { _id: any; manillasRegistradas: number } | null = null;

    if (raiz) {
      if (esCodigoDeRaiz(raiz, args.codigo)) {
        throw new Error('Ese es el código de quien invita, no el tuyo. Pedile el tuyo.');
      }
      if (raiz.estado !== 'activa') {
        throw new Error('Ese código pertenece a una invitación que ya no está activa.');
      }
      const usado = await ctx.db
        .query('beneficiaries')
        .withIndex('by_codigo', (q) => q.eq('codigo', args.codigo))
        .first();
      if (usado) {
        // Un código, una persona. El segundo uso no se acumula en silencio: se rechaza,
        // y quien lo intentó tiene que volver a quien lo invitó.
        throw new Error('Ese código ya fue usado. Pedile uno nuevo a quien te invitó.');
      }
    } else {
      kit = await ctx.db
        .query('kits')
        .withIndex('by_code', (q) => q.eq('code', args.codigo))
        .unique();
      if (!kit) throw new Error(`El código ${args.codigo} no existe.`);
    }

    const ahora = Date.now();
    const cardToken = nuevoCardToken();
    const cardNumber = await siguienteDeSecuencia(ctx, 'cardNumber', 111);

    const beneficiaryId = await ctx.db.insert('beneficiaries', {
      name: args.name,
      email: args.email,
      telefono: args.telefono,
      googleId: args.googleId,
      ubicacion: args.ubicacion,
      edad: args.edad,
      genero: args.genero,
      codigo: args.codigo,
      raizId: raiz?._id,
      kitCode: kit ? args.codigo : undefined,
      cardNumber,
      cardToken,
      habeasDataAcceptedAt: ahora,
      donorVisibilityConsent: args.donorVisibilityConsent,
      imageConsent: args.imageConsent,
      assistedBy: args.assistedBy,
      clientToken: args.clientToken,
    });

    /**
     * Cada necesidad lleva su propio `createdAt` — EL TURNO (§9). `Date.now()` es
     * constante durante una mutation, así que el offset por índice conserva el orden
     * en que la persona las escribió. Ese mismo índice es la **prioridad** (31-08):
     * "escribí en orden de prioridad" — el dato se guarda tal cual lo dio.
     */
    for (const [i, necesidad] of args.needs.entries()) {
      await ctx.db.insert('needs', {
        reporterId: beneficiaryId,
        whatINeed: necesidad.whatINeed,
        whyItMatters: necesidad.whyItMatters,
        categoria: normalizarBolsa(necesidad.categoria) ?? undefined,
        prioridad: i + 1,
        status: 'open',
        createdAt: ahora + i,
        supportCount: 0,
      });
    }

    for (const capacidad of args.capacities ?? []) {
      await ctx.db.insert('capacities', {
        providerId: beneficiaryId,
        origen: 'beneficiario',
        title: capacidad.title,
        description: capacidad.description,
        isActive: true,
      });
    }

    await sumarStat(ctx, 'familias', 1);
    await sumarStat(ctx, 'necesidadesAbiertas', args.needs.length);

    if (raiz) {
      await ctx.db.patch(raiz._id, { registrados: raiz.registrados + 1 });
    } else if (kit) {
      // Legado: no se topea a propósito — pasarse era la señal de fraude del diseño viejo.
      await ctx.db.patch(kit._id, { manillasRegistradas: kit.manillasRegistradas + 1 });
    }

    // El token se devuelve UNA sola vez. El cliente lo guarda; el servidor no lo repite.
    return { cardNumber, cardToken, beneficiaryId };
  },
});

/**
 * El carnet. **Exige el token** (D-1): sin él, un número secuencial adivinable expondría
 * el nombre y la ubicación de un damnificado a cualquiera que teclee `112`.
 *
 * Devuelve lo que una entrega necesita para verificar "¿dónde y a quién?" — y la
 * ubicación NO está en esa lista: quien entrega ya está ahí.
 */
export const carnet = query({
  args: { cardNumber: v.number(), token: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    const persona = await ctx.db
      .query('beneficiaries')
      .withIndex('by_cardNumber', (q) => q.eq('cardNumber', args.cardNumber))
      .unique();

    // Misma respuesta para "no existe" y "token equivocado": distinguirlas le confirmaría
    // a quien tantea cuáles números están tomados.
    if (!persona || !igualEnTiempoConstante(persona.cardToken, args.token)) return null;

    const raiz = persona.raizId ? await ctx.db.get(persona.raizId) : null;

    // El carnet como página de estado (consola 01-09): la persona ve sus pedidos y en qué
    // van — pendiente / en camino / entregada — sin que nadie tenga que llamarla.
    const necesidades = await ctx.db
      .query('needs')
      .withIndex('by_reporter', (q) => q.eq('reporterId', persona._id))
      .take(20);

    return {
      cardNumber: persona.cardNumber,
      primerNombre: persona.name.trim().split(/\s+/)[0] ?? persona.name,
      codigo: persona.codigo ?? persona.kitCode ?? null,
      raiz: raiz ? { nombre: raiz.nombre, comunidad: raiz.comunidad } : null,
      necesidades: necesidades.map((n) => ({
        whatINeed: n.whatINeed,
        estado: n.status === 'resolved' ? 'entregada' : (n.estadoEntrega ?? 'pendiente'),
        resolvedAt: n.resolvedAt ?? null,
      })),
    };
  },
});

function igualEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
