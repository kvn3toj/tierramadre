# Validación — ¿`ESTADO-Y-PROXIMOS-PASOS.md` tiene el contexto y las tareas completas?

**Fecha:** 2026-07-06 · **Método:** relectura de TODOS los archivos de `GHL/` (incluidos los `.html` y `output/`) y contraste contra `ESTADO-Y-PROXIMOS-PASOS.md`.

## Veredicto: **NO es un superconjunto completo.**

ESTADO es un **changelog de sesiones** excelente y autoritativo para el **estado vivo actual, IDs de workflow, bugs encontrados/arreglados esta semana y el detalle de construcción de WF-04/05/05B/06/08**. Pero **no es una especificación autocontenida**: por sus propias palabras es un índice que apunta a otros archivos ("ver `tipo-interes-mapping-analysis.md`", "Fuente canónica: `output/bot-maria-prompt.md`"). Detalle canónico y tareas abiertas viven **solo** fuera de ESTADO. Para una prueba E2E o para retomar el proyecto **hay que leer también** los archivos de abajo.

## Detalle canónico que vive SOLO fuera de ESTADO

- **`SPEC-CONTINUACION.md`** — definiciones ejecutables completas de **WF-01…WF-13** (triggers + pasos + bodies). ESTADO solo narra los WF que tocó (01/03/04/05/05B/06/08); **no tiene spec de WF-02, 07, 09, 10, 12, 13**. Incluye la **matriz completa de ruteo WF-11** (orden de evaluación):
  1. `embajador_asignado` no vacío → asignar ese embajador
  2. `tipo_interes=inversion AND presupuesto_declarado>5.000.000` → `agente_inversion`
  3. tag `urgencia` OR tag `queja` → `agente_senior`
  4. `lead_score>81` → `agente_premium`
  5. default round-robin → `agente_regular`
  Además: 14 custom fields (keys exactas), desglose de ~48 tags por 8 grupos, 18 snippets (WA-01…R-04), 10 custom values, Private Integration Token + scopes.
- **`SETUP-SPEC-HTML.md` §3.4** — **strings exactos de los 48 tags** (forma larga: `canal-whatsapp`, `agente-premium/-inversion/-senior/-regular`, `lead-nuevo`, `lead-frio`, etc.). ESTADO nunca los lista verbatim.
- **`manual-ghl-paso-a-paso.html`** — versión autoritativa de los 14 campos; **Fase 9** = setup del pool de agentes humanos (crear 4 empleados, tags de pool, 4 reglas de auto-asignación con SLA: Senior 2m / Inversión 5m / Premium 10m / Regular 15m) — **nunca ejecutado**.
- **`output/whatsapp-templates.md`** — cuerpos de plantillas + nombres Meta + **estado de aprobación**. ⚠️ **Todas las Tier-1 siguen `Pending` de Meta** (no aprobadas): `saludo_inicial_wa`, `pieza_lista_pago_wa`(CK-01), `confirmacion_pago_wa`(CK-03), `escalacion_asesor_wa`(ES-01), `postventa_entrega_wa`(PV-02), `postventa_testimonio_wa`(PV-03), y la nueva **`coleccion_disponible_wa`(CT-01)** del 4 jul. ESTADO da a entender que algunas están aprobadas — **contradicción**.
- **`output/bot-maria-prompt.md`** — prompt v1 y v2 verbatim, las **4 preguntas de calificación**, reglas de escalación y la tabla de **acciones del bot**. Agent ID `wMfconpBCdms3CprYrpc`, KB ID `OHDQ6vwrSUBsPD5rwHlK`. Las 4 preguntas: (1) tipo de joya → `tipo_interes`; (2) ocasión → tag; (3) presupuesto COP → `presupuesto_declarado`; (4) ¿conoces las esmeraldas? → `conocimiento_esmeraldas` (novato/intermedio/experto/coleccionista).
- **`tipo-interes-mapping-analysis.md`** — conclusión: el mapeo `tipo_interes`→`categoria` **no es derivable empíricamente** (ejes ortogonales; catálogo ~93% gema suelta). Solo `gema_suelta`→`Gema Facetada` es débilmente defendible. Requiere campo real `formaJoya`/`tipoJoya` o mapa a mano del equipo. Enchufe: `convex/_lib/productSearch.ts::rankProducts`.
- **`BACKEND-ENDPOINTS-BLUEPRINT.md`** — contratos de `/api/ghl-match-ambassador` y `/api/ghl-auto-event-invite` (para WF-02/07/12, aún no construidos) + **13 preguntas de negocio (Q-A1..A5, Q-B1..B8)** por firmar antes de codear.
- **`SETUP-SPEC.md` / `06-FLUJOS-CONEXION.md`** — el **gate ≤2M COP** (server-side) y las golden rules (rate limit GHL 100 req/10s, one-writer-per-field, webhook de pago idempotente).
- **`LEARNINGS-2026-07-03-vitrina-rango-disponibilidad.md`** — links `/v/` por id-list son **inmutables y no revocables**; piezas VENDIDAS **sí** se comparten por `/v/` (sin badge "vendido"); regla de rango de precio de la colección **~0.8×–1.2×** del presupuesto; agregar línea "Disponibilidad sujeta a confirmación con tu asesor 💚".

## Contradicciones / info desactualizada (usar la fuente más nueva/viva)

1. **Estado Publicado vs Borrador:** las propias entradas de ESTADO se contradicen entre sesiones. El **AUDIT (4 jul, en vivo)** confirma WF-01/03/04/05/05B/06/08 **Published** con conteos de inscripción (WF-01=13, WF-03=2, WF-04=8, WF-05=1, **WF-05B=0, WF-06=0, WF-08=0**). → **Re-verificar cada WF en vivo**; confiar en el AUDIT sobre las notas de mitad de sesión de ESTADO.
2. **WF-06 y WF-08 con 0 inscripciones** pese a estar "en vivo" desde el 1–2 jul → posible recurrencia del bug de trigger huérfano. **Verificar con una escalación y una venta de prueba reales.**
3. **Plantillas "aprobadas" vs "Pending":** `output/whatsapp-templates.md` (más nuevo) dice **todas Pending Meta**. Tratar como Pending hasta verificar en Meta. CK-01 (WF-05) y ES-01 (WF-06) en realidad envían **free-form**, no la plantilla.
4. **Pool de agentes humanos NO existe:** solo 2 cuentas genéricas (`Comercializadora Tierra Madre`, `Direccion Tierra Madre`). No hay logins Felipe/Sebastián → **el round-robin 3-vías de WF-11 es técnicamente imposible hoy** (Fase 9 nunca corrió). ESTADO implica un round-robin funcional.
5. **`tipo_interes` valores reales:** `topito, candonga, anillo, dije, gema_suelta, set, otro`. Los valores de intención (`inversion/anillo/esmeralda/regalo`) y el `gema`-único de `area-3-gohighlevel.html` están **obsoletos**.
6. **Deriva de arquitectura:** `00-INDICE`, `01-GHL`, `04/05/06`, `SPEC-CONTINUACION`, `SETUP-SPEC.md` describen **Supabase + Cloudflare Workers**; el sistema vivo es **Convex (`wonderful-tortoise-984`) + Vercel** y endpoints `/api/ghl-*`. Tratar todo lo de Supabase/Cloudflare como histórico.
7. **Etapas del pipeline:** nombre exacto y orden `Nuevo Lead → Calificado por IA → Producto Recomendado → Negociación/Agente → Carrito Enviado → Venta Cerrada → Perdido/Nurturing` (Pipeline ID `u4MPXH2HdEFmU3vVqNdd`). ⚠️ AUDIT/SPEC-CONTINUACION listan "Carrito Enviado" **antes** de "Negociación/Agente" — quirk de orden a verificar en vivo.

## Tareas abiertas que ESTADO NO captura (o solo menciona de pasada)

- Construir **WF-02 (verificar embajador)**, **WF-07 (regla 5 min)**, **WF-12 (auto-invitación eventos)** — requieren endpoints del BLUEPRINT + resolver Q-A1..A5 / Q-B1..B8.
- Completar **WF-09** (ramas 30/60d, nurturing) y **WF-10** (tag dinámico `evento-{slug}-rsvp`, QR, recordatorios 3d/1d/2h).
- **Crear el pool de agentes humanos (Fase 9)** para que WF-11 funcione de verdad.
- Confirmar aprobación Meta de `escalacion_asesor` y decidir **PV-01 "cuidados día 1"**.
- Resolver el mapeo `tipo_interes→categoria` con firma de negocio.
- Verificar por qué **WF-06/08 tienen 0 inscripciones**.

## Conclusión operativa

Para retomar o para la prueba E2E, la **jerarquía de fuentes** es:
1. **AUDIT-2026-07-04** → estado vivo real (conteos, Published/Draft, pool de agentes).
2. **ESTADO-Y-PROXIMOS-PASOS** → cambios de esta semana + IDs + bugs.
3. **SPEC-CONTINUACION + SETUP-SPEC-HTML** → definiciones canónicas (WF, tags, campos, snippets).
4. **output/bot-maria-prompt.md + output/whatsapp-templates.md** → prompt/preguntas y plantillas/estado Meta.
5. **BACKEND-ENDPOINTS-BLUEPRINT + SETUP-SPEC.md** → contratos de API + gate ≤2M.
6. **LEARNINGS + tipo-interes-mapping** → reglas de vitrina y mapeo.
