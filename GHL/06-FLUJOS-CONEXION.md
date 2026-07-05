# 06 · Flujos y conexión — cómo se comunica TODO (end-to-end)

> Cada flujo muestra exactamente qué pieza llama a cuál, con la mecánica real de GHL.
> Leyenda: 📱 canal · 🧠 GHL · 🤖 bot María (Agent Studio) · 🗄️ Supabase · 🌐 web madre · ⚡ Cloudflare · 💳 Mercado Pago · 👤 humano.

## Flujo 1 · Cliente nuevo compra (camino feliz)
1. 📱 Cliente escribe por WhatsApp/IG/TikTok → 🧠 entra al inbox unificado de GHL.
2. 🧠 (workflow WF-01, trigger "Contact Created") crea el contacto + oportunidad en "1. Nuevo Lead" + tag `lead-nuevo`.
3. 🤖 María (Agent Studio) responde: califica con su LLM + Knowledge Base (qué busca, presupuesto, ocasión).
4. 🤖 Al querer ver productos → **API Tool → 🗄️ `search-products`** (header `Authorization: Bearer INTERNAL_API_SECRET`)
   → recibe 3 productos (nombre, desc, precio, foto_url, **link a 🌐 la web**).
5. 🤖 Manda 3 mensajes (foto + desc + precio + **link**). Resuelve dudas con la KB.
6. Cliente hace clic en el **link** → 🌐 web madre (página de producto / carrito).
7. 🌐 Checkout: el cliente pone datos → 🌐 llama **🗄️ `create-order`** (gate ≤2M) → crea orden + preferencia 💳 Mercado Pago → redirige a pagar.
8. Cliente paga en 💳 → 💳 manda webhook → ⚡ `mp-webhook` (valida HMAC) → **UPDATE 🗄️ order=paid** (idempotente).
9. 🗄️ trigger T3: suma `total_comprado`, crea **comisión** (si hay embajador). ⚡ actualiza 🧠 GHL (tag pago, total) + dispara post-venta.
10. 🧠 post-venta: gracias → despachado → entregado → review D+7.
> Alto valor: si en paso 4-7 el monto >2M → 🤖 hace **Human Handover** → 👤 asesor cierra (no pasa por checkout web automático).

## Flujo 2 · El bot detecta si quien escribe es de un embajador
1. 📱 Cliente nuevo escribe → 🧠 WF-01.
2. 🤖/🧠 **API Tool/Custom Webhook → 🗄️ `match-ambassador`** con `{celular, instagram, email}`.
3. 🗄️ busca en `ambassadors`/`ambassador_leads` por los 3 IDs → responde `{matched, ambassador_id, nombre}`.
4. Si match: 🧠 setea `embajador_asignado` (custom field) + 🗄️ `contacts.ambassador_id` + notifica al 👤 embajador
   (WhatsApp EM-01) + 🤖 se **pausa 5 min** (acción "Update Conversation AI Bot and Status" → Inactive).
5. A los 5 min (workflow): ¿el embajador respondió? Sí → 👤 maneja. No → 🤖 retoma (mantiene `embajador_asignado`,
   comisión protegida; el bot se auto-despierta). No hace falta lock manual: GHL auto-duerme el bot al enviarse mensaje humano.

## Flujo 3 · Un embajador crea/agrega sus leads → el CRM se actualiza
1. 👤 Embajador entra a 🌐 `/embajador/leads/nuevo` (o su link público `/embajador/:slug/leads`) → pone los datos.
2. 🌐 INSERT en 🗄️ `ambassador_leads`.
3. 🗄️ **trigger T4**: busca el contacto por celular/IG/email; si no tiene embajador, le asigna `ambassador_id` (first-touch).
4. 🗄️ (o sync) crea/actualiza el contacto en 🧠 GHL con tag `embajador-{slug}` + `lead-precarga`.
5. 👤 El embajador ve sus leads/score/comisiones en su panel (🌐 Supabase Realtime).

## Flujo 4 · Si el cliente compra con el bot → se notifica al embajador
1. En el pago (Flujo 1, paso 9): 🗄️ trigger T3 crea la fila en `commissions` con el % del nivel del embajador.
2. 🧠 post-venta manda **EM-02** ("¡Cerraste venta! Comisión $X") por WhatsApp al 👤 embajador.
3. La comisión queda `pending` → 👤 admin la aprueba/paga desde 🌐 `/admin/comisiones`.

## Flujo 5 · El cliente requiere atención del embajador → se le envía el mensaje
1. Durante la ventana de 5 min (Flujo 2) o si el cliente pide al embajador, 🧠 notifica al 👤 embajador
   (push LeadConnector + WhatsApp EM-01) con link a la conversación.
2. 👤 responde desde el inbox de GHL. Si no responde en 5 min → 🤖 retoma; la atribución/comisión se mantiene.

## Flujo 6 · Admin manda promos / anuncios / eventos
- **Promos**: 👤 admin en 🌐 `/admin/promociones` define tipo + audiencia → 🗄️ `send-promo` filtra, genera
  **código único por contacto**, envía por canal preferido. El checkout valida el código server-side.
- **Anuncios** (broadcast sin descuento): 🌐 `/admin/anuncios` → audiencia + plantilla + canal (reusa `send-promo`).
- **Eventos**: 🌐 `/admin/eventos` "Crear Evento" → 🗄️ `auto-event-invite` segmenta y envía EV-01/EV-02 + recordatorios + QR.
- Cuidado: 🧠 GHL tiene límite **100 req/10s** → en envíos masivos, el worker/función modula el ritmo (token-bucket).

## Flujo 7 · Escalación a agente humano
1. 🤖/🧠 dispara escalación por: monto >2M, "hablar con asesor", queja, devolución, inversión >5M, score>81.
2. 🤖 **Human Handover** + 🧠 **Assign to User** (round-robin en el pool correcto) → mueve a "5. Negociación / Agente".
3. 🧠 pausa el bot, notifica al 👤 agente (push + email + SMS si urgencia). SLA por pool (2-15 min) + reasignación por timeout.

## Flujo 8 · Eventos (RSVP → asistencia → post-evento)
1. Form de evento → 🧠 WF-10: tag `evento-{slug}-rsvp` + genera QR + recordatorios (3d/1d/2h).
2. Check-in presencial → +score. Post-evento → pre-venta (PR-01) con código de promo.

---

## Tabla de "quién llama a quién" (contratos de comunicación)
| Origen | Destino | Cómo | Auth |
|---|---|---|---|
| 🤖 Agent Studio | 🗄️ search-products | API Tool (POST) | Bearer INTERNAL_API_SECRET |
| 🧠 Workflow | 🗄️ Edge Functions | Custom Webhook + Save Response | Bearer INTERNAL_API_SECRET |
| 🌐 Web | 🗄️ catálogo / create-order | supabase-js / fetch | anon key (RLS) / secret en server |
| 🌐 Web / 🗄️ | 💳 Mercado Pago | API preferencia | MP ACCESS_TOKEN (server) |
| 💳 Mercado Pago | ⚡ mp-webhook | webhook POST | HMAC (MP_SECRET) |
| ⚡ Worker | 🗄️ Supabase | PostgREST | service_role key |
| ⚡ Worker | 🧠 GHL | API v2 | pit- token + Version |
| 🗄️ ↔ 🧠 | sync de campos | trigger/webhook | un escritor por campo |
| 🧠 | 👤 equipo | Human Handover + Assign to User | round-robin |

## Reglas de oro de la comunicación (para que funcione sin errores)
1. **Un solo catálogo** (Supabase) alimenta web y bot.
2. **La compra se cierra en la web** (carrito → datos → Mercado Pago); el bot solo manda el link.
3. **Gate ≤2M en el server** (`create-order`), no solo en el prompt del bot.
4. **Idempotencia** en el webhook de pago (sin doble comisión).
5. **Auth en toda llamada** GHL→Supabase (INTERNAL_API_SECRET).
6. **Un escritor por campo** en el sync GHL↔Supabase (score→GHL, totales→Supabase).
7. **Respetar 100 req/10s** de GHL en envíos masivos.
