/**
 * Lightweight client-side instrumentation for the Fotosíntesis sale flow.
 *
 * Slice 3 chains five external operations after `sales.create`: carnet
 * generation, carnet upload to Drive, `setCarnetUrl`, certificado generation
 * + upload (gated), and an optional buyer email. When something silently
 * misbehaves in production we want a breadcrumb trail in DevTools that
 * Maritza can screenshot if she pings us. This module is intentionally
 * console-only — no Datadog/Sentry SDK. If a real observability backend
 * lands later, the call sites only need to switch this helper's transport.
 *
 * Usage:
 *   const finish = beginStage("upload-carnet", { saleId });
 *   try { ...work... finish.ok({ bytes: blob.size }); }
 *   catch (err) { finish.fail(err); throw err; }
 */

type LogContext = Record<string, unknown>;

const PREFIX = "[Slice3:venta]";

function timestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

export function logStage(stage: string, context?: LogContext): void {
  if (typeof console === "undefined") return;
  console.info(`${PREFIX} ${timestamp()} · ${stage}`, context ?? {});
}

export function logFailure(
  stage: string,
  err: unknown,
  context?: LogContext,
): void {
  if (typeof console === "undefined") return;
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${PREFIX} ${timestamp()} · ${stage} · FAILED`, {
    ...(context ?? {}),
    error: message,
  });
}

export interface StageHandle {
  ok: (context?: LogContext) => void;
  fail: (err: unknown, context?: LogContext) => void;
}

export function beginStage(stage: string, context?: LogContext): StageHandle {
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  logStage(`${stage}:start`, context);
  return {
    ok(extra?: LogContext) {
      const elapsed =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        startedAt;
      logStage(`${stage}:done`, {
        ...(context ?? {}),
        ...(extra ?? {}),
        ms: Math.round(elapsed),
      });
    },
    fail(err: unknown, extra?: LogContext) {
      const elapsed =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        startedAt;
      logFailure(stage, err, {
        ...(context ?? {}),
        ...(extra ?? {}),
        ms: Math.round(elapsed),
      });
    },
  };
}
