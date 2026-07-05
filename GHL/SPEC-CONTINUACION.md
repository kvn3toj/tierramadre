# Spec de continuación — Área 3 Progresy / GoHighLevel

**Fecha de corte:** 28 mayo 2026
**Estado:** Fundación completa. Pendientes dependen de canales externos (Meta) o de las Áreas 2 (Supabase) y 4 (Cloudflare Workers).

---

## 0 · Cómo retomar en nuevo chat

Pegá al nuevo agente este prompt de arranque:

> "Continúo trabajando en el Área 3 de Progresy (GoHighLevel) para Tierra Madre. Lee `GHL/SPEC-CONTINUACION.md`. La fundación está lista (custom fields, pipeline, tags, custom values, 18 snippets, AI María + KB, token, calendar, brand board, 3 workflows). Necesito que avancemos en [PRIORIDAD elegida]. La sub-account ID es `t3tOZBrR05jUoLqnDn4I`."

URL base sub-account: `https://app.progresy.ai/v2/location/t3tOZBrR05jUoLqnDn4I/`

---

## 1 · Estado actual (lo que NO hay que volver a hacer)

### Datos estructurales
- **14 custom fields** con keys exactos del spec (`presupuesto_declarado`, `tipo_interes`, `conocimiento_esmeraldas`, `embajador_asignado`, `eventos_presenciales`, `eventos_virtuales`, `total_comprado_cop`, `ultima_compra_fecha`, `lead_score`, `canal_origen`, `canal_preferido`, `ciudad`, `supabase_contact_id`, `cumpleanios`)
- **Pipeline "Ventas Tierra Madre"** con 7 stages: Nuevo Lead → Calificado por IA → Producto Recomendado → Carrito Enviado → Negociación/Agente → Venta Cerrada → Perdido/Nurturing
- **48 tags** cubriendo agentes (4), ambassadors (4), canales (6), carrito (2), cliente (2), intereses (6), lead-status (8), nurturing (1), ocasiones (7), operación (4)
- **10 custom values:** Ciudades Entrega Rapida, Cuotas Minimo COP, Descuento Recovery Pct, Garantia Devolucion Dias, Hashtag Marca, MP Link Default, Marca Nombre, Marca Tagline, Seguro Envio Min COP, Web URL

### Contenido
- **18 plantillas (snippets):** WA-01, IG-01, TT-01, CK-01, CK-02, CK-03, ES-01, EM-01, EM-02, EM-03, EM-04, EV-01, EV-02, PV-01, PV-02, PV-03, R-03, R-04 — todos con merge tags reales (`{{contact.x}}`, `{{custom_values.x}}`)
- **Form "Evento Tierra Madre · RSVP"** activo

### IA y conocimiento
- **Conversation AI María** configurada con personality, goal y additional info del spec (GPT-4.1, 1638 palabras)
- **Knowledge Base "Tierra Madre KB"** con 6 PDFs procesados (sobre-tierra-madre, productos, esmeraldas-101, logística, pagos, devoluciones)
- KB conectada a María vía Knowledge Base Trigger

### Operación
- **4 usuarios en staff:** Dirección Tierra Madre, Felipe Castaño (ADMIN), Kevin Moreno (ADMIN), Sebastian Pion (ADMIN)
- **Calendar "Asesoría Tierra Madre · Esmeraldas"** activo — round-robin Felipe/Kevin/Sebastián, 30 min, L–V 8–17h
- **Brand Board "Tierra Madre · Esmeraldas con ADN de Paz"** — logo + paleta + tipografías importadas

### Integración
- **Private Integration Token** "Tierra Madre API v2 · Supabase + Workers" — 15 scopes (contacts r+w, conversations r+w, conversations/message r+w, opportunities r+w, workflows.readonly, locations/customFields.readonly, calendars r+w, calendars/events r+w, forms.readonly)
- Token: `pit-8915****-****-****-****3ac8` — pedirle al admin que lo copie del dashboard

### Workflows construidos (3 de 13)
- **WF-09 Re-engagement:** Scheduler diario 09:00 → If Tags includes `lead-frio` → Send SMS R-03 → Modify Score −10
- **WF-10 RSVP Eventos:** Form Submitted "Evento Tierra Madre · RSVP" → Add Tag `canal-evento`
- **WF-11 Smart Routing:** Contact Tag `pide-humano` added → Round-robin Felipe/Kevin (falta agregar Sebastián)

---

## 2 · Pendientes por prioridad

### PRIORIDAD A — Sin dependencias externas (atacables ya)

#### A.1 Completar lo que quedó a medias en workflows

**WF-09 — agregar branches 30d y 60d** (15 min)
1. Abrir WF-09 → en el If/Else "¿Qué tan frío está el lead?" hacer "Add Branch"
2. Branch 2 "Lead 30–60d": condición `Tags includes lead-frio AND lead_score < 50` → Send SMS R-04 → Add Tag `nurturing-mensual`
3. Branch 3 "Lead >60d": condición `Tags includes lead-frio AND lead_score < 20` → Send Email/SMS (plantilla a definir) → Move Opportunity to stage "Perdido / Nurturing"

**WF-11 — agregar Sebastián al round-robin** (1 min)
- Abrir Assign User → seleccionar Sebastian Pion además de Felipe + Kevin

**WF-11 — agregar matriz de routing completa** (45 min)
Reemplazar el Assign User simple por If/Else con 5 branches (en orden de evaluación):
1. `embajador_asignado is not empty` → Assign To User (el embajador específico via custom field lookup)
2. `tipo_interes = inversion AND presupuesto_declarado > 5000000` → Assign agente_inversion (mapear a usuario real)
3. `Tag urgencia OR Tag queja` → Assign agente_senior
4. `lead_score > 81` → Assign agente_premium
5. Default → Round-robin Felipe/Kevin/Sebastián (agente_regular)

> **Decisión de mapeo (preguntar al cliente):**
> - ¿Quién es `agente_inversion`? (sugerencia: Felipe)
> - ¿Quién es `agente_senior`? (sugerencia: Kevin)
> - ¿Quién es `agente_premium`? (sugerencia: Sebastián)
> - ¿Quién entra en el round-robin del `agente_regular`?

#### A.2 Construir WF-13 Ambassador Scoring cron (esqueleto, 5 min)

- **Nombre:** WF-13 · Ambassador Scoring cron
- **Trigger:** Scheduler — Interval Daily — At what time 00:00 (Bogotá)
- **Action 1:** Webhook (outbound) → POST a `{SUPABASE_URL}/functions/v1/calculate-ambassador-score` con header `Authorization: Bearer {SUPABASE_ANON_KEY}` (hardcodear placeholder hasta que Área 2 entregue URL real)
- **Action 2 (opcional):** Send Internal Notification a admin si la respuesta del webhook indica cambios de nivel

> El cuerpo del webhook lo procesa Supabase. WF-13 sólo dispara.

#### A.3 Manage Scoring (reglas internas, 20 min)

Settings → Manage Scoring. Crear reglas para que `lead_score` se mueva sin intervención manual:
- Email opened: +5
- Email link clicked: +10
- Form submitted: +20
- Appointment booked: +25
- SMS reply received: +15
- No reply after 7 days: −10
- Opportunity moved to Carrito Enviado: +30
- Opportunity moved to Venta Cerrada: +50

#### A.4 Email Services (10 min)

Settings → Email Services. Conectar Resend (la API key ya está en `.env` del proyecto Vercel, ver CLAUDE.md). Una vez conectado, las plantillas pueden duplicarse en versión email (sin emojis WhatsApp-style) para nurturing por correo.

#### A.5 Trigger Links (15 min)

Marketing → Trigger Links. Crear links rastreables para usar dentro de las plantillas:
- `link-catalogo` → `{{custom_values.web_url}}`
- `link-checkout` → `{{custom_values.mp_link_default}}`
- `link-evento-presencial` → URL del evento del momento
- `link-evento-virtual` → URL Zoom del evento del momento

Reemplazar URLs hardcoded en plantillas por estos trigger links para tener click-tracking.

---

### PRIORIDAD B — Activación de canales (requiere credenciales Meta/TikTok)

#### B.1 Conectar Instagram DM (30 min, prerequisito: cuenta IG Business + página Facebook)

1. Settings → Integrations → Facebook/Instagram
2. Login con Meta Business Manager (cuenta del cliente)
3. Autorizar lectura DMs + comentarios
4. Verificar que María recibe DMs (Conversations → enviar test desde otra cuenta IG)

#### B.2 Conectar Web Chat Widget (15 min)

1. Sites → Chat Widget → configurar
2. Personalizar con paleta Tierra Madre (esmeralda/oro)
3. Copiar embed code → pegar en `index.html` de tierra-madre-studio.vercel.app

#### B.3 Conectar TikTok DM (30 min, prerequisito: cuenta TikTok Business)

1. Settings → Integrations → TikTok
2. Autorizar TikTok for Business
3. Test DM

#### B.4 Conectar WhatsApp Business API (24–48h por aprobación Meta)

**Prerequisitos:**
- Cuenta Meta Business Manager con negocio verificado (documentos legales subidos)
- Número telefónico nuevo (LC Phone ~$2/mes) o existente disponible
- 30+ plantillas WhatsApp aprobadas en Meta Business (las 18 snippets que existen → versionarlas como WA templates)

**Pasos:**
1. Settings → Phone Numbers → Add WhatsApp
2. Conectar Meta Business Manager
3. Solicitar verificación de WhatsApp (24–48h)
4. Una vez aprobado: registrar las 30 plantillas en Meta Business → esperar aprobación por plantilla (24–48h cada una)

**Después de aprobación de WA, abrir WF-09 y cambiar la acción `Send SMS · R-03` por `Send WhatsApp · R-03` para usar plantilla aprobada por Meta.**

---

### PRIORIDAD C — Workflows que dependen de Áreas 2 y 4

> **Por qué bloqueados:** Estos workflows llaman a Supabase Edge Functions (`/match-ambassador`, `/search-products`, `/create-order`, `/auto-event-invite`) y/o son disparados por webhooks que pasan por el Cloudflare Worker router. Hasta que esos endpoints existan, los workflows fallan en runtime.

#### Mapa de dependencias

| Workflow | Depende de Supabase (Área 2) | Depende de Cloudflare Worker (Área 4) |
|---|---|---|
| WF-01 Nuevo contacto multi-canal | — | ✅ router de webhooks |
| WF-02 Verificar embajador | `/match-ambassador` | — |
| WF-03 Calificación con IA | — (usa Conversation AI nativa) | — |
| WF-04 Búsqueda en catálogo | `/search-products` | — |
| WF-05 Envío carrito + checkout | `/create-order` | — |
| WF-06 Escalación a agente | — | — (puede construirse) |
| WF-07 Regla 5 min embajador | — | — |
| WF-08 Post-venta | — | ✅ webhook MP `payment.approved` |
| WF-12 Auto-event-invite | `/auto-event-invite` | — |
| WF-13 Ambassador Scoring | `/calculate-ambassador-score` | — |

#### Specs ejecutables (cuando las dependencias estén listas)

**WF-01 · Nuevo contacto multi-canal**
- **Trigger:** Inbound Message (cualquier canal) OR Contact Created
- **Acciones:**
  1. Find Contact por celular/IG/email
  2. If/Else: ¿existe?
     - SI → trigger WF-07 (regla 5 min embajador)
     - NO → Create Contact + Add Tag `canal-{wa/ig/tt}` según `{{message.channel}}` → trigger WF-02 → Send plantilla WA-01/IG-01/TT-01 según canal → Move Opportunity a stage "Nuevo Lead"

**WF-02 · Verificar embajador**
- **Trigger:** Custom event "verify_ambassador" (llamado por WF-01)
- **Acciones:**
  1. Webhook → POST `{SUPABASE_URL}/functions/v1/match-ambassador` con body `{phone, email, ig_handle}`
  2. If/Else: ¿response.match?
     - SI → Update Contact Field `embajador_asignado = response.ambassador_id` → Send EM-01 al embajador por WhatsApp → Wait 5 minutes
     - NO → trigger WF-03

**WF-03 · Calificación con IA**
- **Trigger:** Custom event "qualify_lead" (llamado por WF-01 sin embajador o WF-07 timeout)
- **Acciones:**
  1. Activar Conversation AI bot (María) en este contacto
  2. (María hace las 4 preguntas y actualiza custom fields)
  3. Wait until tag `qualification_complete` se agrega
  4. trigger WF-04
  5. Move Opportunity a stage "Calificado por IA"

**WF-04 · Búsqueda en catálogo**
- **Trigger:** Custom event "qualification_complete"
- **Acciones:**
  1. Webhook → POST `{SUPABASE_URL}/functions/v1/search-products` con body `{tipo_interes, presupuesto_declarado, conocimiento_esmeraldas, ocasion_tags}`
  2. Response: array de 3 productos
  3. Send WhatsApp con fotos + precios + links de los 3 productos
  4. Move Opportunity a stage "Producto Recomendado"
  5. Add Tag `productos-mostrados`

**WF-05 · Envío de carrito + checkout**
- **Trigger:** Keyword en mensaje del cliente: "lo quiero" OR "cómo pago" OR "cómo compro"
- **Acciones:**
  1. Webhook → POST `{SUPABASE_URL}/functions/v1/create-order` con body `{contact_id, product_id}`
  2. Response: `{mp_checkout_url, order_id}`
  3. Send WhatsApp plantilla CK-01 con `{{mp_checkout_url}}`
  4. Update Contact Field con `order_id`
  5. Move Opportunity a stage "Carrito Enviado"
  6. Add Tag `carrito-enviado`

**WF-06 · Escalación a agente**
- **Trigger:** Keyword "hablar con alguien" OR "humano" OR "asesor" OR "queja" OR "problema"
- **Acciones:**
  1. Add Tag `pide-humano` (esto auto-dispara WF-11 Smart Routing)
  2. Pause Conversation AI para este contacto
  3. Send plantilla ES-01
  4. Move Opportunity a stage "Negociación / Agente"

**WF-07 · Regla 5 min embajador**
- **Trigger:** Sleep timer en WF-02 (5 min)
- **Acciones:**
  1. If/Else: ¿el embajador asignado envió algún mensaje en los últimos 5 min?
     - SI → END (deja que el embajador maneje)
     - NO → trigger WF-03 (activa IA) + Send Internal Notification al embajador "María tomó tu lead, ganas comisión igual"

**WF-08 · Post-venta**
- **Trigger:** Inbound Webhook de Mercado Pago — evento `payment.approved` (esto pasa por el Worker)
- **Acciones:**
  1. Find Contact por `order_id`
  2. Update Contact Field: `total_comprado_cop += monto`, `ultima_compra_fecha = today`
  3. Move Opportunity a stage "Venta Cerrada"
  4. Send WhatsApp plantilla CK-03 (confirmación de pago)
  5. Wait 1 day → Send PV-01 (cuidados del día 1)
  6. Wait until tag `entregado` se agrega → Send PV-02 (post-entrega)
  7. Wait 7 days desde entrega → Send PV-03 (review request)
  8. If `embajador_asignado is not empty` → Send EM-02 al embajador (comisión ganada)

**WF-12 · Auto-event-invite**
- **Trigger:** Custom event "event_created" (disparado desde admin del frontend)
- **Acciones:**
  1. Webhook → POST `{SUPABASE_URL}/functions/v1/auto-event-invite` con body `{event_slug, audience_filters}`
  2. Response: array de `contact_ids` con su `canal_preferido`
  3. Loop: para cada contacto → Send EV-01 (presencial) o EV-02 (virtual) por su `canal_preferido` → Add Tag `evento-{slug}-invitado`

---

### PRIORIDAD D — Plantillas WhatsApp para Meta Business (bloqueado hasta tener WA conectado)

Cuando WhatsApp Business esté aprobado, registrar las 18 plantillas en Meta Business Manager (formato WhatsApp Template). Recomendaciones:
- Categorizar: 4 transaccionales (CK-01, CK-03, PV-01, PV-02), 4 utility (ES-01, EM-01, EM-02, EV-01), resto marketing
- Variables: usar `{{1}}`, `{{2}}` placeholders en Meta, mapear con merge tags GHL al envío
- Aprobación: 24–48h por plantilla
- Empezar registrando las 4 más críticas (WA-01, CK-01, CK-03, ES-01) para no bloquear MVP

---

### PRIORIDAD E — Operación (no bloqueante, mejora UX)

- **Reportes nativos Progresy:** Reporting → configurar dashboards de pipeline, conversion rate, lead score distribution
- **Memberships:** zona privada para clientes recurrentes (catálogo VIP, descuentos)
- **Funnel/Site:** landing page para campañas específicas (Día de la Madre, Black Friday)

---

## 3 · Decisiones pendientes que necesita el cliente

Antes de seguir construyendo, conviene preguntar al cliente:

1. **Mapeo de agentes a roles del spec:**
   - `agente_inversion`, `agente_senior`, `agente_premium`, `agente_regular` → ¿qué usuario real de los 3 (Felipe/Kevin/Sebastián) corresponde a cada rol?
2. **Custom Values con placeholders que faltan llenar:**
   - WhatsApp Link real (`https://wa.me/57XXX...`)
   - Instagram Handle real (`@tierramadre_...`)
   - Email Equipo real (`equipo@tierramadre.co`?)
   - MP Link Default (actualmente `https://www.mercadopago.com.co/` — debe ser link específico)
3. **Timing del primer evento real** para llenar EV-01 y EV-02 (fecha, lugar, hora, link Zoom)
4. **Cuenta Meta Business Manager + número WhatsApp Business** disponibles?
5. **Acceso a Supabase y Cloudflare** del cliente para empezar Áreas 2 y 4?

---

## 4 · Archivos relacionados

- `area-3-gohighlevel.html` — spec original visual
- `01-GHL.md` — spec original markdown
- `plan-ejecucion-tierra-madre.html` — documento maestro
- `02-SUPABASE.md` y `area-2-supabase.html` — Área 2 (lo que Progresy necesita de Supabase)
- `04-INTEGRACIONES.md` y `area-4-integraciones.html` — Área 4 (Workers)
- `05-META-WHATSAPP.md` y `manual-ghl-paso-a-paso.html` — guía paso a paso

---

## 5 · Resumen ejecutivo de qué hacer primero

**Si querés avanzar sin tocar Meta ni esperar Áreas 2/4:** PRIORIDAD A (completar WF-09 con branches 30/60d, WF-11 con matriz completa, WF-13 esqueleto, Manage Scoring, Email Services, Trigger Links). Eso son ~2 horas.

**Si tenés ya las credenciales Meta del cliente:** PRIORIDAD B (conectar IG primero — más rápido, sin esperas — y Web Chat para tener canales vivos).

**Si Áreas 2 y 4 ya están en progreso:** PRIORIDAD C (construir los 9 workflows restantes con sus webhooks apuntando a los endpoints reales).

Hecho con verde esmeralda 💚
