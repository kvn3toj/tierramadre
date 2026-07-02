# Progresy / GoHighLevel — Estado y próximos pasos

> Corte: **30 jun 2026**. Tras conectar MercadoPago, sincronizar el secreto interno y
> verificar canales. Sub-account: `t3tOZBrR05jUoLqnDn4I` · https://app.progresy.ai

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
1. WF-04 · enviar los 3 productos (desbloqueado por el fix de catálogo, ya en vivo):
   - Abrir WF-04 → acción Webhook (ghl-search-products) → activar "Guardar la respuesta de este Webhook".
   - Añadir pasos: enviar WhatsApp con los 3 productos (nombre, precio_cop, foto_url, web_link), mover
     oportunidad → "Producto Recomendado", tag productos-mostrados.
   - (No hay plantilla Meta de "3 productos" → free-form dentro de la ventana de 24 h, o registrar una plantilla.)
2. Publicar WF-08 Post-venta (id 68e6c720-5232-4065-b1fb-d430928dbed2): publicar → copiar el ID a
   WF_POSTVENTA_ID en Vercel (env Production) → redeploy. Opcional paso embajador EM-02.
3. Publicar WF-06 Escalación (id 1e3a2a49-a8ae-4d01-9da7-bb5b52e15b4c): publicar → confirmar que María
   etiqueta pide-humano al escalar.
4. Publicar WF-01 Nuevo contacto (id c7e78b83-17c6-4fd6-b814-e968f77987a9): revisar branching por canal +
   saludo; publicar.
5. Manage Scoring (/settings/scoring): reponderar las 3 reglas en +1 (cita confirmada; resp+tag → SMS +15;
   cita agendada → +25); añadir email link-clicked +10, sin-respuesta-7d −10, tag cliente-pago-confirmado +50,
   tag carrito-enviado +30. GOTCHA: "Edit" DUPLICA la regla → agregar nueva + borrar la vieja (menú "…" → Delete).

DECISIONES DE NEGOCIO PENDIENTES (no tomarlas solo/a — preguntar al equipo):
- Mapa tipo_interes → colección/forma (para que WF-04 rankee por categoría con sentido; hoy degrada a presupuesto).
- WF-05 carrito: falta custom field producto_seleccionado_sku (qué pieza quiere) antes del webhook ghl-create-order.
- Mapeo agente→rol para la matriz completa de WF-11 (agente_inversion/senior/premium ↔ Felipe/Kevin/Sebastián).
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
