# Wompi — Setup y checklist de cutover a producción

> Estado al **9 sep 2026**. El riel Wompi completo (fases 1-3: servidor, reserva +
> endpoint público, checkout in-app) está en `main` y desplegado. **La verificación
> end-to-end en sandbox SÍ se hizo, dos veces, el 2026-08-23** (venta `VO-0001`
> por API y `VO-0004` desde el navegador: `confirmada · wompi · APPROVED`, replay del
> webhook → `already-paid`, checksum forjado → 401; ver `docs/estado-sesiones.md`
> entradas del 2026-08-23 y el echo del Constructor). Lo que sigue pendiente es el
> **cutover a llaves `prod_`** (sección 6): Production tiene llaves de test desde el
> 2026-08-23 y el endpoint público está bloqueado por la regla WAF
> `checkout-publico-llaves-test` hasta que se haga. Nada secreto se guarda en este repo.

## 1 · Los cuatro tipos de credencial y dónde viven

En el dashboard de Wompi (`https://comercios.wompi.co`, sección **Desarrolladores**)
hay dos pares de llaves, y viven en **dos sitios distintos del panel** — las dos
que se olvidan son justamente las que no están junto a las otras dos:

| Credencial            | Prefijo sandbox    | Prefijo producción | Dónde está                                                                                                                |
| --------------------- | ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Llave pública         | `pub_test_…`       | `pub_prod_…`       | Pestaña "Llaves API" (la obvia)                                                                                           |
| Llave privada         | `prv_test_…`       | `prv_prod_…`       | Pestaña "Llaves API" (la obvia)                                                                                           |
| Secreto de integridad | `test_integrity_…` | `prod_integrity_…` | Sección aparte, normalmente bajo "Firma de integridad" / configuración de Widget-Checkout — **es fácil pasarla por alto** |
| Secreto de eventos    | `test_events_…`    | `prod_events_…`    | Sección "Eventos" / webhooks — también fuera de la vista de "Llaves API"                                                  |

Los cuatro valores existen por separado para sandbox y para producción — Wompi
los distingue por el prefijo, no por un toggle de ambiente. **Nunca se copia
ninguno de estos cuatro valores a este repo** — ni en código, ni en `.env`
versionado, ni en un commit "temporal".

## 2 · Variables de entorno (Vercel)

En Vercel, proyecto `tierra-madre-studio`, entorno **Production**, todas
marcadas **Sensitive**:

| Variable                 | Valor sandbox                 | Valor producción                 |
| ------------------------ | ----------------------------- | -------------------------------- |
| `WOMPI_PUBLIC_KEY`       | `pub_test_…`                  | `pub_prod_…`                     |
| `WOMPI_PRIVATE_KEY`      | `prv_test_…`                  | `prv_prod_…`                     |
| `WOMPI_INTEGRITY_SECRET` | `test_integrity_…`            | `prod_integrity_…`               |
| `WOMPI_EVENTS_SECRET`    | `test_events_…`               | `prod_events_…`                  |
| `WOMPI_BASE_URL`         | `https://sandbox.wompi.co/v1` | `https://production.wompi.co/v1` |
| `PAYMENT_PROVIDER`       | `wompi`                       | `wompi`                          |

**Regla dura: las cuatro credenciales y `WOMPI_BASE_URL` viajan juntas, nunca
mezcladas.** Una llave `test_` contra la base de producción (o viceversa)
Wompi la rechaza por diseño — no es un fallo silencioso, pero tampoco vale la
pena provocarlo por descuido. Al hacer el cutover (sección 6) los cinco valores
se cambian en el mismo paso.

Con `PAYMENT_PROVIDER` sin definir, `api/ghl-create-order.ts` sigue por defecto
en `mercadopago` — el deploy de este riel no cambia ningún comportamiento hasta
que esta variable se ponga en `wompi`.

## 3 · Webhook a registrar en Wompi

En el dashboard de Wompi → ambiente sandbox (y, más tarde, ambiente
producción) → sección de eventos/webhooks:

```
https://tierramadre.app/api/wompi-webhook
```

El endpoint valida el checksum del evento (`X-Event-Checksum`) contra
`WOMPI_EVENTS_SECRET` y nunca confía en el cuerpo del webhook para decidir si
un pago está aprobado — siempre reconsulta la transacción real vía
`fetchTransaction()` (`api/_lib/wompi.ts`) con `WOMPI_PRIVATE_KEY`, el mismo
patrón que ya usa `api/mp-webhook.ts` para MercadoPago.

## 4 · Orden de deploy: Convex antes que Vercel — y por qué es innegociable

```bash
npx convex deploy
# verificar que el nuevo shape de argumentos aterrizó:
npx convex function-spec --prod | grep -A2 markOrderPaid
# recién ahí: push de la rama → deploy automático de Vercel
```

`convex/ghl.ts` → `markOrderPaid` acepta **dos formas de argumentos a la vez**:
la forma vieja de MercadoPago (`mpPaymentId`, `mpStatus`) y la forma nueva
neutral por proveedor (`provider`, `paymentId`, `status`, `approved`). Esto no
es incidental: es lo que hace posible desplegar en dos sistemas separados sin
una ventana de downtime.

**Si Vercel se desplegara antes que Convex, TODAS las órdenes fallan —
MercadoPago incluido, no solo Wompi.** No es solo que `api/wompi-webhook.ts`
enviaría argumentos (`provider`, `paymentId`, …) que la mutación vieja no
acepta. El problema real está un escalón antes: `api/ghl-create-order.ts`
manda `forma_pago` de forma **incondicional** en cada llamada a
`ghl.createOrder` — no solo cuando el proveedor es Wompi — y ese argumento
solo existe en el validador nuevo de Convex. Con el validador viejo todavía
en producción, cualquier orden (MercadoPago o Wompi) dispara un
`ArgumentValidationError`, el handler lo relanza, y `api/_lib/with-api-handler.js`
lo convierte en un 500. El bot de GHL deja de poder crear órdenes, punto,
para cualquier proveedor.

Y hay un segundo problema, más serio, en ese mismo 500: el mensaje de
`ArgumentValidationError` de Convex **incluye el objeto de argumentos
recibido**, y el handler devuelve `error.message` tal cual en el cuerpo de
la respuesta. Entre esos argumentos viaja `secret: process.env.ADMIN_SYNC_TOKEN`.
Es decir: desplegar en el orden equivocado no solo rompe todas las
órdenes — puede **filtrar `ADMIN_SYNC_TOKEN` en una respuesta 500 que le
llega directo al bot de GoHighLevel**.

Desplegando Convex primero, la mutación ya acepta el shape nuevo (`provider`,
`paymentId`, `expectedAmountInCents`, `currency`, …) y el validador de
`createOrder` ya acepta `forma_pago` antes de que exista tráfico que los
use, así que ninguna de las dos cosas ocurre. El `api/mp-webhook.ts` que
sigue en producción sirviendo el riel de MercadoPago no se entera de nada:
sigue mandando `mpPaymentId`/`mpStatus` exactamente como siempre.

**Convex primero, Vercel después. Siempre. Sin excepciones.**

**Pendiente, una vez que ambos deploys estén en vivo:** un commit de
seguimiento que elimine `mpPaymentId`/`mpStatus` de `markOrderPaid` — ya
habrán dejado de ser necesarios porque nada los envía. No se toca en esta
tarea.

## 5 · Checklist de verificación en sandbox

**Ninguno de estos pasos se ha ejecutado todavía.** Son instrucciones para
quien tenga acceso a los dashboards de Vercel y Wompi.

1. Confirmar que `productInventory` en Convex tiene un ítem con
   `estado: 'DISPONIBLE'` y `precioCOP`.
2. Crear una orden de prueba:
   ```bash
   curl -sS -X POST https://tierramadre.app/api/ghl-create-order \
     -H "Authorization: Bearer $GHL_API_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"contact":{"celular":"3001234567","full_name":"Prueba Wompi","email":"prueba@example.com"},"items":[{"sku":"<ITEM_ID_DISPONIBLE>","qty":1}]}' | jq
   ```
   Esperado: `{"order_id":"VB-…","total_cop":…,"checkout_url":"https://checkout.wompi.co/p/?…"}`.
3. Abrir `checkout_url` y pagar con una [tarjeta de prueba de Wompi](https://docs.wompi.co/docs/en/datos-de-prueba-en-sandbox).
4. La redirección aterriza en `/pedido-confirmado/<saleId>`
   (`src/pages/PedidoConfirmadoPage.tsx`, suscripción viva a `sales.estadoPublico`):
   primero «Estamos confirmando tu pago» y, cuando el webhook aterriza, «¡Pago
   confirmado!». La página nunca trata `reservada` como error — el webhook es lo
   que confirma la venta, no la redirección del navegador.
5. En el dashboard de Convex, ubicar la venta por `saleId` y confirmar:
   - `estado` = `confirmada`
   - `paymentProvider` = `wompi`, `providerTxId` = el id de transacción de
     Wompi, `providerStatus` = `APPROVED`
   - `paidAt` está seteado
   - `mpPaymentId` y `mpStatus` están **ausentes** (un pago de Wompi no debe
     tocar las columnas de MP)
   - exactamente **una** fila en `commissions` para este `saleId` (solo si la
     orden traía `ambassador_slug`)
6. **El paso más importante de todo el checklist:** en el dashboard de Wompi,
   usar el **depurador de integración** (integration debugger) — muestra los
   eventos enviados y sus checksums — para ubicar el evento que se envió, y
   **reenviarlo** desde ahí.
   Esperado: `HTTP 200` con `{"alreadyProcessed":true,"reason":"already-paid"}`,
   y **sigue habiendo exactamente una** fila en `commissions`. Una segunda fila
   de comisión acá significa que la guarda de idempotencia está rota — es la
   señal de alarma que este checklist existe para atrapar.

## 6 · Checklist de cutover a producción

Solo cambian credenciales y la URL base; el código no se toca. Desde el
2026-09-09 el código **sí comprueba la coherencia** de las cinco variables
(`api/_lib/wompiEnv.ts`): una llave `test_` contra la base de producción, o al
revés, ya no arma ningún link — devuelve `WOMPI_ENV_MISMATCH` y queda en el log.
`GET /api/health` publica `payments.wompi.status` (`ok` / `incomplete` /
`mismatch` / `unset`) y `payments.wompi.env` (`sandbox` / `production`) **sin
exponer ningún valor**: es la verificación de cada paso de abajo.

0. Estado de partida: `curl -s https://tierramadre.app/api/health | jq .data.payments`
   debe decir `{ provider: "wompi", wompi: { status: "ok", env: "sandbox" } }`.
1. Cargar los cinco valores `prod_` en Vercel, **en el mismo paso**. Por CLI,
   desde un archivo fuera del repo (una línea `NOMBRE=valor` por variable, sin
   comillas), que se borra al terminar:
   ```bash
   while IFS='=' read -r name value; do
     printf '%s' "$value" | npx vercel env add "$name" production --sensitive --force
   done < ~/wompi-prod.env && rm -P ~/wompi-prod.env
   ```
   Los cinco nombres: `WOMPI_PUBLIC_KEY` (`pub_prod_…`), `WOMPI_PRIVATE_KEY`
   (`prv_prod_…`), `WOMPI_INTEGRITY_SECRET` (`prod_integrity_…`),
   `WOMPI_EVENTS_SECRET` (`prod_events_…`), `WOMPI_BASE_URL`
   (`https://production.wompi.co/v1`). En el dashboard es lo mismo, marcando
   **Sensitive**.
2. Registrar (o confirmar) el webhook en el **ambiente de producción** del
   dashboard de Wompi: `https://tierramadre.app/api/wompi-webhook`. El secreto de
   eventos de producción es el que firma esos eventos — si no coincide con
   `WOMPI_EVENTS_SECRET`, el endpoint responde 401 y la venta nunca se confirma.
3. Redeploy de Production en Vercel (`npx vercel redeploy <url-del-último-deploy-prod>`,
   o un push a `main`). Las variables se leen en el arranque de cada function.
4. Verificar: `/api/health` → `payments.wompi` = `{ status: "ok", env: "production" }`.
   Si dice `mismatch`, el `detail` nombra qué variables quedaron de cada lado.
5. Levantar el WAF: `npx vercel firewall rules remove checkout-publico-llaves-test
   && npx vercel firewall publish`. Control: `curl -s -o /dev/null -w '%{http_code}'
   -X POST https://tierramadre.app/api/checkout-create-order -H 'Content-Type: application/json' -d '{}'`
   pasa de **403** (edge) a **400** (validación del endpoint).
6. Verificar con **un pago real de monto bajo**: confirmar que la venta pasa a
   `confirmada` con `paymentProvider: 'wompi'`, `providerTxId` igual al del
   comprobante, y que se generó la comisión correspondiente (si aplica). Reenviar
   el evento desde el depurador de Wompi → `already-paid`, una sola comisión.
7. Anotar la entrada en `docs/estado-sesiones.md` (versión servida, deploy id,
   hora, y el resultado del pago de prueba).

## 7 · Unicidad de `reference` — CERRADA el 2026-09-09

Wompi **exige una `reference` única por transacción** y rechaza una repetida con
422 `INPUT_VALIDATION_ERROR: "La referencia ya ha sido usada"` (docs
`transacciones/`, `errores/`, `widget-checkout-web/`; detalle y fuentes en
`docs/audits/2026-09-09-wompi-legal-y-trazabilidad.md`, fila A4). Con
`reference = saleId` y `findReusableSale` devolviendo la misma venta a un segundo
clic, un cliente cuyo primer intento salía `DECLINED` no podía reintentar su
propio pedido.

Implementado el plan B, con `_` como separador (el charset de Wompi es
alfanumérico + `-` + `_`; `formatSaleId` nunca produce `_`):

- `sales.paymentAttempts` cuenta los links emitidos (1 en el insert; +1 por cada
  reutilización en `createOrder`).
- `reference = ${saleId}_${n}` (`api/_lib/wompi.ts` → `buildReference`).
- `api/wompi-webhook.ts` recupera el `saleId` con `saleIdFromReference` (corte en
  el primer `_`; una referencia sin sufijo — links emitidos antes — vuelve intacta).
- MercadoPago no cambia: `external_reference = saleId`.

Queda **NO VERIFICADO** si un intento `DECLINED` (no sólo `APPROVED`) consume la
referencia; el diseño lo cubre en ambos casos.

## 8 · Bre-B: no existe para cobrar

Wompi **no soporta Bre-B como método de recaudo** (dinero entrante). Sus
métodos de recaudo disponibles son: `CARD`, `BANCOLOMBIA_TRANSFER`,
`BANCOLOMBIA_QR`, `NEQUI`, `PSE`, `BANCOLOMBIA_COLLECT`,
`BANCOLOMBIA_BNPL`, `DAVIPLATA`, `PCOL`, `SU_PLUS`. Bre-B solo aparece en la
sección de **dispersiones** (pagar dinero HACIA una llave, no cobrarlo), y
esa función además está marcada **"Próximamente"** en el dashboard de Wompi —
no es una opción activa hoy ni para eso.

No hay que buscar una opción de Bre-B en el checkout de Wompi: no existe. La
llave Bre-B propia de Tierra Madre para transferencia bancaria directa con
confirmación manual de staff es un riel separado, planeado para una fase
posterior (fase 4), y no depende de nada de este documento.

## 9 · Archivos del código (referencia)

- `api/wompi-webhook.ts` — endpoint del webhook (valida checksum, reconsulta transacción, marca pagado)
- `api/_lib/wompi-signature.ts` — firma de integridad / validación de checksum de eventos
- `api/_lib/wompi.ts` — `buildCheckoutUrl()` (Web Checkout) + `fetchTransaction()`
- `api/ghl-create-order.ts` — switch por `PAYMENT_PROVIDER`, crea la orden/venta y el checkout
- `convex/ghl.ts` — `createOrder`, `markOrderPaid` (shape dual, ver sección 4)
- `docs/superpowers/specs/2026-08-19-wompi-payment-rail-design.md` — spec de diseño del riel
- `docs/mercadopago-setup-and-swap.md` — runbook equivalente para el riel de MercadoPago
