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

  /**
   * Un error por tabla NO puede viajar dentro de un 200.
   *
   * `runDelta` y `runFull` atrapan el fallo de cada tabla y lo guardan en
   * `perTable[tabla].error`, y después devuelven normalmente. Envuelto en un
   * `json(200, { ok: true, ... })`, el resultado era que aunque fallaran TODAS
   * las tablas el Apps Script recibía un 200 — y su contrato es explícito:
   * `callConvex` sólo lanza fuera del rango 2xx, y sólo cuando lanza el
   * `catch` hace `clearFlushToken` y conserva la cola para reintentar. Con
   * 200, en cambio, borra las filas enviadas y muestra «✅».
   *
   * La cola es el ÚNICO registro de qué celdas se tocaron, y los tres crones
   * de reconciliación están apagados (medido 2026-09-04), así que no había
   * respaldo: la edición se perdía para siempre, en silencio.
   *
   * 502 y no 207: el 207 es semánticamente más preciso para un éxito parcial,
   * pero está dentro de 2xx, así que el script NO lanzaría y borraría la cola
   * igual. Hace falta un código ≥300 para que el contrato existente reintente.
   *
   * Se conserva el cuerpo entero (`perTable`, `reviewFlags`) para que el log y
   * el toast digan QUÉ tabla falló, no sólo que algo falló. Reintentar una
   * tabla que sí había sincronizado es inofensivo — el upsert es idempotente —
   * y es infinitamente preferible a perder la edición.
   */
  const tablasConError = (r: unknown): string[] => {
    const per = (r as { perTable?: Record<string, { error?: string }> })
      ?.perTable;
    if (!per) return [];
    return Object.entries(per)
      .filter(([, v]) => v && typeof v.error === "string" && v.error)
      .map(([t, v]) => `${t}: ${v.error}`);
  };

  try {
    if (mode === "delta") {
      const result = await ctx.runAction(internal.fotoSync.runDelta, {
        deltas: body.deltas ?? {},
      });
      const fallidas = tablasConError(result);
      if (fallidas.length) {
        return json(502, {
          ok: false,
          error: `Tablas con error: ${fallidas.join(" · ")}`,
          ...result,
        });
      }
      return json(200, { ok: true, ...result });
    }
    if (mode === "full") {
      const result = await ctx.runAction(internal.fotoSync.runFull, {
        tables: body.tables,
      });
      const fallidas = tablasConError(result);
      if (fallidas.length) {
        return json(502, {
          ok: false,
          error: `Tablas con error: ${fallidas.join(" · ")}`,
          ...result,
        });
      }
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
