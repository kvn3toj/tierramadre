# 01 · GoHighLevel — guía de construcción (el cerebro)

> Location: `t3tOZBrR05jUoLqnDn4I` (white-label Progresy). Casi todo aquí es **✋ manual en la UI**
> (GHL no expone bot/workflows/canales por API). Lo de datos (contactos/oportunidades/tags) sí lo
> automatizo por API/MCP. Orden: A → F.

## A. Ya HECHO por API (🤖) — verificar
- **14 custom fields** (claves `contact.<key>`). Verificar: Settings → Custom Fields.
- **Pipeline "Ventas Tierra Madre"** con 7 etapas (id `u4MPXH2HdEFmU3vVqNdd`). Verificar: Opportunities → Pipelines.
- **48 tags**. Verificar: Settings → Tags.
- Si algo falta: correr `npm run setup:fields|setup:tags` y `npm run verify` (idempotente).

## B. ✋ Conectar canales (Settings → Integrations / Phone System)
**Esto solo lo puedes hacer tú (login/2FA con tus cuentas).** Orden recomendado:
1. **WhatsApp** (lo más importante): GHL → Settings → **WhatsApp** → conectar número vía Meta/WhatsApp
   Business API. Requiere número verificado en Meta. Confirma que WhatsApp aparezca como canal del bot
   (dropdown "Supported Channels"). *Nota: WhatsApp como canal del bot depende del plan — verificar.*
2. **Instagram + Facebook**: Settings → Integrations → conectar la página de FB + cuenta IG Business (OAuth).
3. **TikTok**: Settings → Integrations → TikTok (OAuth), si tu plan lo soporta.
4. **Web Chat**: se genera un snippet para embeber en la web madre (lo usamos en el frontend).
> Estos canales alimentan el **inbox unificado** de GHL; el bot María responde ahí.

## C. ✋ Bot María — AI Agent Studio (la decisión que tomaste)
> AI Agent Studio es **pay-per-use** — verifica que esté habilitado en tu plan (AI Employee Plus).
> Ruta: **AI Agents → Agent Studio**. El bot legacy `wMfconpBCdms3CprYrpc` queda secundario; la KB
> "Tierra Madre KB" (`OHDQ6vwrSUBsPD5rwHlK`, 6 PDFs ya cargados) se reutiliza.

Construir el agente María con estos nodos:
1. **Agente nuevo** → nombre **María** → entorno **Staging** primero (luego Production).
2. **LLM Node (personalidad/intención):** pega el contenido de `output/bot-personality.md` +
   `bot-flow-instructions.md` + `bot-escalation-rules.md` (combinados) como instrucciones del agente.
   Incluye la **regla de cierre ≤2M / humano >2M** y máx 1 emoji, tono cálido, tutea.
3. **Knowledge Base Tool Node:** conéctalo a **"Tierra Madre KB"** (los 6 docs). Así responde dudas
   de marca/productos/logística/pagos/devoluciones con la fuente correcta.
4. **API Tool Node → `search-products`:** (se configura cuando Supabase exista)
   - Método: POST · URL: `{{SUPABASE_URL}}/functions/v1/search-products`
   - Header: `Authorization: Bearer {{INTERNAL_API_SECRET}}`
   - Body: `{ "intent": {"categoria": "<lo que pidió el cliente>"}, "presupuesto": <num>, "ocasion": "<x>", "ciudad": "<x>" }`
   - Uso: el agente llama esto cuando el cliente quiere ver productos; recibe 3 productos (nombre,
     descripción, precio, foto_url, **link a la web**) y los manda con foto+desc+precio + el link.
5. **(Opcional) API Tool Node → `create-order`:** NO necesario si la compra se cierra en la web.
   El agente manda el **link de checkout de la web** (el `link` del producto). La web hace el pago.
6. **Escalación:** acción **Human Handover** cuando: monto >2M, "hablar con asesor", queja, devolución,
   inversión >5M. Asigna a un agente humano + crea tarea.
7. **Modo:** déjalo en **Suggestive** (sugiere, un humano envía) para probar; pásalo a **Auto-Pilot**
   cuando confíes (el bot se auto-duerme al enviarse un mensaje manual, no habla encima del humano).
8. Conecta el agente a los canales (WhatsApp/IG/etc.) en su configuración de despliegue.

## D. ✋ Workflows (bookkeeping / CRM / escalación)
> El flujo de productos/checkout lo hace el agente (C), NO workflows. Los workflows son para CRM.
> Guía click-por-click completa en **`../output/workflows-paso-a-paso.md`**. Resumen de cuáles armar:
- **WF-01 Nuevo contacto** (trigger "Contact Created" → Create Opportunity en "1. Nuevo Lead" + tag
  `lead-nuevo`). ← arranca por este.
- **WF-06 Escalación** (trigger "Customer Replied" + keywords → Assign to User round-robin + pausar bot
  + mover a "5. Negociación / Agente" + tag). Necesita agentes creados (E).
- **WF-09 Re-engagement** (Scheduler diario → score -10 + mensaje a lead frío → "7. Perdido"). Necesita
  plantillas Meta para los mensajes.
- **WF-10 Evento RSVP** (Form Submitted → tag + QR + recordatorios). Necesita formulario de evento.
- **Pendientes de Supabase** (embajador, post-venta, scoring): se arman con un paso **Custom Webhook**
  apuntando a las Edge Functions cuando Supabase exista.

## E. ✋ Agentes humanos + pools + routing (Settings → My Staff)
Guía detallada en **`../output/agents-setup-guide.md`**. Resumen:
1. Crear cada agente como **User** (Settings → My Staff → Add Employee): nombre, email, teléfono.
2. Asignar tag de pool: `agente-premium` / `agente-inversion` / `agente-senior` / `agente-regular` (ya creados).
3. Conversations → Settings → **Auto-Assignment**: 1 regla por pool (round-robin entre users con ese tag).
4. **SLA** por pool (Senior 2m, Inversión 5m, Premium 10m, Regular 15m) + reasignación por timeout.

## F. Cómo se comunica GHL con el resto (resumen; detalle en 06)
- **GHL → Supabase:** el agente (API tools) y workflows (Custom Webhook) llaman Edge Functions con
  `Authorization: Bearer {{INTERNAL_API_SECRET}}`.
- **Supabase/Web → GHL:** webhook de pago (vía Cloudflare) actualiza el contacto y dispara post-venta;
  o por MCP/API yo sincronizo datos.
- **Custom Values en GHL:** guarda `SUPABASE_URL` e `INTERNAL_API_SECRET` en Settings → Custom Values
  para referenciarlos como `{{custom_values.supabase_url}}` en los API tools / webhooks.

## Qué puedo hacer yo aquí (🤖)
- Operar **datos** vía API/MCP: crear contactos de prueba, mover oportunidades, poner tags, mandar
  mensajes, leer estado — para **verificar** que tus workflows/bot quedaron bien.
- Re-correr los scripts idempotentes (fields/tags/verify).
- NO puedo: crear el bot, los workflows, ni conectar canales (todo eso es ✋ tuyo en la UI).
