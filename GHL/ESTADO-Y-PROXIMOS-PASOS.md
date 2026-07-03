# Progresy / GoHighLevel — Estado y próximos pasos

> Corte: **30 jun 2026**. Tras conectar MercadoPago, sincronizar el secreto interno y
> verificar canales. Sub-account: `t3tOZBrR05jUoLqnDn4I` · https://app.progresy.ai

## ✅ UPDATE 2 jul 2026 (cierre) — deploy final HECHO; cron sin-respuesta-7d EN VIVO; **María (IA) = bloqueo del embudo** con vía de salida ya investigada

> Cierre del hand-off anterior. Los dos commits locales de `feat/ghl-inactivity-scoring` ya están mergeados y
> desplegados; el cron de inactividad corre en producción. De los tres checkpoints pendientes de la entrada de
> abajo: **#1 y #3 CERRADOS, #2 sigue abierto** (publicar = WhatsApp real, requiere OK del equipo). El hilo
> caliente pasa a ser la activación de María, que **no es solo UX: bloquea el embudo en producción** (abajo).

**✅ Push + merge + deploy — HECHO.**

- Aislados **solo** los commits de GHL sobre una rama limpia desde `origin/main` (la rama de trabajo traía
  mezclado el rediseño "Quiet Emerald v2", ajeno a esto); 2 conflictos menores de cherry-pick resueltos;
  **438/438 tests + lint limpios** antes de abrir PR.
- **PR #47 mergeado a `main` (`59c5fb9`):** fix de regresión de rama + fix de forma-de-campo de
  `sin-respuesta-7d` (el bug que habría hecho que el cron nunca etiquetara a nadie, ver entrada de abajo).
- **`npx convex deploy` → `wonderful-tortoise-984` OK — el cron `sin-respuesta-7d` está EN VIVO** (07:00 UTC
  diario; confirmado explícitamente — era el único supuesto sin verificar de la entrada anterior: si el
  `dateAdded` del filtro de Conversations rastrea última-actividad o creación de la conversación).
- **PR #48 mergeado (`4a5f568`):** sincroniza `_generated/api.d.ts` para que cuadre, por convención del repo.
- **Vercel** auto-construyendo el deploy de producción final (rutina, sin acción pendiente).

**Reconciliación de los 3 checkpoints de la entrada "continuación":** #1 ✅ **CERRADO** (push/PR → PR #47) ·
#2 ⏳ **ABIERTO** (publicar WF-05 y WF-03, ambos probados y en Draft a propósito; publicar = EN VIVO = WhatsApp
real → requiere OK explícito) · #3 ✅ **CERRADO** (supuesto `dateAdded` asumido y desplegado, cron vivo).

**🚨 BLOQUEO DEL EMBUDO — María (Conversation AI) Disabled y no-Principal.** No es solo que Kevin no reciba
respuesta: **ningún** mensaje orgánico (WhatsApp/SMS/IG) se ha auto-respondido nunca. Impacto en cadena:
**WF-03 (Calificación IA) dispara con el tag `qualification_complete`, que SOLO lo agrega María** al terminar
sus 4 preguntas. Con María apagada, WF-03 nunca dispara para un cliente real (solo con tags de prueba a mano)
⇒ **el embudo calificación → catálogo → carrito funciona en pruebas, no en producción.**

- **Causa raíz:** María está **Disabled** y no es el bot Principal; un placeholder sin configurar ocupa ese
  slot y **también** está Disabled. Afecta a **las 111 conversaciones reales en espera**, no solo a Kevin.
- **Validado en el sandbox test-chat de GHL** (riesgo cero, no toca conversaciones reales) que la config de
  María responde bien. Dejado intacto ("solo sandbox").

**✅ Investigación de activación (docs oficiales HighLevel) — desbloquea la decisión SIN esperar a soporte:**

- **Auto-Pilot dispara sobre mensaje ENTRANTE, no sobre el estado "en espera".** Doc oficial: el bot "responde
  a todos los mensajes **entrantes**" del canal; espera N seg tras un inbound, agrupa y responde. ⇒ **Encender
  María NO hace un blast a las 111** que solo esperan; reacciona cuando **llega un mensaje nuevo** en una
  conversación con el bot Active. Riesgo real pero acotado: el próximo inbound de cualquiera de esas 111
  recibiría auto-respuesta.
- **Estado por-contacto:** Active / Sleep / Inactive; **`Inactive` a nivel contacto overridea el ajuste
  global.** El default por-contacto de un bot recién asignado no está documentado explícito — **pero las dos
  vías de abajo lo vuelven irrelevante.**
- **Vía A (recomendada, riesgo de envío CERO): Suggestive Mode.** María **redacta** la respuesta pero **no la
  envía**; un humano revisa, edita y manda. La doc lo recomienda literal para "probar la salida de un bot nuevo
  antes de automatizar del todo". Permite activar María sobre las 111 sin un solo envío no aprobado, y validar
  su salida real en vivo. Luego se pasa a Auto-Pilot cuando haya confianza.
- **Vía B (Auto-Pilot acotado): la acción de workflow "Update Conversation AI Bot and Status"** fija el estado
  Active/Inactive por contacto, scopeable por tag. ⇒ **SÍ se puede scopear a solo Kevin/Juan Ma/Isa** (Active
  a los 3, o Inactive a las 111) — corrige el "no hay forma de scopear Autopilot a los 3 de prueba" de la
  sesión previa.
- **Conclusión:** no hace falta esperar a soporte GHL/Progresy para ir en vivo. Suggestive Mode (todo pasa por
  revisión humana) o el workflow de scope son suficientes para desbloquear el embudo hoy con riesgo controlado.
- Fuentes: Auto-Pilot Mode · Suggestive Mode · Bot Status for Individual Contacts · Update Conversation AI Bot
  and Status (help.gohighlevel.com).

**📌 Próximos pasos (orden sugerido):**

1. **María primero** (desbloquea todo el embudo): activarla como Principal en **Suggestive Mode** (seguro) o
   Auto-Pilot scopeado a los 3 de prueba vía el workflow "Update Conversation AI Bot and Status".
2. **Publicar WF-05** (5/5 pasos verificados end-to-end con orden real VO-0002, link MP real, WhatsApp, mover
   oportunidad, tag) — solo flip Publicar cuando el equipo dé OK.
3. **Publicar WF-03** — solo flip Publicar, pero **inútil hasta que María esté viva** (nadie agrega
   `qualification_complete` orgánicamente si no). El "error" del 4º paso en la prueba fue un artefacto del
   orden de test, no un bug.
4. **Vigilar la 1ª corrida real del cron `sin-respuesta-7d`** (07:00 UTC) para confirmar que el supuesto de
   `dateAdded` (última-actividad vs. creación de conversación) etiqueta con sentido.
5. **WF-02 · Verificar embajador — NO existe;** WF-01 debe encadenar en él. Necesario para cerrar el flujo de
   referido de embajador. (WF-07 regla-5-min y WF-12 auto-invite = menor prioridad; WF-12 necesita un endpoint
   nuevo primero.)
6. **Decisiones de negocio (equipo, no inventar):** mapa `tipo_interes`→`categoria` (hoy WF-04 rankea solo por
   presupuesto, degradado), matriz completa de ruteo de WF-11 (Felipe/Kevin/Sebastián ↔ tiers), y chequear el
   estado de la plantilla `escalacion_asesor` (última vez Pendiente aprobación de Meta).

---



## ✅ UPDATE 2 jul 2026 (continuación) — WF-05 y WF-03 completados y probados, bug real encontrado y arreglado en sin-respuesta-7d

> Sesión nueva retomando el hand-off de la actualización anterior. Cuatro hilos de trabajo: (1) reconciliar
> el regresión de rama contra `origin/main`, (2) terminar WF-05, (3) construir WF-03, (4) verificar los
> supuestos de la API de Conversations del cron `sin-respuesta-7d`. Los cuatro quedaron resueltos; nada se
> publicó/mergeó/desplegó sin confirmación explícita del usuario (checkpoints abajo).

**⚠️ Discrepancia real encontrada con la sesión concurrente.** Al abrir WF-05 esta vez, tanto la lista de
flujos como el toggle del builder mostraban **"Published"**, no "Draft" como decía la actualización
anterior — y el checkbox "Guardar la respuesta de este Webhook" (que había quedado roto) **ya estaba
activado**. Al intentar el toggle Publicar→Borrador la primera vez, GHL devolvió **"Error al guardar el
flujo de trabajo: Your version is outdated"** — señal directa de edición concurrente sobre el mismo
workflow. Se confirmó con el usuario (no se asumió) y se volvió a poner en Borrador antes de tocar nada
más; el segundo intento de toggle sí guardó limpio. Conclusión: **la sesión concurrente mencionada en la
entrada anterior sigue activa** — cualquier sesión futura debe volver a verificar el estado real del
workflow antes de asumir lo que dice este doc.

**✅ Regresión de rama arreglada (commit local `d4d14cb`).** El working tree de
`feat/ghl-inactivity-scoring` solo tenía la mitad del hardening de PR #46 (el mapeo a `ConvexError`, sin el
`try/catch` de la preferencia de Mercado Pago) y `vercel.json` le faltaban los 4 `maxDuration`. Restaurado
byte a byte contra `origin/main` (`git diff origin/main -- api/ghl-create-order.ts vercel.json` → vacío),
`npm run lint` y tests verdes. **Commit local únicamente — NO pusheado**, por la misma razón de colisión de
arriba.

**✅ WF-05 · Carrito y checkout — TERMINADO Y PROBADO end-to-end, sigue en Draft.** Los 5 pasos:
`#1 Crear orden (ghl-create-order)` (ya estaba) → `CK-01` (WhatsApp) → `Actualizar order_id` →
`Mover a Carrito Enviado` → `Tag carrito-enviado`. Detalles:

- **CK-01 usa mensaje libre ("None - Free form message"), no la plantilla `pieza_lista_pago_wa`.** La
  plantilla aprobada por Meta usa `{{custom_values.mp_link_default}}` (un valor de ubicación compartido,
  no por-contacto) — usarla habría mandado el mismo link genérico a todos los compradores en vez del link
  de MercadoPago real de cada orden (`{{custom_webhook.1.response.mp_url}}`), con riesgo de condición de
  carrera entre compras simultáneas. El mensaje libre sí permite el merge tag correcto y funciona porque el
  contacto está en conversación activa (ventana de 24h) justo cuando se agrega la etiqueta `quiere-comprar`.
- **Campo nuevo `Order ID` (`order_id`, Contacto, carpeta "Additional Info") creado con aprobación
  explícita del usuario** — no existía, igual que pasó con `producto_seleccionado_sku` la sesión anterior.
- **Prueba real contra Kevin Tres Toj**: orden `VO-0002` creada, `mp_url` real de MercadoPago generado,
  WhatsApp recibido con el link correcto (verificado leyendo el hilo real, no solo el log de ejecución —
  el log solo dice "Success", no el texto renderizado), oportunidad movida a "Carrito Enviado", tag
  `carrito-enviado` aplicado, campo `Order ID = VO-0002` confirmado en el contacto. **Los 5 pasos
  ejecutaron sin error.**
- Sigue en **Draft** — no se publicó sin confirmación.

**✅ WF-03 · Calificación IA — construido desde cero, sigue en Draft.** Trigger: etiqueta de contacto
`qualification_complete` (no existía, creada inline). Pasos: `Update conversation AI bot and status`
(Keep Same + Active, igual al spec) → `Mover a Calificado por IA` (secuencia Ventas Tierra Madre) →
`Chain to WF-04` (Añadir al flujo de trabajo → WF-04 · Búsqueda en catálogo). Prueba contra Kevin Tres Toj:
**3 de 4 pasos ejecutaron bien** (trigger, AI bot, chain a WF-04); el paso "Mover a Calificado por IA" dio
**Error: "Moving a opportunity backward in the pipeline is not allowed"** — esperado y no es un bug de
configuración: la oportunidad de Kevin ya estaba en "Carrito Enviado" por la prueba de WF-05 justo antes
(etapa más adelantada que "Calificado por IA"), y GHL bloquea mover oportunidades hacia atrás. En producción
WF-03 dispara antes que WF-05, así que el orden real nunca tendría este conflicto. Sigue en **Draft**.

**🐛 BUG REAL ENCONTRADO Y ARREGLADO — el cron `sin-respuesta-7d` nunca habría etiquetado a nadie.**
Verificado contra el spec OpenAPI público de GHL (`github.com/GoHighLevel/highlevel-api-docs`,
`apps/conversations.json`, schema `ConversationSchema`): la respuesta de `GET /conversations/search`
**NO tiene** `lastMessageDate` ni `lastMessageDirection` — el código asumía mal que sí. Esos dos nombres
solo existen como **parámetros de filtro** de la búsqueda (`lastMessageDirection=inbound|outbound`,
`endDate`/`startDate` sobre el campo `dateAdded`, Unix ms), no como campos de respuesta. Con el código
original, `parseLastMessageMs`/`isInactiveConversation` siempre habrían recibido `undefined` y la función
**siempre habría devuelto `false`** — un bug silencioso, sin crash, que nunca se habría notado hasta
revisar por qué nadie recibía la etiqueta ni el −10 de Manage Scoring.

- **Arreglo**: se reemplazó el patrón de dos pasos (`getLatestConversation` + `isInactiveConversation`,
  parseando campos de respuesta) por una sola función `isContactInactive` que filtra del lado del servidor:
  `lastMessageDirection=outbound&endDate=<cutoff>&limit=1` — una respuesta no vacía significa exactamente
  "existe una conversación cuyo último mensaje es outbound y está en o antes del corte", sin parsear nada.
- **⚠️ Un supuesto sigue sin verificar** (no hay credenciales GHL en vivo disponibles en este sandbox — el
  intento de hacerlo fue bloqueado por el sistema de permisos como lectura de credenciales de producción no
  autorizada explícitamente): si `dateAdded` para este filtro rastrea la actividad del último mensaje (lo
  que queremos) o la fecha de creación original de la conversación (lo que sub-etiquetaría hilos largos).
  Documentado en el código; confirmar con una conversación real antes de desplegar.
- `api/_lib/ghl-client.ts`, `convex/_lib/ghlConversations.ts`, `convex/ghl.ts` (la `internalAction
tagInactiveContacts` ahora usa `isContactInactive` y devuelve `notInactive` en vez de `skippedNoHistory`,
  ya que el filtro único no distingue "sin historial" de "última conversación no es outbound-vieja") y
  `tests/ghlConversations.test.ts` (reescrito, 8 casos) actualizados. **438/438 tests pasan, `tsc` limpio.**
  Commit local `852bf61` en `feat/ghl-inactivity-scoring` — **NO pusheado, NO mergeado, NO desplegado.**

**📋 Checkpoints pendientes de confirmación del usuario (nada de esto se hizo sin más):**

1. `git push` / abrir PR para los dos commits locales de esta sesión en `feat/ghl-inactivity-scoring`
   (regresión de `ghl-create-order` + fix de `sin-respuesta-7d`) — pendiente por la posible sesión
   concurrente con push real a `origin`.
2. Publicar WF-05 y WF-03 (ambos probados y listos, ambos en Draft a propósito).
3. Confirmar el supuesto de `dateAdded` de `sin-respuesta-7d` contra una conversación real, luego mergear
   y `npx convex deploy`.

**Explícitamente fuera de alcance esta sesión** (son decisiones de negocio, no técnicas, marcadas así en
el doc desde la sesión anterior): mapeo `tipo_interes → categoria`, matriz completa de ruteo por agente de
WF-11. No se inventó nada — se dejaron pendientes como estaban.

---

## 🚨 UPDATE 2 jul 2026 — "Do all" del roadmap: publicado, WF-05 en construcción, **bug 500 en vivo encontrado**

> El usuario pidió avanzar el roadmap completo ("recommend and implement best option to do all"). Antes de
> ejecutar se confirmaron 4 decisiones explícitas (ver hilo): publicar WF-01/06/08 ya, construir
> sin-respuesta-7d con la API real de Conversations de GHL, intentar derivar tipo_interes→categoría de
> forma empírica, y dejar WF-11 en round-robin (flag abierto). **Nueva regla permanente: todo test de
> workflow SOLO con los contactos Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga** (memoria
> `tm-ghl-test-contacts-only`).

**✅ Publicados (EN VIVO):** WF-08 Post-venta, WF-06 Escalación, WF-01 Nuevo contacto — confirmados
"Published" en la lista. WF-04 ya estaba publicado de antes.

**✅ Custom field creado:** `producto_seleccionado_sku` (Una sola línea, Contacto, carpeta "Additional
Info") — es el campo bloqueante que le faltaba a WF-05.

**🏗️ WF-05 · Carrito y checkout — en construcción (Borrador), id `665ed7cd-4ce9-4a38-acd8-e50d8adf2c02`.**
Trigger guardado: etiqueta `quiere-comprar` añadida. Primer paso "Crear orden (ghl-create-order)"
(Webhook personalizado POST a `/api/ghl-create-order`, header `Authorization: Bearer
{{custom_values.internal_api_secret}}`, body con `{{contact.producto_seleccionado_sku}}`) configurado
pero **NO guardado** — bloqueado por el hallazgo de abajo.

**🐛 BUG EN VIVO ENCONTRADO — `/api/ghl-create-order` responde 500 crudo, no el 400 esperado.** GHL exige
correr una "solicitud de prueba" real contra un contacto antes de dejar activar "Guardar la respuesta de
este Webhook". Se probó con **kevin tres toj** (contacto de prueba aprobado), sin `producto_seleccionado_sku`
lleno — se esperaba el 400 documentado (`items must be a non-empty array` / SKU inválido). En cambio:

- **Status 500, body literal `Internal Server Error`** (texto plano, NO el JSON `{"success":false,"error":...}`
  que produce nuestro propio `sendError`/`with-api-handler.js`). Esto es la firma de un **crash de plataforma
  Vercel** (la función nunca llegó al try/catch de `withApiHandler`), no un error de validación de negocio.
- Diagnóstico hecho con cuidado de **no seguir arriesgando producción**:
  - `curl` sin auth (2x, en momentos distintos) → **401 `{"success":false,"error":"Unauthorized"}`** correcto
    y en JSON ⇒ el módulo SÍ carga, el deploy está sano (`/api/health` 200), y SÍ llega hasta el chequeo de
    auth. El crash pasa **después** de la autenticación (que resolvió bien con el secreto real).
  - **Reproducido 2 veces seguidas con el mismo contacto (kevin tres toj)** → descarta que fuera un cold-start
    aislado; el 500 es consistente.
  - **Hallazgo de código: `api/ghl-create-order.ts` no tenía `maxDuration` en `vercel.json`**, a diferencia de
    **todos** los demás endpoints del proyecto (que declaran 15-60s explícito). Hace una mutación de Convex
    **+** una llamada en vivo a Mercado Pago (`createPreference`) de forma secuencial, sin `try/catch` propio
    en ese segundo tramo — cualquier fallo ahí antes solo lo atrapaba el catch genérico de `withApiHandler`.
  - `api/_lib/with-api-handler.js` y `api/_lib/cors.js::sendError` **siempre** devuelven JSON
    (`{"success":false,...}`) en cualquier error capturado por nuestro propio código — el cuerpo crudo
    `"Internal Server Error"` (texto plano) que devolvió GHL **no puede venir de nuestro código app-level**,
    solo de un crash de plataforma Vercel (proceso Node no controlado / promesa no atrapada fuera del
    await principal). Sin acceso a logs de Vercel (sin `vercel` CLI logueado en este entorno) no se pudo
    confirmar el stack trace exacto.
- **✅ Fix de endurecimiento aplicado (código, NO deployado, NO pusheado — sin credenciales de push desde
  este entorno).** Rama local **`fix/ghl-create-order-hardening`** (commit `6503dc5`, sobre `origin/main`
  limpio vía `git worktree`, sin tocar el árbol de trabajo sucio): (1) `maxDuration` explícito para
  `ghl-create-order` (30s), `ghl-search-products`/`ghl-sync-contact`/`mp-webhook` (15s cada uno); (2) el
  tramo Mercado Pago (`createPreference` + `setMpPreference`) ahora tiene su propio `try/catch` — si MP
  falla, la orden ya creada en Convex se devuelve igual (`mp_pending:true, mp_error:<msg>`) en vez de perderse
  en un crash sin manejar. **Esto endurece los dos puntos de falla más probables, pero no confirma la causa
  raíz exacta** — antes de mergear conviene revisar Logs de Vercel para el request real, o reproducir con
  `vercel dev` + `MP_ACCESS_TOKEN`/`CONVEX_URL` reales.
- **No se forzó el guardado ni se siguió probando en vivo más de lo necesario en el momento.** El paso quedó
  sin guardar en ese punto (Borrador intacto, sin publicar).

**✅ FIX CONFIRMADO EN PRODUCCIÓN (2 jul 2026, tarde).** El PR #46 (`fix/ghl-create-order-hardening`,
commits `6503dc5` + `ae74680`) fue mergeado a `main` (merge commit `8ee4b21`) — aparentemente por otra sesión
de Claude Code corriendo en la máquina del usuario con credenciales git reales (yo no tengo push a `origin`
desde este sandbox). Deploy de producción `dpl_7nLYpdsaD5fBxkha2yXoQWnpSV5R` quedó Ready. Se repitió el
**mismo test exacto** (webhook de prueba de GHL contra **kevin tres toj**, mismo body con
`{{contact.producto_seleccionado_sku}}` sin resolver) y esta vez:

- **Status 409 "Conflict"** (antes: 500 "Internal Server Error") — el `PRODUCT_NOT_FOUND` ahora sí llega
  como `ConvexError.data` y se mapea correctamente a la respuesta 409 documentada.
- **Verificado en Vercel Logs**: request `msq7j-1782979182666-f61f03112...`, deployment
  `dpl_7nLYpdsaD5fBxkha2yXoQWnpSV5R` (production, branch main), 302ms, **sin entrada de error/log rojo**
  (antes el 500 tenía un log `[GhlCreateOrder] Error: ... Server Error` con stack trace de
  `ConvexHttpClient.mutationInner`) — confirma que ahora el camino es el `catch` interno normal, no el
  crash-handler genérico.
- **Causa raíz real, confirmada por logs de Vercel** (no era un "crash de plataforma" como se especuló
  inicialmente): Convex sanea cualquier `Error` plano lanzado en una mutation a un mensaje genérico
  `"Server Error"` para clientes HTTP en producción — solo el payload `.data` de un `ConvexError` sobrevive
  el límite cliente/servidor. `convex/ghl.ts::createOrder` lanzaba `Error` plano para las 4 rutas de negocio
  (`PRODUCT_NOT_FOUND`, `NOT_AVAILABLE`, `EMPTY_ITEMS`, `OVER_LIMIT_2M`), así que el `msg.includes(...)` de
  `api/ghl-create-order.ts` nunca matcheaba y todo caía al 500 genérico — **incluyendo el gate de seguridad
  ≤2M COP ("golden rule #3"), que estaba roto en producción, no solo el caso de SKU faltante.**
- **WF-05 desbloqueado y primer paso GUARDADO.** El paso Webhook "Crear orden (ghl-create-order)" quedó
  persistido en el builder (nodo `#1 Crear orden (ghl-create-order)` visible entre el trigger y FINAL,
  header "Guardado"). **Nota:** el checkbox "Guardar la respuesta de este Webhook" quedó sin activar en
  este guardado (dejó de responder al clic en el último intento) — actívalo antes de construir el paso
  de WhatsApp CK-01, que necesita `{{custom_webhook.1.response.mp_url}}`. Falta el resto de WF-05:
  WhatsApp CK-01, update `order_id`, mover a Carrito Enviado, tag `carrito-enviado`. Workflow sigue en
  Draft (correcto, no publicar sin OK).

**⏸️ Pausado por lo anterior:** resto de WF-05 (WhatsApp CK-01 con `mp_url`, update `order_id`, mover a
Carrito Enviado, tag `carrito-enviado`) y WF-03 Calificación IA (Task #8) — no construidos aún esta sesión.

**✅ sin-respuesta-7d — código construido, NO desplegado.** Rama `feat/ghl-inactivity-scoring`
(commits `29ed2f7`, `eae66c0`), NO pusheada ni mergeada:

- `api/_lib/ghl-client.ts` +87 líneas (`getLatestConversation`, `isInactiveConversation`, `parseLastMessageMs`).
- `convex/_lib/ghlConversations.ts` (nuevo, espejo local para Convex) + `convex/ghl.ts`
  (`internalAction tagInactiveContacts`, `internalQuery listGhlLinkedContacts`) + cron diario **07:00 UTC**
  en `convex/crons.ts`.
- `tests/ghlConversations.test.ts` (18 casos) — suite completa **34/34 pass**, `tsc` limpio.
- **NO desplegado a propósito**: la forma de los campos de la API de Conversations de GHL usada en el código
  es una suposición documentada, no verificada contra datos reales — necesita PR + revisión antes de
  `npx convex deploy`.

**❌ tipo_interes → categoría — NO se pudo derivar de forma confiable.** Se usó el snapshot cacheado
`scripts/.backups/inventario-reorder-2026-05-27.json` (Convex en vivo no accesible desde el sandbox).
Conclusión en `GHL/tipo-interes-mapping-analysis.md`: `tipo_interes` (tipo de pieza: anillo/topito/candonga/
dije/gema_suelta/set) y `categoria` (colección: Gema Facetada/Muralla/Gola/Raíz) son **ejes ortogonales** —
la mayoría de filas cacheadas son piedra suelta (`subtipoForm=Gema`), y las pocas piezas terminadas llevan
el tipo en un campo distinto (`tipoJoya`) con `categoria` vacía. **No inventado, reportado honestamente.**
Recomendación: o se añade un campo real de tipo-de-pieza, o el equipo autoriza el mapeo a mano. Punto de
enchufe si se aprueba después: `convex/_lib/productSearch.ts::rankProducts`.

**WF-11 — se deja en round-robin, flag abierto** (decisión explícita del usuario: no inventar nombres).

---

## ⚡ UPDATE 1 jul 2026 (noche) — WF-04 pasos de envío + Manage Scoring COMPLETO + hallazgos WhatsApp

> Sesión de automatización en el iframe de Progresy (Chrome). Se completaron las tareas #1 (WF-04) y #3
> (Manage Scoring) del hand-off. WF-01/06/08 se dejaron correctamente en Borrador — **no se publicó nada**
> (no hubo OK explícito del equipo esta sesión).

**WF-04 · pasos de envío — COMPLETADO (Borrador).** Se activó "Guardar la respuesta de este Webhook" en el
paso Webhook (ghl-search-products) y se añadieron los pasos: WhatsApp con los 3 productos (nombre, precio_cop,
foto_url, web_link), mover oportunidad → "Producto Recomendado", tag `productos-mostrados`.

**🔗 `web_link` ahora apunta a la Vitrina pública (`/v/{itemId}`), no a `/product/{itemId}`.** Desde
`convex/ghl.ts:searchProducts`, el `web_link` que devuelve el webhook es `https://tierramadre.app/v/{itemId}`
— una página de producto **sandbox, sin login** (el cliente no choca con el muro de autenticación de
`/product`). El nombre del campo `web_link` **no cambió**, así que los merge tags de WF-04
(`{{custom_webhook.1.response.productos.0.web_link}}`, etc.) siguen igual — solo cambia el valor. Un número de
ítem suelto (`/v/324`) se interpreta como lista de ids con precio por defecto **x1 COP = el mismo `precio_cop`**
que va en el texto del WhatsApp, así que mensaje y página muestran la misma cifra. (Para un enlace único a una
_grilla_ de las 3 piezas con precio elegido por el asesor, ver el flujo manual "Compartir con cliente" en la
app → genera `/v/{token}` con multiplicador + moneda; requiere añadir un merge tag nuevo en Progresy.)


**🐛 Bug real encontrado y arreglado — merge tag de array en WhatsApp free-form.** El tag
`{{custom_webhook.1.response.productos}}` (array de objetos) se renderiza como texto literal
`[object Object],[object Object],[object Object]` en el WhatsApp real enviado — **el log de ejecución del
workflow igual marca "Success"/"Ejecutado"**, así que este fallo NO se ve desde el log, solo revisando el hilo
de conversación real. Fix: usar tags indexados por campo (sintaxis no expuesta en el selector de merge tags,
pero funcional si se escribe a mano): `{{custom_webhook.1.response.productos.0.nombre}}`,
`.0.precio_cop`, `.0.web_link` (y `.1.`/`.2.` para los otros dos productos). Verificado con un reenvío real:
mensaje correcto, sin ícono de error. **Lección: "Success" en el log de GHL no garantiza que el contenido del
mensaje sea válido — siempre revisar el hilo real de WhatsApp.**

**Prueba real con WhatsApp del equipo (3104149166, con permiso explícito).** Se creó un contacto de prueba
("Kevin Tres Toj") y se probó el envío real dos veces. Hallazgos:

- El selector de bandera del teléfono resetea a Países Bajos (+31) en vez de Colombia (+57) — hay que
  clic explícito en la bandera → buscar "Colombia" → reescribir el número.
- **Trampa de UI:** los checkboxes "Canales" en el formulario "Añadir Contacto" en realidad **activan DND**
  para ese canal (bloquear), no lo "habilitan" como parece indicar el texto. Marcar "WhatsApp" ahí bloqueó
  el envío (log: "Cannot send message as DND is active for WhatsApp" / Skipped). Se corrige en la pestaña
  "DND" del contacto.

**`tipo_interes` — valores reales descubiertos (corrige suposición anterior).** El dropdown real del campo
`tipo_interes` tiene: **topito, candonga, anillo, dije, gema_suelta, set, otro** — son **tipos de pieza**, NO
categorías de intención del cliente (`inversion`/`anillo`/`esmeralda`/`regalo` que se venía asumiendo en el
follow-up del mapa `tipo_interes`→colección de los updates anteriores). Esto cambia el enfoque del mapeo
pendiente: probablemente sea tipo-de-pieza → colección, no intención → colección. **Decisión de negocio, no
tomada esta sesión** — sigue pendiente confirmar con el equipo.

**Manage Scoring — COMPLETADO (9/9 reglas).** Las 3 reponderaciones y las 4 reglas nuevas del spec quedaron así:

- Reponderadas: cita Confirmado +25, respuesta+tag (SMS) +15, cita reservada +25.
- Nuevas: email/link-clicked (`link-catalogo`) +10 (de sesión previa), tag `cliente-pago-confirmado` +50, tag
  `carrito-enviado` +30 (ambas de esta sesión).
- **`sin-respuesta-7d` −10: NO implementable de forma nativa** — se revisaron todas las categorías del selector
  (Email Events, Contact Changed, Contact Tag, Payment Received, Contact Replied, Form Submitted, Order Form
  Submission, Order Placed, Survey Submitted, Trigger Link Clicked, Contact Booked Appointment, Appointment) y
  ninguna cubre "sin respuesta en N días". Habría que resolverlo fuera de Manage Scoring (p.ej. un cron de
  Convex que reste puntos, o un workflow con espera + condición). **Pendiente de decisión.**
- **Gotcha de UI confirmado como inconsistente:** para "cita Confirmado" el flujo "Edit" SÍ duplicó la regla
  (hubo que agregar nueva + borrar la vieja). Para "respuesta+tag" y "cita reservada", "Edit" **editó en el
  lugar** correctamente (sin duplicado). Verificar el conteo de filas después de cada edición, no asumir.

**Estado final de workflows (sin cambios de publicación):** WF-01, WF-06, WF-08 siguen correctamente en
**Borrador** — no se publicó nada esta sesión (requiere OK explícito del equipo, no se dio).

---

## ⚡ UPDATE 1 jul 2026 (tarde) — Validación cruzada + PR limpio #43

> Se validó el trabajo del corte anterior **contra el repo real + una corrida de tests** (no a ciegas).
> Todo verificado; correcciones de estado abajo para no cristalizar datos incorrectos.

**Verificado (coincide con lo reportado):**

- **Seguridad `postToVercel`** (2 hallazgos del review automático de commits) — allowlist de host **EXACTO**
  (`TRUSTED_SYNC_HOSTS`, **sin** sufijo `.vercel.app`), redirect manual re-emitiendo POST, y `throw` ante host
  no confiable o downgrade https→http. En `convex/_lib/sheetSync.ts`.
- **Catálogo / WF-04** — `convex/_lib/productSearch.ts::rankProducts`: pasada estricta → si vacía, fallback por
  presupuesto. Causa raíz real = `tipo_interes` (intención del cliente) vs nombres de colección internos en `categoria`.
- **Tests** — suite redirect **8/8**; suite completa **429 pasan / 1 falla**. La 1 = `adminNavMap.routes.test.ts`
  (drift de registro de rutas del copiloto admin), **pre-existente y ajena** a este trabajo. `convex/migrations.ts` inerte (run manual).

**Correcciones de estado (importante):**

- **Rama `feat/jewelry-visualizer` va ADELANTE 6 de origin**, no 3: además de los 3 commits GHL están
  `20da2d6` (compresión de fotos fotosíntesis), `bbb37b3` (columnas numéricas SOT) y `99b1b06` (rediseño
  **Quiet Emerald v2** — Catálogo/Detalle/Cotización), + árbol de trabajo sucio.
- **Manage Scoring = ENCENDIDO pero PARCIAL**, no "terminado": faltan reponderar 3 reglas en +1 y añadir
  link-clicked +10 / sin-respuesta-7d −10 / reglas por tag venta+carrito (ver update 30 jun noche).
- **WF-01 · Nuevo contacto = Borrador** (sesión previa), no publicado.
- **Deploy a prod (`wonderful-tortoise-984`)** — verificado EN VIVO consultando `searchProducts` (devuelve 3
  para `inversion`), pero **NO** verificable desde el repo (el target vive en el dashboard/CLI de Convex, no en config commiteada).

**PR limpio abierto → [#43](https://github.com/kvn3toj/tierramadre/pull/43)** (`fix/ghl-catalog-and-sheet-security`):
rama fresca desde `origin/main` con **solo los 3 commits GHL** (`f27b1ce` catálogo · `4501726` POST+migrations ·
`d8b7887` allowlist) — **sin** el rediseño ni WIP. GitGuardian ✅; claude-review + Vercel preview corriendo.
**NO mergeado**: merge a `main` = auto-deploy a prod = decisión del equipo. El backend ya está vivo en Convex, así que no mergear no rompe nada.

---

## 🤝 Hand-off — Sesión Progresy (browser) · prompt para pegar a un agente nuevo

> Para publicar workflows / construir pasos dentro del iframe de Progresy. **Requiere Chrome con la sesión de
> Progresy ya logueada** (el agente NO puede loguearse — credenciales prohibidas). **⚠️ Publicar un workflow =
> EN VIVO = WhatsApp real a clientes** → hacerlo SOLO con visto bueno explícito del equipo.

```text
Continúo el Área 3 (Progresy / GoHighLevel) de Tierra Madre. Lee GHL/ESTADO-Y-PROXIMOS-PASOS.md.
Sub-account: t3tOZBrR05jUoLqnDn4I · base URL https://app.progresy.ai/v2/location/t3tOZBrR05jUoLqnDn4I/

REGLAS DEL IFRAME (críticas, aprendidas en sesiones previas):
- NO redimensionar la ventana ni usar el toggle expandir/contraer del panel (dispara auto-resize → los clics fallan).
- Tras navegar, dejar cargar el iframe ~15 s. No doble-click. Mantener la ventana quieta.
- Los dropdowns se recortan bajo el footer del panel: tras abrirlos, hacer scroll del cuerpo del panel 2-3 ticks.
- Si un clic falla 2-3 veces seguidas, PARAR y reportar (no insistir). Grabar un GIF de los flujos importantes.

TAREAS POR PRIORIDAD (todo queda en Borrador; PUBLICAR requiere OK explícito del equipo = manda WhatsApp real):
1. ✅ HECHO (1 jul noche) — WF-04 · enviar los 3 productos: "Guardar la respuesta de este Webhook" activado +
   pasos de WhatsApp/oportunidad/tag construidos. OJO: si tocas el mensaje de WhatsApp, usa tags indexados
   ({{custom_webhook.1.response.productos.0.nombre}}, .0.precio_cop, .0.web_link, etc.) — el tag de array
   completo renderiza como "[object Object]" y el log de ejecución NO lo detecta (revisar el hilo real).
2. Publicar WF-08 Post-venta (id 68e6c720-5232-4065-b1fb-d430928dbed2): publicar → copiar el ID a
   WF_POSTVENTA_ID en Vercel (env Production) → redeploy. Opcional paso embajador EM-02.
3. Publicar WF-06 Escalación (id 1e3a2a49-a8ae-4d01-9da7-bb5b52e15b4c): publicar → confirmar que María
   etiqueta pide-humano al escalar.
4. Publicar WF-01 Nuevo contacto (id c7e78b83-17c6-4fd6-b814-e968f77987a9): revisar branching por canal +
   saludo; publicar.
5. ✅ HECHO (1 jul noche) — Manage Scoring (/settings/scoring): 9/9 reglas — 3 reponderadas (+25/+15/+25) +
   4 nuevas (link-clicked +10, tag cliente-pago-confirmado +50, tag carrito-enviado +30, de sesiones previas
   y esta). **Pendiente sin resolver:** sin-respuesta-7d −10 NO tiene categoría nativa en GHL — necesita
   solución fuera de Manage Scoring (cron Convex o workflow con espera). GOTCHA: "Edit" a veces DUPLICA la
   regla y a veces edita en el lugar (inconsistente) → siempre verificar el conteo de filas tras editar.

DECISIONES DE NEGOCIO PENDIENTES (no tomarlas solo/a — preguntar al equipo):
- Mapa tipo_interes → colección/forma (para que WF-04 rankee por categoría con sentido; hoy degrada a presupuesto).
  **Corrección (1 jul noche):** los valores reales de tipo_interes son tipos de pieza (topito, candonga, anillo,
  dije, gema_suelta, set, otro), no categorías de intención — el mapeo debe ser pieza→colección, no intención→colección.
- WF-05 carrito: falta custom field producto_seleccionado_sku (qué pieza quiere) antes del webhook ghl-create-order.
- Mapeo agente→rol para la matriz completa de WF-11 (agente_inversion/senior/premium ↔ Felipe/Kevin/Sebastián).
- Cómo implementar sin-respuesta-7d −10 (sin categoría nativa en Manage Scoring).
```

---

## 📐 WF-01 / WF-03 / WF-05 — specs LISTAS para construir (siguiente sesión)

> No se construyeron aún: el iframe de Progresy se puso inestable tras un reload (captura pegada
> en 1568px vs viewport 1280px → los clics dejaron de registrar). Construir en fresco con la
> ventana quieta (NO redimensionar, NO doble-click, dejar cargar el iframe ~15 s). Cada una tiene
> dependencias reales, anotadas abajo.

**WF-01 · Nuevo contacto** — ✅ **CONSTRUIDO (Borrador)** · id `c7e78b83-17c6-4fd6-b814-e968f77987a9`.

- **Trigger:** _Contacto creado_ (sin filtros).
- **Acciones:** (1) WhatsApp **`saludo_inicial_wa`** (branches off, saludo de bienvenida con `{{contact.first_name}}`);
  (2) Crear/actualizar oportunidad → **Ventas Tierra Madre / Nuevo Lead**.
- **Pendiente:** publicar; refinamiento = ramificar por canal con _Inbound Message_ → tag `canal-wa/ig/tt` +
  plantillas WA-01/IG-01/TT-01; encadenar WF-02 (verificar embajador) — WF-02 aún NO existe.

**WF-03 · Calificación IA:**

- **Trigger:** por **etiqueta** (GHL no tiene el custom-event "qualify_lead"); p.ej. un tag que agregue WF-01.
- **Acciones:** **Activar María** = acción "Update conversation AI bot and status" → _Keep Same_ + **Active**
  (el inverso de WF-06); Mover oportunidad → **Calificado por IA**.
- **Dep:** mover a "Calificado" debe **esperar el tag `qualification_complete`** que María agrega al terminar
  las 4 preguntas (configurar eso en María); luego encadenar **WF-04** (ya existe/publicado).

**WF-05 · Carrito + checkout** (alto valor — con BLOQUEO de modelo de datos):

- **Trigger:** por **etiqueta de intención de compra** (GHL NO tiene trigger por palabra clave — mismo caso que WF-06);
  p.ej. `quiere-comprar` que María agrega al detectar "lo quiero / cómo pago".
- **Webhook:** POST **`https://tierramadre.app/api/ghl-create-order`**, header
  **`Authorization: Bearer {{custom_values.internal_api_secret}}`** (patrón de WF-04). Cuerpo:
  ```json
  {
    "contact": {
      "celular": "{{contact.phone}}",
      "full_name": "{{contact.full_name}}",
      "email": "{{contact.email}}"
    },
    "items": [{ "sku": "{{contact.<SKU_PIEZA>}}", "qty": 1 }]
  }
  ```
  Respuesta `{order_id, mp_url}` → **Guardar la respuesta** y usar `mp_url` en el envío.
- **Resto:** enviar **CK-01** (WhatsApp) con `{{mp_url}}`; Update field `order_id`; Mover → **Carrito Enviado**;
  Add tag **`carrito-enviado`**.
- **🚫 BLOQUEO:** `items[].sku` (qué pieza quiere) **no existe como campo**. Falta un custom field
  tipo `producto_seleccionado_sku` que llene el flujo de recomendación (WF-04). Sin él, el webhook responde
  400 `items must be a non-empty array` / SKU inválido. Decisión de modelo de datos pendiente antes de construir WF-05.

---

## ⚡ UPDATE 1 jul 2026 (madrugada) — Catálogo / WF-04: diagnóstico CORREGIDO + fix (código)

> Se retomó el "bloqueo de catálogo" (WF-04 devolvía `productos:[]`). Se verificó contra la
> **base de datos de producción** (deployment `wonderful-tortoise-984`, último pull 2026-07-01 04:30 UTC),
> no contra suposiciones. El diagnóstico de la sesión anterior quedó **obsoleto** y la causa real es otra.

- **❌ El "0 publicadas" ya NO aplica.** Hoy hay **60 piezas publicadas** (`mostrarEnCatalogo:true`) en
  **20 lotes `publicado`** — **59 DISPONIBLE** con precio (1 VENDIDA, correctamente excluida por el filtro `estado`).
  Alguien publicó lotes entre la sesión anterior y esta. Inventario total: **386** filas; cron de Sheet sano.
- **✅ Causa raíz REAL (verificada llamando a `ghl.searchProducts` contra prod):**
  **desajuste de taxonomía en `categoria`.** WF-04 manda `categoria = {{contact.tipo_interes}}` (intención del
  cliente: `inversion` / `anillo` / `esmeralda` / `regalo`), pero el campo `categoria` del catálogo guarda
  **nombres de colección internos**: `Gema Facetada` (27), `Muralla` (10), `Gola` (6), `Raíz` (5),
  `Piedra Natural` (1), + 11 sin categoría. **Ningún `tipo_interes` real matchea** esos nombres.
  - `rankProducts` usaba `categoria` como **filtro duro** ⇒ cualquier lead **calificado** (con `tipo_interes`)
    caía a **0 resultados**. Solo un lead con `tipo_interes` **vacío** recibía piezas. (Ese es el `productos:[]`
    que la sesión anterior vio con "carlos garcia" — mal atribuido a "0 publicadas").
  - Pruebas en vivo (pre-fix): `categoria:'anillo'`→0, `'esmeralda'`→0, `'inversion'`→0; **sin categoría → 3**. ✅ confirmado.
- **✅ Fix aplicado (código, TDD):** `convex/_lib/productSearch.ts` → **degradación elegante**. La pasada
  estricta mantiene el filtro de `categoria` (un match real NUNCA se diluye con piezas fuera de categoría);
  si esa pasada da **vacío**, cae a opciones **dentro de presupuesto** en vez de responder `[]`. `categoria`
  sigue **subiendo el ranking**, ya no excluye. Se respeta todo lo demás (publicada / DISPONIBLE / presupuesto).
  - Tests: `tests/productSearch.test.ts` (+4 casos, TDD RED→GREEN). Suite: **11/11** en el módulo, **425/426** global
    (el 1 que falla es `adminNavMap.routes.test.ts`, pre-existente y ajeno — registro de ruta del copiloto admin).
  - **Validado contra datos de prod** con el `rankProducts` corregido: `inversion`+3M→**3**, `anillo`+5M→**3**,
    `esmeralda`→**3**; y `categoria:'Gema Facetada'` (colección real) → estricto sigue aplicando (solo Gema Facetada).
- **✅ DESPLEGADO a prod (1 jul 2026):** `npx convex deploy` → `wonderful-tortoise-984` OK (schema validado,
  0 índices tocados, typecheck pasó). **Verificado EN VIVO** contra el `searchProducts` desplegado:
  `categoria:'inversion'`+3M → **3** (antes 0), `'anillo'`+5M → **3** (antes 0), `'Gema Facetada'` (colección real)
  → estricto sigue aplicando. El deploy también incluyó (ya staged en la rama) el fix `postToVercel` de
  `sheetSync.ts`/`products.ts` (redirect POST→GET que 405-eaba los writes al Sheet) + registro de `migrations.ts`
  (inerte, solo `npx convex run`). Reversible por git + redeploy.
- **Follow-ups (no bloqueantes):**
  1. **Mapa de taxonomía `tipo_interes` → colección/forma** para que `categoria` vuelva a rankear con sentido
     (hoy degrada a "por presupuesto"). Requiere definición de negocio: ¿`tipo_interes` describe forma
     (anillo/aretes) u ocasión/intención? El catálogo hoy solo tiene colecciones, no formas.
  2. WF-04: activar "Guardar la respuesta del Webhook" + construir los pasos "enviar los 3 productos"
     (ahora sí hay data real que consumir).
  3. Higiene: 1 pieza `VENDIDA` quedó con `mostrarEnCatalogo:true` (no daña —el filtro la excluye— pero conviene
     limpiarla al vender); y 2 filas `errored` en `syncStats` para revisar.

---

## ⚡ UPDATE 30 jun 2026 (noche) — WF-08 Post-venta CONSTRUIDO (Borrador)

- **WF-08 · Post-venta — núcleo construido en el builder (queda en Borrador).**
  ID del workflow: **`68e6c720-5232-4065-b1fb-d430928dbed2`** → este es el valor para **`WF_POSTVENTA_ID`** en Vercel.
- **Disparador:** _Etiqueta de contacto_ → **"Etiqueta añadida" = `cliente-pago-confirmado`** (re-entry off).
  Esta etiqueta la agrega `api/mp-webhook.ts` cuando MP confirma el pago, así que **el tag ES la vía de
  inscripción** (el `addToWorkflow`/`WF_POSTVENTA_ID` es redundante de refuerzo, no obligatorio para que dispare).
- **Pasos (6 acciones):**
  1. _Crear o actualizar oportunidad_ → pipeline **Ventas Tierra Madre**, fase **Venta Cerrada**.
  2. WhatsApp **CK-03** — plantilla `confirmacion_pago_wa` (UTILITY). (branches OFF)
  3. **Esperar 1 día**.
  4. WhatsApp **PV-02** — plantilla `postventa_entrega_wa`. (branches OFF)
  5. **Esperar 7 días**.
  6. WhatsApp **PV-03** — plantilla `postventa_testimonio_wa`. (branches OFF)
     _(El backend ya escribe `total_comprado_cop` + `ultima_compra_fecha` + tag, por eso WF-08 NO repite esos pasos.)_
- **Plantillas WA aprobadas disponibles** (vistas en el selector): `saludo_inicial_wa`, `confirmacion_pago_wa` (UTILITY),
  `postventa_entrega_wa`, `postventa_testimonio_wa`, `pieza_lista_pago_wa`, `pieza_pendiente_wa`.
- **Pendiente de WF-08 (refinamientos):**
  - **Publicar** el workflow (queda Borrador a propósito: publicarlo lo pone EN VIVO → manda WhatsApp reales cuando
    aparece el tag; hacerlo cuando el equipo decida ir a producción). Al publicar, copiar el ID a `WF_POSTVENTA_ID` + redeploy.
  - **No existe plantilla PV-01 / "cuidados día 1"** → se usó `postventa_entrega_wa` como el toque del día siguiente
    (ajuste de copy pendiente, o registrar una plantilla `cuidados_dia1_wa` en Meta).
  - **Paso embajador (EM-02)** no construido: manda al _embajador_ (otro contacto) → requiere patrón de
    _Notificación interna_ / envío cruzado, no un WhatsApp al contacto inscrito.
  - Opcional: cambiar "Esperar 1 día" por _esperar hasta etiqueta `entregado`_ para PV-02 (gating real de entrega).
- **Aprendizaje de automatización (importante):** el iframe de Progresy es manejable por Claude-in-Chrome **si la
  ventana se mantiene quieta**. NO usar `resize_window` repetido ni el toggle expandir/contraer del panel — eso dispara
  el auto-resize del viewport y los clics fallan. Los dropdowns se recortan bajo el footer del panel → tras abrirlos,
  hacer scroll del cuerpo del panel 2-3 ticks para levantar el campo. Detalle en memoria `tm-ghl-progresy-state`.

### WF-06 · Escalación — CONSTRUIDO (Borrador)

- **WF-06 · Escalación** — id **`1e3a2a49-a8ae-4d01-9da7-bb5b52e15b4c`** (Borrador).
- **Cambio de diseño vs. spec:** GHL **no** tiene disparador nativo por _palabra clave_ en el mensaje
  ("El cliente ha respondido" solo filtra por campos de contacto, no por el texto). Por eso WF-06 dispara con
  **Etiqueta de contacto "Etiqueta añadida" = `pide-humano`**. Esa etiqueta debe agregarla **María** (Conversation AI,
  al detectar intención de escalar) o un asesor a mano. El mismo tag también dispara **WF-11** (routing), así que
  WF-06 NO agrega el tag ni asigna usuario.
- **Pasos:** (1) **Pausar IA (María)** = acción "Update conversation AI bot and status" → _Keep Same_ + estado **Inactive**;
  (2) Mover oportunidad → **Negociación / Agente**; (3) WhatsApp **ES-01** en _free-form_ con el snippet
  "ES-01 · Escalación a agente humano" (free-form vale porque la escalación cae dentro de la ventana de 24 h;
  aún no hay plantilla `escalacion_asesor` aprobada por Meta).
- **Pendiente:** publicar; confirmar que María agrega `pide-humano` al escalar (o dejarlo manual/keyword futuro).

### Manage Scoring — ENCENDIDO + reponderado (parcial)

- **Perfil "Engagement Score" → ENCENDIDO** (Settings → Manage Scoring, `/settings/scoring`).
- **Reglas ajustadas/añadidas:** email abierto **+5** (era +1); **Payment Received / Success +50**;
  **Form Submitted (Evento Tierra Madre · RSVP) +20**.
- **Siguen en +1** (reponderar): "appointment Confirmed", "contact reply + tag" (→ SMS reply +15),
  "booked appointment" (→ +25).
- **Gotcha del UI:** el "Edit" de una regla **crea un duplicado** (no edita) → para reponderar hay que
  **agregar nueva + borrar la vieja** (menú "…" → Delete → "Yes, Delete").
- **Ojo con "Payment Received":** dispara para pagos **nativos de GHL**; las ventas de TM van por
  **MercadoPago** (fuera de GHL) + tag `cliente-pago-confirmado`. Regla más fiable para "venta +50" =
  **Etiqueta de contacto = `cliente-pago-confirmado`** (y `carrito-enviado` +30 para carrito).
- **Faltan del spec:** email link-clicked +10, sin-respuesta-7d −10; y las reponderaciones de arriba.

## ⚡ UPDATE 30 jun 2026 (tarde) — WF-04 terminado y probado

- **WF-04 · Búsqueda en catálogo → PUBLICADO y verificado.** El webhook se autentica con un
  **encabezado personalizado** `Authorization: Bearer {{custom_values.internal_api_secret}}`
  (la Autorización nativa "Bearer Token" de esta versión de GHL guarda una _clave estática_
  y NO resuelve merge tags, por eso se usó un header — resultado idéntico:
  `Authorization: Bearer <secreto>`, que es exactamente lo que valida `api/_lib/bearer.ts`).
- **Cuerpo:** `{"intent":{"categoria":"{{contact.tipo_interes}}"},"presupuesto":{{contact.presupuesto_declarado}},"ciudad":"{{contact.ciudad}}"}`
  (presupuesto sin comillas = número; GHL marca el editor con un punto rojo de lint pero **guarda
  y envía bien** al resolver el merge tag). El flujo corre tras la calificación, cuando esos campos existen.
- **Prueba en vivo** (Probar flujo de trabajo → contacto "carlos garcia"): el paso Webhook devolvió
  **`{"status":200,"data":{"success":true,"productos":[]}}`** → estado **Success**. Es decir:
  **200 = cableado + secreto correctos** (no 401). ✅
- **⚠️ Hallazgo (causa raíz identificada):** `productos:[]` viene **vacío**. Diagnóstico por código:
  - `convex/ghl.searchProducts` filtra `productInventory` por **`mostrarEnCatalogo === true`** + `DISPONIBLE` + `precioCOP`.
  - El cron `products.pullFromSheet` (espeja el Sheet cada 15 min) inserta filas **SIN** `mostrarEnCatalogo`
    (`convex/products.ts:1340`). Ese flag es **manual y solo-Convex** — se pone al **publicar** una pieza
    en el flujo Fotosíntesis (admin), nunca se sincroniza desde el Sheet.
  - ⇒ El bot solo "ve" piezas **publicadas** a mano; hoy hay **0** (confirmado por el 200/`productos:[]`).
  - Ojo: el **Treasure Browser** (catálogo del sitio para clientes) lee otra fuente
    (`/api/get-treasure-sheets`), así que la web puede mostrar catálogo lleno mientras el bot ve 0.
  - **Opciones de arreglo:** (1) **Publicar** piezas al catálogo (`mostrarEnCatalogo=true`) desde el admin/Fotosíntesis
    — camino previsto; (2) si el catálogo vendible real es el legacy del Treasure Browser, **repuntar
    `searchProducts`** a esa fuente; (3) relajar el filtro para recomendar cualquier `DISPONIBLE` con precio
    (cambia la semántica de "publicado"). Recomendado: (1) para probar ya, y decidir (2) según intención de negocio.
- **Pendiente menor de WF-04:** activar "Guardar la respuesta de este Webhook" (su prueba obligatoria
  - el `<select>` de contacto que abre fuera de pantalla lo hicieron impráctico ahora; además no tiene
    consumidor hasta construir los pasos "enviar los 3 productos"). Hacerlo junto con esos pasos.
- **Nota de entorno:** Progresy renderiza GHL en un **iframe cross-origin** dentro de un viewport
  embebido que cambia de tamaño solo; automatizar por clics es lento y frágil (dropdowns fuera de
  pantalla, el editor de cuerpo atrapa el scroll). Construir workflows desde cero así es viable pero costoso.

### Priority-A avanzado hoy (30 jun tarde)

- **WF-11 · Smart Routing — round-robin corregido.** Se **quitó Felipe**; ahora enruta
  **Round-robin: Kevin (Dirección Tierra Madre) / Sebastián (Sebastian Pion) / Comercializadora Tierra Madre**
  (Split Traffic = Equally). Guardado, **queda en Borrador**. Nota: en la lista de usuarios asignables
  NO existe un usuario "Kevin" por nombre — Kevin = cuenta **Dirección Tierra Madre** (confirmado por el cliente).
- **Trigger Link creado:** `link-catalogo` → `https://tierramadre.app` (Link Key `{{trigger_link.ovuRRTi2O6uxySbbR...}}`
  para click-tracking en plantillas). `link-checkout` se **omite** (el checkout es `init_point` dinámico por orden, no un link estático);
  links de evento pendientes de URLs reales.
- **Manage Scoring (Settings → Manage Scoring):** ya existe **1 perfil "Engagement Score" con 4 reglas**
  (email abierto, cita confirmada, respuesta+tag, cita agendada), todas **+1**, y el perfil está **APAGADO**.
  Falta alinear a la matriz del spec (email +5, link +10, form +20, cita +25, resp. SMS +15, sin-respuesta-7d −10,
  Opp→Carrito +30, Opp→Venta +50) y **encender** el perfil. Es una tarea propia (editar 4 + agregar ~5 reglas).

### Pendientes por prioridad (siguiente sesión)

1. **WF-08 Post-venta** — núcleo YA construido (Borrador, ver update noche). Falta: **publicar** + copiar ID
   `68e6c720-5232-4065-b1fb-d430928dbed2` → `WF_POSTVENTA_ID` en Vercel + redeploy; opcional paso embajador EM-02.
2. **WF-06 Escalación** — YA construido (Borrador, id `1e3a2a49-a8ae-4d01-9da7-bb5b52e15b4c`). Falta: publicar + confirmar que María etiqueta `pide-humano`.
3. **Manage Scoring** — perfil YA encendido con pesos altos (email +5, pago +50, form +20). Falta: reponderar los 3 de +1, y añadir link-clicked +10 / sin-respuesta −10 / reglas por tag para venta+carrito.
4. **WF-01 / WF-03 / WF-05** (resto del embudo).
5. **Catálogo (WF-04):** ✅ **RESUELTO Y DESPLEGADO** (1 jul) — 59 piezas DISPONIBLE publicadas + fix de
   degradación en `searchProducts`, ya EN VIVO en prod y verificado (ver update 1 jul madrugada).
   Follow-up (no bloqueante): mapa `tipo_interes`→colección para que `categoria` rankee con sentido.
6. Decisión de cliente: mapeo agente→rol para la **matriz completa de WF-11**.

## 1 · Lo que YA está listo (verificado hoy)

**Pagos**

- **MercadoPago**: app "TierraMadre" (Checkout Pro, Colombia) en **modo prueba**; webhook
  `https://tierramadre.app/api/mp-webhook` (evento Pagos) registrado; **firma HMAC verificada**.
  Detalle y plan de swap a la cuenta oficial: `docs/mercadopago-setup-and-swap.md`.

**Secreto compartido (GHL ↔ backend)**

- Custom Value **`internal_api_secret`** (GHL) = **`GHL_API_SECRET`** (Vercel, Production) —
  sincronizados; Vercel redeployado. Es el prerequisito para que workflows/bot llamen
  `/api/ghl-*`. El merge tag es `{{custom_values.internal_api_secret}}`.

**Canales (todos conectados)**

- **WhatsApp Business**: número +57 311 305 2755 · cuenta **Approved** + Meta **Verified** +
  marketing **Enabled** · **15 plantillas** (14 Activas, 1 Pendiente Meta: `escalacion_asesor`).
- **Facebook**: página "Tierra Mädre Gemas" conectada.
- **Instagram**: conectado vía la misma página (DMs al inbox unificado).
- **TikTok Messaging**: conectado. (Google Calendar también.)

**Backend de comercio (Convex + Vercel)**

- `searchProducts`, `createOrder`, `markOrderPaid` (idempotente) + crons `ambassador-scoring`
  y `abandoned-cart`. Endpoints `/api/ghl-search-products`, `/api/ghl-create-order`,
  `/api/mp-webhook` desplegados. Inventario espejado a `productInventory` por cron.

**GHL base**

- 14 custom fields · pipeline 7 etapas · ~48 tags · 11 custom values · 18 snippets ·
  bot **María** (Conversation AI) + KB · calendario · brand board · Private Integration Token ·
  3 workflows (WF-09/10/11, Borrador).

**WF-04 · Búsqueda en catálogo** — creado (Borrador):

- Trigger: etiqueta **`buscar-catalogo`** añadida → acción **Webhook personalizado** POST
  `https://tierramadre.app/api/ghl-search-products`.

## 2 · Pasos manuales inmediatos (rápidos)

### WF-04 — terminar (≈2 min, a mano en el navegador)

1. Abrir **WF-04** → acción "Webhook personalizado" → **AUTORIZACIÓN** = **Bearer Token** →
   valor `{{custom_values.internal_api_secret}}`.
   _(No se pudo automatizar: es un `<select>` nativo dentro de un iframe cross-origin. A mano
   son 2 clics.)_
2. (Recomendado) Reemplazar el CUERPO DEL MENSAJE por:
   ```json
   { "intent": { "categoria": "{{contact.tipo_interes}}" },
     "presupuesto": {{contact.presupuesto_declarado}},
     "ciudad": "{{contact.ciudad}}" }
   ```
   y marcar **"Guardar la respuesta de este Webhook"** para usar `productos[]` en pasos siguientes.
   (El body por defecto también funciona para una prueba: el endpoint trata todos los campos como
   opcionales y devuelve los primeros productos publicados/disponibles.)
3. **Publicar** el workflow.
4. **Probar**: a un contacto de prueba (con `presupuesto_declarado` lleno) añadirle la etiqueta
   `buscar-catalogo` → confirmar **200 con `productos[]`** (en Vercel → Logs, o en el panel de
   ejecución del workflow). **401** = el secreto no coincide; **200** = ✓ cableado correcto.

### WhatsApp

- Solo esperar la aprobación de Meta de la plantilla `escalacion_asesor` (única Pendiente).

## 3 · Roadmap para completar el embudo (workflows)

Backend + canales listos ⇒ los workflows que estaban "bloqueados por Áreas 2/4" **ya se pueden
construir** (los endpoints existen y responden). Orden sugerido:

| WF                           | Qué hace                                                                      | Llama                     | Notas                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| **WF-08 Post-venta**         | pago confirmado → CK-03 + PV-01/02/03 + comisión embajador                    | (lo dispara mp-webhook)   | construir y copiar su **ID → `WF_POSTVENTA_ID`** en Vercel + redeploy |
| **WF-01 Nuevo contacto**     | entra lead por canal → crea contacto + tag canal + saludo (WA-01/IG-01/TT-01) | —                         | trigger: Inbound Message / Contact Created                            |
| **WF-03 Calificación IA**    | María hace las 4 preguntas, llena custom fields, añade `buscar-catalogo`      | Conversation AI           | encadena con WF-04                                                    |
| **WF-05 Carrito + checkout** | "lo quiero / cómo pago" → crea orden → manda link MP                          | `/api/ghl-create-order`   | usar el `init_point` **dinámico** por orden                           |
| **WF-06 Escalación**         | "humano/asesor/queja" → tag `pide-humano` (dispara WF-11) + pausa IA          | —                         |                                                                       |
| WF-02 / WF-07 / WF-12        | verificar embajador / regla 5 min / auto-invitación a eventos                 | endpoints estilo Supabase | WF-02 y WF-12 requieren endpoints aún no construidos                  |

## 4 · Flags (evitar trabajo redundante)

- **WF-13 (Ambassador Scoring) NO se construye en GHL** — ya corre como **cron de Convex**.
- **Carrito abandonado** = **cron de Convex** (`abandoned-cart`), no workflow GHL.
- **WF-05** manda el link de checkout **dinámico** (init_point por orden), **no** el custom value
  estático "MP Link Default".
- `lead_score` lo administra GHL (Settings → Manage Scoring) — el backend nunca lo escribe.

## 5 · Decisiones pendientes del cliente

- **Mapeo agente → rol**: agente_inversion / senior / premium / regular ↔ Felipe / Kevin / Sebastián.
- **Llenar custom values reales**: link `https://wa.me/573113052755`, handle de Instagram, email del equipo.
- **Swap MP**: pasar de credenciales de prueba (cuenta personal) a la cuenta MercadoPago oficial de
  Tierra Madre cuando termine su verificación (ver `docs/mercadopago-setup-and-swap.md`).

Hecho con verde esmeralda 💚

---

## Sesión 2026-07-03 (noche) — María conectada al funnel + Carrito "Colección + Asesor"

**El bloqueo histórico quedó resuelto: María ya dispara workflows.** Cambios aplicados en vivo:

1. **Prompt v2 aplicado** (Objetivos del bot): no promete enviar fotos/links ella misma (una línea de anuncio y el sistema entrega), 4 preguntas con short-circuit, regla de frustración (1 disculpa máx → escalar), sin referencias a internals, pagos SIEMPRE vía asesor. Naming cliente: **"colección"** (Vitrina queda como término interno). Fuente canónica: `GHL/output/bot-maria-prompt.md`.
2. **Acciones del bot configuradas** ("Activar un flujo de trabajo", 3 triggers):
   - *Enviar coleccion (calificacion completa)* → **WF-03** (actualiza bot/status → etapa Calificado por IA → encadena WF-04)
   - *Compra con asesor (Vitrina)* → **WF-05B** (cliente eligió pieza en la colección / quiere comprar)
   - *Escalación a humano* → **WF-06 + WF-11** (pide humano / queja / frustración / inversión >5M)
3. **WF-04 actualizado**: mensaje ahora envía UNA colección combinada `{{custom_webhook.1.response.vitrina_link}}` (`/v/{id1}-{id2}-{id3}`) + 3 líneas nombre/precio; se agregaron los pasos que faltaban: tag `productos-mostrados` + mover etapa a Producto Recomendado.
4. **WF-05B upgrade** (Published): al tag `quiere-comprar` → marca `quiere-comprar` (bookkeeping para enrolamiento directo del bot) → agrega `pide-humano` (encadena WF-06 pausa-María/etapa/ES-01 + WF-11 routing) → **notificación interna a todos los usuarios** ("🛒 Compra en Vitrina", redirect a la conversación).
5. **WF-05 convertido a herramienta manual del asesor**: trigger de tag ELIMINADO (el tag quiere-comprar es ahora de WF-05B) y **publicado**. El asesor confirma con el cliente, fija `producto_seleccionado_sku` y enrola manualmente al contacto en WF-05 → orden MP → CK-01 con `mp_url` → etapa Carrito Enviado + tag `carrito-enviado`.
6. **Deploy** (PR #51 → main → Vercel prod + Convex): vitrina pública `/v/` viva (verificado `/v/324` HTTP 200 sin login) y `searchProducts` devuelve `vitrina_link` combinado.

**Flujo carrito nuevo (decidido por Kevin):** el cliente ELIGE en la colección pública (CTA "Consultar por WhatsApp" → vuelve al mismo hilo, número de la casa) y el PAGO lo gestiona el asesor humano. María nunca envía links de pago.

**Pendiente:**
- E2E WhatsApp con contactos de prueba (Kevin Tres Toj / Juan Ma Escobar): calificación → WF-03/04 (colección con links públicos) → selección → WF-05B (notificación + pausa María) → asesor dispara WF-05 → MP link. Verificar tags/etapas en cada paso y que María no hable tras el handoff.
- Revisión profunda WF-01 / WF-08 / WF-11 (solo sanity de lista en esta sesión).
- Renombrar strings internos "Vitrina" → "colección" en notificación WF-05B y nombres de acciones (cosmético, staff-only).
- El webhook de WF-04 muestra un badge de aviso naranja en el editor — revisar en la primera ejecución real (probablemente solo warning de "guardar respuesta").
