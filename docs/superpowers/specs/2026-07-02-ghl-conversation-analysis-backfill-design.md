# GHL Conversation Analysis → Funnel Backfill — Design

**Date:** 2026-07-02
**Status:** Approved design (hardened after adversarial review), pre-implementation
**Scope:** One-off (not a recurring job)

## Context

Tierra Madre's GoHighLevel/Progresy CRM has ~111 real inbound conversations (WhatsApp/SMS/Instagram) that were never worked, because the Conversation-AI bot "María" was Disabled and a placeholder bot held the Principal slot — so nothing ever auto-responded or captured funnel data. (María has since been set to Principal + Suggestive Mode; she now drafts replies for human review, but the historical backlog remains uncaptured.)

Those contacts have **empty funnel fields**: `tipo_interes`, `presupuesto_declarado`, `ciudad`, occasion, channel, etc. are blank, so WF-04's product ranking degrades to budget-only and the leads sit outside the pipeline. Separately, a prior attempt to derive a `tipo_interes → categoria` (piece-type → emerald-collection) mapping from catalog metadata alone was inconclusive (see `GHL/tipo-interes-mapping-analysis.md`) — the axes proved orthogonal in the catalog data, which never looked at what customers actually _said_.

This project mines the real conversation transcripts to (a) backfill the existing GHL funnel structure — custom fields, existing passive tags, and opportunity pipeline stage — for those contacts, and (b) produce the real-language evidence needed to finally resolve the `tipo_interes → categoria` decision.

**Read-only-then-review posture:** extraction never writes to GHL; a separate, heavily-guarded apply step does the writes, defaulting to dry-run, after a human reviews the dataset. Re-engaging the backlog (actually messaging those 111) is explicitly **out of scope** — a separate future decision.

## Goal / Non-goals

**Goals**

- Extract structured signals from the last **30 days** of conversations.
- Backfill safe, passive GHL data on **existing** contacts: custom fields (first-touch / only-if-empty), a small whitelist of descriptive tags, and (forward-only, existing-opportunity-only) pipeline stage.
- Emit a human-readable report + a structured dataset, including the `tipo_interes → categoria` evidence.

**Non-goals (this pass)**

- No customer messaging / re-engagement of any kind.
- No writing of code-owned or GHL-owned fields (`lead_score`, `total_comprado_cop`, `order_id`, …).
- **No contact creation; no opportunity creation; no workflow enrollment.**
- Not a recurring pipeline (one-off).

## Architecture

Two scripts with a reviewed JSON handoff. Read and write are separated by a **real module boundary**, not just convention:

```
analyze-conversations.ts   (imports ONLY api/_lib/ghl-read.ts + LLM)
        │  searchConversations → getConversationMessages → LLM extraction
        ▼
   scripts/.analysis-runs/<ts>/dataset.json + report.md      (gitignored; contains customer transcripts)
        │  ← human reviews / edits
        ▼
apply-backfill.ts   (imports the writers from api/_lib/ghl-client.ts)
        │  default DRY-RUN; requires --apply; first real run gated to 3 test contacts
        ▼  updateContactFields (fields) · addTags (whitelisted) · updateOpportunityStage (existing, forward-only)
```

### New code

**`api/_lib/ghl-read.ts` (new, read-only module)** — so the analysis script's import graph cannot reference a writer:

- `getConversationMessages(cfg, conversationId, opts?)` → `GET /conversations/{conversationId}/messages`. Response `{ messages: { lastMessageId, nextPage, messages: [{ id, type, direction, body, dateAdded }] } }`; `body` is the text, `direction` ∈ `inbound|outbound`, `type` ∈ `TYPE_WHATSAPP|TYPE_SMS|TYPE_EMAIL|…`. Pages via `lastMessageId` cursor to a max cap.
- `searchConversations(cfg, {contactId?, startDate?, endDate?})` → `GET /conversations/search`. Returns conversation summaries incl. `contactId`, `fullName`.
- `getContact(cfg, contactId)` / `getContactTags(cfg, contactId)` → `GET /contacts/{id}` — read current field values + tags for only-if-empty / idempotency checks.
- `getPipelines(cfg)` → `GET /opportunities/pipelines` — resolve stage names → live stage IDs.
- `findContactOpportunity(cfg, contactId)` → `GET /opportunities/search?location_id=&contact_id=`, return the opportunity in pipeline `Ventas Tierra Madre` (`u4MPXH2HdEFmU3vVqNdd`); if several, the most recent; if none, `null`.

All share the auth from `ghl-client.ts` (`Authorization: Bearer <GHL_TOKEN>`, `Version: 2021-07-28`) and an injectable `fetchImpl`. A unit test asserts `analyze-conversations.ts`'s import graph excludes `ghl-client.ts`'s write functions.

**`api/_lib/ghl-client.ts` (extend)** — add `updateOpportunityStage(cfg, opportunityId, stageId)` → `PUT /opportunities/{id}` (or the documented stage-move endpoint). Keeps the existing writers `updateContactFields`, `addTags` (never used by the read path).

## Script 1 — `scripts/analyze-conversations.ts` (read-only extract)

**Convention:** `npx tsx`, `dotenv.config({ path: '.env.local' })`, creds from `process.env.GHL_TOKEN` / `process.env.GHL_LOCATION_ID` (`t3tOZBrR05jUoLqnDn4I`). npm scripts `analyze:conversations` + `analyze:conversations:dry`.

**Flow**

1. `searchConversations({ startDate: now-30d, endDate: now })` paged → collect `(contactId, conversationId, fullName)`. **One extraction row per `contactId`**: if a contact has multiple conversations, concatenate them oldest→newest into a single transcript; `conversationId` records the newest, `conversationIds[]` records all.
2. `getConversationMessages` per conversation → transcript, keeping `direction`/`type`.
3. **Redact PII before the LLM call:** regex-scrub phone numbers and emails to `[TEL]`/`[EMAIL]` in the transcript text (best-effort; addresses can't be reliably regexed — noted as residual). Customer content still egresses to the LLM provider; accepted for this analysis (see Open Items).
4. Render a role-tagged, length-capped transcript (keep last ~40 turns if long).
5. LLM extraction: Groq primary (`response_format:{type:'json_object'}`, `llama-3.1-8b-instant`, `temp 0.2`, `max_tokens ~800`); Gateway (`google/gemini-2.5-flash-lite`, no `response_format`) spillover. Reuse `extractJsonObject()` + `fetchUpstreamWithRetry()` from `api/fotosintesis-ai.ts`. The prompt (implementer's discretion) **must** instruct the model to quote evidence verbatim and emit `null` when unsure. Groq is primary because the Gateway free tier (~10/min, ~250/day) can't absorb a 100–300 burst.
6. Validate/coerce against live enums; attach `confidence` + `evidence`. Write `dataset.json` + `report.md`. **No GHL writes.**

`--limit N` for a sample run.

### Extraction schema (per contact, LLM → JSON)

```jsonc
{
  "contactId": "…",
  "contactName": "…", // from searchConversations fullName; for readable report + test-contact match
  "conversationId": "…", // newest
  "conversationIds": ["…"],
  "channel": "whatsapp|instagram|tiktok|web|evento|unknown",
  "signals": {
    "tipo_interes": {
      "value": "topito|candonga|anillo|dije|gema_suelta|set|otro|null",
      "confidence": 0.0,
      "evidence": "…",
    },
    "presupuesto_cop": {
      "value": 12000000 /* or null when absent — NEVER 0 for unknown */,
      "confidence": 0.0,
      "evidence": "…",
    },
    "ocasion": {
      "value": "regalo|cumpleanos|aniversario|matrimonio|diario|inversion|evento-especial|null",
      "confidence": 0.0,
      "evidence": "…",
    },
    "ciudad": { "value": "…|null", "confidence": 0.0, "evidence": "…" },
    "conocimiento": {
      "value": "novato|intermedio|experto|null",
      "confidence": 0.0,
      "evidence": "…",
    },
    "urgencia": {
      "value": "alta|media|baja|null",
      "confidence": 0.0,
      "evidence": "…",
    },
    "products_shown": { "value": true, "evidence": "…" }, // did WE present product options in-thread?
    "sentiment": {
      "value": "interesado|sensible-precio|frustrado|listo-comprar|indeciso",
      "confidence": 0.0,
      "evidence": "…",
    },
    "objeciones": ["precio|envio|estilo|confianza|…"],
    "outcome": "sin-respuesta-negocio|respondido-sin-cierre|pidio-humano|compro|fantasma",
  },
  "tipo_interes_evidence": {
    "asked_for_plain": "…",
    "maps_to_categoria_hint": "…",
  },
}
```

`sentiment`, `objeciones`, `outcome` are **report-only** (see safety note) — they never map to a tag or write, precisely because `outcome:pidio-humano/compro` and `sentiment:listo-comprar` are semantic twins of the active DENY tags (`pide-humano`, `quiere-comprar`).

### dataset.json envelope

```jsonc
{
  "run": {
    "window": "30d",
    "generatedAt": "<ISO>",
    "model": "…",
    "counts": { "contacts": 0, "conversations": 0 },
  },
  "rows": [
    /* extraction rows above */
  ],
}
```

The apply script reads `.rows`.

## Script 2 — `scripts/apply-backfill.ts` (guarded write)

**Positive-flag safety posture** (deliberately inverting the repo's default-apply idiom):

- `const apply = process.argv.includes('--apply')` — default **false**. Every write is wrapped `if (!apply) { log('[DRY RUN] would …'); continue; }`. There is no `--dry-run` flag (absence of `--apply` _is_ dry-run).
- **Contact scoping enforced in code:** without `--all-contacts`, writes target only a hard-coded 3-test-contact set resolved to `contactId`s at startup (Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga per `tm-ghl-test-contacts-only`) — resolved via `searchConversations`/`getContact`, printed, and **aborting if any name resolves to ≠1 contact**. `--all-contacts` requires a typed confirmation and logs the exact contact count before proceeding.
- Targets are always `contactId`s from the dataset (never fuzzy name matching for the write itself).
- `--stage` / `--no-stage` (stage default **on**), `--limit N`.
- **Confidence gate:** any signal with `confidence < 0.6` is skipped and logged (applies to fields, tags, and stage evidence alike).

Per row, to the **existing** `contactId`:

**(a) Custom fields** — `updateContactFields` (PUT `/contacts/{id}`, value under `field_value`), **only-if-empty (first-touch) for every field** (read current via `getContact`; never overwrite an existing value written by María/WF-03), each validated against its live enum (invalid dropdown value → skip + log). Signal→field key mapping:

| Write? | Signal key                               | GHL field key                               | Type / enum                                                                                           |
| ------ | ---------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| ✅     | `tipo_interes.value`                     | `tipo_interes`                              | dropdown `topito·candonga·anillo·dije·gema_suelta·set·otro` (live 7-value set; docs' `gema` is stale) |
| ✅     | `presupuesto_cop.value` (skip if `null`) | `presupuesto_declarado`                     | number                                                                                                |
| ✅     | `ciudad.value`                           | `ciudad`                                    | text                                                                                                  |
| ✅     | `channel`                                | `canal_origen`                              | dropdown `whatsapp·instagram·tiktok·web·evento`                                                       |
| ✅     | `conocimiento.value`                     | `conocimiento_esmeraldas`                   | dropdown `novato·intermedio·experto`                                                                  |
| ⚠️ opt | —                                        | `canal_preferido`                           | enum unverified — only if confirmed live                                                              |
| ❌     | —                                        | `lead_score`                                | **GHL-owned; golden rule #6 — never write**                                                           |
| ❌     | —                                        | `total_comprado_cop`, `ultima_compra_fecha` | code-owned (`mp-webhook.ts`)                                                                          |
| ❌     | —                                        | `order_id`, `producto_seleccionado_sku`     | WF-05-owned                                                                                           |
| ❌     | —                                        | `embajador_asignado`, `supabase_contact_id` | ambassador-owned / orphaned                                                                           |

**(b) Tags** — `addTags` (additive POST). Emitted **only** from a **frozen literal-string allowlist map** (never runtime-constructed via string interpolation); anything not in the map is never produced. A **denylist** is a belt-and-suspenders second check. Every candidate is `lowercase`+`trim` normalized before both checks.

Signal → tag (the complete map — nothing else is ever emitted):

| Signal value                                                                          | Tag emitted                                                                                  |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `tipo_interes` = topito / anillo / dije / gema_suelta / set                           | `interes-topito` / `interes-anillo` / `interes-dije` / `interes-gema-suelta` / `interes-set` |
| `tipo_interes` = **candonga** or **otro**                                             | **(no tag — no such tag exists)**                                                            |
| `ocasion` = regalo/cumpleanos/aniversario/matrimonio/diario/inversion/evento-especial | `ocasion-<value>` (all 7 exist)                                                              |
| `channel` = whatsapp/instagram/tiktok/web/evento                                      | `canal-<value>`                                                                              |
| `urgencia` = **alta**                                                                 | `urgencia` (media/baja → no tag)                                                             |
| `products_shown` = **true**                                                           | `productos-mostrados` (no Manage-Scoring weight; safe)                                       |
| `sentiment` / `outcome` / `objeciones`                                                | **never a tag (report-only)**                                                                |

**DENY (refused even if somehow present) — every active/trigger or scoring-mutating tag:** `cliente-pago-confirmado`, `pide-humano`, `buscar-catalogo`, `quiere-comprar`, `qualification_complete`, `lead-frio`, **`carrito-enviado`** (carries Manage-Scoring **+30**, which mutates the GHL-owned `lead_score` — golden rule #6 — and falsely asserts a cart event). The allowlist above is confirmed free of Manage-Scoring weights.

**(c) Opportunity pipeline stage** — default-on, **existing-opportunity-only, forward-only.** Never creates an opportunity (WF-01, Published, already created a `Nuevo Lead` opportunity + sent the welcome WhatsApp for these contacts; creating is both risky and moot). Mechanics:

- `getPipelines` → build the **settable** stage-ID map, and **assert it contains exactly** `{Nuevo Lead(1), Calificado por IA(2), Producto Recomendado(3), Negociación / Agente(5), Perdido / Nurturing(7)}` — `Carrito Enviado(4)` and `Venta Cerrada(6)` IDs are dropped from the map entirely, so no name-matching bug (UI labels carry `1.`–`7.` + emoji prefixes) can ever target them.
- `findContactOpportunity` → if none, **skip** (never create). Read current stage.
- Set to the **highest evidenced** stage **≥ current** (never regress):

| Evidence                                                        | Target stage                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| default                                                         | `Nuevo Lead` (1)                                                         |
| interest + budget/occasion extracted (qualified), all ≥0.6 conf | `Calificado por IA` (2)                                                  |
| `products_shown.value === true`                                 | `Producto Recomendado` (3)                                               |
| `outcome === "pidio-humano"`                                    | `Negociación / Agente` (5) — **stage only, never the `pide-humano` tag** |
| `outcome === "fantasma"`                                        | `Perdido / Nurturing` (7)                                                |

**Pre-flight (required before any `--apply` stage run):** verify against live GHL that no workflow triggers on "Opportunity Created" or "Opportunity Stage Changed" (none known, but unverified). If any exists, run with `--no-stage`.

**Idempotency:** `getContact`/`getContactTags`/current-stage read before each write; skip no-ops. Batched (~50), per-item try/catch, `=== Section ===` output, progress logging, `main().catch()`.

## Outputs

- `scripts/.analysis-runs/<ts>/dataset.json` (envelope above) and `report.md`. **Path is gitignored** (contains customer transcripts + PII).
- `report.md`: interest/budget/channel/sentiment/outcome distributions; the **`tipo_interes → categoria` evidence** (real customer language vs any collection cue — the artifact for that stuck decision); a **backlog funnel-state summary** (qualifiable / ghosted / asked-for-human-and-never-got-one); low-confidence rows flagged for manual review.

## Safety model (crux)

1. **Module-level read/write split** — analysis imports only `ghl-read.ts`; a test asserts its import graph excludes the writers. (Not merely "doesn't call them.")
2. **Existing contacts & opportunities only** — never `upsertContact` (creating a contact fires WF-01's welcome WhatsApp); never create opportunities; never `addToWorkflow`.
3. **Field whitelist + only-if-empty + enum validation;** never `lead_score` or code-owned fields; budget `null` is skipped (never write 0).
4. **Tag via frozen literal allowlist map** (report-signals can never become tags) **+ denylist** (incl. `carrito-enviado`); normalized before both checks; a unit test proves `outcome:compro/pidio-humano`, `sentiment:listo-comprar`, and `tipo_interes:candonga/otro` emit **zero** tags.
5. **Stage: forward-only, existing-only, settable set asserted = {1,2,3,5,7}** so `Carrito Enviado`/`Venta Cerrada` are unreachable; pre-flight trigger check required.
6. **Positive `--apply` flag** (default dry-run) + **in-code 3-test-contact gate** (broad run needs `--all-contacts` + typed confirmation + logged count); a test asserts zero write calls with no flags.
7. **Confidence ≥ 0.6** required to write anything.
8. **Re-confirm live workflow publish status before an apply run** — ALLOW tags are chosen trigger-free, but publish status is a 2 Jul snapshot.

## Testing (vitest, `tests/ghlClient.test.ts` pattern)

- `getConversationMessages` / `searchConversations` / `findContactOpportunity` / `getPipelines` — stubbed `fetchImpl`: URL/headers/pagination/parse.
- **Tag mapping**: the frozen map emits exactly the expected tag; `candonga`/`otro`/`urgencia:media` and all `sentiment/outcome/objeciones` values emit none; denylist refuses each active tag; normalization (case/whitespace) enforced.
- **Field**: enum coercion, invalid-dropdown skip, only-if-empty (no overwrite), budget-`null` skip.
- **Stage**: forward-only (never regress), evidence→stage map, settable-set assertion excludes 4 & 6, no-opportunity → skip.
- **Flags**: no `--apply` ⇒ zero write calls; no `--all-contacts` ⇒ writes only to the 3 test IDs.
- **Import-graph**: analysis module does not import writers.

## Open items / verify-live

- `tipo_interes` live enum `{topito, candonga, anillo, dije, gema_suelta, set, otro}` — confirm; docs' `gema`/missing-`candonga` is stale.
- `buscar-catalogo` (WF-04 live trigger) not in the canonical 48-tag list — confirm spelling/existence (denylist correctness).
- Opportunity **stage IDs** & the exact stage-name form the move API expects (bare vs prefixed/emoji) — fetch live via `getPipelines`; the settable-set assertion is the backstop.
- Confirm **no** "Opportunity Created / Stage Changed" workflow trigger before any stage run.
- `/conversations/search` date-filter semantics (last-message vs creation) — affects the 30-day window (same unverified assumption as `isContactInactive`).
- `canal_preferido` enum undocumented — leave unless confirmed; `queja`/`devolucion` live-trigger wiring unconfirmed — kept out of ALLOW.
- Customer PII → third-party LLM egress — confirm acceptable under the business's data posture (phone/email redacted; address best-effort).

## Rollout

1. `analyze:conversations:dry --limit 10` → eyeball extraction quality + report.
2. Full extract → human reviews `dataset.json`.
3. Verify no opportunity/stage triggers; `apply-backfill` (dry-run, default 3-test-contact scope) → then `--apply` on the 3 → verify in GHL.
4. `apply-backfill --all-contacts` (dry-run) → review planned-writes summary + count → typed confirm → `--apply`.
