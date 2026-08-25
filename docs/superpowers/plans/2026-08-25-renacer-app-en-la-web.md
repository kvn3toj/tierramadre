# Renacer — la campaña dentro de la app (plan de implementación)

> **Para trabajadores agénticos:** SUB-SKILL REQUERIDA: usá
> `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans`
> para ejecutar este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Objetivo:** construir el flujo completo de la campaña Renacer **dentro de la app web de
Tierra Mädre**, en las rutas que el QR impreso ya congeló, con persistencia real desde la
primera pantalla. Las 14 pantallas del §8.2 del spec, beneficiario primero.

**Spec:** `docs/superpowers/specs/2026-08-25-renacer-qr-flow-design.md`
(compuerta §3.4 y precios §11.1 **ratificados** el 2026-08-25 — no se re-litigan aquí).

**Fallo de Kevin del 2026-08-25 que define este plan** (verbatim):

> «Quiero que todo lo relacionado a renacer y forms y todo, va dentro de la app, GHL por
> ahora será únicamente canal de comunicación, y después miramos si logramos integrar el
> form ahí, por ahora solo interfaz en la web para completar todas las pantallas.»

Y sobre el alcance de "solo interfaz": **pantallas + guardado real** — la herramienta tiene
que poder ir a una visita de campo.

## Qué cambia respecto del spec, y qué NO

| §    | Lo que decía el spec                           | Lo que rige ahora                                                        |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| §7.1.3 | Form GHL para el beneficiario                | **Descartado.** El form vive en la app.                                  |
| §7.2 | Custom fields de GHL como vehículo de captura  | **Descartado como vehículo.** La tabla de mapeo sobrevive como modelo.   |
| §3.3 | Fase 0: `/renacer/k/:codigo` → 307 al form GHL | **No hace falta redirect.** El rewrite catch-all ya sirve esos paths.    |
| §7   | Fase 0 no-code + Fase 1 app                    | **Colapsan en una.** No hay etapa no-code.                              |
| §8.1 | App standalone, Convex propio                  | UI **dentro de esta app**; Convex **sí** propio (la línea roja aguanta). |
| §3.4 | URL impresa y código                           | **INTACTO.** No se toca nada de la compuerta.                           |
| §11.1| Precios de los 4 kits                          | **INTACTO.** Es la tabla de servidor.                                   |

Dos consecuencias que este fallo **resuelve gratis** (eran limitaciones de GHL, no de diseño):

- Las necesidades repetibles vuelven a ser una tabla `needs` con una fila por necesidad.
- El turno FIFO guarda un timestamp real con hora, no un `DATE` sin hora.

Y una que **desaparece del camino crítico**: el 401 del token GHL sobre `customFields`.

---

## Arquitectura

**UI en esta app, dato en un Convex aparte, y entre medio el proxy de confianza de la casa.**

```
navegador
   │  fetch('/api/renacer-registro', …)          ← sin cliente Convex en el bundle
   ▼
api/renacer-*.ts        (Vercel, Node)           ← guarda RENACER_CONVEX_URL + token
   │  ConvexHttpClient(process.env.RENACER_CONVEX_URL)
   ▼
Convex "renacer"        (deployment PROPIO)      ← cero carga sobre valuable-mule-753
```

**Por qué así y no un segundo `ConvexProvider` en React:** `build:vercel` corre
`convex deploy --yes --cmd 'tsc -b && vite build'` (`scripts/build-app.mjs:38`) — un solo
proyecto. Meter un segundo codegen adentro del build de Vite obliga a tocar el pipeline de
producción. Verificado en cambio que un directorio hermano `convex-renacer/` queda **inerte**
al build: `tsconfig.json` incluye solo `["src"]` y `api/tsconfig.json` solo `./**/*.ts`.

**Por qué un Convex aparte y no tablas con prefijo en el de producción:** `convex deploy`
sube **todo** `convex/`, así que cada deploy de campaña redesplegaría el backend del
inventario de esmeraldas — y `convex/migrations.ts` ya carga una migración sin guard
(`seedBucketC`). Además son datos de habeas data de damnificados con la silla Legal vacía.
La línea roja del §8.1 se respeta tal cual fue ratificada.

**Costo aceptado y dicho acá, no en la pantalla 6:** sin cliente Convex en el navegador **no
hay reactividad viva**. El mapa de la Tribu y el muro refrescan al montar y después de cada
acción, no solos. Para v1 alcanza; si algún día hace falta realtime, la salida es mover esas
dos pantallas a un `ConvexProvider` anidado sobre el subárbol `/renacer/*` — el corte por
ruta lo hace barato.

**Stack:** React 18.3 + TS 5.6 + MUI v6 + DS3, Vite, React Router 7.9, Convex, Vercel
Functions (Node), Vitest.

---

## Restricciones globales

- **La URL impresa es intocable.** `/renacer/k/{codigo}` es el único string irreversible del
  plan (§3.4 · G-A.1). La ruta de React tiene que existir en **ese** path exacto. No se
  renombra, no se reusa, no se le agrega prefijo.
- **`/renacer/k/*` y `/renacer/b/*` son contratos permanentes** desde el 2026-08-25.
- **No se toca `vercel.json`.** El rewrite catch-all
  (`/((?!api|assets|images|@|src|node_modules|\.)[^.]*)` → `/index.html`) ya sirve
  `/renacer/k/101` con 200 — medido con `curl -sI` contra producción el 2026-08-25.
- **Archivos congelados, dueño TM-PAGOS-APP:** `api/checkout-create-order.ts`,
  `api/_lib/wompi.ts`, `api/wompi-webhook.ts`. Renacer añade endpoints **al lado**, nunca
  edita estos (§5.1).
- **Ningún monto ni cantidad viaja desde el cliente.** El servidor valida `kitId` contra la
  tabla del §11.1 y calcula el total. Así es como REN-1 esquiva el filo `skip_limit` sin
  tocar el archivo congelado (§5.3).
- **Consentimiento fail-closed.** `donorVisibilityConsent` e `imageConsent`: ausente = **NO**
  consentido. Jamás `!== false`. El default del form es desmarcado.
- **`needs.createdAt` es el turno FIFO y es sagrado** (§9). Una necesidad sin timestamp
  propio es un turno perdido; el schema lo hace obligatorio.
- **Menores: ninguna imagen, marcado o no el consentimiento** (§10.2).
- **Minimización (§10.4):** nombre, ubicación, edad, género. **No se piden** documento,
  ingresos, estado del inmueble ni composición familiar.
- **Copy:** lenguaje de **compra**, jamás "donación" (§1). El relato abre por el terremoto,
  **nunca** por CoomÜnity (§15). Sin matiz esotérico de la esmeralda en la venta.
- **Cerca del §1:** ni tokens, ni ETAPAs, ni cadenas de "paga por adelantado", ni matriz
  PIRP, ni calculadora libre de kits, ni catálogo completo. Una sesión que quiera reabrir
  esto se detiene y escribe en el §12 del spec.
- **Diseño:** tokens desde `@/design-system` (barrel canónico) y DS3 — leer
  `DESIGN-SYSTEM-V3.md` antes de crear componentes. Nada de colores literales.
- **Idioma: ES únicamente en v1.** El target son colombianos (§14). No se agregan claves EN.
- **Anti-parpadeo:** las pantallas con imagen siguen las reglas del CLAUDE.md (cache
  síncrono, `aspect-ratio` reservado, keys únicas).
- **Tests:** Vitest, `tests/*.test.ts(x)`. Typecheck con `npm run lint`, unitarias con
  `npm run test:unit`.

---

## Decisiones de diseño que este plan toma (con su razón)

Ninguna reabre algo ratificado; las tres resuelven huecos que el spec no cubría.

### D-1 · El carnet no puede ser un número adivinable a secas

El §3.4 aceptó que el código de kit sea adivinable con este argumento: *"el flujo del código
no lee, escribe"*. **Ese argumento no se extiende al carnet.** `/renacer/b/{numero}` **sí**
lee, y con números secuenciales cualquiera teclea `112` y ve el registro de otro — nombre y
ubicación de un damnificado. Sería una fuga de PII, no una molestia.

**Decisión:** el carnet lleva además un `token` opaco (16 bytes, base64url), y el QR digital
codifica `/renacer/b/{numero}?t={token}`. Sin token válido la página **no muestra nada**.
Como el QR de carnet es digital y no impreso (§3.2), el token no cuesta nada. La página
muestra solo lo que una entrega necesita: número, nombre de pila y código de kit — nunca la
dirección.

### D-2 · El login de Google no puede ser obligatorio en el registro asistido

El §6.6 ratifica login con Google, y el §9 ratifica **registro asistido en campo** como la
mitigación de equidad del FIFO. Son incompatibles si Google es obligatorio: el facilitador no
va a loguear su propia cuenta por cada persona.

**Decisión:** Google es el camino por defecto y da `googleId` estable. El camino asistido lo
salta, exige `assistedBy` (identificador del facilitador) y usa el **número de carnet** como
identidad estable. Ambos caminos escriben el mismo registro. El campo `assistedBy` es lo que
hace medible la mitigación del §9.

### D-3 · La tabla madre de códigos se muda a Convex

`scripts/renacer-codigos.mjs` guarda el registro en un JSON local que la app **no puede leer
en runtime**. Con `/renacer/k/{codigo}` sirviendo desde la app, `kits` tiene que estar en
Convex o la ruta no puede resolver un código.

**Decisión:** Convex es la fuente de verdad de `kits`. El script se re-apunta a escribir por
el mismo proxy `api/renacer-*` y conserva TODAS sus guardas (dry-run por defecto, respaldo,
relectura post-escritura, `manillas_total` derivado de `kit_tipo`, secuencia sin huecos desde
101). El JSON queda como respaldo de arranque, no como fuente.

---

# Fase A — el flujo de campo (lo que bloquea la visita)

## Task 1: El proyecto Convex de Renacer y su esquema

**Objetivo:** un deployment propio, con el esquema del §8.3, sin tocar el de producción.

- [ ] Crear el directorio `convex-renacer/` en la raíz del repo (hermano de `convex/`, fuera
      del `include` de ambos tsconfig — verificar que sigue siendo así).
- [ ] Crear el proyecto Convex. **Paso interactivo:** `npx convex dev` dentro de
      `convex-renacer/` pide login y nombre de proyecto. Si el CLI pide credenciales, es
      Kevin quien lo corre. Nombre sugerido: `renacer`.
- [ ] `convex-renacer/schema.ts` con las tablas del §8.3, nombres espejo del MVP
      (el export de Fase 3 tiene que ser un **rename**, no una migración):
      - `kits`: `code` (number), `tipo`, `producto`, `saleId`, `aportadorContact`,
        `manillasTotal`, `manillasRegistradas`, `estado`. Índice por `code`.
      - `beneficiaries`: `name, email?, googleId?, ubicacion, edad, genero, kitCode,
        cardNumber, cardToken, habeasDataAcceptedAt, donorVisibilityConsent, imageConsent,
        assistedBy?`. Índices por `cardNumber` y por `kitCode`.
      - `needs`: `reporterId, whatINeed, whyItMatters, status, createdAt, supportCount`.
        `createdAt` **obligatorio**. Índice por `createdAt`.
      - `needSupports`: `needId, beneficiaryId, createdAt`. Índice compuesto para el "+1"
        idempotente.
      - `capacities`: `providerId, title, description, category?, isActive`.
      - `wallMessages`: `wall ('desahogo'|'aliento'), authorId, body, createdAt, hiddenAt?`.
- [ ] `convex-renacer/kits.ts`: `emitir` (secuencial desde 101, techo 9999, sin huecos, sin
      reutilizar; `manillasTotal` derivado de `tipo`, **nunca** del argumento), `porCodigo`,
      `marcarEstado`.
- [ ] `convex-renacer/registro.ts`: `registrarBeneficiario` — una mutation que en una sola
      transacción crea el `beneficiary`, sus `needs` (cada una con su `createdAt` propio) y
      sus `capacities`, e incrementa `kits.manillasRegistradas`.
- [ ] Guarda de secuencia del carnet: `cardNumber` secuencial, `cardToken` con
      `crypto.randomUUID()` o 16 bytes aleatorios (D-1).

**Verificación:**
- [ ] `npx convex function-spec` en el proyecto nuevo lista SOLO funciones de Renacer.
- [ ] Control negativo explícito: `npx convex function-spec --prod` **del proyecto de TM**
      (`valuable-mule-753`) antes y después — el diff debe ser `+0, −0`. Pegá ambas salidas.
- [ ] `registrarBeneficiario` con 3 necesidades produce 3 filas con **3 `createdAt`
      distintos** (no uno compartido).

## Task 2: El proxy de confianza `api/renacer-*.ts`

**Objetivo:** el único puente entre la app y el Convex de Renacer.

- [ ] `api/_lib/renacer-convex.ts`: instancia `ConvexHttpClient` con
      `process.env.RENACER_CONVEX_URL`. Espejar el patrón de `api/_lib/convex-client`.
- [ ] Endpoints (todos con validación de body, como `parseCheckoutBody`):
      - `api/renacer-kit.ts` — `GET ?codigo=101` → `{ existe, tipo, producto }`. **No
        devuelve** datos del aportador ni de otros beneficiarios.
      - `api/renacer-registro.ts` — `POST` del registro completo.
      - `api/renacer-carnet.ts` — `GET ?numero=&t=` → carnet, **exige token** (D-1).
      - `api/renacer-tribu.ts` — `GET` lista de necesidades + `POST` del "+1".
      - `api/renacer-muro.ts` — `GET`/`POST` de mensajes de muro.
- [ ] Agregar cada uno a `vercel.json` → `functions` con `maxDuration` (15 basta).
      **Este es el único cambio permitido en `vercel.json`** y no toca rutas.
- [ ] Rate limit mínimo por IP en `renacer-registro` y `renacer-muro`.

**Verificación:**
- [ ] `curl` a `/api/renacer-kit?codigo=101` → 200; a `?codigo=99999` → 404.
- [ ] Control negativo de D-1: `/api/renacer-carnet?numero=111` **sin** `t` → 403, y con un
      token incorrecto → 403. Con el correcto → 200. Mostrar las tres respuestas.
- [ ] `npm run lint` en verde (incluye `api/tsconfig.json`).

## Task 3: Las rutas públicas `/renacer/*`

**Objetivo:** que el QR impreso aterrice donde debe, sin gate de auth.

- [ ] Registrar en `InvitationRouter` (`src/App.tsx:1019`), **antes** del
      `<Route path="*" element={<AuthenticatedApp />} />` de la línea 1069:
      `/renacer`, `/renacer/k/:codigo`, `/renacer/ayudar`, `/renacer/b/:numero`.
- [ ] `src/pages/renacer/` con lazy imports y `Suspense`, como las rutas públicas vecinas
      (`/v/:code`, `/c/:folder`).
- [ ] Comentario en el bloque de rutas apuntando a §3.4: **estos paths son contratos
      permanentes; el QR impreso depende de ellos.**

**Verificación:**
- [ ] Local: `/renacer/k/101` renderiza el flujo, **sin** pedir sesión.
- [ ] Control negativo: `/renacer/k/101` en incógnito, sin ninguna sesión → misma pantalla.
- [ ] Control de no-regresión: `/v/324` y `/c/ceo-tierra-madre` siguen funcionando (una ruta
      pública mal puesta gana sobre la autenticada — está documentado en `App.tsx:1129`).

## Task 4: La puerta `/renacer` y la resolución del código

- [ ] `/renacer`: el fork de dos botones — *"¿Quieres ayudar?"* / *"Recibí una manilla — soy
      beneficiario"* (textual del 24-08). Copy de `kira`.
- [ ] El botón de beneficiario abre un campo para **teclear el código** impreso bajo el QR
      (§3.4: "si el QR falla o el teléfono no tiene cámara").
- [ ] `/renacer/k/:codigo` resuelve el código contra `api/renacer-kit`. Código inexistente →
      pantalla honesta ("no reconocemos ese código") con salida a teclearlo de nuevo, **nunca**
      un 404 crudo ni la pantalla de bienvenida del catálogo.

**Verificación:**
- [ ] Código válido, código inválido y código vacío: las tres rutas tienen pantalla propia.

## Task 5: Necesidades PRIMERO (el orden no es negociable)

- [ ] Video de contexto arriba. **La pieza no existe** (§11.c) — dejar el slot con un
      placeholder que no simule un video que no hay.
- [ ] Composer de necesidades: **texto libre**, sin categorías forzadas (§1, decisión 8).
      Cada necesidad: *qué necesito* + *por qué importa*. Botón "agregar otra".
- [ ] Cada necesidad se envía con su propio `createdAt` — **el turno del §9**.

**Verificación:**
- [ ] Cargar 3 necesidades y comprobar en Convex 3 filas con 3 timestamps distintos.
- [ ] **Invertir este paso con el Task 6 rompe una decisión ratificada del 25-08.** El test
      de la pantalla afirma el orden.

## Task 6: Datos, identidad y consentimientos

- [ ] Datos mínimos **con su razón dicha al usuario** — *"¿dónde te llevamos la ayuda?"*:
      nombre, ubicación/dirección, edad, género. Nada más (§10.4).
- [ ] Identidad: login con Google por defecto; camino asistido sin Google que exige
      `assistedBy` (**D-2**).
- [ ] Consentimientos, los tres, todos **fail-closed** y desmarcados por defecto:
      `habeasDataAcceptedAt` (con timestamp y quién asistió), `donorVisibilityConsent`,
      `imageConsent`.
- [ ] El aviso de habeas data queda **[PENDIENTE revisión legal real]** — la silla Legal está
      vacía (§10). Poner el texto provisorio y marcarlo en el código como pendiente.

**Verificación:**
- [ ] Test unitario: un registro con los tres consentimientos **ausentes** persiste
      `false`/`null`, nunca `true`. Es el patrón fail-closed del MVP.
- [ ] El camino asistido sin Google completa un registro válido.

## Task 7: El carnet

- [ ] Al completar, armar en pantalla el carnet con **número y QR propio** — "como la cédula"
      (§6.6). Guardable (descarga/captura).
- [ ] El QR codifica `/renacer/b/{numero}?t={token}` (**D-1**).
- [ ] `/renacer/b/:numero` muestra número, nombre de pila y código de kit. **Nunca la
      dirección.** Sin token → pantalla vacía con explicación.

**Verificación:**
- [ ] Los tres controles de D-1 del Task 2, ahora desde la UI.

## Task 8: Mapa de la Tribu

- [ ] Lista de necesidades de otros + botón **"+1"** (§6.8).
- [ ] El "+1" es idempotente: la misma persona no suma dos veces la misma necesidad.
- [ ] Lo que se muestra de cada necesidad respeta el consentimiento: el texto sí, la
      identidad **solo** con `donorVisibilityConsent` (§10.3).

**Verificación:**
- [ ] Doble "+1" desde el mismo beneficiario deja `supportCount` en 1.
- [ ] Control negativo: una necesidad de alguien **sin** consentimiento de visibilidad se
      muestra sin nombre. Mostrar la respuesta cruda del endpoint, no la pantalla.

## Task 9: Entorno — playlists y muro de desahogo

- [ ] Playlists (meditaciones, respiraciones, música medicina) — enlaces, sin reproductor
      propio en v1.
- [ ] Muro de desahogo con **moderación mínima desde el día uno**: `hiddenAt` para ocultar
      (§8.3). No hace falta panel; una mutation alcanza para v1.

**Verificación:**
- [ ] Un mensaje con `hiddenAt` no aparece en el `GET` del muro.

## Task 10: Capacidades

- [ ] Botón opcional *"Quiero enlistar mis capacidades"* (§6.7), mismo vocabulario que el
      flujo aportador (§8.3 → `capacities`).

---

# Fase B — el flujo aportador

> **Contexto que ordena esta fase:** el canal público de pago responde **403** desde el edge
> (WAF, medido por la sesión del 2026-08-24). Abrirlo y el cutover a llaves `prod_` son de
> **TM-PAGOS-APP**, no de REN-1 (§11.f). Las pantallas se construyen igual; el cobro real
> espera esa compuerta ajena.

## Task 11: La cuadrícula de 4 kits

- [ ] `/renacer/ayudar`: video (slot vacío, §11.c) + **los 4 kits fijos en cuadrícula**.
      **Sin calculadora** — se propuso y se rechazó (§1).
- [ ] Precios **exactamente** los del §11.1, y traídos del servidor, no escritos en el JSX.
- [ ] Selector manillas / dijes. **Solo esos dos productos** durante Renacer.

## Task 12: `api/renacer-create-order.ts`

- [ ] Endpoint **nuevo**, al lado de los congelados. Valida `kitId` + `producto` contra la
      tabla del §11.1 **en el servidor** y calcula el monto.
- [ ] **No expone `items[]` arbitrarios.** Con 4 SKUs de precio fijo el problema del monto
      arbitrario no existe — pero solo si el endpoint lo hace cumplir, no la UI (§5.3).
- [ ] Reusa `buildCheckoutUrl()` de `api/_lib/wompi.ts` **sin modificarlo**.
- [ ] Captura obligatoria en el checkout: nombre, celular, email (§4.4).
- [ ] Internacional: pide el `contacto_regalo_local` del regalo redirigido (§4.8). **Sin
      envíos al exterior, nunca** (21-08).

**Verificación:**
- [ ] Un POST con un monto inyectado desde el cliente es **ignorado**: el total sale de la
      tabla. Mostrar el request con el monto falso y la orden creada con el correcto.
- [ ] Un `kitId` inexistente → 400.
- [ ] `git diff --stat` sobre los tres archivos congelados → **vacío**.

## Task 13: Confirmación, emisión del código y GHL como canal

- [ ] Pantalla de confirmación que muestra **el código del kit** — *"este código viaja con tus
      manillas; con él vas a ver a quién le llegaron"* (§4.5).
- [ ] El código se emite **al confirmar el pago**, no antes (§7.3): el webhook marca la venta
      y recién ahí se llama `kits.emitir`.
- [ ] Re-apuntar `scripts/renacer-codigos.mjs` a Convex por el proxy (**D-3**), conservando
      todas sus guardas. Las guardas actuales están verificadas: 4 controles negativos
      devuelven exit 1 y un `--apply` fallido no escribe nada (medido 2026-08-25).
- [ ] **GHL como canal de comunicación** (fallo de Kevin): al confirmar, sincronizar el
      contacto con tag `renacer-aportador`; al registrarse un beneficiario, `renacer-beneficiario`.
      Reusar `api/ghl-sync-contact.ts`.
- [ ] Botones post-pago: *"Estar informado"* (WhatsApp / newsletter / notificaciones) y
      *"Enlistar mis capacidades"* (§4.6).

**Verificación:**
- [ ] ⚠️ **Medir primero si el token puede escribir contactos.** Lo único medido el
      2026-08-25 es que **no** puede escribir `customFields` (401, con control positivo `GET`
      200 y control negativo 17 campos antes y después). El scope de `contacts.write` **no se
      midió**. Antes de construir el sync: `POST` de prueba con control positivo y negativo, y
      si da 401, el canal GHL queda como tarea bloqueada y se dice — no se simula.
- [ ] El código NO se emite si el pago no está confirmado.

## Task 14: Panel "mis manillas" y muro del aliento

- [ ] Progreso **agregado por defecto**: *"8 de tus 10 manillas ya fueron registradas"*.
      **Identidades solo con consentimiento explícito del beneficiario** (§10.3, §4.9).
- [ ] Muro del aliento — el espejo del de desahogo (§4.7).

**Verificación:**
- [ ] Control negativo: un aportador cuyos 10 beneficiarios **no** consintieron ve el
      agregado y **cero nombres**. Mostrar la respuesta cruda del endpoint.

---

## Checklist de verificación final

- [ ] `npm run lint` en verde.
- [ ] `npm run test:unit` en verde.
- [ ] `npm run build` en verde. **Verificar el éxito explícitamente** — en zsh `set -e` no
      corta de forma fiable y ya produjo un "BUILD OK" falso sobre un build fallido.
- [ ] `curl -sI https://tierramadre.app/renacer/k/101` → **200** sirviendo la pantalla de
      Renacer (hoy da 200 sirviendo la SPA genérica — la diferencia es el contenido, así que
      la verificación es leer el HTML, no el status).
- [ ] Control negativo de despliegue: `/v/324` y `/c/ceo-tierra-madre` intactos.
- [ ] `npx convex function-spec --prod` del Convex de TM: **`+0, −0`** contra la línea base.
- [ ] Los tres archivos congelados sin cambios (`git diff --stat`).
- [ ] Recorrido completo en un teléfono de gama baja, que es el equipo real de campo.

## Explícitamente fuera de alcance

- **El form en GHL** — Kevin lo difirió: *"después miramos si logramos integrar el form ahí"*.
- **Los redirects `/renacer/*` en `vercel.json`** — ya no hacen falta (el catch-all sirve).
- **Fase 2** (dashboard de operaciones, despacho por turno) y **Fase 3** (embudo al MVP
  CoomÜnity vía invitaciones) — §8.4, dirección, no alcance.
- **Abrir el WAF y el cutover a llaves `prod_`** — TM-PAGOS-APP (§11.f).
- **Los videos** — §11.c, sin guion ni pieza.
- **El costo de envío nacional** — §11.b, sin decidir.
- **La revisión legal real** del habeas data y del copy público — §10, silla vacía.
- **Cualquier cosa de la cerca del §1.**

## Abiertos que este plan destapa

| #   | Pregunta                                                                  | Dueño     |
| --- | ------------------------------------------------------------------------- | --------- |
| g   | **¿La imprenta corre por venta confirmada, no en tirada única?** El §7.3 emite el código al confirmar el pago, y el código va impreso en los estuches de ESE kit — de donde se sigue que no se puede imprimir un lote genérico por adelantado. Un 1+100 son 101 estuches con el mismo código, impresos después de la venta. Confirmar con operaciones **antes de la primera tirada**. | Kevin / operaciones |
| h   | ¿El token GHL puede escribir contactos? Solo se midió que no puede escribir `customFields`. | Task 13 |
| i   | ¿La visita de campo tiene fecha? Es el plazo real de la Fase A entera.    | Kevin     |
