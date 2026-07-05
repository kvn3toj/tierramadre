# WhatsApp Templates — Tierra Mädre (pack listo para Meta)

> **Qué es esto:** los textos listos para registrar en **Meta Business → WhatsApp Manager → Message Templates**.
> Era el `path stub` que la spec dejaba pendiente (`GHL/output/whatsapp-templates.md`). Ya están escritos
> en voz de marca, con variables posicionales `{{n}}` (el formato que exige Meta) y su mapeo a los merge
> tags de GHL para el envío.
>
> **Estado:** ✅ **Tier 1 (6) registradas en Progresy el 18 jun 2026 — todas en "Pending" (en revisión de Meta).** Tier 2 pendiente.
> **Idioma de todas:** se registró **"Spanish" (es)** — WhatsApp/Meta no ofrece locale de Colombia; "Spanish" genérico es el correcto.

## Registro en Progresy — log (18 jun 2026)

Registradas vía Settings → WhatsApp → Templates → Create (Blank). Número conectado: 311 3052755 (Coexistence, Approved). Meta business verification: **Not Verified** (en proceso).

| Code  | meta_name                 | Categoría final                                    | Estado  |
| ----- | ------------------------- | -------------------------------------------------- | ------- |
| WA-01 | `saludo_inicial_wa`       | Marketing                                          | Pending |
| ES-01 | `escalacion_asesor_wa`    | Utility                                            | Pending |
| PV-02 | `postventa_entrega_wa`    | **Marketing** (Meta la recategorizó desde Utility) | Pending |
| PV-03 | `postventa_testimonio_wa` | Marketing                                          | Pending |
| CK-03 | `confirmacion_pago_wa`    | Utility                                            | Pending |
| CK-01 | `pieza_lista_pago_wa`     | Utility                                            | Pending |

**Binding de variables (default en Progresy; el workflow lo sobre-escribe al enviar):**

- `{{1}}` nombre → `{{contact.first_name}}` (correcto).
- `{{2}}` pieza → `{{custom_values.marca_nombre}}` como **placeholder** (no existe campo de producto; el workflow inyecta el nombre real al enviar). Sample mostrado a Meta: "Esmeralda Sofía 1.34 ct".
- `{{3}}` en CK-01 (link) → `{{custom_values.mp_link_default}}` (correcto como default).
- `{{3}}` en CK-03 (referencia) → `{{custom_values.marca_nombre}}` como **placeholder**. Sample: "VO-0001".

> ⚠️ **Importante para cuando construyas los workflows (WF-04/05/08):** en la acción "Send WhatsApp", **re-mapea {{2}} y {{3}} a los datos reales** (nombre de pieza, link de checkout, referencia de la orden) que vienen de `search-products` / `create-order`. El binding placeholder solo evita que queden vacíos si se envía sin override.

---

---

## Cómo registrar cada una (resumen)

1. Meta Business → **WhatsApp Manager → Message Templates → Create template**.
2. **Category:** la que indica cada ficha (UTILITY pasa rápido; MARKETING se rechaza más, exige opt-in).
3. **Name:** el `meta_name` en snake_case de la ficha (ej. `saludo_inicial_wa`).
4. **Language:** Español (CO) `es_CO`.
5. **Body:** pega el bloque "Body". Las variables van como `{{1}}`, `{{2}}`… (ya están puestas).
6. **Sample content:** usa los "Samples" de la ficha (Meta los exige para aprobar).
7. **Buttons:** configura los que indica la ficha (Quick Reply o URL).
8. **Submit** → aprobación de Meta en **24–48 h por plantilla**.

> **Orden recomendado:** primero el **Tier 1** (desbloquea el soft launch), luego el Tier 2.
> No esperes a tener las 15 — manda el Tier 1 hoy para arrancar el reloj de aprobación.

### Reglas de Meta que ya están respetadas aquí

- El body **no empieza ni termina** con una variable, y no hay dos variables seguidas.
- **Negrita de WhatsApp = un solo asterisco** `*así*` (no `**`). Ya está aplicado al nombre de la pieza.
- Máx. 2–3 emojis por mensaje (coincide con la guía de marca 💚🌿💎✨🕊️🌎).
- Sin precios ni descuentos públicos (regla de marca R3) — los valores van en cotización 1:1.

### Mapeo de variables GHL → Meta

Al **enviar** desde un workflow/Agent Studio, Meta inserta los valores en orden. Mapea así:

| `{{n}}` Meta            | Merge tag GHL                                                                | Notas                                      |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| nombre                  | `{{contact.first_name}}`                                                     | siempre `{{1}}` en estas plantillas        |
| pieza                   | nombre del tesoro                                                            | viene de `search-products` / la cotización |
| link pago               | `{{custom_values.mp_link_default}}` o el `mp_checkout_url` de `create-order` | URL Mercado Pago                           |
| referencia              | `saleId` (`VO-NNNN`) de Convex                                               | de `create-order` / `mp-webhook`           |
| canal                   | `{{contact.canal_origen}}`                                                   | wa / ig / tt                               |
| lugar/fecha/link evento | Custom Values del evento del momento                                         | EV-01 / EV-02                              |
| comisión                | monto calculado en Convex                                                    | EM-02                                      |

---

# TIER 1 — Registrar primero (desbloquea soft launch)

## 1 · WA-01 — Saludo inicial

- **meta_name:** `saludo_inicial_wa`
- **category:** MARKETING _(opener proactivo → requiere opt-in; si la conversación es respuesta dentro de 24 h, el bot responde libre sin plantilla)_
- **variables:** `{{1}}` nombre
- **samples:** `{{1}}` = Juan
- **buttons:** Quick Reply → `Ver tesoros` · `Hablar con un Embajador`

**Body:**

```
Hola {{1}}, te damos la bienvenida a Tierra Mädre 💚 Somos una casa hermética de esmeraldas colombianas con ADN de Paz y acceso directo a precios de Mina.

Cuéntanos qué te llama hoy: ¿una pieza para ti, un regalo, o invertir en un tesoro que perdura?

Tierra Mädre · ADN de Paz. Alta frecuencia de origen.
```

---

## 2 · CK-01 — Link para custodiar la pieza

- **meta_name:** `pieza_lista_pago_wa`
- **category:** UTILITY _(transacción en curso sobre una pieza específica; si Meta lo rechaza, reenviar como MARKETING)_
- **variables:** `{{1}}` nombre · `{{2}}` pieza · `{{3}}` link de pago
- **samples:** `{{1}}` = Juan · `{{2}}` = Esmeralda Sofía 1.34 ct · `{{3}}` = https://mpago.la/abc123

**Body:**

```
Hola {{1}}, tu tesoro *{{2}}* quedó reservado para ti 🌿 Para que sea tuyo, completa tu adquisición de forma segura aquí:
{{3}}

Si prefieres, tu Embajador te acompaña paso a paso. Aquí estamos.
```

---

## 3 · CK-03 — Confirmación de pago

- **meta_name:** `confirmacion_pago_wa`
- **category:** UTILITY _(confirmación transaccional — alta tasa de aprobación)_
- **variables:** `{{1}}` nombre · `{{2}}` pieza · `{{3}}` referencia
- **samples:** `{{1}}` = Juan · `{{2}}` = Esmeralda Sofía 1.34 ct · `{{3}}` = VO-0001

**Body:**

```
¡Gracias, {{1}}! Confirmamos el pago de tu tesoro *{{2}}* ✨ Referencia: {{3}}.

Ahora lo preparamos con la reverencia que merece. Te escribiremos en cada paso del envío.

Tierra Mädre · ADN de Paz. Alta frecuencia de origen.
```

---

## 4 · ES-01 — Escalación a Embajador (humano)

- **meta_name:** `escalacion_asesor_wa`
- **category:** UTILITY _(mensaje de servicio)_
- **variables:** `{{1}}` nombre
- **samples:** `{{1}}` = Juan
- **buttons:** (ninguno)

**Body:**

```
Hola {{1}}, con gusto 🕊️ Un Embajador de Tierra Mädre tomará tu conversación de forma personal para acompañarte mejor.

En un momento te escribe por aquí. Gracias por tu paciencia.
```

---

## 5 · PV-02 — Post-entrega

- **meta_name:** `postventa_entrega_wa`
- **category:** UTILITY
- **variables:** `{{1}}` nombre · `{{2}}` pieza
- **samples:** `{{1}}` = Juan · `{{2}}` = Esmeralda Sofía 1.34 ct

**Body:**

```
Hola {{1}}, tu tesoro *{{2}}* ya está en tus manos 💚 Que su alta frecuencia de origen te acompañe.

Si necesitas algo para custodiarlo mejor, escríbenos. Estamos contigo más allá de la entrega.

Tierra Mädre · ADN de Paz.
```

---

## 6 · PV-03 — Pedir testimonio

- **meta_name:** `postventa_testimonio_wa`
- **category:** MARKETING _(solicitud de reseña)_
- **variables:** `{{1}}` nombre · `{{2}}` pieza
- **samples:** `{{1}}` = Juan · `{{2}}` = Esmeralda Sofía 1.34 ct
- **buttons:** URL → `Compartir mi experiencia` (apunta a `{{custom_values.web_url}}` / link de reseña)

**Body:**

```
Hola {{1}}, han pasado unos días desde que *{{2}}* llegó a ti 🌿 Nos encantaría saber cómo ha resonado contigo.

¿Nos compartes tu experiencia? Tu voz ayuda a otro a reconocer su llamado.

Tierra Mädre · ADN de Paz.
```

> **Nota — IG-01 / TT-01:** en la spec aparecen como "prioridad", pero **no son plantillas de WhatsApp**.
> Son el saludo de apertura del bot en Instagram / TikTok DM (se configuran en Agent Studio, sin
> aprobación de Meta). Por eso no van en este pack de WhatsApp. Quedan documentadas aparte.

---

# TIER 2 — Registrar después

## 7 · CK-02 — Pieza pendiente (carrito abandonado)

- **meta_name:** `pieza_pendiente_wa`
- **category:** MARKETING
- **variables:** `{{1}}` nombre · `{{2}}` pieza · `{{3}}` link de pago
- **samples:** `{{1}}` = Juan · `{{2}}` = Esmeralda Sofía 1.34 ct · `{{3}}` = https://mpago.la/abc123

**Body:**

```
Hola {{1}}, tu tesoro *{{2}}* sigue esperándote 🌿 Aún puedes completarlo de forma segura aquí:
{{3}}

Y si prefieres, tu Embajador te acompaña en cada paso.
```

---

## 8 · EM-01 — Aviso al Embajador (nuevo invitado)

- **meta_name:** `embajador_nuevo_invitado_wa`
- **category:** UTILITY _(notificación operativa al Embajador)_
- **variables:** `{{1}}` Embajador · `{{2}}` invitado · `{{3}}` canal · `{{4}}` link a la conversación
- **samples:** `{{1}}` = Felipe · `{{2}}` = Juan González · `{{3}}` = WhatsApp · `{{4}}` = https://app.progresy.ai/...

**Body:**

```
Hola {{1}}, tienes un nuevo invitado en Tierra Mädre: {{2}}, que escribió por {{3}}.

Tienes 5 minutos para saludarle antes de que María continúe. Tu comisión queda protegida igual.

Abre la conversación aquí: {{4}}
Tierra Mädre · Estamos contigo.
```

---

## 9 · EM-02 — Comisión generada

- **meta_name:** `embajador_comision_wa`
- **category:** UTILITY _(actualización de cuenta del Embajador)_
- **variables:** `{{1}}` Embajador · `{{2}}` invitado · `{{3}}` pieza · `{{4}}` comisión
- **samples:** `{{1}}` = Felipe · `{{2}}` = Juan González · `{{3}}` = Esmeralda Sofía 1.34 ct · `{{4}}` = $180.000 COP

**Body:**

```
¡Felicitaciones, {{1}}! Tu invitado {{2}} eligió su tesoro *{{3}}* 💚

Comisión generada: {{4}}. Ya quedó registrada en tu panel.

Tierra Mädre · Gracias por tejer puentes.
```

---

## 10 · EV-01 — Invitación a evento presencial

- **meta_name:** `evento_presencial_wa`
- **category:** MARKETING
- **variables:** `{{1}}` nombre · `{{2}}` lugar · `{{3}}` fecha y hora
- **samples:** `{{1}}` = Juan · `{{2}}` = Bogotá, oficina Tierra Mädre · `{{3}}` = sábado 12 jul, 4:00 p. m.
- **buttons:** URL → `Reservar mi lugar` (link del evento)

**Body:**

```
Hola {{1}}, te abrimos las puertas a un encuentro íntimo de Tierra Mädre 🕊️
📍 {{2}}
🗓️ {{3}}

Cupos limitados, entre quienes sienten el llamado. ¿Te reservamos un lugar?
```

---

## 11 · EV-02 — Invitación a evento virtual

- **meta_name:** `evento_virtual_wa`
- **category:** MARKETING
- **variables:** `{{1}}` nombre · `{{2}}` fecha y hora
- **samples:** `{{1}}` = Juan · `{{2}}` = jueves 10 jul, 7:00 p. m.
- **buttons:** URL → `Unirme al encuentro` (link Zoom)

**Body:**

```
Hola {{1}}, te invitamos a un encuentro virtual de Tierra Mädre 🌎
🗓️ {{2}} · 💻 En línea

Conoce nuestros tesoros y su historia desde donde estés. ¿Confirmas tu lugar?
```

---

## 12 · PV-01 — Cuidados (día 1, antes de entregar)

- **meta_name:** `postventa_cuidados_wa`
- **category:** UTILITY
- **variables:** `{{1}}` nombre · `{{2}}` pieza
- **samples:** `{{1}}` = Juan · `{{2}}` = Esmeralda Sofía 1.34 ct

**Body:**

```
Hola {{1}}, gracias por custodiar *{{2}}* 💎 Mientras llega a ti, un consejo: la esmeralda ama el agua tibia y el paño suave, nunca químicos.

Te avisamos apenas despachemos tu tesoro.
```

---

## 13 · EM-03 — Recordatorio de seguimiento al Embajador (opcional)

- **meta_name:** `embajador_seguimiento_wa`
- **category:** UTILITY
- **variables:** `{{1}}` Embajador · `{{2}}` invitado
- **samples:** `{{1}}` = Felipe · `{{2}}` = Juan González

**Body:**

```
Hola {{1}}, tu invitado {{2}} sigue en conversación y aún no cierra su tesoro.

Un mensaje tuyo puede marcar la diferencia. ¿Le escribes hoy?
```

---

## 14 · R-03 — Re-engagement (lead frío)

- **meta_name:** `reengagement_frio_wa`
- **category:** MARKETING
- **variables:** `{{1}}` nombre
- **samples:** `{{1}}` = Juan
- **buttons:** Quick Reply → `Ver lo nuevo en la bóveda`

**Body:**

```
Hola {{1}}, hace un tiempo un tesoro de Tierra Mädre llamó tu atención 🌿 La Tierra sigue guardando piezas únicas que quizás resuenen contigo hoy.

¿Quieres que te muestre lo nuevo en la bóveda?
```

---

## 15 · R-04 — Nurturing (lead muy frío)

- **meta_name:** `reengagement_nurturing_wa`
- **category:** MARKETING
- **variables:** `{{1}}` nombre
- **samples:** `{{1}}` = Juan

**Body:**

```
Hola {{1}}, no queremos perderte de vista 💚 Cada esmeralda tiene su momento y su persona.

Cuando sientas el llamado, aquí estaremos para entregarte el tesoro indicado.

Tierra Mädre · ADN de Paz. Alta frecuencia de origen.
```

---

## 16 · CT-01 — Colección disponible (búsqueda en catálogo, WF-04)

- **meta_name:** `coleccion_disponible_wa`
- **category:** UTILITY _(mensaje de servicio sobre una búsqueda ya en curso — igual razonamiento que ES-01/CK-03)_
- **variables:** `{{1}}` nombre · `{{2}}` link de colección
- **samples:** `{{1}}` = Juan · `{{2}}` = https://tierramadre.app/coleccion/abc123
- **buttons:** (ninguno)
- **Estado:** ✅ Registrada en Progresy el 04 jul 2026 — Pending (en revisión de Meta).

**Body:**

```
¡Hola {{1}}! 💚 Ya tengo piezas que encajan con lo que buscas. Míralas en tu colección personal: {{2}}. Toca "Consultar por WhatsApp" en la que más te guste y seguimos por aquí.
```

> **Nota:** el detalle de productos (nombre/precio individual) no cabe en una plantilla de Meta de forma
> dinámica — no es pérdida real, la página de vitrina que abre `{{2}}` ya muestra nombre, foto y precio
> de cada pieza. Reemplaza el mensaje free-form de WF-04 (Búsqueda en catálogo), bloqueado por Meta fuera
> de la ventana de 24h. **Binding en GHL:** `{{1}}` → `Contact/First Name` · `{{2}}` → `Trigger Links/link-catalogo`
> (re-mapear en la acción "Send WhatsApp" del workflow al link real de vitrina que produce el webhook,
> `custom_webhook.1.response.vitrina_link`, si difiere del trigger link por defecto).

---

## Resumen del pack

| #   | Code  | meta_name                     | Category  | Tier |
| --- | ----- | ----------------------------- | --------- | ---- |
| 1   | WA-01 | `saludo_inicial_wa`           | MARKETING | 1    |
| 2   | CK-01 | `pieza_lista_pago_wa`         | UTILITY   | 1    |
| 3   | CK-03 | `confirmacion_pago_wa`        | UTILITY   | 1    |
| 4   | ES-01 | `escalacion_asesor_wa`        | UTILITY   | 1    |
| 5   | PV-02 | `postventa_entrega_wa`        | UTILITY   | 1    |
| 6   | PV-03 | `postventa_testimonio_wa`     | MARKETING | 1    |
| 7   | CK-02 | `pieza_pendiente_wa`          | MARKETING | 2    |
| 8   | EM-01 | `embajador_nuevo_invitado_wa` | UTILITY   | 2    |
| 9   | EM-02 | `embajador_comision_wa`       | UTILITY   | 2    |
| 10  | EV-01 | `evento_presencial_wa`        | MARKETING | 2    |
| 11  | EV-02 | `evento_virtual_wa`           | MARKETING | 2    |
| 12  | PV-01 | `postventa_cuidados_wa`       | UTILITY   | 2    |
| 13  | EM-03 | `embajador_seguimiento_wa`    | UTILITY   | 2    |
| 14  | R-03  | `reengagement_frio_wa`        | MARKETING | 2    |
| 15  | R-04  | `reengagement_nurturing_wa`   | MARKETING | 2    |
| 16  | CT-01 | `coleccion_disponible_wa`     | UTILITY   | 1    |

**No incluidas (a propósito):** IG-01, TT-01 (saludos de IG/TikTok, no son plantillas de WhatsApp) ·
EM-04 (definir si hace falta) · CK del bot que se responden dentro de la ventana de 24 h (no requieren plantilla).

Hecho con verde esmeralda 💚
