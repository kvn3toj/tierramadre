# Tierra Madre — Setup Spec (sourced only from HTML files)

> **Source files used (and only these):**
> [`plan-ejecucion-tierra-madre.html`](./plan-ejecucion-tierra-madre.html) · [`area-1-frontend.html`](./area-1-frontend.html) · [`area-2-supabase.html`](./area-2-supabase.html) · [`area-3-gohighlevel.html`](./area-3-gohighlevel.html) · [`area-4-integraciones.html`](./area-4-integraciones.html) · [`area-5-diseno-ux.html`](./area-5-diseno-ux.html) · [`area-6-contenido-catalogo.html`](./area-6-contenido-catalogo.html) · [`manual-desarrollo-tecnico.html`](./manual-desarrollo-tecnico.html) · [`manual-ghl-paso-a-paso.html`](./manual-ghl-paso-a-paso.html)
>
> The Markdown docs (`00-INDICE-Y-MAPA.md`, `01-GHL.md`, ...) were deliberately **not** consulted. If they disagree with this spec, the HTML files win.

---

## Table of Contents

0. [Executive Summary & Architectural Decision](#0-executive-summary--architectural-decision)
1. [Roles, Owners & Timeline](#1-roles-owners--timeline)
2. [Pre-flight Checklist](#2-pre-flight-checklist)
3. [Area 3 — GoHighLevel (10 Phases · 3 weeks · ~30h)](#3-area-3--gohighlevel-10-phases--3-weeks--30h)
4. [Area 2 — Supabase Backend](#4-area-2--supabase-backend)
5. [Area 1 — Frontend (6 Sprints · 8 weeks)](#5-area-1--frontend-6-sprints--8-weeks)
6. [Area 4 — Integrations (4 Cloudflare Workers)](#6-area-4--integrations-4-cloudflare-workers)
7. [Area 5 — Design System](#7-area-5--design-system)
8. [Area 6 — Content & Catalog](#8-area-6--content--catalog)
9. [The 13 Workflows (WF-01..WF-13)](#9-the-13-workflows-wf-01wf-13)
10. [Acceptance — 9 QA Scenarios](#10-acceptance--9-qa-scenarios)
11. [Final Deliverables Checklist](#11-final-deliverables-checklist)

---

# 0. Executive Summary & Architectural Decision

## 0.1 The decision

From `plan-ejecucion-tierra-madre.html`: a **headless custom build** beat both Shopify (basic design, $29/mo, no design control) and full custom backend (6 months, $30–50k). Winning stack:

| Layer      | Choice                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Frontend   | **Vite + React 19 + Framer Motion 12 + Tailwind 4**                    |
| Backend    | **Supabase** (PostgreSQL + Storage + Auth + Edge Functions)            |
| CRM / AI   | **GoHighLevel** (API v2 + Conversation AI)                             |
| Payment    | **Mercado Pago Checkout API** (PSE, Nequi, Daviplata, card, 12 cuotas) |
| Middleware | **Cloudflare Workers**                                                 |
| Hosting    | Vercel or Cloudflare Pages                                             |

**Time to launch:** 10–12 weeks (overlapping work). Monthly SaaS cost ~$400–600.

## 0.2 The 4-layer architecture

```
Layer 1 · Canales       WhatsApp · Instagram · TikTok · Web Chat · Forms (Eventos, Embajadores)
                                │
                                ▼
Layer 2 · Cerebro GHL   Unified inbox · Conversation AI (María) · CRM · Lead scoring
                        Workflows WF-01..WF-13 · Tags · 14 Custom Fields · Pipeline (7 stages)
                                │
                                ▼
Layer 3 · Comercio      Vite "Página Madre" · 6 Landings · Supabase storefront · MP checkout
                                │
                                ▼
Layer 4 · Equipo        Sales agents (4 pools) · Embajadores (4 tiers)
```

## 0.3 The 7 vision pillars (from plan-ejecucion)

1. Multi-canal nativo → unified inbox.
2. Catálogo inteligente (AI recommendations).
3. Lead scoring (Frío / Tibio / Caliente / VIP).
4. Embajadores con comisión (auto-assignment, 5-min fallback).
5. Eventos integrados (virtual + presencial, auto-segmentation).
6. Checkout automático (Mercado Pago).
7. Supabase schema with rich product fields.

↪ Source: `plan-ejecucion-tierra-madre.html`

---

# 1. Roles, Owners & Timeline

The two HTML manuals split the work cleanly between two humans (or two specialist tracks), each ~3 weeks of independent execution.

| Role                 | Manual                           | Duration | Hours     | What they own                                                                                                                              |
| -------------------- | -------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **GHL Configurator** | `manual-ghl-paso-a-paso.html`    | 3 weeks  | 25–30     | GHL sub-account, custom fields, pipeline, tags, channel OAuth, Bot María, workflows, templates, agent pool, QA                             |
| **Developer**        | `manual-desarrollo-tecnico.html` | 8 weeks  | 6 sprints | Web app, 6 landings, cart, checkout, MP integration, admin panel, embajador portal, 4 Cloudflare Workers, 10 Edge Functions, tests, deploy |
| Designer             | `area-5-diseno-ux.html`          | Parallel | —         | Figma file + tokens + components (handoff to Developer)                                                                                    |
| Marketing/Product    | `area-6-contenido-catalogo.html` | Ongoing  | —         | 30–50 products + photos + copy + keywords + certificates                                                                                   |

GHL Configurator finishes Phases 1–4 first → hands token + Location ID to Developer → Developer's Sprints 2+ unblock.

↪ Source: `manual-ghl-paso-a-paso.html`, `manual-desarrollo-tecnico.html`

---

# 2. Pre-flight Checklist

Everything below is a human-with-a-browser task. Complete it once before any work starts.

## 2.1 Accounts

| #   | Account                                                     | Plan                 | Needed by                    | Cost               |
| --- | ----------------------------------------------------------- | -------------------- | ---------------------------- | ------------------ |
| 1   | **GitHub** (private repo `tierramadre-system`)              | Free                 | Developer Sprint 1           | $0                 |
| 2   | **Supabase**                                                | Free → Pro at launch | Developer Sprint 1           | $0 → $25/mo        |
| 3   | **Vercel** (or Cloudflare Pages)                            | Free → Pro           | Developer Sprint 1           | $0 → ~$20/mo       |
| 4   | **Cloudflare** (Workers)                                    | Free                 | Developer Sprint 5           | $0                 |
| 5   | **Mercado Pago Colombia** (Business)                        | —                    | Developer Sprint 5           | Per-tx fee         |
| 6   | **GHL Pro** + Agency access                                 | Pro                  | GHL Phase 1                  | $297/mo            |
| 7   | **Meta Business Manager**                                   | Free                 | GHL Phase 5                  | $0                 |
| 8   | **WhatsApp number** (new or non-personal) + LC Phone or own | —                    | GHL Phase 5                  | ~$2/mo if LC Phone |
| 9   | **Instagram Business** + Facebook Page connected            | —                    | GHL Phase 5                  | $0                 |
| 10  | **TikTok Business**                                         | —                    | GHL Phase 5 (optional)       | $0                 |
| 11  | **Claude Code / Lovable**                                   | —                    | Developer                    | per plan           |
| 12  | **Figma**                                                   | —                    | Designer                     | —                  |
| 13  | **Resend** (transactional email)                            | —                    | Sprint 2 (invite-ambassador) | per plan           |
| 14  | **Sentry** (error tracking)                                 | —                    | Sprint 6 deploy              | —                  |

## 2.2 Credentials to collect

| Credential                                        | Source                                             | Used by                           |
| ------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| GHL Private Integration Token                     | GHL Settings → Integrations → Private Integrations | Frontend, Workers, Edge Functions |
| GHL Location ID                                   | GHL Settings → Company (also in URL)               | Same                              |
| MP `PUBLIC_KEY`, `ACCESS_TOKEN`, `WEBHOOK_SECRET` | MP Developer Panel (separate test/prod)            | Frontend + Workers                |
| Supabase `URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`    | Supabase Settings → API                            | Everywhere                        |
| Resend API key                                    | Resend dashboard                                   | Edge Functions                    |

## 2.3 Repo bootstrap

```bash
# Monorepo skeleton (per manual-desarrollo-tecnico.html, Sprint 1)
mkdir tierramadre-system && cd tierramadre-system
mkdir apps supabase tierramadre-workers
cd apps && npm create vite@latest web -- --template react-ts
cd web
npm install
```

## 2.4 .env.local for the web app

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GHL_API_BASE=https://services.leadconnectorhq.com
VITE_GHL_LOCATION_ID=          # from GHL Configurator
VITE_MP_PUBLIC_KEY=APP_USR-xxx
VITE_CF_WORKERS_BASE=https://wh.tierramadre.workers.dev
```

↪ Source: `manual-desarrollo-tecnico.html` Sprint 1, `manual-ghl-paso-a-paso.html` Phase 1

---

# 3. Area 3 — GoHighLevel (10 Phases · 3 weeks · ~30h)

> Every step here is **manual ✋ inside the GHL UI**. There is no API for sub-account creation, custom field setup, or workflow construction at scale.

## 3.1 Phase 1 — Sub-account + Branding (2 h)

1. Access **`https://app.gohighlevel.com`**.
2. Agency Dashboard → **Sub-Accounts → Add Sub-Account**:
   - Business Name: **Tierra Madre**
   - Email: **`hola@tierramadre.co`**
   - Country: **Colombia**
   - Timezone: **America/Bogota**
   - State: Cundinamarca _or_ Antioquia
   - City: Bogotá _or_ Medellín
3. Enter the sub-account → **Settings → Business Profile**:
   - Timezone: `America/Bogota` · Currency: **`COP`** · Date format `DD/MM/YYYY` · Time `12h`.
   - Upload Tierra Madre logo.
4. **Settings → Company → Branding**:
   - Primary color **`#10b981`** (emerald) · Secondary **`#fcd34d`** (gold).
5. **Settings → Integrations → Private Integrations → Create Token**:
   - Name: `Tierra Madre Web Integration`.
   - Scopes (check ALL):
     - `contacts.write`, `contacts.readonly`
     - `conversations.write`, `conversations.readonly`, `conversations/message.write`, `conversations/message.readonly`
     - `workflows.readonly`
     - `opportunities.write`, `opportunities.readonly`
     - `locations.readonly`, `locations/customFields.write`, `locations/customFields.readonly`, `locations/tags.write`, `locations/tags.readonly`
     - `calendars.write`, `calendars.readonly`
     - `forms.readonly`
   - **Copy the token immediately** (shown only once).
6. Note the **Location ID** (Settings → Company; also in the URL).

**Deliverable:** sub-account + token + Location ID saved.

## 3.2 Phase 2 — 14 Custom Fields (1.5 h)

Settings → Custom Fields → Add Custom Field. Create exactly these 14:

| #   | Field                     | Type           | Options / Default                                                                                       |
| --- | ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Presupuesto Declarado COP | Number         | placeholder `Ej: 800000`                                                                                |
| 2   | Tipo de Interés           | Single Options | `topito`, `candonga`, `anillo`, `dije`, `gema_suelta`, `set`, `otro`                                    |
| 3   | Conoce Esmeraldas         | Single Options | `novato`, `intermedio`, `experto`, `coleccionista`                                                      |
| 4   | Embajador Asignado        | Text           | UUID / slug                                                                                             |
| 5   | Eventos Presenciales      | Number         | default 0                                                                                               |
| 6   | Eventos Virtuales         | Number         | default 0                                                                                               |
| 7   | Total Comprado COP        | Number         | default 0                                                                                               |
| 8   | Última Compra             | Date           | —                                                                                                       |
| 9   | Lead Score                | Number         | default 0, range 0–100                                                                                  |
| 10  | Canal de Origen           | Single Options | `whatsapp`, `instagram`, `tiktok`, `facebook`, `web`, `evento_presencial`, `evento_virtual`, `referido` |
| 11  | Canal Preferido           | Single Options | `whatsapp`, `instagram`, `tiktok`, `facebook`, `email`                                                  |
| 12  | Ciudad                    | Text           | —                                                                                                       |
| 13  | ID Supabase               | Text           | UUID of the contact in Supabase                                                                         |
| 14  | Cumpleaños                | Date           | —                                                                                                       |

**Deliverable:** 14 fields visible (take a screenshot for record).

## 3.3 Phase 3 — Pipeline (30 min)

Opportunities → Pipelines → Add Pipeline named **`Ventas Tierra Madre`**. Delete defaults, create:

| #   | Stage                | Color                  |
| --- | -------------------- | ---------------------- |
| 1   | Nuevo Lead           | Gris `#64748b`         |
| 2   | Calificado por IA    | Azul `#3b82f6`         |
| 3   | Producto Recomendado | Verde claro `#10b981`  |
| 4   | Carrito Enviado      | Amarillo `#fbbf24`     |
| 5   | Negociación / Agente | Naranja `#f97316`      |
| 6   | Venta Cerrada        | Verde fuerte `#16a34a` |
| 7   | Perdido / Nurturing  | Rojo `#ef4444`         |

Save → click each stage → record the Stage IDs in a private doc.

## 3.4 Phase 4 — ~48 Tags (1 h)

Settings → Tags → Add Tag. Eight groups, listed exactly:

```
# Canales (6)
canal-whatsapp · canal-instagram · canal-tiktok · canal-facebook · canal-web · canal-evento

# Lead state (5)
lead-nuevo · lead-calificado · lead-caliente · lead-frio · lead-perdido

# Special stages (5)
productos-mostrados · carrito-enviado · carrito-abandonado · cliente-pago-confirmado · nurturing-mensual

# Escalation (6)
pide-humano · lead-inversion · lead-vip · queja · devolucion · urgencia

# Agent pools (4)
agente-premium · agente-inversion · agente-senior · agente-regular

# Embajadores (5)
lead-precarga · ambassador-bronce · ambassador-plata · ambassador-oro · ambassador-diamante

# Ocasiones (7)
ocasion-regalo · ocasion-cumpleanos · ocasion-aniversario · ocasion-matrimonio · ocasion-diario · ocasion-inversion · ocasion-evento-especial

# Tipos de interés (6)
interes-topito · interes-anillo · interes-dije · interes-gema-suelta · interes-set · interes-cert

# Otros (4)
unsubscribed · bloqueado · cliente-recurrente · referido-cliente
```

## 3.5 Phase 5 — Connect Channels (4 h + 24–48 h Meta approval)

**WhatsApp Business API:**

1. Verify Meta Business Manager (CEO must log in at `business.facebook.com`).
2. GHL Settings → Phone Numbers → Add WhatsApp → authorize Meta → select Tierra Madre Business.
3. Choose:
   - **Option A (recommended):** Buy CO number via GHL (~$2 USD/mo via LC Phone).
   - **Option B:** Connect an existing number (must NOT be used on the WhatsApp app).
4. Complete SMS/call verification.
5. Wait **24–48 h** for Meta approval.

**Instagram Business:**

1. In the IG app → Tierra Madre profile → Settings → Account → Switch to Business.
2. Connect to the Tierra Madre Facebook Page.
3. GHL Settings → Integrations → Facebook/Instagram → Connect → authorize.
4. Test: have someone DM the account, confirm it appears in GHL Conversations.

**TikTok Business:**

1. TikTok app → Settings → Account → Switch to Business.
2. GHL Settings → Integrations → TikTok → Connect → authorize.
3. If the option is missing, contact GHL support to enable the feature flag.
4. (Optional) Settings → Comment Automation → e.g., keyword `esmeralda` → auto-DM.

## 3.6 Phase 6 — Bot María / Conversation AI (5 h)

Inputs required from CEO (`claude-code-execution/01-bot-maria-spec.md`):

- Section A — Personality.
- Section B — Flow Instructions.
- Section C — Escalation Rules.

**6.1 Knowledge Base.** Sales & Marketing → Conversation AI → Knowledge Base → upload 6 docs:

1. `01-sobre-tierra-madre` · 2. `02-productos` · 3. `03-esmeraldas-101` · 4. `04-logistica` · 5. `05-pagos` · 6. `06-devoluciones`.

Wait ~2 min for indexing (green checkmark = ready).

**6.2 Create Agent "María".** Conversation AI → Agents → Create Agent:

- Name: **María** · Role: Sales Assistant · Language: **Spanish (Colombia)** · KB: **Tierra Madre KB**.
- Paste Section A as the Personality / system prompt (replace variables).
- Paste Section B as Flow Instructions.
- Paste Section C as Escalation Rules.
- Settings: auto-respond on WA / IG / TT / SMS / Email / Web Chat. Response delay 5–10 s. Working hours 24/7. Stop AI after handoff = ON. Resume after 30 min if human silent.
- Save → toggle **Active = ON**.

**6.3 Sandbox tests (Test Chat).** Do not advance until **all 5 pass**:

1. `"Hola, vi sus joyas y me interesan"` → greets + qualification starts.
2. `"Quiero topitos de esmeralda para mi mamá, presupuesto 700k"` → captures `tipo_interes=topito`, `presupuesto=700000`, `ocasion=regalo`.
3. `"Busco esmeralda como inversión, tengo 15 millones"` → escalates to **Agente Inversión** (inversion + > 5M).
4. `"Estoy muy molesto, mi pedido no ha llegado"` → negative sentiment → **Agente Senior**.
5. `"No quiero hablar con un bot"` → "Por supuesto" + handoff to **Agente Regular**.

## 3.7 Phase 7 — 13 Workflows (8 h)

Build order (see [§9](#9-the-13-workflows-wf-01wf-13) for full specs):

| Day | Workflows    | Theme                               |
| --- | ------------ | ----------------------------------- |
| 1   | WF-01, WF-03 | Basics: new contact + qualification |
| 2   | WF-02, WF-07 | Ambassadors: detect + 5-min rule    |
| 3   | WF-04, WF-05 | Catalog search + cart/checkout      |
| 4   | WF-06, WF-11 | Escalation + smart routing          |
| 5   | WF-08, WF-09 | Post-venta + re-engagement          |
| 6   | WF-10, WF-12 | Events RSVP + auto-invite           |
| 7   | WF-13        | Daily ambassador scoring cron       |

For each: Automation → Workflows → Create → add Trigger → add Actions → Save → toggle **Active = ON** → Test with a synthetic contact → check logs.

## 3.8 Phase 8 — WhatsApp Templates (4 h + 24–48 h Meta approval per template)

Source list lives in `claude-code-execution/06-whatsapp-templates.md` (30+ templates).

For each: `business.facebook.com` → Tierra Madre → WhatsApp Manager → Message Templates → Create Template.

- Category: `MARKETING` (promos), `UTILITY` (confirmations), `AUTHENTICATION` (OTPs).
- Language: **Español (Colombia)** (`es_CO`).
- Name: exact snake_case from the file (e.g., `saludo_inicial_wa`).
- Body: paste verbatim, variables `{{1}}`, `{{2}}`, …
- Sample variables: realistic examples (Meta rejects unrealistic ones).
- Buttons: per the source.
- Submit → wait 24–48 h.

**Priority order:**

- **Week 1 — High:** `WA-01`, `IG-01`, `TT-01`, `CK-01`, `CK-03`, `ES-01`, `PV-02`, `PV-03`.
- **Week 2 — Medium:** `Q-01..Q-04`, `P-01`, `EV-01`, `EV-02`, `EM-01`, `EM-02`.
- **Later — Low:** `R-01..R-04`, `PR-01..PR-04`, etc.

After approval, templates auto-sync to GHL Conversations → Templates. If not, GHL Settings → WhatsApp → Sync Templates.

## 3.9 Phase 9 — Agentes + Auto-Assignment (2 h)

**Create users.** Settings → My Staff → Add Employee, for each agent:

- First/Last name · corporate email · phone · User Type: **User** · Role: **Agent / Sales**.
- Permissions: Conversations (R+W), Opportunities (R+W), Contacts (R+W).
- Save → activation email goes out.

**Apply pool tag.** Edit each agent → Tags:

- Senior luxury closer → `agente-premium`.
- Certified gemologist → `agente-inversion`.
- Experienced closer → `agente-senior`.
- Catalog expert → `agente-regular`.

**Auto-Assignment Rules** (Settings → Conversations → Auto-Assignment):

| Rule              | Trigger                                   | Pool                           | SLA    |
| ----------------- | ----------------------------------------- | ------------------------------ | ------ |
| Premium           | conversation has tag `lead-vip`           | round-robin `agente-premium`   | 10 min |
| Inversión         | tag `lead-inversion`                      | round-robin `agente-inversion` | 5 min  |
| Senior            | tag `queja` OR `urgencia` OR `devolucion` | round-robin `agente-senior`    | 2 min  |
| Regular (default) | tag `pide-humano` (no match above)        | round-robin `agente-regular`   | 15 min |

**SLA Escalation.** Settings → SLA Rules → per pool: if no response within SLA × 2 → reassign next agent + notify supervisor.

## 3.10 Phase 10 — QA (3 h)

Test the 9 end-to-end scenarios in [§10](#10-acceptance--9-qa-scenarios) with real conversations from external accounts. Don't rely on the Test Chat sandbox alone.

↪ Source: `manual-ghl-paso-a-paso.html`, `area-3-gohighlevel.html`

---

# 4. Area 2 — Supabase Backend

## 4.1 Project setup

1. Create project at `supabase.com` (no specific region called out by the HTMLs; pick the closest to CO).
2. Install CLI: `npm install -g supabase` → `supabase login` → `supabase link --project-ref XXXXX`.
3. Apply schema: `supabase db push`.

## 4.2 Tables (14 main + supporting)

| #   | Table                  | Key columns                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **contacts**           | `celular UNIQUE`, `instagram_handle`, `email`, `full_name`, `ciudad`, `presupuesto_declarado_cop`, `tipo_interes`, `conocimiento_esmeraldas`, `canal_origen`, `ambassador_id`, `agent_assigned`, `lead_score`, `total_comprado_cop`, `ultima_compra_fecha`, `eventos_presenciales`, `eventos_virtuales`, `cumpleanios`, `aniversario_compra`, `ghl_contact_id`, `tags[]`, `custom_fields jsonb`   |
| 2   | **products**           | `sku UNIQUE`, `nombre`, `slug UNIQUE`, `descripcion`, `descripcion_corta`, `precio_cop`, `precio_anterior_cop`, `categoria`, `tipo_gema`, `ocasion[]`, `keywords[]`, `rango_precio`, `certificado_url`, `video_url`, `stock`, `destacado`, `activo`, `search_vector`                                                                                                                              |
| 3   | **product_images**     | `product_id FK`, `url`, `alt`, `is_primary`, `is_360`, `position`                                                                                                                                                                                                                                                                                                                                 |
| 4   | **orders**             | `contact_id`, `ambassador_id`, `agent_id`, `status` (`pending`/`paid`/`shipped`/`delivered`/`cancelled`/`refunded`), `total_cop`, `discount_cop`, `promotion_code`, `shipping_cop`, `mp_preference_id`, `mp_payment_id`, `mp_status`, `paid_at`, `shipped_at`, `delivered_at`, `tracking_code`, `shipping_address jsonb`, `notes`                                                                 |
| 5   | **order_items**        | `order_id`, `product_id`, `quantity`, `unit_price_cop`, `subtotal_cop`                                                                                                                                                                                                                                                                                                                            |
| 6   | **ambassadors**        | `user_id FK auth.users`, `full_name`, `celular`, `email UNIQUE`, `instagram_handle`, `ciudad`, `slug UNIQUE`, `avatar_url`, `nivel` (`bronce`/`plata`/`oro`/`diamante`), `score`, `comision_percent`, `total_ventas_lifetime_cop`, `ventas_mes_actual_cop`, `status` (`invited`/`active`/`paused`/`suspended`/`archived`), `referido_por` (self-FK), `fecha_ingreso`, `fecha_activacion`, `notas` |
| 7   | **ambassador_leads**   | `ambassador_id`, `contact_id`, `celular`, `instagram_handle`, `email`, `full_name`, `ciudad`, `tipo_interes_inicial`, `presupuesto_estimado`, `notas`, `status` (`pendiente`/`contactado`/`calificado`/`vendido`/`perdido`)                                                                                                                                                                       |
| 8   | **agents**             | `user_id`, `full_name`, `email UNIQUE`, `celular`, `avatar_url`, `pool` (`premium`/`inversion`/`senior`/`regular`), `especialidades[]`, `comision_percent`, `salario_base_cop`, `capacity_max`, `schedule jsonb`, `status`, `fecha_ingreso`, `fecha_activacion`, `notas`                                                                                                                          |
| 9   | **events**             | `name`, `slug UNIQUE`, `tipo` (`presencial`/`virtual`), `ciudad`, `zoom_link`, `fecha`, `capacidad_maxima`, `audience_filters jsonb`, `status` (`draft`/`published`/`ongoing`/`finished`), `created_by`                                                                                                                                                                                           |
| 10  | **event_attendees**    | `event_id`, `contact_id`, `status` (`invited`/`confirmed`/`attended`/`no-show`), `qr_code UNIQUE`, `check_in_at`                                                                                                                                                                                                                                                                                  |
| 11  | **promotions**         | `name`, `type` (`percent`/`amount`/`2x1`/`gift`), `value`, `audience_filters jsonb`, `starts_at`, `expires_at`, `max_uses_per_person`, `max_total_uses`, `total_uses`, `message_template`, `channel`, `status`, `event_id`, `created_by`                                                                                                                                                          |
| 12  | **promotion_products** | `promotion_id`, `product_id` (composite PK)                                                                                                                                                                                                                                                                                                                                                       |
| 13  | **promotion_codes**    | `promotion_id`, `contact_id`, `code UNIQUE`, `used`, `used_at`, `order_id`                                                                                                                                                                                                                                                                                                                        |
| 14  | **commissions**        | `ambassador_id`, `order_id`, `amount_cop`, `percent_applied`, `status` (`pending`/`approved`/`paid`), `approved_at`, `paid_at`, `paid_by`, `notes`                                                                                                                                                                                                                                                |

Supporting tables: **testimonials**, **message_templates** (`code`, `category`, `channel`, `name`, `body`, `variables[]`, `meta_approved`, `meta_template_id`), **hot_leads** (`contact_id UNIQUE`, `signals jsonb`, `score`, `detected_at`, `agent_notified_id`, `resolved`).

## 4.3 Roles (Auth) — 5

| Role          | Scope                                      |
| ------------- | ------------------------------------------ |
| `super_admin` | Everything                                 |
| `admin`       | Operations (not config / commissions)      |
| `marketing`   | Products, testimonials, templates, content |
| `agente`      | Own dashboard, own orders, own chats       |
| `embajador`   | Own leads, own commissions, own profile    |

Auth = Supabase magic link.

## 4.4 RLS — illustrative policies

```sql
-- products: public read when activo
alter table products enable row level security;
create policy "public reads active products"
  on products for select using (activo = true);

-- orders: contact sees own; agent sees assigned; admin sees all (service_role bypasses)
alter table orders enable row level security;
-- (policies per role)

-- ambassador_leads: embajador sees own
alter table ambassador_leads enable row level security;
create policy "embajador reads own leads"
  on ambassador_leads for select
  using (exists (select 1 from ambassadors a
                 where a.id = ambassador_id and a.user_id = auth.uid()));
```

## 4.5 Storage buckets

```
products       (public, CDN)
  └── {sku}/primary.jpg
  └── {sku}/gallery-01.jpg .. gallery-NN.jpg
  └── {sku}/360/01.jpg .. 24.jpg
  └── {sku}/video.mp4

certificates   (private; signed URLs, 1 h expiry)
  └── {sku}/certificate.pdf
  └── orders/{order_id}/invoice.pdf

ambassadors    (public)
```

## 4.6 Database triggers

| Trigger                         | Fires                                                                     | Effect                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `update_updated_at`             | BEFORE UPDATE every table                                                 | sets `updated_at = now()`                                                                                         |
| `products_search_vector_update` | products INSERT/UPDATE                                                    | rebuilds `search_vector` (tsvector over `nombre`, `descripcion`, `keywords`)                                      |
| `orders_paid_trigger`           | orders.status → `paid`                                                    | sum into `contacts.total_comprado_cop`; set `ultima_compra_fecha`; insert into `commissions`; recalc `lead_score` |
| `ambassador_leads_match`        | ambassador_leads INSERT                                                   | look up contact by celular/IG/email; if found and no ambassador → assign                                          |
| `event_attended`                | event_attendees.status → `attended`                                       | increment `eventos_presenciales` or `eventos_virtuales`                                                           |
| `testimonials_auto_approve`     | testimonials INSERT/UPDATE where `rating >= 4.5` and `authorized_publish` | auto-set `status = approved`                                                                                      |

## 4.7 Edge Functions (10)

```
supabase/functions/
  search-products/index.ts
  create-order/index.ts
  mp-webhook/index.ts                ← also exists in Workers; in Supabase used as fallback/extension
  send-promo/index.ts
  calculate-ambassador-score/index.ts
  auto-event-invite/index.ts
  hot-lead-detector/index.ts
  ghl-sync/index.ts
  invite-ambassador/index.ts
  invite-agent/index.ts
```

Each: TypeScript + Deno, CORS handler, zod validation, `SERVICE_ROLE_KEY` client, structured logging, Vitest tests (happy path + validation + error). Deploy with `supabase functions deploy <name>`.

### Function contracts (HTML-sourced)

- **search-products** — Input `{intent, presupuesto, ocasion, ciudad}` → Output `{productos: [...3]}` ranked by intent+budget.
- **create-order** — Input `{contact, items, shipping}` → Output `{order_id, mp_url}`. Calls MP `/checkout/preferences`.
- **mp-webhook** — receives MP webhook, validates HMAC, sets order to `paid`, triggers GHL workflow WF-08.
- **send-promo** — filters by `audience_filters`, generates unique codes, sends via GHL channel.
- **calculate-ambassador-score** — daily cron; recalcs score; updates `nivel`; sends EM-03 (level UP) / EM-04 (level DOWN).
- **auto-event-invite** — filters contacts by `audience_filters`, sends invites by `canal_preferido`, tags `evento-{slug}-invitado`.
- **hot-lead-detector** — every 15 min; flags contacts with ≥ 4 signals + score > 60.
- **ghl-sync** — bidirectional: Supabase contact change → GHL; GHL webhook → Supabase upsert.
- **invite-ambassador** — full onboarding orchestration (see §5.4.2 below).
- **invite-agent** — same as ambassador but with agent fields (pool, schedule, capacity).

## 4.8 Seed data

`supabase/seed.sql` ships: 20 sample products (mixed categories) · 5 ambassadors at various levels · 3 events (1 past presencial + 1 future virtual + 1 future presencial) · 10 test contacts with different scores · 5 historical paid orders.

↪ Source: `area-2-supabase.html`, `manual-desarrollo-tecnico.html` Sprint 2

---

# 5. Area 1 — Frontend (6 Sprints · 8 weeks)

## 5.1 Sprint 1 — Cimientos (Week 1)

1. `npm create vite@latest web -- --template react-ts`.
2. Install runtime deps:

```bash
npm install react-router-dom @supabase/supabase-js \
  @tanstack/react-query zustand framer-motion \
  react-hook-form @hookform/resolvers zod \
  lucide-react clsx tailwind-merge \
  date-fns recharts @tanstack/react-table \
  embla-carousel-react react-dropzone \
  @mercadopago/sdk-react
```

3. Install dev deps:

```bash
npm install -D tailwindcss@next @tailwindcss/vite \
  @types/node vitest @playwright/test \
  eslint prettier husky lint-staged
```

4. Configure Tailwind 4 + globals.css (Inter + Playfair Display) + dark mode.
5. Vercel: connect GitHub repo, auto-deploy on push.
6. Cloudflare: `npm install -g wrangler` + `wrangler login`.

**Sprint 1 success:** `npm run dev` works, Supabase has schema, env vars set, Vercel preview deploys.

## 5.2 Sprint 3 — Public Site (Weeks 4–5)

**Layout & helpers.** `src/lib/supabase.ts`, `src/lib/types.ts` (TS interfaces for every table), `src/lib/utils.ts` (`cn`, `formatCOP`, `slugify`), `src/App.tsx` (React Router 7 + lazy routes), `src/components/layout/{Header,Footer,MobileMenu}.tsx` (animated), `src/components/animations/{FadeIn,StaggerChildren,PageTransition}.tsx`, `src/store/cartStore.ts` (Zustand + localStorage persist), hooks `useCart`, `useAuth`, `useProducts`.

**Pages.**

| Route                                  | Page                                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                    | Hero (video bg + CTA), destacados, brand story (parallax), past events (Embla), testimonials, "Habla con asesor" CTA                            |
| `/catalogo`                            | Grid with sidebar filters (category chips, price slider, occasion checkboxes), debounce-300 search, infinite scroll, hover crossfade card       |
| `/producto/:slug`                      | `ProductGallery360` (24 photos from Storage), description, certificate signed URL, "Agregar al carrito" with flight animation, related products |
| `/carrito`                             | Cart page (also via `CartDrawer` slide-from-right desktop / bottom-sheet mobile)                                                                |
| `/checkout`                            | 3-step form (customer → shipping → method) with progress bar; zod validation; calls `create-order` → MP redirect                                |
| `/pedido-confirmado/:order_id`         | Polls order status until `paid`; shows tracking estimate + social CTAs                                                                          |
| `/pedido-fallido`, `/pedido-pendiente` | MP failure / pending states                                                                                                                     |

**6 Landings** (one per category):

```
src/pages/landings/
  Topitos.tsx              → /topitos
  AnillosCompromiso.tsx    → /anillos-compromiso
  Dijes.tsx                → /dijes
  GemasSueltas.tsx         → /gemas-sueltas
  Sets.tsx                 → /sets
  Inversion.tsx            → /inversion
```

Each landing has **7 sections**:

1. Hero (image + emotional headline + primary CTA).
2. Pre-qualification form (`nombre`, `celular`, `presupuesto`, `ocasion`) — react-hook-form + zod → POST to `contacts` + GHL **WF-01**.
3. Top 6–9 products from that category.
4. Category storytelling (from Area 6).
5. Category-specific testimonials.
6. FAQ accordion (5–8 Q&A).
7. Dual CTA: "Hablar con asesor" (WhatsApp pre-filled) + "Ver catálogo completo".

## 5.3 Sprint 4 — Admin Panel (Weeks 5–6)

**Auth + layout.** Magic-link login; whitelist `@tierramadre.co` or explicit list; role from JWT → redirect by role.

`src/components/admin/AdminLayout.tsx` — sidebar with 13 modules (role-gated), header (user + logout + notifications), breadcrumbs, mobile hamburger.

`src/hooks/useAuth.ts` — `login`, `logout`, `getCurrentUser`, `isRole()`, `<ProtectedRoute>`.

Protected routes:

- `/admin/*` → `super_admin | admin` (some modules also marketing).
- `/admin/personas` → `super_admin`.
- `/admin/productos` → `admin | marketing`.
- … (per role rules in Area 2).

**Dashboard (`/admin`).** 4 KPI cards (sales today/week/month vs prior · pipeline active · pending commissions · abandoned carts 24 h). Recharts: line (sales/day 30 d), pie (sales by channel), bar (top 10 products), funnel (conversion by stage). Tables: top 10 ambassadors, next 5 events, last 10 paid orders. Realtime updates. Filters: today/week/month/year/custom. Count-up animations on load.

**12 admin modules.**

| Route                 | Module                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin`              | Dashboard BI                                                                                                                                            |
| `/admin/productos`    | Products CRUD — TanStack Table, drag-drop photos to Supabase Storage, certificate PDF upload, toggles `destacado`/`activo`, bulk edit, real-time search |
| `/admin/promociones`  | Base 13 — type, audience filters, multi-channel send                                                                                                    |
| `/admin/anuncios`     | Reuses `send-promo` plumbing                                                                                                                            |
| `/admin/eventos`      | Create event + auto-segment via WF-12, QR check-in                                                                                                      |
| `/admin/embajadores`  | List, profile, edit, leads/sales/commissions per ambassador                                                                                             |
| `/admin/agentes`      | Same as embajadores, with `pool`, `schedule`, `capacity`                                                                                                |
| `/admin/ordenes`      | All orders + status actions                                                                                                                             |
| `/admin/comisiones`   | Pending / approve in bulk / export / pay (D3)                                                                                                           |
| `/admin/plantillas`   | 30+ templates with Meta status mirror                                                                                                                   |
| `/admin/testimonios`  | Approve/reject; auto-post to IG Stories on approve                                                                                                      |
| `/admin/contenido`    | CMS-lite for landing copy                                                                                                                               |
| `/admin/config`       | Hours, % commissions, global settings                                                                                                                   |
| **`/admin/personas`** | Hub for embajadores + agentes (critical)                                                                                                                |

**Personas module — sub-routes:**

```
/admin/personas/embajadores            (list)
/admin/personas/embajadores/nuevo      (form)
/admin/personas/embajadores/:id        (profile)
/admin/personas/embajadores/:id/editar
/admin/personas/embajadores/:id/leads
/admin/personas/embajadores/:id/comisiones
(same set under /agentes)
```

**Personas onboarding flow** (`invite-ambassador` Edge Function):

1. Validate email not exists.
2. Generate slug (`nombre-kebab-4chars`).
3. `INSERT ambassadors` with `status = 'invited'`.
4. Create Auth user with role `embajador`; magic link invite via Supabase Auth.
5. Create Storage folder `ambassadors/{id}/`.
6. POST to GHL: add tag `embajador-{slug}`.
7. Send welcome email via Resend (template with `form_url` + `dashboard_url`).
8. Return `{ id, slug, form_url, dashboard_url }`.

## 5.4 Sprint 4 — Embajador Portal

Magic-link login (role = `embajador` only). Premium "exclusive club" design.

| Route                    | Page                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `/embajador`             | Dashboard — score + bar to next level, this month's commission, top-10 leaderboard, coaching tips |
| `/embajador/leads`       | Table — status, score, last activity, filters + search                                            |
| `/embajador/leads/nuevo` | Single + CSV upload — POST → trigger WF-06 (`match-ambassador`)                                   |
| `/embajador/comisiones`  | Pending vs paid, per-sale detail, monthly history                                                 |
| `/embajador/kit`         | Photo gallery, message templates, short videos, downloads                                         |
| `/embajador/:slug/leads` | Public shareable lead-capture page                                                                |

## 5.5 Sprint 2 — Backend (Weeks 2–3)

This sprint is the work captured in [§4](#4-area-2--supabase-backend): RLS migrations, triggers, 10 Edge Functions, seeds.

## 5.6 Sprint 5 — Integrations

Covered in [§6](#6-area-4--integrations-4-cloudflare-workers).

## 5.7 Sprint 6 — QA + Deploy (Weeks 7–8)

**Playwright E2E tests** in `apps/web/tests/e2e/`:

- `compra-completa.spec.ts` — catalog → filter → product → cart → checkout → MP test card → confirmation.
- `landing-pre-calificacion.spec.ts` — `/topitos` form → contact in Supabase.
- `admin-crear-producto.spec.ts` — login admin → `/admin/productos/nuevo` → form + photo → save → verify `/catalogo`.
- `admin-crear-embajador.spec.ts` — login super_admin → create ambassador → verify email + Supabase + GHL tag (mock).
- `embajador-portal.spec.ts` — login ambassador → dashboard → load lead → see commissions.

CI: GitHub Actions runs all on every PR.

**Performance.** Lazy load all routes; image `loading="lazy"` + width/height + Supabase `?width=800&quality=80`; code splitting; preload Inter + Playfair Display fonts; optional Service Worker.
Target: **Lighthouse Performance > 90, SEO 100, A11y > 90.**

**SEO.** Meta + Open Graph per page; `application/ld+json` Product schema; dynamic `sitemap.xml`; `robots.txt`; canonical URLs.

**Deploy.** Custom domain in Vercel; SSL auto; production env vars (separate from dev); Workers production secrets; **Supabase Pro ($25/mo)**; MP test → production credentials; Sentry (errors); Vercel Analytics.

↪ Source: `area-1-frontend.html`, `manual-desarrollo-tecnico.html` Sprints 1–6

---

# 6. Area 4 — Integrations (4 Cloudflare Workers)

## 6.1 Setup

```bash
mkdir tierramadre-workers && cd tierramadre-workers
npm install -g wrangler
wrangler login
wrangler init mp-webhook
wrangler init ghl-bridge
wrangler init order-orchestrator
wrangler init scheduler
npm install hono           # routing
```

## 6.2 The 4 Workers

| #   | Worker                 | URL                                 | Direction                    | Job                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ---------------------- | ----------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **mp-webhook**         | `wh.tierramadre.workers.dev/mp`     | MP → Worker → Supabase + GHL | HMAC-SHA256 on `x-signature` (`ts=..., v1=...`) + `x-request-id` + `data.id`. Events: `payment.created/updated/approved`, `merchant_order`. Flow: `GET /v1/payments/{id}` → `PATCH /rest/v1/orders` (`status=paid`, `mp_payment_id`, `paid_at`) → search GHL contact → `PUT contact` (`customField total_comprado_cop`, `ultima_compra_fecha`, tag `cliente-pago-confirmado`) → `POST /workflows/{WF_POSTVENTA_ID}/subscriptions`. |
| 2   | **ghl-bridge**         | `wh.tierramadre.workers.dev/ghl`    | GHL → Worker → Supabase      | Webhook events: `ContactCreate`, `ContactUpdate`, `InboundMessage`. Bidirectional sync via field mapping + upsert.                                                                                                                                                                                                                                                                                                                 |
| 3   | **order-orchestrator** | `api.tierramadre.workers.dev/order` | Frontend/Bot → Worker → MP   | Endpoints: `POST /create` (validates items → INSERT Supabase → `POST /checkout/preferences` → returns `init_point`), `GET /:id` (status), `POST /:id/cancel`. Preference payload: `items`, `payer (email, phone)`, `back_urls (success/failure/pending)`, `auto_return: approved`, `external_reference = order_id`, `payment_methods.installments = 12`.                                                                           |
| 4   | **scheduler**          | cron only (no public URL)           | Cron → Edge Functions        | `*/15 * * * *` → `hot-lead-detector`; `0 0 * * *` → `calculate-ambassador-score`; `0 9 * * *` → event reminders; `0 18 * * *` → abandoned-cart.                                                                                                                                                                                                                                                                                    |

## 6.3 Secrets

```bash
wrangler secret put MP_TOKEN            # MP_ACCESS_TOKEN
wrangler secret put MP_SECRET           # MP_WEBHOOK_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put GHL_TOKEN
wrangler secret put GHL_LOCATION_ID
wrangler secret put WF_POSTVENTA_ID
wrangler deploy
```

## 6.4 Mercado Pago configuration

- MP Dashboard → Settings → Webhooks → URL `https://wh.tierramadre.workers.dev/mp`.
- Events: `payment`, `merchant_order`.
- Keep separate TEST and PROD credentials; test with MP test card before going live.

## 6.5 GHL configuration (after Phase 1–4)

- GHL Settings → Integrations → Webhooks → URL `https://wh.tierramadre.workers.dev/ghl`.
- Events: `ContactCreate`, `ContactUpdate`, `InboundMessage`, `OpportunityStageChanged`.

## 6.6 Acceptance checklist (14 items, from area-4)

- Health check 200 OK on all Worker public routes.
- Secrets configured.
- MP account verified, credentials valid.
- HMAC validation rejects forged requests.
- GHL bidirectional sync verified with a test contact.
- Order creation: cart → MP preference → `init_point` returned.
- 4 cron jobs visible firing in `wrangler tail`.
- Vitest tests passing.
- Logs collected (Workers → tail or external sink).

↪ Source: `area-4-integraciones.html`, `manual-desarrollo-tecnico.html` Sprint 5

---

# 7. Area 5 — Design System

## 7.1 Palette (locked)

**Esmeralda (primary)**

| Token         | Hex       |
| ------------- | --------- |
| `emerald-50`  | `#ecfdf5` |
| `emerald-100` | `#d1fae5` |
| `emerald-200` | `#a7f3d0` |
| `emerald-300` | `#6ee7b7` |
| `emerald-400` | `#34d399` |
| `emerald-500` | `#10b981` |
| `emerald-600` | `#059669` |
| `emerald-700` | `#047857` |
| `emerald-800` | `#065f46` |
| `emerald-900` | `#064e3b` |

**Oro (accent — lujo, never wide backgrounds)**

| Token      | Hex       |
| ---------- | --------- |
| `gold-100` | `#fef3c7` |
| `gold-200` | `#fde68a` |
| `gold-300` | `#fcd34d` |
| `gold-400` | `#fbbf24` |
| `gold-500` | `#f59e0b` |
| `gold-600` | `#d97706` |
| `gold-700` | `#b45309` |
| `gold-800` | `#92400e` |

**Tinta (dark backgrounds)**

| Token     | Hex       |
| --------- | --------- |
| `ink-700` | `#162320` |
| `ink-800` | `#0f1714` |
| `ink-900` | `#0a0f0d` |
| `ink-950` | `#050807` |

## 7.2 Typography

- **Playfair Display** (serif) — H1/H2, citas, headlines emocionales. Weights: 400, 700, 900.
- **Inter** (sans) — H3+, body, UI, numbers. Weights: 300–900.
- **JetBrains Mono** — code.

**Fluid scale (clamp):**

| Token  | rem                        | px   |
| ------ | -------------------------- | ---- |
| `2xs`  | 0.6875                     | 11   |
| `xs`   | 0.78                       | 12.5 |
| `sm`   | 0.875                      | 14   |
| `base` | 1                          | 16   |
| `lg`   | 1.125                      | 18   |
| `xl`   | 1.25                       | 20   |
| `2xl`  | 1.5                        | 24   |
| `3xl`  | 1.875                      | 30   |
| `4xl`  | 2.25                       | 36   |
| `5xl`  | 3                          | 48   |
| `6xl`  | 3.75                       | 60   |
| `7xl`  | 4.5                        | 72   |
| `hero` | `clamp(2.5rem, 7vw, 5rem)` | —    |

## 7.3 Spacing — 8 pt grid

Allowed values: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px`.

## 7.4 Breakpoints

`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Mobile-first.

## 7.5 Animation presets (`src/lib/animations.ts`)

```ts
export const easings = {
  smooth: [0.22, 1, 0.36, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  spring: { stiffness: 200, damping: 25 },
};

export const durations = { fast: 0.3, base: 0.6, slow: 1.2 };

export const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.6, ease: easings.smooth },
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: easings.smooth },
};
```

Also: `cardHoverLift` (CSS `translateY(-4px)` + glow shadow), `flyToCart` (`layoutId` spring), `scrollReveal` (`whileInView`, `margin: '-50px'`, `once: true`).

## 7.6 18 components

`Button, Input, Select, Checkbox/Radio, Toggle, Card, ProductCard, Modal/Dialog, Drawer, Toast, Tabs, Accordion, Badge/Chip, Avatar, Skeleton, Progress, Tooltip, DataTable`.

## 7.7 Accessibility (WCAG AA)

- Contrast 4.5:1 normal text, 3:1 large.
- Focus visible on every interactive.
- Alt text + aria-labels.
- 100 % keyboard navigation.
- Tap targets ≥ 44 × 44 px.
- Respect `prefers-reduced-motion`.

## 7.8 Deliverables

- Figma file **"Tierra Madre Design System"**.
- `tailwind.config.ts` with custom tokens.
- `src/styles/globals.css` with CSS variables.
- Animation variants document.
- Iconography guide (Lucide + custom SVGs).
- Mockups: 6 landings, home, product, responsive.
- Product photography guide.

↪ Source: `area-5-diseno-ux.html`

---

# 8. Area 6 — Content & Catalog

## 8.1 Targets

- 30–50 products at launch.
- 4+ professional photos per product.
- 10–15 products with **360° gallery (24 photos)**.
- 6–9 destacados rotated monthly.

## 8.2 Product data model (required fields)

| Field               | Notes                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `name`              | Commercial — e.g., "Topitos Esperanza · Esmeralda Muzo 0.5ct"                                      |
| `sku`               | Format `{CAT}-{NUM3}` — e.g., `TOP-001`                                                            |
| `slug`              | Auto-generated kebab-case                                                                          |
| `price_cop`         | Integer, no separators                                                                             |
| `stock`             | Keep updated                                                                                       |
| `category`          | `topito` / `anillo` / `dije` / `gema` / `set` / `otro`                                             |
| `gem_type`          | `esmeralda-muzo` / `esmeralda-coscuez` / `esmeralda-chivor` / `otra`                               |
| `occasion[]`        | `regalo` / `inversion` / `matrimonio` / `diario` / `evento-especial` / `aniversario`               |
| `price_range`       | `100k-500k` / `500k-1M` / `1M-3M` / `3M+`                                                          |
| `featured`          | Top 6–9 only                                                                                       |
| `active`            | ON when ready                                                                                      |
| `description_short` | **140 chars** — `[Emoción] + [Característica clave] + [Beneficio implícito]`                       |
| `description_long`  | **~800 chars** — 3 paragraphs (emoción 200 + técnico 350 + promesa TM 250)                         |
| `keywords`          | **8–20 tags across 6 dimensions** (type / material / occasion / audience / range / unique feature) |
| `certificate_url`   | PDF in `certificates/{SKU}/`                                                                       |

## 8.3 Photography specs

**4 essential shots per product:**

| #   | Shot                     | Specs                                 |
| --- | ------------------------ | ------------------------------------- |
| 1   | Primary 3/4 view         | 2000 × 2000 px JPG q90, white/gray bg |
| 2   | Detail macro             | 2000 × 2000 px JPG q90                |
| 3   | Context (model / styled) | 2400 × 1800 px                        |
| 4   | Packaging / unboxing     | —                                     |

**360° gallery** (destacados): 24 photos, 15° rotations, same lighting and framing, 1500 × 1500 px JPG q80 (~150 KB each), stored at `products/{SKU}/360/01.jpg .. 24.jpg`.

**Post-prod:** white balance, dust removal, **no oversaturation of green**, export sRGB.

**Setup minimum:** iPhone 13+ or DSLR, 50 mm equivalent, two softboxes at 45° or large indirect window, curved white cardboard, tripod, white reflectors.

## 8.4 Copy templates

**Short description (140 chars) — examples:**

- `"Topitos en oro 18k con esmeralda Muzo · La elegancia diaria que se vuelve recuerdo eterno."`
- `"Anillo de compromiso con esmeralda Coscuez 1.2ct · Para un sí que pesa en el alma."`
- `"Dije corazón verde · Lleva un pedazo de Colombia cerca del tuyo."`

**Long description (~800 chars)** — 3 paragraphs: emotion (200) · technical (350) · TM promise (250).

## 8.5 Brand voice

✓ Warm poetic tone (not cheesy) · short sentences · metaphors (Colombia, nature, eternity) · tutear · "nuestra" · vocabulary: alma, raíz, esencia, eterno, único, herencia.
✗ SUSTAINED CAPS · emoji avalanches · empty adjectives ("increíble") · unexplained jargon · "usted" · unmeasurable claims.

## 8.6 Keywords (6 dimensions per product)

1. Type variations — `topito`, `arete pequeño`, `aretito`, `aretes diarios`.
2. Material + gem — `oro 18k`, `esmeralda muzo`, `esmeralda colombiana`.
3. Occasion — `regalo`, `cumpleaños`, `aniversario`, `para mamá`.
4. Audience — `para mujer joven`, `para novia`, `para inversionista`.
5. Range / level — `asequible`, `lujo accesible`, `premium`, `inversión`.
6. Unique feature (optional) — `engaste invisible`, `edición limitada`, `hecho a mano`.

Example (ANI-007): 14 keywords spanning all 6 dimensions.

## 8.7 SEO

**Top intent keywords (CO):** `esmeralda colombiana precio`, `anillo de compromiso esmeralda`, `topitos esmeralda`, `joyas esmeralda bogotá`, `comprar esmeralda`.

**Per-product meta tags:**

```html
<title>{nombre} | Tierra Madre Esmeraldas</title>
<meta
  name="description"
  content="{descripcion_corta} · {precio} COP · Envío 24h"
/>
<meta property="og:title" content="{nombre}" />
<meta property="og:image" content="{foto_primary}" />
<meta property="og:type" content="product" />

<script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "{nombre}",
    "image": "{foto}",
    "description": "{descripcion_larga}",
    "brand": "Tierra Madre",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "COP",
      "price": "{precio_cop}",
      "availability": "https://schema.org/InStock"
    }
  }
</script>
```

## 8.8 7-step loading protocol (max 30 min per product)

1. Photograph (4 + optional 24-shot 360).
2. Basic data (name, SKU, slug, price, stock).
3. Categorization (category, gem type, occasion, range, featured, active).
4. Write short + long descriptions per templates.
5. Add 8–20 keywords across 6 dimensions.
6. Upload certificate PDF to `certificates/{SKU}/`.
7. Verify + publish (mobile + desktop preview, bot search test, mark active / featured).

## 8.9 Other content deliverables

- 6 landing-page texts (storytelling per category).
- 15-question FAQ.
- Brand voice manual.
- 3-month editorial calendar.

↪ Source: `area-6-contenido-catalogo.html`

---

# 9. The 13 Workflows (WF-01..WF-13)

> Built by GHL Configurator in Phase 7. Edge Functions and Workers must be live so the Custom Webhook + Save Response steps work.

| ID        | Name                        | Trigger                                              | Key actions                                                                                                                                                                                                  |
| --------- | --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **WF-01** | Nuevo contacto multi-canal  | `Contact Created` OR `Inbound Message`               | Check duplicate; create if new; tag canal; send `WA-01`/`IG-01`/`TT-01`; dispatch WF-02                                                                                                                      |
| **WF-02** | Verificar embajador         | Called by WF-01                                      | `POST /match-ambassador` (Supabase) → if hit: set `embajador_asignado`, notify `EM-01`, sleep 5 min; if no response → WF-03                                                                                  |
| **WF-03** | Calificación con IA         | Called by WF-01 (no ambassador)                      | Activate Sales Bot María; 4 questions (`tipo`, `presupuesto`, `ocasión`, `conocimiento`); update fields; trigger WF-04; move stage                                                                           |
| **WF-04** | Búsqueda en catálogo        | Custom event `qualification_complete`                | `POST /search-products` → IA formats message with photos / prices / links; send via channel; move stage                                                                                                      |
| **WF-05** | Envío carrito + checkout    | Keyword `"lo quiero"` OR `"cómo pago"`               | `POST /create-order` → receive `mp_url` → send `CK-01`; move stage                                                                                                                                           |
| **WF-06** | Escalación a agente         | Keyword `"hablar con alguien"` OR negative sentiment | Trigger WF-11 (smart routing); pause IA; send `ES-01`; notify agent (SMS + email); move stage                                                                                                                |
| **WF-07** | Regla 5 min embajador       | Sleep timer in WF-02                                 | Check if ambassador responded; if NO: activate IA, protect commission, notify ambassador                                                                                                                     |
| **WF-08** | Post-venta                  | Webhook `payment.approved` (from `mp-webhook`)       | Update `total_comprado`, `ultima_compra`; move to "Venta Cerrada"; send `CK-03`; schedule D+1 / delivery / D+7 follow-ups; notify `EM-02` if ambassador exists                                               |
| **WF-09** | Re-engagement / lead frío   | Daily cron; > 7 d no response                        | -10 score; > 7 d → `R-03`; > 30 d → `R-04` w/ discount; > 60 d → move to "Perdido"                                                                                                                           |
| **WF-10** | Asistencia a evento         | Form submitted "Evento {name}"                       | Create/update contact; tag `evento-{slug}-rsvp`; generate QR; schedule reminders (3 d / 1 d / 2 h); post-event sequence                                                                                      |
| **WF-11** | Smart Routing (agent pools) | Called by WF-06                                      | Decision matrix: Ambassador → ambassador · Inversión + > 5M → `agente-inversion` · Urgency/complaint → `agente-senior` · Score > 81 → `agente-premium` · default → `agente-regular`; round-robin within pool |
| **WF-12** | Auto-event-invite           | Custom event `event_created`                         | `POST /auto-event-invite` → filter by `audience_filters` → send `EV-01` / `EV-02` per `canal_preferido`; tag `evento-{slug}-invitado`                                                                        |
| **WF-13** | Ambassador Scoring (cron)   | Daily 00:00                                          | `POST /calculate-ambassador-score` → if level UP: `EM-03` + update `comision_percent`; if DOWN: `EM-04` (coaching)                                                                                           |

↪ Source: `area-3-gohighlevel.html`, `manual-ghl-paso-a-paso.html` Phase 7

---

# 10. Acceptance — 9 QA Scenarios

Run with real conversations (not the Test Chat). Use external WA / IG accounts. Record pass/fail.

| #   | Scenario                                                                               | Expected outcome                                                                                                     |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | New WA customer wants topitos: `"Hola, quiero topitos de esmeralda, presupuesto 500k"` | María qualifies → calls Supabase `search-products` → shows 3 products → moves opportunity to "Producto Recomendado". |
| 2   | Ambassador lead via IG (lead pre-loaded)                                               | WF-02 detects ambassador; EM-01 fires; 5-min wait; María takes over only if no ambassador response.                  |
| 3   | Investment 15 M: `"Busco esmeralda inversión, presupuesto 15 millones"`                | María flags investment + amount, escalates to `agente-inversion`.                                                    |
| 4   | Direct purchase via landing form (when Dev is ready)                                   | Contact created in GHL; payment confirms; WF-08 fires post-venta sequence.                                           |
| 5   | Event attendance: fill event form, attend, don't buy that night                        | Reminders → check-in → next-day post-event sequence.                                                                 |
| 6   | Ambassador uploads 20 leads (when Dev is ready)                                        | All leads have `embajador_asignado`; when any contacts inbound, WF-02 picks it up.                                   |
| 7   | Abandoned cart                                                                         | 2 h later `R-01`; 24 h later `R-02` with discount.                                                                   |
| 8   | Angry customer: `"Estoy muy molesto, esto no llegó"`                                   | Negative sentiment → `agente-senior`.                                                                                |
| 9   | Create event, auto-invite Cali (when Dev is ready)                                     | WF-12 segments by city = Cali, invites per `canal_preferido`.                                                        |

↪ Source: `manual-ghl-paso-a-paso.html` Phase 10

---

# 11. Final Deliverables Checklist

## 11.1 From GHL Configurator (to CEO)

- ✅ Tierra Madre sub-account live (screenshot).
- ✅ 14 custom fields visible (screenshot).
- ✅ Pipeline with 7 stages (screenshot).
- ✅ ~48 tags created (screenshot).
- ✅ WA, IG, TikTok connected (test message proof).
- ✅ Bot María active, 5 sandbox tests passing.
- ✅ 13 workflows live and tested.
- ✅ Critical WhatsApp templates Meta-approved.
- ✅ Agent list with pool tags + 4 auto-assignment rules + SLA escalation.
- ✅ 9 QA scenarios run with pass/fail report.
- ✅ **Private Integration Token + Location ID** handed to Developer.
- ✅ Notion doc of deviations from this plan.

## 11.2 From Developer (to CEO)

- ✅ GitHub repo with all code.
- ✅ Production URL on the Tierra Madre domain.
- ✅ Admin panel URL + super_admin credentials for CEO.
- ✅ Embajador portal template URL.
- ✅ Complete technical `README.md` (setup local, env vars, tests, deploy, architecture, troubleshooting).
- ✅ Env vars documented (no secrets in git).
- ✅ E2E tests passing in CI/CD.
- ✅ Lighthouse: Performance > 90 · SEO 100 · A11y > 90.
- ✅ 4 Cloudflare Workers deployed + monitored.
- ✅ 10 Edge Functions deployed.
- ✅ MP → Supabase → GHL webhooks proven end-to-end.
- ✅ Handoff session with CEO covering admin operations.

## 11.3 From Designer (parallel)

- ✅ Figma "Tierra Madre Design System" file.
- ✅ `tailwind.config.ts` tokens + `globals.css` variables.
- ✅ Animation variants document.
- ✅ Mockups for 6 landings + home + product + responsive.

## 11.4 From Marketing/Product (parallel)

- ✅ 30–50 products loaded with complete data.
- ✅ 4+ photos each, 10–15 with 360° gallery.
- ✅ Short + long descriptions per formula.
- ✅ 8–20 keywords per product covering 6 dimensions.
- ✅ Certificates uploaded for verified gems.
- ✅ Max 9 destacados at once.
- ✅ 6 landing texts written.
- ✅ 15-question FAQ.
- ✅ Brand voice manual.
- ✅ 3-month editorial calendar.

---

## End of spec — sourced only from HTML files

If any source HTML changes, this file changes with it. The HTML files are the contract; this spec is the executable index.
