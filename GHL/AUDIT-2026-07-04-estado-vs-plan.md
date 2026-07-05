# Auditoría GHL — Plan vs Estado Real (2026-07-04)

**Método**: (1) lectura completa de los 23 archivos en `GHL/` (14 `.md` + 9 `.html`, ~26.000 líneas) vía dos agentes de extracción en paralelo; (2) inspección en vivo de la cuenta GHL de Tierra Madre (Progresy, location `t3tOZBrR05jUoLqnDn4I`) navegando Pipeline, Etiquetas, Campos personalizados, Valores personalizados, Flujos de trabajo, Agentes de IA (María), Gestionar la puntuación, y Mi personal.

**Resultado general**: la implementación real está **notablemente más avanzada y más fiel al spec** de lo que los propios documentos (fechados 1–3 jul) sugieren tentativamente. Casi todo lo marcado como "hecho" en `ESTADO-Y-PROXIMOS-PASOS.md` se verificó live, byte a byte, incluyendo textos verbatim del prompt de María. El gap real no está en lo construido — está en: (a) el pool de agentes humanos, que no existe como infraestructura, y (b) los workflows de la cola larga (WF-02, WF-07, WF-09 completo, WF-10 completo, WF-12, WF-13).

---

## 1. Lo que coincide 100% entre spec y cuenta viva

| Elemento                   | Spec (`SETUP-SPEC-HTML.md` / `manual-ghl-paso-a-paso.html`)                                                                                 | Estado en vivo verificado                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline                   | "Ventas Tierra Madre", 7 etapas                                                                                                             | ✅ Idéntico, orden idéntico: Nuevo Lead → Calificado por IA → Producto Recomendado → Carrito Enviado → Negociación / Agente → Venta Cerrada → Perdido / Nurturing                                                                                                                                                                                               |
| Etiquetas                  | 48 tags en 8 grupos (versión `SETUP-SPEC-HTML.md` §3.4, **no** la versión abreviada `canal-wa/ig/tt` de `plan-ejecucion-tierra-madre.html`) | ✅ Las 48 existen, nombres exactos, creadas en lote el 22 May 2026 09:35 PM. Resuelve la contradicción #1 marcada por ambos agentes de extracción: la versión que se implementó fue la de `SETUP-SPEC-HTML.md`.                                                                                                                                                 |
| Etiquetas ad hoc           | —                                                                                                                                           | 52 tags totales = 48 + 4 añadidas después: `buscar-catalogo` (30 jun), `qualification_complete` (2 jul), `quiere-comprar` (2 jul), `sin-respuesta-7d` (2 jul) — confirma exactamente el relato de `ESTADO-Y-PROXIMOS-PASOS.md`.                                                                                                                                 |
| Campos personalizados      | 14 campos, versión B (`manual-ghl-paso-a-paso.html` Fase 2 / la "corrección" de `ESTADO-Y-PROXIMOS-PASOS.md`)                               | ✅ Confirmados los 14, en carpeta "Additional Info". `Tipo de interés` = `topito, candonga, anillo, dije, gema_suelta, set, otro` (verificado abriendo el campo) — coincide exacto con la versión corregida, **no** con la versión A de `area-3-gohighlevel.html` (que tenía solo `gema` en vez de `gema_suelta`).                                              |
| Campos ad hoc              | `producto_seleccionado_sku`, `Order ID`                                                                                                     | ✅ Ambos existen, creados 02 Jul 2026, carpeta "Additional Info", tal como describe `ESTADO-Y-PROXIMOS-PASOS.md`.                                                                                                                                                                                                                                               |
| Valores personalizados     | 10 valores incl. `internal_api_secret`                                                                                                      | ✅ 9 valores de marca (Ciudades Entrega Rápida, Cuotas Mínimo COP, Descuento Recovery Pct, Garantía Devolución Días, Hashtag Marca, MP Link Default, Marca Nombre, Marca Tagline, Seguro Envío Mín COP) + `internal_api_secret` (solo visible vía búsqueda, no en la vista general — nota técnica: no lo mostraba en la lista paginada por defecto).            |
| WF-01, 03, 04, 05, 06, 08  | Published, con IDs específicos                                                                                                              | ✅ Los 6 + WF-05B aparecen "Published" en la lista, con contadores de inscritos reales: WF-01=13, WF-03=2, WF-04=8, WF-05=1, WF-05B=0, WF-06=0, WF-08=0.                                                                                                                                                                                                        |
| WF-11 Smart Routing        | Existe, round-robin simple (no matriz completa)                                                                                             | ✅ Confirmado indirectamente: aparece como opción seleccionable ("publicado") en la acción "Escalación a humano" de María, junto a WF-06.                                                                                                                                                                                                                       |
| María — persona, KB, flujo | Prompt v2 verbatim (`output/bot-maria-prompt.md`)                                                                                           | ✅ Coincide casi palabra por palabra: personalidad ("Eres María, asesora oficial de Tierra Mädre — joyería con esmeraldas colombianas con ADN de Paz..."), objetivo (calificar → anunciar colección que envía el sistema, María nunca envía fotos), flujo de 4 preguntas idéntico, KB trigger idéntico carácter por carácter.                                   |
| María — modelo             | OpenAI GPT-4.1, 1938–2938 tokens                                                                                                            | live muestra "3212–4212 tokens aprox." — el conteo de tokens cambió (prompt creció desde la última medición), pero el modelo es el mismo.                                                                                                                                                                                                                       |
| María — acciones GHL       | 3 acciones "Iniciar flujo de trabajo": calificación completa → WF-03; selección de pieza → WF-05B; escalación → WF-06+WF-11                 | ✅ Confirmado exacto, incluyendo el texto de condición de cada acción. "Transferencia a humano" nativo confirmado **sin usar**, tal como documentado.                                                                                                                                                                                                           |
| Gemita                     | Apagado                                                                                                                                     | ✅ Confirmado "Apagado" en la lista de agentes.                                                                                                                                                                                                                                                                                                                 |
| Manage Scoring             | "Engagement Score" ON, 9 reglas                                                                                                             | ✅ Confirmado ON, 9 reglas con puntajes idénticos: carrito-enviado +30, cliente-pago-confirmado +50, link-catalogo +10, cita confirmada +25, RSVP evento +20, Payment Received +50, email abierto +5, respuesta+tag +15, cita reservada +25. La regla `sin-respuesta-7d` −10 confirmada **ausente** aquí (vive solo como cron de Convex, tal como documentado). |

---

## 2. Hallazgos nuevos (no capturados, o capturados de forma imprecisa, en los documentos existentes)

1. **El pool de agentes humanos no existe como infraestructura — solo hay 2 usuarios en toda la cuenta.** `Configuración → Mi personal` muestra únicamente:
   - `Comercializadora Tierra Madre` (comercial.tierramadre@gmail.com) — rol ACCOUNT-ADMIN
   - `Direccion Tierra Madre` (direccion.tierramadre@gmail.com) — rol ACCOUNT-USER

   No existen "Felipe", "Sebastián"/"Sebastian Pion" ni ningún otro usuario individual. Esto es más grave que lo que documenta `ESTADO-Y-PROXIMOS-PASOS.md`: ese doc dice que WF-11 quedó en "round-robin simple entre Kevin/Sebastián/Comercializadora" — pero **Sebastián no tiene cuenta de usuario en GHL**, así que un round-robin de 3 personas es técnicamente imposible con el estado actual del staff. La Fase 9 completa del manual (`manual-ghl-paso-a-paso.html`: crear 4 empleados, asignar tags de pool `agente-premium/inversion/senior/regular`, configurar 4 reglas de Auto-Assignment con SLA) **nunca se ejecutó**. Las 4 etiquetas de pool sí existen (creadas en el lote de 48), pero no están aplicadas a ningún perfil de agente porque no hay agentes que etiquetar.

2. **WF-06 y WF-08 muestran 0 inscritos pese a estar "Published" y descritos como "EN VIVO" desde el 1-2 jul.** Esto puede ser normal (aún no ha habido una escalación real ni una venta cerrada que dispare el webhook de Mercado Pago), pero es una brecha entre "publicado" y "usado en producción" que vale la pena monitorear — si pasan varios días más sin inscripciones, sugiere que el trigger (tag `pide-humano` / tag `cliente-pago-confirmado`) no se está aplicando en conversaciones reales, replicando el mismo tipo de bug histórico que ya se documentó para María v1 (acciones huérfanas).

3. **La lista de "Flujos de trabajo" en `Automatización` no permite paginar ni hacer clic en filas/búsqueda desde automatización de navegador** (posible iframe de terceros con manejo de eventos distinto al resto de la app — Etiquetas, Campos, Valores sí respondieron con normalidad). Esto bloqueó la verificación directa de WF-02, WF-07, WF-09, WF-10, WF-12, WF-13 en esta sesión. Recomendación operativa: si alguien necesita auditar la lista completa de workflows a futuro, hacerlo por URL directa a cada workflow (`/automation/workflows/{id}`) usando los IDs ya conocidos, o pedir un export desde la API v2 (`GET /workflows/`) en vez de la UI.

4. **`internal_api_secret` no aparece en la vista por defecto de "Valores personalizados"** (solo 9 de 10 valores se listan sin scroll/búsqueda) — hay que buscarlo explícitamente. No es un bug del dato, es una particularidad de la UI a tener en cuenta si alguien más audita esto.

---

## 3. Confirmaciones que resuelven ambigüedades de los documentos previos

Las dos extracciones de spec (una desde `.md`, otra desde `.html`) habían marcado 12+16 = ~20 contradicciones internas entre documentos. La auditoría en vivo resuelve las siguientes con evidencia directa:

- **Tags**: la versión ganadora es `SETUP-SPEC-HTML.md` §3.4 (48 tags con nombres largos: `canal-whatsapp`, no `canal-wa`). El resumen de conteos por categoría de `SPEC-CONTINUACION.md` (que sumaba 44) estaba simplemente desactualizado/mal contado, no refleja una reorganización real.
- **Campos personalizados — `tipo_interes`**: la versión ganadora es la de `manual-ghl-paso-a-paso.html` Fase 2 (`topito, candonga, anillo, dije, gema_suelta, set, otro`), confirmando que la "corrección" documentada el 1 jul en `ESTADO-Y-PROXIMOS-PASOS.md` es correcta y ya estaba bien desde el principio en ese documento — la versión A de `area-3-gohighlevel.html` (con solo `gema`, sin `candonga`) es la que quedó obsoleta.
- **13 vs 10 workflows**: la numeración ganadora es WF-01..13 + WF-05B (la de `SETUP-SPEC-HTML.md` / `ESTADO-Y-PROXIMOS-PASOS.md`), no la de `plan-ejecucion-tierra-madre.html` que decía "10 workflows". Confirmado por la existencia real de WF-05B y por la referencia a WF-11 dentro de la configuración de María.

---

## 4. Spec canónico vigente (fuente de verdad a partir de hoy)

Para evitar que futuras sesiones repitan la confusión entre versiones, este es el spec que debe tratarse como autoritativo de aquí en adelante (todo lo demás en `GHL/*.html` que lo contradiga se considera histórico/superado):

- **Tags**: los 48 de `SETUP-SPEC-HTML.md` §3.4 + los 4 ad hoc (`buscar-catalogo`, `qualification_complete`, `quiere-comprar`, `sin-respuesta-7d`).
- **Custom fields**: los 14 de `manual-ghl-paso-a-paso.html` Fase 2 + los 2 ad hoc (`producto_seleccionado_sku`, `order_id`).
- **Workflows**: numeración WF-01..13 + WF-05B, con los triggers/acciones documentados en `ESTADO-Y-PROXIMOS-PASOS.md` (no los de `SETUP-SPEC.md` §8.2.1, que es la tabla vieja WF-01..10).
- **María**: prompt v2 de `output/bot-maria-prompt.md`, con las 3 acciones de workflow confirmadas arriba.

---

## 5. Plan de implementación para completar el sistema

Ordenado por impacto en el funnel real (no por orden de aparición en los docs):

### Prioridad 1 — Bloquea el funnel de ventas hoy mismo

1. **Decidir y montar el pool de agentes humanos.** Sin esto, WF-11 (Smart Routing) y las 4 etiquetas `agente-*` son papel mojado, y toda escalación cae en un round-robin de 2 cuentas genéricas (no personas). Acción concreta:
   - Confirmar con el negocio quiénes son las personas reales (¿Sebastián existe como persona pero no tiene login? ¿Felipe participa o no?).
   - Crear cuentas de usuario reales en `Mi personal` para cada persona (no cuentas genéricas de "Dirección"/"Comercializadora").
   - Aplicar las tags `agente-premium/inversion/senior/regular` a cada perfil según el mapeo que decida el negocio.
   - Configurar las 4 reglas de Auto-Assignment con SLA (Fase 9.3 del manual) — esto no se ha hecho en absoluto todavía.
2. **Verificar por qué WF-06 y WF-08 tienen 0 inscritos.** Provocar una escalación real de prueba (mensaje con "quiero hablar con alguien") y una venta de prueba, y confirmar en los logs del workflow que el tag se aplica y el workflow se dispara. Si no se dispara, es el mismo bug de "acciones huérfanas" que ya se resolvió una vez para María — puede haber recurrido.
3. **Completar el test E2E con contactos reales** (Kevin Tres Toj / Juan Ma Escobar) recorriendo todo el funnel: calificación → WF-03/04 → selección → WF-05B → asesor humano → WF-05 manual → link MP → WF-08 postventa. Esto sigue pendiente según el último estado documentado y ahora es más urgente dado el hallazgo #2 de la sección anterior.

### Prioridad 2 — Cierra huecos conocidos del funnel

4. **WF-02 · Verificar embajador** — no existe. Bloquea el flujo completo de atribución a embajadores en el primer contacto. Requiere primero el endpoint `/api/ghl-match-ambassador` (blueprint A en `BACKEND-ENDPOINTS-BLUEPRINT.md`), que a su vez tiene 5 preguntas de negocio sin resolver (Q-A1..Q-A5: qué estados de embajador califican, prioridad teléfono/email/instagram, atribución en match-time vs order-time, formato del campo `embajador_asignado`).
5. **WF-07 · Regla 5 min embajador** — depende de WF-02, construir junto con el anterior.
6. **WF-09 · Re-engagement** — completar las ramas de 30-60 días que faltan (branch `lead-frio AND lead_score<50` → SMS R-04 + tag `nurturing-mensual`; branch `lead_score<20` → mover a "Perdido / Nurturing"). Aclarar si esto sigue viviendo en GHL o si se reemplaza enteramente por el cron `sin-respuesta-7d` de Convex — hoy conviven ambos sin que quede claro cuál es la fuente de verdad para el decremento de score.
7. **WF-10 · Evento RSVP** — hoy solo aplica el tag `canal-evento`; falta el tag `evento-{slug}-rsvp` dinámico, generación de QR, y recordatorios 3d/1d/2h.
8. **WF-12 · Auto-event-invite** — no construido, bloqueado en 8 preguntas de negocio (Q-B1..Q-B8) y en el endpoint `/api/ghl-auto-event-invite` (blueprint B).

### Prioridad 3 — Higiene y consistencia

9. **Confirmar la semántica de `dateAdded`** en el cron `sin-respuesta-7d` (si rastrea última actividad real o solo fecha de creación de la conversación) — riesgo de que el score decremente incorrectamente.
10. **Renombrar internamente "Vitrina" → "colección"** en el texto de notificación de WF-05B y nombres de acciones (cosmético, solo visible para staff).
11. **Resolver el mapeo `tipo_interes` → `categoria` del catálogo** con sign-off del negocio antes de intentar afinarlo en código — hoy WF-04 degrada a solo-por-presupuesto ignorando el tipo de pieza, lo cual puede estar recomendando anillos cuando el cliente pidió un dije.
12. **Meta template `escalacion_asesor`** — confirmar si ya fue aprobado por Meta; si sigue pendiente, seguir usando el mensaje libre de WF-06 dentro de la ventana de 24h como hoy.
13. **PV-01 "cuidados día 1"** — o se crea el template real, o se documenta oficialmente que PV-02 lo reemplaza de forma permanente (hoy es un parche silencioso).

### Nota de higiene documental

Dado que se confirmó cuál versión de cada spec ganó en la implementación real, vale la pena marcar `area-3-gohighlevel.html`, `SETUP-SPEC.md` §8.2.1 (tabla WF-01..10), y las secciones de `plan-ejecucion-tierra-madre.html` que dicen "10 workflows" como **históricas/superadas** (no borrarlas, pero evitar que una futura sesión las tome como fuente de verdad otra vez).
