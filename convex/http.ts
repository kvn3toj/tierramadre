/**
 * Convex HTTP surface — served on `<deployment>.convex.site`.
 *
 * Single route: POST /sync/foto — the entry point the bound Apps Script calls
 * to push Fotosíntesis SOT sheet edits into Convex. Token-gated by a dedicated
 * `SHEET_SYNC_TOKEN` (least privilege: it can only trigger a pull, never write
 * Sheets — distinct from ADMIN_SYNC_TOKEN, which Convex uses to read the Vercel
 * readers). The heavy lifting lives in convex/fotoSync.ts.
 *
 * Body:
 *   { mode: "delta", deltas: { <table>: [{ key, rowIndex, colIdxs }] } }
 *   { mode: "full",  tables?: string[] }
 * If `mode` is omitted it's inferred: `deltas` present → delta, else full.
 *
 * Response: 200 { ok, mode, perTable, reviewFlags } | 401 | 400 | 500
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/** Length-checked, branch-free string compare — avoids leaking the token via
 *  early-exit timing (Convex's V8 runtime has no reliable crypto.timingSafeEqual). */
function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers":
    "content-type, x-sheet-sync-token, authorization",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

const syncFoto = httpAction(async (ctx, request) => {
  const expected = process.env.SHEET_SYNC_TOKEN;
  if (!expected)
    return json(500, { ok: false, error: "SHEET_SYNC_TOKEN not configured" });

  const header =
    request.headers.get("x-sheet-sync-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!header || !tokensMatch(header, expected)) {
    return json(401, { ok: false, error: "Unauthorized" });
  }

  let body: {
    mode?: string;
    deltas?: Record<
      string,
      Array<{ key: string; rowIndex: number; colIdxs: number[] }>
    >;
    tables?: string[];
  };
  try {
    body = (await request.json()) ?? {};
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const mode = body.mode ?? (body.deltas ? "delta" : "full");

  try {
    if (mode === "delta") {
      const result = await ctx.runAction(internal.fotoSync.runDelta, {
        deltas: body.deltas ?? {},
      });
      return json(200, { ok: true, ...result });
    }
    if (mode === "full") {
      const result = await ctx.runAction(internal.fotoSync.runFull, {
        tables: body.tables,
      });
      return json(200, { ok: true, ...result });
    }
    return json(400, { ok: false, error: `Unknown mode "${mode}"` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, { ok: false, error: msg });
  }
});

const corsPreflight = httpAction(
  async () => new Response(null, { status: 204, headers: CORS }),
);

const http = httpRouter();
http.route({ path: "/sync/foto", method: "POST", handler: syncFoto });
http.route({ path: "/sync/foto", method: "OPTIONS", handler: corsPreflight });

export default http;
