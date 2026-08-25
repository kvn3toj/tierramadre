# Renacer · Fase 0 — hoja de armado de la captura en GHL

> **Qué es esto.** El §7.2 del spec
> (`docs/superpowers/specs/2026-08-25-renacer-qr-flow-design.md`) exige que **cada campo del
> form de Fase 0 lleve el nombre del campo de Fase 1 que lo va a heredar** — "nada de 'luego lo
> mapeamos': el mapeo ES el diseño del form". Esta hoja es ese mapeo, campo por campo, listo
> para que quien tenga la UI de GHL lo arme sin volver a decidir nada.
>
> **Fecha:** 2026-08-25 · **Iniciativa:** REN-1 · **Estado de la compuerta §3.3:** ✅ ratificada
> (URL impresa `tierramadre.app/renacer/k/{codigo}`, código numérico secuencial desde 101).

---

## 0 · El bloqueo que hay que levantar primero

**El token GHL del repo no puede crear campos ni forms.** Medido el 2026-08-25 con control
positivo y negativo en el mismo minuto, contra la location `t3tOZBrR05jUoLqnDn4I`:

| Llamada                                          | Resultado                                             |
| ------------------------------------------------ | ----------------------------------------------------- |
| `GET /locations/{id}/customFields`               | **200** — 17 campos, ninguno de Renacer               |
| `POST /locations/{id}/customFields`              | **401** `The token is not authorized for this scope.` |
| `GET /forms/?locationId={id}`                    | **401** misma respuesta                               |
| `GET /funnels/funnel/list?locationId={id}`       | **401** misma respuesta                               |
| Control negativo tras el POST fallido            | siguen 17 campos, **0 de Renacer** — no creó nada     |

O sea: el `GHL_TOKEN` de `.env.local` es de **solo lectura sobre custom fields** y no alcanza
forms ni funnels. Para automatizar la creación de los campos hace falta un Private Integration
Token con, como mínimo, el scope `locations/customFields.write` (y `forms.readonly` para poder
verificar el form después). Sin eso, **los campos y el form se crean a mano en la UI** — que es
además lo que `GHL/00-INDICE-Y-MAPA.md` ya marcaba como ✋ manual para forms y funnels.

---

## 1 · Campos nativos de GHL (no se crean, se usan)

| Dato          | Campo nativo GHL       | Campo Fase 1           |
| ------------- | ---------------------- | ---------------------- |
| Nombre        | `contact.first_name` + `contact.last_name` | `beneficiaries.name` / aportador |
| Email (Google)| `contact.email`        | `beneficiaries.email` (y `googleId` en Fase 1) |
| Celular       | `contact.phone`        | contacto del aportador (`contact.celular` del riel §5.2) |

No se crea un campo `renacer_rol`: **la separación aportador / beneficiario va por TAG**
(`renacer-aportador`, `renacer-beneficiario`), que es el mecanismo nativo de GHL para segmentar
y el que ya usa esta location (48 tags, ver `00-INDICE-Y-MAPA.md`).

## 2 · Custom fields a crear — beneficiario

Convención de la location: `contact.<snake_case>`. Prefijo `renacer_` para no mezclarse con el
CRM de esmeraldas. **Verificar el `fieldKey` real tras crear cada uno**: GHL lo deriva del
nombre y no siempre da lo esperado.

| # | Nombre en GHL                        | fieldKey esperado                                | dataType     | Campo Fase 1 heredero                    |
| - | ------------------------------------ | ------------------------------------------------ | ------------ | ---------------------------------------- |
| 1 | Renacer codigo kit                   | `contact.renacer_codigo_kit`                     | `TEXT`       | `beneficiaries.kitCode`                  |
| 2 | Renacer necesidad texto              | `contact.renacer_necesidad_texto`                | `LARGE_TEXT` | `needs.whatINeed`                        |
| 3 | Renacer necesidad porque             | `contact.renacer_necesidad_porque`               | `LARGE_TEXT` | `needs.whyItMatters`                     |
| 4 | Renacer fecha registro necesidad     | `contact.renacer_fecha_registro_necesidad`       | `TEXT` ⚠️     | `needs.createdAt` — **es el turno FIFO** |
| 5 | Renacer ubicacion                    | `contact.renacer_ubicacion`                      | `LARGE_TEXT` | `beneficiaries.ubicacion`                |
| 6 | Renacer edad                         | `contact.renacer_edad`                           | `NUMERICAL`  | `beneficiaries.edad`                     |
| 7 | Renacer genero                       | `contact.renacer_genero`                         | `TEXT`       | `beneficiaries.genero`                   |
| 8 | Renacer numero carnet                | `contact.renacer_numero_carnet`                  | `TEXT`       | `beneficiaries.cardNumber`               |
| 9 | Renacer consentimiento habeas data   | `contact.renacer_consentimiento_habeas_data`     | `CHECKBOX`   | `beneficiaries.habeasDataAcceptedAt` (el "sí") |
|10 | Renacer habeas data fecha            | `contact.renacer_habeas_data_fecha`              | `TEXT`       | `beneficiaries.habeasDataAcceptedAt` (el timestamp) |
|11 | Renacer consentimiento visibilidad aportador | `contact.renacer_consentimiento_visibilidad_aportador` | `CHECKBOX` | `beneficiaries.donorVisibilityConsent` |
|12 | Renacer registro asistido por        | `contact.renacer_registro_asistido_por`          | `TEXT`       | `beneficiaries.assistedBy`               |
|13 | Renacer capacidad texto              | `contact.renacer_capacidad_texto`                | `LARGE_TEXT` | `capacities.title` / `capacities.description` |
|17 | Renacer consentimiento imagen        | `contact.renacer_consentimiento_imagen`          | `CHECKBOX`   | `beneficiaries.imageConsent`             |

**Campo 7 (género): TEXT libre a propósito.** El spec no ratifica ninguna taxonomía; cerrar una
lista aquí sería inventar una decisión. Si operaciones necesita agrupar, se convierte a
`SINGLE_OPTIONS` cuando exista el criterio.

**Campo 11: fail-closed.** Ausente o sin marcar = **NO consentido**, nunca `!== false`
(spec §8.3, patrón heredado del MVP). El default en el form es desmarcado.

**Campos 11 y 17: fail-closed, los dos.** Ausente o sin marcar = **NO consentido**, nunca
`!== false` (spec §8.3, patrón heredado del MVP). El default en el form es desmarcado.
El **17 lleva numeración fuera de orden a propósito**: se añadió el 2026-08-25 por decisión de
Kevin, después de que este mapeo destapara que el §7.2 no lo incluía (ver §5·iii). Conservar el
17 —en vez de renumerar— deja visible que la tabla de captura del spec tenía ese hueco.

**Menores: ningún consentimiento los habilita.** El §10.2 prohíbe imágenes de menores en lo que
ven los aportadores y en material de campaña, marcado o no el campo 17.

## 3 · Custom fields a crear — aportador

| # | Nombre en GHL                | fieldKey esperado                        | dataType         | Campo Fase 1 / destino          |
| - | ---------------------------- | ---------------------------------------- | ---------------- | ------------------------------- |
|14 | Renacer kit tipo             | `contact.renacer_kit_tipo`               | `SINGLE_OPTIONS` | `kits.tipo`                     |
|15 | Renacer canal informado      | `contact.renacer_canal_informado`        | `SINGLE_OPTIONS` | preferencia de canal (§4.6)     |
|16 | Renacer contacto regalo local| `contact.renacer_contacto_regalo_local`  | `LARGE_TEXT`     | contacto del regalo redirigido (§4.8) |

- **14 · opciones (ratificadas, decisión #4 — no agregar una quinta):** `1+1`, `1+5`, `1+10`, `1+100`
- **15 · opciones (ratificadas, §4.6):** `WhatsApp`, `Newsletter`, `Notificaciones`
- **16** solo se muestra en el checkout internacional (§4.8: sin envíos al exterior, nunca).

El resto de la captura del aportador (`celular`, `full_name`, `email`) **ya la exige el riel de
pago** — `parseCheckoutBody` en `api/checkout-create-order.ts` — y se persiste en Convex con la
venta. No se duplica en GHL.

## 4 · Orden del form (no negociable)

El §6 del spec fija el orden y lo llama deliberado:

1. **Video de contexto** (bienvenida) — embebido arriba. _Pieza sin producir: abierto §11.c._
2. **Necesidades PRIMERO** — campos 2 y 3, texto libre, repetible.
3. **Datos DESPUÉS** — nativos + campos 5, 6, 7, con su razón dicha al usuario
   ("¿dónde te llevamos la ayuda?").
4. **Consentimiento habeas data** — campos 9 y 10. Se recoge **en presencia**, guiado por el
   facilitador, ANTES del registro digital (§10.1).
5. **Pantalla final con el número de carnet** — campo 8.

Invertir 2 y 3 rompe una decisión ratificada del 25-08. No es una preferencia de UX.

---

## 5 · Tres problemas que este mapeo destapó — resolver ANTES de armar el form

**(i) `necesidad_texto` es repetible; un custom field de contacto NO lo es.**
El §7.2 dice "una fila por necesidad" y el §7.1 dice "texto libre, repetible", pero un custom
field en GHL guarda **un** valor por contacto: la segunda necesidad pisa la primera. Y como
`needs.createdAt` de cada necesidad **es el turno FIFO** (§9), perderlas no es cosmético.
Opciones, en orden de preferencia:
  1. **Una submission por necesidad** — el timestamp de submission ES `needs.createdAt`, y el
     vínculo lo dan `codigo_kit` + carnet. Es lo más fiel al modelo de Fase 1.
  2. Una hoja aparte como tabla de `needs` (una fila por necesidad), y GHL solo para el contacto.
  3. `TEXTBOX_LIST` en GHL — guarda varias líneas, pero **una sola fecha para todas**, así que
     destruye el turno individual. Desaconsejado.

**(ii) El timestamp del turno no puede ser un `DATE` de GHL.**
El tipo `DATE` no lleva hora. Una visita de campo entera ocurre **el mismo día**: con
granularidad de día, el FIFO del §9 no puede ordenar a dos personas de la misma jornada — que
es justo el caso que va a existir. Por eso el campo 4 se especifica **`TEXT` con ISO-8601
completo** (`2026-08-26T14:03:22-05:00`), puesto por el sistema, nunca tecleado.
_(No verificado contra la UI de GHL en esta sesión — el token no autoriza crear campos. Quien
lo arme: confirmar si GHL ofrece un date-time con hora; si lo ofrece, úsalo.)_

**(iii) Falta el consentimiento de imagen en la captura.**
El §10.2 exige `imageConsent` explícito (fail-closed) para fotografiar adultos, y prohíbe
imágenes de menores — pero el §7.2 **no lo lista** entre los campos de Fase 0, y Fase 0 es
justamente cuando se hace la entrega en campo y se toman las fotos ("le tomemos una foto",
24-08). Tal como está, se fotografía sin registro de consentimiento.
**✅ RESUELTO 2026-08-25 — ruling de Kevin en sesión:** se añade como **campo 17**,
`Renacer consentimiento imagen` (`CHECKBOX`, fail-closed) → `beneficiaries.imageConsent`,
**obligatorio**, a crear en la misma sentada que los otros 16 (ya está en la tabla del §2).
Sigue siendo cierto que la revisión legal real está pendiente con la silla vacía (§10): este
ruling cierra el hueco de captura, no sustituye esa revisión.

---

## 6 · Lo que esta hoja NO cubre

- El **diseño del funnel y el copy** — carril `kira`, con la regla dura de §4: lenguaje de
  compra, jamás "donación"; abre por el terremoto, nunca por CoomÜnity.
- El **video** de contexto — abierto §11.c, sin guion ni pieza.
- Los **redirects `/renacer/*`** en `vercel.json` — se ponen cuando exista la URL del form
  (decisión de Kevin, 2026-08-25). Hoy `/renacer` y `/renacer/k/101` devuelven **200** servidos
  por el rewrite catch-all de la SPA (medido con curl el 2026-08-25).
- El **registro de códigos** — ya existe: `scripts/renacer-codigos.mjs` (§7.3).
