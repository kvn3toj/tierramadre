/**
 * Fotosynthia · streaming Groq proxy
 *
 * POST /api/fotosintesis-ai
 *   body: {
 *     messages: { role: 'user' | 'assistant'; content: string }[],
 *     snapshot: WorkspaceSnapshot,                  // built by Convex query
 *     route: string,                                // current admin pathname
 *     userEmail?: string, userName?: string,
 *     threadId: string,
 *     model?: string,                               // override default
 *   }
 *   response: text/event-stream
 *     data: {"delta":"..."}
 *     data: {"done":true,"model":"...","finishReason":"stop"}
 *
 * Server-side `GROQ_API_KEY` (no VITE_ prefix) is the only required env.
 * Falls back to a friendly error stream if missing, so the UI keeps
 * working in dev without secrets configured.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_MODEL =
  process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Very small in-memory rate limit. Resets when the Fluid Compute instance
// is recycled, which is fine for an internal admin tool. Keyed by IP +
// userEmail, capped at 30 requests per rolling minute.
const rateBuckets = new Map<string, number[]>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(key) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (bucket.length >= RATE_LIMIT) {
    rateBuckets.set(key, bucket);
    return true;
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);
  return false;
}

const SYSTEM_PROMPT = `Eres Fotosynthia, la copiloto del taller Fotosíntesis de Tierra Madre.
Hablas en español de Colombia, con un tono cálido pero preciso — eres parte del atelier, no una herramienta externa.

Vocabulario obligatorio:
- "lote" (B-NNN): contenedor de gemas/joyas/insumos comprado a un proveedor.
- "ítem": gema, joya o insumo dentro de un lote.
- "captura": el flujo de registrar fotos + peso + preponderancia ítem por ítem.
- "Kardex": el comprobante en papel que se entrega al cerrar una venta.
- "esmereogénesis": forma de pago propia donde el comprador trae una esmeralda como parte del intercambio.
- "embajador" / "asesor": cliente B2B que invita a clientes finales (sistema de invitaciones).
- "cliente final": comprador directo, sin red.
- "preponderancia": % del costo total del lote que asigna cada ítem. Debe sumar 100%.

Reglas:
1. Si el usuario pregunta algo que se responde con los datos del snapshot, usa cifras concretas (no aproximes).
2. Si no tienes la información en el snapshot, dilo claramente — sugiere dónde mirarla (ej. "abre el lote B-008 para ver sus ítems").
3. Sé corta: 2-4 frases por respuesta salvo que se pida explicación larga.
4. Nunca inventes IDs, totales o nombres. Si dudas, pídelos.
5. Cuando expliques el flujo Fotosíntesis, sigue el orden canónico: inicio → compra → captura → cierre → spotlight → venta → directorio.
6. Si detectas un error de sincronización (syncStatus: "error"), menciónalo proactivamente.

Estás dentro de un drawer flotante en /admin/fotosintesis/*; Maritza (administradora del taller) es tu interlocutora principal.`;

function snapshotToContext(snapshot: unknown, route: string): string {
  return [
    `Contexto vivo del atelier (generado ahora; usa cifras tal cual):`,
    `Ruta actual: ${route}`,
    `Snapshot JSON: ${JSON.stringify(snapshot)}`,
  ].join("\n");
}

function sseWrite(res: VercelResponse, data: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamGroq(
  res: VercelResponse,
  body: {
    messages: Array<{ role: string; content: string }>;
    model: string;
    apiKey: string;
  },
): Promise<{ fullText: string; finishReason: string }> {
  const upstream = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${body.apiKey}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      temperature: 0.4,
      max_tokens: 768,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    sseWrite(res, {
      error: `Groq respondió ${upstream.status}: ${text.slice(0, 200)}`,
    });
    return { fullText: "", finishReason: "error" };
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let finishReason = "stop";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by \n\n. Process whole frames; keep tail.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") {
        return { fullText, finishReason };
      }
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{
            delta?: { content?: string };
            finish_reason?: string | null;
          }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        const fr = parsed.choices?.[0]?.finish_reason;
        if (delta) {
          fullText += delta;
          sseWrite(res, { delta });
        }
        if (fr) finishReason = fr;
      } catch {
        // Ignore non-JSON keepalive frames.
      }
    }
  }
  return { fullText, finishReason };
}

async function recordSummaryToConvex(args: {
  threadId: string;
  userEmail: string;
  userName?: string;
  routeAtStart: string;
  routeLatest: string;
  summary: string;
  turnCount: number;
  model: string;
}): Promise<void> {
  const convexUrl = process.env.CONVEX_URL?.trim();
  if (!convexUrl) return;
  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const { api } = await import("../convex/_generated/api.js");
    const client = new ConvexHttpClient(convexUrl);
    // Casting through unknown because the generated `api` doesn't yet
    // include fotosintesisAi until `convex dev` runs; treating defensively.
    const ref = (
      api as unknown as { fotosintesisAi?: { recordSummary?: unknown } }
    ).fotosintesisAi?.recordSummary;
    if (!ref) return;
    await client.mutation(ref as never, args as never);
  } catch (err) {
    console.warn("[fotosintesis-ai] recordSummary failed:", err);
  }
}

function buildSummary(
  history: Array<{ role: string; content: string }>,
  lastAssistant: string,
): string {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const userPart = lastUser?.content
    ? lastUser.content.slice(0, 140).replace(/\s+/g, " ").trim()
    : "(sin pregunta)";
  const aiPart = lastAssistant
    ? lastAssistant.slice(0, 160).replace(/\s+/g, " ").trim()
    : "(sin respuesta)";
  return `P: ${userPart} · R: ${aiPart}`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // CORS — same pattern as the rest of /api.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey =
    process.env.GROQ_API_KEY?.trim() ||
    process.env.VITE_GROQ_API_KEY?.trim() ||
    "";
  if (!apiKey) {
    res.status(503).json({
      error:
        "GROQ_API_KEY no configurado en el servidor. Define la variable en Vercel.",
    });
    return;
  }

  const body = (req.body ?? {}) as {
    messages?: Array<{ role: string; content: string }>;
    snapshot?: unknown;
    route?: string;
    userEmail?: string;
    userName?: string;
    threadId?: string;
    routeAtStart?: string;
    model?: string;
  };

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    res.status(400).json({ error: "messages requerido" });
    return;
  }

  const route = body.route ?? "/admin/fotosintesis";
  const threadId = body.threadId ?? `anon-${Date.now()}`;
  const userEmail = body.userEmail?.toLowerCase().trim() ?? "anon@local";
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ?? "unknown";
  if (isRateLimited(`${ip}:${userEmail}`)) {
    res.status(429).json({
      error:
        "Demasiadas consultas en poco tiempo. Espera unos segundos y vuelve a intentar.",
    });
    return;
  }

  const model = body.model?.trim() || DEFAULT_MODEL;

  // Compose the prompt: persona system + live context + history.
  const fullMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: snapshotToContext(body.snapshot, route) },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    })),
  ];

  // Open the SSE stream.
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  // Flush headers explicitly so the browser starts reading.
  if (
    typeof (res as { flushHeaders?: () => void }).flushHeaders === "function"
  ) {
    (res as { flushHeaders: () => void }).flushHeaders();
  }

  const { fullText, finishReason } = await streamGroq(res, {
    messages: fullMessages,
    model,
    apiKey,
  });

  sseWrite(res, { done: true, model, finishReason });
  res.end();

  // Fire-and-forget summary write. We intentionally don't await before
  // closing the stream so the user doesn't notice the round-trip.
  void recordSummaryToConvex({
    threadId,
    userEmail,
    userName: body.userName,
    routeAtStart: body.routeAtStart ?? route,
    routeLatest: route,
    summary: buildSummary(messages, fullText),
    turnCount: messages.filter((m) => m.role === "user").length,
    model,
  });
}

export const config = {
  maxDuration: 60,
};
