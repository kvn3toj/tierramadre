/**
 * Convex backend for Fotosynthia — the Fotosíntesis admin AI copilot.
 *
 * - `workspaceSnapshot` builds the compact context blob the Vercel proxy
 *   prepends to every Groq call. It's intentionally redacted: counts and
 *   recent IDs only, no PII beyond names already visible in the admin UI.
 * - `recordSummary` writes the post-stream 1-2 sentence digest so the
 *   admin can review past conversations without keeping full transcripts.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Single source of truth for everything Fotosynthia sees about the atelier.
 * Designed to fit comfortably in ~1.5k tokens. Heavier joins (lotItems,
 * productInventory by lot) are intentionally avoided — the AI can ask
 * follow-ups instead of swallowing the whole catalog.
 */
export const workspaceSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    const [lots, sales, providers, clients, invitations] = await Promise.all([
      ctx.db.query("lots").collect(),
      ctx.db.query("sales").collect(),
      ctx.db.query("providers").collect(),
      ctx.db.query("clients").collect(),
      ctx.db.query("invitations").collect(),
    ]);

    const lotsByState = lots.reduce<Record<string, number>>((acc, lot) => {
      acc[lot.estado] = (acc[lot.estado] ?? 0) + 1;
      return acc;
    }, {});

    const salesByState = sales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.estado] = (acc[sale.estado] ?? 0) + 1;
      return acc;
    }, {});

    const recentLots = [...lots]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5)
      .map((lot) => ({
        loteId: lot.loteId,
        providerId: lot.providerId,
        estado: lot.estado,
        fechaRecepcion: lot.fechaRecepcion,
        costoTotalCOP: lot.costoTotalCOP,
        unidadesDeclaradas: lot.unidadesDeclaradas,
        formaPago: lot.formaPago,
        syncStatus: lot.syncStatus,
      }));

    const recentSales = [...sales]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5)
      .map((sale) => ({
        saleId: sale.saleId,
        fechaVenta: sale.fechaVenta,
        totalCOP: sale.totalCOP,
        estado: sale.estado,
        formaPago: sale.formaPago,
        syncStatus: sale.syncStatus,
      }));

    const syncErrors = {
      lots: lots.filter((l) => l.syncStatus === "error").length,
      sales: sales.filter((s) => s.syncStatus === "error").length,
      providers: providers.filter((p) => p.syncStatus === "error").length,
      clients: clients.filter((c) => c.syncStatus === "error").length,
    };

    const ambassadors = clients.filter((c) => c.tipo === "embajador");
    const finalClients = clients.filter((c) => c.tipo === "final");

    // Ambassador → guests recall (per the mempalace-tracked invitation
    // system). Top creators by active+pending invitation count so
    // Fotosynthia can answer "¿quién está invitando más este mes?".
    const inviteCounts = new Map<
      string,
      {
        creatorEmail: string;
        creatorName: string;
        total: number;
        active: number;
      }
    >();
    for (const inv of invitations) {
      const key = inv.creatorEmail.toLowerCase();
      const entry = inviteCounts.get(key) ?? {
        creatorEmail: inv.creatorEmail,
        creatorName: inv.creatorName,
        total: 0,
        active: 0,
      };
      entry.total += 1;
      if (inv.status === "active" || inv.status === "pending") {
        entry.active += 1;
      }
      inviteCounts.set(key, entry);
    }
    const topInviters = Array.from(inviteCounts.values())
      .sort((a, b) => b.active - a.active)
      .slice(0, 5);

    return {
      generatedAt: now,
      counts: {
        lots: lots.length,
        sales: sales.length,
        providers: providers.length,
        ambassadors: ambassadors.length,
        finalClients: finalClients.length,
        invitations: invitations.length,
      },
      lotsByState,
      salesByState,
      recentLots,
      recentSales,
      syncErrors,
      ambassadorActivity: {
        active: invitations.filter(
          (i) => i.status === "active" || i.status === "pending",
        ).length,
        topInviters,
      },
    };
  },
});

/**
 * Upsert a thread summary. Called by the Vercel proxy when an SSE stream
 * closes. Idempotent on `threadId` — re-writes overwrite the previous
 * digest. Failure to write must NEVER bubble up to the user's chat.
 */
export const recordSummary = mutation({
  args: {
    threadId: v.string(),
    userEmail: v.string(),
    userName: v.optional(v.string()),
    routeAtStart: v.string(),
    routeLatest: v.string(),
    summary: v.string(),
    turnCount: v.number(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiConversations")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();

    const now = new Date().toISOString();
    const userEmail = args.userEmail.toLowerCase().trim();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userEmail,
        userName: args.userName,
        routeLatest: args.routeLatest,
        summary: args.summary,
        turnCount: args.turnCount,
        model: args.model,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("aiConversations", {
      threadId: args.threadId,
      userEmail,
      userName: args.userName,
      routeAtStart: args.routeAtStart,
      routeLatest: args.routeLatest,
      summary: args.summary,
      turnCount: args.turnCount,
      model: args.model,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * List recent threads for the current admin. Powers a future "historial"
 * surface inside the copilot drawer; safe to call now even if no UI
 * consumes it yet.
 */
export const listMyThreads = query({
  args: { userEmail: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userEmail, limit }) => {
    const rows = await ctx.db
      .query("aiConversations")
      .withIndex("by_userEmail", (q) =>
        q.eq("userEmail", userEmail.toLowerCase().trim()),
      )
      .order("desc")
      .collect();
    return rows.slice(0, limit ?? 20);
  },
});
