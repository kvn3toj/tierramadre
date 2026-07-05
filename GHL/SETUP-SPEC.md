# Tierra Madre — Setup Spec

> **Status**: Phase 1 complete (GHL base via API). Phases 2–8 pending.
> **Strategy**: Greenfield. Two new repos (`tierramadre-web`, `tierramadre-workers`). Existing `/TierraMadre/` Studio repo (Google Sheets / MUI) is **not touched** by this plan.
> **Timeline**: 10–12 weeks to soft launch.
> **Source docs**: [`00-INDICE-Y-MAPA.md`](./00-INDICE-Y-MAPA.md) · [`01-GHL.md`](./01-GHL.md) · [`02-SUPABASE.md`](./02-SUPABASE.md) · [`03-WEB-MADRE.md`](./03-WEB-MADRE.md) · [`04-INTEGRACIONES.md`](./04-INTEGRACIONES.md) · [`05-META-WHATSAPP.md`](./05-META-WHATSAPP.md) · [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md) · [`plan-ejecucion-tierra-madre.html`](./plan-ejecucion-tierra-madre.html) · [`area-5-diseno-ux.html`](./area-5-diseno-ux.html) · [`area-6-contenido-catalogo.html`](./area-6-contenido-catalogo.html)

---

## Table of Contents

0. [Executive Summary](#0-executive-summary)
1. [Pre-flight Checklist](#1-pre-flight-checklist)
2. [Open Decisions Register](#2-open-decisions-register)
3. [Phase 2 — Supabase (Backend SoT)](#3-phase-2--supabase-backend-sot)
4. [Phase 3 — Web Madre (Storefront + Admin + Embajador)](#4-phase-3--web-madre-storefront--admin--embajador)
5. [Phase 4 — Cloudflare Workers (Webhooks + Schedulers)](#5-phase-4--cloudflare-workers-webhooks--schedulers)
6. [Phase 5 — Meta Channels + WhatsApp Templates](#6-phase-5--meta-channels--whatsapp-templates)
7. [Phase 6 — Bot María (GHL Agent Studio)](#7-phase-6--bot-mara-ghl-agent-studio)
8. [Phase 7 — GHL Workflows (WF-01..WF-10)](#8-phase-7--ghl-workflows-wf-01wf-10)
9. [Phase 8 — QA + Soft Launch](#9-phase-8--qa--soft-launch)
10. [Source-of-Truth Contract Table](#10-source-of-truth-contract-table)
11. [Golden Rules](#11-golden-rules)
12. [Risk + Rollback Notes](#12-risk--rollback-notes)

---

# 0. Executive Summary

## 0.1 What we're building

A four-layer, multi-channel commerce system for Tierra Madre (Colombian emeralds). Customers arrive on WhatsApp, Instagram, TikTok or the web, a bot qualifies them inside GoHighLevel (GHL), the bot links them to a Vite + Supabase storefront, they pay through Mercado Pago, and the system fans out post-sale automation (commissions, follow-up, ambassador notifications).

```
   ┌───────────────────────────────────────────────────────┐
   │ Layer 1 · Channels                                    │
   │   WhatsApp · Instagram · TikTok · Web Chat · Forms    │
   └─────────────────────┬─────────────────────────────────┘
                         │
                         ▼
   ┌───────────────────────────────────────────────────────┐
   │ Layer 2 · Brain (GoHighLevel)                         │
   │   Unified inbox · Bot María (Agent Studio)            │
   │   CRM · Lead scoring · Workflows WF-01..WF-10         │
   │   Agent pools + round-robin · 14 custom fields        │
   │   Pipeline "Ventas Tierra Madre" (7 stages)           │
   └────────┬───────────────────────────────┬──────────────┘
            │ Bearer INTERNAL_API_SECRET    │ Human handoff
            ▼                               ▼
   ┌─────────────────────────┐    ┌──────────────────────┐
   │ Layer 3 · Commerce      │    │ Layer 4 · Team       │
   │   Supabase (DB + Edge)  │    │   Sales agents       │
   │   Web Madre (Vite)      │    │   Ambassadors        │
   │   Mercado Pago checkout │    │   Pools: premium /   │
   │   Cloudflare Workers    │    │   inversión / senior │
   │   (mp-webhook, cron)    │    │   / regular          │
   └─────────────────────────┘    └──────────────────────┘
```

## 0.2 Success criteria

The system is live when **the golden path** runs end-to-end without human intervention:

1. Customer DMs the WhatsApp number with a buy intent.
2. GHL inbox receives the message, `WF-01` fires, contact is created in "1. Nuevo Lead", tag `lead-nuevo` is applied.
3. Bot María (Agent Studio) qualifies the contact, calls Supabase Edge Function `search-products` with `{intent, presupuesto, ocasion, ciudad}`.
4. Bot returns 3 products with photos and a deep-link to `https://tierramadre.co/producto/{slug}`.
5. Customer clicks, adds to cart, completes checkout.
6. `create-order` Edge Function validates stock + price + `≤2M COP` gate, creates the order, returns a Mercado Pago `preference` URL.
7. Customer pays in Mercado Pago.
8. Mercado Pago calls the Cloudflare `mp-webhook`. HMAC validates. Worker queries MP API for the real payment, idempotently sets `orders.status='paid'`.
9. Supabase trigger `T3` fires: `contacts.total_comprado_cop` increments; row is inserted in `commissions` (UNIQUE on `order_id`).
10. Worker calls GHL: tags `cliente-pago-confirmado`, triggers post-sale workflow.

**Exit signals for soft launch:**

- ≥ 30 products loaded with photos + copy + keywords (Area 6).
- 7 priority WhatsApp templates approved by Meta.
- ≥ 1 real commission generated end-to-end and visible in `/admin/comisiones`.
- Idempotence test: replay the same `mp-webhook` payload → no double commission.
- Rate-limit drill: bulk-send 200 promo messages without tripping GHL's 100 req/10 s ceiling.

## 0.3 Glossary

| Term                       | Meaning                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **GHL**                    | GoHighLevel — the white-label CRM. Location ID `t3tOZBrR05jUoLqnDn4I`.                                                    |
| **Pipeline**               | GHL deal pipeline. We have one: "Ventas Tierra Madre" (`u4MPXH2HdEFmU3vVqNdd`), 7 stages.                                 |
| **Custom field**           | A typed attribute on a GHL contact. 14 already exist (keys like `contact.presupuesto_declarado`).                         |
| **Tag**                    | A label on a GHL contact. 48 already exist.                                                                               |
| **Agent Studio**           | GHL's bot builder (needs AI Employee Plus plan). Hosts Bot María.                                                         |
| **KB**                     | Knowledge Base. We have "Tierra Madre KB" (`OHDQ6vwrSUBsPD5rwHlK`) with 6 PDFs.                                           |
| **Workflow (WF)**          | GHL automation. We're building 10: `WF-01`..`WF-10`.                                                                      |
| **Edge Function**          | Supabase Deno-based serverless function. Two MVP: `search-products`, `create-order`.                                      |
| **RLS**                    | Row-Level Security in Supabase. All public-read queries use the `anon` key.                                               |
| **Worker**                 | Cloudflare Worker. Three of them: `mp-webhook`, `scheduler`, `ghl-bridge`.                                                |
| **MP**                     | Mercado Pago. Payment gateway for Colombia (PSE, Nequi, Daviplata, card).                                                 |
| **HMAC**                   | The hash-based signature MP sends as `x-signature` header — we validate to refuse forged webhooks.                        |
| **Embajador (Ambassador)** | A referrer who earns commission. Tiers: `bronce`, `plata`, `oro`, `diamante`.                                             |
| **`≤2M COP` gate**         | Server-side rule: orders > 2,000,000 COP route to a human, not to checkout.                                               |
| **`INTERNAL_API_SECRET`**  | A single shared secret. GHL Custom Value → Worker secret → Supabase Edge Function header. Any caller without it gets 401. |

## 0.4 Cross-reference index

Every section below ends with `↪ Source` links pointing back to the file(s) in `GHL/` that authored the requirement. If a section conflicts with a source doc, the source doc wins and this spec is updated.

---

# 1. Pre-flight Checklist

Do **everything** in this section before starting Phase 2. None of it is automatable — these are accounts, payments, and credentials that need a human at a browser.

## 1.1 Accounts to create

| #   | Account                                          | Used by            | Notes                                                                                        | Status |
| --- | ------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------- | ------ |
| 1   | **Supabase** (`supabase.com`)                    | Phase 2 onward     | New project named `tierramadre`, region East US (best CO latency without paying for closer). | ⬜     |
| 2   | **Mercado Pago Colombia** (`mercadopago.com.co`) | Phase 3, 4         | Business mode. Need verified business identity to receive payouts.                           | ⬜     |
| 3   | **Cloudflare**                                   | Phase 4            | Workers free tier OK to start. Reserve subdomain `wh.tierramadre.workers.dev` or custom.     | ⬜     |
| 4   | **Meta Business Manager**                        | Phase 5            | Used to verify business identity for the WhatsApp Business API number.                       | ⬜     |
| 5   | **WhatsApp Business number**                     | Phase 5            | Must be NEW or non-personal. Once attached to Meta API, you cannot use WA app on it.         | ⬜     |
| 6   | **Instagram Business + Facebook Page**           | Phase 5            | Required for DM routing into GHL.                                                            | ⬜     |
| 7   | **TikTok Business**                              | Phase 5 (optional) | Only if GHL plan supports TikTok integration.                                                | ⬜     |
| 8   | **Vercel**                                       | Phase 3            | Free tier OK. Project name `tierramadre-web`.                                                | ⬜     |
| 9   | **Domain registrar** for `tierramadre.co`        | Phase 3            | Required for SSL + customer trust + Open Graph.                                              | ⬜     |
| 10  | **GHL AI Employee Plus** upgrade                 | Phase 6            | Without this, Agent Studio is locked.                                                        | ⬜     |
| 11  | **Resend** (or equivalent SMTP)                  | Phase 4, 8         | For server alerts + transactional email.                                                     | ⬜     |
| 12  | **Slack workspace** (optional)                   | Phase 8            | For ops alerts from Workers.                                                                 | ⬜     |

## 1.2 Master env-var table

Every credential the system needs, grouped by where it lives. **Never commit these to git.** Store production values in the appropriate dashboard secret manager; mirror dev values to local `.env` files (gitignored).

### 1.2.1 Frontend (`tierramadre-web`, Vercel)

Public — these ship to the browser. The `VITE_` prefix is mandatory for Vite to expose them client-side.

| Key                                | Source                          | Notes                                         |
| ---------------------------------- | ------------------------------- | --------------------------------------------- |
| `VITE_SUPABASE_URL`                | Supabase project settings → API | Public OK.                                    |
| `VITE_SUPABASE_ANON_KEY`           | Supabase project settings → API | Public OK (RLS protects data).                |
| `VITE_MP_PUBLIC_KEY`               | Mercado Pago dashboard          | Public key (not the access token).            |
| `VITE_GHL_CHAT_WIDGET_SNIPPET_URL` | GHL → Settings → Web Chat       | The script src — gated to public routes only. |

### 1.2.2 Supabase Edge Functions

Server-side — set via `supabase secrets set`.

| Key                   | Source                                            | Notes                                                              |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| `INTERNAL_API_SECRET` | Generated once (see 1.3)                          | Validates every GHL → Edge Function call.                          |
| `MP_ACCESS_TOKEN`     | Mercado Pago dashboard                            | Server-only. `create-order` uses this to make payment preferences. |
| `GHL_TOKEN`           | GHL → Settings → Private Integrations (PIT token) | Used by Edge Functions that write back to GHL.                     |
| `GHL_LOCATION_ID`     | `t3tOZBrR05jUoLqnDn4I` (already known)            | Hard-coded but kept as env var for portability.                    |

### 1.2.3 Cloudflare Workers

Server-side — set via `wrangler secret put`.

| Key                    | Source                                             | Notes                                                   |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| `MP_TOKEN`             | Mercado Pago dashboard                             | Same as `MP_ACCESS_TOKEN` above.                        |
| `MP_SECRET`            | Mercado Pago → Webhooks → Sign manifest            | HMAC validation.                                        |
| `SUPABASE_URL`         | Supabase project settings → API                    | Same value as `VITE_SUPABASE_URL`.                      |
| `SUPABASE_SERVICE_KEY` | Supabase project settings → API                    | **Service role.** Never expose to client.               |
| `GHL_TOKEN`            | GHL Private Integrations                           | Same token as Supabase.                                 |
| `GHL_LOCATION_ID`      | `t3tOZBrR05jUoLqnDn4I`                             | —                                                       |
| `INTERNAL_API_SECRET`  | Same value as everywhere else                      | Used when Worker calls back to Supabase Edge Functions. |
| `WF_POSTVENTA_ID`      | GHL → Workflows → Post-venta → Inbound Webhook URL | Trigger to fire after MP confirms payment.              |
| `RESEND_API_KEY`       | Resend dashboard                                   | For alert emails on Worker failures.                    |
| `SLACK_WEBHOOK_URL`    | Slack incoming webhook                             | Optional ops channel.                                   |

### 1.2.4 GHL Custom Values

Stored at Settings → Custom Values inside GHL so that API tools and workflows can reference them as `{{custom_values.<key>}}`.

| Key                   | Value                         | Used in                                                                             |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `supabase_url`        | Mirrors `VITE_SUPABASE_URL`   | Bot María API tools (`{{custom_values.supabase_url}}/functions/v1/search-products`) |
| `internal_api_secret` | Mirrors `INTERNAL_API_SECRET` | Authorization header on every API tool call.                                        |
| `app_url`             | `https://tierramadre.co`      | Used in WhatsApp templates and bot links.                                           |

## 1.3 INTERNAL_API_SECRET generation rule

A **single** shared secret guards every GHL → Supabase Edge Function call. Generate once, propagate everywhere.

```bash
# Generate a 256-bit URL-safe secret (run locally, never commit output)
openssl rand -base64 32
```

Then set the same string in **all four** locations:

1. `supabase secrets set INTERNAL_API_SECRET=<value>` (Edge Functions read it).
2. `wrangler secret put INTERNAL_API_SECRET` in each Worker (Workers send it to Supabase).
3. GHL → Settings → Custom Values → `internal_api_secret` (API tools send it).
4. Local `.env` files (gitignored) for development.

Rotation rule: rotate once at launch; rotate again if any of the four endpoints leak. Update all four at once — there is no "partial rotation" because every Edge Function checks the header against the env var.

## 1.4 Repo bootstrap commands

```bash
# Parent folder for both new repos
mkdir -p ~/Movies/coomunity-universe/tierramadre-system
cd ~/Movies/coomunity-universe/tierramadre-system

# Repo 1: Web (Vite + React 19 + Supabase)
npm create vite@latest tierramadre-web -- --template react-ts
cd tierramadre-web
npm install @supabase/supabase-js @tanstack/react-query zustand react-router-dom \
            framer-motion mercadopago tailwindcss@next @tailwindcss/vite \
            class-variance-authority clsx tailwind-merge lucide-react
git init && git add -A && git commit -m "chore: scaffold tierramadre-web (Vite + React 19)"
cd ..

# Repo 2: Workers (Cloudflare)
npm create cloudflare@latest tierramadre-workers -- --type=hello-world --ts --no-deploy
cd tierramadre-workers
git init && git add -A && git commit -m "chore: scaffold tierramadre-workers"
cd ..

# (Optional) Supabase project workspace
mkdir tierramadre-supabase && cd tierramadre-supabase
npx supabase init
git init && git add -A && git commit -m "chore: init supabase workspace"
```

This gives three sibling folders. They can also live in a monorepo (`pnpm` workspaces) — that decision belongs to Phase 3 prep, not pre-flight.

↪ Source: [`00-INDICE-Y-MAPA.md`](./00-INDICE-Y-MAPA.md), [`03-WEB-MADRE.md`](./03-WEB-MADRE.md), [`04-INTEGRACIONES.md`](./04-INTEGRACIONES.md)

---

# 2. Open Decisions Register

Six product decisions are required before later phases can complete. None block Phase 2 (Supabase). All must be resolved before soft launch.

| #      | Decision                                                                                                          | Blocks                                                                      | Owner             | Suggested default if no answer by phase start                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Q1** | Catalog launch list — which 30–50 SKUs ship on day 1? Which 6–9 are "destacados" on the home?                     | Phase 3 (home + catalog), Phase 8 (soft launch)                             | Marketing/Product | Top 30 by current quotation volume; top 9 destacados by margin × visual appeal.                                    |
| **Q2** | Commission % per ambassador tier (Bronce / Plata / Oro / Diamante)                                                | Phase 2 (`ambassadors.comision_percent` seed), Phase 4 (T3 trigger uses it) | Founder + Finance | Bronce 5% / Plata 8% / Oro 12% / Diamante 15%, until counter-proposed.                                             |
| **Q3** | Lead-scoring formula — exact point values for each signal (declared budget, event attended, message volume, etc.) | Phase 6 (bot scoring), Phase 7 (`WF-09` re-engagement triggers)             | Founder + Sales   | Stub with +10 budget declared, +5 event RSVP, +20 event attended, −10 cold ≥7 d; refine after first month of data. |
| **Q4** | Agent pool names + SLA per pool (the doc lists 2–15 min range only)                                               | Phase 7 (`WF-06` escalation routing, agent auto-assignment)                 | Sales lead        | Premium 10 m · Inversión 5 m · Senior 2 m · Regular 15 m (matches the doc range).                                  |
| **Q5** | The 6 landing-page topics (`/topitos`, `/anillos-compromiso` are examples)                                        | Phase 3 (landing routes), Phase 5 (ad creative for templates)               | Marketing         | `/topitos`, `/anillos-compromiso`, `/dijes`, `/inversion-esmeraldas`, `/regalo-aniversario`, `/eventos-privados`.  |
| **Q6** | Promo rules — when does `send-promo` fire automatically vs. require admin push?                                   | Phase 4 (scheduler logic), Phase 7 (`WF-09` could promote)                  | Founder           | All promo sends are admin-initiated through `/admin/promociones` until volume justifies automation.                |

**How this register is used:**

- Each phase section explicitly cites which Q's it consumes.
- "Suggested defaults" let development unblock; the spec marks any code path that depends on a default with `// TODO Q<n>` so it's grep-able.
- The first commit of every phase includes a "Decisions consumed: Q1, Q4" footer in the PR description.

↪ Source: [`00-INDICE-Y-MAPA.md`](./00-INDICE-Y-MAPA.md) + my read of [`area-6-contenido-catalogo.html`](./area-6-contenido-catalogo.html) and [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md)

---

# 3. Phase 2 — Supabase (Backend SoT)

> **This is the next phase.** Phase 1 (GHL API base) is already complete.

## 3.1 Inputs

- ⬜ Decisions consumed: none (Q2 affects seed values for `ambassadors.comision_percent`, but seeds can use the suggested default).
- ⬜ Credentials needed (from §1.2): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, service-role key, `INTERNAL_API_SECRET`.
- ⬜ Manual prereq: Supabase project created (see §3.2).

## 3.2 Manual user tasks ✋

```
1. Go to https://supabase.com → New Project
   Name:    tierramadre
   Region:  East US (Ohio)  ← best CO latency without paying for closer regions
   Password: <save somewhere — only shown once>

2. Wait ~2 min for provisioning.

3. Settings → API → copy:
   - Project URL                    → VITE_SUPABASE_URL
   - anon public key                → VITE_SUPABASE_ANON_KEY
   - service_role secret key        → SUPABASE_SERVICE_KEY (server-only!)

4. Settings → API → JWT Settings → leave defaults.

5. Settings → Database → Connection string → copy if needed for direct psql access.

6. Paste credentials into the master env-var locations from §1.2.
```

## 3.3 AI tasks 🤖

Everything below is executed by code. The user does not click anything in this section.

### 3.3.1 Migrations — 17 tables

Create one migration file per logical group so rollback is granular.

```
supabase/migrations/
  001_contacts.sql
  002_products.sql           ← products + product_images
  003_orders.sql             ← orders + order_items
  004_ambassadors.sql        ← ambassadors + ambassador_leads
  005_agents.sql
  006_events.sql             ← events + event_attendees
  007_promotions.sql         ← promotions + promotion_products + promotion_codes
  008_commissions.sql
  009_testimonials.sql
  010_message_templates.sql
  011_hot_leads.sql
  012_triggers.sql           ← T1..T6 from doc 02
  013_rls.sql                ← row-level security policies
  014_search_vector.sql      ← FTS columns + GIN indexes
```

#### Tables and key columns

| Table                  | Notable columns / constraints                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **contacts**           | `celular UNIQUE`, `instagram_handle`, `email`, `full_name`, `ciudad`, `presupuesto_declarado_cop bigint`, `tipo_interes`, `conocimiento_esmeraldas`, `canal_origen`, `ambassador_id FK`, `agent_assigned`, `lead_score int default 0`, `total_comprado_cop bigint default 0`, `ultima_compra_fecha timestamptz`, `eventos_*` counters, `ghl_contact_id text UNIQUE`, `tags text[]`, `custom_fields jsonb` |
| **products**           | `sku text UNIQUE`, `nombre`, `slug text UNIQUE`, `descripcion`, `descripcion_corta varchar(160)`, `precio_cop bigint NOT NULL`, `categoria`, `tipo_gema`, `ocasion text[]`, `keywords text[]`, `rango_precio`, `certificado_url text`, `video_url text`, `stock int default 0`, `es_pieza_unica bool`, `destacado bool`, `activo bool default false`, `search_vector tsvector`, `link text generated`     |
| **product_images**     | `product_id FK`, `url`, `alt`, `is_primary bool`, `is_360 bool`, `position int`                                                                                                                                                                                                                                                                                                                           |
| **orders**             | `contact_id FK`, `ambassador_id FK`, `agent_id FK`, `status enum`(`pending`,`paid`,`shipped`,`delivered`,`cancelled`,`refunded`), `total_cop bigint NOT NULL`, `discount_cop bigint default 0`, `promotion_code text`, `shipping_cop bigint default 0`, `mp_preference_id text`, `mp_payment_id text`, `mp_status text`, `paid_at timestamptz`, `shipping_address jsonb`                                  |
| **order_items**        | `order_id FK`, `product_id FK`, `qty int`, `unit_price_cop bigint`, `snapshot jsonb` (name/sku/photo at sale time)                                                                                                                                                                                                                                                                                        |
| **ambassadors**        | `slug text UNIQUE`, `nivel enum`(`bronce`,`plata`,`oro`,`diamante`), `score int`, `comision_percent numeric`, `status text`, `referido_por uuid REFERENCES ambassadors(id)` (self-FK)                                                                                                                                                                                                                     |
| **ambassador_leads**   | `ambassador_id FK`, `phone text`, `instagram text`, `email text`, `created_at`                                                                                                                                                                                                                                                                                                                            |
| **agents**             | `pool enum`(`premium`,`inversion`,`senior`,`regular`), `ghl_user_id`, `active bool`                                                                                                                                                                                                                                                                                                                       |
| **events**             | `slug`, `nombre`, `fecha`, `tipo enum`(`presencial`,`virtual`,`hibrido`), `ciudad`, `capacidad`, `descripcion`                                                                                                                                                                                                                                                                                            |
| **event_attendees**    | `event_id FK`, `contact_id FK`, `qr_code text UNIQUE`, `attended bool default false`, `checked_in_at`                                                                                                                                                                                                                                                                                                     |
| **promotions**         | `nombre`, `tipo`, `value_pct numeric`, `value_cop bigint`, `audience jsonb`, `start_at`, `end_at`, `active bool`                                                                                                                                                                                                                                                                                          |
| **promotion_products** | `promotion_id FK`, `product_id FK`                                                                                                                                                                                                                                                                                                                                                                        |
| **promotion_codes**    | `promotion_id FK`, `contact_id FK`, `code text UNIQUE`, `used bool`, `used_at`                                                                                                                                                                                                                                                                                                                            |
| **commissions**        | `order_id FK UNIQUE`, `ambassador_id FK`, `monto_cop bigint`, `status enum`(`pending`,`approved`,`paid`,`void`), `approved_by`, `paid_at`                                                                                                                                                                                                                                                                 |
| **testimonials**       | `contact_id FK`, `product_id FK`, `rating int CHECK 1..5`, `comment`, `approved bool`                                                                                                                                                                                                                                                                                                                     |
| **message_templates**  | `code text UNIQUE` (e.g. `WA-01`), `channel`, `category`, `priority int`, `body text`, `meta_status enum`(`draft`,`pending`,`approved`,`rejected`)                                                                                                                                                                                                                                                        |
| **hot_leads**          | `contact_id FK UNIQUE`, `score int`, `last_signal_at`, `assigned_agent_id FK`                                                                                                                                                                                                                                                                                                                             |

#### Triggers (012_triggers.sql)

| Code   | Trigger                                                            | Purpose                                                                                                                                                             |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T1** | `BEFORE UPDATE` on every table with `updated_at`                   | Sets `updated_at = now()`.                                                                                                                                          |
| **T2** | `BEFORE INSERT OR UPDATE` on `products`                            | Rebuilds `search_vector` from `nombre`, `descripcion`, `keywords`, `categoria`, `tipo_gema`.                                                                        |
| **T3** | `AFTER UPDATE` on `orders` when `status` transitions to `paid`     | Sums `total_cop` into `contacts.total_comprado_cop`. If `ambassador_id IS NOT NULL`, inserts a row in `commissions` (relying on `UNIQUE order_id` for idempotence). |
| **T4** | `AFTER INSERT` on `ambassador_leads`                               | Looks up the contact by phone/IG/email. If found and `contact.ambassador_id IS NULL`, assigns it (first-touch rule).                                                |
| **T5** | `AFTER UPDATE` on `event_attendees` when `attended` becomes `true` | Bumps the contact's `eventos_asistidos` counter.                                                                                                                    |
| **T6** | `AFTER INSERT` on `testimonials` when `rating >= 4.5`              | Auto-flags `approved = true`.                                                                                                                                       |

#### RLS (013_rls.sql)

```sql
-- Public-read catalog
alter table products enable row level security;
create policy "products are publicly readable when active"
  on products for select using (activo = true);

alter table product_images enable row level security;
create policy "product_images follow product visibility"
  on product_images for select using (
    exists (select 1 from products p where p.id = product_id and p.activo = true)
  );

-- Ambassadors see only their own lines
alter table orders enable row level security;
create policy "ambassador sees own orders"
  on orders for select using (ambassador_id = auth.uid());

alter table commissions enable row level security;
create policy "ambassador sees own commissions"
  on commissions for select using (
    exists (select 1 from ambassadors a where a.id = ambassador_id and a.user_id = auth.uid())
  );

alter table ambassador_leads enable row level security;
create policy "ambassador sees own leads"
  on ambassador_leads for select using (
    exists (select 1 from ambassadors a where a.id = ambassador_id and a.user_id = auth.uid())
  );

-- Everything else: deny by default; the service_role bypasses RLS for server-side ops.
```

Rule: the embajador panel and the public site use only the `anon` key. The `service_role` key never reaches a browser.

#### Search index (014_search_vector.sql)

```sql
create index if not exists idx_products_search on products using gin (search_vector);
create index if not exists idx_contacts_celular on contacts (celular);
create index if not exists idx_contacts_ghl_contact_id on contacts (ghl_contact_id);
create index if not exists idx_orders_status on orders (status) where status in ('pending','paid');
```

### 3.3.2 Edge Functions

```
supabase/functions/
  search-products/        # called by Bot María
  create-order/           # called by web checkout
  _shared/
    auth.ts               # validates Authorization: Bearer INTERNAL_API_SECRET
    supabase-admin.ts     # service-role client
    mercado-pago.ts       # MP REST wrapper
```

#### `search-products` contract

```http
POST {{SUPABASE_URL}}/functions/v1/search-products
Authorization: Bearer {{INTERNAL_API_SECRET}}
Content-Type: application/json

{
  "intent": { "categoria": "anillo" },
  "presupuesto": 1500000,
  "ocasion": "compromiso",
  "ciudad": "Bogotá"
}
```

Response:

```json
{
  "products": [
    {
      "sku": "ANL-007",
      "nombre": "Anillo Aurora",
      "descripcion_corta": "...",
      "precio_cop": 1450000,
      "foto_url": "https://.../primary.jpg",
      "web_link": "https://tierramadre.app/v/7"
    },
    { "...": "..." },
    { "...": "..." }
  ]
}
```

Implementation rules:

- Returns **exactly 3** products. Use FTS on `search_vector` ranked by `ts_rank`, secondary sort by closeness to `presupuesto`.
- Hard filter `activo = true AND stock > 0` (or `es_pieza_unica = true AND stock = 1`).
- Auth missing or wrong → `401`. Body malformed → `400`. No results → `200` with empty `products` array (let the bot offer alternatives).

#### `create-order` contract

```http
POST {{SUPABASE_URL}}/functions/v1/create-order
Authorization: Bearer {{INTERNAL_API_SECRET}}    ← when called by Worker; web uses anon JWT
Content-Type: application/json

{
  "contact": { "celular": "+57...", "full_name": "...", "email": "..." },
  "items":   [ { "sku": "ANL-007", "qty": 1 } ],
  "promotion_code": null,
  "shipping_address": { "ciudad": "Bogotá", "direccion": "...", "codigo_postal": "..." },
  "ambassador_slug": "andrea"
}
```

Server-side validation pipeline:

1. **Reload prices and stock** from `products` — never trust client-supplied amounts.
2. **Apply promotion** if `promotion_code` matches an active row in `promotion_codes` AND it's not used.
3. **`≤2M COP` gate**: if `total_cop > 2_000_000`, respond `409` with `{ "reason": "OVER_LIMIT_2M", "redirect_to_human": true }`. The web shows "We'll connect you with an advisor" instead of payment. The bot already has the same rule; this is the server backstop.
4. **Create order row** in `pending` status. Snapshot product names/photos into `order_items.snapshot` so post-sale receipts survive catalog edits.
5. **Create Mercado Pago preference** via REST. Pass `notification_url = https://wh.tierramadre.workers.dev/mp` and `external_reference = orders.id`.
6. **Persist** `orders.mp_preference_id` and return `{ "order_id": "...", "mp_url": "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=..." }`.

### 3.3.3 Storage buckets

```
products       (public)
  └── {sku}/primary.jpg
  └── {sku}/gallery-01.jpg ... gallery-NN.jpg
  └── {sku}/360/01.jpg ... 24.jpg   ← for destacados only

certificates   (private)
  └── {sku}/cert.pdf
```

Public bucket served via CDN URL. Private bucket reads only through **signed URLs** generated server-side after a confirmed sale (`status = paid`).

### 3.3.4 Seed data

`supabase/seed.sql` loads 5–10 placeholder products so the bot has something to return during dev. Fields populated: `sku`, `nombre`, `slug`, `descripcion_corta`, `descripcion`, `precio_cop`, `categoria`, `tipo_gema`, `ocasion`, `keywords`, `rango_precio`, `stock = 1`, `activo = true`, plus 1 row in `product_images` per SKU pointing at a placeholder image.

## 3.4 CLI commands

```bash
# inside tierramadre-supabase/
npx supabase login
npx supabase link --project-ref <ref-from-dashboard>

# Apply schema + seed
npx supabase db push
npx supabase db reset --linked   # for dev resets

# Deploy edge functions
npx supabase functions deploy search-products
npx supabase functions deploy create-order

# Set secrets
npx supabase secrets set \
  INTERNAL_API_SECRET=<from §1.3> \
  MP_ACCESS_TOKEN=<from MP dashboard> \
  GHL_TOKEN=<PIT token> \
  GHL_LOCATION_ID=t3tOZBrR05jUoLqnDn4I
```

## 3.5 Verification

```bash
# 1. Schema integrity — every table present
psql "$SUPABASE_DB_URL" -c "\dt public.*" | wc -l   # ≥ 17

# 2. RLS smoke test — anon cannot read inactive products
curl "$VITE_SUPABASE_URL/rest/v1/products?activo=eq.false" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY"               # → []

# 3. search-products auth — missing secret returns 401
curl -X POST "$VITE_SUPABASE_URL/functions/v1/search-products" \
  -H "Content-Type: application/json" \
  -d '{"intent":{"categoria":"anillo"},"presupuesto":1500000}'
# → 401

# 4. search-products happy path
curl -X POST "$VITE_SUPABASE_URL/functions/v1/search-products" \
  -H "Authorization: Bearer $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"intent":{"categoria":"anillo"},"presupuesto":1500000,"ocasion":"compromiso"}'
# → {"products":[{...},{...},{...}]}

# 5. create-order gate test — > 2M
curl -X POST "$VITE_SUPABASE_URL/functions/v1/create-order" \
  -H "Authorization: Bearer $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"INV-001","qty":1}],"contact":{"celular":"+57000"}}'
# → 409 with {"reason":"OVER_LIMIT_2M",...}

# 6. FTS sanity
psql "$SUPABASE_DB_URL" -c "select sku, ts_rank(search_vector, plainto_tsquery('esmeralda muzo')) r
                            from products where search_vector @@ plainto_tsquery('esmeralda muzo')
                            order by r desc limit 5;"
```

## 3.6 Exit criteria

- ✅ All 17 tables exist with RLS enabled and policies attached.
- ✅ Triggers T1–T6 fire correctly (verified with insert/update fixtures).
- ✅ `search-products` and `create-order` are deployed and return correct status codes for the curl checks above.
- ✅ Storage buckets `products` (public) and `certificates` (private) created.
- ✅ 5–10 seed products visible via the anon REST endpoint.
- ✅ All Supabase secrets set; `INTERNAL_API_SECRET` matches the value mirrored in GHL Custom Values.

↪ Source: [`02-SUPABASE.md`](./02-SUPABASE.md), [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md)

---

# 4. Phase 3 — Web Madre (Storefront + Admin + Embajador)

## 4.1 Inputs

- ⬜ Phase 2 complete (`VITE_SUPABASE_URL`, anon key working).
- ⬜ Decisions consumed: **Q1** (catalog launch list), **Q5** (6 landing topics).
- ⬜ Credentials: `VITE_MP_PUBLIC_KEY` from §1.2.1, Vercel project, domain `tierramadre.co`.

## 4.2 Manual user tasks ✋

1. **Mercado Pago** — Business mode in Colombia; verify identity. Copy `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` from dashboard.
2. **Vercel** — create project `tierramadre-web`, link to the new repo, set env vars from §1.2.1 in the dashboard.
3. **Domain** — point `tierramadre.co` apex + `www` at Vercel, accept the generated SSL.
4. **Real catalog upload** — through `/admin/productos` once the admin panel is live, replace the seed products with the 30–50 from Q1.

## 4.3 AI tasks 🤖

### 4.3.1 Route map

| Route                                                                                                            | Purpose                                            | Notes                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                                              | Home                                               | Hero + 6–9 destacados + featured testimonial.                                                                                                             |
| `/catalogo`                                                                                                      | Catalog grid                                       | Filters by `categoria`, `tipo_gema`, `ocasion`, `rango_precio`. URL-synced.                                                                               |
| `/producto/:slug`                                                                                                | Product detail                                     | Gallery (360° if available), descriptions, **certificate signed URL after purchase**, trust block ("Colombian sourced", "secure payment"), "Add to cart". |
| `/carrito`                                                                                                       | Cart                                               | Zustand store, persisted to `localStorage`.                                                                                                               |
| `/checkout`                                                                                                      | 3-step flow: customer data → summary → payment     | Calls `create-order` Edge Function. Redirects to MP.                                                                                                      |
| `/pedido-confirmado/:order_id`                                                                                   | Post-redirect from MP                              | Polls MP status via Supabase view for 30 s; shows pending or success state.                                                                               |
| `/topitos`, `/anillos-compromiso`, `/dijes`, `/inversion-esmeraldas`, `/regalo-aniversario`, `/eventos-privados` | 6 landings                                         | Each has a pre-qualification form → POST → `contacts` + GHL via Worker bridge.                                                                            |
| `/admin`                                                                                                         | Admin dashboard                                    | Auth-gated. **No GHL chat widget here.**                                                                                                                  |
| `/admin/productos`                                                                                               | CRUD products                                      |                                                                                                                                                           |
| `/admin/promociones`                                                                                             | CRUD promotions + send-promo trigger               | Calls Worker → calls `send-promo` Edge Function (future).                                                                                                 |
| `/admin/anuncios`                                                                                                | Announcements                                      | Reuses `send-promo` plumbing.                                                                                                                             |
| `/admin/eventos`                                                                                                 | Events + RSVP segmentation                         |                                                                                                                                                           |
| `/admin/embajadores`                                                                                             | CRUD ambassadors + tier mgmt                       |                                                                                                                                                           |
| `/admin/agentes`                                                                                                 | Agent pool + GHL user mapping                      |                                                                                                                                                           |
| `/admin/ordenes`                                                                                                 | Order list + state actions                         |                                                                                                                                                           |
| `/admin/comisiones`                                                                                              | Commission approval (`pending → approved → paid`)  |                                                                                                                                                           |
| `/admin/templates`                                                                                               | Message templates editor (mirrors GHL/Meta status) |                                                                                                                                                           |
| `/admin/testimonios`                                                                                             | Approve/reject testimonials                        |                                                                                                                                                           |
| `/admin/contenido`                                                                                               | Edit landing copy, FAQs                            |                                                                                                                                                           |
| `/admin/config`                                                                                                  | App-level config                                   |                                                                                                                                                           |
| `/embajador`                                                                                                     | Ambassador dashboard                               |                                                                                                                                                           |
| `/embajador/leads/nuevo`                                                                                         | Single + CSV lead upload                           |                                                                                                                                                           |
| `/embajador/comisiones`                                                                                          | Own commission lines                               |                                                                                                                                                           |
| `/embajador/:slug/leads`                                                                                         | Public lead-capture link (shareable)               |                                                                                                                                                           |

### 4.3.2 Stack

```
Runtime:    Vite 5 + React 19 + TypeScript
Routing:    React Router 7
Styling:    Tailwind 4 + shadcn/ui + Lucide icons
State:      TanStack Query (server state) + Zustand (cart, UI state)
Animation:  Framer Motion 12
Data:       @supabase/supabase-js
Payment:    @mercadopago/sdk-react (Wallet brick if used; otherwise redirect to mp_url)
Forms:      react-hook-form + zod
```

### 4.3.3 Mandatory state matrix

**Every** data-driven component must render five states. No "white page until data arrives" allowed.

```
loading   → skeleton matching final layout, no spinner-only screens
empty     → friendly empty state with primary CTA
error     → recoverable error UI with retry + a way to contact support
success   → the real content
partial   → mixed state when some children loaded and others didn't
```

### 4.3.4 ≤2M COP gate (frontend mirror)

```ts
// src/lib/checkout.ts
export const SOFT_LIMIT_COP = 2_000_000;

export function gateOrFlow(total: number): "checkout" | "human" {
  return total <= SOFT_LIMIT_COP ? "checkout" : "human";
}
```

The "human" path on the web shows a card: "This piece is in our advisor catalogue. We'll connect you on WhatsApp." Click → opens `https://wa.me/<num>?text=Hola%20quiero%20la%20pieza%20{sku}` AND posts a row to GHL via the bridge (worker) so the contact lands in the right pipeline stage.

The server enforces the same rule (§3.3.2). Both must agree.

### 4.3.5 Design system import

The Area 5 doc defines tokens. They get codified as:

```
src/styles/globals.css           ← CSS variables (color scale, font scale, spacing)
tailwind.config.ts               ← maps variables to Tailwind tokens
src/lib/motion.ts                ← framer-motion presets: fadeInUp, stagger, pageTransition
src/components/ui/*              ← shadcn-generated primitives
src/components/branded/*         ← Tierra Madre-specific compositions (ProductCard, etc.)
```

Color palette (locked):

- Esmeralda 50–900 (#ecfdf5 → #064e3b). CTAs, hovers, success.
- Dorado 100–800 (#fef3c7 → #92400e). Badges, highlights, premium accents. **Never** wide backgrounds.
- Tinta 700–950 (#162320, #0f1714, #0a0f0d, #050807). Dark backgrounds.

Type: **Playfair Display** for emotional headings; **Inter** for body and UI.

### 4.3.6 GHL chat widget embed

Render the widget script **only** on public routes via a layout-level mount guard:

```tsx
// src/components/GhlChatWidget.tsx
export function GhlChatWidget() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/embajador")) return null;
  return (
    <script async src={import.meta.env.VITE_GHL_CHAT_WIDGET_SNIPPET_URL} />
  );
}
```

### 4.3.7 Vercel deploy

```bash
# Inside tierramadre-web/
vercel link        # link to the project created in §4.2
vercel env pull    # pull the env vars from the dashboard
vercel deploy      # preview
vercel deploy --prod   # when ready
```

## 4.4 Verification

- Lighthouse on `/` and `/producto/:slug` ≥ 90 (mobile).
- WCAG AA contrast verified on all interactive elements (Tailwind contrast plugin or axe).
- All five state-matrix renders observed in dev (forced via Devtools network throttling + error injection).
- `≤2M COP` gate test: a cart at 1,999,999 routes to MP; at 2,000,001 routes to human flow.
- `Add to cart` → cart → checkout → MP redirect works end-to-end against staging Supabase.

## 4.5 Exit criteria

- ✅ All routes from §4.3.1 render with at least placeholder content + correct state matrix.
- ✅ Production URL `https://tierramadre.co` resolves with SSL.
- ✅ The 30–50 launch products from Q1 are loaded via `/admin/productos`.
- ✅ The 6 landing pages from Q5 are wired to the contact-capture form.
- ✅ A real test order (staging MP credentials) completes the full flow and lands in `orders.status = pending`.

↪ Source: [`03-WEB-MADRE.md`](./03-WEB-MADRE.md), [`area-5-diseno-ux.html`](./area-5-diseno-ux.html), [`area-6-contenido-catalogo.html`](./area-6-contenido-catalogo.html)

---

# 5. Phase 4 — Cloudflare Workers (Webhooks + Schedulers)

## 5.1 Inputs

- ⬜ Phase 2 complete (Supabase service-role key, Edge Functions reachable).
- ⬜ Phase 3 in progress (we need the `notification_url` to register with MP, even if web isn't fully done).
- ⬜ Credentials from §1.2.3 set via `wrangler secret put`.

## 5.2 Manual user tasks ✋

1. **Cloudflare account** with Workers enabled. Free tier OK (100k requests/day is plenty for early launch).
2. **Mercado Pago dashboard** → Your application → Webhooks → register `https://wh.tierramadre.workers.dev/mp` for events: `payment` (only one we need).
3. **GHL Settings → Workflows → Post-venta** → enable Inbound Webhook trigger → copy the URL → set as `WF_POSTVENTA_ID` secret in Workers.

## 5.3 AI tasks 🤖

### 5.3.1 `mp-webhook` (critical path)

```
tierramadre-workers/
  src/
    mp-webhook.ts
    scheduler.ts
    ghl-bridge.ts
    lib/
      mp.ts           ← MP REST: getPayment(id)
      supabase.ts     ← service-role client over fetch
      ghl.ts          ← GHL v2 wrapper
      hmac.ts         ← HMAC validation
      outbox.ts       ← retry queue for GHL writes
  wrangler.toml       ← three Worker bindings + cron triggers
```

The webhook:

1. **HMAC validation.** MP sends `x-signature` and `x-request-id`. We compute HMAC-SHA256 over `id:<id>;request-id:<rid>;ts:<ts>` with `MP_SECRET`. Mismatch → respond `401` and stop.
2. **Fetch the real payment.** Never trust the webhook body — call `GET /v1/payments/{id}` with `MP_TOKEN`. The webhook body is just a trigger.
3. **Idempotent state transition.**

   ```ts
   const { error } = await sb
     .from("orders")
     .update({
       status: "paid",
       paid_at: new Date().toISOString(),
       mp_payment_id: payment.id,
       mp_status: payment.status,
     })
     .eq("id", payment.external_reference)
     .neq("status", "paid"); // ← only flip if not already paid
   ```

   The `WHERE status <> 'paid'` clause is the guard against double-firing webhooks. `commissions` table also has `UNIQUE(order_id)` so even if the trigger ran twice, only one row persists.

4. **GHL fan-out via outbox.** Write a row in a `worker_outbox` KV-equivalent table (Supabase `worker_outbox` table or Cloudflare KV) with the GHL payload. Then attempt the GHL call. If the call fails, the next cron tick retries from the outbox. This way a GHL outage never loses sales.

   GHL operations on a paid order:
   - `PUT /contacts/{ghl_contact_id}` with `customField` `total_comprado` += order total.
   - `POST /tags/add` with `cliente-pago-confirmado`.
   - `POST <WF_POSTVENTA_ID>` to trigger the post-venta workflow with `{ order_id, total_cop, products: [...] }`.

5. **Logging.** Every step logs to `console` (Workers tail) and to a Supabase `worker_logs` table for replay.

### 5.3.2 `scheduler` (cron triggers)

```toml
# wrangler.toml
[triggers]
crons = ["*/15 * * * *", "0 0 * * *", "0 9 * * *", "0 18 * * *"]
```

| Cron           | Job                  | Calls                                                                               |
| -------------- | -------------------- | ----------------------------------------------------------------------------------- |
| `*/15 * * * *` | `hot-lead-detector`  | Edge Function that scans recent contact activity and bumps `hot_leads`.             |
| `0 0 * * *`    | `ambassador-scoring` | Edge Function `calculate-ambassador-score`.                                         |
| `0 9 * * *`    | `event-reminders`    | Edge Function `auto-event-invite` with `mode=reminder` for events ≤ 72h.            |
| `0 18 * * *`   | `abandoned-cart`     | Edge Function `abandoned-cart` that nudges contacts with `pending` orders > 4h old. |

The dispatcher in `scheduler.ts` reads the cron's UTC timestamp to decide which job to invoke.

### 5.3.3 `ghl-bridge` (optional in MVP)

Receives GHL outbound webhooks for ContactCreate / ContactUpdate and upserts the row into Supabase `contacts`. Only deploy this when we want GHL to be a write-side mirror; for MVP the bot writes directly to Supabase through Edge Functions and we skip the bridge.

### 5.3.4 Wrangler config

```toml
# wrangler.toml
name = "tierramadre-workers"
main = "src/router.ts"
compatibility_date = "2025-01-01"
account_id = "<from cloudflare dashboard>"

[[routes]]
pattern = "wh.tierramadre.workers.dev/*"
zone_name = "tierramadre.workers.dev"

[triggers]
crons = ["*/15 * * * *", "0 0 * * *", "0 9 * * *", "0 18 * * *"]
```

`src/router.ts` dispatches by path: `/mp → mp-webhook`, `/ghl → ghl-bridge`; scheduled events go to `scheduler`.

## 5.4 Deployment commands

```bash
# Set every secret from §1.2.3
wrangler secret put MP_TOKEN
wrangler secret put MP_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put GHL_TOKEN
wrangler secret put GHL_LOCATION_ID
wrangler secret put INTERNAL_API_SECRET
wrangler secret put WF_POSTVENTA_ID
wrangler secret put RESEND_API_KEY
wrangler secret put SLACK_WEBHOOK_URL     # optional

wrangler deploy
```

## 5.5 Verification

```bash
# 1. HMAC rejection
curl -X POST https://wh.tierramadre.workers.dev/mp \
  -H "x-signature: wrong" -H "x-request-id: 1" \
  -d '{"id":"123","type":"payment"}'
# → 401

# 2. Idempotence drill — fire the same valid webhook twice
#    Inspect commissions: exactly one row for that order_id.
#    Inspect contacts: total_comprado_cop bumped exactly once.

# 3. Cron health
wrangler tail tierramadre-workers          # watch a 15-min window for hot-lead-detector firing
```

## 5.6 Exit criteria

- ✅ `mp-webhook` deployed, HMAC validated, idempotent.
- ✅ MP dashboard shows our webhook URL with `> 99%` success rate after a staging payment.
- ✅ All four cron jobs fire on schedule (visible in `wrangler tail`).
- ✅ Outbox pattern verified: kill GHL connectivity, fire a payment, then restore — the retry succeeds without manual intervention.
- ✅ Test alert sent to Resend + Slack from a synthetic Worker failure.

↪ Source: [`04-INTEGRACIONES.md`](./04-INTEGRACIONES.md), [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md) Flows 1, 4, 6, 8.

---

# 6. Phase 5 — Meta Channels + WhatsApp Templates

> Almost entirely manual ✋. Meta's WhatsApp Business API setup has no API. The 40 templates require human submission and 24–48 h Meta approval per template.

## 6.1 Inputs

- ⬜ Phase 1 complete (GHL location ready).
- ⬜ Manual prereqs: Meta Business Manager, WhatsApp Business number, FB Page, IG Business, Meta-verified business identity.
- ⬜ Content prereq: the `whatsapp-templates.md` + `.csv` source list — to be authored in `GHL/output/whatsapp-templates.md` and `GHL/output/whatsapp-templates.csv` (path stub; create when content is ready).

## 6.2 Manual user tasks ✋

### 6.2.1 Connect WhatsApp Business number to GHL

Two routes; pick one and stay on it:

- **Via Meta directly** — Meta Business → WhatsApp → register number → GHL Settings → WhatsApp → "Connect via Meta API". GHL becomes a tenant under your Meta account.
- **Via GHL provider (LC Phone)** — GHL Settings → WhatsApp → "Use LC Phone". Faster setup; less direct control.

### 6.2.2 Connect IG + FB

GHL Settings → Integrations → Facebook → OAuth flow with the FB account that owns the IG Business asset. Once connected, IG DMs route into the same unified inbox.

### 6.2.3 Connect TikTok (if plan supports it)

GHL Settings → Integrations → TikTok → OAuth. Skip if your plan locks it.

### 6.2.4 Register 40 WhatsApp templates

Source list lives in `GHL/output/whatsapp-templates.md` + `.csv` (with `code`, `category`, `priority`, `body`, `vars`, `buttons`). Order of registration:

1. **Priority 1 (register first to unblock Phase 6 + Phase 8):** `WA-01`, `IG-01`, `CK-01`, `CK-03`, `ES-01`, `PV-02`, `PV-03`.
2. **Rest of the 40** in descending priority order.

For each template, in Meta Business → WhatsApp Manager → Message Templates:

```
1. Click "Create Template"
2. Category = MARKETING or UTILITY (per the source CSV)
3. Language = Español (Colombia) — code es_CO
4. Name = the snake_case code (e.g. saludo_inicial_wa for WA-01)
5. Body = paste verbatim from the source file. Variables as {{1}}, {{2}}.
6. Add sample variables (real-looking examples — required for approval)
7. Buttons: configure as the source file specifies (URL/quick-reply/none)
8. Submit
```

Meta typically responds in 24–48 h. **MARKETING templates are rejected more often** — they require an opt-in pattern. UTILITY templates (order confirmations, shipping updates) pass faster.

### 6.2.5 Generate web chat snippet

GHL Settings → Web Chat → customize widget → copy snippet → store URL in `VITE_GHL_CHAT_WIDGET_SNIPPET_URL`. The frontend already gates this to public routes (§4.3.6).

## 6.3 AI tasks 🤖

- Generate and maintain the 40 template source files in `GHL/output/whatsapp-templates.md` + `.csv` (this is one of the few automatable pieces of Phase 5).
- Mirror template status (`draft / pending / approved / rejected`) into Supabase `message_templates` so `/admin/templates` can show it.
- Provide an `/admin/templates/preview` UI to render each template with sample variables.

## 6.4 Verification

- Send a test message from an external WhatsApp into the business number → it appears in the GHL unified inbox within seconds.
- Send a test DM from a personal IG account to the business IG → appears in the same inbox.
- A priority-1 template (e.g. `WA-01`) shows status APPROVED in Meta Business → status mirrored as `approved` in `/admin/templates`.
- Web chat widget appears on `/` but **not** on `/admin` or `/embajador`.

## 6.5 Exit criteria

- ✅ All 7 priority templates approved.
- ✅ All 4 channels (WA, IG, FB, TikTok-if-applicable) route messages into GHL inbox.
- ✅ Web chat widget loaded on public routes only.

↪ Source: [`05-META-WHATSAPP.md`](./05-META-WHATSAPP.md), [`01-GHL.md`](./01-GHL.md) §B.

---

# 7. Phase 6 — Bot María (GHL Agent Studio)

> Manual ✋ inside GHL Agent Studio (no API to build bots programmatically). Plan upgrade required.

## 7.1 Inputs

- ⬜ Phase 2 complete (`search-products` deployed, `INTERNAL_API_SECRET` set).
- ⬜ Phase 5 complete (channels connected so the bot has something to listen to).
- ⬜ GHL AI Employee Plus plan active.
- ⬜ Bot instructions live in `GHL/output/bot-personality.md`, `bot-flow-instructions.md`, `bot-escalation-rules.md` (paths exist as stubs — author content when this phase starts).

## 7.2 Manual user tasks ✋

### 7.2.1 Build the agent

GHL → AI Employees → Agent Studio → New Agent → "Bot María".

**Node 1 — LLM:**

- Instructions = concatenation of `bot-personality.md` + `bot-flow-instructions.md` + `bot-escalation-rules.md`.
- Hard rules:
  - Tutea (`tú`, not `usted`).
  - Max 1 emoji per response.
  - Warm tone, never pushy.
  - If perceived value ≤ 2,000,000 COP, close on the web; ≤ 5,000,000 COP keep handling; > 5,000,000 COP route to human.
  - Triggers for human handoff: explicit "hablar con asesor", complaint, return request, investment > 5M, lead score > 81.

**Node 2 — Knowledge Base tool:**

- Source = existing KB "Tierra Madre KB" (`OHDQ6vwrSUBsPD5rwHlK`, 6 PDFs).

**Node 3 — API tool `search-products`:**

- Method: POST
- URL: `{{custom_values.supabase_url}}/functions/v1/search-products`
- Headers: `Authorization: Bearer {{custom_values.internal_api_secret}}`, `Content-Type: application/json`
- Body schema:

  ```json
  {
    "intent": { "categoria": "{{intent_categoria}}" },
    "presupuesto": "{{presupuesto}}",
    "ocasion": "{{ocasion}}",
    "ciudad": "{{ciudad}}"
  }
  ```

- Output mapping: bot uses `products[].web_link` to send the customer to the right product page.

**Node 4 — Human Handover:**

- Conditions: any of the triggers above.
- Action: pause bot + assign to user (round-robin from the right pool, per Phase 7).

### 7.2.2 Mode toggle

- **Suggestive mode** for the first 2 weeks: the bot drafts a reply, an agent approves it.
- **Auto-Pilot** once metrics look healthy (Phase 8 exit criterion).

### 7.2.3 Channel attach

Settings → AI Employees → assign Bot María to each connected channel.

## 7.3 AI tasks 🤖

- Maintain the three instruction files in `GHL/output/` so re-imports are easy.
- Provide test rigs that simulate inbound messages against `search-products` to verify the bot's contract returns sensible results.
- Build (in Supabase) a `bot_conversations` view or table so we can audit decisions outside GHL.

## 7.4 Verification

- Send an inbound test message: "Hola, quiero un anillo para mi novia, presupuesto 1,500,000".
  - Bot responds within ~10 s in Spanish, tutea, ≤ 1 emoji.
  - 3 products with web links arrive.
- Send "Tengo presupuesto de 6M y quiero invertir" → bot routes to human (no products sent).
- Send "Quiero hablar con un asesor" → immediate handoff regardless of context.

## 7.5 Exit criteria

- ✅ Bot in Suggestive mode answering on all channels.
- ✅ `search-products` round-trip works from inside the bot.
- ✅ Handoff rules verified end-to-end.

↪ Source: [`01-GHL.md`](./01-GHL.md) §C, [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md) Flow 1.

---

# 8. Phase 7 — GHL Workflows (WF-01..WF-10)

> Manual ✋ in GHL UI. Output files (`workflows-blueprint.md`, `workflows-paso-a-paso.md`) live in `GHL/output/` (to be authored).

## 8.1 Inputs

- ⬜ Phases 2, 5, 6 complete.
- ⬜ Decisions consumed: **Q3** (scoring formula → `WF-09`), **Q4** (agent pools + SLAs → `WF-06`), **Q6** (promo rules → `WF-06`/`WF-09`).

## 8.2 Manual user tasks ✋

For each workflow:

1. Settings → Workflows → New.
2. Add trigger, conditions, actions per blueprint.
3. Publish.
4. Smoke-test with a synthetic contact.

### 8.2.1 The 10 workflows

| ID        | Name                                 | Trigger                                                                                    | Key actions                                                                                                                                                                                            |
| --------- | ------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **WF-01** | Nuevo contacto                       | Contact Created                                                                            | Create Opportunity in "1. Nuevo Lead" stage. Add tag `lead-nuevo`. Add custom value `canal_origen` from the inbound channel. Optionally call `match-ambassador` Edge Function via Custom Webhook.      |
| **WF-02** | Embajador match                      | After WF-01, if `match-ambassador` returned a hit                                          | Set `embajador_asignado` custom field. Send EM-01 to the ambassador. Pause the bot 5 minutes (Flow 2).                                                                                                 |
| **WF-03** | Lead score tier change               | Custom Field Changed (`lead_score`)                                                        | If crosses 81 → escalate to human (route to WF-06). If drops below 30 → tag `lead-frio`.                                                                                                               |
| **WF-04** | Carrito abandonado                   | Inbound Webhook from scheduler cron `18:00`                                                | Send WA template `CK-03`.                                                                                                                                                                              |
| **WF-05** | Post-venta                           | Inbound Webhook from `mp-webhook` (`WF_POSTVENTA_ID`)                                      | Tag `cliente-pago-confirmado`. Send WA `PV-02` (thank you) + `PV-03` (delivery ETA). Schedule WF-08 testimonial ask.                                                                                   |
| **WF-06** | Escalación a humano                  | Customer Replied with escalation keywords OR Lead Score ≥ 81 OR Order > 2M                 | Assign to User round-robin within the matching pool (`agente-premium` / `-inversion` / `-senior` / `-regular`). Pause bot. Move opportunity to "5. Negociación / Agente". Start SLA timer (Q4 values). |
| **WF-07** | Notificación nueva venta a embajador | Trigger from Supabase `commissions` insert (via `ghl-bridge` or direct Edge Function call) | Send EM-02 with commission amount.                                                                                                                                                                     |
| **WF-08** | Pedir testimonio                     | Wait 14 d after WF-05                                                                      | Send template asking for rating. If rating ≥ 4.5, auto-flag in Supabase (trigger T6).                                                                                                                  |
| **WF-09** | Re-engagement                        | Daily scheduler                                                                            | Pull cold leads (`lead_score < 30`, last contact > 14 d). Send WA `ES-01`. Move to "7. Perdido" if still cold after 30 d.                                                                              |
| **WF-10** | Evento RSVP                          | Form Submitted (any event landing)                                                         | Tag `evento-{slug}-rsvp`. Generate QR code. Schedule reminders at 3 d / 1 d / 2 h. After event, fire pre-venta promo (`PR-01`).                                                                        |

### 8.2.2 Agent pools

Settings → My Staff → Users → ensure these tags exist (already in the 48 tags from Phase 1): `agente-premium`, `agente-inversion`, `agente-senior`, `agente-regular`. Settings → Auto-Assignment → create one round-robin rule per pool tag.

SLA defaults (from Q4): Senior 2 m · Inversión 5 m · Premium 10 m · Regular 15 m. Reassign on timeout.

## 8.3 AI tasks 🤖

- Generate and maintain `GHL/output/workflows-blueprint.md` (a JSON/Markdown spec for each workflow) and `GHL/output/workflows-paso-a-paso.md` (click-by-click guide).
- For workflows that call Edge Functions (WF-01 ambassador match, WF-09 promo, WF-03 score-driven routing): build the Edge Functions (`match-ambassador`, `send-promo`, `calculate-ambassador-score`, `auto-event-invite`, `hot-lead-detector`, `ghl-sync`).
- All Edge Functions validate `INTERNAL_API_SECRET` and return well-shaped JSON for GHL's Save Response step.

## 8.4 Verification

- WF-01: insert a test contact → opportunity appears in "1. Nuevo Lead" within 5 s.
- WF-05: simulate the `mp-webhook` flow → `WF-05` fires, tag applied, WA `PV-02` queued.
- WF-06: change a contact's score to 90 → escalation fires, agent assigned, bot paused.
- WF-10: submit an event RSVP form → QR generated, 3 reminders scheduled.

## 8.5 Exit criteria

- ✅ All 10 workflows live and tested end-to-end.
- ✅ Round-robin verified across each pool with at least 2 staff users per pool.
- ✅ SLA timers visible in GHL with reasign-on-timeout firing in dev.

↪ Source: [`01-GHL.md`](./01-GHL.md) §D, §E; [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md) Flows 4, 7, 8.

---

# 9. Phase 8 — QA + Soft Launch

## 9.1 Inputs

- ⬜ Phases 2–7 complete.
- ⬜ Real Mercado Pago credentials in production.
- ⬜ ≥ 30 products live (Q1).
- ⬜ 7 priority templates approved.

## 9.2 The 8 end-to-end flow tests

For each, capture a screen recording + the contact + opportunity IDs as evidence.

| #   | Flow                                 | Pass condition                                                                                                 |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 1   | New customer purchase (golden path)  | Steps 1–10 from §0.2 all green.                                                                                |
| 2   | Bot detects ambassador match         | `embajador_asignado` set; EM-01 delivered; commission created on paid.                                         |
| 3   | Ambassador uploads leads (CSV)       | Rows in `ambassador_leads`; T4 assigns; embajador panel updates via Realtime.                                  |
| 4   | Purchase commission notification     | T3 fires once even if webhook replays; EM-02 sent.                                                             |
| 5   | Customer requests ambassador         | EM-01 + push; bot pauses 5 min; resumes if no reply.                                                           |
| 6   | Admin sends a promo                  | `send-promo` issues unique codes; redemption validates server-side; throttling stays under GHL 100 req / 10 s. |
| 7   | Escalation to human                  | Keyword/amount triggers; correct pool gets the assignment; SLA timer visible.                                  |
| 8   | Event RSVP → attendance → post-event | QR generated; check-in updates `eventos_asistidos`; PR-01 fires within 24 h of event end.                      |

## 9.3 Resilience drills

- **Idempotence**: replay an `mp-webhook` payload 5 times → exactly 1 `commissions` row, `contacts.total_comprado_cop` incremented exactly once.
- **GHL outage simulation**: temporarily revoke the GHL PIT token mid-flow → outbox queues; restore the token → retries succeed.
- **Rate-limit drill**: blast 200 promo sends back-to-back → token-bucket spreads them; no `429` errors from GHL.
- **MP outage**: cut MP connectivity → checkout shows a friendly "try again" state; orders stay `pending` and don't double-fire when MP returns.
- **Bot kill-switch**: flip Auto-Pilot → Suggestive globally from the bot panel; verify no auto-replies leave during the next 5 min window.

## 9.4 Observability checklist

- Worker logs streamed (Cloudflare → Workers Logs or external sink).
- Supabase logs piped (`supabase logs functions search-products`).
- Resend alerts on Worker errors with severity `error`.
- Slack channel `#tm-alerts` receiving the same alerts.
- `/admin/health` page on the web shows last MP webhook, last cron run, last Edge Function error.

## 9.5 Soft-launch criteria

- ✅ All 8 flow tests pass with evidence.
- ✅ All 5 resilience drills pass.
- ✅ 7 priority templates approved.
- ✅ At least one real customer order from each major channel (WA / IG / web).
- ✅ At least one commission row generated end-to-end and approved in `/admin/comisiones`.
- ✅ Lighthouse mobile ≥ 90 on `/`, `/catalogo`, `/producto/:slug`.
- ✅ WCAG AA verified.
- ✅ Backups: Supabase daily backup enabled; Workers KV (if used) replicated; manual export of `orders + commissions` once before launch.

↪ Source: [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md), [`00-INDICE-Y-MAPA.md`](./00-INDICE-Y-MAPA.md) §8.

---

# 10. Source-of-Truth Contract Table

The integration contract every developer should keep on a sticky note.

| Origin                      | Destination                                                | Method                            | Auth                                                          | Notes                                                                    |
| --------------------------- | ---------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 🤖 Agent Studio (Bot María) | 🗄️ `search-products`                                       | API Tool, POST                    | `Authorization: Bearer {{custom_values.internal_api_secret}}` | 3 products, web links.                                                   |
| 🧠 GHL Workflow             | 🗄️ Edge Functions (`match-ambassador`, `send-promo`, etc.) | Custom Webhook + Save Response    | `Authorization: Bearer {{custom_values.internal_api_secret}}` | Save Response captures JSON for downstream steps.                        |
| 🌐 Web (storefront)         | 🗄️ Supabase (catalog read)                                 | `supabase-js`                     | `anon` key + RLS                                              | `activo = true` enforced by RLS.                                         |
| 🌐 Web (checkout)           | 🗄️ `create-order`                                          | fetch POST                        | `anon` JWT _or_ `INTERNAL_API_SECRET`                         | Server reloads prices, applies promo, gates ≤ 2M, creates MP preference. |
| 🌐 Web / `create-order`     | 💳 Mercado Pago                                            | REST `POST /checkout/preferences` | `MP_ACCESS_TOKEN`                                             | `notification_url` points to `wh.tierramadre.workers.dev/mp`.            |
| 💳 Mercado Pago             | ⚡ `mp-webhook`                                            | Webhook POST                      | HMAC with `MP_SECRET`                                         | Worker re-fetches the payment from MP — never trusts the body.           |
| ⚡ Worker                   | 🗄️ Supabase                                                | PostgREST                         | `SUPABASE_SERVICE_KEY`                                        | Bypasses RLS; used only server-side.                                     |
| ⚡ Worker                   | 🧠 GHL                                                     | API v2                            | `pit-` token + `Version: 2021-07-28`                          | Outbox retries on failure.                                               |
| 🗄️ Supabase ↔ 🧠 GHL        | Field sync                                                 | Trigger or Worker                 | One writer per field                                          | `lead_score` is GHL-owned; `total_comprado_cop` is Supabase-owned.       |
| 🧠 GHL                      | 👤 Team                                                    | Human Handover + Assign to User   | Round-robin by pool tag                                       | SLA timer per pool (Q4).                                                 |

**One writer per field, always.** If both sides start writing the same field, eventual consistency turns into a race.

↪ Source: [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md) §Data Contracts.

---

# 11. Golden Rules

Print this. Tape it to a wall.

1. **Single catalog.** Supabase `products` feeds both the web and the bot. There is no second catalog.
2. **Sale closes on the web.** The bot only sends links. It never collects a card, never says "transferred", never creates an order on its own.
3. **`≤ 2M COP` gate is server-side.** `create-order` rejects > 2M with `409`. The bot prompt is a UX hint, not the enforcement.
4. **Idempotent payment webhook.** `WHERE status <> 'paid'` plus `UNIQUE(order_id)` on commissions. Webhook replays cost nothing.
5. **Every GHL → Supabase call carries `INTERNAL_API_SECRET`.** No exceptions. Missing header → `401`.
6. **One writer per field.** Document the owner; never share write privileges across boundaries.
7. **Respect GHL rate limit (100 req / 10 s).** Bulk sends go through a token-bucket in `scheduler`.

↪ Source: [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md) §Golden Rules.

---

# 12. Risk + Rollback Notes

## 12.1 Payment webhook failure modes

| Failure                               | Detection                                          | Mitigation                                                                             |
| ------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| HMAC mismatch (forged or rotated key) | Worker logs `hmac_invalid`; counter alerts         | `MP_SECRET` rotation: update Worker secret and MP webhook signature key in one window. |
| Webhook delivered but MP API down     | Worker can't fetch the payment                     | Outbox: keep the webhook in the queue, retry every 5 minutes.                          |
| Supabase down                         | UPDATE returns error                               | Worker returns 5xx → MP retries automatically (its default policy).                    |
| Order already marked `paid`           | `UPDATE ... WHERE status <> 'paid'` affects 0 rows | Log + skip — this IS the idempotence path.                                             |

## 12.2 GHL sync field collisions

If both Supabase and GHL try to write `total_comprado`, eventual order matters. Resolution: **Supabase is the source of truth for sale totals**, GHL is informed; **GHL is the source of truth for `lead_score`**, Supabase is informed. Never reverse.

## 12.3 Meta template rejection

| Cause                                                  | Fix                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| Body uses promotional language without explicit opt-in | Add a UTILITY variant first; resubmit MARKETING after capturing opt-in. |
| Variables don't match samples                          | Provide realistic samples for every `{{n}}`.                            |
| Language mismatch                                      | Make sure `Español (Colombia) es_CO` is selected.                       |

If a priority-1 template is rejected, soft launch is blocked until resubmission passes — typically another 24–48 h.

## 12.4 Mercado Pago outage

Customer-facing fallback: web checkout shows "Payment temporarily unavailable. We'll contact you on WhatsApp to close the sale" and POSTs the unfinished order intent into GHL with tag `mp-outage-pending`. A workflow picks it up for manual closure.

## 12.5 Bot Auto-Pilot kill-switch

A single toggle in Agent Studio flips the bot back to Suggestive. Operator runbook: if customer complaints spike or sentiment scoring drops, flip the switch, post in `#tm-alerts`, investigate without losing inbound messages — Suggestive mode still drafts replies for humans to approve.

## 12.6 Greenfield ↔ existing TierraMadre Studio

This spec stands up a parallel system. It does **not** import data from the existing TierraMadre Studio (Google Sheets / Drive). A separate migration plan can be authored when launch is stable; until then the two systems coexist and the existing repo continues serving its quotations / treasure-browser purpose untouched.

↪ Source: synthesized from all 10 docs; explicit notes in [`04-INTEGRACIONES.md`](./04-INTEGRACIONES.md) §Robustness and [`06-FLUJOS-CONEXION.md`](./06-FLUJOS-CONEXION.md) §Golden Rules.

---

## End of spec

**Maintenance rule:** if a source doc in `GHL/` changes, this file changes within the same commit. The 10 source docs are the contract; this spec is the executable index.
