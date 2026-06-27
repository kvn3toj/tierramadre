# Fotosynthia · AI model setup

After the 2026-06-27 fix, **both** Fotosynthia paths (advisory chat + guided
data entry) use the same provider chain, smallest/cheapest first:

| Order | Provider | Model | Env key |
|------:|----------|-------|---------|
| 1 | Vercel AI Gateway | `google/gemini-2.5-flash-lite` | `AI_GATEWAY_API_KEY` |
| 2 | Groq (fallback) | `llama-3.1-8b-instant` | `GROQ_API_KEY` |

A 429 / outage on provider 1 now falls through to provider 2 automatically
(previously the advisory chat was Groq-only with the heavy 70B model — that's
what triggered "El modelo está saturado").

## What to set in Vercel

Project → Settings → Environment Variables. **Either key alone works**; set both
for full resilience.

- `AI_GATEWAY_API_KEY` — recommended primary. Get it from the Vercel dashboard
  → AI Gateway → API Keys. Rides Google's free tier (Gemini Flash-Lite) at ~zero
  cost.
- `GROQ_API_KEY` — free tier, very high limits on the 8B model. Get it at
  console.groq.com.

If neither is set the endpoint returns a clear 503 telling you which var to add.

## Optional overrides (no redeploy of code needed, just env)

- `FOTOSINTESIS_AI_PROVIDER` = `auto` (default) | `gateway` | `groq`
- `FOTOSINTESIS_AI_MODEL` = explicit primary model id (e.g. `google/gemini-2.0-flash`)
- `GROQ_MODEL` = Groq fallback model (default `llama-3.1-8b-instant`)

## Token budget (kept small on purpose)

- advisory stream: `max_tokens` 512 (was 768)
- guided JSON: `max_tokens` 800 (was 1200)
- context slices trimmed (snapshot, candidate items, treasure catalog)

These keep latency and per-request cost low — the task only needs short replies
and compact JSON.
