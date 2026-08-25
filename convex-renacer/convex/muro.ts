/**
 * Los dos muros: desahogo (beneficiarios, §6.9) y aliento (aportadores, §4.7).
 *
 * Moderación mínima **desde el día uno** (§8.3): poder ocultar. Un muro de desahogo de
 * damnificados sin manera de ocultar un mensaje es una decisión, y sería la equivocada.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const wall = v.union(v.literal('desahogo'), v.literal('aliento'));

export const mensajes = query({
  args: { wall, limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
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

export const publicar = mutation({
  args: { wall, authorId: v.string(), authorName: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const body = args.body.trim();
    if (body.length === 0) throw new Error('Un mensaje vacío no se publica.');
    if (body.length > 2000) throw new Error('El mensaje excede 2000 caracteres.');

    return ctx.db.insert('wallMessages', {
      wall: args.wall,
      authorId: args.authorId,
      authorName: args.authorName,
      body,
      createdAt: Date.now(),
    });
  },
});

export const ocultar = mutation({
  args: { id: v.id('wallMessages') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { hiddenAt: Date.now() });
  },
});
