/**
 * Convex backend for Fotosynthia — the Fotosíntesis admin AI copilot.
 *
 * - `workspaceSnapshot` builds the compact context blob the Vercel proxy
 *   prepends to every Groq call. It's intentionally redacted: counts and
 *   recent IDs only, no PII beyond names already visible in the admin UI.
 * - `recordSummary` writes the post-stream 1-2 sentence digest so the
 *   admin can review past conversations without keeping full transcripts.
 */

import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { ITEM_SCAN_CAP } from './_lib/aiCaps';
import { isStaffSession } from './_lib/requireStaffSession';

/**
 * Single source of truth for everything Fotosynthia sees about the atelier.
 * Designed to fit comfortably in ~1.5k tokens. Heavier joins (lotItems,
 * productInventory by lot) are intentionally avoided — the AI can ask
 * follow-ups instead of swallowing the whole catalog.
 */
// BANDWIDTH CAP for the invitations read. See the note below the query for
// the full rationale — in short, this query is a *reactive* subscription
// (CopilotPanel's `useQuery`) that re-executes on every write to any table it
// reads, for as long as the copilot tab is open. `invitations` is the only
// unbounded table here (one row per guest invite, never pruned — see
// convex/invitations.ts), so an unguarded `.collect()` would make the snapshot
// re-read the entire, ever-growing invitation log on each re-execution. We cap
// the read at the most-recent INVITATION_SCAN_CAP rows so reactive bandwidth
// stays bounded regardless of table size.
const INVITATION_SCAN_CAP = 2000;

// Capped catalog read so Fotosynthia's guided mode can resolve an itemHint
// ("la esmeralda de Chivor") to a real itemId + loteId for edits/batch-edits,
// without an unbounded reactive read. Most-recent ITEM_SCAN_CAP items only;
// guided edits beyond this fall back to editing from the lot page directly.
// The cap lives in ./_lib/aiCaps so the client (CopilotPanel) shares the exact
// same value — see that file for the drift rationale.

export const workspaceSnapshot = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const now = new Date().toISOString();

    if (!(await isStaffSession(sessionToken))) {
      return {
        generatedAt: now,
        counts: {
          lots: 0,
          sales: 0,
          providers: 0,
          ambassadors: 0,
          finalClients: 0,
          invitations: 0,
        },
        lotsByState: {},
        salesByState: {},
        recentLots: [],
        recentSales: [],
        syncErrors: { lots: 0, sales: 0, providers: 0, clients: 0 },
        ambassadorActivity: { active: 0, topInviters: [] },
        candidateItems: [],
      };
    }

    // lots / sales / providers / clients are bounded domain tables (the
    // atelier's compras/ventas/proveedores/clientes ledgers). Each one feeds an
    // EXACT figure in the output — a total count, a count-by-state breakdown,
    // and/or a syncStatus error tally — none of which Convex can derive without
    // reading the rows, so these stay `.collect()`. Trimming them would change
    // the snapshot the AI sees.
    //
    // invitations is the unbounded outlier. We read it most-recent-first
    // (default `.order("desc")` is by _creationTime) and cap at
    // INVITATION_SCAN_CAP rows so a growing invitation log can't blow up
    // reactive bandwidth. TRADEOFF: once more than INVITATION_SCAN_CAP
    // invitations exist, `counts.invitations`, `ambassadorActivity.active` and
    // `topInviters` are computed over the most recent INVITATION_SCAN_CAP only.
    // Output SHAPE is identical; figures saturate at the cap (which is far above
    // any realistic invite volume) instead of growing the read without bound.
    const [lots, sales, providers, clients, invitations, recentItems] =
      await Promise.all([
        ctx.db.query('lots').collect(),
        ctx.db.query('sales').collect(),
        ctx.db.query('providers').collect(),
        ctx.db.query('clients').collect(),
        ctx.db.query('invitations').order('desc').take(INVITATION_SCAN_CAP),
        ctx.db.query('productInventory').order('desc').take(ITEM_SCAN_CAP),
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
      lots: lots.filter((l) => l.syncStatus === 'error').length,
      sales: sales.filter((s) => s.syncStatus === 'error').length,
      providers: providers.filter((p) => p.syncStatus === 'error').length,
      clients: clients.filter((c) => c.syncStatus === 'error').length,
    };

    const ambassadors = clients.filter((c) => c.tipo === 'embajador');
    const finalClients = clients.filter((c) => c.tipo === 'final');

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
      if (inv.status === 'active' || inv.status === 'pending') {
        entry.active += 1;
      }
      inviteCounts.set(key, entry);
    }
    const topInviters = Array.from(inviteCounts.values())
      .sort((a, b) => b.active - a.active)
      .slice(0, 5);

    // Lightweight item index for guided edit/batch itemHint→id resolution.
    // `estado` rides along so the assistant knows availability (e.g. "Vendido")
    // without a second lookup; price stays out (sourced from Sheets server-side).
    const candidateItems = recentItems
      .filter((it) => !!it.loteId)
      .map((it) => ({
        itemId: it.itemId,
        nombre: it.nombre ?? '',
        loteId: it.loteId,
        ...(it.estado ? { estado: it.estado } : {}),
      }));

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
          (i) => i.status === 'active' || i.status === 'pending',
        ).length,
        topInviters,
      },
      candidateItems,
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
      .query('aiConversations')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
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

    return ctx.db.insert('aiConversations', {
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
  args: {
    userEmail: v.string(),
    limit: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { userEmail, limit, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
    const rows = await ctx.db
      .query('aiConversations')
      .withIndex('by_userEmail', (q) =>
        q.eq('userEmail', userEmail.toLowerCase().trim()),
      )
      .order('desc')
      .collect();
    return rows.slice(0, limit ?? 20);
  },
});
