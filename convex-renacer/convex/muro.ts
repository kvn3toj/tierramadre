/**
 * Los dos muros: desahogo (beneficiarios, §6.9) y aliento (aportadores, §4.7).
 *
 * Moderación mínima **desde el día uno** (§8.3): poder ocultar. Un muro de desahogo de
 * damnificados sin manera de ocultar un mensaje es una decisión, y sería la equivocada.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeApp, exigirTokenDeOps, resolverBeneficiario } from './lib/guardas';

const wall = v.union(v.literal('desahogo'), v.literal('aliento'));

export const mensajes = query({
  args: { wall, limite: v.optional(v.number()), secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    const filas = await ctx.db
      .query('wallMessages')
      .withIndex('by_wall_and_createdAt', (q) => q.eq('wall', args.wall))
      .order('desc')
      .take(args.limite ?? 100);

    return filas
      .filter((m) => m.hiddenAt === undefined)
      .map((m) => ({
        id: m._id,
        authorName: m.authorName,
        body: m.body,
        createdAt: m.createdAt,
      }));
  },
});

/**
 * Publica en el muro de desahogo.
 *
 * **El autor NO viene en el body.** Recibir `authorId`/`authorName` del cliente es dejar
 * que cualquiera escriba en el muro de desahogo firmando con el nombre de otro
 * damnificado. Sale de la credencial del carnet.
 *
 * El muro de **aliento** (aportadores, §4.7) todavía no se sirve: el aportador no tiene
 * credencial diseñada —eso es el Task 14—. Prefiero que falle a dejar acá un camino
 * suplantable "por ahora".
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

export const ocultar = mutation({
  args: { id: v.id('wallMessages'), secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    await ctx.db.patch(args.id, { hiddenAt: Date.now() });
  },
});
