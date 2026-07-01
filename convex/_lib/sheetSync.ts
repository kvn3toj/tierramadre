import type { ActionCtx } from "../_generated/server";
import type { FotoTable } from "./columnMaps";

/**
 * POST that survives an apex↔alias / http→https domain redirect.
 *
 * Convex's `fetch` (like the WHATWG spec) DOWNGRADES POST→GET when it follows a
 * 301/302/303. So if `APP_URL` points at a host that 3xx-redirects — e.g. a
 * `*.vercel.app` alias that 301s to the custom domain — every Sheets *write*
 * silently arrives at the endpoint as GET and is rejected `405 Method not
 * allowed`, while GET *reads* keep working. The result is invisible: the
 * Sheet→Convex direction syncs fine, but new rows never reach the sheet.
 * (Observed 2026-06-30: lots + inventory pushes all failing with that exact
 * 405 because APP_URL was the `.vercel.app` alias.)
 *
 * We follow redirects MANUALLY here, re-issuing the SAME method + body +
 * headers at each hop, so a misconfigured or later-renamed domain can never
 * again break the push. Falls back to returning the redirect response
 * unchanged if a `Location` can't be read (no worse than before).
 */
export async function postToVercel(
  url: string,
  init: { headers: Record<string, string>; body: string },
  maxHops = 4,
): Promise<Response> {
  let target = url;
  for (let hop = 0; hop <= maxHops; hop++) {
    const res = await fetch(target, {
      method: "POST",
      headers: init.headers,
      body: init.body,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      target = new URL(location, target).toString();
      continue;
    }
    return res;
  }
  throw new Error(`Too many redirects POSTing to ${url}`);
}

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
    const res = await postToVercel(`${appUrl}/api/admin-table-update`, {
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
