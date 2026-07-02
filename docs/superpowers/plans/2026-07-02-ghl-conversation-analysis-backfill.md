# GHL Conversation Analysis → Funnel Backfill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-script pipeline that mines the last 30 days of real GHL conversations, extracts funnel signals with an LLM, and passively backfills existing GHL contacts (custom fields, whitelisted tags, forward-only pipeline stage) — read-only extract physically separated from a dry-run-by-default guarded write.

**Architecture:** A self-contained read-only module (`api/_lib/ghl-read.ts`) the analysis script imports; the existing writer module (`api/_lib/ghl-client.ts`) the apply script imports (extended with one opportunity-stage writer). All decision logic lives in pure, unit-tested modules under `scripts/lib/`. Two `tsx` orchestration scripts wire them together.

**Tech Stack:** TypeScript, `tsx`, `dotenv`, vitest. GHL LeadConnector v2 REST (Bearer, `Version: 2021-07-28`). LLM via OpenAI-compatible `/v1/chat/completions` (Groq primary `llama-3.1-8b-instant` with `response_format: json_object`; Vercel AI Gateway `google/gemini-2.5-flash-lite` spillover).

**Spec:** `docs/superpowers/specs/2026-07-02-ghl-conversation-analysis-backfill-design.md`

## Global Constraints

_(Every task's requirements implicitly include this section. Values copied verbatim from the spec.)_

- **Read/write module split:** `analyze-conversations.ts` imports only `ghl-read.ts` (+ `scripts/lib/*`), never `ghl-client.ts`. A test asserts its import graph excludes the writers.
- **Existing contacts & opportunities ONLY** — never create a contact (`upsertContact`), never create an opportunity, never `addToWorkflow`.
- **Never write** `lead_score` (GHL-owned, golden rule #6) or code-owned fields (`total_comprado_cop`, `ultima_compra_fecha`, `order_id`, `producto_seleccionado_sku`, `embajador_asignado`, `supabase_contact_id`).
- **Custom-field write value key is `field_value`** (not `value`); the read shape uses `value`.
- **Only-if-empty (first-touch)** for every backfilled field; `presupuesto_declarado` skipped when budget is `null` (never write 0).
- **Tags from a frozen literal allowlist map only** (never string-interpolated); a hard **denylist** blocks every active/trigger tag: `cliente-pago-confirmado`, `pide-humano`, `buscar-catalogo`, `quiere-comprar`, `qualification_complete`, `lead-frio`, `carrito-enviado`. Normalize (lowercase+trim) before both checks. `sentiment`/`outcome`/`objeciones` never produce a tag.
- **Confidence ≥ 0.6** required to write any field/tag or use any stage evidence.
- **Stage:** existing-opportunity-only, forward-only (never regress). Settable stage-ID set asserted to be exactly `{Nuevo Lead, Calificado por IA, Producto Recomendado, Negociación / Agente, Perdido / Nurturing}` — `Carrito Enviado` and `Venta Cerrada` dropped entirely.
- **`apply-backfill.ts`:** positive `--apply` flag (default = dry-run, zero writes). Without `--all-contacts`, writes only to the 3 hard-coded test contacts (Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga), resolved to IDs at startup, aborting if any resolves to ≠1 contact. `--all-contacts` requires typed confirmation + logs the exact count.
- **`tipo_interes` live enum:** `topito, candonga, anillo, dije, gema_suelta, set, otro` (docs' `gema`/missing-`candonga` is stale).
- GHL base `https://services.leadconnectorhq.com`, `Version: 2021-07-28`, `Authorization: Bearer <GHL_TOKEN>`, location `t3tOZBrR05jUoLqnDn4I`.
- Creds from `process.env.GHL_TOKEN` / `process.env.GHL_LOCATION_ID` via `dotenv.config({ path: '.env.local' })`.
- Output dir `scripts/.analysis-runs/<ts>/` is **gitignored** (customer transcripts + PII).

## File Structure

| File                                                                                    | Responsibility                                                                                                                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/_lib/ghl-read.ts` (new)                                                            | Self-contained read-only GHL helpers (messages, conversation search, contact, custom-field defs, pipelines, opportunity find). No writers imported. |
| `api/_lib/ghl-client.ts` (modify)                                                       | Add `updateOpportunityStage` writer.                                                                                                                |
| `scripts/lib/types.ts` (new)                                                            | `ExtractionRow` + signal types shared by both scripts + tests.                                                                                      |
| `scripts/lib/backfill-fields.ts` (new)                                                  | Pure: signal→field derivation, enum validation, only-if-empty, budget-null.                                                                         |
| `scripts/lib/backfill-tags.ts` (new)                                                    | Pure: frozen ALLOW map, DENY set, normalization.                                                                                                    |
| `scripts/lib/backfill-stage.ts` (new)                                                   | Pure: evidence→stage, forward-only, settable-set assertion.                                                                                         |
| `scripts/lib/transcript.ts` (new)                                                       | Pure: PII redaction + transcript rendering.                                                                                                         |
| `scripts/lib/llm-extract.ts` (new)                                                      | LLM call (provider select, retry, `extractJsonObject`, prompt), injectable `fetchImpl`.                                                             |
| `scripts/analyze-conversations.ts` (new)                                                | Orchestrate extract → `dataset.json` + `report.md`.                                                                                                 |
| `scripts/apply-backfill.ts` (new)                                                       | Orchestrate guarded write from a reviewed `dataset.json`.                                                                                           |
| `tests/ghlRead.test.ts` (new)                                                           | Read-helper URL/headers/parse via stubbed fetch.                                                                                                    |
| `tests/ghlClient.test.ts` (modify)                                                      | Add `updateOpportunityStage` test.                                                                                                                  |
| `tests/backfillFields.test.ts` / `backfillTags.test.ts` / `backfillStage.test.ts` (new) | The safety-critical pure-logic suites.                                                                                                              |
| `tests/transcript.test.ts` / `llmExtract.test.ts` (new)                                 | Redaction/render; JSON extraction + provider fallback.                                                                                              |
| `tests/analyzeImportGraph.test.ts` (new)                                                | Assert analysis script does not import `ghl-client.ts`.                                                                                             |

---

### Task 1: Read-only GHL module (`ghl-read.ts`)

**Files:**

- Create: `api/_lib/ghl-read.ts`
- Test: `tests/ghlRead.test.ts`

**Interfaces:**

- Produces:
  - `interface GhlReadConfig { token: string; locationId: string; fetchImpl?: FetchLike }`
  - `interface GhlMessage { id: string; type: string; direction: "inbound" | "outbound"; body: string; dateAdded: string }`
  - `interface GhlConversationSummary { id: string; contactId: string; fullName?: string }`
  - `interface GhlContact { id: string; customFields: { id: string; value: unknown }[]; tags: string[] }`
  - `interface GhlCustomFieldDef { id: string; fieldKey: string; name: string }`
  - `interface GhlPipeline { id: string; name: string; stages: { id: string; name: string }[] }`
  - `interface GhlOpportunity { id: string; pipelineId: string; pipelineStageId: string; updatedAt?: string }`
  - `getConversationMessages(cfg, conversationId, opts?: { max?: number }): Promise<GhlMessage[]>`
  - `searchConversations(cfg, params: { contactId?: string; startAfterDate?: number; startDate?: number; endDate?: number; limit?: number }): Promise<GhlConversationSummary[]>`
  - `getContact(cfg, contactId): Promise<GhlContact>`
  - `getCustomFieldDefs(cfg): Promise<GhlCustomFieldDef[]>` (fieldKey normalized: strip a leading `contact.`)
  - `getPipelines(cfg): Promise<GhlPipeline[]>`
  - `findContactOpportunity(cfg, contactId, pipelineId): Promise<GhlOpportunity | null>` (opp in that pipeline; most recent by `updatedAt` if several; else `null`)

- [ ] **Step 1: Write failing tests**

```ts
// tests/ghlRead.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  getConversationMessages,
  searchConversations,
  getContact,
  getCustomFieldDefs,
  getPipelines,
  findContactOpportunity,
  type GhlReadConfig,
} from "../api/_lib/ghl-read";

function fakeFetch(jsonBody: unknown = {}, ok = true, status = 200) {
  return vi.fn(async (_url: string, _init?: any) => ({
    ok,
    status,
    json: async () => jsonBody,
  }));
}
const cfg = (fetchImpl: any): GhlReadConfig => ({
  token: "pit-t",
  locationId: "t3tOZBrR05jUoLqnDn4I",
  fetchImpl,
});

describe("ghl-read", () => {
  it("getConversationMessages GETs the messages endpoint with auth+version and returns the message array", async () => {
    const f = fakeFetch({
      messages: {
        messages: [
          {
            id: "m1",
            type: "TYPE_WHATSAPP",
            direction: "inbound",
            body: "hola",
            dateAdded: "2026-06-10",
          },
        ],
        nextPage: false,
      },
    });
    const msgs = await getConversationMessages(cfg(f), "cv-1");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].body).toBe("hola");
    const [url, init] = f.mock.calls[0];
    expect(url).toContain(
      "https://services.leadconnectorhq.com/conversations/cv-1/messages",
    );
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer pit-t");
    expect(init.headers.Version).toBe("2021-07-28");
  });

  it("searchConversations passes locationId + date window and returns summaries", async () => {
    const f = fakeFetch({
      conversations: [{ id: "cv-1", contactId: "c-1", fullName: "Kevin" }],
    });
    const out = await searchConversations(cfg(f), {
      startDate: 1000,
      endDate: 2000,
    });
    expect(out[0].contactId).toBe("c-1");
    const [url] = f.mock.calls[0];
    expect(url).toContain("locationId=t3tOZBrR05jUoLqnDn4I");
    expect(url).toContain("startDate=1000");
    expect(url).toContain("endDate=2000");
  });

  it("getContact returns id, customFields (read shape: id+value), and tags", async () => {
    const f = fakeFetch({
      contact: {
        id: "c-1",
        customFields: [{ id: "fid-tipo", value: "anillo" }],
        tags: ["lead-nuevo"],
      },
    });
    const c = await getContact(cfg(f), "c-1");
    expect(c.customFields[0]).toEqual({ id: "fid-tipo", value: "anillo" });
    expect(c.tags).toEqual(["lead-nuevo"]);
  });

  it("getCustomFieldDefs strips the contact. prefix from fieldKey", async () => {
    const f = fakeFetch({
      customFields: [
        {
          id: "fid-tipo",
          fieldKey: "contact.tipo_interes",
          name: "Tipo de interés",
        },
      ],
    });
    const defs = await getCustomFieldDefs(cfg(f));
    expect(defs[0]).toEqual({
      id: "fid-tipo",
      fieldKey: "tipo_interes",
      name: "Tipo de interés",
    });
  });

  it("getPipelines returns pipelines with stages", async () => {
    const f = fakeFetch({
      pipelines: [
        {
          id: "u4MPXH2HdEFmU3vVqNdd",
          name: "Ventas Tierra Madre",
          stages: [{ id: "s1", name: "Nuevo Lead" }],
        },
      ],
    });
    const p = await getPipelines(cfg(f));
    expect(p[0].stages[0].name).toBe("Nuevo Lead");
  });

  it("findContactOpportunity returns the opp in the given pipeline, most-recent if several, else null", async () => {
    const f = fakeFetch({
      opportunities: [
        {
          id: "o-old",
          pipelineId: "u4MPXH2HdEFmU3vVqNdd",
          pipelineStageId: "s1",
          updatedAt: "2026-06-01",
        },
        {
          id: "o-new",
          pipelineId: "u4MPXH2HdEFmU3vVqNdd",
          pipelineStageId: "s2",
          updatedAt: "2026-06-20",
        },
        {
          id: "o-other",
          pipelineId: "OTHER",
          pipelineStageId: "x",
          updatedAt: "2026-06-30",
        },
      ],
    });
    const opp = await findContactOpportunity(
      cfg(f),
      "c-1",
      "u4MPXH2HdEFmU3vVqNdd",
    );
    expect(opp?.id).toBe("o-new");
    const none = await findContactOpportunity(
      cfg(fakeFetch({ opportunities: [] })),
      "c-1",
      "u4MPXH2HdEFmU3vVqNdd",
    );
    expect(none).toBeNull();
  });

  it("throws on a non-ok response", async () => {
    await expect(
      getContact(cfg(fakeFetch({}, false, 401)), "c-1"),
    ).rejects.toThrow(/401/);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/ghlRead.test.ts`
Expected: FAIL (module `../api/_lib/ghl-read` not found).

- [ ] **Step 3: Implement `api/_lib/ghl-read.ts`**

```ts
// api/_lib/ghl-read.ts
//
// Read-ONLY GHL LeadConnector v2 helpers. Deliberately self-contained (mirrors
// the api/_lib/ghl-client.ts ↔ convex/_lib/ghlConversations.ts duplication
// pattern) so a module that imports this can NEVER transitively reach a writer
// function. Do not import ghl-client.ts here.

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export interface GhlReadConfig {
  token: string;
  locationId: string;
  fetchImpl?: FetchLike;
}

export interface GhlMessage {
  id: string;
  type: string;
  direction: "inbound" | "outbound";
  body: string;
  dateAdded: string;
}
export interface GhlConversationSummary {
  id: string;
  contactId: string;
  fullName?: string;
}
export interface GhlContact {
  id: string;
  customFields: { id: string; value: unknown }[];
  tags: string[];
}
export interface GhlCustomFieldDef {
  id: string;
  fieldKey: string;
  name: string;
}
export interface GhlPipeline {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}
export interface GhlOpportunity {
  id: string;
  pipelineId: string;
  pipelineStageId: string;
  updatedAt?: string;
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}
function impl(cfg: GhlReadConfig): FetchLike {
  return cfg.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
}
async function getJson(cfg: GhlReadConfig, url: string): Promise<any> {
  const res = await impl(cfg)(url, {
    method: "GET",
    headers: headers(cfg.token),
  });
  if (!res.ok) throw new Error(`GHL GET ${url} failed: ${res.status}`);
  return res.json();
}

export async function getConversationMessages(
  cfg: GhlReadConfig,
  conversationId: string,
  opts: { max?: number } = {},
): Promise<GhlMessage[]> {
  const max = opts.max ?? 500;
  const out: GhlMessage[] = [];
  let lastMessageId: string | undefined;
  while (out.length < max) {
    let url = `${GHL_BASE}/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`;
    if (lastMessageId)
      url += `&lastMessageId=${encodeURIComponent(lastMessageId)}`;
    const data = await getJson(cfg, url);
    const page: GhlMessage[] = data?.messages?.messages ?? [];
    out.push(...page);
    const nextId = data?.messages?.lastMessageId;
    if (!page.length || !data?.messages?.nextPage || !nextId) break;
    lastMessageId = nextId;
  }
  return out.slice(0, max);
}

export async function searchConversations(
  cfg: GhlReadConfig,
  params: {
    contactId?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  } = {},
): Promise<GhlConversationSummary[]> {
  const q = new URLSearchParams({ locationId: cfg.locationId });
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.startDate != null) q.set("startDate", String(params.startDate));
  if (params.endDate != null) q.set("endDate", String(params.endDate));
  if (params.limit != null) q.set("limit", String(params.limit));
  const data = await getJson(
    cfg,
    `${GHL_BASE}/conversations/search?${q.toString()}`,
  );
  return Array.isArray(data?.conversations) ? data.conversations : [];
}

export async function getContact(
  cfg: GhlReadConfig,
  contactId: string,
): Promise<GhlContact> {
  const data = await getJson(
    cfg,
    `${GHL_BASE}/contacts/${encodeURIComponent(contactId)}`,
  );
  const c = data?.contact ?? {};
  return {
    id: c.id ?? contactId,
    customFields: c.customFields ?? [],
    tags: c.tags ?? [],
  };
}

export async function getCustomFieldDefs(
  cfg: GhlReadConfig,
): Promise<GhlCustomFieldDef[]> {
  const data = await getJson(
    cfg,
    `${GHL_BASE}/locations/${encodeURIComponent(cfg.locationId)}/customFields`,
  );
  const list = Array.isArray(data?.customFields) ? data.customFields : [];
  return list.map((d: any) => ({
    id: d.id,
    fieldKey: String(d.fieldKey ?? "").replace(/^contact\./, ""),
    name: d.name,
  }));
}

export async function getPipelines(cfg: GhlReadConfig): Promise<GhlPipeline[]> {
  const data = await getJson(
    cfg,
    `${GHL_BASE}/opportunities/pipelines?locationId=${encodeURIComponent(cfg.locationId)}`,
  );
  return Array.isArray(data?.pipelines) ? data.pipelines : [];
}

export async function findContactOpportunity(
  cfg: GhlReadConfig,
  contactId: string,
  pipelineId: string,
): Promise<GhlOpportunity | null> {
  const q = new URLSearchParams({
    location_id: cfg.locationId,
    contact_id: contactId,
  });
  const data = await getJson(
    cfg,
    `${GHL_BASE}/opportunities/search?${q.toString()}`,
  );
  const opps: GhlOpportunity[] = Array.isArray(data?.opportunities)
    ? data.opportunities
    : [];
  const inPipe = opps.filter((o) => o.pipelineId === pipelineId);
  if (!inPipe.length) return null;
  return inPipe.reduce((newest, o) =>
    (o.updatedAt ?? "") > (newest.updatedAt ?? "") ? o : newest,
  );
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/ghlRead.test.ts` → Expected: PASS (7 tests).
Then `npm run lint` → Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ghl-read.ts tests/ghlRead.test.ts
git commit -m "feat(ghl): read-only ghl-read.ts helpers for conversation-analysis backfill"
```

---

### Task 2: `updateOpportunityStage` writer

**Files:**

- Modify: `api/_lib/ghl-client.ts` (append a new export)
- Test: `tests/ghlClient.test.ts` (add one case)

**Interfaces:**

- Produces: `updateOpportunityStage(cfg: GhlConfig, opportunityId: string, pipelineStageId: string): Promise<void>` → `PUT /opportunities/{id}` body `{ pipelineStageId }`.

- [ ] **Step 1: Add failing test to `tests/ghlClient.test.ts`**

```ts
// add import: updateOpportunityStage
it("updateOpportunityStage PUTs the stage id to /opportunities/{id}", async () => {
  const f = fakeFetch({});
  await updateOpportunityStage(baseCfg(f), "o-1", "stage-2");
  const [url, init] = f.mock.calls[0];
  expect(url).toBe("https://services.leadconnectorhq.com/opportunities/o-1");
  expect(init.method).toBe("PUT");
  expect(JSON.parse(init.body)).toEqual({ pipelineStageId: "stage-2" });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run tests/ghlClient.test.ts` → Expected: FAIL (`updateOpportunityStage` not exported).

- [ ] **Step 3: Implement (append to `api/_lib/ghl-client.ts`)**

```ts
/** Move an opportunity to a pipeline stage (by stage id). Forward-only policy
 *  is enforced by the caller, not here. */
export async function updateOpportunityStage(
  cfg: GhlConfig,
  opportunityId: string,
  pipelineStageId: string,
): Promise<void> {
  const res = await impl(cfg)(`${GHL_BASE}/opportunities/${opportunityId}`, {
    method: "PUT",
    headers: headers(cfg.token),
    body: JSON.stringify({ pipelineStageId }),
  });
  if (!res.ok)
    throw new Error(`GHL updateOpportunityStage failed: ${res.status}`);
}
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run tests/ghlClient.test.ts` → PASS; `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ghl-client.ts tests/ghlClient.test.ts
git commit -m "feat(ghl): updateOpportunityStage writer"
```

---

### Task 3: Extraction types + field derivation

**Files:**

- Create: `scripts/lib/types.ts`, `scripts/lib/backfill-fields.ts`
- Test: `tests/backfillFields.test.ts`

**Interfaces:**

- `scripts/lib/types.ts` produces:
  ```ts
  export interface Signal<T> {
    value: T | null;
    confidence: number;
    evidence?: string;
  }
  export interface ExtractionRow {
    contactId: string;
    contactName?: string;
    conversationId: string;
    conversationIds: string[];
    channel: "whatsapp" | "instagram" | "tiktok" | "web" | "evento" | "unknown";
    signals: {
      tipo_interes: Signal<
        | "topito"
        | "candonga"
        | "anillo"
        | "dije"
        | "gema_suelta"
        | "set"
        | "otro"
      >;
      presupuesto_cop: Signal<number>;
      ocasion: Signal<
        | "regalo"
        | "cumpleanos"
        | "aniversario"
        | "matrimonio"
        | "diario"
        | "inversion"
        | "evento-especial"
      >;
      ciudad: Signal<string>;
      conocimiento: Signal<"novato" | "intermedio" | "experto">;
      urgencia: Signal<"alta" | "media" | "baja">;
      products_shown: { value: boolean; evidence?: string };
      sentiment: Signal<
        | "interesado"
        | "sensible-precio"
        | "frustrado"
        | "listo-comprar"
        | "indeciso"
      >;
      objeciones: string[];
      outcome:
        | "sin-respuesta-negocio"
        | "respondido-sin-cierre"
        | "pidio-humano"
        | "compro"
        | "fantasma";
    };
    tipo_interes_evidence?: {
      asked_for_plain?: string;
      maps_to_categoria_hint?: string;
    };
  }
  export const MIN_CONFIDENCE = 0.6;
  ```
- `scripts/lib/backfill-fields.ts` produces:
  - `interface FieldWrite { key: string; field_value: string | number }`
  - `deriveFieldWrites(row: ExtractionRow, currentByKey: Record<string, unknown>): { writes: FieldWrite[]; skipped: string[] }` — only-if-empty (skip when `currentByKey[key]` is non-empty), confidence-gated, enum-validated, budget-null-skipped.
  - `TIPO_INTERES_VALUES`, `OCASION_VALUES`, `CONOCIMIENTO_VALUES`, `CANAL_VALUES` (readonly value sets).

- [ ] **Step 1: Write failing tests**

```ts
// tests/backfillFields.test.ts
import { describe, it, expect } from "vitest";
import { deriveFieldWrites } from "../scripts/lib/backfill-fields";
import type { ExtractionRow } from "../scripts/lib/types";

function row(
  overrides: Partial<ExtractionRow["signals"]> = {},
  channel: ExtractionRow["channel"] = "whatsapp",
): ExtractionRow {
  return {
    contactId: "c-1",
    conversationId: "cv-1",
    conversationIds: ["cv-1"],
    channel,
    signals: {
      tipo_interes: { value: "anillo", confidence: 0.9 },
      presupuesto_cop: { value: 5_000_000, confidence: 0.9 },
      ocasion: { value: "regalo", confidence: 0.9 },
      ciudad: { value: "Bogotá", confidence: 0.9 },
      conocimiento: { value: "novato", confidence: 0.9 },
      urgencia: { value: "media", confidence: 0.9 },
      products_shown: { value: false },
      sentiment: { value: "interesado", confidence: 0.9 },
      objeciones: [],
      outcome: "respondido-sin-cierre",
      ...overrides,
    },
  };
}

describe("deriveFieldWrites", () => {
  it("maps signals to GHL field keys with field_value", () => {
    const { writes } = deriveFieldWrites(row(), {});
    expect(writes).toEqual(
      expect.arrayContaining([
        { key: "tipo_interes", field_value: "anillo" },
        { key: "presupuesto_declarado", field_value: 5_000_000 },
        { key: "ciudad", field_value: "Bogotá" },
        { key: "canal_origen", field_value: "whatsapp" },
        { key: "conocimiento_esmeraldas", field_value: "novato" },
      ]),
    );
  });

  it("only-if-empty: skips a field whose current value is non-empty", () => {
    const { writes, skipped } = deriveFieldWrites(row(), {
      tipo_interes: "topito",
    });
    expect(writes.find((w) => w.key === "tipo_interes")).toBeUndefined();
    expect(skipped).toContain("tipo_interes");
  });

  it("skips signals below MIN_CONFIDENCE", () => {
    const { writes } = deriveFieldWrites(
      row({ tipo_interes: { value: "anillo", confidence: 0.5 } }),
      {},
    );
    expect(writes.find((w) => w.key === "tipo_interes")).toBeUndefined();
  });

  it("never writes budget 0/null (unknown budget)", () => {
    const { writes } = deriveFieldWrites(
      row({ presupuesto_cop: { value: null, confidence: 0.9 } }),
      {},
    );
    expect(
      writes.find((w) => w.key === "presupuesto_declarado"),
    ).toBeUndefined();
  });

  it("rejects an invalid dropdown value", () => {
    const { writes } = deriveFieldWrites(
      row({ tipo_interes: { value: "collar" as any, confidence: 0.9 } }),
      {},
    );
    expect(writes.find((w) => w.key === "tipo_interes")).toBeUndefined();
  });

  it("never emits a forbidden field key", () => {
    const { writes } = deriveFieldWrites(row(), {});
    const keys = writes.map((w) => w.key);
    for (const forbidden of [
      "lead_score",
      "total_comprado_cop",
      "order_id",
      "producto_seleccionado_sku",
      "embajador_asignado",
      "supabase_contact_id",
      "ultima_compra_fecha",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run tests/backfillFields.test.ts` → FAIL (modules not found).

- [ ] **Step 3: Implement `scripts/lib/types.ts`** (exact content from the Interfaces block above).

- [ ] **Step 4: Implement `scripts/lib/backfill-fields.ts`**

```ts
// scripts/lib/backfill-fields.ts
import { type ExtractionRow, MIN_CONFIDENCE } from "./types";

export const TIPO_INTERES_VALUES = [
  "topito",
  "candonga",
  "anillo",
  "dije",
  "gema_suelta",
  "set",
  "otro",
] as const;
export const OCASION_VALUES = [
  "regalo",
  "cumpleanos",
  "aniversario",
  "matrimonio",
  "diario",
  "inversion",
  "evento-especial",
] as const;
export const CONOCIMIENTO_VALUES = ["novato", "intermedio", "experto"] as const;
export const CANAL_VALUES = [
  "whatsapp",
  "instagram",
  "tiktok",
  "web",
  "evento",
] as const;

export interface FieldWrite {
  key: string;
  field_value: string | number;
}

function isEmpty(v: unknown): boolean {
  return (
    v === undefined || v === null || (typeof v === "string" && v.trim() === "")
  );
}
function passes<T>(sig: { value: T | null; confidence: number }): boolean {
  return sig.value != null && sig.confidence >= MIN_CONFIDENCE;
}

export function deriveFieldWrites(
  row: ExtractionRow,
  currentByKey: Record<string, unknown>,
): { writes: FieldWrite[]; skipped: string[] } {
  const writes: FieldWrite[] = [];
  const skipped: string[] = [];
  const s = row.signals;

  const put = (key: string, value: string | number, valid: boolean) => {
    if (!isEmpty(currentByKey[key])) {
      skipped.push(key);
      return;
    } // only-if-empty
    if (!valid) {
      skipped.push(key);
      return;
    }
    writes.push({ key, field_value: value });
  };

  if (passes(s.tipo_interes))
    put(
      "tipo_interes",
      s.tipo_interes.value!,
      (TIPO_INTERES_VALUES as readonly string[]).includes(
        s.tipo_interes.value!,
      ),
    );
  if (passes(s.presupuesto_cop) && s.presupuesto_cop.value! > 0)
    put("presupuesto_declarado", s.presupuesto_cop.value!, true);
  if (passes(s.ciudad))
    put("ciudad", s.ciudad.value!, s.ciudad.value!.trim().length > 0);
  if (row.channel !== "unknown")
    put(
      "canal_origen",
      row.channel,
      (CANAL_VALUES as readonly string[]).includes(row.channel),
    );
  if (passes(s.conocimiento))
    put(
      "conocimiento_esmeraldas",
      s.conocimiento.value!,
      (CONOCIMIENTO_VALUES as readonly string[]).includes(
        s.conocimiento.value!,
      ),
    );

  return { writes, skipped };
}
```

- [ ] **Step 5: Run, verify pass; commit**

Run: `npx vitest run tests/backfillFields.test.ts` → PASS; `npm run lint` → clean.

```bash
git add scripts/lib/types.ts scripts/lib/backfill-fields.ts tests/backfillFields.test.ts
git commit -m "feat(backfill): extraction types + only-if-empty field derivation"
```

---

### Task 4: Tag derivation (frozen allowlist + denylist)

**Files:**

- Create: `scripts/lib/backfill-tags.ts`
- Test: `tests/backfillTags.test.ts`

**Interfaces:**

- Produces:
  - `DENY_TAGS: ReadonlySet<string>`
  - `deriveTags(row: ExtractionRow): string[]` — emits only from frozen literal maps; `sentiment`/`outcome`/`objeciones` never produce a tag; every candidate normalized (lowercase+trim) and cross-checked against `DENY_TAGS` as a belt-and-suspenders (should never fire given the allowlist, but a test proves it).

- [ ] **Step 1: Write failing tests**

```ts
// tests/backfillTags.test.ts
import { describe, it, expect } from "vitest";
import { deriveTags, DENY_TAGS } from "../scripts/lib/backfill-tags";
import type { ExtractionRow } from "../scripts/lib/types";

const base = (
  o: Partial<ExtractionRow["signals"]> = {},
  channel: ExtractionRow["channel"] = "whatsapp",
): ExtractionRow => ({
  contactId: "c",
  conversationId: "cv",
  conversationIds: ["cv"],
  channel,
  signals: {
    tipo_interes: { value: "anillo", confidence: 0.9 },
    presupuesto_cop: { value: null, confidence: 0.9 },
    ocasion: { value: "regalo", confidence: 0.9 },
    ciudad: { value: null, confidence: 0 },
    conocimiento: { value: null, confidence: 0 },
    urgencia: { value: "media", confidence: 0.9 },
    products_shown: { value: false },
    sentiment: { value: "listo-comprar", confidence: 0.99 },
    objeciones: ["precio"],
    outcome: "compro",
    ...o,
  },
});

describe("deriveTags", () => {
  it("emits interes-*, ocasion-*, canal-* from the frozen map", () => {
    expect(deriveTags(base())).toEqual(
      expect.arrayContaining([
        "interes-anillo",
        "ocasion-regalo",
        "canal-whatsapp",
      ]),
    );
  });
  it("candonga and otro emit NO interes tag", () => {
    expect(
      deriveTags(
        base({ tipo_interes: { value: "candonga", confidence: 0.9 } }),
      ),
    ).not.toContain("interes-candonga");
    expect(
      deriveTags(
        base({ tipo_interes: { value: "otro", confidence: 0.9 } }),
      ).some((t) => t.startsWith("interes-")),
    ).toBe(false);
  });
  it("gema_suelta maps to the hyphenated tag", () => {
    expect(
      deriveTags(
        base({ tipo_interes: { value: "gema_suelta", confidence: 0.9 } }),
      ),
    ).toContain("interes-gema-suelta");
  });
  it("urgencia=alta emits the bare tag; media/baja emit nothing", () => {
    expect(
      deriveTags(base({ urgencia: { value: "alta", confidence: 0.9 } })),
    ).toContain("urgencia");
    expect(
      deriveTags(base({ urgencia: { value: "baja", confidence: 0.9 } })),
    ).not.toContain("urgencia");
  });
  it("products_shown=true emits productos-mostrados; false does not", () => {
    expect(deriveTags(base({ products_shown: { value: true } }))).toContain(
      "productos-mostrados",
    );
    expect(
      deriveTags(base({ products_shown: { value: false } })),
    ).not.toContain("productos-mostrados");
  });
  it("SAFETY: report-only signals never become tags even at max confidence", () => {
    const tags = deriveTags(
      base({
        sentiment: { value: "listo-comprar", confidence: 1 },
        outcome: "compro",
        objeciones: ["precio", "envio"],
      }),
    );
    for (const t of [
      "quiere-comprar",
      "pide-humano",
      "cliente-pago-confirmado",
      "listo-comprar",
      "compro",
      "precio",
      "envio",
    ]) {
      expect(tags).not.toContain(t);
    }
  });
  it("SAFETY: no emitted tag is in DENY_TAGS", () => {
    for (const t of deriveTags(base())) expect(DENY_TAGS.has(t)).toBe(false);
  });
  it("skips tags below MIN_CONFIDENCE", () => {
    expect(
      deriveTags(base({ tipo_interes: { value: "anillo", confidence: 0.4 } })),
    ).not.toContain("interes-anillo");
  });
});
```

- [ ] **Step 2: Run, verify fail** — FAIL (module not found).

- [ ] **Step 3: Implement `scripts/lib/backfill-tags.ts`**

```ts
// scripts/lib/backfill-tags.ts
import { type ExtractionRow, MIN_CONFIDENCE } from "./types";

// Every active/trigger or scoring-mutating tag. NEVER applied in a backfill.
export const DENY_TAGS: ReadonlySet<string> = new Set([
  "cliente-pago-confirmado",
  "pide-humano",
  "buscar-catalogo",
  "quiere-comprar",
  "qualification_complete",
  "lead-frio",
  "carrito-enviado",
]);

// Frozen literal maps — the ONLY source of emitted tags. No string interpolation.
const INTERES_TAG: Record<string, string> = {
  topito: "interes-topito",
  anillo: "interes-anillo",
  dije: "interes-dije",
  gema_suelta: "interes-gema-suelta",
  set: "interes-set",
  // candonga, otro → intentionally absent (no such tag exists)
};
const OCASION_TAG: Record<string, string> = {
  regalo: "ocasion-regalo",
  cumpleanos: "ocasion-cumpleanos",
  aniversario: "ocasion-aniversario",
  matrimonio: "ocasion-matrimonio",
  diario: "ocasion-diario",
  inversion: "ocasion-inversion",
  "evento-especial": "ocasion-evento-especial",
};
const CANAL_TAG: Record<string, string> = {
  whatsapp: "canal-whatsapp",
  instagram: "canal-instagram",
  tiktok: "canal-tiktok",
  web: "canal-web",
  evento: "canal-evento",
};

const norm = (t: string) => t.toLowerCase().trim();
const conf = (c: number) => c >= MIN_CONFIDENCE;

export function deriveTags(row: ExtractionRow): string[] {
  const s = row.signals;
  const candidates: string[] = [];

  if (s.tipo_interes.value && conf(s.tipo_interes.confidence)) {
    const t = INTERES_TAG[s.tipo_interes.value];
    if (t) candidates.push(t);
  }
  if (s.ocasion.value && conf(s.ocasion.confidence)) {
    const t = OCASION_TAG[s.ocasion.value];
    if (t) candidates.push(t);
  }
  if (row.channel !== "unknown") {
    const t = CANAL_TAG[row.channel];
    if (t) candidates.push(t);
  }
  if (s.urgencia.value === "alta" && conf(s.urgencia.confidence))
    candidates.push("urgencia");
  if (s.products_shown.value === true) candidates.push("productos-mostrados");
  // sentiment / outcome / objeciones deliberately produce NO tag.

  // Belt-and-suspenders: normalize + reject anything on the denylist (should be impossible).
  return candidates.map(norm).filter((t) => !DENY_TAGS.has(t));
}
```

- [ ] **Step 4: Run, verify pass; commit**

Run: `npx vitest run tests/backfillTags.test.ts` → PASS; `npm run lint` → clean.

```bash
git add scripts/lib/backfill-tags.ts tests/backfillTags.test.ts
git commit -m "feat(backfill): frozen allowlist tag derivation + denylist guard"
```

---

### Task 5: Stage derivation (forward-only, settable-set asserted)

**Files:**

- Create: `scripts/lib/backfill-stage.ts`
- Test: `tests/backfillStage.test.ts`

**Interfaces:**

- Produces:
  - `SETTABLE_STAGE_NAMES: readonly string[]` = `["Nuevo Lead","Calificado por IA","Producto Recomendado","Negociación / Agente","Perdido / Nurturing"]`
  - `buildSettableStageMap(pipelineStages: { id: string; name: string }[]): Map<string, { id: string; order: number }>` — throws unless the resolved settable set is exactly the 5 names (drops `Carrito Enviado`/`Venta Cerrada`).
  - `deriveTargetStageName(row: ExtractionRow): string` — the highest evidenced settable stage.
  - `chooseStageWrite(row, currentStageId, settable): { stageId: string } | null` — forward-only; `null` if target ≤ current or unmapped.

- [ ] **Step 1: Write failing tests**

```ts
// tests/backfillStage.test.ts
import { describe, it, expect } from "vitest";
import {
  buildSettableStageMap,
  deriveTargetStageName,
  chooseStageWrite,
  SETTABLE_STAGE_NAMES,
} from "../scripts/lib/backfill-stage";
import type { ExtractionRow } from "../scripts/lib/types";

const FULL = [
  { id: "s1", name: "Nuevo Lead" },
  { id: "s2", name: "Calificado por IA" },
  { id: "s3", name: "Producto Recomendado" },
  { id: "s4", name: "Carrito Enviado" },
  { id: "s5", name: "Negociación / Agente" },
  { id: "s6", name: "Venta Cerrada" },
  { id: "s7", name: "Perdido / Nurturing" },
];
const row = (o: Partial<ExtractionRow["signals"]> = {}): ExtractionRow => ({
  contactId: "c",
  conversationId: "cv",
  conversationIds: ["cv"],
  channel: "whatsapp",
  signals: {
    tipo_interes: { value: null, confidence: 0 },
    presupuesto_cop: { value: null, confidence: 0 },
    ocasion: { value: null, confidence: 0 },
    ciudad: { value: null, confidence: 0 },
    conocimiento: { value: null, confidence: 0 },
    urgencia: { value: null, confidence: 0 },
    products_shown: { value: false },
    sentiment: { value: "indeciso", confidence: 0.9 },
    objeciones: [],
    outcome: "respondido-sin-cierre",
    ...o,
  },
});

describe("stage derivation", () => {
  it("buildSettableStageMap drops Carrito Enviado + Venta Cerrada, keeps exactly 5", () => {
    const m = buildSettableStageMap(FULL);
    expect([...m.keys()].sort()).toEqual([...SETTABLE_STAGE_NAMES].sort());
    expect(m.has("Carrito Enviado")).toBe(false);
    expect(m.has("Venta Cerrada")).toBe(false);
  });
  it("throws if a settable stage is missing from the live pipeline", () => {
    expect(() =>
      buildSettableStageMap(FULL.filter((s) => s.name !== "Calificado por IA")),
    ).toThrow();
  });
  it("qualified (interest+budget) → Calificado por IA", () => {
    expect(
      deriveTargetStageName(
        row({
          tipo_interes: { value: "anillo", confidence: 0.9 },
          presupuesto_cop: { value: 3_000_000, confidence: 0.9 },
        }),
      ),
    ).toBe("Calificado por IA");
  });
  it("products_shown → Producto Recomendado", () => {
    expect(
      deriveTargetStageName(row({ products_shown: { value: true } })),
    ).toBe("Producto Recomendado");
  });
  it("outcome pidio-humano → Negociación / Agente; fantasma → Perdido / Nurturing", () => {
    expect(deriveTargetStageName(row({ outcome: "pidio-humano" }))).toBe(
      "Negociación / Agente",
    );
    expect(deriveTargetStageName(row({ outcome: "fantasma" }))).toBe(
      "Perdido / Nurturing",
    );
  });
  it("chooseStageWrite is forward-only (no regress, no no-op)", () => {
    const m = buildSettableStageMap(FULL);
    // current already at Producto Recomendado (s3), evidence only qualifies (order 2) → null
    expect(
      chooseStageWrite(
        row({
          tipo_interes: { value: "anillo", confidence: 0.9 },
          presupuesto_cop: { value: 1, confidence: 0.9 },
        }),
        "s3",
        m,
      ),
    ).toBeNull();
    // current Nuevo Lead (s1), evidence products_shown (order 3) → advance to s3
    expect(
      chooseStageWrite(row({ products_shown: { value: true } }), "s1", m),
    ).toEqual({ stageId: "s3" });
  });
});
```

- [ ] **Step 2: Run, verify fail** — FAIL (module not found).

- [ ] **Step 3: Implement `scripts/lib/backfill-stage.ts`**

```ts
// scripts/lib/backfill-stage.ts
import { type ExtractionRow, MIN_CONFIDENCE } from "./types";

// Settable stages in pipeline order. Carrito Enviado (4) + Venta Cerrada (6)
// are intentionally EXCLUDED — they imply a real cart/payment.
export const SETTABLE_STAGE_NAMES = [
  "Nuevo Lead",
  "Calificado por IA",
  "Producto Recomendado",
  "Negociación / Agente",
  "Perdido / Nurturing",
] as const;
const ORDER: Record<string, number> = Object.fromEntries(
  SETTABLE_STAGE_NAMES.map((n, i) => [n, i + 1]),
);

const stripPrefix = (name: string) =>
  name
    .replace(/^\s*\d+[.)]?\s*/, "")
    .replace(/[✅❌]/g, "")
    .trim();

export function buildSettableStageMap(
  pipelineStages: { id: string; name: string }[],
): Map<string, { id: string; order: number }> {
  const map = new Map<string, { id: string; order: number }>();
  for (const st of pipelineStages) {
    const clean = stripPrefix(st.name);
    if (ORDER[clean] != null)
      map.set(clean, { id: st.id, order: ORDER[clean] });
  }
  const got = [...map.keys()].sort();
  const want = [...SETTABLE_STAGE_NAMES].sort();
  if (got.length !== want.length || got.some((n, i) => n !== want[i])) {
    throw new Error(
      `settable stage set mismatch — resolved [${got.join(", ")}], expected [${want.join(", ")}]`,
    );
  }
  return map;
}

const conf = (c: number) => c >= MIN_CONFIDENCE;

export function deriveTargetStageName(row: ExtractionRow): string {
  const s = row.signals;
  if (s.outcome === "fantasma") return "Perdido / Nurturing"; // order 5
  if (s.outcome === "pidio-humano") return "Negociación / Agente"; // order 4
  if (s.products_shown.value === true) return "Producto Recomendado"; // order 3
  const qualified =
    s.tipo_interes.value &&
    conf(s.tipo_interes.confidence) &&
    ((s.presupuesto_cop.value != null && conf(s.presupuesto_cop.confidence)) ||
      (s.ocasion.value != null && conf(s.ocasion.confidence)));
  if (qualified) return "Calificado por IA"; // order 2
  return "Nuevo Lead"; // order 1
}

export function chooseStageWrite(
  row: ExtractionRow,
  currentStageId: string,
  settable: Map<string, { id: string; order: number }>,
): { stageId: string } | null {
  const target = settable.get(deriveTargetStageName(row));
  if (!target) return null;
  const current = [...settable.values()].find((v) => v.id === currentStageId);
  const currentOrder = current?.order ?? 0; // unknown/forbidden current stage → treat as 0 so we still only advance into settable set
  if (target.order <= currentOrder) return null; // forward-only, no no-op
  return { stageId: target.id };
}
```

_(Note: `deriveTargetStageName` returns names whose ORDER within the settable set is 1,2,3,4,5 — `Negociación / Agente`=4, `Perdido / Nurturing`=5 in settable order. The pipeline's real positions 5/7 don't matter; forward-only is evaluated within the settable ordering, which preserves monotonicity.)_

- [ ] **Step 4: Run, verify pass; commit**

Run: `npx vitest run tests/backfillStage.test.ts` → PASS; `npm run lint` → clean.

```bash
git add scripts/lib/backfill-stage.ts tests/backfillStage.test.ts
git commit -m "feat(backfill): forward-only stage derivation with settable-set assertion"
```

---

### Task 6: Transcript redaction + rendering

**Files:**

- Create: `scripts/lib/transcript.ts`
- Test: `tests/transcript.test.ts`

**Interfaces:**

- Produces:
  - `redactPII(text: string): string` — replace emails → `[EMAIL]`, phone-like runs → `[TEL]`.
  - `renderTranscript(messages: { direction: "inbound"|"outbound"; body: string }[], opts?: { maxTurns?: number }): string` — role-tagged (`Cliente:` / `Tierra Madre:`), redacted, keeps last `maxTurns` (default 40).

- [ ] **Step 1: Write failing tests**

```ts
// tests/transcript.test.ts
import { describe, it, expect } from "vitest";
import { redactPII, renderTranscript } from "../scripts/lib/transcript";

describe("transcript", () => {
  it("redacts emails and phone numbers", () => {
    const out = redactPII("escríbeme a ana@correo.com o al +57 300 123 4567");
    expect(out).toContain("[EMAIL]");
    expect(out).toContain("[TEL]");
    expect(out).not.toContain("ana@correo.com");
    expect(out).not.toContain("4567");
  });
  it("renders role-tagged, redacted, last-N turns", () => {
    const msgs = Array.from({ length: 50 }, (_, i) => ({
      direction: i % 2 ? ("outbound" as const) : ("inbound" as const),
      body: `m${i}`,
    }));
    const out = renderTranscript(msgs, { maxTurns: 10 });
    expect(out.split("\n")).toHaveLength(10);
    expect(out).toContain("Cliente:");
    expect(out).toContain("Tierra Madre:");
    expect(out).not.toContain("m0"); // trimmed to last 10
  });
});
```

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement `scripts/lib/transcript.ts`**

```ts
// scripts/lib/transcript.ts
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// 7+ digit runs allowing spaces / + / - / parens — catches CO mobile & landline forms.
const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/g;

export function redactPII(text: string): string {
  return text.replace(EMAIL_RE, "[EMAIL]").replace(PHONE_RE, "[TEL]");
}

export function renderTranscript(
  messages: { direction: "inbound" | "outbound"; body: string }[],
  opts: { maxTurns?: number } = {},
): string {
  const maxTurns = opts.maxTurns ?? 40;
  return messages
    .slice(-maxTurns)
    .map(
      (m) =>
        `${m.direction === "inbound" ? "Cliente" : "Tierra Madre"}: ${redactPII(m.body ?? "").trim()}`,
    )
    .join("\n");
}
```

- [ ] **Step 4: Run, verify pass; commit**

Run: `npx vitest run tests/transcript.test.ts` → PASS; `npm run lint` → clean.

```bash
git add scripts/lib/transcript.ts tests/transcript.test.ts
git commit -m "feat(backfill): transcript PII redaction + rendering"
```

---

### Task 7: LLM extraction module

**Files:**

- Create: `scripts/lib/llm-extract.ts`
- Test: `tests/llmExtract.test.ts`

**Interfaces:**

- Produces:
  - `extractJsonObject(text: string): string` (fence-strip + `{`…`}` slice — copy verbatim from `api/fotosintesis-ai.ts:541`).
  - `type LlmFetch = (url: string, init: any) => Promise<{ ok: boolean; status: number; headers: { get(k: string): string | null }; json(): Promise<any>; text(): Promise<string> }>`
  - `extractSignals(transcript: string, opts: { groqKey?: string; gatewayKey?: string; fetchImpl?: LlmFetch }): Promise<any>` — Groq primary (`response_format: json_object`), Gateway spillover on 429/5xx; parses via `extractJsonObject` → `JSON.parse`; throws if both providers fail. The prompt instructs the model to quote evidence verbatim and emit `null` when unsure, and to return exactly the `ExtractionRow.signals` shape.

- [ ] **Step 1: Write failing tests**

````ts
// tests/llmExtract.test.ts
import { describe, it, expect, vi } from "vitest";
import { extractJsonObject, extractSignals } from "../scripts/lib/llm-extract";

const okJson = (obj: unknown) => ({
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: async () => ({
    choices: [{ message: { content: JSON.stringify(obj) } }],
  }),
  text: async () => "",
});

describe("llm-extract", () => {
  it("extractJsonObject strips ```json fences", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("calls Groq first with response_format json_object and returns parsed signals", async () => {
    const f = vi.fn(async () =>
      okJson({ tipo_interes: { value: "anillo", confidence: 0.9 } }),
    );
    const out = await extractSignals("Cliente: quiero un anillo", {
      groqKey: "gk",
      fetchImpl: f,
    });
    expect(out.tipo_interes.value).toBe("anillo");
    const [url, init] = f.mock.calls[0];
    expect(url).toContain("api.groq.com");
    expect(JSON.parse(init.body).response_format).toEqual({
      type: "json_object",
    });
  });
  it("falls back to the gateway on a Groq 429", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "",
      })
      .mockResolvedValueOnce(
        okJson({ tipo_interes: { value: "dije", confidence: 0.8 } }),
      );
    const out = await extractSignals("…", {
      groqKey: "gk",
      gatewayKey: "ak",
      fetchImpl: f,
    });
    expect(out.tipo_interes.value).toBe("dije");
    expect(f.mock.calls[1][0]).toContain("ai-gateway.vercel.sh");
  });
  it("throws when all providers fail", async () => {
    const f = vi.fn(async () => ({
      ok: false,
      status: 500,
      headers: { get: () => null },
      json: async () => ({}),
      text: async () => "",
    }));
    await expect(
      extractSignals("…", { groqKey: "gk", gatewayKey: "ak", fetchImpl: f }),
    ).rejects.toThrow();
  });
});
````

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement `scripts/lib/llm-extract.ts`** — copy `extractJsonObject` verbatim from `api/fotosintesis-ai.ts:541-549`; port the `RETRYABLE_STATUS`/`fetchUpstreamWithRetry` logic (`api/fotosintesis-ai.ts:445-481`) to accept the injectable `fetchImpl`; build the two provider targets (Groq `https://api.groq.com/openai/v1/chat/completions` model `llama-3.1-8b-instant` with `response_format: {type:"json_object"}`; Gateway `https://ai-gateway.vercel.sh/v1/chat/completions` model `google/gemini-2.5-flash-lite`, no `response_format`), Groq first when `groqKey` present. The system prompt: _"Eres un analista. Extrae SOLO JSON con la forma de signals dada. Cita evidencia textual (campo evidence) y usa null cuando no estés seguro. No inventes valores."_ + the JSON shape of `ExtractionRow.signals`. Parse each provider reply with `extractJsonObject` → `JSON.parse`; on parse failure try the next provider; throw if none succeed.

- [ ] **Step 4: Run, verify pass; commit**

Run: `npx vitest run tests/llmExtract.test.ts` → PASS; `npm run lint` → clean.

```bash
git add scripts/lib/llm-extract.ts tests/llmExtract.test.ts
git commit -m "feat(backfill): LLM signal extraction (Groq primary, gateway spillover)"
```

---

### Task 8: `analyze-conversations.ts` + import-graph safety test + wiring

**Files:**

- Create: `scripts/analyze-conversations.ts`
- Create: `tests/analyzeImportGraph.test.ts`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**

- Consumes: all of `ghl-read.ts`, `scripts/lib/{types,transcript,llm-extract}.ts`.
- Produces: writes `scripts/.analysis-runs/<ts>/dataset.json` (`{ run, rows }` envelope) + `report.md`. `--limit N` flag.

- [ ] **Step 1: Write the import-graph safety test (failing)**

```ts
// tests/analyzeImportGraph.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("analyze-conversations import safety", () => {
  it("does not import the writer module ghl-client", () => {
    const src = readFileSync("scripts/analyze-conversations.ts", "utf8");
    expect(src).not.toMatch(/ghl-client/);
    expect(src).toMatch(/ghl-read/);
  });
});
```

- [ ] **Step 2: Run, verify fail** — FAIL (file `scripts/analyze-conversations.ts` does not exist yet).

- [ ] **Step 3: Implement `scripts/analyze-conversations.ts`**

```ts
// scripts/analyze-conversations.ts
//
// READ-ONLY. Mines the last 30 days of GHL conversations, extracts funnel
// signals via LLM, writes dataset.json + report.md. Imports ghl-read (never
// ghl-client). See docs/superpowers/specs/2026-07-02-ghl-conversation-analysis-backfill-design.md
//
// Usage:
//   npx tsx scripts/analyze-conversations.ts            # full 30-day window
//   npx tsx scripts/analyze-conversations.ts --limit 10 # sample
// Requires: GHL_TOKEN, GHL_LOCATION_ID in .env.local

import { mkdirSync, writeFileSync } from "node:fs";
import * as dotenv from "dotenv";
import {
  searchConversations,
  getConversationMessages,
  type GhlReadConfig,
} from "../api/_lib/ghl-read.js";
import { renderTranscript } from "./lib/transcript.js";
import { extractSignals } from "./lib/llm-extract.js";
import type { ExtractionRow } from "./lib/types.js";

dotenv.config({ path: ".env.local" });

const token = process.env.GHL_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;
if (!token || !locationId)
  throw new Error("GHL_TOKEN and GHL_LOCATION_ID required in .env.local");
const cfg: GhlReadConfig = { token, locationId };

const args = process.argv.slice(2);
const limitArg = args.find((_, i) => args[i - 1] === "--limit");
const LIMIT = limitArg ? Number(limitArg) : Infinity;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function main() {
  const now = Date.now();
  console.log(
    `=== analyze-conversations (last 30d${Number.isFinite(LIMIT) ? `, limit ${LIMIT}` : ""}) ===`,
  );
  const convos = await searchConversations(cfg, {
    startDate: now - WINDOW_MS,
    endDate: now,
  });

  // Group conversations by contact.
  const byContact = new Map<string, { name?: string; ids: string[] }>();
  for (const c of convos) {
    const e = byContact.get(c.contactId) ?? { name: c.fullName, ids: [] };
    e.ids.push(c.id);
    if (!e.name) e.name = c.fullName;
    byContact.set(c.contactId, e);
  }

  const rows: ExtractionRow[] = [];
  let processed = 0;
  for (const [contactId, { name, ids }] of byContact) {
    if (processed >= LIMIT) break;
    try {
      const msgs = (
        await Promise.all(ids.map((id) => getConversationMessages(cfg, id)))
      )
        .flat()
        .sort((a, b) => (a.dateAdded < b.dateAdded ? -1 : 1));
      if (!msgs.length) continue;
      const transcript = renderTranscript(msgs);
      const signals = await extractSignals(transcript, {
        groqKey: process.env.GROQ_API_KEY ?? process.env.VITE_GROQ_API_KEY,
        gatewayKey: process.env.AI_GATEWAY_API_KEY,
      });
      rows.push({
        contactId,
        contactName: name,
        conversationId: ids[ids.length - 1],
        conversationIds: ids,
        channel: signals.__channel ?? "unknown",
        signals,
        tipo_interes_evidence: signals.__tipo_evidence,
      } as ExtractionRow);
      processed++;
      if (processed % 10 === 0)
        console.log(`  …${processed} contacts extracted`);
    } catch (err) {
      console.error(
        `  contact ${contactId} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const ts = new Date(now).toISOString().replace(/[:.]/g, "-");
  const dir = `scripts/.analysis-runs/${ts}`;
  mkdirSync(dir, { recursive: true });
  const dataset = {
    run: {
      window: "30d",
      generatedAt: new Date(now).toISOString(),
      model: "groq/llama-3.1-8b-instant",
      counts: { contacts: rows.length, conversations: convos.length },
    },
    rows,
  };
  writeFileSync(`${dir}/dataset.json`, JSON.stringify(dataset, null, 2));
  writeFileSync(`${dir}/report.md`, buildReport(dataset));
  console.log(
    `=== wrote ${dir}/dataset.json (${rows.length} rows) + report.md ===`,
  );
}

function buildReport(dataset: { rows: ExtractionRow[] }): string {
  const rows = dataset.rows;
  const dist = (pick: (r: ExtractionRow) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = pick(r) ?? "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `- ${k}: ${n}`)
      .join("\n");
  };
  return [
    `# Conversation Analysis Report`,
    ``,
    `Contacts: ${rows.length}`,
    ``,
    `## tipo_interes`,
    dist((r) => r.signals.tipo_interes.value),
    ``,
    `## ocasión`,
    dist((r) => r.signals.ocasion.value),
    ``,
    `## canal`,
    dist((r) => r.channel),
    ``,
    `## outcome`,
    dist((r) => r.signals.outcome),
    ``,
    `## tipo_interes → categoría evidence`,
    ...rows
      .filter((r) => r.tipo_interes_evidence?.asked_for_plain)
      .map(
        (r) =>
          `- **${r.contactName ?? r.contactId}** (${r.signals.tipo_interes.value ?? "?"}): "${r.tipo_interes_evidence!.asked_for_plain}"`,
      ),
    ``,
    `## Low-confidence rows (review)`,
    ...rows
      .filter(
        (r) =>
          r.signals.tipo_interes.value &&
          r.signals.tipo_interes.confidence < 0.6,
      )
      .map(
        (r) =>
          `- ${r.contactName ?? r.contactId}: tipo_interes conf ${r.signals.tipo_interes.confidence}`,
      ),
  ].join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

_(The LLM is asked to also return `__channel` and `__tipo_evidence` alongside `signals`; the prompt in Task 7 includes them. If the model omits `__channel`, it defaults to `"unknown"`.)_

- [ ] **Step 4: Add npm scripts + gitignore**

Add to `package.json` `"scripts"`:

```json
"analyze:conversations": "tsx scripts/analyze-conversations.ts",
"analyze:conversations:dry": "tsx scripts/analyze-conversations.ts --limit 10"
```

Add to `.gitignore`:

```
scripts/.analysis-runs/
```

- [ ] **Step 5: Run tests + lint, verify pass; commit**

Run: `npx vitest run tests/analyzeImportGraph.test.ts` → PASS; `npm run lint` → clean.

```bash
git add scripts/analyze-conversations.ts tests/analyzeImportGraph.test.ts package.json .gitignore
git commit -m "feat(backfill): read-only analyze-conversations extract script + import-graph guard"
```

---

### Task 9: `apply-backfill.ts` (guarded write) + plan/gate tests

**Files:**

- Create: `scripts/lib/apply-plan.ts` (pure planning), `scripts/apply-backfill.ts` (IO/gating)
- Test: `tests/applyPlan.test.ts`

**Interfaces:**

- `scripts/lib/apply-plan.ts` produces:
  - `interface ContactPlan { contactId: string; fieldWrites: { key: string; field_value: string | number }[]; tags: string[]; stage: { stageId: string } | null }`
  - `planContactWrites(row: ExtractionRow, ctx: { currentFieldsByKey: Record<string, unknown>; currentTags: string[]; currentStageId: string | null; settable: Map<string, { id: string; order: number }> }): ContactPlan` — composes `deriveFieldWrites` + `deriveTags` (minus already-present tags) + `chooseStageWrite` (only when `currentStageId` present).
- `scripts/apply-backfill.ts` produces the CLI: `--apply` (default dry-run), `--all-contacts`, `--no-stage`, `--limit N`; resolves the 3 test contacts to IDs at startup.

- [ ] **Step 1: Write failing tests**

```ts
// tests/applyPlan.test.ts
import { describe, it, expect } from "vitest";
import { planContactWrites } from "../scripts/lib/apply-plan";
import { buildSettableStageMap } from "../scripts/lib/backfill-stage";
import type { ExtractionRow } from "../scripts/lib/types";

const FULL = [
  { id: "s1", name: "Nuevo Lead" },
  { id: "s2", name: "Calificado por IA" },
  { id: "s3", name: "Producto Recomendado" },
  { id: "s4", name: "Carrito Enviado" },
  { id: "s5", name: "Negociación / Agente" },
  { id: "s6", name: "Venta Cerrada" },
  { id: "s7", name: "Perdido / Nurturing" },
];
const settable = buildSettableStageMap(FULL);
const row: ExtractionRow = {
  contactId: "c-1",
  conversationId: "cv",
  conversationIds: ["cv"],
  channel: "whatsapp",
  signals: {
    tipo_interes: { value: "anillo", confidence: 0.9 },
    presupuesto_cop: { value: 4_000_000, confidence: 0.9 },
    ocasion: { value: "regalo", confidence: 0.9 },
    ciudad: { value: "Cali", confidence: 0.9 },
    conocimiento: { value: "novato", confidence: 0.9 },
    urgencia: { value: "media", confidence: 0.9 },
    products_shown: { value: false },
    sentiment: { value: "interesado", confidence: 0.9 },
    objeciones: [],
    outcome: "respondido-sin-cierre",
  },
};

describe("planContactWrites", () => {
  it("composes field writes, tags, and a forward-only stage move for an existing opp", () => {
    const plan = planContactWrites(row, {
      currentFieldsByKey: {},
      currentTags: [],
      currentStageId: "s1",
      settable,
    });
    expect(plan.fieldWrites.map((w) => w.key)).toEqual(
      expect.arrayContaining([
        "tipo_interes",
        "presupuesto_declarado",
        "canal_origen",
      ]),
    );
    expect(plan.tags).toEqual(
      expect.arrayContaining([
        "interes-anillo",
        "ocasion-regalo",
        "canal-whatsapp",
      ]),
    );
    expect(plan.stage).toEqual({ stageId: "s2" }); // qualified, forward from Nuevo Lead
  });
  it("drops tags the contact already has", () => {
    const plan = planContactWrites(row, {
      currentFieldsByKey: {},
      currentTags: ["interes-anillo"],
      currentStageId: "s1",
      settable,
    });
    expect(plan.tags).not.toContain("interes-anillo");
  });
  it("no opportunity → no stage move", () => {
    const plan = planContactWrites(row, {
      currentFieldsByKey: {},
      currentTags: [],
      currentStageId: null,
      settable,
    });
    expect(plan.stage).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement `scripts/lib/apply-plan.ts`**

```ts
// scripts/lib/apply-plan.ts
import type { ExtractionRow } from "./types";
import { deriveFieldWrites } from "./backfill-fields";
import { deriveTags } from "./backfill-tags";
import { chooseStageWrite } from "./backfill-stage";

export interface ContactPlan {
  contactId: string;
  fieldWrites: { key: string; field_value: string | number }[];
  tags: string[];
  stage: { stageId: string } | null;
}

export function planContactWrites(
  row: ExtractionRow,
  ctx: {
    currentFieldsByKey: Record<string, unknown>;
    currentTags: string[];
    currentStageId: string | null;
    settable: Map<string, { id: string; order: number }>;
  },
): ContactPlan {
  const { writes } = deriveFieldWrites(row, ctx.currentFieldsByKey);
  const already = new Set(ctx.currentTags.map((t) => t.toLowerCase().trim()));
  const tags = deriveTags(row).filter((t) => !already.has(t));
  const stage = ctx.currentStageId
    ? chooseStageWrite(row, ctx.currentStageId, ctx.settable)
    : null;
  return { contactId: row.contactId, fieldWrites: writes, tags, stage };
}
```

- [ ] **Step 4: Implement `scripts/apply-backfill.ts`**

```ts
// scripts/apply-backfill.ts
//
// GUARDED WRITE. Reads a reviewed dataset.json and passively backfills EXISTING
// GHL contacts. Default DRY-RUN — requires --apply. Without --all-contacts,
// writes only to the 3 test contacts. See the design spec.
//
// Usage:
//   npx tsx scripts/apply-backfill.ts <dataset.json>                 # dry-run, 3 test contacts
//   npx tsx scripts/apply-backfill.ts <dataset.json> --apply         # write, 3 test contacts
//   npx tsx scripts/apply-backfill.ts <dataset.json> --apply --all-contacts   # write, everyone (typed confirm)
//   flags: --no-stage, --limit N
// Requires: GHL_TOKEN, GHL_LOCATION_ID in .env.local

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import * as dotenv from "dotenv";
import {
  getContact,
  getCustomFieldDefs,
  getPipelines,
  findContactOpportunity,
  searchConversations,
  type GhlReadConfig,
} from "../api/_lib/ghl-read.js";
import {
  updateContactFields,
  addTags,
  updateOpportunityStage,
  type GhlConfig,
} from "../api/_lib/ghl-client.js";
import { buildSettableStageMap } from "./lib/backfill-stage.js";
import { planContactWrites } from "./lib/apply-plan.js";
import type { ExtractionRow } from "./lib/types.js";

dotenv.config({ path: ".env.local" });
const token = process.env.GHL_TOKEN,
  locationId = process.env.GHL_LOCATION_ID;
if (!token || !locationId)
  throw new Error("GHL_TOKEN and GHL_LOCATION_ID required");
const readCfg: GhlReadConfig = { token, locationId };
const writeCfg: GhlConfig = { token, locationId };
const PIPELINE_ID = "u4MPXH2HdEFmU3vVqNdd";
const TEST_CONTACT_NAMES = [
  "Kevin Tres Toj",
  "Juan Ma Escobar",
  "Isa La Negra Vikinga",
];

const args = process.argv.slice(2);
const datasetPath = args.find((a) => !a.startsWith("--"));
const APPLY = args.includes("--apply");
const ALL = args.includes("--all-contacts");
const NO_STAGE = args.includes("--no-stage");
const limitArg = args.find((_, i) => args[i - 1] === "--limit");
const LIMIT = limitArg ? Number(limitArg) : Infinity;
if (!datasetPath) throw new Error("pass the dataset.json path");

async function confirm(q: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(q, (a) => {
      rl.close();
      res(a.trim().toUpperCase() === "APLICAR");
    }),
  );
}

async function resolveTestContactIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const name of TEST_CONTACT_NAMES) {
    // /conversations/search returns fullName; match exactly (case-insensitive).
    const found = (await searchConversations(readCfg, {})).filter(
      (c) => (c.fullName ?? "").toLowerCase() === name.toLowerCase(),
    );
    const unique = new Set(found.map((c) => c.contactId));
    if (unique.size !== 1)
      throw new Error(
        `test contact "${name}" resolved to ${unique.size} contacts — aborting`,
      );
    ids.add([...unique][0]);
  }
  return ids;
}

async function main() {
  const dataset = JSON.parse(readFileSync(datasetPath!, "utf8")) as {
    rows: ExtractionRow[];
  };
  const settable = buildSettableStageMap(
    (await getPipelines(readCfg)).find((p) => p.id === PIPELINE_ID)?.stages ??
      [],
  );
  const defs = await getCustomFieldDefs(readCfg);
  const idToKey = new Map(defs.map((d) => [d.id, d.fieldKey]));

  let rows = dataset.rows.filter((r) => r.contactId);
  if (!ALL) {
    const testIds = await resolveTestContactIds();
    rows = rows.filter((r) => testIds.has(r.contactId));
    console.log(`Scoped to ${rows.length} test-contact row(s).`);
  } else {
    console.log(
      `⚠️  --all-contacts: this will target ${rows.length} REAL contacts.`,
    );
    if (
      APPLY &&
      !(await confirm('Type "APLICAR" to write to all contacts: '))
    ) {
      console.log("Aborted.");
      return;
    }
  }
  if (Number.isFinite(LIMIT)) rows = rows.slice(0, LIMIT);

  console.log(
    `=== apply-backfill ${APPLY ? "APPLY" : "DRY-RUN"} · ${rows.length} contacts · stage ${NO_STAGE ? "off" : "on"} ===`,
  );
  let fieldW = 0,
    tagW = 0,
    stageW = 0;
  for (const row of rows) {
    try {
      const contact = await getContact(readCfg, row.contactId);
      const currentFieldsByKey: Record<string, unknown> = {};
      for (const cf of contact.customFields) {
        const k = idToKey.get(cf.id);
        if (k) currentFieldsByKey[k] = cf.value;
      }
      const opp = NO_STAGE
        ? null
        : await findContactOpportunity(readCfg, row.contactId, PIPELINE_ID);
      const plan = planContactWrites(row, {
        currentFieldsByKey,
        currentTags: contact.tags,
        currentStageId: opp?.pipelineStageId ?? null,
        settable,
      });

      const label = `${row.contactName ?? row.contactId}`;
      if (plan.fieldWrites.length) {
        console.log(
          `  ${label}: fields ${plan.fieldWrites.map((w) => w.key).join(", ")}`,
        );
        if (APPLY)
          await updateContactFields(writeCfg, row.contactId, plan.fieldWrites);
        fieldW += plan.fieldWrites.length;
      }
      if (plan.tags.length) {
        console.log(`  ${label}: tags ${plan.tags.join(", ")}`);
        if (APPLY) await addTags(writeCfg, row.contactId, plan.tags);
        tagW += plan.tags.length;
      }
      if (plan.stage) {
        console.log(`  ${label}: stage → ${plan.stage.stageId}`);
        if (APPLY)
          await updateOpportunityStage(writeCfg, opp!.id, plan.stage.stageId);
        stageW++;
      }
      if (!APPLY && (plan.fieldWrites.length || plan.tags.length || plan.stage))
        console.log(`    [DRY RUN — no writes]`);
    } catch (err) {
      console.error(
        `  contact ${row.contactId} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(
    `=== ${APPLY ? "wrote" : "would write"} fields:${fieldW} tags:${tagW} stages:${stageW} ===`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Add npm script; run tests + lint; commit**

Add to `package.json` `"scripts"`: `"apply:backfill": "tsx scripts/apply-backfill.ts"`.
Run: `npx vitest run tests/applyPlan.test.ts` → PASS; `npm run lint` → clean; `npx vitest run` → all green.

```bash
git add scripts/lib/apply-plan.ts scripts/apply-backfill.ts tests/applyPlan.test.ts package.json
git commit -m "feat(backfill): guarded apply-backfill script (dry-run default, test-contact gate)"
```

---

## Self-review (author checklist — completed)

- **Spec coverage:** read module (T1), stage writer (T2), fields+enums+only-if-empty (T3), frozen tag map + denylist (T4), forward-only stage + settable-set (T5), redaction+render (T6), LLM Groq-primary+retry (T7), analyze script + import-graph guard + gitignored output (T8), guarded apply + in-code test-contact gate + dry-run default (T9). Confidence-gate present in T3/T4/T5. `tipo_interes` live enum used in T3.
- **Placeholders:** none — every step has runnable code/commands. The two `verify-live` items the spec calls out (exact `/customFields` endpoint shape; stage-name API form) are handled defensively (fieldKey prefix-strip; `stripPrefix` + settable-set assertion) so a live mismatch fails loudly rather than silently mis-writing.
- **Type consistency:** `ExtractionRow`/`Signal` defined once (T3) and consumed unchanged by T4/T5/T8/T9; `GhlReadConfig`/`GhlConfig` used consistently; `buildSettableStageMap`/`chooseStageWrite`/`deriveFieldWrites`/`deriveTags`/`planContactWrites` signatures match across tasks and tests.
