# Auditoría completa en vivo — Progresy/GHL · 6 jul 2026 (tarde)

> Auditoría hecha vía Claude-in-Chrome sobre la sesión logueada de Progresy
> (sub-account `t3tOZBrR05jUoLqnDn4I`). Solo lectura — **no se modificó nada**.
> Objetivo: configuración profesional + más conversión de leads a compradores.

---

## 1. Estado verificado de workflows (en vivo, hoy)

| WF | Estado | Inscritos | Notas |
|---|---|---|---|
| WF-01 · Nuevo contacto | Published | 24→25 (subió durante la auditoría) | Trigger `Contacto Creado` SIN filtros → WhatsApp (template `saludo_inicial_wa`) → Crear oportunidad |
| WF-03 · Calificación IA | Published | 14 | — |
| WF-04 · Búsqueda en catálogo | Published | 20 | Actualizado HOY 3:35 PM (sesión concurrente) |
| WF-05 · Carrito y checkout | Published | 2 | 🚨 **2 errores sin resolver del 4 jul** (ver §2.1) |
| WF-05B · Compra con asesor | Published | 3 | — |
| WF-06 · Escalación | Published | 4 | Ya NO está en 0 (corrección al ESTADO doc) |
| WF-08 · Post-venta | Published | — | No aparece en la lista raíz pero EXISTE (accesible por ID); 1 cliente real dentro del "Esperar 7 días" |
| WF-10 / WF-10B · RSVP Evento(s) | Draft | 0 | — |
| WF-11 · Smart Routing | **Published** | 4 | tag `pide-humano` → Assign to user → END (mínimo, no es "smart") |
| WF-12 · Nuevo Lead → Activo (respuesta) | **Published** | 11 (2 activos) | Nuevo (4 jul, sesión concurrente) — ver §2.4 |
| WF-13 · Respuesta detectada → Activo | **Published** | 7 | Nuevo (4 jul) — no inspeccionado en detalle |
| WF-14 · Registrar valor de oportunidad | Draft | 0 | Publicarlo arregla el problema de $0.00 (§2.3) |
| "New Workflow : 1783364699141" | Draft | 0 | Basura creada hoy 12:04 PM — borrar |

**María (Conversation AI):** Principal · **Piloto automático** · canales SMS, IG, FB, chat widget, live chat, WhatsApp · GPT-4.1 · editada HOY 5:52 PM. Dashboard (1–6 jul): 19 contactos únicos, 104 mensajes, 20 acciones, **0 citas reservadas**. Acciones: 3 workflows, captura de 2 campos de contacto, 1 transferencia a humano. **Apagados:** Reserva de citas, Seguimiento automático, resumen de conversaciones. Bot "Gemita" apagado (placeholder).

**Pipeline "Ventas Tierra Madre"** (27 oportunidades): `Nuevo Lead(1) → Calificado por IA(0) → Producto Recomendado(4) → Carrito Enviado(0) → Negociación/Agente(1) → Venta Cerrada(1) → Perdido/Nurturing(0) → ACTIVO(9) → INACTIVOS(11)`. **Todas con valor $0.00.**

**WF-01 WhatsApp stats:** 21 total · 21 sent · 21 delivered · 14 read · **0 failed** ⇒ **`saludo_inicial_wa` SÍ está aprobada y entregando** (corrige la duda "todas Pending" del ESTADO doc, al menos para esta plantilla).

---

## 2. Hallazgos CRÍTICOS (bloquean ventas hoy)

### 2.1 🚨 P0 — WF-05 checkout roto en la secuencia real (confirmado en logs, ya no es hipótesis)
Pestaña "Requiere revisión (1)" → WF-05 con errores del **4 jul 4:38 PM** (contacto de prueba Juan Ma Escobar):

1. `#1 Crear orden (ghl-create-order)` → **Failed**: `{"success":false,"error":"PRODUCT_UNAVAILABLE",...}` — la pieza elegida estaba vendida/no disponible. El flujo siguió, pero **el cliente no recibe NINGÚN mensaje** en este caso: silencio total tras decir "quiero comprar".
2. `Mover a Carrito Enviado` → **Error**: **"Moving a opportunity backward in the pipeline is not allowed."** — el riesgo #3 del ESTADO doc queda **CONFIRMADO en producción**: como "Carrito Enviado" está ANTES de "Negociación/Agente" en el orden de etapas, toda venta que pase por escalación (WF-06) y luego checkout (WF-05) revienta aquí.

**Fix propuesto (config, 2 cambios):**
- Reordenar etapas del pipeline: mover "Carrito Enviado" DESPUÉS de "Negociación/Agente" (refleja el uso real: escalación → asesor arma pedido → carrito).
- En WF-05, añadir rama de error del webhook: si `success=false` → WhatsApp al cliente ("esa pieza acaba de venderse 😔, te muestro opciones similares…") + tag `producto-no-disponible` + notificación interna. Hoy la interacción con VENDIDAS (§2.2) hace este caso MÁS probable, no menos.

### 2.2 🚨 P0 — Interacción rota: Vitrina ahora muestra VENDIDAS + vitrina-select dispara compra
La feature nueva (mostrar piezas VENDIDAS como referencia) + `api/vitrina-select.ts` (tag `quiere-comprar` automático al tocar "Consultar por WhatsApp") + WF-05 (trigger `quiere-comprar`) = un cliente que toca una pieza vendida entra DIRECTO al checkout de una pieza incomprable → PRODUCT_UNAVAILABLE → silencio. Exactamente lo que pasó en el test del 4 jul.
**Fix:** rama de error de §2.1 + (mejor) en `vitrina-select` no aplicar `quiere-comprar` si `disponible=false` — en su lugar tag `interes-pieza-vendida` → workflow que ofrezca similares (búsqueda WF-04 con la categoría de esa pieza).

### 2.3 P1 — Oportunidades sin valor ($0.00 en las 27)
Reporting de revenue ciego; Manage Scoring y decisiones de inversión en ads sin datos. **Fix:** publicar WF-14 · Registrar valor de oportunidad (ya construido, Draft) tras revisarlo.

### 2.4 P1 — Funnel fragmentado por etapas ACTIVO / INACTIVOS
20 de 27 oportunidades viven en 2 etapas nuevas (ACTIVO=9, INACTIVOS=11) creadas por la sesión del 4 jul, fuera del funnel de ventas. Además WF-12 mueve/crea oportunidades ahí. Consecuencias: el Kanban ya no representa el embudo, y cualquier "mover a X" desde workflows puede chocar de nuevo con la regla de "no retroceder".
**Decisión requerida:** o (a) ACTIVO/INACTIVOS se convierten en un pipeline SEPARADO de "engagement" (recomendado — GHL soporta multi-pipeline), o (b) se eliminan y ese estado se maneja con tags (`bot-activo`/`inactivo`), que no tienen restricción de orden.

### 2.5 P1 — WF-12 hace seguimiento a las 8h… sin mensaje
La rama "No respondió (sigue en Nuevo Lead)" solo crea/actualiza oportunidad y quita un tag. **No envía nada al lead.** El 80% de los leads se pierden en los primeros minutos/horas; este es EL punto para un follow-up real.
**Fix:** añadir WhatsApp de re-enganche en esa rama (plantilla suave: "¿Sigues por aquí? Tengo 3 piezas que encajan con lo que buscabas 💚") + segunda espera de 24–48h con segundo toque. Cuidado con ventana 24h de WhatsApp: a las 8h aún está abierta; el toque de 48h necesita plantilla aprobada.

---

## 3. Mejoras de conversión (no bloqueantes, alto impacto)

1. **Activar "Seguimiento automático" de María** (hoy OFF): María retoma sola conversaciones que se enfrían — es la palanca más directa de "más clientes que realmente compran" en el corto plazo.
2. **Activar "Reserva de citas"** (hoy OFF, 0 citas en el dashboard): para piezas >X COP, ofrecer videollamada con asesor en vez de solo chat. Joyería de lujo cierra por relación, no por link.
3. **WF-01 sin filtros de trigger:** cualquier contacto creado (import, manual, API) recibe el saludo de marketing. Añadir filtro (p.ej. excluir tag `no-saludo` / source manual-import) antes de la próxima importación masiva — riesgo de blast accidental.
4. **Enable Branches en el WhatsApp de WF-01** (hoy OFF): `saludo_inicial_wa` termina preguntando "¿una pieza para ti, un regalo…?" — con quick-reply buttons + branches, la calificación arranca con un tap (menos fricción que texto libre) y alimenta directo el FLUJO DE CALIFICACIÓN de María.
5. **WF-11 "Smart Routing" no es smart:** tag `pide-humano` → assign único → END. Cuando exista el pool de agentes (Fase 9, pendiente), convertir en round-robin con SLA. Mientras tanto: añadir notificación interna (email/push al asignado) — hoy nadie se entera del hand-off salvo mirando la bandeja. Read-rate del saludo 14/21 (67%) pero 111+ conversaciones en espera históricas.
6. **Los 2 cableados pendientes del 6 jul siguen pendientes en WF-04** (verificado en el body del webhook): tiene `contactId` ✓ pero **NO tiene `priceTier`** — el presupuesto cualitativo ("precio moderado") sigue sin llegar al backend. El merge tag `nota_disponibilidad` SÍ está ya en el mensaje ✓ (lo agregó la sesión de hoy 3:35 PM) — **pero depende de que el código Convex del 6 jul esté desplegado; si no, el tag rinde vacío**. Confirmar deploy antes de confiar en él.
7. **Borrar el Draft basura** "New Workflow : 1783364699141" (hoy 12:04 PM).
8. **Higiene de documentación:** WF-11/12/13 Published y las etapas ACTIVO/INACTIVOS no existen en ningún doc de `GHL/` — la sesión concurrente va por delante del repo. Registrar en ESTADO doc.

---

## 4. Verificaciones que quedaron pendientes (no accesibles/no cubiertas hoy)

- Estado real en Meta Business Manager de las demás plantillas Tier-1 (ES-01, PV-02, PV-03, CK-03, CT-01). WF-06/WF-08 ya tienen tráfico real — revisar sus stats de entrega igual que se hizo con WF-01.
- WF-13 nodo a nodo; asignado exacto del "Assign to user" de WF-11.
- Manage Scoring (9/9 reglas según docs — no re-verificado hoy).
- Si el deploy de Convex del 6 jul (VENDIDA + precio cualitativo) llegó a producción.

---

## 5. Plan de acción propuesto (orden sugerido)

| # | Acción | Tipo | Riesgo |
|---|---|---|---|
| 1 | Reordenar pipeline: "Carrito Enviado" después de "Negociación/Agente" | Config GHL | Bajo (verificar que ningún workflow asuma el orden viejo) |
| 2 | Rama de error en WF-05 (webhook fail → WhatsApp "pieza vendida" + tag) | Config GHL | Bajo |
| 3 | No disparar `quiere-comprar` para piezas vendidas en `vitrina-select` | Código (repo) | Bajo |
| 4 | Mensaje de re-enganche en WF-12 rama "No respondió" | Config GHL | Medio (mensaje real a leads) |
| 5 | Activar Seguimiento automático de María | Config GHL | Medio (mensajes reales) |
| 6 | Publicar WF-14 (valor de oportunidad) tras revisión | Config GHL | Bajo |
| 7 | Filtro de trigger en WF-01 | Config GHL | Bajo |
| 8 | `precio_tier`: crear campo + añadir al body de WF-04 + prompt de María | Config GHL | Bajo (requiere deploy Convex primero) |
| 9 | Decidir destino de ACTIVO/INACTIVOS (pipeline separado vs tags) | Decisión negocio | — |
| 10 | Borrar Draft basura + actualizar ESTADO doc | Higiene | Nulo |

> Regla vigente: cualquier prueba SOLO con Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga.

---

## 6. Cambios APLICADOS en vivo esta sesión (6 jul, tarde)

1. ✅ **Pipeline reordenado** — "Carrito Enviado" ahora va DESPUÉS de "Negociación / Agente" (arregla la mitad "backward move" del P0 §2.1). Guardado en vivo.
2. ✅ **WF-01 filtro anti-blast** — trigger `Contacto Creado` ahora tiene filtro `Etiqueta · Ninguno de · no-saludo` (tag `no-saludo` creado). Guardado y publicado.
3. ✅ **WF-12 mensaje de re-enganche** — nueva acción `FU-01 · Re-enganche 8h` (WhatsApp free-form) en la rama "No respondió", ANTES de crear/actualizar oportunidad. Cierra el gap §2.5. Guardado.
4. ✅ **María · Seguimiento automático ENCENDIDO** — escenario "El Contacto Dejó de Responder" (Seguimiento 1 = 15 min, IA envía el mensaje). Cierra la mejora §3.1. Guardado.
5. ✅ **Draft basura borrado** ("New Workflow : 1783364699141").

### ⏳ Quedó pendiente / bloqueado

- **WF-14 (valor de oportunidad)**: está VACÍO (solo trigger `Presupuesto declarado COP cambió`, sin acciones) → no publicable tal cual. Necesita construir la acción "Crear/actualizar oportunidad" con Monetary Value = `{{contact.presupuesto_declarado}}` (o el valor real de venta) + decisión de a qué etapa/valor mapear. Sin esto las 27 oportunidades siguen en $0.00 (§2.3).
- **WF-05 rama de error (P0 §2.1/§2.2)**: NO se pudo hacer como config pura. El nodo If/Else de GHL solo expone campos de Contacto/Oportunidad/Cita — **no** la respuesta del webhook (`custom_webhook.1.response.mp_url`/`success`). Para avisar al cliente cuando la pieza está vendida hace falta primero que `api/ghl-create-order` escriba un custom field (p.ej. `order_status` o `mp_url`) en el contacto; luego el If/Else puede ramificar sobre ese campo. Es cambio de código (repo), no de Progresy. WF-05 quedó intacto (no se dejó ningún nodo a medias).
- **`precio_tier` en WF-04** (§3.6): sigue pendiente — requiere deploy del código Convex del 6 jul primero.
