/**
 * Los muros: desahogo (beneficiarios, §6.9), gratitud (31-08) y aliento (aportadores,
 * §4.7 — todavía sin credencial).
 *
 * Moderación mínima **desde el día uno** (§8.3): poder ocultar. Un muro de desahogo de
 * damnificados sin manera de ocultar un mensaje es una decisión, y sería la equivocada.
 *
 * **Desahogo y gratitud son dos muros, no dos etiquetas del mismo.** La reunión del 31-08
 * los pidió con públicos distintos: el desahogo lo lee quien está pasando lo mismo
 * («ayudar a esperar organizadamente»); la gratitud la lee quien aportó — es lo único que
 * vuelve del otro lado. Mezclarlos pondría un «no tengo qué comer» debajo de un «gracias».
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeApp, exigirTokenDeOps, resolverBeneficiario } from './lib/guardas';

/** Los muros legibles hoy. `aliento` sigue afuera: el aportador no tiene credencial. */
const wall = v.union(v.literal('desahogo'), v.literal('gratitud'));

export const mensajes = query({
  args: { wall, limite: v.optional(v.number()), secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    const filas = await ctx.db
      .query('wallMessages')
      .withIndex('by_wall_and_createdAt', (q) => q.eq('wall', args.wall))
      .order('desc')
      .take(args.limite ?? 100);

    const visibles = filas.filter((m) => m.hiddenAt === undefined);
    // Consentimiento por autor, una lectura por autor distinto (D-0831-5 / §10.3).
    const consent = new Map<string, boolean>();
    for (const m of visibles) {
      if (consent.has(m.authorId)) continue;
      let ok = false;
      try {
        const autor = await ctx.db.get(m.authorId as never);
        ok = (autor as { donorVisibilityConsent?: boolean } | null)?.donorVisibilityConsent === true;
      } catch {
        ok = false;
      }
      consent.set(m.authorId, ok);
    }
    return visibles
      .map((m) => ({
        id: m._id,
        /**
         * **Solo el nombre de pila**, aunque se guarde el completo.
         *
         * El muro se lee SIN credencial —cualquiera que abra `/renacer/entorno` lo ve—,
         * así que es la superficie más expuesta de todo el flujo. Firmar un desahogo con
         * el nombre completo de una damnificada la identifica ante cualquiera, y eso no
         * lo consintió: el consentimiento del §10.3 es para que el aportador vea
         * identidades, no para publicarlas en un muro abierto.
         *
         * El carnet ya recorta igual (§ D-1). Que dos pantallas del mismo flujo
         * mostraran distinto era la inconsistencia; esta es la que manda.
         *
         * El nombre completo sigue guardado: moderar sin saber quién escribió no se puede.
         */
        authorName: consent.get(m.authorId) ? (m.authorName.trim().split(/\s+/)[0] ?? m.authorName) : null,
        body: m.body,
        createdAt: m.createdAt,
      }));
  },
});

/**
 * Publica en un muro, con la credencial del carnet.
 *
 * **El autor NO viene en el body.** Recibir `authorId`/`authorName` del cliente es dejar
 * que cualquiera escriba firmando con el nombre de otro damnificado. Sale de la
 * credencial del carnet, que es lo único que prueba quién actúa.
 *
 * Quien escribe es siempre un beneficiario — en los dos muros. Que la gratitud la escriba
 * quien RECIBIÓ es el punto: «esa gratitud la deja en la web» (reunión 31-08). El muro de
 * **aliento** (aportadores, §4.7) sigue sin servirse porque el aportador todavía no tiene
 * credencial diseñada; prefiero que falte a dejar acá un camino suplantable "por ahora".
 */
export const publicar = mutation({
  args: {
    secret: v.string(),
    wall,
    cardNumber: v.number(),
    cardToken: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    const yo = await resolverBeneficiario(ctx, args.cardNumber, args.cardToken);

    const body = args.body.trim();
    if (body.length === 0) throw new Error('Un mensaje vacío no se publica.');
    if (body.length > 2000) throw new Error('El mensaje excede 2000 caracteres.');

    return ctx.db.insert('wallMessages', {
      wall: args.wall,
      authorId: yo._id,
      authorName: yo.name,
      body,
      createdAt: Date.now(),
    });
  },
});

/**
 * Alias del camino viejo. `api/renacer-muro.ts` lo llamaba por nombre y las raíces ya
 * desplegadas también; se mantiene para no romper un cliente en vuelo.
 */
export const publicarDesahogo = mutation({
  args: {
    secret: v.string(),
    cardNumber: v.number(),
    cardToken: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    const yo = await resolverBeneficiario(ctx, args.cardNumber, args.cardToken);
    const body = args.body.trim();
    if (body.length === 0) throw new Error('Un mensaje vacío no se publica.');
    if (body.length > 2000) throw new Error('El mensaje excede 2000 caracteres.');
    return ctx.db.insert('wallMessages', {
      wall: 'desahogo',
      authorId: yo._id,
      authorName: yo.name,
      body,
      createdAt: Date.now(),
    });
  },
});

/**
 * El botón público "Reportar" (consola 01-09): cualquiera con la página abierta puede
 * señalar un mensaje; NO lo oculta — lo pone en la bandeja de anomalías para que una
 * persona decida. Token de app (superficie pública), sin credencial: reportar no exige
 * carnet, y el rate limit del endpoint acota el abuso.
 */
export const reportar = mutation({
  args: { id: v.id('wallMessages'), secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    const m = await ctx.db.get(args.id);
    // Silencio deliberado sobre inexistentes u ocultos: no confirmarle nada a quien tantea ids.
    if (!m || m.hiddenAt) return { ok: true };
    await ctx.db.patch(args.id, { reportedAt: Date.now(), reportCount: (m.reportCount ?? 0) + 1 });
    return { ok: true };
  },
});

export const ocultar = mutation({
  args: { id: v.id('wallMessages'), secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    await ctx.db.patch(args.id, { hiddenAt: Date.now() });
  },
});
