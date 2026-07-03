/**
 * LLM signal extraction for the GHL conversation-analysis backfill.
 *
 * Ports the guided/structured-output path of `api/fotosintesis-ai.ts` into a
 * standalone, dependency-free, injectable-fetch module the analysis script can
 * import. Two OpenAI-compatible providers: Groq (`llama-3.1-8b-instant`,
 * `response_format: json_object`) as primary, the Vercel AI Gateway
 * (`google/gemini-2.5-flash-lite`, no `response_format` — Vertex rejects it as a
 * 400) as spillover.
 *
 * Failover model (single attempt per provider): a transcript makes ONE request
 * per provider. On a retryable status (429/5xx) OR a JSON parse failure we fail
 * OVER to the next provider rather than retrying the same one, so a Groq 429
 * lands on the gateway instead of burning three Groq attempts. We throw only
 * once every provider is exhausted.
 */

// OpenAI-compatible chat-completions endpoints (verbatim from
// api/fotosintesis-ai.ts:412-413).
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

// Small, fast, cheap defaults — the task is short Spanish chat + structured JSON
// extraction, plenty for an 8B / Flash-Lite class model.
const GROQ_MODEL = "llama-3.1-8b-instant";
const GATEWAY_MODEL = "google/gemini-2.5-flash-lite";

// Upstream statuses worth failing over on: rate limits (429) and transient
// gateway/provider hiccups (5xx). Anything else (4xx auth/validation) is
// permanent — we still try the next provider (a different key/endpoint may
// succeed) but classify it as such in the surfaced error. (api/fotosintesis-ai.ts:445)
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Injectable fetch. Its shape mirrors the subset of the WHATWG `Response` the
 * extractor consumes, so tests can hand in a `vi.fn()` and production can pass
 * (or default to) the global `fetch`.
 */
export type LlmFetch = (
  url: string,
  init: any,
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(k: string): string | null };
  json(): Promise<any>;
  text(): Promise<string>;
}>;

export interface ExtractSignalsOptions {
  groqKey?: string;
  gatewayKey?: string;
  fetchImpl?: LlmFetch;
}

/**
 * Pull a JSON object out of a model reply that may wrap it in ```json fences or
 * surrounding prose (Gemini, without json_object mode, sometimes does). Falls
 * back to the raw text so the existing try/catch can degrade gracefully.
 *
 * Copied verbatim from api/fotosintesis-ai.ts:541-549.
 */
export function extractJsonObject(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last > first) t = t.slice(first, last + 1);
  return t;
}

interface Provider {
  url: string;
  apiKey: string;
  model: string;
  /** Send OpenAI's `response_format: {type:"json_object"}`? Groq yes; the
   *  gateway (Vertex/Gemini) rejects it with a 400, so no. */
  jsonMode: boolean;
  label: "groq" | "gateway";
}

/**
 * Ordered provider list: Groq FIRST when a Groq key is present (its json_object
 * mode gives the cleanest structured output), the gateway as spillover.
 */
function resolveProviders(opts: ExtractSignalsOptions): Provider[] {
  const providers: Provider[] = [];
  if (opts.groqKey) {
    providers.push({
      url: GROQ_URL,
      apiKey: opts.groqKey,
      model: GROQ_MODEL,
      jsonMode: true,
      label: "groq",
    });
  }
  if (opts.gatewayKey) {
    providers.push({
      url: GATEWAY_URL,
      apiKey: opts.gatewayKey,
      model: GATEWAY_MODEL,
      jsonMode: false,
      label: "gateway",
    });
  }
  return providers;
}

// The exact `ExtractionRow.signals` shape the model must return, plus the two
// `__`-prefixed extras the analysis script reads alongside the signals
// (`__channel` defaults to "unknown" if omitted; `__tipo_evidence` feeds the
// tipo_interes review report). Every graded field is
// `{ value, confidence, evidence }`; `value` is null when unsure.
const SIGNALS_SHAPE = `{
  "tipo_interes": { "value": "topito|candonga|anillo|dije|gema_suelta|set|otro|null", "confidence": 0.0, "evidence": "cita textual del cliente" },
  "presupuesto_cop": { "value": <número en COP o null>, "confidence": 0.0, "evidence": "cita textual" },
  "ocasion": { "value": "regalo|cumpleanos|aniversario|matrimonio|diario|inversion|evento-especial|null", "confidence": 0.0, "evidence": "cita textual" },
  "ciudad": { "value": "<ciudad o null>", "confidence": 0.0, "evidence": "cita textual" },
  "conocimiento": { "value": "novato|intermedio|experto|null", "confidence": 0.0, "evidence": "cita textual" },
  "urgencia": { "value": "alta|media|baja|null", "confidence": 0.0, "evidence": "cita textual" },
  "products_shown": { "value": <true|false>, "evidence": "cita textual" },
  "sentiment": { "value": "interesado|sensible-precio|frustrado|listo-comprar|indeciso|null", "confidence": 0.0, "evidence": "cita textual" },
  "objeciones": ["texto de cada objeción"],
  "outcome": "sin-respuesta-negocio|respondido-sin-cierre|pidio-humano|compro|fantasma",
  "__channel": "whatsapp|instagram|tiktok|web|evento|unknown",
  "__tipo_evidence": { "asked_for_plain": "lo que pidió el cliente, en sus palabras", "maps_to_categoria_hint": "categoría del catálogo sugerida" }
}`;

const SYSTEM_PROMPT = `Eres un analista. Extrae SOLO JSON con la forma de signals dada. Cita evidencia textual (campo evidence) y usa null cuando no estés seguro. No inventes valores.

Devuelve exactamente estas llaves, en un único objeto JSON (sin texto adicional):
${SIGNALS_SHAPE}`;

/** Build the OpenAI-compatible chat-completions request for one provider. */
function buildRequestInit(provider: Provider, transcript: string) {
  const body: Record<string, unknown> = {
    model: provider.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ],
    temperature: 0,
  };
  // Groq/Llama supports json_object mode (forces clean JSON); the gateway
  // (Vertex/Gemini) rejects it with a 400, so it's Groq-only.
  if (provider.jsonMode) {
    body.response_format = { type: "json_object" };
  }
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Extract funnel signals from a conversation transcript. Groq primary, gateway
 * spillover; one attempt per provider, failing over on a retryable status or a
 * JSON parse failure, throwing only when every provider is exhausted.
 *
 * Returns the parsed model object directly (top-level `tipo_interes`, `ocasion`,
 * … plus `__channel` / `__tipo_evidence`).
 */
export async function extractSignals(
  transcript: string,
  opts: ExtractSignalsOptions,
): Promise<any> {
  // Injectable — never touch the global fetch directly.
  const fetchImpl: LlmFetch =
    opts.fetchImpl ?? (globalThis.fetch as unknown as LlmFetch);
  const providers = resolveProviders(opts);
  if (providers.length === 0) {
    throw new Error(
      "extractSignals: no LLM provider key supplied (need groqKey and/or gatewayKey)",
    );
  }

  let lastError: unknown = new Error("extractSignals: all providers failed");

  for (const provider of providers) {
    let res: Awaited<ReturnType<LlmFetch>>;
    try {
      res = await fetchImpl(
        provider.url,
        buildRequestInit(provider, transcript),
      );
    } catch (err) {
      // Network-level throw — fail over to the next provider.
      lastError = err;
      continue;
    }

    if (!res.ok) {
      const kind = RETRYABLE_STATUS.has(res.status) ? "transient" : "permanent";
      lastError = new Error(
        `extractSignals: ${provider.label} ${kind} upstream error (HTTP ${res.status})`,
      );
      continue;
    }

    // OK response — parse the reply. A malformed body fails over too.
    try {
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      return JSON.parse(extractJsonObject(content));
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError;
}
