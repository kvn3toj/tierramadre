/**
 * El registro del beneficiario: una sola transacción que crea la persona, sus
 * necesidades y sus capacidades, y mueve el contador del kit.
 *
 * Es una sola mutation a propósito. Si el beneficiario quedara creado y las necesidades
 * fallaran, tendríamos una persona registrada sin turno — que en el §9 es peor que no
 * estar registrado, porque parece atendida y no lo está.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeApp } from './lib/guardas';

/**
 * Token opaco del carnet (D-1). 122 bits de entropía: adivinarlo no es un camino.
 * Convex permite aleatoriedad en mutations — la siembra por reintento la maneja el runtime.
 */
function nuevoCardToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
}

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
    kitCode: v.number(),
    name: v.string(),
    email: v.optional(v.string()),
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
    /** El camino asistido (D-2) no pasa por Google y deja registrado quién asistió. */
    assistedBy: v.optional(v.string()),
    needs: v.array(v.object({ whatINeed: v.string(), whyItMatters: v.string() })),
    capacities: v.optional(
      v.array(v.object({ title: v.string(), description: v.string() })),
    ),
  },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    // §10.1: sin habeas data no hay registro. Se recoge EN PRESENCIA, antes de lo digital.
    if (!args.habeasData) {
      throw new Error(
        'No se puede registrar sin consentimiento de habeas data (§10.1). ' +
          'Se recoge en presencia, guiado por el facilitador, antes del registro digital.',
      );
    }

    // El §6 fija el orden: necesidades PRIMERO. Un registro sin ninguna necesidad no es
    // un registro incompleto, es una persona sin turno en el §9.
    if (args.needs.length === 0) {
      throw new Error('Un registro sin necesidades no toma turno (§9). Al menos una.');
    }

    const kit = await ctx.db
      .query('kits')
      .withIndex('by_code', (q) => q.eq('code', args.kitCode))
      .unique();

    if (!kit) throw new Error(`El código ${args.kitCode} no existe.`);

    const ahora = Date.now();
    const cardToken = nuevoCardToken();
    const cardNumber = await siguienteDeSecuencia(ctx, 'cardNumber', 111);

    const beneficiaryId = await ctx.db.insert('beneficiaries', {
      name: args.name,
      email: args.email,
      googleId: args.googleId,
      ubicacion: args.ubicacion,
      edad: args.edad,
      genero: args.genero,
      kitCode: args.kitCode,
      cardNumber,
      cardToken,
      habeasDataAcceptedAt: ahora,
      donorVisibilityConsent: args.donorVisibilityConsent,
      imageConsent: args.imageConsent,
      assistedBy: args.assistedBy,
    });

    /**
     * Cada necesidad lleva su propio `createdAt` — EL TURNO (§9).
     *
     * `Date.now()` es constante durante toda una mutation de Convex (es determinista a
     * propósito), así que sin el offset las tres necesidades de una misma persona
     * quedarían empatadas y el desempate lo rompería el orden interno de la base.
     * El offset por índice conserva **el orden en que la persona las escribió**, que es
     * información real: no inventa un dato, preserva uno que si no se pierde.
     */
    for (const [i, necesidad] of args.needs.entries()) {
      await ctx.db.insert('needs', {
        reporterId: beneficiaryId,
        whatINeed: necesidad.whatINeed,
        whyItMatters: necesidad.whyItMatters,
        status: 'open',
        createdAt: ahora + i,
        supportCount: 0,
      });
    }

    for (const capacidad of args.capacities ?? []) {
      await ctx.db.insert('capacities', {
        providerId: beneficiaryId,
        title: capacidad.title,
        description: capacidad.description,
        isActive: true,
      });
    }

    /**
     * El contador del aportador (§4.9). **No se topea en `manillasTotal` a propósito:**
     * pasarse es exactamente la señal de fraude que el §3.4 dijo vigilar — el código es
     * adivinable y un tercero puede inscribirse contra el kit de otro. Taparlo con un
     * `Math.min` escondería el único indicador que tenemos. Se revisa al cierre de la
     * primera visita de campo.
     */
    await ctx.db.patch(kit._id, {
      manillasRegistradas: kit.manillasRegistradas + 1,
    });

    // El token se devuelve UNA sola vez: es la credencial con la que esta persona
    // después se suma a una necesidad, escribe en el muro y abre su carnet. El cliente
    // lo guarda; el servidor no lo vuelve a mostrar.
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
    if (!persona || persona.cardToken !== args.token) return null;

    return {
      cardNumber: persona.cardNumber,
      primerNombre: persona.name.trim().split(/\s+/)[0] ?? persona.name,
      kitCode: persona.kitCode,
    };
  },
});
