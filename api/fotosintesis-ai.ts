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
import {
  buildActionCatalogText,
  buildFlowSchemaText,
  buildNavCatalogText,
  coerceVocabulary,
  computeMissing,
  hardenAction,
  isGuidedFlow,
  resolveNavigate,
  whitelistDraft,
  type GuidedDraft,
  type GuidedEnvelope,
  type GuidedFlow,
} from "../src/pages/admin/Fotosintesis/copilot/flowSchemas.js";
import type { AccessLevel } from "../src/types/auth.js";

const ACCESS_LEVELS = [
  "guest",
  "asesor",
  "embajador",
  "admin",
  "provider",
] as const;

/**
 * Coerce the caller-supplied role. UNTRUSTED — used ONLY to scope the navigation
 * catalog the model sees; the binding role gate lives client-side + in the route
 * guards. Defaults to "admin" (the only surface that reaches this endpoint today).
 */
function asAccessLevel(value: unknown): AccessLevel {
  return typeof value === "string" &&
    (ACCESS_LEVELS as readonly string[]).includes(value)
    ? (value as AccessLevel)
    : "admin";
}

/** Authoritative params the server already knows, e.g. the lote in the active route. */
function extractServerParams(loteContext: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (loteContext && typeof loteContext === "object") {
    const id = (loteContext as Record<string, unknown>).loteId;
    if (typeof id === "string" && id.trim()) out.loteId = id.trim();
  }
  return out;
}

const DEFAULT_MODEL =
  process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEFAULT_GATEWAY_MODEL = "google/gemini-2.5-flash";

/**
 * Pick the upstream for the GUIDED / commit path. The advisory streaming path
 * stays on Groq (lowest latency for chat). For guided capture + executable
 * actions we prefer the Vercel AI Gateway (Gemini via BYOK → near-free, strong
 * structured output), falling back to Groq. All overridable by env:
 *   FOTOSINTESIS_AI_PROVIDER = gateway | groq | auto (default auto → gateway if keyed)
 *   FOTOSINTESIS_AI_MODEL    = explicit model id (e.g. google/gemini-2.5-flash)
 *   AI_GATEWAY_API_KEY       = the gateway key (BYOK rides Google's free tier, zero markup)
 * The gateway is OpenAI-compatible (/v1/chat/completions, Bearer auth,
 * response_format json_object), so the existing fetch shape is unchanged.
 */
function resolveGuidedTarget(): {
  url: string;
  apiKey: string;
  model: string;
} | null {
  const provider = (
    process.env.FOTOSINTESIS_AI_PROVIDER || "auto"
  ).toLowerCase();
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim() || "";
  const groqKey =
    process.env.GROQ_API_KEY?.trim() ||
    process.env.VITE_GROQ_API_KEY?.trim() ||
    "";
  const explicitModel = process.env.FOTOSINTESIS_AI_MODEL?.trim();
  const wantGateway =
    gatewayKey && (provider === "gateway" || provider === "auto");
  if (wantGateway) {
    return {
      url: GATEWAY_URL,
      apiKey: gatewayKey,
      model: explicitModel || DEFAULT_GATEWAY_MODEL,
    };
  }
  if (groqKey) {
    return {
      url: GROQ_URL,
      apiKey: groqKey,
      model: explicitModel || DEFAULT_MODEL,
    };
  }
  return null;
}

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

// ─── Guided data-entry mode (Fotosynthia v2) ─────────────────────────
//
// One non-streaming JSON round-trip per turn. The model classifies the
// admin's intent into a flow, accumulates a typed draft, and asks only the
// fields it can't infer. The SERVER is the authority: it whitelists keys,
// coerces vocabularies, and RECOMPUTES missing/ready (the model never
// self-certifies completeness). No mutation is ever called here — the
// envelope only pre-fills a form the human reviews and saves.

function buildGuidedSystemPrompt(accessLevel: AccessLevel): string {
  return `Eres Fotosynthia, la copiloto de captura del taller Fotosíntesis de Tierra Madre.
Tu trabajo AHORA es guiar a Maritza para registrar o editar datos: ella dice en lenguaje natural qué quiere y tú conduces una entrevista corta, preguntando SOLO lo que falta. Hablas español de Colombia, cálida y precisa.

DEVUELVE SIEMPRE un único objeto JSON válido (sin texto fuera del JSON) con esta forma exacta:
{"flow": "<flujo>", "say": "<1-3 frases: tu siguiente pregunta o confirmación>", "draft": {<campos recolectados>}, "missing": ["<campos que faltan>"], "ready": false}

${buildFlowSchemaText()}

REGLAS:
1. En el primer turno, clasifica la intención en UN flujo. Si es ambiguo, usa flow="advisory", haz UNA pregunta para desambiguar y deja draft vacío.
2. Aplica los defaults indicados SIN preguntarlos. No vuelvas a pedir nada que ya esté en el borrador acumulado, en el snapshot o en el lote activo.
3. Pregunta máximo 1-2 campos por turno, los más bloqueantes primero. Pon en "missing" los campos obligatorios que aún faltan.
4. En los campos con vocabulario controlado usa SOLO esos valores; si Maritza dice algo parecido, mapéalo al valor canónico.
5. NUNCA inventes IDs (de ítem, proveedor, cliente o lote). Para editar o referenciar un ítem usa "itemHint" con el nombre o descripción que Maritza YA mencionó (ej. "la esmeralda de Chivor" → itemHint: "Chivor"); NO se lo vuelvas a preguntar si ya lo describió. El sistema resuelve el itemHint al ítem real.
6. NUNCA incluyas "preponderancia" ni fotos en edit-existing ni batch-edit. En captura de ítems, la preponderancia es el % del costo del lote (entre todos los ítems debe sumar 100%): pídela.
7. Cuando tengas todos los obligatorios, pon ready=true y confirma brevemente en "say" qué vas a precargar; recuerda a Maritza que arrastre la foto antes de guardar si aplica.
8. Si es una pregunta informativa (no captura), usa flow="advisory" y responde en "say" con datos concretos del snapshot.
9. loteId (solo en captura de ítems): inclúyelo SOLO si Maritza nombra el lote explícitamente (ej. "B-008"); si no, déjalo vacío y se usa el lote abierto actual.
10. "sede"/"bóveda" es el ALMACÉN donde se guarda (B=Bogotá, C=Cali, S=Secreta, M=Marketing), NO la mina; si no la dicen, pregúntala. En cambio "mina" (lote) y "procedencia" (gema) son el ORIGEN de la esmeralda (Muzo, Coscuez, Chivor, Boyacá, Gachalá…): captúralos cuando digan "de <lugar>" y JAMÁS los confundas con la sede.
11. "peso" es texto con unidad (ej. "3.2 ct", "5 gr", o "Plata"/"fragmento").
12. NAVEGACIÓN (opcional, ADICIONAL a "say"): si Maritza pide IR / abrir / mostrar una pantalla ("llévame a analytics", "abrí el lote B-001", "muéstrame el directorio"), agrega al JSON un campo "navigate": {"routeId":"<id del catálogo>","label":"<nombre de la pantalla>","params":{...si aplica},"reason":"<1 frase: por qué>"}. Usa SOLO un routeId del catálogo de abajo; NUNCA inventes id ni ruta. Para pantallas con parámetro pon en "params" el dato textual que Maritza dijo (ej. {"loteId":"B-001"} o {"itemId":"Chivor"}) — el sistema lo resuelve al ID real. Podés navegar y además responder/preguntar en "say". Si es solo una pregunta informativa, NO incluyas navigate.

${buildNavCatalogText(accessLevel)}

${buildActionCatalogText(accessLevel)}

Responde únicamente con JSON.`;
}

function snapshotToGuidedContext(
  snapshot: unknown,
  route: string,
  flow: string | undefined,
  priorDraft: unknown,
  loteContext: unknown,
  candidateItems: unknown,
): string {
  const priorKeys =
    priorDraft && typeof priorDraft === "object"
      ? Object.keys(priorDraft as Record<string, unknown>).length
      : 0;
  return [
    "Contexto vivo del atelier (úsalo para inferir y NO volver a preguntar):",
    `Ruta actual: ${route}`,
    flow && isGuidedFlow(flow)
      ? `Flujo en curso (no lo cambies salvo que Maritza pida claramente otra cosa): ${flow}`
      : "Aún sin flujo definido: clasifícalo en este turno.",
    priorKeys > 0
      ? `Borrador acumulado (continúa desde aquí, no repreguntes lo que ya está): ${JSON.stringify(priorDraft).slice(0, 2000)}`
      : "",
    loteContext
      ? `Lote activo: ${JSON.stringify(loteContext)}`
      : "Sin lote activo en la ruta.",
    Array.isArray(candidateItems) && candidateItems.length > 0
      ? `Ítems candidatos (para que el sistema resuelva itemHint→itemId; tú solo da el itemHint): ${JSON.stringify(candidateItems).slice(0, 1500)}`
      : "",
    `Snapshot JSON: ${JSON.stringify(snapshot).slice(0, 3000)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function advisoryFallback(say: string, model: string): GuidedEnvelope {
  return {
    flow: "advisory",
    say,
    draft: {},
    missing: [],
    ready: false,
    coercedKeys: [],
    model,
  };
}

async function buildGuidedEnvelope(args: {
  messages: Array<{ role: string; content: string }>;
  model: string;
  apiKey: string;
  url: string;
  snapshot: unknown;
  route: string;
  flow: string | undefined;
  priorDraft: unknown;
  loteContext: unknown;
  candidateItems: unknown;
  accessLevel: AccessLevel;
}): Promise<GuidedEnvelope> {
  const fullMessages = [
    { role: "system", content: buildGuidedSystemPrompt(args.accessLevel) },
    {
      role: "system",
      content: snapshotToGuidedContext(
        args.snapshot,
        args.route,
        args.flow,
        args.priorDraft,
        args.loteContext,
        args.candidateItems,
      ),
    },
    ...args.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    })),
  ];

  let parsed: Record<string, unknown> | null = null;
  let rawText = "";
  try {
    const upstream = await fetch(args.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify({
        model: args.model,
        messages: fullMessages,
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });
    if (!upstream.ok) {
      return advisoryFallback(
        `Groq respondió ${upstream.status}. Intentá de nuevo en un momento.`,
        args.model,
      );
    }
    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    rawText = data.choices?.[0]?.message?.content ?? "";
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    // A schema miss or upstream error degrades to a normal advisory bubble —
    // the chat never breaks on malformed JSON.
    return advisoryFallback(
      rawText.trim()
        ? rawText.trim().slice(0, 400)
        : "No te entendí bien, ¿me lo repetís?",
      args.model,
    );
  }

  const modelFlow = isGuidedFlow(parsed?.flow) ? parsed.flow : null;
  const priorFlow = isGuidedFlow(args.flow) ? args.flow : null;
  const flow: GuidedFlow = modelFlow ?? priorFlow ?? "advisory";

  const say =
    typeof parsed?.say === "string" && parsed.say.trim()
      ? parsed.say.trim()
      : flow === "advisory"
        ? "¿En qué te ayudo?"
        : "Seguimos.";

  const rawDraft =
    parsed?.draft && typeof parsed.draft === "object"
      ? (parsed.draft as GuidedDraft)
      : {};

  // Accumulate across turns: merge the new draft over the prior one when the
  // flow is unchanged (batch-edit takes the latest edit list, not a merge).
  const carryBase: GuidedDraft =
    flow !== "batch-edit" &&
    priorFlow === flow &&
    args.priorDraft &&
    typeof args.priorDraft === "object"
      ? (args.priorDraft as GuidedDraft)
      : {};
  const mergedDraft: GuidedDraft = { ...carryBase, ...rawDraft };

  const whitelisted = whitelistDraft(flow, mergedDraft);
  const { draft: coerced, coercedKeys } = coerceVocabulary(flow, whitelisted);
  const missing = computeMissing(flow, coerced);
  const ready = flow !== "advisory" && missing.length === 0;
  const isBatch = flow === "batch-edit";

  // Validate + harden any model-proposed navigation. Role-gated server-side; the
  // client re-checks against the live session before actually routing.
  const navigate =
    resolveNavigate(
      parsed?.navigate,
      args.accessLevel,
      extractServerParams(args.loteContext),
    ) ?? undefined;

  // An executable action the model proposed this turn, hardened server-side
  // (whitelisted keys, smuggled Ids stripped, missing/ready recomputed). The
  // client renders a CommitReviewCard and commits on one operator approval.
  const action = hardenAction(parsed?.action, args.accessLevel) ?? undefined;

  return {
    flow,
    say,
    draft: isBatch ? {} : coerced,
    edits: isBatch ? (coerced.edits as GuidedEnvelope["edits"]) : undefined,
    missing,
    ready,
    coercedKeys,
    navigate,
    action,
    model: args.model,
  };
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

  // Groq key — required by the streaming advisory path (checked there). The
  // guided/commit path resolves its own target (gateway → Gemini, else Groq).
  const apiKey =
    process.env.GROQ_API_KEY?.trim() ||
    process.env.VITE_GROQ_API_KEY?.trim() ||
    "";

  const body = (req.body ?? {}) as {
    messages?: Array<{ role: string; content: string }>;
    snapshot?: unknown;
    route?: string;
    userEmail?: string;
    userName?: string;
    threadId?: string;
    routeAtStart?: string;
    model?: string;
    // Guided data-entry mode (Fotosynthia v2). Absent/"advisory" → the legacy
    // streaming Q&A path below, byte-for-byte unchanged.
    mode?: string;
    flow?: string; // flow locked in a prior turn, replayed for accumulation
    priorDraft?: unknown; // draft accumulated so far, replayed for accumulation
    loteContext?: unknown; // { loteId, costoTotalCOP, unidadesDeclaradas, prepRemaining }
    candidateItems?: unknown; // [{ itemId, nombre, loteId }] for itemHint resolution
    accessLevel?: string; // caller role — scopes the nav catalog ONLY (untrusted)
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

  // Guided data-entry mode (Fotosynthia v2): a single non-streaming JSON
  // round-trip returning the structured envelope. The advisory path below is
  // untouched.
  if (body.mode === "guided") {
    const target = resolveGuidedTarget();
    if (!target) {
      res.status(503).json({
        error:
          "Sin proveedor de IA configurado. Define AI_GATEWAY_API_KEY o GROQ_API_KEY en Vercel.",
      });
      return;
    }
    const envelope = await buildGuidedEnvelope({
      messages,
      model: body.model?.trim() || target.model,
      apiKey: target.apiKey,
      url: target.url,
      snapshot: body.snapshot,
      route,
      flow: body.flow,
      priorDraft: body.priorDraft,
      loteContext: body.loteContext,
      candidateItems: body.candidateItems,
      accessLevel: asAccessLevel(body.accessLevel),
    });
    res.status(200).json(envelope);
    void recordSummaryToConvex({
      threadId,
      userEmail,
      userName: body.userName,
      routeAtStart: body.routeAtStart ?? route,
      routeLatest: route,
      summary: buildSummary(messages, envelope.say),
      turnCount: messages.filter((m) => m.role === "user").length,
      model,
    });
    return;
  }

  // Streaming advisory path requires the Groq key.
  if (!apiKey) {
    res.status(503).json({
      error:
        "GROQ_API_KEY no configurado en el servidor. Define la variable en Vercel.",
    });
    return;
  }

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
