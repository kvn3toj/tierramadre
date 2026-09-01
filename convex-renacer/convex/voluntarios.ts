/**
 * Voluntarios: quien entra por "Quiero ayudar → Enlistar mis capacidades" (31-08).
 *
 * No es un beneficiario ni un comprador: es alguien que ofrece lo que sabe hacer. Queda
 * como base de datos para que operaciones cruce capacidades con necesidades — y, más
 * adelante, como lista de invitación a CoomÜnity (§8.4).
 */

import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeApp } from './lib/guardas';
import { sumarStat } from './stats';

export const registrarVoluntario = mutation({
  args: {
    secret: v.string(),
    nombre: v.string(),
    contacto: v.string(),
    procedencia: v.optional(v.string()),
    motivo: v.optional(v.string()),
    habeasData: v.boolean(),
    capacities: v.array(
      v.object({ title: v.string(), description: v.string(), category: v.optional(v.string()) }),
    ),
  },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    if (!args.habeasData) {
      throw new Error('No se puede registrar sin consentimiento de habeas data.');
    }
    if (args.capacities.length === 0) {
      throw new Error('Enlistá al menos una capacidad.');
    }

    const ahora = Date.now();
    const voluntarioId = await ctx.db.insert('voluntarios', {
      nombre: args.nombre,
      contacto: args.contacto,
      procedencia: args.procedencia,
      motivo: args.motivo,
      habeasDataAcceptedAt: ahora,
      createdAt: ahora,
    });

    for (const c of args.capacities) {
      await ctx.db.insert('capacities', {
        providerId: voluntarioId,
        origen: 'voluntario',
        title: c.title,
        description: c.description,
        category: c.category,
        isActive: true,
      });
    }

    await sumarStat(ctx, 'voluntarios', 1);
    return { voluntarioId };
  },
});
