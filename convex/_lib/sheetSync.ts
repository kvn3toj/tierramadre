import type { ActionCtx } from "../_generated/server";
import type { FotoTable } from "./columnMaps";
import { verificaDestinoDeEscritura } from "./destinoEscritura";

/**
 * EXACT hosts we will forward the admin sync token to across a redirect. The
 * only legitimate hop this helper exists for is an APP_URL alias 301-ing to the
 * canonical domain (`tierra-madre-studio.vercel.app` → `tierramadre.app`). In
 * that flow the vercel alias is the *original host* (allowed separately) and
 * the redirect *destination* is the canonical domain — so this set is the
 * canonical domain plus the one named prod alias, as exact strings.
 *
 * Deliberately NOT a `.vercel.app` suffix match: `*.vercel.app` is a shared,
 * third-party-controlled tenant space, so `endsWith(".vercel.app")` would let a
 * redirect hand our token to any attacker-deployed `foo.vercel.app`. Update
 * this list if the app's canonical domain or prod alias ever changes.
 */
const TRUSTED_SYNC_HOSTS = new Set([
  "tierramadre.app",
  "www.tierramadre.app",
  "tierra-madre-studio.vercel.app",
]);

function isTrustedSyncHost(
  hostname: string,
  originalHostname: string,
): boolean {
  return hostname === originalHostname || TRUSTED_SYNC_HOSTS.has(hostname);
}

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
 *
 * SECURITY: these requests carry the `x-admin-sync-token` credential in their
 * headers. Because a redirect `Location` is chosen by the server we POST to, we
 * refuse to follow one to a host outside the trusted set (see
 * `isTrustedSyncHost`) or over a plaintext http downgrade — otherwise a
 * misconfigured or compromised `APP_URL` could bounce the write (and its token)
 * to an attacker-controlled origin. A refused redirect throws (loud) rather
 * than silently stripping auth (which would just 401 and hide the problem).
 */
export async function postToVercel(
  url: string,
  init: { headers: Record<string, string>; body: string },
  maxHops = 4,
): Promise<Response> {
  const originalHostname = new URL(url).hostname;
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
      const next = new URL(location, target);
      // Don't hand the token over cleartext when leaving the original host.
      if (next.hostname !== originalHostname && next.protocol !== "https:") {
        throw new Error(
          `Refusing to forward sync credentials over non-HTTPS redirect to ${next.origin}`,
        );
      }
      if (!isTrustedSyncHost(next.hostname, originalHostname)) {
        throw new Error(
          `Refusing to forward sync credentials across redirect to untrusted host ${next.hostname}`,
        );
      }
      target = next.toString();
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

  // Un deployment que no es producción no le escribe a la hoja viva. Ver
  // `_lib/destinoEscritura.ts`: el APP_URL de dev apunta a tierramadre.app, así
  // que sin esto capturar en dev toca datos reales de la operación.
  const destino = verificaDestinoDeEscritura({
    convexCloudUrl: process.env.CONVEX_CLOUD_URL,
    appUrl,
  });
  if (!destino.permitido) {
    return { ok: false, message: destino.motivo ?? "destino de escritura no permitido" };
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
