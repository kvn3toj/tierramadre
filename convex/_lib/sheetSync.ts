import type { ActionCtx } from "../_generated/server";
import type { FotoTable } from "./columnMaps";

/**
 * POST a marshaled row to the generic Vercel endpoint that writes it to
 * the matching Sheets tab. Mirror of the pattern in convex/products.ts
 * `pushToSheet` action, generalized over `table`.
 *
 * Auth: shared `ADMIN_SYNC_TOKEN` between Convex deployment and Vercel.
 *
 * Returns `{ ok, message }`. Per the existing pattern, callers handle
 * the success/failure side-effects (marking syncStatus, writing audit)
 * via per-table internal mutations — this helper is transport only.
 */
export async function pushTableRowToVercel(args: {
  table: FotoTable;
  rowIndex: number;
  mode: "patch" | "append";
  idValue: string;
  /**
   * When the natural-key column is being renamed (providers.nombreORazonSocial,
   * clients.nombre), pass the OLD value here. The Vercel endpoint validates
   * column A of the target sheet row against `previousIdValue` (the OLD name
   * still in the sheet), then overwrites column A with `idValue` (the NEW
   * name). Without this, the safety check would 409 on every rename.
   */
  previousIdValue?: string;
  fields: Record<string, string>;
}): Promise<{ ok: boolean; message: string }> {
  const { table, rowIndex, mode, idValue, previousIdValue, fields } = args;

  const appUrl = process.env.APP_URL;
  const syncToken = process.env.ADMIN_SYNC_TOKEN;
  if (!appUrl || !syncToken) {
    return {
      ok: false,
      message: "APP_URL or ADMIN_SYNC_TOKEN missing on Convex deployment",
    };
  }

  try {
    const res = await fetch(`${appUrl}/api/admin-table-update`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-sync-token": syncToken,
      },
      body: JSON.stringify({
        table,
        rowIndex,
        mode,
        idValue,
        previousIdValue,
        fields,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        message: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    return { ok: true, message: "Pushed to Sheets" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

/**
 * Tiny convenience: read APP_URL once, fail loud if missing. Useful for
 * pull actions that hit /api/get-table.
 */
export function requireAppUrl(): string {
  const u = process.env.APP_URL;
  if (!u) throw new Error("APP_URL missing on Convex deployment");
  return u;
}

// Re-export ActionCtx so per-table modules don't need to import the
// _generated path themselves.
export type { ActionCtx };
