# MercadoPago — Setup actual y migración a la cuenta Tierra Madre

> Estado al **30 jun 2026**. Conexión MP↔Vercel↔Convex **funcionando en modo de
> prueba** sobre una **cuenta personal temporal**, hasta que la cuenta MercadoPago
> oficial de Tierra Madre termine la verificación. Nada secreto se guarda en el repo.

## 1 · Qué quedó configurado (modo prueba)

**Aplicación MercadoPago** (cuenta personal, temporal)
- Nombre: `TierraMadre` · País: Colombia (MCO) · Solución: **Checkout Pro**
- App ID (panel): `3325496489415183` · N.º de aplicación: `2288212937636164`
- Panel: `https://www.mercadopago.com.co/developers/panel/app/3325496489415183`

**Webhook** (pestaña *Modo de prueba*)
- URL: `https://tierramadre.app/api/mp-webhook`
- Evento: **Pagos** (`payment`)
- Se generó la **Clave secreta** (firma HMAC). Vive en el panel MP y en Vercel; no se
  copia a este repo.

**Vercel** (proyecto `tierra-madre-studio`, entorno **Production**, marcadas *Sensitive*)
- `MP_ACCESS_TOKEN` = access token de **prueba** (`APP_USR-…`)
- `MP_WEBHOOK_SECRET` = clave secreta del webhook de prueba
- Ya existían y se confirmaron: `GHL_TOKEN`, `GHL_API_SECRET`, `GHL_LOCATION_ID`,
  `CONVEX_URL`, `DATA_SOURCE`, `APP_URL`.
- Se hizo **redeploy** de Production tras agregarlas.

## 2 · Verificación hecha

- *Simular notificación* (panel MP) → `POST /api/mp-webhook` respondió **500**, no 401.
- En los logs de Vercel: `[MpWebhook] fetchPayment failed` con `data.id=123456`.
- Interpretación: la **firma HMAC validó correctamente** (si no, habría sido 401). El
  500 es esperado porque `123456` es un pago falso que no existe. **El cableado del
  webhook (endpoint + secret + token) está correcto.**

### Pendiente (prueba end-to-end real)
Falta probar el flujo completo con un pago de prueba real:
`ghl-create-order` (crea venta `reservada` + preferencia MP) → pagar con
[tarjeta de prueba](https://www.mercadopago.com.co/developers/es/docs/checkout-pro/additional-content/test-cards)
y usuario de prueba → webhook → venta `confirmada` en Convex + 1 fila en `commissions`
+ tag `cliente-pago-confirmado` en GHL → **reenviar** el webhook y confirmar
idempotencia (sigue habiendo 1 sola comisión). Requiere un producto en
`productInventory` y acceso al dashboard de Convex.

## 3 · Migración a la cuenta MercadoPago de Tierra Madre (cuando esté verificada)

Solo cambian **credenciales**; el código y las URLs no se tocan.

1. **Crear la aplicación** en la cuenta MP oficial de Tierra Madre:
   `Developers → Tus integraciones → Crear aplicación` → Pagos online → desarrollo
   propio → **Checkout Pro**.
2. **Credenciales de producción** → copiar el `Access Token` (`APP_USR-…` real).
3. **Webhooks → pestaña *Modo productivo*** → URL `https://tierramadre.app/api/mp-webhook`,
   evento **Pagos** → *Guardar* → copiar la **Clave secreta** de producción.
4. **Vercel → tierra-madre-studio → Settings → Environment Variables** (entorno
   Production): editar
   - `MP_ACCESS_TOKEN` → access token de **producción**
   - `MP_WEBHOOK_SECRET` → clave secreta de **producción**
5. **Redeploy** de Production.
6. **Probar** con un pago real de monto bajo y confirmar venta `confirmada` + comisión.
7. (Opcional) Borrar/retirar la app de prueba de la cuenta personal.

> Recordatorio: el `external_reference` de cada preferencia es el `saleId` de Convex;
> el webhook reconsulta el pago real a MP y solo procesa `status === "approved"`.
> `markOrderPaid` es idempotente (`reservada → confirmada` una sola vez).

## 4 · Archivos del código (referencia)
- `api/mp-webhook.ts` — endpoint del webhook (valida HMAC, reconsulta pago, marca pagado)
- `api/_lib/mp-signature.ts` — validación de firma `x-signature` (Webhooks v2)
- `api/_lib/mp-preference.ts` — crea preferencia Checkout Pro + `fetchPayment`
- `api/ghl-create-order.ts` — crea la orden/venta y la preferencia MP
- `convex/ghl.ts` — `createOrder`, `markOrderPaid`, etc.
- `docs/ghl-commerce-integration.md` — checklist de go-live original
