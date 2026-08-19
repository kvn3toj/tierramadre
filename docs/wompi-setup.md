# Wompi — Setup y checklist de cutover a producción

> Estado al **19 ago 2026**. El código del riel Wompi (Tasks 1-6) está mergeado y
> probado con tests unitarios. **La verificación end-to-end en sandbox
> (credenciales reales, orden de prueba, pago con tarjeta de prueba, replay del
> webhook) todavía no se hizo** — requiere acceso al dashboard de Vercel y de
> Wompi que este documento no tiene. Este archivo es el runbook para quien la
> haga. Nada secreto se guarda en este repo.

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

Si Vercel se desplegara **antes** que Convex, el nuevo `api/wompi-webhook.ts`
(o cualquier llamador que ya use el shape nuevo) enviaría argumentos
(`provider`, `paymentId`, …) a una mutación de Convex en producción que
todavía no los acepta — esa llamada fallaría. Desplegando Convex primero, la
mutación ya acepta ambas formas antes de que exista tráfico que use la forma
nueva, y el `api/mp-webhook.ts` que sigue en producción sirviendo el riel de
MercadoPago no se entera de nada: sigue mandando `mpPaymentId`/`mpStatus`
exactamente como siempre.

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
4. **Se espera un 404** en la redirección a `/pedido-confirmado/<saleId>` — esa
   ruta es trabajo de la fase 3 y todavía no existe. Esto no afecta el pago en
   sí; el webhook es lo que confirma la venta, no la redirección del navegador.
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

Solo cambian credenciales y la URL base; el código no se toca.

1. En Vercel → `tierra-madre-studio` → Production → Environment Variables,
   reemplazar los cuatro valores `test_`/`test_integrity_`/`test_events_` por
   sus equivalentes `prod_`:
   - `WOMPI_PUBLIC_KEY` → `pub_prod_…`
   - `WOMPI_PRIVATE_KEY` → `prv_prod_…`
   - `WOMPI_INTEGRITY_SECRET` → `prod_integrity_…`
   - `WOMPI_EVENTS_SECRET` → `prod_events_…`
2. `WOMPI_BASE_URL` → `https://production.wompi.co/v1`.
3. Registrar (o confirmar) el webhook en el **ambiente de producción** del
   dashboard de Wompi: `https://tierramadre.app/api/wompi-webhook`.
4. Redeploy de Production en Vercel.
5. Verificar con **un pago real de monto bajo**: confirmar que la venta pasa a
   `confirmada` con `paymentProvider: 'wompi'` y que se generó la comisión
   correspondiente (si aplica).

## 7 · Pregunta abierta — unicidad de `reference`

La documentación de Wompi no especifica si una transacción con `reference`
repetido (nuestro `reference` es el `saleId` de Convex) es aceptada en un
reintento o rechazada. Nuestro webhook es idempotente de cualquier forma —
`markOrderPaid` solo cambia el estado una vez — así que un reintento con la
misma `reference` es inofensivo en el peor de los casos.

**Si** la corrida en sandbox (sección 5) muestra que Wompi **rechaza** una
`reference` duplicada, el plan B ya está documentado y listo para implementar:

- `reference` pasa a ser `${saleId}~${n}`, con `n` persistido en la venta.
- `api/wompi-webhook.ts` recupera el `saleId` real con
  `transaction.reference.split('~')[0]` antes de llamar a `markOrderPaid`
  (los `saleId` contienen `-` pero nunca `~`, así que el corte es seguro).

Esto queda **pendiente de la corrida en sandbox** — no se ha ejecutado
todavía, así que esta sección no se puede cerrar desde este documento. El
resultado real debe registrarse en
`docs/superpowers/specs/2026-08-19-wompi-payment-rail-design.md`, reemplazando
la frase "Esto se verifica en sandbox…" por lo que efectivamente ocurrió.

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
