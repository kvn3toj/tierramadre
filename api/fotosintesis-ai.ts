/**
 * Fotosynthia · streaming AI proxy (gateway → Groq fallback)
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
 * Both paths (advisory stream + guided JSON) resolve targets in this order:
 *   1. Vercel AI Gateway  → google/gemini-2.5-flash-lite  (AI_GATEWAY_API_KEY)
 *   2. Groq               → llama-3.1-8b-instant           (GROQ_API_KEY)
 * Either key alone is enough; with both, a 429 on the first falls through to
 * the second. All overridable via FOTOSINTESIS_AI_* / GROQ_MODEL env.
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
import {
  getSheetsClient,
  FOTOSINTESIS_SPREADSHEET_ID,
  SPREADSHEET_ID as TREASURE_SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
} from "./_lib/index.js";

// ─── Sheet-side item catalog (server-side cache) ──────────────────────────────
// Reads the Fotosíntesis SOT Inventario tab and the legacy Treasure sheet once
// per warm Vercel instance (TTL 5 min). Supplements the Convex candidateItems
// cap so item references that fall outside the 500-row window still resolve.

interface SheetItem {
  itemId: string;
  nombre: string;
  loteId?: string;
  estado?: string;
}

interface SheetCache {
  fotoItems: SheetItem[];   // from FOTOSINTESIS_SPREADSHEET_ID Inventario
  treasureItems: SheetItem[]; // from legacy SPREADSHEET_ID Inventario (available only)
  at: number;
}

let _sheetCache: SheetCache | null = null;
const SHEET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadSheetCache(): Promise<SheetCache> {
  const now = Date.now();
  if (_sheetCache && now - _sheetCache.at < SHEET_CACHE_TTL) return _sheetCache;

  const sheets = getSheetsClient();

  async function readInventario(
    spreadsheetId: string,
    availableOnly: boolean,
  ): Promise<SheetItem[]> {
    try {
      const names = await getSheetNames(sheets, spreadsheetId);
      const tab = findSheetByPattern(names, ["inventario", "inventory"]);
      if (!tab) return [];
      // Read columns A (itemId), C (nombre), O or Q (estado), X (loteId).
      // We use a broad A:X range and pick the columns we need.
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${tab}'!A:X`,
      });
      const rows: unknown[][] = (resp.data.values ?? []) as unknown[][];
      if (rows.length <= 1) return [];
      // Detect column positions from header row
      const header = (rows[0] ?? []).map((c) =>
        String(c ?? "").toLowerCase().trim(),
      );
      const colItem = header.findIndex((h) => h === "item");
      const colNombre = header.findIndex(
        (h) => h === "nombre" || h === "name",
      );
      // estado may be "estado", "o" header, etc. — look broadly
      const colEstado = header.findIndex(
        (h) => h === "estado" || h === "estado asesor" || h === "o" || h === "q",
      );
      const colLote = header.findIndex(
        (h) => h === "loteid" || h === "lote id" || h === "lote",
      );
      if (colItem === -1) return [];

      const items: SheetItem[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] ?? [];
        const itemId = String(row[colItem] ?? "").trim();
        if (!itemId) continue;
        const nombre = colNombre >= 0 ? String(row[colNombre] ?? "").trim() : "";
        const estado = colEstado >= 0 ? String(row[colEstado] ?? "").trim() : "";
        const loteId = colLote >= 0 ? String(row[colLote] ?? "").trim() : "";
        if (availableOnly) {
          const lower = estado.toLowerCase();
          if (
            lower &&
            !lower.includes("disponible") &&
            !lower.includes("available") &&
            !lower.includes("en stock")
          )
            continue;
        }
        items.push({
          itemId,
          nombre,
          ...(loteId ? { loteId } : {}),
          ...(estado ? { estado } : {}),
        });
      }
      return items;
    } catch {
      return [];
    }
  }

  const [fotoItems, treasureItems] = await Promise.all([
    readInventario(FOTOSINTESIS_SPREADSHEET_ID, false),
    readInventario(TREASURE_SPREADSHEET_ID, true),
  ]);

  _sheetCache = { fotoItems, treasureItems, at: now };
  return _sheetCache;
}

/**
 * Merge Convex candidateItems with the full sheet catalog.
 * Convex items take precedence (they may carry richer loteId data from the
 * reactive sync). Sheet items only fill gaps beyond the Convex scan cap.
 */
async function enrichCandidateItems(
  convexItems: unknown,
): Promise<SheetItem[]> {
  const base: SheetItem[] = Array.isArray(convexItems)
    ? (convexItems as SheetItem[])
    : [];
  try {
    const cache = await loadSheetCache();
    const seen = new Set(base.map((i) => i.itemId));
    const extras = cache.fotoItems.filter((i) => !seen.has(i.itemId));
    return [...base, ...extras];
  } catch {
    return base;
  }
}

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

// Small, fast, cheap models by default. The task is short Spanish chat +
// structured JSON extraction — an 8B / Flash-Lite class model is plenty and
// has far higher free-tier limits than the old 70B / full-Flash pair, which is
// what was tripping the "modelo saturado" 429s. Override per-env if needed.
const DEFAULT_MODEL =
  process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEFAULT_GATEWAY_MODEL = "google/gemini-2.5-flash-lite";

interface GuidedTarget {
  url: string;
  apiKey: string;
  model: string;
  /**
   * Whether to send OpenAI's `response_format: { type: "json_object" }`. Groq /
   * Llama supports it (forces clean JSON); Gemini via the gateway (Vertex)
   * REJECTS it with a 400 (`param: response_format`), so we omit it there and
   * lean on the prompt's "return only JSON" + the defensive parse below.
   */
  jsonMode: boolean;
  /** Provider label, for logs and the answered-model report. */
  label: "gateway" | "groq";
}

// Upstream statuses worth retrying: rate limits (429) and transient gateway /
// provider hiccups (5xx). Anything else (4xx auth/validation) fails fast.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * POST with exponential backoff on 429/5xx. Gemini's free tier caps at ~10
 * requests/min and 250/day; a burst over the per-minute limit returns 429 and
 * usually clears within seconds, so a few backed-off retries turn a hard error
 * into a brief wait. Honors the provider's `Retry-After` header when present.
 * The returned Response body is left UNREAD so the caller can consume it.
 */
async function fetchUpstreamWithRetry(
  url: string,
  init: RequestInit,
  opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res;
    lastRes = res;
    // No sleep after the final attempt — return the last response as-is.
    if (attempt === attempts - 1) break;
    // Prefer the provider's Retry-After (seconds), else exponential backoff.
    const retryAfter = res.headers.get("retry-after");
    let delay = baseDelayMs * 2 ** attempt; // 500 → 1000 → 2000…
    const secs = retryAfter ? Number(retryAfter) : NaN;
    if (Number.isFinite(secs) && secs > 0) delay = Math.min(secs * 1000, 8000);
    // Full jitter so concurrent callers don't retry in lockstep.
    delay = Math.round(delay / 2 + Math.random() * (delay / 2));
    // Drain the discarded body so the socket can be reused, then wait.
    await res.text().catch(() => "");
    await new Promise((r) => setTimeout(r, delay));
  }
  return lastRes as Response;
}

/**
 * Resolve the ordered list of upstreams, shared by BOTH the advisory streaming
 * path and the guided/commit path. We prefer the Vercel AI Gateway (Gemini
 * Flash-Lite → near-free on the free tier, strong structured output) and fall
 * back to Groq (llama-3.1-8b-instant) when Gemini is rate-limited/exhausted, so
 * a 429 on one provider degrades to a brief wait instead of a hard failure.
 * All overridable by env:
 *   FOTOSINTESIS_AI_PROVIDER = gateway | groq | auto (default auto → gateway, Groq fallback)
 *   FOTOSINTESIS_AI_MODEL    = explicit model id (e.g. google/gemini-2.5-flash)
 *   AI_GATEWAY_API_KEY       = the gateway key (rides Google's free tier, zero markup)
 * The gateway is OpenAI-compatible (/v1/chat/completions, Bearer auth), so the
 * fetch shape is identical across both targets.
 */
function resolveGuidedTargets(): GuidedTarget[] {
  const provider = (
    process.env.FOTOSINTESIS_AI_PROVIDER || "auto"
  ).toLowerCase();
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim() || "";
  const groqKey =
    process.env.GROQ_API_KEY?.trim() ||
    process.env.VITE_GROQ_API_KEY?.trim() ||
    "";
  const explicitModel = process.env.FOTOSINTESIS_AI_MODEL?.trim();

  const gateway: GuidedTarget | null = gatewayKey
    ? {
        url: GATEWAY_URL,
        apiKey: gatewayKey,
        model: explicitModel || DEFAULT_GATEWAY_MODEL,
        jsonMode: false,
        label: "gateway",
      }
    : null;
  const groq: GuidedTarget | null = groqKey
    ? {
        url: GROQ_URL,
        apiKey: groqKey,
        // A gateway-style id ("google/…") is invalid on Groq — only honor an
        // explicit model here when it isn't provider-namespaced.
        model:
          explicitModel && !explicitModel.includes("/")
            ? explicitModel
            : DEFAULT_MODEL,
        jsonMode: true,
        label: "groq",
      }
    : null;

  if (provider === "gateway") return gateway ? [gateway] : [];
  if (provider === "groq") return groq ? [groq] : [];
  // auto → gateway first (near-free Gemini), Groq as the rate-limit safety net.
  return [gateway, groq].filter((t): t is GuidedTarget => t !== null);
}

/**
 * Pull a JSON object out of a model reply that may wrap it in ```json fences or
 * surrounding prose (Gemini, without json_object mode, sometimes does). Falls
 * back to the raw text so the existing try/catch can degrade to an advisory.
 */
function extractJsonObject(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last > first) t = t.slice(first, last + 1);
  return t;
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

/**
 * Stream one upstream SSE response (already known to be OK) into the client
 * SSE, accumulating the full text. Both Groq and the Vercel gateway speak the
 * OpenAI streaming shape, so this is provider-agnostic.
 */
async function pipeStream(
  res: VercelResponse,
  upstream: Response,
): Promise<{ fullText: string; finishReason: string }> {
  const reader = upstream.body!.getReader();
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

/**
 * Stream the advisory reply through the FIRST available target, falling back to
 * the next on a rate-limit/unavailable status. We only switch BEFORE any bytes
 * are written to the client, so the user never sees a half-answer swap. Returns
 * the model that actually answered so the summary records the real provider.
 */
async function streamChat(
  res: VercelResponse,
  targets: GuidedTarget[],
  messages: Array<{ role: string; content: string }>,
): Promise<{ fullText: string; finishReason: string; model: string }> {
  for (let t = 0; t < targets.length; t++) {
    const target = targets[t];
    const isLast = t === targets.length - 1;
    const upstream = await fetch(target.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${target.apiKey}`,
      },
      body: JSON.stringify({
        model: target.model,
        messages,
        temperature: 0.4,
        max_tokens: 512,
        stream: true,
      }),
    });

    if (upstream.ok && upstream.body) {
      const out = await pipeStream(res, upstream);
      return { ...out, model: target.model };
    }

    const text = await upstream.text().catch(() => "");
    console.warn(
      `[fotosintesis-ai] advisory upstream ${upstream.status} via ${target.label} (${target.model}): ${text.slice(0, 300)}`,
    );
    // A rate-limited/unavailable provider falls through to the next target.
    if (!isLast && RETRYABLE_STATUS.has(upstream.status)) continue;
    if (isLast) {
      sseWrite(res, {
        error:
          upstream.status === 429
            ? "El modelo está saturado ahora mismo. Esperá unos segundos y volvé a intentar."
            : `El proveedor respondió ${upstream.status}. Intentá de nuevo en un momento.`,
      });
      return { fullText: "", finishReason: "error", model: target.model };
    }
  }
  return { fullText: "", finishReason: "error", model: DEFAULT_MODEL };
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
  treasureSummary?: string,
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
      ? `Ítems del inventario Fotosíntesis (para resolver referencias por número/nombre; da solo el itemHint y el sistema resuelve): ${JSON.stringify(candidateItems).slice(0, 3000)}`
      : "",
    treasureSummary ? `Catálogo Treasure Browser (ítems disponibles para venta): ${treasureSummary}` : "",
    // `snapshot` is undefined when the client posts before the Convex workspace
    // query resolves (or with Convex offline). JSON.stringify(undefined) is
    // undefined, not a string — guard with `?? null` so `.slice` never throws.
    `Snapshot JSON: ${JSON.stringify(snapshot ?? null).slice(0, 2200)}`,
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
  targets: GuidedTarget[];
  snapshot: unknown;
  route: string;
  flow: string | undefined;
  priorDraft: unknown;
  loteContext: unknown;
  candidateItems: unknown;
  accessLevel: AccessLevel;
}): Promise<GuidedEnvelope> {
  // Enrich candidateItems with the full sheet catalog (fills gaps beyond the
  // Convex ITEM_SCAN_CAP — old items, not-yet-synced rows, etc.).
  // Also fetch treasure browser available items for sale context.
  const [enrichedItems, sheetCache] = await Promise.all([
    enrichCandidateItems(args.candidateItems),
    loadSheetCache().catch(() => null),
  ]);
  const treasureSummary = sheetCache && sheetCache.treasureItems.length > 0
    ? `${sheetCache.treasureItems.length} disponibles: ${JSON.stringify(
        sheetCache.treasureItems.slice(0, 40).map((i) => ({
          id: i.itemId,
          nombre: i.nombre,
        })),
      ).slice(0, 1000)}`
    : undefined;

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
        enrichedItems,
        treasureSummary,
      ),
    },
    ...args.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    })),
  ];

  let parsed: Record<string, unknown> | null = null;
  let rawText = "";
  // The model that actually produced the answer — reported back so the UI and
  // the saved summary reflect the real provider after any fallback.
  let answeredModel = args.targets[0]?.model ?? DEFAULT_GATEWAY_MODEL;

  // Try each target in order (under "auto": gateway → Groq). Each upstream call
  // retries transient 429/5xx with exponential backoff; if a provider is still
  // exhausted after retries, fall through to the next. Only when every provider
  // is exhausted do we degrade to an advisory bubble.
  for (let t = 0; t < args.targets.length; t++) {
    const target = args.targets[t];
    const isLast = t === args.targets.length - 1;
    answeredModel = target.model;
    try {
      const upstream = await fetchUpstreamWithRetry(target.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${target.apiKey}`,
        },
        body: JSON.stringify({
          model: target.model,
          messages: fullMessages,
          temperature: 0.2,
          // The envelope is compact JSON (a few fields + a short "say"); 800 is
          // ample and keeps latency/cost down on the small models.
          max_tokens: 800,
          // Only on the Groq path — Gemini via the gateway 400s on json_object.
          ...(target.jsonMode
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      });
      if (!upstream.ok) {
        // Surface the real upstream reason in the logs (the friendly message
        // below intentionally hides provider detail from the operator).
        const errBody = await upstream.text().catch(() => "");
        console.warn(
          `[fotosintesis-ai] guided upstream ${upstream.status} via ${target.label} (${target.model}): ${errBody.slice(0, 500)}`,
        );
        // A rate-limited/unavailable provider falls through to the next one.
        if (!isLast) continue;
        return advisoryFallback(
          upstream.status === 429
            ? "El modelo está saturado ahora mismo (límite de uso del proveedor). Esperá un minuto y volvé a intentar."
            : `El modelo respondió ${upstream.status}. Intentá de nuevo en un momento.`,
          target.model,
        );
      }
      const data = (await upstream.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      rawText = data.choices?.[0]?.message?.content ?? "";
      parsed = JSON.parse(extractJsonObject(rawText)) as Record<string, unknown>;
      break; // got a usable answer
    } catch {
      // Network failure or a non-JSON reply. If the model answered with prose
      // (rawText present), degrade to an advisory bubble. If it was a hard
      // network error and another provider remains, try that one instead.
      if (!rawText.trim() && !isLast) continue;
      return advisoryFallback(
        rawText.trim()
          ? rawText.trim().slice(0, 400)
          : "No te entendí bien, ¿me lo repetís?",
        answeredModel,
      );
    }
  }

  if (!parsed) {
    return advisoryFallback(
      "No te entendí bien, ¿me lo repetís?",
      answeredModel,
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
    model: answeredModel,
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
    const targets = resolveGuidedTargets();
    if (targets.length === 0) {
      res.status(503).json({
        error:
          "Sin proveedor de IA configurado. Define AI_GATEWAY_API_KEY o GROQ_API_KEY en Vercel.",
      });
      return;
    }
    // A per-request model override applies to the primary (first) target only;
    // the fallback provider keeps its own default model.
    const overrideModel = body.model?.trim();
    if (overrideModel && targets[0]) {
      targets[0] = { ...targets[0], model: overrideModel };
    }
    const envelope = await buildGuidedEnvelope({
      messages,
      targets,
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
      model: envelope.model ?? model,
    });
    return;
  }

  // Streaming advisory path now shares the guided resolver: gateway (Gemini
  // Flash-Lite) first, Groq (8B) as the rate-limit safety net. Works as long as
  // EITHER provider key is configured — no longer Groq-only.
  const advisoryTargets = resolveGuidedTargets();
  if (advisoryTargets.length === 0) {
    res.status(503).json({
      error:
        "Sin proveedor de IA configurado. Define AI_GATEWAY_API_KEY o GROQ_API_KEY en Vercel.",
    });
    return;
  }
  // A per-request model override applies to the primary target only.
  const advisoryOverride = body.model?.trim();
  if (advisoryOverride && advisoryTargets[0]) {
    advisoryTargets[0] = { ...advisoryTargets[0], model: advisoryOverride };
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

  const { fullText, finishReason, model: answeredModel } = await streamChat(
    res,
    advisoryTargets,
    fullMessages,
  );

  sseWrite(res, { done: true, model: answeredModel, finishReason });
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
    model: answeredModel,
  });
}

export const config = {
  maxDuration: 60,
};
