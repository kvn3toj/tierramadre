# Checkout público — protección contra abuso

> Estado al **19 ago 2026**. El código de `POST /api/checkout-create-order`
> está mergeado y probado con tests unitarios. **Ninguna de las
> configuraciones de esta guía se ha aplicado todavía en el dashboard de
> Vercel** — requiere acceso al proyecto `tierra-madre-studio` que este
> documento no tiene. Este archivo es el runbook para quien la haga.

## 1 · Qué expone el endpoint

`POST /api/checkout-create-order` es el primer endpoint de escritura de esta
app que cualquiera puede llamar con `curl`, sin credenciales — el modelo de
proxy de confianza (documentado en la cabecera del propio archivo) hace que
el servidor cargue `ADMIN_SYNC_TOKEN` y llame a una mutation de Convex que de
otro modo sería inalcanzable, pero eso protege la mutation, no al llamante
anónimo del endpoint HTTP.

Cada llamada válida:

- Crea una venta `reservada` en Convex que **aparta piedras únicas durante
  30 minutos** (`RESERVA_TTL_MS` en `convex/_lib/reservas.ts`) — durante esa
  ventana, nadie más puede comprar esas mismas piedras.
- Hace upsert de una fila en `clients`, que fluye hacia adelante a
  GoHighLevel y al espejo de Google Sheets.
- Gasta ancho de banda de Convex — el mismo recurso que este proyecto ya
  raciona a propósito (el pull de inventario se bajó de cada 15 minutos a
  diario exactamente por esto).

**La conclusión, dicha sin rodeos: el daño posible aquí no es robo. Es
denegación de venta más un CRM sucio.** Nadie puede pagar sin pasar por el
proveedor real (Wompi/MercadoPago), y los precios siempre se recargan del
lado de Convex — nada de lo que manda el cliente toca el monto. Pero una
avalancha de llamadas puede: apartar piedras reales fuera del alcance de
compradores legítimos durante 30 minutos cada vez, llenar `clients` de
basura que GHL y Sheets terminan viendo, y consumir el ancho de banda que el
proyecto ya está cuidando en otro frente.

## 2 · La decisión: Vercel WAF (rate limiting) + BotID, y por qué

La protección real no vive en el código de la función — vive en el edge, en
la capa que decide si la petición llega a ejecutarse.

**Por qué el edge y no un contador dentro de Convex:** un rate limiter de
Vercel WAF bloquea la petición **antes de que `checkout-create-order.ts`
corra**, así que una avalancha cuesta exactamente cero ancho de banda de
Convex y nunca llega a tocar GoHighLevel. No requiere código de aplicación
nuevo ni una dependencia nueva.

Un contador de rate limiting implementado _dentro_ de Convex tiene la
propiedad contraria: para que un request abusivo sea contado, **primero
tiene que llegar a Convex** — es decir, gasta exactamente el recurso que se
está intentando proteger, solo que un paso más tarde. Un atacante que manda
10.000 requests por minuto hace que Convex procese 10.000 lecturas/escrituras
de "contador" en lugar de 10.000 creaciones de venta; es mejor que la
alternativa sin ningún control, pero sigue siendo tráfico real llegando al
backend que el proyecto está razonando en términos de cuota diaria.

## 3 · Qué configurar, concretamente

Esto **no está aplicado**. Son los pasos para quien tenga acceso al
dashboard.

En Vercel → proyecto `tierra-madre-studio` → **Firewall**:

1. **Regla de rate limiting** con:
   - Path: `/api/checkout-create-order`
   - Método: **solo `POST`** (la ruta también responde `OPTIONS` para CORS
     preflight — ver `methods: ['POST', 'OPTIONS']` en el propio archivo —,
     pero un preflight no ejecuta lógica de negocio; no hace falta limitarlo).
   - Umbral sugerido como punto de partida: **5 requests/minuto y 30/hora
     por IP**. Esto es una sugerencia para arrancar, no un valor medido
     contra tráfico real — se debe afinar una vez haya datos de uso legítimo
     (por ejemplo, cuánto tarda un comprador real en reintentar tras un
     `ITEM_RESERVED`).
2. **BotID** activado para ese mismo path.

## 4 · Prerrequisito — bloqueante: confirmar que el plan de Vercel incluye rate limiting de WAF

Antes de intentar el paso 3: **algunas funciones del Firewall de Vercel son
de plan Pro en adelante**, y esto no se ha verificado contra el plan actual
del proyecto. Si al entrar a Firewall el rate limiting no está disponible,
el paso 3 completo queda bloqueado y hace falta resolver eso primero (upgrade
de plan, u otra vía).

**Si el plan no lo incluye, el fallback es un contador de ventana deslizante
dentro de Convex, keyed por teléfono e IP — y hay que decirlo sin
ambigüedad: ese fallback NO está implementado hoy.** No existe código para
él en este repo. Construirlo es trabajo pendiente, condicionado a que el
paso 3 resulte efectivamente inviable, o a que aparezca abuso real antes de
resolver el plan.

## 5 · Las defensas que sí viven en el código

Estas no dependen de ninguna configuración de dashboard — ya están
desplegadas donde esté desplegado el endpoint.

### 5.1 · Validación del body (`api/_lib/checkoutBody.ts`)

`parseCheckoutBody` es una **función pura** (sin IO, sin lectura de env,
nunca lanza) que corre completa antes de que el handler toque Convex —
cubierta por tests unitarios en `tests/checkoutBody.test.ts`. Valida, en
orden: que `contact.celular` sea un string no vacío (y que cualquier otro
campo de contacto, si viene, sea string — un tipo equivocado se rechaza en
vez de reenviarse a Convex); que `items` sea un arreglo no vacío con cada
entrada siendo un objeto con `sku` no vacío; que cada `qty` coerza a un
entero finito positivo; y que el total de unidades no exceda
`MAX_ITEMS_POR_PEDIDO` (10, definido en `convex/_lib/reservas.ts`).

**El punto que vale la pena explicar con detalle es por qué el tope sobre
`items.length` se aplica de forma independiente al tope sobre la suma de
`qty`.** La primera versión de este chequeo (antes de la revisión de
seguridad que llevó a extraerlo a este módulo) sumaba las cantidades con
`Math.max(1, Math.floor(Number(qty)))` y comparaba esa suma contra el
límite. El problema: `Number("x")` es `NaN`, y **`NaN > MAX_ITEMS_POR_PEDIDO`
es `false`** en JavaScript — la comparación no lanza, simplemente nunca es
verdadera. Un solo `qty` no numérico en cualquier posición del arreglo
convertía la suma completa en `NaN` y el guard pasaba en silencio, sin
importar cuántos ítems trajera el arreglo. Un llamante anónimo podía enviar
miles de líneas envenenadas en una sola llamada y el tope de piezas no lo
detenía.

El fix (`checkoutBody.ts`, sección "independiente de la suma de qty") separa
las dos comprobaciones: `itemsRaw.length > MAX_ITEMS_POR_PEDIDO` se evalúa
**antes** de intentar parsear ningún `qty`, así que un arreglo
sobredimensionado se rechaza por su forma sola, sin que un valor envenenado
más adelante pueda impedirlo. Después, cada `qty` se valida con
`Number.isFinite()` — que rechaza explícitamente `NaN` e `Infinity` — antes
de sumarlo. `tests/checkoutBody.test.ts` prueba exactamente este caso
("CRITICAL: rejects a huge items array with a poisoned qty, on length
alone").

### 5.2 · Allowlist de origen (`api/_lib/checkoutOrigin.ts`)

Añadida el **20 ago 2026**. El helper compartido `setCorsHeaders`
(`api/_lib/cors.js`) manda `Access-Control-Allow-Origin: *` en todos los
endpoints. Eso no le abre nada a `curl` —CORS lo imponen los navegadores, no
el servidor—, pero sí habilita una variante concreta de abuso: **una página
de un tercero puede hacer que los navegadores de sus visitantes posteen
aquí**, apartando piedras con IPs legítimas y repartidas. Es exactamente el
tráfico que un rate limit por IP no distingue de compradores reales.

El endpoint ahora rechaza con **403 `ORIGIN_NOT_ALLOWED`** cualquier `Origin`
que no esté en la lista, y refleja el origen concreto (con `Vary: Origin`) en
vez del `*`. La lista es: `https://tierramadre.app`,
`https://www.tierramadre.app`, el origen de `APP_URL`, y los extras
separados por coma de la variable opcional **`CHECKOUT_ALLOWED_ORIGINS`** —
un dominio nuevo se habilita por env, sin tocar código. Fuera de producción
(`VERCEL_ENV !== 'production'`) se acepta además `localhost` / `127.0.0.1` en
cualquier puerto, para que `vercel dev` funcione.

**Una petición SIN cabecera `Origin` pasa**, a propósito: ningún llamante de
servidor la manda (el riel del bot, un webhook, `curl`), bloquearla rompería
a los legítimos y no frenaría a nadie —quien ataca desde su propia máquina
simplemente la omite—. Por eso esto es un escalón, no la puerta: **no
sustituye al WAF del paso 3**, le quita al atacante el apalancamiento de
usar navegadores ajenos.

La regla vive sólo en este endpoint. Cambiar `setCorsHeaders` habría movido
el comportamiento de los ~40 endpoints de golpe para pagar esta factura una
sola vez.

### 5.3 · La reserva de 30 minutos

`RESERVA_TTL_MS` (`convex/_lib/reservas.ts`) aparta las piedras de una venta
`reservada` durante 30 minutos desde su `_creationTime`. Vencida esa
ventana, la reserva desaparece sola — no hay campo de estado que un proceso
externo (el pull desde Sheets, por ejemplo) pueda pisar ni un reaper que
pueda fallar y dejar una piedra bloqueada para siempre.

### 5.4 · Idempotencia contra el doble clic

`findReusableSale` busca, dentro del mismo TTL, una venta `reservada` que
pertenezca al mismo cliente y contenga exactamente el mismo conjunto de
`itemIds` (comparado vía `orderFingerprint`, que ordena los ids así que el
orden de envío no importa). Si existe, el endpoint reutiliza esa venta y
devuelve el mismo `order_id` con `reused: true`, en vez de crear una
segunda. Esto es lo que evita que un doble clic en «Pagar» — o un reintento
de red — termine creando dos ventas sobre la misma piedra.

## 6 · Cómo saber si está funcionando

**En Vercel:** una vez aplicada la regla del paso 3, la pestaña de Firewall
del proyecto muestra los requests bloqueados por esa regla específica —
un flujo sostenido de bloqueos en `/api/checkout-create-order` es la señal
de que algo (un bot, un scraper, un test roto) está golpeando el endpoint
por encima del umbral configurado.

**En Convex:** la señal de abuso que sí llegó a ejecutarse (o de tráfico
legítimo que nunca convierte) es una población creciente de ventas con
`estado: 'reservada'` que nunca pasan a `confirmada` — piedras apartadas 30
minutos, uso de ancho de banda, filas en `clients`, y ningún pago detrás.
Revisar esto periódicamente en el dashboard de Convex (o con una query
puntual sobre la tabla `sales`) es la manera de detectar abuso que ya pasó
el edge, o simplemente carritos abandonados a una escala inusual.

## 7 · Archivos del código (referencia)

- `api/checkout-create-order.ts` — el endpoint público
- `api/_lib/checkoutBody.ts` — validación pura del body, con el fix del tope
  independiente
- `tests/checkoutBody.test.ts` — casos que prueban esa validación, incluido
  el ataque de `qty` envenenado
- `api/_lib/checkoutOrigin.ts` — allowlist de origen, pura y con tests
  (`tests/checkoutOrigin.test.ts`)
- `convex/_lib/reservas.ts` — `RESERVA_TTL_MS`, `MAX_ITEMS_POR_PEDIDO`,
  `findReusableSale`, `reservedItemIds`, `findReservationConflict` (lo que
  consulta el riel del mostrador antes de vender)
- `convex/ghl.ts` — `createOrder`, la mutation detrás del proxy de confianza
