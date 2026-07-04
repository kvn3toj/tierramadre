/**
 * Sheet → Convex sync engine for the Fotosíntesis SOT (all 6 tabs).
 *
 * Two modes, one shared per-table upsert:
 *   - DELTA ("only changed cells"): the bound Apps Script flushes the rows +
 *     columns it recorded on edit; `runDelta` reads ONLY those rows (one
 *     batchGet/tab via /api/get-table-rows) and patches ONLY the changed
 *     writable fields.
 *   - FULL (fallback "Sincronizar todo (completo)"): reads whole tabs via
 *     /api/get-table (+ /api/get-inventory-rows) and reconciles every row.
 *
 * Bandwidth: the upsert mirrors products.ts `_upsertManyFromSheet` — pre-collect
 * existing docs is avoided by indexed by-key lookups (the dirty set is small in
 * delta mode), diff-skip drops unchanged fields, and the pending/error guard
 * (planRowPatch) never clobbers an in-flight admin edit.
 *
 * Cross-table side effects fire ONLY when their field is in the delta and are
 * executed by the ACTION (mutations can't call mutations) by reusing the
 * existing, defensive `sales.cancel` / `lots.update` mutations.
 */

import { internalAction, internalMutation } from "./_generated/server";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { requireAppUrl } from "./_lib/sheetSync";
import {
  FOTO_SYNC_TABLES,
  WRITABLE,
  coerceCell,
  planRowPatch,
  type FotoSyncTable,
} from "./_lib/sheetPullMaps";
import { setInventoryLastPull } from "./products";
import { withPublishStamp } from "./_lib/publishState";

// ─── per-table metadata ──────────────────────────────────────────────────────

/** The sheet column key whose value is the natural key / column A. */
const KEY_COLUMN: Record<FotoSyncTable, string> = {
  inventory: "item",
  providers: "nombreORazonSocial",
  lots: "loteId",
  clients: "nombre",
  sales: "saleId",
  subLotes: "subLoteId",
};

function isFotoSyncTable(x: string): x is FotoSyncTable {
  return (FOTO_SYNC_TABLES as string[]).includes(x);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function findByKey(ctx: MutationCtx, table: FotoSyncTable, key: string) {
  switch (table) {
    case "inventory":
      return ctx.db
        .query("productInventory")
        .withIndex("by_itemId", (q) => q.eq("itemId", key))
        .first();
    case "providers":
      return ctx.db
        .query("providers")
        .withIndex("by_nombre", (q) => q.eq("nombreORazonSocial", key))
        .first();
    case "lots":
      return ctx.db
        .query("lots")
        .withIndex("by_loteId", (q) => q.eq("loteId", key))
        .first();
    case "clients":
      return ctx.db
        .query("clients")
        .withIndex("by_nombre", (q) => q.eq("nombre", key))
        .first();
    case "sales":
      return ctx.db
        .query("sales")
        .withIndex("by_saleId", (q) => q.eq("saleId", key))
        .first();
    case "subLotes":
      return ctx.db
        .query("subLotes")
        .withIndex("by_subLoteId", (q) => q.eq("subLoteId", key))
        .first();
  }
}

/** Patch any sync table — the phantom Id type is irrelevant at runtime; the
 *  schema validates the payload, and planRowPatch only ever emits valid keys. */
async function patchDoc(
  ctx: MutationCtx,
  id: Id<"productInventory">,
  payload: Record<string, unknown>,
) {
  await ctx.db.patch(id, payload as Partial<Doc<"productInventory">>);
}

function pickStr(cells: Record<string, string>, k: string): string | undefined {
  const raw = cells[k];
  if (raw === undefined) return undefined;
  const t = String(raw).trim();
  return t.length ? t : undefined;
}

// ─── the shared per-table upsert (delta + full) ──────────────────────────────

type SyncRow = {
  key: string;
  rowIndex: number;
  colA: string;
  cells: Record<string, string>;
};

export const upsertTable = internalMutation({
  args: {
    table: v.string(),
    rows: v.array(
      v.object({
        key: v.string(),
        rowIndex: v.number(),
        colA: v.string(),
        cells: v.record(v.string(), v.string()),
      }),
    ),
    /** FULL mode only — allow inserting brand-new providers/clients rows. */
    allowInsert: v.optional(v.boolean()),
  },
  handler: async (ctx, { table, rows, allowInsert }) => {
    if (!isFotoSyncTable(table)) {
      throw new Error(`Unknown sync table "${table}"`);
    }
    const t: FotoSyncTable = table;
    const now = new Date().toISOString();

    let patched = 0;
    let protectedCount = 0;
    let skipped = 0;
    let flaggedCount = 0;
    let inserted = 0;
    const sideEffects: Array<{
      type: "cancelSale" | "refanLot";
      id: string;
      value?: number;
    }> = [];
    const reviewFlags: Array<{ key: string; reason: string }> = [];

    for (const row of rows as SyncRow[]) {
      const existing = await findByKey(ctx, t, row.key);

      if (!existing) {
        if (allowInsert && (t === "providers" || t === "clients")) {
          if (t === "providers") {
            await ctx.db.insert("providers", {
              nombreORazonSocial: row.key,
              tipo: pickStr(row.cells, "tipo") ?? "otros",
              nit: pickStr(row.cells, "nit"),
              cedula: pickStr(row.cells, "cedula"),
              direccion: pickStr(row.cells, "direccion"),
              telefono: pickStr(row.cells, "telefono"),
              email: pickStr(row.cells, "email"),
              notas: pickStr(row.cells, "notas"),
              rowIndex: row.rowIndex,
              lastPulledAt: now,
              syncStatus: "synced",
            });
          } else {
            await ctx.db.insert("clients", {
              nombre: row.key,
              tipo: pickStr(row.cells, "tipo") ?? "final",
              nit: pickStr(row.cells, "nit"),
              cedula: pickStr(row.cells, "cedula"),
              direccion: pickStr(row.cells, "direccion"),
              telefono: pickStr(row.cells, "telefono"),
              email: pickStr(row.cells, "email"),
              asesorId: pickStr(row.cells, "asesorId"),
              rowIndex: row.rowIndex,
              lastPulledAt: now,
              syncStatus: "synced",
            });
          }
          inserted++;
          continue;
        }
        skipped++;
        reviewFlags.push({
          key: row.key,
          reason: "fila nueva en la hoja — créala desde la app",
        });
        continue;
      }

      // Row moved / column A overwritten by a different key between edit and
      // flush — don't misroute the patch.
      if (row.colA && row.colA !== row.key) {
        skipped++;
        reviewFlags.push({
          key: row.key,
          reason: `la columna A ahora dice "${row.colA}" — revisar en la app`,
        });
        continue;
      }

      const plan = planRowPatch(
        t,
        existing as Record<string, unknown> & {
          syncStatus: "synced" | "pending" | "error";
        },
        row.cells,
      );

      if (plan.action === "protected") {
        await patchDoc(ctx, existing._id as Id<"productInventory">, {
          rowIndex: row.rowIndex,
          lastPulledAt: now,
        });
        protectedCount++;
        continue;
      }

      if (plan.action === "skip") {
        if (existing.rowIndex !== row.rowIndex) {
          await patchDoc(ctx, existing._id as Id<"productInventory">, {
            rowIndex: row.rowIndex,
            lastPulledAt: now,
          });
        }
        skipped++;
        continue;
      }

      const patch: Record<string, unknown> = { ...plan.patch };
      if (t === "inventory" && patch.mostrarEnCatalogo === true) {
        const stamp = withPublishStamp(
          existing as { mostrarEnCatalogo?: boolean; publishedAt?: number },
          true,
        );
        if (stamp.publishedAt !== undefined) patch.publishedAt = stamp.publishedAt;
      }
      await patchDoc(ctx, existing._id as Id<"productInventory">, {
        ...patch,
        rowIndex: row.rowIndex,
        lastPulledAt: now,
        syncStatus: "synced",
      });
      patched++;
      for (const se of plan.sideEffects) {
        sideEffects.push({ ...se, id: existing._id });
      }
      if (plan.flags.length) {
        flaggedCount++;
        for (const f of plan.flags)
          reviewFlags.push({ key: row.key, reason: f });
      }
    }

    if (t === "inventory") await setInventoryLastPull(ctx, now);

    return {
      patched,
      protected: protectedCount,
      skipped,
      flagged: flaggedCount,
      inserted,
      sideEffects,
      reviewFlags,
    };
  },
});

// ─── side-effect runner (action context) ─────────────────────────────────────

async function runSideEffects(
  ctx: ActionCtx,
  table: string,
  sideEffects: Array<{
    type: "cancelSale" | "refanLot";
    id: string;
    value?: number;
  }>,
  reviewFlags: Array<{ table: string; key: string; reason: string }>,
) {
  for (const se of sideEffects) {
    try {
      if (se.type === "cancelSale") {
        await ctx.runMutation(api.sales.cancel, {
          id: se.id as Id<"sales">,
          operatorEmail: "fotosintesis-sheet",
          reason: "Cancelada vía hoja de cálculo (sync)",
        });
      } else if (se.type === "refanLot") {
        await ctx.runMutation(api.lots.update, {
          id: se.id as Id<"lots">,
          patch: { costoTotalCOP: se.value as number },
          editorEmail: "fotosintesis-sheet",
        });
      }
    } catch (err) {
      reviewFlags.push({
        table,
        key: se.id,
        reason: `Efecto '${se.type}' no se aplicó automáticamente: ${errMsg(err)}`,
      });
    }
  }
}

type PerTable = Record<
  string,
  | {
      patched: number;
      protected: number;
      skipped: number;
      flagged: number;
      inserted: number;
    }
  | { error: string }
>;

// ─── DELTA mode ──────────────────────────────────────────────────────────────

export const runDelta = internalAction({
  args: {
    deltas: v.record(
      v.string(),
      v.array(
        v.object({
          key: v.string(),
          rowIndex: v.number(),
          colIdxs: v.array(v.number()),
        }),
      ),
    ),
  },
  handler: async (ctx, { deltas }) => {
    const appUrl = requireAppUrl();
    const token = process.env.ADMIN_SYNC_TOKEN;
    if (!token)
      throw new Error("ADMIN_SYNC_TOKEN missing on Convex deployment");

    const perTable: PerTable = {};
    const reviewFlags: Array<{ table: string; key: string; reason: string }> =
      [];

    for (const [table, entries] of Object.entries(deltas)) {
      if (!isFotoSyncTable(table) || entries.length === 0) continue;
      try {
        const res = await fetch(`${appUrl}/api/get-table-rows`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-admin-sync-token": token,
          },
          body: JSON.stringify({
            table,
            entries: entries.map((e) => ({
              rowIndex: e.rowIndex,
              colIdxs: e.colIdxs,
            })),
          }),
        });
        if (!res.ok) {
          perTable[table] = { error: `reader HTTP ${res.status}` };
          continue;
        }
        const data = (await res.json()) as {
          rows?: Array<{
            rowIndex: number;
            colA: string;
            cells: Record<string, string>;
          }>;
        };
        const keyByRow = new Map(entries.map((e) => [e.rowIndex, e.key]));
        const rows: SyncRow[] = (data.rows ?? []).map((r) => ({
          key: keyByRow.get(r.rowIndex) ?? r.colA,
          rowIndex: r.rowIndex,
          colA: r.colA,
          cells: r.cells ?? {},
        }));
        const result = await ctx.runMutation(internal.fotoSync.upsertTable, {
          table,
          rows,
          allowInsert: false,
        });
        await runSideEffects(ctx, table, result.sideEffects, reviewFlags);
        reviewFlags.push(
          ...result.reviewFlags.map((f) => ({
            table,
            key: f.key,
            reason: f.reason,
          })),
        );
        perTable[table] = {
          patched: result.patched,
          protected: result.protected,
          skipped: result.skipped,
          flagged: result.flagged,
          inserted: result.inserted,
        };
      } catch (err) {
        perTable[table] = { error: errMsg(err) };
      }
    }

    return { mode: "delta" as const, perTable, reviewFlags };
  },
});

// ─── FULL mode (fallback reconcile) ──────────────────────────────────────────

export const runFull = internalAction({
  args: { tables: v.optional(v.array(v.string())) },
  handler: async (ctx, { tables }) => {
    const appUrl = requireAppUrl();
    const token = process.env.ADMIN_SYNC_TOKEN;
    if (!token)
      throw new Error("ADMIN_SYNC_TOKEN missing on Convex deployment");

    const targets = (
      tables && tables.length ? tables : FOTO_SYNC_TABLES
    ).filter(isFotoSyncTable);
    const perTable: PerTable = {};
    const reviewFlags: Array<{ table: string; key: string; reason: string }> =
      [];

    for (const table of targets) {
      try {
        const url =
          table === "inventory"
            ? `${appUrl}/api/get-inventory-rows`
            : `${appUrl}/api/get-table?table=${table}`;
        const res = await fetch(url, {
          headers: { "x-admin-sync-token": token },
        });
        if (!res.ok) {
          perTable[table] = { error: `reader HTTP ${res.status}` };
          continue;
        }
        const data = (await res.json()) as {
          rows?: Array<Record<string, string>>;
        };
        const keyCol = KEY_COLUMN[table];
        const writableKeys = Object.keys(WRITABLE[table]);
        const rows: SyncRow[] = (data.rows ?? [])
          .map((r) => {
            const key = String(r[keyCol] ?? r.__colA ?? "").trim();
            const cells: Record<string, string> = {};
            for (const k of writableKeys) {
              if (r[k] !== undefined) cells[k] = String(r[k]);
            }
            return {
              key,
              rowIndex: Number(r.__rowIndex ?? 0),
              colA: key,
              cells,
            };
          })
          .filter((r) => r.key.length > 0);
        const result = await ctx.runMutation(internal.fotoSync.upsertTable, {
          table,
          rows,
          allowInsert: table === "providers" || table === "clients",
        });
        await runSideEffects(ctx, table, result.sideEffects, reviewFlags);
        reviewFlags.push(
          ...result.reviewFlags.map((f) => ({
            table,
            key: f.key,
            reason: f.reason,
          })),
        );
        perTable[table] = {
          patched: result.patched,
          protected: result.protected,
          skipped: result.skipped,
          flagged: result.flagged,
          inserted: result.inserted,
        };
      } catch (err) {
        perTable[table] = { error: errMsg(err) };
      }
    }

    return { mode: "full" as const, perTable, reviewFlags };
  },
});

/**
 * Env-gated timer backstop for the otherwise event-driven SOT sync.
 *
 * The reverse direction (Sheet → Convex) is normally event-driven (Apps Script
 * + the manual "🔄 Convex Sync" button → /sync/foto). That means an out-of-band
 * edit to a SOT cell — e.g. an operator flipping Inventario `estado` straight in
 * the sheet — only reconciles when someone presses the button. This backstop
 * lets a deployment opt into a periodic full reconcile WITHOUT making it the
 * default (the per-interval Vercel+Sheets+Convex bandwidth the team chose to
 * avoid): it no-ops unless `FOTO_RECONCILE_CRON === "on"`.
 *
 * Kept SEPARATE from `runFull` so the manual button path (which calls runFull
 * directly via /sync/foto) is never gated by the flag.
 */
export const reconcileBackstop = internalAction({
  args: {},
  handler: async (ctx): Promise<{ skipped: true } | { skipped: false }> => {
    if (process.env.FOTO_RECONCILE_CRON !== "on") {
      return { skipped: true };
    }
    await ctx.runAction(internal.fotoSync.runFull, {});
    return { skipped: false };
  },
});

// `coerceCell` is re-exported for the unit test's coercion assertions.
export { coerceCell };
