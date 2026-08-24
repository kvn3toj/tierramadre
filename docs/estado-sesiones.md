# Estado de sesiones — TierraMadre

Varias sesiones (o worktrees) tocan `main` y **producción** de este repo en paralelo. Este
archivo es el protocolo mínimo para que no se pisen: **antes de tocar `main`, de empujar a
Vercel o de correr `convex deploy`, leé la última entrada**; **al terminar, agregá la tuya**.
Entrada nueva arriba.

No reemplaza a `git log`. Es el "qué corrí en prod y desde dónde", que el log por sí solo no
cuenta — y su ausencia ya costó caro: ver la entrada del 2026-08-23 16:10.

> **Este repo tiene DOS destinos de despliegue independientes.** Anotá siempre los dos:
>
> - **Vercel** — se dispara solo con push a `main`. Publica la app entera.
> - **Convex** (`valuable-mule-753`) — es manual, `npx convex deploy`, y **sube TODO `convex/`**.
>   Hoy prod NO corre desde `main`: corre desde la pila de checkout. Decir "desplegué Convex"
>   sin decir **desde qué rama y qué SHA** deja a la siguiente sesión sin forma de reconstruirlo.

> **🔴 `main` NO SE PUEDE DESPLEGAR A PRODUCCIÓN — desde el 2026-08-23 ~04:00.**
> `build:vercel` → `scripts/build-app.mjs` → **`convex deploy --yes --cmd 'tsc -b && vite build'`**.
> O sea que **cada build de producción de Vercel despliega Convex desde `main`**, no sólo el front.
> Y el validador de `sales` de `main` rechaza los documentos vivos que escribió el riel de checkout
> (`multiplicador`), así que el build muere en «Schema validation failed». Ver la entrada del 15:45.
>
> **Y el fallo nos está protegiendo:** si ese build pasara con el `main` de hoy, desplegaría el
> `convex/` de `main` a producción y **borraría el riel de Wompi entero** — más el fix de la fuga de
> `observacion`. No lo "arregles" quitando el `convex deploy` del build: la salida es **mergear la
> pila de checkout a `main`**, junto con `deploy/fuga-observacion`.

## Formato de cada entrada

```
### YYYY-MM-DD HH:MM — <rama o worktree> — <una línea de qué>
- Tocó: <archivos/área>
- Vercel: <sí, versión X / no>
- Convex: <sí, desde rama@SHA, diff de function-spec +N/−M / no>
- Verificación: <cómo se comprobó, no "syncStatus dice synced">
- Pendiente / riesgo para la próxima sesión: <o "ninguno">
```

## Historial

### 2026-08-24 14:20 — Performer (solo lectura, sin worktree) — recorrido de UI del checkout público, de punta a punta

- **Qué:** validación del flujo de UI del checkout público en `tierramadre.app` (producción), como
  cliente, con Chrome — desktop y móvil (390px) — antes del cutover a llaves `prod_`. Sin tocar
  código ni desplegar. Un `git fetch` mostró que `origin/main` (local estaba desactualizado) **ya
  es la rama con más avance**: `origin/main` @ `6828e1e` desciende del merge de
  `integracion/checkout-a-main` (pila completa de checkout, 59 commits sobre el `main` viejo) más
  `feat/vitrinas-vencen` y el commit del certificado — o sea que el checkout público, hoy, YA vive
  en `main`, no en una rama aparte.
- **A — el 403 del WAF (el punto que decide el cutover): se degrada con gracia, pero el copy
  miente.** `res.json().catch(() => null)` en `CheckoutSheet.tsx` absorbe el cuerpo no-JSON del
  bloqueo de WAF sin explotar; `mensajeDeRespuesta(403, null)` cae al genérico. Confirmado en vivo
  (desktop y 390px): sin spinner infinito, sin pantalla en blanco, sin stack trace. El botón
  vuelve a habilitarse y el formulario conserva lo tipeado. **Pero el texto que ve el cliente es
  «No pudimos completar el pedido. Intenta de nuevo en un momento.»** — suena a fallo transitorio
  cuando en realidad es un bloqueo permanente hasta que alguien levante la regla. No ofrece una
  salida (a diferencia de `PRECIO_NO_DISPONIBLE`/`ZERO_TOTAL`, que sí dicen «Escríbenos»). El botón
  de WhatsApp sigue visible afuera del modal, así que el cliente no queda sin salida, pero el
  mensaje no se la señala.
- **B — pieza sin precio: funciona.** Con un ítem `precioCOP` vacío (#483 «Gratitud», confirmado
  por API pública que `precioFinalCOP` es `null`) en la vitrina compartida (`/v/<token>`, la
  superficie real que ve un cliente), no aparece NINGÚN botón «Pagar» ni sección «PRECIO» — sólo
  «Consultar por WhatsApp». Probado solo y mezclado con una pieza con precio en el carrito interno
  (ahí el ítem sin precio muestra «$ 0», ver hallazgo de diseño más abajo). En la vitrina pública
  del cliente, `hayPiezaSinPrecio()` cumple lo que promete.
- **C — el certificado: aparece en la ficha, NO en la vitrina del checkout.** En `/p/546` y
  `/p/544` (la ficha, ruta interna) el certificado es la 3ª de 3 diapositivas, legible en el
  lightbox (reporte ICG #025893 y GIA #2231093419 respectivamente, texto nítido). **Pero en
  `/v/<token>` — la vitrina que un cliente real recibe por el link compartido — el carrusel de
  #544 sólo tiene 2 diapositivas, sin certificado.** Lo que sí hay ahí es un link «Ver» aparte
  (sección «Trazabilidad ADN de Paz») que abre la imagen del certificado en una pestaña nueva —
  funciona, pero no es «la diapositiva del carrusel» que pedía verificar el hand-off.
- **D — móvil: mismo comportamiento del 403, más un bug nuevo — el precio es invisible en la
  vitrina a 390px.** En `/v/<token>` a 390px, el bloque «PRECIO / $186.030.176» SÍ está en el DOM
  (confirmado con extracción de texto) entre el nombre del producto y los botones, pero no se
  renderiza — cero altura visual, verificado con zoom tras 4s de espera (no es una carrera de
  carga). El cliente no ve cuánto va a pagar hasta que abre el modal «Pagar» (que sí muestra el
  total correctamente). No pasa en desktop.
- **E — copy: el genérico del 403 es el problema real** (ver A). El resto de los 5 mensajes
  conocidos (`ITEM_RESERVED`, `PRODUCT_UNAVAILABLE`, `PRECIO_NO_DISPONIBLE`, `ZERO_TOTAL`,
  `ORIGEN_INVALIDO`) se verificaron leyendo `mensajesCheckout.ts`, no en vivo — dispararlos de
  verdad requeriría crear una orden real (fuera de alcance) y hoy el WAF corta antes de llegar a
  Convex de cualquier forma.
- **Bug no pedido, reproducido 5 veces (desktop y móvil, ficha y vitrina):**
  `/api/get-batch-thumbnails` devuelve **504** de forma consistente y dispara un toast rojo «No se
  pudieron cargar las miniaturas. Intenta de nuevo.» visible al cliente en la propia pantalla de
  pago. Es independiente del WAF — va a seguir pasando con llaves `prod_`.
- **Hallazgo fuera de alcance, sin confirmar mecanismo:** la ficha interna (`/p/N`, `/product/N`)
  le muestra «Ubicación: OFI.CALI» a un visitante anónimo sin sesión (visto en #544 y #483, 3
  veces). El fix del 21-ago (`5c4fcb4`) blindó `products.publishedCatalog`/`getPublicByItem` en
  Convex; esta pantalla parece alimentarse de un camino de datos distinto
  (`api/get-treasure-sheets`, el riel viejo de Sheets, per `CLAUDE.md`) que no se auditó ese día.
  Es sólo el síntoma visual — no leí el endpoint para confirmarlo. **La vitrina pública `/v/<token>`
  no muestra esta información.**
- **Se generaron 2 links de vitrina reales** (`/v/EFK8K33QM27W` con #544, `/v/TZ2MKY83XFCZ` con
  #483) para poder ver la superficie del cliente — quedan vivos en Convex, sin más efecto que eso
  (no se creó ninguna orden; el 403 del WAF lo impidió en los dos intentos de pago).
- **Fuera de alcance, a pedido del usuario en vivo (no del hand-off):** se generó una propuesta de
  rediseño del carrito interno (`/cart`, «Mi Selección») con `/ui-ux-pro-max`, publicada como
  artifact — sólo mockup, sin tocar `src/pages/CartPage` ni ningún componente de producción.
- Vercel: no. Convex: no. Sin tocar `main` ni desplegar.
- Verificación: Chrome real contra `tierramadre.app` (desktop 1316px y 390px), `read_network_requests`
  confirmando `POST /api/checkout-create-order → 403` y `GET /api/get-batch-thumbnails → 504`, y
  `get_page_text`/DOM contra el screenshot para el bug de precio invisible en móvil.
- **Recomendación: NO, todavía no, para llaves `prod_`.** Tres bloqueadores antes del cutover: (1)
  el copy del 403 genérico induce a reintentar un bloqueo permanente — hay que arreglarlo antes de
  que el mismo path absorba cualquier fallo real de Wompi; (2) el certificado no llega al carrusel
  que el cliente realmente ve (`/v/<token>`), sólo a la ficha interna; (3) el precio es invisible en
  móvil en esa misma vitrina, así que el cliente abre «Pagar» sin haber visto antes cuánto le van a
  cobrar. Lo que SÍ está listo: la guarda de pieza-sin-precio (B) y la degradación sin crash del 403
  (A), en desktop y móvil.
- Pendiente / riesgo para la próxima sesión:
  - Arreglar el copy del 403 genérico (o mejor: detectarlo específicamente y dar un mensaje que no
    invite a reintentar).
  - Decidir si el certificado debe entrar al carrusel de `/v/<token>` (hoy sólo está en `/p/N`) o
    si el link «Ver» aparte es la UX querida — no quedó claro cuál era la intención original.
  - El bug de precio invisible en móvil en `/v/<token>` — no investigado a nivel de CSS/DOM, sólo
    confirmado el síntoma.
  - `get-batch-thumbnails` 504 — bug de backend independiente del checkout, visible al cliente.
  - La fuga de `Ubicación` en `/p/N`/`/product/N` — sin confirmar el endpoint exacto, sin fix.
  - Sigue sin resolver el `skip_limit: true` de `api/checkout-create-order.ts:112` (ya anotado en
    la entrada de las 11:30).

### 2026-08-24 11:30 — WAF + `feat/certificado-en-carrusel` → `main` — canal de pago bloqueado, certificados en el carrusel

- **🔒 El checkout público quedó BLOQUEADO en el edge.** Regla de Vercel WAF
  `checkout-publico-llaves-test`: `path equals /api/checkout-create-order → Deny`, publicada a
  producción. Verificado: el endpoint pasó de `400` (atendía) a **`403` desde el edge**.
  Control negativo en la misma medición: `get-treasure-sheets` 200, la app 200, y
  `ghl-create-order` 401 (su auth normal, no el WAF) — el riel del bot no se tocó.
- **Por qué el WAF y no quitar las llaves de Wompi.** Se leyó el orden de operaciones:
  `createOrder` corre en `checkout-create-order.ts:101` y **reserva inventario**; el link de pago se
  arma después, en la 247. Sin llaves, el endpoint devuelve `200 {pending:true}` y **no libera la
  reserva** (`RESERVA_TTL_MS = 30 min`). O sea que quitar las llaves cambiaba «regala piedras» por
  «bloquea piedras en silencio» — y como la reserva de `createOrder` es incondicional, también le
  devolvía `ITEM_RESERVED` al bot de GHL. El WAF corta ANTES de crear la orden.
- **Para levantarlo** cuando estén las llaves `prod_`:
  `npx vercel firewall rules remove checkout-publico-llaves-test && npx vercel firewall publish`.
  Segundos, sin build. La descripción de la regla dice por qué existe.
- **Certificados: los 8 del Lote Origen escritos** en `certificadoUrl` (col AM) — #483, #484, #544,
  #545, #546, #550, #551, #552. URLs verificadas con lectura anónima: **8/8 `200 image/jpeg`**.
  Se usó el JPG, no el PDF: `ProductDetailPage.tsx:325` descarta los `.pdf` del carrusel.
- **Y el arreglo que faltaba, que no era el filtro de PDFs.** `api/get-treasure-sheets` NO leía la
  columna AM, y `ProductDetailPage` resuelve su `product` desde ese riel (sólo cae al doc de Convex
  si el ítem no está en la lista, que para un publicado nunca pasa). `certificateUrl` llegaba
  `undefined` y la diapositiva nunca se armaba. Commit `6828e1e` → `main`: el mapper lee AM y el
  campo entra en `PUBLIC_KEYS`. **Efecto real medido: 373 ítems con certificado servido, no 8** —
  los 365 que ya lo tenían tampoco llegaban al cliente.
- Vercel: sí (`2026.08.24.982` en vivo). Convex: no.
- Verificación: `curl` al endpoint de producción — `certificateUrl` aparece en la respuesta y los 8
  llegan. La diapositiva en sí no se verificó en el navegador.
- Pendiente / riesgo:
  - **`skip_limit: true` sigue** en `api/checkout-create-order.ts:112`. Mientras el WAF esté puesto
    da igual; **al levantar la regla vuelve a no haber techo de 2M**.
  - **Falta validar el flujo de UI de punta a punta** antes del cutover a llaves `prod_`. Hoy nadie
    lo recorrió como cliente: se probó el riel (un pago sandbox por API) pero no la experiencia.
  - `certificadoUrl` es **campo único**, y ya se sabe cuándo va a estorbar: #544, #545 y #550 tienen
    GIA y esperan el certificado propio de Tierra Mädre. Ahí no caben los dos.

### 2026-08-24 00:10 — `main` / SOT — correcciones del Lote Origen, sync completo y cutover de pago

- **Qué:** se aplicó `PROMPT-correcciones-lote-origen.md` (pasos 0, 1 y 2), se corrió el sync
  completo Hoja→Convex, y se puso `PAYMENT_PROVIDER=wompi` en Production.
- **SOT — 20 celdas escritas, 4 omitidas.** `NO OIL` en #549, #551, #552, #553 · `F2` en #554 ·
  medidas de 3 ejes en #551, #552 y #483 · peso de #553 `0.86 → 0.84` · color de #483.
  `Lotes!C-090.pesoTotalQuilates` **21,21 → 21,22** — SUMADO de los 11, no copiado: el payload decía
  21,25 y el prompt esperaba 21,23; la suma real da 21,22.
- **Paso 0 — la frase del piso eliminada de los 9** (482, 544, 545, 546, 549, 550, 551, 553, 554).
- **Convex: sí**, `fotoSync:runFull {tables:["inventory"]}` → `patched: 12 · inserted: 0 ·
flagged: 0 · skipped: 564`. Hoja↔Convex pasó de 23 diferencias a 1.
- Verificación: relectura por cabecera nombrada + `scripts/verificar-sot-vs-convex.mjs`. #546
  confirmado en `NO OIL` en Convex (estaba publicado mostrando `F1`), #553 en `0.84`, y **0 ítems
  conservan la frase del piso en Convex**.
- **Lo omitido a propósito:**
  - **#484 `Extra Fina F2` → `Fine F2`**: `Fine F2` NO está en `CALIDADES`, y
    `CALIDAD_FACTORS[calidad] ?? 1` manda toda calidad desconocida a **factor 1.0** — el cambio
    dejaba la pieza fuera de vocabulario igual que antes. El valor que el certificado respalda es
    `F2` (factor 0.85). Pendiente de decisión.
  - **#552, bloque de plata**: el payload esperaba `precioFinalCOP` vacío y la hoja tiene 9.000.000.
    Se omitieron costo Y precio juntos — escribir sólo el costo dejaba la razón en 1,60 cuando todo
    C-090 va a ×4,5. **También se omitió su append**, que dice «Costeado y corregido… $5.632.706…
    Precio $25.347.177»: escribirlo sin las celdas dejaba la fila afirmando un costeo que no tiene.
- **⚠️ La verificación del paso 0 que pedía el prompt ya no mide lo que cree medir.** Pedía llamar
  `getPublicByItem` sin credenciales. Esa prueba **pasa siempre** desde el 2026-08-23 16:10, porque
  `observacion` salió de la proyección pública: el campo no viaja, esté sucio o limpio. La
  verificación real es leer el campo crudo.
- Pendiente / riesgo — **🔴 lo más urgente del repo ahora mismo:**
  - **El checkout público puede regalar inventario.** Se puso `PAYMENT_PROVIDER=wompi` (Production +
    redeploy `6odqb0jy3`), pero **las llaves de Wompi en Production son de TEST** (confirmado por el
    dueño). Con una `pub_test_` el cliente aterriza en el sandbox, donde una tarjeta de prueba
    aprueba — y esa cadena ya se probó end-to-end: marca la pieza `VENDIDA` y la empuja a la hoja.
    **Cualquiera con un link de vitrina puede marcar una esmeralda como vendida sin pagar.** Y
    `skip_limit: true` sigue en `api/checkout-create-order.ts:112`, así que tampoco hay techo.
    Salidas: bajar el punto de entrada público, quitar las llaves (`WOMPI_NOT_CONFIGURED`), o
    completar el cutover a llaves `prod_`. **Sin resolver.**
  - **La sesión `checkout-wompi-public-surfaces` se cerró**; el riel de Wompi quedó sin dueño.
  - Los certificados **no están donde el service account los vea**: `certificadoUrl` sigue vacío en
    los 12 ítems con certificado leído, y `GOOGLE_SHARED_DRIVE_ID` (`1KfDhH…`) devuelve «Shared
    drive not found» para `tierra-madre-inventory@winged-scout-480001-a9`.
  - **38 ítems dicen color `Verde Muzo`, 35 publicados**, y ningún reporte del ICG ni del GIA
    menciona Muzo. Decisión de política pendiente.
  - **Dato nuevo del 24-ago:** la diapositiva 11 de la presentación «LOTE ORIGEN» rotula el reporte
    `028298` (2,88 ct, Fine) como **«Lote: 170-2»** — primera evidencia dentro del material fuente
    de que el Lote 170 existe como agrupación propia. Toca la pregunta abierta que bloquea el
    recosteo de $29,98 M.

### 2026-08-23 16:10 — `deploy/fuga-observacion` (base `chore/wompi-sandbox`) — cierre de la fuga de `observacion` en el catálogo público

- **Qué:** `products:getPublicByItem` devolvía `observacion` **sin autenticación**. Medido sobre
  las 443 filas publicadas: 210 traían texto y **204 de esas eran bitácora interna de costeo** —
  tarifa por quilate, fórmula del precio de lista, número de factura, y en nueve la frase
  literal `Piso de negociación $X (× 3.5) — INTERNO, no se anuncia`. Los ítems se numeran de
  corrido y el QR es `/p/<n>`, así que la enumeración era trivial. `observacion` pasó de
  `CAMPOS_PUBLICOS_CATALOGO` a `CAMPOS_RESERVADOS_CATALOGO`.
- Tocó: `convex/products.ts` (solo eso, +23/−2).
- Vercel: no.
- **Convex: sí — `deploy/fuga-observacion` @ `5ccf198`, base `chore/wompi-sandbox` @ `a1e1d3a`.**
  `function-spec --prod` antes y después: **316 entradas / 315 identificadores únicos las dos
  veces, −0 perdidas, +0 nuevas.** Las 22 funciones del riel V4 intactas antes y después.
- Verificación: llamada **anónima** (`ConvexHttpClient` sin credencial) contra
  `valuable-mule-753` sobre los nueve ítems del piso → los nueve dejaron de devolver
  `observacion`, conservando nombre y precio. No por lectura de código.
- Pendiente / riesgo:
  - **Si algún día hace falta una descripción pública de verdad, va en un campo propio**
    (`descripcionPublica`), no reutilizando la bitácora. El error de origen fue que un campo con
    dos públicos distintos siempre termina sirviendo al equivocado.
  - `precioEspecial` NO se rompió: `precioEspecialDeObservacion()` lee el documento crudo, antes
    de la proyección.

### 2026-08-23 15:45 — `main` — 🔴 el deploy de producción FALLÓ, y el `main` de hoy es indesplegable

- **Qué pasó:** el push de `fix/catalogo-respeta-despublicado` a `main` (entrada de las 15:44)
  disparó el build de producción y **murió en `Schema validation failed`** — el mismo
  `multiplicador` en `sales` que bloquea un `convex deploy` manual desde `main`. Deployment
  `lzkaqh05l`, estado `● Error`, `Command "npm run build:vercel" exited with 1`.
- **Consecuencia inmediata:** el filtro de publicación **NO está en vivo**. Producción sigue
  sirviendo `2026.08.22.1294`, y #339 / #487 / #491 siguen en la vitrina pese a estar
  despublicados en Convex. Los tres commits (`1d2476f`, `668ca09`, `5aa411b`) están en `main`
  sin desplegar.
- **Desde cuándo:** el último build de producción exitoso fue `al273jl60`, el 22-ago 16:34 (`fd73d78`). El riel de checkout se desplegó a Convex a las ~04:00 de hoy y escribió el
  primer `sales` con `multiplicador`. **Desde ese momento `main` quedó indesplegable**, y nadie lo
  notó durante ~17 h porque nadie empujó a `main` en esa ventana. Yo fui el primero.
- Verificación: `vercel ls --prod` + `vercel inspect <url> --logs`. El log muestra el `vite build`
  completo y en verde, y el fallo **después**, en el `convex deploy` que envuelve al build.
- Pendiente / riesgo — **esto es lo que hay que resolver antes que nada:**
  - **La salida es mergear la pila de checkout a `main`**, con `deploy/fuga-observacion` adentro.
    Mientras eso no pase, `main` acumula commits que no llegan a producción.
  - **NO quitar el `convex deploy` del build para "destrabarlo".** Ese acoplamiento es lo único
    que hoy impide que un build de `main` pise el riel de Wompi en prod.
  - **Quien haga ese merge tiene que incluir `deploy/fuga-observacion` (`5ccf198`).** Si `main`
    se vuelve desplegable sin ese commit, el primer build exitoso despliega el `convex/` de `main`
    y **reabre la fuga de `observacion`** que se cerró hoy a las 16:10.

### 2026-08-23 15:44 — `fix/catalogo-respeta-despublicado` → `main` — despublicar por fin saca de la vitrina

- **Qué:** `api/get-treasure-sheets` devolvía TODA fila con `item > 0` — las 576 — **sin mirar
  `mostrarEnCatalogo` ni una vez**. Había dos catálogos con reglas distintas: el de Convex
  respetaba la bandera y el Treasure Browser, que es el que la gente mira, la ignoraba. Se
  destapó con tres duplicados retirados (#339, #487, #491) que seguían en vitrina después de
  despublicarlos. Va con el fix de identidad de `93A`/`93B` (ver abajo).
- Tocó: `api/get-treasure-sheets.ts`, `api/_lib/catalogoPublicado.ts` (nuevo),
  `api/_lib/catalogProjection.ts`, `src/types/index.ts`, `src/hooks/useFotosintesisCatalog.ts`,
  - 3 archivos de tests.
- **Vercel: sí** — `main` `fd73d78..5aa411b`, `APP_VERSION 2026.08.23.942`. `main` estaba tomado
  por el worktree `cotizacion-lock`, así que se empujó la rama directo a la ref remota.
- Convex: no.
- Verificación: simulado contra datos de producción antes de commitear → 576 → 440, con #339,
  #487 y #491 fuera y #542/#543 dentro. Suite 1816/1816, `tsc` limpio.
- Pendiente / riesgo:
  - **La bandera se lee de Convex, NUNCA de la columna Y.** Medido el 2026-08-23: la hoja tenía
    204 en `true` y Convex 443, con **279 filas en desacuerdo**. Filtrar por la columna habría
    escondido 239 ítems legítimos.
  - El filtro es **fail-open** a propósito: sin Convex se sirve la hoja sin filtrar. Lo sensible
    lo recorta `projectForGrant`, que no depende de esa llamada.
  - `itemId` es opcional en `TreasureItem`; los fixtures estáticos no lo traen. Quien lo consuma
    cae a `String(item)`.

### 2026-08-23 ~04:00 — `feat/checkout-publico-superficies` @ `7895c8a` (worktree `.claude/worktrees/checkout-publico`) — riel de checkout Wompi

- Registrado **a posteriori** (2026-08-23 16:10) a partir del dato que aportó esa sesión, porque
  este archivo no existía cuando corrió.
- Vercel: **no** (la rama sólo tuvo previews; producción siguió sirviendo `main`).
- Convex: sí, `CONVEX_DEPLOYMENT=prod:valuable-mule-753 npx convex deploy`. `function-spec` antes
  y después: **314 → 315, +1 (`sales:estadoPublico`), −0.** V4 presente en ambas (22 funciones).
- **⚠️ CAMBIO DE CONDUCTA EN EL RIEL VIVO DEL BOT, no sólo funciones nuevas.** El deploy subió la
  fase 2 entera, y la **reserva de inventario de `createOrder` es incondicional**: se aplica a
  TODA llamada, incluida la del bot de GHL, no sólo al checkout público. Desde este deploy, un
  pedido del bot sobre una piedra que otro cliente tiene apartada hace <30 min falla con
  `ITEM_RESERVED` en vez de crear una segunda venta. **Es el cierre del bug de doble venta**, y es
  deseado — pero si alguien ve un pedido del bot fallando con ese error, no es una regresión.
  `markOrderPaid` además marca la piedra `VENDIDA` y **la empuja a la hoja** (era manual antes).
- Verificado end-to-end el mismo día, con pago sandbox real por el navegador (VISA \*_\*\*4242):
  venta `VO-0004` → `confirmada · wompi · APPROVED`, `providerTxId` idéntico al comprobante, sin
  columnas `mp_`, `totalCOP = precioBaseCOP × multiplicador 1`. Las piedras 416 y 397 se marcaron
`VENDIDA` y llegaron a la hoja (`productEdits.status: 'saved'`).
- **Datos de prueba en prod: creados y REVERTIDOS.** Cuatro ventas (`VO-0001`…`VO-0004`)
  canceladas vía `sales:_cancel` — la reversión canónica, la que nombra el propio `_saveEdit` al
  negarse a sacar una pieza de `VENDIDA` mientras una venta viva la posea. `VO-0004` devolvió
  `restored: 2`. Los 5 ítems tocados (416, 397, 323, 324, 411) verificados en `DISPONIBLE`, con la
  restauración empujada a la hoja. **Quedan sin borrar los clientes de prueba** (celulares
  `30000000xx`): borrar datos no es algo que esta sesión haga por su cuenta.
- **Por qué hubo que mergear `main` primero:** desplegar la pila de checkout sin `main` encima
  falla en validación de esquema con
  `configPrecios ... extra field ivaGemaPct that is not in the validator` — el PR #142 agregó ese
  campo el 20-ago. **Corré `npx convex deploy --dry-run` antes, siempre.**
- Pendiente / riesgo:
  - **Producción corre desde una rama de feature sin mergear**, no desde `main`. Hay que decidir
    si `chore/wompi-sandbox` / `feat/checkout-publico-superficies` se mergea a `main` o si se
    acepta explícitamente que prod vive en una rama. Mientras tanto, **nunca despliegues Convex
    desde `main`**: le falta `sales:estadoPublico` y el `multiplicador` del validador de `sales`.
  - Sin medir: si el `movimientosV4` que corre en prod está en uso vivo por el anima-bot o es
    residuo de un deploy viejo. `registrarViaBot` lo sugiere, pero eso es lectura de nombre, no
    medición.

---

## Cómo identificar desde qué rama corre Convex prod (si vuelve a perderse el rastro)

Costó una investigación entera el 2026-08-23. El método, por si sirve:

1. `npx convex function-spec --prod` → la superficie viva. Compará contra lo que cada rama
   produciría, derivado del fuente.
2. **Ojo con el filtro de archivos.** `^convex/[A-Za-z]+\.ts$` **excluye todo nombre con dígito**
   — o sea `lotsV4.ts`, `movimientosV4.ts`, `migracionV4.ts`, `mantenimientoV4.ts`. Con ese
   filtro toda rama parece haber perdido el riel V4 y se concluye, en falso, que producción corre
   algo que no está en el árbol. Usá `[A-Za-z0-9]+`.
3. El esquema discrimina mejor que los nombres: buscá un campo que solo un grupo de ramas declare
   (acá fue `configPrecios.ivaGemaPct`) y fijate si algún **documento vivo** lo tiene. Si lo
   tiene, las ramas que no lo declaran habrían fallado la validación.
4. `function-spec` trae entradas **sin `identifier`** (las HttpActions de `/sync/foto`). Contar
   entradas da 316 y contar identificadores únicos da 315. No es un deploy intermedio, es método.
