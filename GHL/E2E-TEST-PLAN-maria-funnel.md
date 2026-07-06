# PLAN — Ejecución de la prueba E2E del embudo María (nueva sesión, Chrome)

> **Este es el "cómo ejecutarlo".** Los criterios de aceptación están en `E2E-TEST-SPEC-maria-funnel.md`.
> Pegar este archivo (o su ruta) al iniciar la nueva sesión de Cowork con Chrome.
>
> **Contacto de prueba:** **Kevin Tres Toj** (único para esta corrida; alternos permitidos: Juan Ma Escobar / Isa La Negra Vikinga).
> **Nunca** usar leads reales. **No publicar** ningún WF sin OK explícito de Kevin en el momento.

---

## Prompt de arranque (pegar al agente nuevo)

```text
Ejecuta la prueba E2E del embudo María de Tierra Madre en Progresy/GHL, conduciendo Chrome.
Lee primero, en este orden:
  1. GHL/E2E-TEST-PLAN-maria-funnel.md  (este archivo — el cómo)
  2. GHL/E2E-TEST-SPEC-maria-funnel.md  (los criterios de aceptación)
  3. GHL/VALIDATION-estado-vs-folder-2026-07-06.md  (riesgos y fuentes canónicas)
  4. GHL/AUDIT-2026-07-04-estado-vs-plan.md  (estado vivo real: Published/Draft + conteos)
Sub-account t3tOZBrR05jUoLqnDn4I · https://app.progresy.ai (Chrome ya logueado — NO intentar loguearte).
Regla dura: SOLO contacto de prueba Kevin Tres Toj. NO publicar WFs. NO completar pagos reales (MP en prueba).
Captura evidencia del hilo REAL de WhatsApp y de la página real, no del log de ejecución.
Al final, escribe docs/e2e-maria-funnel-report-<fecha>.md con el formato de la §9 del SPEC.
```

---

## Fase 0 — Pre-vuelo (antes de tocar nada)

- [ ] Confirmar con Kevin que autoriza la corrida hoy y **qué WFs pueden probarse en vivo** (los Publicados) vs cuáles solo por "Probar flujo de trabajo" (Borrador). Publicar = envío real → requiere su OK puntual.
- [ ] Abrir Chrome (sesión Progresy logueada). Conectar Claude-in-Chrome. **Una sola ventana, quieta.**
- [ ] **Reglas del iframe:** no `resize_window`, no doble-click, dejar cargar ~15 s tras navegar, y hacer scroll del cuerpo del panel 2-3 ticks para levantar dropdowns recortados. Si un clic falla 2-3 veces, PARAR y reportar (no insistir).
- [ ] Verificar **estado vivo de cada WF** (Published/Draft) al abrir la lista de flujos — NO confiar en los docs; hubo sesiones concurrentes.
- [ ] Confirmar **María Active/Principal** (o en Suggestive Mode). Si está Disabled, el embudo no dispara para inbound real.
- [ ] Tener abierta una pestaña con el catálogo real `https://tierramadre.app/treasure` (para cruzar nombre/precio) y otra con la conversación de Kevin en GHL (Conversations).
- [ ] **Abrir/activar la ventana de 24 h**: que Kevin mande un WhatsApp entrante fresco al número de la casa (+57 311 305 2755) antes de empezar — necesario porque las plantillas Meta siguen `Pending` y los free-form solo sirven dentro de 24 h.
- [ ] **Verificar el orden configurado real de las etapas del pipeline** (Settings → Pipelines → Ventas Tierra Madre): confirmar o descartar si "Carrito Enviado" aparece posicionado ANTES que "Negociación / Agente" (así lo confirmó el AUDIT del 4 jul) — ver riesgo #5 del SPEC (§0-bis). Anotar el orden exacto visto en pantalla; es el dato que permite diagnosticar un eventual error "moving backward" en la Fase 5.
- [ ] Anotar el **`lead_score` inicial** de Kevin y su etapa de oportunidad actual (resetear la oportunidad si viene de una prueba anterior — recordar: GHL no deja mover hacia atrás).

## Fase 1 — Alta de contacto + WF-01

- [ ] Preparar/confirmar el contacto Kevin Tres Toj con **+57** (el selector de bandera resetea a Países Bajos +31 → clic bandera → Colombia → reescribir número).
- [ ] **DND:** revisar la pestaña DND del contacto — los checkboxes "Canales" del alta en realidad ACTIVAN DND (bloquean). WhatsApp debe estar **sin** DND.
- [ ] Disparar WF-01 (crear contacto o "Probar flujo"). Verificar: `saludo_inicial_wa` con nombre resuelto + oportunidad en **Nuevo Lead**. Evidencia = hilo real.

## Fase 2 — Calificación con María → WF-03

Desde el hilo real de WhatsApp (o el test-chat si solo se valida la lógica), correr una conversación por **cada `tipo_interes`** (ver matriz §3 del SPEC). Por corrida:

- [ ] Responder las 4 preguntas (tipo, ocasión, presupuesto, conocimiento). Confirmar short-circuit.
- [ ] Verificar campos llenos: `tipo_interes`, `presupuesto_declarado`, `conocimiento_esmeraldas`, `ciudad`.
- [ ] Verificar tag `qualification_complete` → dispara **WF-03** → etapa **Calificado por IA** → encadena WF-04.

## Fase 3 — WF-04: colección + validación producto↔catálogo (núcleo)

Por cada corrida de la Fase 2:

- [ ] Webhook 200 con `productos[]` (3 piezas) — leer el panel de ejecución Y el WhatsApp real.
- [ ] WhatsApp muestra 3 líneas nombre/precio + link de colección `/v/{id1}-{id2}-{id3}?cid=…` (NO `[object Object]`).
- [ ] Abrir el link de colección: las 3 piezas coinciden en **nombre y precio** con el WhatsApp.
- [ ] Cruzar cada pieza contra `/treasure`: existe, **DISPONIBLE**, publicada, **mismo precio** en los 3 lugares (WhatsApp ↔ `/v/` ↔ `/treasure`).
- [ ] Presupuesto respetado (rango ~0.8×–1.2×; si la pasada estricta por categoría da vacío, degrada a "dentro de presupuesto" — documentar).
- [ ] Tag `productos-mostrados` + etapa **Producto Recomendado**.
- [ ] **Casos de precio:** correr también presupuesto 50k (María honesta, sin pieza), medio (2–5M), y sin presupuesto (verificar "más-barato-primero", no la más cara).

## Fase 4 — Selección + hand-off (WF-05B → WF-06 → WF-11)

- [ ] En el link de colección, tocar **"Consultar por WhatsApp"** en una pieza. Verificar que `api/vitrina-select` escribe `producto_seleccionado_sku` + tags `quiere-comprar` y `pide-humano`.
- [ ] **WF-05B** dispara: notificación interna "🛒 Compra en Vitrina" + `pide-humano`.
- [ ] **WF-06** dispara: María se **pausa** (confirmar que NO responde tras el hand-off), etapa **Negociación/Agente**, WhatsApp **ES-01** (free-form).
- [ ] **WF-11** dispara: verificar a quién asigna realmente (recordar: solo 2 cuentas existen; el round-robin 3-vías no es real hoy).

## Fase 5 — Carrito + checkout (WF-05, manual del asesor)

> ⚠️ **Riesgo de orden de etapas (SPEC §0-bis #5):** en el orden real de producción, esta fase corre justo después de que WF-06 (Fase 4) movió la oportunidad a **Negociación/Agente**. Si el paso "mover a Carrito Enviado" falla con `"Moving a opportunity backward in the pipeline is not allowed"`, **no es un artefacto de orden de test** (ese caso, distinto, ya está documentado en ESTADO) — es el bug real de configuración de etapas hipotetizado. Repórtalo explícitamente, con captura del error y del orden de etapas anotado en la Fase 0.

- [ ] Con `producto_seleccionado_sku` lleno, enrolar a Kevin en WF-05. Verificar webhook `ghl-create-order` → `{order_id:VO-xxxx, mp_url}`.
- [ ] **Gate ≤2M:** repetir con una pieza **> 2.000.000 COP** → debe dar **409 `OVER_LIMIT_2M`** (no 500). Y un SKU inexistente → **409 `PRODUCT_NOT_FOUND`**.
- [ ] CK-01 (free-form) con `mp_url` correcto por-orden (no genérico). Abrir el `mp_url` (checkout MP en modo prueba) y confirmar que carga la pieza y el monto correctos — **sin pagar**.
- [ ] Campo `order_id` = VO-xxxx · etapa **Carrito Enviado** · tag `carrito-enviado` (+30 score → verificar `lead_score`).

## Fase 6 — Pago (MP prueba) + post-venta (WF-08)

- [ ] Si el equipo autoriza simular el pago de prueba MP: completar el checkout de prueba → `mp-webhook` agrega `cliente-pago-confirmado`.
- [ ] **WF-08** dispara (¡verificar! el AUDIT lo mostró con 0 inscripciones): CK-03 confirmación → (esperar 1d) PV-02 → (esperar 7d) PV-03. Etapa **Venta Cerrada**.
- [ ] Campos `total_comprado_cop` + `ultima_compra_fecha` escritos · `lead_score` +50.
- [ ] _(Las esperas de 1d/7d no se pueden observar en la sesión; anotar que el disparo inicial y el CK-03 ocurrieron y dejar seguimiento.)_

## Fase 7 — Score, tags y pipeline (barrido final)

- [ ] Revisar en el contacto de Kevin: todos los tags aplicados en el orden correcto (§5 del SPEC).
- [ ] `lead_score` refleja las reglas (§6): `carrito-enviado +30`, `cliente-pago-confirmado +50`, `link-catalogo +10` si hubo clic.
- [ ] La oportunidad transitó las etapas en orden sin error "moving backward".
- [ ] Custom fields (§8) con los valores esperados.

## Fase 8 — Reporte

- [ ] Escribir `docs/e2e-maria-funnel-report-<fecha>.md` con el formato de la §9 del SPEC: tabla WF×resultado con evidencia real, tabla tipo-producto×catálogo, discrepancias de precio/tag/score/etapa, GIFs de WF-04 y del hand-off WF-05B→WF-06, y bugs nuevos con causa raíz + punto de enchufe.

---

## Matriz de corridas (mínimo sugerido)

| Corrida | tipo_interes        | Presupuesto  | Qué estresa                             |
| ------- | ------------------- | ------------ | --------------------------------------- |
| A       | anillo              | 5.000.000    | flujo feliz completo hasta WF-08        |
| B       | topito              | 500.000      | pieza económica; consistencia de precio |
| C       | dije                | 2.000.000    | límite del gate ≤2M (borde)             |
| D       | gema_suelta         | 50.000       | honestidad "sin pieza a ese precio"     |
| E       | anillo (pieza cara) | (pieza > 2M) | **gate 409 OVER_LIMIT_2M**              |
| F       | (sin presupuesto)   | vacío        | ranking "más-barato-primero"            |
| G       | (lotes/inversión)   | > 5.000.000  | ruteo a humano / `agente_inversion`     |

> Corridas A y F–G son las más valiosas; B–E validan precios y el gate. No hace falta llevar TODAS hasta WF-08 — con A basta para el post-venta; el resto puede parar en la fase que estresa.

## Gotchas a recordar (de sesiones previas)

- "Success" en el log de GHL **no** garantiza contenido correcto → leer el hilo real.
- Merge tag de array = `[object Object]` → usar indexados `.0.nombre/.0.precio_cop/.0.web_link`.
- No mover oportunidad hacia atrás (resetear/crear contacto nuevo si la etapa ya está adelantada).
- Plantillas Meta `Pending` → free-form solo dentro de ventana de 24 h.
- Iframe: ventana quieta, sin resize, sin doble-click, scroll para dropdowns.
