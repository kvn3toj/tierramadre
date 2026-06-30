# Fotosynthia AI Copilot — Live E2E Audit

**Date:** 2026-06-30
**Surface:** `https://tierramadre.app/admin/fotosintesis` (prod), driven live via Chrome.
**Endpoint:** `POST /api/fotosintesis-ai` (Vercel serverless, streaming SSE).
**Verdict:** 🟢 **Working.** The copilot is live and answering with real catalog
data. One intermittent payload-size failure and a few quality/security gaps.

---

## Verdict

Fotosynthia is **operational in production**. The chat answers grounded
questions with authoritative inventory data, the guided data-entry flow conducts
multi-turn interviews, and the AI endpoint returns clean streamed responses. The
primary provider is configured and serving; the Groq fallback is wired but was
not exercised (gateway answered directly).

---

## Evidence (live probes, this session)

| Probe                                          | Result                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `GET /api/health`                              | **200** · `{success,status,version,timestamp,environment}`        |
| `POST /api/fotosintesis-ai` (valid advisory)   | **200** · `text/event-stream` · 4 SSE frames · `finishReason:stop`|
| Active provider / model                        | **Vercel AI Gateway → `google/gemini-2.5-flash-lite`**            |
| `GET /api/fotosintesis-ai`                     | **405** Method not allowed (correct)                              |
| `POST /api/fotosintesis-ai` with `{}`          | **400** `messages requerido` (correct validation)                 |
| In-app chat (UI), fresh question               | Streamed an answer, no error                                      |
| In-app chat (UI), prior turn in thread         | Catalog Q&A correct: "413 ítems", item names, Hércules price COP  |

**Reading:** primary key `AI_GATEWAY_API_KEY` is set in prod (the gateway path
answered). The endpoint has **no server-side auth** — an unauthenticated POST
from the page returned 200.

---

## Architecture (as built)

`POST /api/fotosintesis-ai` resolves providers in order and falls through on
429/5xx:

1. **Vercel AI Gateway** → `google/gemini-2.5-flash-lite` (`AI_GATEWAY_API_KEY`) ← **currently serving**
2. **Groq** → `llama-3.1-8b-instant` (`GROQ_API_KEY` / `VITE_GROQ_API_KEY`)

Two modes share the resolver:

- **Advisory** (default): streaming SSE Q&A. Persona "Fotosynthia", Colombian
  Spanish, grounded on a Sheets-sourced catalog context (5-min server cache) +
  on-demand "fichas" for any item the question names.
- **Guided** (`mode:"guided"`): one non-streaming JSON envelope per turn for
  data entry; the server whitelists keys, coerces vocab, recomputes
  `missing`/`ready`, and proposes navigation/actions the human approves. No
  mutation is ever called by the model.

Guardrails present: 30 req/min rate limit per IP+email, never-invent-price/estado
rules in the system prompt, role-scoped nav catalog, fire-and-forget summary
write to Convex (`recordSummary`).

---

## Findings

### 🔴 Intermittent — payload too large (413)

The live thread contains a real failure bubble:

> "El modelo respondió 413. Intentá de nuevo en un momento."

This is the AI Gateway returning **HTTP 413 (payload too large)** — exactly the
risk flagged in the endpoint's own comments: the catalog context + growing chat
history is re-sent on every turn, and long threads push the request over the
gateway's body limit. It **recovered on retry**, but it surfaces a raw status
code to the operator. Short requests (my fresh probes) returned 200 cleanly, so
the trigger is cumulative thread/payload size, not a hard outage.

**Mitigations:** trim history sent upstream (cap turns / summarize older turns);
shrink the inline catalog sample further; on 413 specifically, auto-retry with a
reduced payload instead of showing the code; map 413 to a friendly message.

### 🟠 Weak grounding on aggregate/operational questions

Asked "¿cuántas ventas hay y cuántos errores de sincronización?", the copilot
**deflected** ("necesitaría acceso a los registros… indicame dónde consultar")
instead of reading the snapshot values shown right above it
(`3 ventas · 8 errores de sync`). Per-item grounding is strong (prices, names,
estado); aggregate snapshot grounding is inconsistent and phrasing-sensitive
(the word "auditoría" likely pushed it to deflect). Candidate fix: surface
explicit aggregate fields (sales count, sync-error count/list) in the snapshot
JSON and instruct the model to read them.

### 🟠 No server-side auth on the AI endpoint

A POST with a throwaway `userEmail` and no session returned 200 and a full
answer. The role gate is client-side + route-guard only (consistent with the
2026-06-30 coherence audit's note on public Convex functions). For an internal
tool this is low-likelihood, but it exposes catalog data and burns provider
quota to anyone who can reach the URL.

### 🟡 Snapshot health: 8 sync errors

The copilot snapshot bar reads `⚠ 8 errores de sync`. The AI itself is fine, but
the data pipeline feeding it (Sheets ⇄ Convex) is carrying 8 errored rows —
worth clearing so item references stay authoritative.

### 🟡 Console noise (not AI-related)

The only console errors are `pdfanticopy.com/noprint.js → autoBlur is not
defined` (the screen-protection lib), repeated 3×. Cosmetic; unrelated to the
copilot.

---

## Recommended next steps

1. **Tame the 413:** cap upstream history + auto-retry on 413 with a reduced
   payload; never show a bare status code.
2. **Aggregate grounding:** add explicit counts (ventas, sync errors) to the
   snapshot JSON and prompt the model to use them.
3. **Auth:** add a lightweight server-side check (session/role) to the AI
   endpoint, or keep it behind the same gate as the admin shell.
4. **Clear the 8 sync errors** in the Fotosíntesis ⇄ Convex pipeline.
5. (Optional) Confirm `GROQ_API_KEY` is set so the 429 fallback is real, not just
   configured-on-paper — today the gateway answered every probe.

---

## Fixes implemented (2026-06-30, code-complete — pending operator deploy)

Three of the four findings are fixed in code. `tsc` passes for both `api/` and the
frontend; the pure helpers (résumé, turn-cap, origin/bearer parsing) are unit-checked.
Not deployed — push to `main` (Vercel auto-deploy) to ship.

**1. 413 payload-too-large (🔴) — `api/fotosintesis-ai.ts`.**
   Cap forwarded history to the last `MAX_UPSTREAM_TURNS` (12) turns; on a 413, retry
   the same provider once with a minimal payload (persona + tiny résumé + last turn
   only — no catalog/history), in BOTH the advisory stream and the guided path; and map
   413 to a friendly message instead of the bare "respondió 413".

**2. Aggregate grounding (🟠) — `api/fotosintesis-ai.ts`.**
   New `buildAtelierResumen(snapshot)` emits an explicit, labeled "Resumen del taller"
   line (lotes/ventas/embajadores/clientes/sync-errors, with per-state + per-table
   breakdowns) at the TOP of both the advisory and guided context, plus prompt rules
   telling the model to answer counts from it and never claim it lacks access. Derived
   from the existing Convex snapshot fields — no Convex change.

**3. Endpoint auth (🟠) — `api/fotosintesis-ai.ts` + `useFotosynthiaChat.ts`.**
   Replaced `Access-Control-Allow-Origin: *` with a same-origin lock (allowlist =
   `APP_URL` + `tierramadre.app` + `VERCEL_URL` + `FOTOSINTESIS_AI_ALLOWED_ORIGINS`;
   missing-Origin server-to-server still allowed). Added best-effort Google ID-token
   verification (client now sends the stored token as a Bearer; server trusts the
   verified email over the body one). Hard enforcement is gated behind
   `FOTOSINTESIS_AI_REQUIRE_AUTH` (default **off**) because the SPA's stored token
   expires ~1h and isn't refreshed — enforcing unconditionally would lock out real
   admins. The origin lock is the always-on control; flip the flag on only after token
   refresh is added.

**Still open:** finding #4 (8 Sheets⇄Convex sync errors) — data/ops cleanup, no code fix.

### Operator deploy / enable
1. Push to `main` → Vercel auto-deploy (frontend + API).
2. (Optional) add hosts to `FOTOSINTESIS_AI_ALLOWED_ORIGINS` if the app is served from a
   domain other than `tierramadre.app`.
3. Leave `FOTOSINTESIS_AI_REQUIRE_AUTH` unset for now; turn it on only once the client
   refreshes the Google ID token (otherwise long sessions 401).
