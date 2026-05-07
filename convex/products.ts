import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  qualityBucket,
  caratBucket,
  procedenciaBucket,
  comboKey,
} from "../src/utils/patron-buckets";

// =============================================================================
// QUERIES — read the mirror
// =============================================================================

/**
 * List all products in the inventory mirror.
 * Returns rows ordered by itemId numerically.
 */
export const list = query({
  args: {
    estado: v.optional(
      v.union(
        v.literal("DISPONIBLE"),
        v.literal("VENDIDA"),
        v.literal("ASESOR"),
        v.literal(""),
      ),
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { estado, search }) => {
    const rows = estado
      ? await ctx.db
          .query("productInventory")
          .withIndex("by_estado", (q) => q.eq("estado", estado))
          .collect()
      : await ctx.db.query("productInventory").collect();

    const filtered = search
      ? rows.filter((row) => {
          const s = search.toLowerCase();
          return (
            row.itemId.toLowerCase().includes(s) ||
            (row.nombre ?? "").toLowerCase().includes(s) ||
            (row.color ?? "").toLowerCase().includes(s) ||
            (row.calidad ?? "").toLowerCase().includes(s) ||
            (row.coleccion ?? "").toLowerCase().includes(s)
          );
        })
      : rows;

    // Numeric sort on itemId
    return filtered.sort((a, b) => {
      const an = Number(a.itemId);
      const bn = Number(b.itemId);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.itemId.localeCompare(b.itemId);
    });
  },
});

/**
 * Get a single product by itemId.
 */
export const get = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    return await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
  },
});

/**
 * Recent edit history for an item (last 20).
 */
export const editHistory = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const all = await ctx.db
      .query("productEdits")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .order("desc")
      .take(20);
    return all;
  },
});

/**
 * Sync status summary — used by the toolbar to show "12 pending" badges.
 */
export const syncStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("productInventory").collect();
    const total = all.length;
    const pending = all.filter((r) => r.syncStatus === "pending").length;
    const errored = all.filter((r) => r.syncStatus === "error").length;
    const lastPull = all.reduce<string | null>(
      (acc, r) => (acc === null || r.lastPulledAt > acc ? r.lastPulledAt : acc),
      null,
    );
    return { total, pending, errored, lastPull };
  },
});

// =============================================================================
// MUTATIONS — write to the mirror, schedule push to Sheets
// =============================================================================

/**
 * Save edits to a product. Patches the mirror immediately for optimistic UI,
 * inserts an audit entry, and schedules an action that pushes to Sheets.
 */
export const saveEdit = mutation({
  args: {
    itemId: v.string(),
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
    patch: v.object({
      nombre: v.optional(v.string()),
      peso: v.optional(v.string()),
      color: v.optional(v.string()),
      calidad: v.optional(v.string()),
      cantidad: v.optional(v.number()),
      talla: v.optional(v.string()),
      medidas: v.optional(v.string()),
      categoria: v.optional(v.string()),
      precioCOP: v.optional(v.number()),
      ubicacion: v.optional(v.string()),
      coleccion: v.optional(v.string()),
      caja: v.optional(v.string()),
      estado: v.optional(
        v.union(
          v.literal("DISPONIBLE"),
          v.literal("VENDIDA"),
          v.literal("ASESOR"),
          v.literal(""),
        ),
      ),
    }),
  },
  handler: async (ctx, { itemId, editorEmail, editorName, patch }) => {
    const existing = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (!existing) throw new Error(`Producto ${itemId} no está en el espejo`);

    // Compute changes for the audit log (only fields that actually changed)
    const changes: Array<{
      field: string;
      before: string | number | null;
      after: string | number | null;
    }> = [];
    for (const [field, after] of Object.entries(patch)) {
      if (after === undefined) continue;
      const before = (existing as Record<string, unknown>)[field];
      if (before === after) continue;
      const beforeNorm =
        typeof before === "string" || typeof before === "number"
          ? before
          : null;
      const afterNorm =
        typeof after === "string" || typeof after === "number" ? after : null;
      changes.push({ field, before: beforeNorm, after: afterNorm });
    }
    if (changes.length === 0) {
      return { itemId, changesCount: 0, message: "Sin cambios" };
    }

    // Patch the mirror — UI updates immediately
    await ctx.db.patch(existing._id, {
      ...patch,
      syncStatus: "pending" as const,
      syncError: undefined,
    });

    // Insert audit row (status: pending until the action confirms the push)
    const auditId = await ctx.db.insert("productEdits", {
      itemId,
      editorEmail,
      editorName,
      editedAt: new Date().toISOString(),
      changes,
      status: "pending" as const,
    });

    // Schedule the Sheets push (non-blocking; fires immediately)
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
    });

    return { itemId, changesCount: changes.length, auditId };
  },
});

/**
 * Internal: mark an audit row + mirror row as successfully pushed.
 * Called by the pushToSheet action on success.
 */
export const _markPushed = internalMutation({
  args: { itemId: v.string(), auditId: v.id("productEdits") },
  handler: async (ctx, { itemId, auditId }) => {
    const row = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (row) {
      await ctx.db.patch(row._id, {
        syncStatus: "synced" as const,
        lastPushedAt: new Date().toISOString(),
        syncError: undefined,
      });
    }
    await ctx.db.patch(auditId, { status: "saved" as const });
  },
});

/**
 * Internal: record a push failure.
 */
export const _markPushFailed = internalMutation({
  args: {
    itemId: v.string(),
    auditId: v.id("productEdits"),
    error: v.string(),
  },
  handler: async (ctx, { itemId, auditId, error }) => {
    const row = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (row) {
      await ctx.db.patch(row._id, {
        syncStatus: "error" as const,
        syncError: error.slice(0, 500),
      });
    }
    await ctx.db.patch(auditId, {
      status: "failed" as const,
      error: error.slice(0, 500),
    });
  },
});

/**
 * Internal: read a single mirror row (for the action).
 */
export const _getInternal = internalQuery({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    return await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
  },
});

// =============================================================================
// ACTIONS — talk to Google Sheets
// =============================================================================

/**
 * Push a single product's current mirror state to the Google Sheet.
 *
 * Architecture: this action calls our own Vercel endpoint
 * `/api/admin-product-update` rather than talking to the Sheets API
 * directly. That keeps the Google service account credentials in one
 * place (Vercel env vars) and reuses the existing `withApiHandler` /
 * `provideSheets` plumbing.
 *
 * Required env var on the Convex deployment:
 *   APP_URL — base URL of the Vercel app (e.g. https://tierra-madre-studio.vercel.app)
 *   ADMIN_SYNC_TOKEN — shared secret matching the Vercel-side token
 */
export const pushToSheet = action({
  args: {
    itemId: v.string(),
    auditId: v.id("productEdits"),
    // Phase G — create flow: "append" tells the Vercel endpoint that the
    // row is new (no existing column-A item to validate against and the
    // sheet must `values.append` rather than `values.update`). Defaults
    // to "patch" so all existing callers (saveEdit, saveEditMany,
    // retryPush) keep their semantics.
    mode: v.optional(v.union(v.literal("patch"), v.literal("append"))),
  },
  handler: async (
    ctx,
    { itemId, auditId, mode },
  ): Promise<{ ok: boolean; message: string }> => {
    const pushMode: "patch" | "append" = mode ?? "patch";
    const appUrl: string | undefined = process.env.APP_URL;
    const syncToken: string | undefined = process.env.ADMIN_SYNC_TOKEN;
    if (!appUrl || !syncToken) {
      const msg = "APP_URL or ADMIN_SYNC_TOKEN missing on Convex deployment";
      await ctx.runMutation(internal.products._markPushFailed, {
        itemId,
        auditId,
        error: msg,
      });
      return { ok: false, message: msg };
    }

    // Read current mirror state (the source for the push)
    const row = await ctx.runQuery(internal.products._getInternal, { itemId });
    if (!row) {
      const msg = `Mirror row not found for ${itemId}`;
      await ctx.runMutation(internal.products._markPushFailed, {
        itemId,
        auditId,
        error: msg,
      });
      return { ok: false, message: msg };
    }

    try {
      const res = await fetch(`${appUrl}/api/admin-product-update`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-sync-token": syncToken,
        },
        body: JSON.stringify({
          itemId,
          rowIndex: row.rowIndex,
          mode: pushMode,
          fields: {
            nombre: row.nombre ?? "",
            peso: row.peso ?? "",
            color: row.color ?? "",
            calidad: row.calidad ?? "",
            cantidad: row.cantidad ?? "",
            talla: row.talla ?? "",
            medidas: row.medidas ?? "",
            medidasValores: row.medidasValores ?? "",
            categoria: row.categoria ?? "",
            precioCOP: row.precioCOP ?? "",
            ubicacion: row.ubicacion ?? "",
            asesor: row.asesor ?? "",
            estado: row.estado ?? "DISPONIBLE",
            qr: row.qr ?? "",
            coleccion: row.coleccion ?? "",
            caja: row.caja ?? "",
            asesorActual: row.asesorActual ?? "",
            estadoAsesor: row.estadoAsesor ?? "",
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      await ctx.runMutation(internal.products._markPushed, { itemId, auditId });
      return { ok: true, message: "Pushed to Sheets" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.products._markPushFailed, {
        itemId,
        auditId,
        error: msg,
      });
      return { ok: false, message: msg };
    }
  },
});

/**
 * Internal: latest audit row for an item (any status). Used by retryPush.
 */
export const _latestAudit = internalQuery({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    return await ctx.db
      .query("productEdits")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .order("desc")
      .first();
  },
});

/**
 * Internal: reset mirror + audit row for a retry attempt. Flips
 * syncStatus back to "pending", clears the error, and marks the audit
 * row as "pending" again.
 */
export const _resetForRetry = internalMutation({
  args: { itemId: v.string(), auditId: v.id("productEdits") },
  handler: async (ctx, { itemId, auditId }) => {
    const row = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (row) {
      await ctx.db.patch(row._id, {
        syncStatus: "pending" as const,
        syncError: undefined,
      });
    }
    await ctx.db.patch(auditId, {
      status: "pending" as const,
      error: undefined,
    });
  },
});

/**
 * Retry the most recent failed/pending push for a given item. Looks up
 * the latest audit row, resets mirror+audit state to pending, and fires
 * pushToSheet again. Surfaced from the InventoryRow's clickable error
 * dot ("click to retry").
 */
export const retryPush = action({
  args: { itemId: v.string() },
  handler: async (
    ctx,
    { itemId },
  ): Promise<{ ok: boolean; message: string }> => {
    const audit = await ctx.runQuery(internal.products._latestAudit, {
      itemId,
    });
    if (!audit) {
      return {
        ok: false,
        message: "Sin historial de ediciones para reintentar",
      };
    }
    await ctx.runMutation(internal.products._resetForRetry, {
      itemId,
      auditId: audit._id,
    });
    return await ctx.runAction(api.products.pushToSheet, {
      itemId,
      auditId: audit._id,
    });
  },
});

// =============================================================================
// BULK EDITS — multi-select operations from the InventoryRow checkbox column
// =============================================================================

/**
 * Apply a single estado change to many products at once. Used by the
 * sticky bulk action bar ("Marcar como disponible (N) / Marcar como
 * vendida (N)"). Each row gets the standard treatment: mirror patch,
 * audit row insert, and a scheduled `pushToSheet` action.
 *
 * Rows that are missing from the mirror or already at the requested
 * estado are skipped — `unchangedCount` distinguishes "nothing to do"
 * from "applied". The mutation never throws on a missing row; it just
 * counts it as missing so the toolbar can report partial successes.
 */
export const saveEditMany = mutation({
  args: {
    itemIds: v.array(v.string()),
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
    // Phase H — broadened from `{ estado }` to a saveEdit-compatible
    // patch so the bulk action bar can also change precioCOP / coleccion
    // / ubicacion in a single mutation. Each row still gets a per-field
    // diff in its audit row (only fields whose value actually changes).
    patch: v.object({
      nombre: v.optional(v.string()),
      peso: v.optional(v.string()),
      color: v.optional(v.string()),
      calidad: v.optional(v.string()),
      cantidad: v.optional(v.number()),
      talla: v.optional(v.string()),
      medidas: v.optional(v.string()),
      categoria: v.optional(v.string()),
      precioCOP: v.optional(v.number()),
      ubicacion: v.optional(v.string()),
      coleccion: v.optional(v.string()),
      caja: v.optional(v.string()),
      estado: v.optional(
        v.union(
          v.literal("DISPONIBLE"),
          v.literal("VENDIDA"),
          v.literal("ASESOR"),
          v.literal(""),
        ),
      ),
    }),
  },
  handler: async (ctx, { itemIds, editorEmail, editorName, patch }) => {
    let updatedCount = 0;
    let unchangedCount = 0;
    let missingCount = 0;
    const editedAt = new Date().toISOString();

    for (const itemId of itemIds) {
      const existing = await ctx.db
        .query("productInventory")
        .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
        .first();
      if (!existing) {
        missingCount++;
        continue;
      }

      // Per-row diff — skip rows where every patched field already
      // matches the mirror (mirrors saveEdit's "Sin cambios" path).
      const changes: Array<{
        field: string;
        before: string | number | null;
        after: string | number | null;
      }> = [];
      for (const [field, after] of Object.entries(patch)) {
        if (after === undefined) continue;
        const before = (existing as Record<string, unknown>)[field];
        if (before === after) continue;
        const beforeNorm =
          typeof before === "string" || typeof before === "number"
            ? before
            : null;
        const afterNorm =
          typeof after === "string" || typeof after === "number" ? after : null;
        changes.push({ field, before: beforeNorm, after: afterNorm });
      }
      if (changes.length === 0) {
        unchangedCount++;
        continue;
      }

      await ctx.db.patch(existing._id, {
        ...patch,
        syncStatus: "pending" as const,
        syncError: undefined,
      });

      const auditId = await ctx.db.insert("productEdits", {
        itemId,
        editorEmail,
        editorName,
        editedAt,
        changes,
        status: "pending" as const,
      });

      await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
        itemId,
        auditId,
      });

      updatedCount++;
    }

    return {
      total: itemIds.length,
      updatedCount,
      unchangedCount,
      missingCount,
    };
  },
});

// =============================================================================
// SOFT LOCKS — drawer-open coordination between concurrent admins
// =============================================================================

/** Lock TTL: 5 minutes. */
const LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Claim a soft lock on a product. Multiple admins can hit
 * `/admin/products` at once; the lock signals "X has the drawer open"
 * so peers see a banner instead of stomping on the same edit.
 *
 * Returns `{ ok: true }` when the lock is now held by `holderEmail`
 * (fresh insert, expired-takeover, or refresh by the same holder).
 *
 * Returns `{ ok: false, holder, expiresAt }` when a non-expired lock
 * is already held by a different admin — the caller surfaces a banner
 * and skips the release-on-cleanup path.
 */
export const claimLock = mutation({
  args: {
    itemId: v.string(),
    holderEmail: v.string(),
    holderName: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, holderEmail, holderName }) => {
    const now = Date.now();
    const claimedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + LOCK_TTL_MS).toISOString();

    const existing = await ctx.db
      .query("productLocks")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();

    if (!existing) {
      await ctx.db.insert("productLocks", {
        itemId,
        holderEmail,
        holderName,
        claimedAt,
        expiresAt,
      });
      return { ok: true as const };
    }

    const existingExpiresMs = Date.parse(existing.expiresAt);
    const isExpired =
      !Number.isFinite(existingExpiresMs) || existingExpiresMs <= now;

    if (existing.holderEmail === holderEmail || isExpired) {
      await ctx.db.patch(existing._id, {
        holderEmail,
        holderName,
        claimedAt,
        expiresAt,
      });
      return { ok: true as const };
    }

    return {
      ok: false as const,
      holder: {
        email: existing.holderEmail,
        name: existing.holderName,
      },
      expiresAt: existing.expiresAt,
    };
  },
});

/**
 * Release a soft lock. Only deletes the row if the caller's email
 * matches the current holder; no-op otherwise. Defensive against
 * interleaved cleanups that could otherwise kill another admin's
 * legitimate lock.
 */
export const releaseLock = mutation({
  args: {
    itemId: v.string(),
    holderEmail: v.string(),
  },
  handler: async (ctx, { itemId, holderEmail }) => {
    const existing = await ctx.db
      .query("productLocks")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (!existing) return { released: false };
    if (existing.holderEmail !== holderEmail) return { released: false };
    await ctx.db.delete(existing._id);
    return { released: true };
  },
});

/**
 * Read the current lock state for a product. Returns `null` when free
 * or expired; otherwise the holder identity + expiry. The drawer
 * subscribes to this reactively so a "X está editando" banner appears
 * the moment another admin claims (or drops away when they release).
 */
export const lockStatus = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const existing = await ctx.db
      .query("productLocks")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (!existing) return null;
    const expiresAtMs = Date.parse(existing.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return null;
    }
    return {
      holderEmail: existing.holderEmail,
      holderName: existing.holderName,
      claimedAt: existing.claimedAt,
      expiresAt: existing.expiresAt,
    };
  },
});

/**
 * List all active (non-expired) soft locks.
 *
 * The page-level Bandeja subscribes to this so each row can render a
 * small gold dot when another editor currently holds the lock. Filtering
 * to non-expired locks happens client-side after `collect()` because the
 * lock TTL is small (5 min) and the row cardinality is bounded by the
 * number of admins editing concurrently — no index needed.
 */
export const listActiveLocks = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("productLocks").collect();
    const now = new Date().toISOString();
    return all.filter((l) => l.expiresAt > now);
  },
});

/**
 * Pull the full inventory from the Google Sheet into the mirror.
 *
 * Strategy: fetch the existing public endpoint /api/get-treasure-sheets
 * (which returns the parsed TreasureItem[] array) and reconcile with the
 * mirror — upsert by itemId, keep the rowIndex from the sheet.
 *
 * Run via Convex cron (see convex/crons.ts) or manually from the admin
 * panel toolbar (the "Resync from sheet" button).
 */
export const pullFromSheet = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ pulled: number; upserted: number; rebased: number }> => {
    const appUrl: string | undefined = process.env.APP_URL;
    if (!appUrl) {
      throw new Error("APP_URL missing on Convex deployment");
    }

    const res = await fetch(`${appUrl}/api/get-treasure-sheets`);
    if (!res.ok) {
      throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
    }
    const payload = (await res.json()) as { treasure?: SheetRow[] };
    const items: SheetRow[] = payload.treasure ?? [];

    let upserted = 0;
    let rebased = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = String(item.item ?? "").trim();
      if (!itemId) continue;
      // Sheet row index: header is row 1, item at index 0 is row 2
      const rowIndex = i + 2;
      const result = await ctx.runMutation(internal.products._upsertFromSheet, {
        itemId,
        rowIndex,
        fields: {
          nombre: nullableStr(item.nombre),
          peso: nullableStr(item.peso),
          color: nullableStr(item.color),
          calidad: nullableStr(item.calidad),
          cantidad: nullableNum(item.cantidad),
          talla: nullableStr(item.talla),
          medidas: nullableStr(item.medidas),
          medidasValores: nullableStr(item.medidasValores),
          categoria: nullableStr(item.categoria),
          precioCOP: nullableNum(item.precioCOP),
          ubicacion: nullableStr(item.ubicacion),
          asesor: nullableStr(item.asesor),
          estado: normalizeEstado(item.estado),
          qr: nullableStr(item.qr),
          coleccion: nullableStr(item.coleccion),
          caja: nullableStr(item.caja),
          asesorActual: nullableStr(item.asesorActual),
          estadoAsesor: nullableStr(item.estadoAsesor),
        },
      });
      if (result.upserted) upserted++;
      if (result.rebased) rebased++;
    }

    return { pulled: items.length, upserted, rebased };
  },
});

/**
 * Internal: upsert a single sheet row into the mirror.
 * Only overwrites mirror fields when syncStatus === "synced" — pending
 * local edits take precedence and aren't clobbered by a pull.
 */
export const _upsertFromSheet = internalMutation({
  args: {
    itemId: v.string(),
    rowIndex: v.number(),
    fields: v.object({
      nombre: v.union(v.string(), v.null()),
      peso: v.union(v.string(), v.null()),
      color: v.union(v.string(), v.null()),
      calidad: v.union(v.string(), v.null()),
      cantidad: v.union(v.number(), v.null()),
      talla: v.union(v.string(), v.null()),
      medidas: v.union(v.string(), v.null()),
      medidasValores: v.union(v.string(), v.null()),
      categoria: v.union(v.string(), v.null()),
      precioCOP: v.union(v.number(), v.null()),
      ubicacion: v.union(v.string(), v.null()),
      asesor: v.union(v.string(), v.null()),
      estado: v.union(
        v.literal("DISPONIBLE"),
        v.literal("VENDIDA"),
        v.literal("ASESOR"),
        v.literal(""),
      ),
      qr: v.union(v.string(), v.null()),
      coleccion: v.union(v.string(), v.null()),
      caja: v.union(v.string(), v.null()),
      asesorActual: v.union(v.string(), v.null()),
      estadoAsesor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, { itemId, rowIndex, fields }) => {
    const existing = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    const now = new Date().toISOString();

    const cleanedFields = {
      nombre: fields.nombre ?? undefined,
      peso: fields.peso ?? undefined,
      color: fields.color ?? undefined,
      calidad: fields.calidad ?? undefined,
      cantidad: fields.cantidad ?? undefined,
      talla: fields.talla ?? undefined,
      medidas: fields.medidas ?? undefined,
      medidasValores: fields.medidasValores ?? undefined,
      categoria: fields.categoria ?? undefined,
      precioCOP: fields.precioCOP ?? undefined,
      ubicacion: fields.ubicacion ?? undefined,
      asesor: fields.asesor ?? undefined,
      estado: fields.estado,
      qr: fields.qr ?? undefined,
      coleccion: fields.coleccion ?? undefined,
      caja: fields.caja ?? undefined,
      asesorActual: fields.asesorActual ?? undefined,
      estadoAsesor: fields.estadoAsesor ?? undefined,
    };

    if (!existing) {
      await ctx.db.insert("productInventory", {
        itemId,
        rowIndex,
        ...cleanedFields,
        lastPulledAt: now,
        syncStatus: "synced" as const,
      });
      return { upserted: true, rebased: false };
    }

    // Always re-pin rowIndex to what the sheet says (rows can shift)
    const rowIndexShifted = existing.rowIndex !== rowIndex;
    const baseUpdate: { rowIndex: number; lastPulledAt: string } = {
      rowIndex,
      lastPulledAt: now,
    };

    if (existing.syncStatus === "pending" || existing.syncStatus === "error") {
      // Don't clobber a pending edit's content — only refresh row index + pull time
      await ctx.db.patch(existing._id, baseUpdate);
      return { upserted: false, rebased: rowIndexShifted };
    }

    await ctx.db.patch(existing._id, {
      ...cleanedFields,
      ...baseUpdate,
      syncStatus: "synced" as const,
    });
    return { upserted: false, rebased: rowIndexShifted };
  },
});

// =============================================================================
// HELPERS
// =============================================================================

type SheetRow = {
  item?: number | string;
  nombre?: string;
  peso?: string | number;
  color?: string;
  calidad?: string;
  cantidad?: number | string;
  talla?: string;
  medidas?: string;
  medidasValores?: string;
  categoria?: string;
  precioCOP?: number | string;
  ubicacion?: string;
  asesor?: string;
  estado?: string;
  qr?: string;
  coleccion?: string;
  caja?: string;
  asesorActual?: string;
  estadoAsesor?: string;
};

function nullableStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function nullableNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeEstado(v: unknown): "DISPONIBLE" | "VENDIDA" | "ASESOR" | "" {
  const s = String(v ?? "")
    .trim()
    .toUpperCase();
  if (s === "DISPONIBLE" || s === "VENDIDA" || s === "ASESOR") return s;
  if (s === "") return "DISPONIBLE"; // mirror the legacy default in get-treasure-sheets
  return "";
}

// =============================================================================
// PATRONES — sold-stone aggregations grouped by procedencia × quality × carat
// =============================================================================

/**
 * Patrones similar to a target item: scans VENDIDA rows over the
 * lookback window, groups by procedencia × quality × carat-bucket,
 * filters to combos that overlap the target stone, and returns the
 * top 5 by count with median price.
 */
export const patronesFor = query({
  args: { itemId: v.string(), lookbackDays: v.optional(v.number()) },
  handler: async (ctx, { itemId, lookbackDays }) => {
    const days = lookbackDays ?? 90;
    const horizon = new Date(Date.now() - days * 86400000).toISOString();
    const target = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (!target) return { combos: [], total: 0 };

    const targetProc = procedenciaBucket(target.coleccion);
    const targetQual = qualityBucket(target.calidad);
    const peso = Number(target.peso);
    const targetCarat = caratBucket(peso);

    const sold = await ctx.db
      .query("productInventory")
      .withIndex("by_estado", (q) => q.eq("estado", "VENDIDA"))
      .collect();

    const buckets = new Map<
      string,
      { count: number; prices: number[]; label: string }
    >();
    for (const p of sold) {
      const ts = p.lastPushedAt ?? p.lastPulledAt;
      if (ts < horizon) continue;
      const proc = procedenciaBucket(p.coleccion);
      const qual = qualityBucket(p.calidad);
      const c = caratBucket(Number(p.peso));
      if (!proc || !qual || !c) continue;
      // Match if procedencia matches AND quality matches AND carat windows overlap.
      if (targetProc && targetQual && targetCarat) {
        if (proc !== targetProc) continue;
        if (qual !== targetQual) continue;
        const [tlo, thi] = targetCarat;
        const [plo, phi] = c;
        if (phi < tlo || plo > thi) continue;
      }
      const key = comboKey({
        procedencia: proc,
        quality: qual,
        caratLo: c[0],
        caratHi: c[1],
      });
      const entry = buckets.get(key) ?? {
        count: 0,
        prices: [],
        label: `${proc} · ${qual} · ${c[0].toFixed(1)}–${c[1].toFixed(1)} ct`,
      };
      entry.count += 1;
      if (typeof p.precioCOP === "number" && p.precioCOP > 0)
        entry.prices.push(p.precioCOP);
      buckets.set(key, entry);
    }

    const combos = Array.from(buckets.entries())
      .map(([key, v]) => ({
        key,
        label: v.label,
        count: v.count,
        medianPriceCOP: v.prices.length ? median(v.prices) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { combos, total: combos.reduce((s, c) => s + c.count, 0) };
  },
});

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Top-5 global patrones combos across all VENDIDA rows in the
 * lookback window. Used by the FotoHero "patrones del semestre"
 * sparkline / chip stack.
 */
export const patronesGlobalTop = query({
  args: { lookbackDays: v.optional(v.number()) },
  handler: async (ctx, { lookbackDays }) => {
    const days = lookbackDays ?? 90;
    const horizon = new Date(Date.now() - days * 86400000).toISOString();
    const sold = await ctx.db
      .query("productInventory")
      .withIndex("by_estado", (q) => q.eq("estado", "VENDIDA"))
      .collect();
    const buckets = new Map<
      string,
      { count: number; prices: number[]; label: string }
    >();
    for (const p of sold) {
      const ts = p.lastPushedAt ?? p.lastPulledAt;
      if (ts < horizon) continue;
      const proc = procedenciaBucket(p.coleccion);
      const qual = qualityBucket(p.calidad);
      const c = caratBucket(Number(p.peso));
      if (!proc || !qual || !c) continue;
      const key = comboKey({
        procedencia: proc,
        quality: qual,
        caratLo: c[0],
        caratHi: c[1],
      });
      const entry = buckets.get(key) ?? {
        count: 0,
        prices: [],
        label: `${proc} · ${qual} · ${c[0].toFixed(1)}–${c[1].toFixed(1)} ct`,
      };
      entry.count += 1;
      if (typeof p.precioCOP === "number" && p.precioCOP > 0)
        entry.prices.push(p.precioCOP);
      buckets.set(key, entry);
    }
    const combos = Array.from(buckets.entries())
      .map(([key, v]) => ({
        key,
        label: v.label,
        count: v.count,
        medianPriceCOP: v.prices.length ? median(v.prices) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { combos, total: combos.reduce((s, c) => s + c.count, 0) };
  },
});

/**
 * N most recent edits across all products. Powers the
 * Bandeja "Historial reciente" card.
 */
export const recentEdits = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(limit ?? 5, 50);
    const edits = await ctx.db.query("productEdits").order("desc").take(cap);
    return edits;
  },
});

// =============================================================================
// CREATE — "+ Nueva piedra" flow (Phase G)
// =============================================================================

/**
 * createProduct — insert a new piece into the mirror and append it to
 * the Google Sheet.
 *
 * Validates that `itemId` is non-empty and unique against the mirror
 * (the same constraints `validateNewProduct` enforces in the UI), then:
 *   1. Inserts a productInventory doc with rowIndex = max(existing) + 1
 *      and syncStatus "pending" (mirrors the saveEdit pattern).
 *   2. Inserts a productEdits audit row with `before: null` for every
 *      provided field — the history reads "created with these values".
 *   3. Schedules pushToSheet with `mode: "append"` so the Vercel
 *      endpoint appends a new row instead of patching an existing one.
 *
 * Returns `{ itemId, productId, rowIndex }` so the caller can route the
 * Bandeja inspector to the new row immediately (Convex reactivity will
 * surface it in the list one tick later).
 */
export const createProduct = mutation({
  args: {
    itemId: v.string(),
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
    fields: v.object({
      nombre: v.optional(v.string()),
      peso: v.optional(v.string()),
      color: v.optional(v.string()),
      calidad: v.optional(v.string()),
      cantidad: v.optional(v.number()),
      talla: v.optional(v.string()),
      medidas: v.optional(v.string()),
      categoria: v.optional(v.string()),
      precioCOP: v.optional(v.number()),
      ubicacion: v.optional(v.string()),
      coleccion: v.optional(v.string()),
      caja: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { itemId, editorEmail, editorName, fields }) => {
    const itemIdTrim = itemId.trim();
    if (!itemIdTrim) throw new Error("El número de la piedra es obligatorio");
    const dup = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemIdTrim))
      .first();
    if (dup)
      throw new Error(`Ya existe una piedra con el número ${itemIdTrim}`);

    const all = await ctx.db.query("productInventory").collect();
    const maxRow = all.reduce((m, p) => Math.max(m, p.rowIndex), 1);
    const nextRow = maxRow + 1;
    const now = new Date().toISOString();

    const productId = await ctx.db.insert("productInventory", {
      itemId: itemIdTrim,
      rowIndex: nextRow,
      ...fields,
      estado: "DISPONIBLE" as const,
      lastPulledAt: now,
      syncStatus: "pending" as const,
    });

    const auditId = await ctx.db.insert("productEdits", {
      itemId: itemIdTrim,
      editorEmail,
      editorName,
      editedAt: now,
      changes: Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([field, after]) => ({
          field,
          before: null,
          after: (after as string | number | null) ?? null,
        })),
      status: "pending" as const,
    });

    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: itemIdTrim,
      auditId,
      mode: "append" as const,
    });

    return { itemId: itemIdTrim, productId, rowIndex: nextRow };
  },
});
