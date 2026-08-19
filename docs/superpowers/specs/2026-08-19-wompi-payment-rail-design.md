# Wompi payment rail (phase 1 of 4)

**Fecha:** 2026-08-19
**Estado:** diseño aprobado, listo para plan de implementación
**Alcance:** el riel de pago Wompi del lado del servidor, montado sobre el rail
del bot que ya existe. Sin UI.
**Precede a:** fase 2 (reserva de inventario + endpoint público), fase 3 (checkout
in-app), fase 4 (Bre-B transferencia manual) — ver «Fuera de alcance».

---

## Problema

Hoy el único riel de cobro es **MercadoPago Checkout Pro**, y lo maneja
enteramente el bot de GHL / web-madre. Ningún cliente puede pagar desde la app:
`src/pages/CartPage.tsx` es un flujo de consulta por WhatsApp que nunca toca
pagos.

El objetivo final es cobrar dentro de la app, desde tres superficies (`/cart`,
`/v/:code`, `/p/:itemId`), sin techo de monto. Eso es demasiado para un solo
spec, y explorando el código aparecieron dos bloqueadores que un checkout
público sin techo vuelve urgentes:

1. **Riesgo de doble venta.** `convex/ghl.ts:304` verifica
   `product.estado !== 'DISPONIBLE'` pero **nunca reserva la piedra**. Dos
   compradores pueden llegar los dos a una venta `reservada` sobre la misma
   esmeralda única, y los dos pagar. Con el volumen del bot y el techo de 2M era
   tolerable; con un checkout público sin techo, no.
2. **`/pedido-confirmado/:saleId` no existe.** El `back_urls.success` de MP ya
   apunta a un 404 (`api/ghl-create-order.ts:135`).

De ahí la descomposición en cuatro fases. **Este spec es la fase 1**: el riel
Wompi del lado del servidor, montado sobre el rail del bot que ya funciona. No
agrega superficie de ataque, no toca UI, y es demostrable de punta a punta antes
de que exista un solo botón de «Pagar».

### Restricción encontrada: Wompi no cobra por Bre-B

Los métodos de **recaudo** de Wompi en Colombia son `CARD`,
`BANCOLOMBIA_TRANSFER`, `BANCOLOMBIA_QR`, `NEQUI`, `PSE`,
`BANCOLOMBIA_COLLECT`, `BANCOLOMBIA_BNPL`, `DAVIPLATA`, `PCOL` y `SU_PLUS`.

**Bre-B aparece únicamente en _dispersiones_** (enviar plata hacia una llave), y
aun ahí marcado «Próximamente». No es un tema de configuración de la cuenta de
Tierra Madre: hoy nadie puede cobrar por Bre-B vía Wompi.

Por eso Bre-B queda como **fase 4** y por una vía distinta: mostrar la llave
propia de Tierra Madre para transferencia directa banco-a-banco, con
confirmación manual del staff. Cuando Wompi habilite recaudo Bre-B, entra como
un método más del checkout de la fase 1 sin cambiar nada de este diseño.

---

## Diseño

### 1 · Arquitectura — espejo 1:1 de los archivos de MercadoPago

El riel MP ya está factorizado como corresponde: funciones puras + `fetchImpl`
inyectable, IO sólo en el handler. Wompi recibe los mismos tres archivos, con
los mismos nombres relativos, para que quien conoce uno conozca el otro.

| Archivo nuevo                 | Espeja             | Contenido                                                                        |
| ----------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `api/_lib/wompi-signature.ts` | `mp-signature.ts`  | `buildIntegritySignature()` y `validateWompiChecksum()`. Ambas puras.            |
| `api/_lib/wompi.ts`           | `mp-preference.ts` | `buildCheckoutUrl()` (pura) y `fetchTransaction()` (con `fetchImpl` inyectable). |
| `api/wompi-webhook.ts`        | `mp-webhook.ts`    | Los mismos 6 pasos del handler.                                                  |

**Reutilización, no duplicación:** `decideWebhookOutcome`
(`api/_lib/mpWebhookLogic.ts`) es casi agnóstica del proveedor — sus campos
`type`/`dataId` mapean a `event`/`transaction.id` sin cambios. Se **renombra** el
archivo a `api/_lib/webhookLogic.ts` y el test `tests/mpWebhookLogic.test.ts`
se renombra con él.

Con una corrección encontrada al escribir el plan: la función **compara contra
el literal `"payment"`**, que es de MercadoPago. Recibe entonces un parámetro
aditivo `actionableType`, con default `"payment"`, y Wompi pasa
`"transaction.updated"`. Al ser un default, el comportamiento de MercadoPago no
cambia en un solo bit.

Ojo con una asimetría del patrón actual: **ningún handler importa este módulo**
— cada uno inlinea sus ramas y el módulo existe como tabla de verdad testeable
(así lo dice `api/mp-webhook.ts:17`). `api/wompi-webhook.ts` sigue esa misma
convención en vez de cablearlo.

#### `buildIntegritySignature`

SHA256 hex de la concatenación **en este orden exacto**:

```
<reference><amountInCents><currency><WOMPI_INTEGRITY_SECRET>
```

y cuando se envía `expiration-time`, la fecha ISO8601 va **antes** del secreto:

```
<reference><amountInCents><currency><expirationTime><WOMPI_INTEGRITY_SECRET>
```

El secreto de integridad **nunca** sale del servidor.

#### `validateWompiChecksum`

Wompi firma cada evento con un checksum SHA256. Para validarlo:

1. Resolver, **en orden**, los dot-paths listados en `event.signature.properties`
   contra el cuerpo del evento (p. ej. `transaction.id`, `transaction.status`,
   `transaction.amount_in_cents` resuelven contra `event.data`).
2. Concatenar esos valores, luego `event.timestamp`, luego
   `WOMPI_EVENTS_SECRET`.
3. SHA256 hex, y comparar contra el header `X-Event-Checksum` con
   `crypto.timingSafeEqual` (comparación de tiempo constante), guardando primero
   la longitud — `timingSafeEqual` lanza si los buffers difieren en tamaño.

Igual que `validateMpSignature`: **nunca lanza**, devuelve `false` ante cualquier
entrada faltante o malformada, y el handler responde 401.

#### `buildCheckoutUrl`

Pura. Devuelve la URL firmada del Web Checkout:

```
https://checkout.wompi.co/p/
  ?public-key=<WOMPI_PUBLIC_KEY>
  &currency=COP
  &amount-in-cents=<totalCOP * 100>
  &reference=<saleId>
  &signature:integrity=<hash>
  &redirect-url=<APP_URL>/pedido-confirmado/<saleId>
  &customer-data:email=…&customer-data:full-name=…&customer-data:phone-number=…
```

Se eligió **Web Checkout por redirección** sobre el Widget embebido: replica
exactamente el flujo `init_point` de MercadoPago, no agrega un script de
terceros ni trabajo de CSP, y se comporta igual en iOS Safari. El Widget queda
como pulido posterior — la mitad del servidor (firma + webhook), que es donde
vive el riesgo, es idéntica en ambos casos.

#### `fetchTransaction`

`GET {WOMPI_BASE_URL}/transactions/:id` con `Authorization: Bearer
<WOMPI_PRIVATE_KEY>`, normalizado a
`{ id, status, reference, amountInCents, currency, paymentMethodType }`.

**Ambientes y llaves nunca se cruzan.** Sandbox es `https://sandbox.wompi.co/v1`
con el juego `pub_test_` / `prv_test_` / `test_integrity_` / `test_events_`;
producción es `https://production.wompi.co/v1` con el juego `_prod_`. Usar una
llave de un ambiente contra la URL del otro falla por diseño.

### 2 · Modelo de datos — aditivo, sin migración, sin tocar el espejo

Los campos `mp*` de `sales` (`convex/schema.ts:1165`) **quedan exactamente como
están**. Se agrega una terna neutral respecto del proveedor, en vez de un
segundo juego `wompi*`, porque la fase 4 (Bre-B manual) necesitaría un tercero:

```ts
paymentProvider: v.optional(v.string()),  // 'mercadopago' | 'wompi' | 'breb-manual'
providerTxId:    v.optional(v.string()),
providerStatus:  v.optional(v.string()),
```

Los tres opcionales y aditivos, para que las ventas legacy de Fotosíntesis
validen sin tocarlas — la misma convención que ya usó el bloque de GHL.

**Ninguno de los tres está en `COLUMN_MAPS.sales`**
(`convex/_lib/columnMaps.ts:71`), así que el espejo a Sheets no se entera y no
hace falta ningún cambio coordinado de pestaña. El único campo espejado que
cambia de valor es `formaPago`, que pasa a `'wompi'`; se verificó que nada en
`src/`, `api/` ni `convex/` ramifica sobre `'mercadopago'` — el único lugar donde
aparece es la escritura en `convex/ghl.ts:348`.

`applyPaymentToSale` (`convex/_lib/applyPayment.ts`) se generaliza: hoy compara
`payment.status !== "approved"` con el literal de MP. Pasa a recibir un
`approved: boolean` **ya normalizado por el adaptador** (`"approved"` en MP,
`"APPROVED"` en Wompi) más el nombre del proveedor, y su `patch` emite la terna
neutral — siguiendo además escribiendo `mpPaymentId`/`mpStatus` cuando el
proveedor es `mercadopago`, para no hacer regresar nada. La tabla de decisión
(`not-approved` / `already-paid` / `cancelled`) no cambia.

### 3 · Flujo — por dónde llega Wompi a un cliente en la fase 1

Como esta fase no trae UI, Wompi viaja sobre el **rail del bot que ya existe**.

```
bot GHL / web-madre
  → POST /api/ghl-create-order          (Bearer GHL_API_SECRET)
  → Convex ghl.createOrder              (recarga precios, crea venta `reservada`)
  → buildCheckoutUrl()                  (firma de integridad, server-side)
  → { order_id, total_cop, checkout_url }
  → cliente paga en checkout.wompi.co
  → POST /api/wompi-webhook             (X-Event-Checksum)
  → fetchTransaction()                  (nunca se confía en el cuerpo)
  → Convex ghl.markOrderPaid            (idempotente)
  → venta `confirmada` + 1 comisión + fan-out a GHL
```

`api/ghl-create-order.ts` recibe un switch por entorno `PAYMENT_PROVIDER`, con
default `mercadopago` — **el deploy no cambia ningún comportamiento** hasta que
se cambie la variable. La respuesta agrega un `checkout_url` neutral **junto al
`mp_url` existente**, que se conserva para que el workflow de GHL que hoy lo lee
siga funcionando.

**`reference` = `saleId`**, espejando la semántica de `external_reference` de MP.
La documentación de Wompi no dice si una referencia puede repetirse entre
reintentos; nuestro webhook es idempotente en cualquier caso, así que un
reintento es inofensivo. **Si** en sandbox se comprueba que Wompi rechaza una
referencia duplicada, el plan B es `saleId~N` con `N` guardado en la venta y
cortado en el `~` al recibir el webhook (los `saleId` contienen `-` pero nunca
`~`). **Esto se verifica en sandbox antes de escribir el plan de
implementación.**

`amount-in-cents` = `totalCOP * 100`, con guarda de entero (`Number.isInteger`)
para que un `totalCOP` fraccionario nunca produzca una firma sobre un monto que
Wompi redondee distinto.

### 4 · Manejo de errores

- **Desfase de deploy.** Convex y Vercel se despliegan por separado, así que
  renombrar un argumento de mutación rompe el webhook vivo durante la ventana
  entre ambos. `markOrderPaid` recibe los argumentos nuevos como **adiciones
  opcionales** y lee el que esté presente; **se despliega Convex primero, Vercel
  después**, y un commit posterior elimina los nombres viejos una vez que ambos
  están arriba.
- **Idempotencia.** Sin cambios y ya probada: un replay entra a
  `applyPaymentToSale`, sale `already-paid`, y no hay segunda comisión ni
  fan-out duplicado a GHL.
- **Wompi caído al crear la orden.** Mismo camino elegante que ya tiene MP
  (`ghl-create-order.ts:154`): la venta ya está comprometida en Convex, así que
  se devuelve con `pending: true` en vez de estallar y perder la orden.
- **Fallo al reconsultar la transacción** → 500, para que Wompi reintente (hasta
  3 veces en 24h).
- **Fan-out a GHL fallido** → best-effort, marca `pendingGhlSync` y devuelve 200:
  la venta ya está comprometida.

### 5 · Pruebas

Unitarias, espejando las que ya existen — puras, sin mocks:

- `tests/wompiSignature.test.ts` — vector de firma de integridad tomado de la
  documentación de Wompi; resolución de dot-paths del checksum; rechazo de
  checksum alterado; rechazo ante header ausente o malformado.
- `tests/wompiCheckout.test.ts` — `buildCheckoutUrl` (orden de parámetros,
  conversión a centavos, guarda de entero).
- `tests/applyPayment.test.ts` — extendido para cubrir los dos proveedores.
- `tests/webhookLogic.test.ts` — renombrado desde `mpWebhookLogic.test.ts`, sin
  cambios de contenido.

**End-to-end en sandbox, antes de tocar una llave de producción:** crear orden →
pagar con tarjeta de prueba → webhook → venta `confirmada` + exactamente **una**
fila en `commissions` + tag `cliente-pago-confirmado` en GHL → **reenviar el
webhook** y confirmar que sigue habiendo una sola comisión.

El **debugger de integración** del panel de Wompi sirve para inspeccionar los
eventos enviados y sus checksums durante esta verificación.

### 6 · Variables de entorno

Nuevas en Vercel (entorno Production, marcadas _Sensitive_):

| Variable                 | Valor                                                            |
| ------------------------ | ---------------------------------------------------------------- |
| `WOMPI_PUBLIC_KEY`       | `pub_test_…` / `pub_prod_…`                                      |
| `WOMPI_PRIVATE_KEY`      | `prv_test_…` / `prv_prod_…`                                      |
| `WOMPI_INTEGRITY_SECRET` | `test_integrity_…` / `prod_integrity_…`                          |
| `WOMPI_EVENTS_SECRET`    | `test_events_…` / `prod_events_…`                                |
| `WOMPI_BASE_URL`         | `https://sandbox.wompi.co/v1` / `https://production.wompi.co/v1` |
| `PAYMENT_PROVIDER`       | `mercadopago` (default) \| `wompi`                               |

URL del webhook a registrar en el panel de Wompi:
`https://tierramadre.app/api/wompi-webhook`.

Ningún secreto se copia a este repo.

---

## Fuera de alcance (fases siguientes)

Cada una con su propio spec → plan → implementación.

- **Fase 2 · Reserva de inventario + endpoint público.** Reserva real con TTL,
  liberada por el cron que ya marca las `reservada` viejas
  (`convex/ghl.ts:512`), más `api/checkout-create-order.ts`: sin autenticar,
  con rate limiting (el patrón ya existe en `api/vault-unlock.ts`), y precios
  siempre recargados en el servidor. **Es requisito de seguridad y corrección
  antes de cualquier botón de «Pagar» público.**
- **Fase 3 · Checkout in-app.** `<CheckoutSheet>` compartido por `/cart`,
  `/v/:code` y `/p/:itemId`; formulario de contacto y envío; y la ruta faltante
  `/pedido-confirmado/:saleId`.
- **Fase 4 · Bre-B transferencia manual.** Mostrar la llave propia de Tierra
  Madre con monto y `saleId` como referencia; «Ya transferí» deja la venta en
  `reservada` marcada; el staff confirma desde el admin con traza de quién
  confirmó. Independiente de Wompi.

La decisión de **no aplicar el techo de 2M** al checkout in-app se toma en la
fase 3. En la fase 1 el rail del bot conserva `isOverLimit`
(`convex/ghl.ts:312`) sin cambios.

---

## Archivos del código (referencia)

Existentes que se tocan:

- `convex/schema.ts` — terna `paymentProvider` / `providerTxId` / `providerStatus`
- `convex/_lib/applyPayment.ts` — generalizar a `approved: boolean` + proveedor
- `convex/ghl.ts` — `markOrderPaid` (args aditivos), `createOrder` (`formaPago`)
- `api/ghl-create-order.ts` — switch `PAYMENT_PROVIDER`, `checkout_url`
- `api/_lib/mpWebhookLogic.ts` → `api/_lib/webhookLogic.ts` (renombre)

Nuevos:

- `api/_lib/wompi-signature.ts`
- `api/_lib/wompi.ts`
- `api/wompi-webhook.ts`
- `tests/wompiSignature.test.ts`, `tests/wompiCheckout.test.ts`

## Referencias

- Widget y Checkout Web — https://docs.wompi.co/docs/colombia/widget-checkout-web/
- Métodos de pago — https://docs.wompi.co/en/docs/colombia/metodos-de-pago/
- Eventos (webhooks) — https://docs.wompi.co/docs/colombia/eventos/
- Ambientes y llaves — https://docs.wompi.co/docs/colombia/ambientes-y-llaves/
- Dispersiones BRE-B — https://docs.wompi.co/docs/colombia/guia-integracion-breb/
- `docs/mercadopago-setup-and-swap.md` — el riel espejado por este diseño
