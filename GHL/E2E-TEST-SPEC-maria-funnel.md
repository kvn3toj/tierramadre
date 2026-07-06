# SPEC — Prueba E2E real del embudo María (GHL / Progresy)

> **Objetivo:** verificar, con conversaciones reales contra el contacto de prueba **Kevin Tres Toj**,
> que cada paso del embudo Tierra Madre funciona de punta a punta — cada WF, cada tipo de producto,
> precios, tags, score y etapa de oportunidad — y que **lo que María/el sistema recomienda coincide
> exactamente con lo que muestra el link de la colección (Vitrina)**.
>
> **Este es el documento de "qué verificar" (criterios de aceptación).** El "cómo ejecutarlo"
> está en `E2E-TEST-PLAN-maria-funnel.md`.
>
> **Corte de contexto:** basado en `GHL/ESTADO-Y-PROXIMOS-PASOS.md` (última entrada 5 jul 2026) +
> validación cruzada de toda la carpeta `GHL/` (ver `VALIDATION-estado-vs-folder-2026-07-06.md`).
> **Sub-account:** `t3tOZBrR05jUoLqnDn4I` · https://app.progresy.ai
> **Backend prod:** Convex `wonderful-tortoise-984` · Vercel (main) · MercadoPago en **modo prueba**.
> **Agente María:** id `wMfconpBCdms3CprYrpc` · KB id `OHDQ6vwrSUBsPD5rwHlK`.

> **Jerarquía de fuentes** (ESTADO NO es autocontenido): AUDIT-2026-07-04 (estado vivo real) →
> ESTADO (cambios recientes + IDs) → SPEC-CONTINUACION + SETUP-SPEC-HTML (definiciones canónicas de WF/tags/campos) →
> output/bot-maria-prompt.md + output/whatsapp-templates.md (prompt/preguntas + plantillas/estado Meta) →
> BACKEND-ENDPOINTS-BLUEPRINT + SETUP-SPEC.md (contratos API + gate ≤2M) → LEARNINGS + tipo-interes-mapping.

## 0-bis. Riesgos conocidos que pueden invalidar la prueba (verificar PRIMERO)

1. **Plantillas WhatsApp: todas Tier-1 siguen `Pending` de Meta** (`output/whatsapp-templates.md`). Fuera de la ventana de 24 h, un envío por plantilla **fallará**. WF-04 CT-01 (`coleccion_disponible_wa`) y post-venta dependen de esto. CK-01 (WF-05) y ES-01 (WF-06) usan **free-form** (válido solo dentro de la ventana de 24 h). → **Mantener una conversación entrante fresca de Kevin abierta** para que la ventana de 24 h esté activa durante toda la prueba.
2. **WF-06 y WF-08 muestran 0 inscripciones** en el AUDIT del 4 jul pese a estar "en vivo" → posible trigger huérfano. Verificar que realmente disparan con `pide-humano` / `cliente-pago-confirmado`.
3. **Pool de agentes humanos NO existe** — solo 2 cuentas genéricas (`Direccion Tierra Madre`, `Comercializadora Tierra Madre`); no hay logins Felipe/Sebastián. → El **round-robin 3-vías de WF-11 no es real hoy**; verificar a quién asigna de verdad (probablemente alterna solo entre las 2 cuentas).
4. **María debe estar Active/Principal.** Si está Disabled/no-Principal, nada del embudo dispara para un inbound real. Confirmar antes de empezar (Suggestive Mode es la vía segura).
5. **Orden configurado de etapas del pipeline vs. orden real del embudo — riesgo de "moving backward" en WF-05.** El AUDIT del 4 jul confirma en vivo que "Ventas Tierra Madre" tiene las etapas en este orden posicional: `Nuevo Lead → Calificado por IA → Producto Recomendado → Carrito Enviado → Negociación / Agente → Venta Cerrada → Perdido / Nurturing` — **"Carrito Enviado" está posicionado ANTES que "Negociación / Agente"**. Pero la secuencia real del embudo es la inversa: WF-06 mueve la oportunidad a Negociación/Agente cuando el cliente pide humano, y solo después WF-05 la mueve a Carrito Enviado cuando el asesor arma el pedido a mano. Por posición configurada eso es ir de una etapa más adelantada a una más atrasada, y GHL bloquea moves hacia atrás. → **No verificado aún:** si el paso "mover a Carrito Enviado" de WF-05 falla en vivo con `"Moving a opportunity backward in the pipeline is not allowed"` **incluso corriendo WF-06 antes que WF-05 en el orden real de producción**, sería un **bug real de configuración de etapas del pipeline**, no un artefacto de orden de prueba (contrastar con el precedente ya documentado en `ESTADO-Y-PROXIMOS-PASOS.md`, donde el mismo mensaje SÍ fue un falso positivo por probar WF-03 sobre un contacto ya adelantado por una prueba de WF-05 fuera de orden). Ver criterio explícito en WF-05 (§2).

---

## 0. Reglas no negociables (leer antes de todo)

1. **Solo contactos de prueba:** Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga. **Nunca** leads reales.
2. **Publicar un WF = EN VIVO = WhatsApp real.** No publicar nada sin OK explícito del equipo en la sesión.
3. **"Success" en el log de GHL ≠ contenido correcto.** Verificar SIEMPRE el hilo real de WhatsApp / la página real, no solo el panel de ejecución.
4. **No mover oportunidades hacia atrás** en el pipeline (GHL lo bloquea) — respetar el orden real del embudo al probar.
5. **MercadoPago está en modo prueba** — no se completa un pago real; se verifica que el `mp_url`/`init_point` se genere y sea válido, no que entre dinero.
6. **Iframe de Progresy:** no redimensionar la ventana, no doble-click, dejar cargar ~15 s, hacer scroll del panel para levantar dropdowns recortados.

---

## 1. Arquitectura del embudo (referencia)

Orden real de producción (cada flecha es un punto de verificación):

```
Inbound → WF-01 (saludo + Nuevo Lead)
        → María califica (4 preguntas) → tag qualification_complete
        → WF-03 (activa María, etapa Calificado por IA, encadena WF-04)
        → WF-04 (webhook searchProducts → 3 piezas + vitrina_link → WhatsApp → tag productos-mostrados → etapa Producto Recomendado)
        → cliente elige en la colección pública (/v/…) → "Consultar por WhatsApp"
              → api/vitrina-select escribe producto_seleccionado_sku + tag quiere-comprar + tag pide-humano
        → WF-05B (bookkeeping + pide-humano → dispara WF-06 y WF-11 + notificación interna)
        → WF-06 (pausa María, etapa Negociación/Agente, WhatsApp ES-01)
        → WF-11 (routing round-robin: Dirección Tierra Madre / Sebastián / Comercializadora)
        → [asesor humano] fija producto_seleccionado_sku, enrola en WF-05
        → WF-05 (ghl-create-order → orden VO-xxxx + mp_url → CK-01 → order_id → etapa Carrito Enviado → tag carrito-enviado)
        → cliente paga (MP prueba) → mp-webhook → tag cliente-pago-confirmado
        → WF-08 (CK-03 confirmación → PV-02 entrega → PV-03 testimonio, etapa Venta Cerrada)
```

**IDs de workflow conocidos:**

| WF     | Nombre                      | ID                                             | Estado esperado                                                       |
| ------ | --------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| WF-01  | Nuevo contacto              | `c7e78b83-17c6-4fd6-b814-e968f77987a9`         | Published (AUDIT 4 jul; re-verificar por posible edición concurrente) |
| WF-03  | Calificación IA             | (trigger tag `qualification_complete`)         | Published (AUDIT 4 jul; re-verificar por posible edición concurrente) |
| WF-04  | Búsqueda en catálogo        | webhook `b26e3f2d-8f60-4b2b-aa7c-a8c5ddb56a84` | **Published**                                                         |
| WF-05  | Carrito + checkout          | `665ed7cd-4ce9-4a38-acd8-e50d8adf2c02`         | Published (herramienta manual del asesor)                             |
| WF-05B | Compra con asesor (Vitrina) | (Published)                                    | **Published**                                                         |
| WF-06  | Escalación                  | `1e3a2a49-a8ae-4d01-9da7-bb5b52e15b4c`         | Published (AUDIT 4 jul; re-verificar por posible edición concurrente) |
| WF-08  | Post-venta                  | `68e6c720-5232-4065-b1fb-d430928dbed2`         | Published (AUDIT 4 jul; re-verificar por posible edición concurrente) |
| WF-11  | Smart routing               | round-robin                                    | Published (AUDIT 4 jul; re-verificar por posible edición concurrente) |

> ⚠️ Una sesión concurrente ha estado editando WFs. **Verificar el estado real (Published/Draft) de cada WF al abrirlo**, no confiar en esta tabla.

---

## 2. Criterios de aceptación por workflow

Para cada WF: disparador correcto, cada paso ejecuta sin error, y el **efecto real** (tag/etapa/mensaje) es verificable fuera del log.

### WF-01 · Nuevo contacto

- [ ] Al crear el contacto de prueba, dispara.
- [ ] Envía `saludo_inicial_wa` con `{{contact.first_name}}` resuelto (nombre real, no el merge tag literal).
- [ ] Crea/actualiza oportunidad en **Ventas Tierra Madre / Nuevo Lead**.

### María · Calificación (Conversation AI)

- [ ] Hace las **4 preguntas** canónicas (fuente: `output/bot-maria-prompt.md`) con short-circuit si el cliente ya dio un dato:
  1. tipo de joya → `tipo_interes` (topito/candonga/anillo/dije/gema_suelta/set/otro)
  2. ocasión → tag de ocasión
  3. presupuesto COP → `presupuesto_declarado`
  4. ¿conoces las esmeraldas? → `conocimiento_esmeraldas` (novato/intermedio/experto/coleccionista)
- [ ] Rellena custom fields: `tipo_interes`, `presupuesto_declarado`, `conocimiento_esmeraldas`, y `ciudad` si se captura.
- [ ] Al completar, agrega tag **`qualification_complete`** (dispara WF-03).
- [ ] Regla de frustración: máx. 1 disculpa → escala (tag `pide-humano`).
- [ ] No promete enviar fotos/links ella misma; anuncia y el sistema entrega. Naming al cliente = "colección" (nunca "Vitrina").

### WF-03 · Calificación IA

- [ ] Dispara con `qualification_complete`.
- [ ] Acción "Update conversation AI bot and status" → Keep Same + **Active**.
- [ ] Mueve oportunidad → **Calificado por IA**.
- [ ] Encadena a **WF-04**.

### WF-04 · Búsqueda en catálogo ← **núcleo de la validación producto↔catálogo**

- [ ] Webhook POST a `/api/ghl-search-products` responde **200** con `productos[]` **no vacío** (3 piezas).
- [ ] Body enviado: `{"intent":{"categoria":"{{contact.tipo_interes}}"},"presupuesto":{{contact.presupuesto_declarado}},"ciudad":"{{contact.ciudad}}","contactId":"{{contact.id}}"}`.
- [ ] "Guardar la respuesta de este Webhook" activo.
- [ ] WhatsApp usa **tags indexados** (`.0.nombre`, `.0.precio_cop`, `.0.web_link`, `.1.`, `.2.`) — **NO** el array completo (renderiza `[object Object]`).
- [ ] `vitrina_link` = `/v/{id1}-{id2}-{id3}` y **lleva `?cid=`** (contactId embebido).
- [ ] Tag **`productos-mostrados`** aplicado.
- [ ] Oportunidad → **Producto Recomendado**.

### WF-05B · Compra con asesor (Vitrina)

- [ ] Dispara con tag **`quiere-comprar`** (lo escribe `api/vitrina-select` al tocar "Consultar por WhatsApp").
- [ ] Agrega tag **`pide-humano`** (encadena WF-06 + WF-11).
- [ ] **Notificación interna** a los usuarios ("🛒 Compra en Vitrina", con redirect a la conversación).
- [ ] Custom field **`producto_seleccionado_sku`** = el SKU de la pieza elegida.

### WF-06 · Escalación

- [ ] Dispara con `pide-humano`.
- [ ] **Pausa María** (Update AI bot/status → Inactive). **Verificar que María NO responde tras el hand-off.**
- [ ] Oportunidad → **Negociación / Agente**.
- [ ] WhatsApp **ES-01** (free-form) enviado.

### WF-11 · Smart routing

- [ ] Dispara con `pide-humano`.
- [ ] **Matriz de ruteo completa** (orden de evaluación, fuente `SPEC-CONTINUACION.md`):
  1. `embajador_asignado` no vacío → asignar ese embajador
  2. `tipo_interes=inversion AND presupuesto_declarado>5.000.000` → `agente_inversion`
  3. tag `urgencia` OR tag `queja` → `agente_senior`
  4. `lead_score>81` → `agente_premium`
  5. default → round-robin `agente_regular`
- [ ] ⚠️ **Realidad del pool:** hoy solo existen 2 cuentas (`Direccion Tierra Madre`, `Comercializadora Tierra Madre`). Verificar a quién asigna de verdad — el round-robin 3-vías del spec no es posible hasta ejecutar la Fase 9 (crear usuarios + tags `agente-*` + reglas de auto-asignación con SLA Senior 2m/Inversión 5m/Premium 10m/Regular 15m).

### WF-05 · Carrito + checkout (manual del asesor)

- [ ] Con `producto_seleccionado_sku` lleno, enrolar el contacto dispara el webhook `/api/ghl-create-order`.
- [ ] Responde `{order_id, mp_url}`; se genera orden **VO-xxxx** y `mp_url` real de MercadoPago (prueba).
- [ ] **Gate golden-rule ≤ 2M COP:** una pieza > 2.000.000 COP debe devolver el error de negocio mapeado (409 / `OVER_LIMIT_2M`), **no** un 500. Probar explícitamente una pieza cara.
- [ ] SKU inexistente → **409 `PRODUCT_NOT_FOUND`** (no 500).
- [ ] CK-01 (WhatsApp free-form) con `{{custom_webhook.1.response.mp_url}}` — link correcto por-orden (no el genérico).
- [ ] Custom field `order_id` = VO-xxxx.
- [ ] Oportunidad → **Carrito Enviado**; tag **`carrito-enviado`**.
- [ ] ⚠️ **Riesgo #5 del §0-bis — orden de etapas:** si este paso falla con `"Moving a opportunity backward in the pipeline is not allowed"` **después de que WF-06 ya movió la oportunidad a Negociación/Agente en esta misma corrida** (orden real de producción respetado), es el **bug real de configuración del pipeline** (Carrito Enviado posicionado antes que Negociación/Agente) — repórtalo como tal, **no** lo descartes como "orden de test mal armado". Ese descarte solo aplica al escenario distinto ya documentado en `ESTADO-Y-PROXIMOS-PASOS.md`: ahí el error fue un falso positivo porque WF-03/WF-05 se probaron fuera de su orden real sobre un contacto que ya venía adelantado por una prueba anterior — no por correr WF-06 antes que WF-05 como manda el flujo real.

### WF-08 · Post-venta

- [ ] Dispara con tag **`cliente-pago-confirmado`** (lo agrega `api/mp-webhook` al confirmar pago).
- [ ] CK-03 `confirmacion_pago_wa` → esperar 1 día → PV-02 `postventa_entrega_wa` → esperar 7 días → PV-03 `postventa_testimonio_wa`.
- [ ] Oportunidad → **Venta Cerrada**. Backend ya escribió `total_comprado_cop` + `ultima_compra_fecha`.

---

## 3. Cobertura por tipo de producto

Correr el embudo (al menos hasta WF-04 + verificación de colección) para cada `tipo_interes`, cruzando con las categorías reales del catálogo:

| `tipo_interes` (dropdown real) | Categoría(s) esperada(s) en catálogo            | Verificar                                                         |
| ------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------- |
| `anillo`                       | Anillo en Oro / Anillo en Plata                 | 3 piezas son anillos o degradación por presupuesto documentada    |
| `topito`                       | Topitos / Aretes                                | idem                                                              |
| `candonga`                     | Aretes                                          | idem                                                              |
| `dije`                         | Dije / Gola                                     | idem                                                              |
| `gema_suelta`                  | Gema / Gema Facetada / Piedra Natural / Piedras | idem                                                              |
| `set`                          | Joyas / combinación                             | idem                                                              |
| `otro`                         | —                                               | comportamiento de fallback                                        |
| (lotes)                        | Lote de Gemas                                   | verificar ruteo a humano (María enruta lotes/inversión a experto) |

Para **cada** corrida:

- [ ] Las 3 piezas devueltas existen en `/treasure` (catálogo real) con el **mismo nombre**.
- [ ] `precio_cop` del WhatsApp == precio de la página `/v/{id}` == precio en `/treasure`.
- [ ] Todas están **DISPONIBLE** y **publicadas** (`mostrarEnCatalogo`).
- [ ] Respetan el **presupuesto declarado** (ninguna por encima; si la pasada estricta por categoría da vacío, degrada a "dentro de presupuesto" — comportamiento esperado, documentarlo).
- [ ] `tipo_interes` sube el ranking pero **no excluye** (fix de degradación elegante).

---

## 4. Cobertura de precios

- [ ] **Presupuesto muy bajo** (ej. 50.000 COP): el sistema no ofrece piezas inexistentes; María es honesta (piso real ≈ 250.000 COP en el catálogo actual).
- [ ] **Presupuesto medio** (ej. 2–5M): devuelve piezas dentro de rango.
- [ ] **Presupuesto alto / pieza > 2M**: WF-05 debe **bloquear** la orden por el gate ≤ 2M COP (verificar el 409, no 500).
- [ ] **Sin presupuesto declarado:** verificar el fix "sin-presupuesto → más-barato-primero" (no debe rankear la más cara primero).
- [ ] Consistencia de cifra en los 3 lugares: WhatsApp ↔ página `/v/` ↔ `/treasure`.

---

## 5. Tags — inventario a verificar (aplicado/removido en el momento correcto)

| Tag                               | Quién lo agrega              | Efecto                    |
| --------------------------------- | ---------------------------- | ------------------------- |
| `qualification_complete`          | María                        | dispara WF-03             |
| `buscar-catalogo`                 | (WF-03/María)                | dispara WF-04 (histórico) |
| `productos-mostrados`             | WF-04                        | bookkeeping / scoring     |
| `quiere-comprar`                  | `api/vitrina-select`         | dispara WF-05B            |
| `pide-humano`                     | `api/vitrina-select` / María | dispara WF-06 + WF-11     |
| `carrito-enviado`                 | WF-05                        | +30 score                 |
| `cliente-pago-confirmado`         | `api/mp-webhook`             | dispara WF-08, +50 score  |
| `link-catalogo`                   | trigger link click           | +10 score                 |
| `canal-whatsapp/instagram/tiktok` | WF-01 (refinamiento)         | ramificación por canal    |

- [ ] Cada tag aparece en el contacto **en el paso correcto** y no antes.
- [ ] `pide-humano` efectivamente pausa a María.

## 6. Score (Manage Scoring · perfil "Engagement Score", `/settings/scoring`)

Verificar que el `lead_score` de Kevin sube/baja según las reglas al avanzar el embudo:

| Regla                          | Peso | Cómo verificar                             |
| ------------------------------ | ---- | ------------------------------------------ |
| Email abierto                  | +5   | (opcional)                                 |
| Link clicked (`link-catalogo`) | +10  | clic real al link de catálogo              |
| Form submitted (RSVP Evento)   | +20  | (opcional)                                 |
| Appointment confirmed          | +25  | (opcional)                                 |
| SMS reply + tag                | +15  | (opcional)                                 |
| Booked appointment             | +25  | (opcional)                                 |
| `carrito-enviado`              | +30  | tras WF-05                                 |
| `cliente-pago-confirmado`      | +50  | tras pago MP prueba                        |
| Payment Received (nativo GHL)  | +50  | (no aplica — TM cobra por MP)              |
| `sin-respuesta-7d`             | −10  | cron Convex (no nativo) — verificar aparte |

- [ ] El score refleja las reglas activas tras cada hito (carrito, pago).
- [ ] Anotar el score **antes/después** de cada tag de scoring.

## 7. Pipeline "Ventas Tierra Madre" — etapas a verificar

Confirmar que la oportunidad de Kevin transita, en orden y sin saltos hacia atrás:

`Nuevo Lead → Calificado por IA → Producto Recomendado → Negociación/Agente → Carrito Enviado → Venta Cerrada`

- [ ] Cada transición ocurre en el WF correcto.
- [ ] Ninguna transición produce error "moving backward" **salvo el caso cubierto en el riesgo #5 (§0-bis) y en WF-05 (§2)**: un "moving backward" en la transición Negociación/Agente → Carrito Enviado, ocurriendo DESPUÉS de WF-06 en el orden real, no es un artefacto de orden de test — es el bug de configuración de etapas a reportar. Cualquier otro "moving backward" (p. ej. probar un WF fuera de su orden real sobre un contacto ya adelantado) sí implica orden de test mal armado, no bug.

---

## 8. Custom fields a inspeccionar en el contacto

`tipo_interes`, `presupuesto_declarado`, `conocimiento_esmeraldas`, `ciudad`, `producto_seleccionado_sku`, `order_id`, `total_comprado_cop`, `ultima_compra_fecha`, `lead_score`.

- [ ] Cada uno se llena en su paso y con el valor esperado.

---

## 8-bis. Contratos de API a validar (fuente: BACKEND-ENDPOINTS-BLUEPRINT + SETUP-SPEC)

**`POST /api/ghl-search-products`** (WF-04) — auth header `Authorization: Bearer {{custom_values.internal_api_secret}}`.

- Body: `{"intent":{"categoria":"<tipo_interes>"},"presupuesto":<num>,"ciudad":"<str>","contactId":"<id>"}`.
- Respuesta 200: `{"success":true,"productos":[{nombre,precio_cop,web_link,foto_url,…}×3],"vitrina_link":"…/v/{id1}-{id2}-{id3}?cid=…"}`.
- 401 = secreto no coincide.

**`POST /api/ghl-create-order`** (WF-05) — mismo header.

- Body: `{"contact":{celular,full_name,email},"items":[{"sku":"<producto_seleccionado_sku>","qty":1}]}`.
- Éxito: `{order_id:"VO-xxxx", mp_url:"<init_point MP>"}`.
- **Errores de negocio como 409 (deben venir de `ConvexError.data`, no 500):** `PRODUCT_NOT_FOUND`, `NOT_AVAILABLE`, `EMPTY_ITEMS`, **`OVER_LIMIT_2M`** (total > 2.000.000 COP → `{reason:"OVER_LIMIT_2M", redirect_to_human:true}`). El gate ≤2M es **server-side**; el prompt de María es solo pista de UX.
- **Prueba obligatoria:** una pieza > 2M debe dar 409 (no 500) — regresión histórica ya arreglada, re-verificar.

**`POST /api/mp-webhook`** — al confirmar pago MP (prueba) agrega tag `cliente-pago-confirmado` (dispara WF-08) y escribe `total_comprado_cop` + `ultima_compra_fecha`. Idempotente (`UNIQUE(order_id)`).

## 9. Salida esperada de la prueba

Un reporte (`docs/e2e-maria-funnel-report-<fecha>.md`) con:

- Tabla WF × resultado (✅/❌/⚠️) con evidencia (texto real del WhatsApp, no el log).
- Tabla tipo-de-producto × (piezas devueltas, existen en catálogo, precios consistentes).
- Discrepancias de precio/tag/score/etapa, con captura o cita del hilo real.
- GIFs de los flujos críticos (WF-04 y el hand-off WF-05B→WF-06).
- Lista de bugs nuevos con causa raíz probable y punto de enchufe en código.
