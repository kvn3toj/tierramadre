# 02 · Supabase — guía de construcción (backend / fuente de verdad de datos)

> Es el corazón de los datos: catálogo, órdenes, embajadores, comisiones, eventos. **🤖 Casi todo lo
> construyo yo por código** (esquema + funciones + triggers). **✋ Tú solo creas el proyecto y me das
> las llaves.** Es el siguiente desbloqueo crítico (de él dependen la web y el bot).

## ✋ Paso manual tuyo (5 min)
1. supabase.com → New Project → nombre `tierramadre`, región cercana (East US), guarda la DB password.
2. Settings → API → cópiame: **Project URL**, **anon key**, **service_role key** (secreta).
   - Las guardo en `.env` (gitignored) y como Custom Values en GHL para los API tools.

## 🤖 Lo que construyo yo (por CLI/código, confiable)

### 1. Migraciones — 17 tablas (esquema canónico, ver PLAN-MAESTRO §3.1)
- **contacts** (espejo del contacto GHL): celular unique, instagram_handle, email, full_name, ciudad,
  presupuesto_declarado_cop, tipo_interes, conocimiento_esmeraldas, canal_origen, **ambassador_id FK**,
  agent_assigned, lead_score, total_comprado_cop, ultima_compra_fecha, eventos_*, **ghl_contact_id**, tags[], custom_fields jsonb.
- **products** (catálogo): sku unique, nombre, slug unique, descripcion, descripcion_corta, **precio_cop**,
  categoria, tipo_gema, ocasion[], keywords[], rango_precio, certificado_url, video_url, **stock**,
  **es_pieza_unica bool** (esmeraldas 1-de-1), destacado, activo, search_vector (tsvector), **link** (URL en la web).
- **product_images**: product_id FK, url, alt, is_primary, is_360, position.
- **orders**: contact_id FK, ambassador_id, agent_id, status (pending/paid/shipped/delivered/cancelled/refunded),
  total_cop, discount_cop, promotion_code, shipping_cop, mp_preference_id, mp_payment_id, mp_status, paid_at, shipping_address jsonb.
- **order_items**, **ambassadors** (slug, nivel bronce/plata/oro/diamante, score, comision_percent, status,
  referido_por self-FK), **ambassador_leads**, **agents** (pool premium/inversion/senior/regular), **events**,
  **event_attendees** (qr_code), **promotions**, **promotion_products**, **promotion_codes**, **commissions**
  (UNIQUE(order_id)), **testimonials**, **message_templates**, **hot_leads**.

### 2. Triggers (PLAN-MAESTRO §3.2)
- T1 updated_at · T2 search_vector · **T3 order→paid: suma total_comprado + crea comisión (UNIQUE order_id)** ·
  **T4 ambassador_leads insert: matchea contacto y asigna ambassador_id si no tiene (first-touch)** ·
  T5 event_attendees→attended suma eventos · T6 testimonials rating≥4.5 → approved.

### 3. RLS por rol (seguridad, PLAN-MAESTRO §15.5)
- products: lectura pública si activo · orders/commissions/ambassador_leads: el embajador solo ve LO SUYO ·
  el panel usa key `authenticated`, **nunca** service_role.

### 4. Edge Functions (Deno) — las que importan ahora
- **`search-products`** (la que usa el bot): POST `{intent:{categoria}, presupuesto, ocasion, ciudad}` →
  3 productos con nombre/desc/precio/foto_url/**link a la web**. Valida `Authorization: Bearer INTERNAL_API_SECRET`.
- **`create-order`** (la usa la WEB en el checkout, no el bot): valida stock/precio/promo, **gate ≤2M**
  (rechaza >2M → handoff humano), crea orden + items, crea preferencia Mercado Pago → devuelve `{order_id, mp_url}`.
- Más adelante: `match-ambassador`, `send-promo`, `calculate-ambassador-score`, `auto-event-invite`,
  `hot-lead-detector`, `ghl-sync`, `invite-ambassador`, `invite-agent`.
- **Seguridad:** todas validan `INTERNAL_API_SECRET` (header) → nadie crea órdenes con solo la URL.

### 5. Storage
- bucket **products** (público): `products/{sku}/primary.jpg, gallery-NN.jpg, 360/01-24.jpg`.
- bucket **certificates** (privado, signed URLs): `certificates/{sku}/cert.pdf`.

### 6. Seeds (productos de ejemplo)
- Como aún no tienes catálogo, cargo **5-10 productos placeholder** (con foto/desc/precio/`link`) para que
  el flujo funcione end-to-end. Tú cargas los reales después desde el panel admin de la web.

## Cómo Supabase se comunica con el resto (detalle en 06)
- **Bot María (Agent Studio) → `search-products`** (API tool, header auth) durante la conversación.
- **Web madre → Supabase** (supabase-js): lee catálogo, y en checkout llama `create-order`.
- **Web/create-order → Mercado Pago**: genera el link de pago.
- **Mercado Pago → Cloudflare mp-webhook → Supabase** (order→paid) → trigger crea comisión → avisa a GHL.
- **Sincronía con GHL:** `contacts.ghl_contact_id` ↔ custom field `supabase_contact_id`; un solo escritor
  por campo (score → GHL; totales → Supabase).

## Qué necesito de ti para arrancar
Solo: **crea el proyecto Supabase y pásame Project URL + anon key + service_role key.** Con eso construyo
todo lo de arriba por código y lo dejo desplegado + verificado.
