# 04 · Integraciones — Cloudflare Workers + Mercado Pago

> El pegamento entre Mercado Pago, Supabase y GHL. **🤖 Código mío.** **✋ Tú: cuentas Cloudflare +
> Mercado Pago y el deploy (wrangler) + secrets.** Depende de Supabase + Mercado Pago.

## Workers (los construyo yo)
### `mp-webhook` (el crítico)
- Ruta: `wh.tierramadre.workers.dev/mp` (la registras como notification_url en Mercado Pago).
- Recibe el webhook de pago de Mercado Pago. Pasos:
  1. **Valida la firma HMAC** (`x-signature` con `MP_SECRET`) → si inválida, 401.
  2. Consulta el pago real a la API de MP (no confía en el payload).
  3. Si `approved`: **UPDATE condicional** `orders SET status='paid' WHERE id=$ AND status<>'paid'`
     (idempotencia — evita doble proceso). El trigger T3 de Supabase crea la comisión (UNIQUE order_id).
  4. Actualiza el contacto en GHL (total_comprado, tag `cliente-pago-confirmado`) y dispara el workflow
     de post-venta. Esto se hace **después** del commit en Supabase (outbox/reintento si falla).
### `scheduler` (cron)
- Crons: hot-lead-detector (*/15), ambassador-scoring (00:00), recordatorios evento (09:00), carrito
  abandonado (18:00). Llama Edge Functions de Supabase.
### `ghl-bridge` (opcional)
- Recibe webhooks de GHL (ContactCreate/Update) → upsert en Supabase. (O lo maneja el MCP/sync.)

> Nota: la **creación de orden** la hace la Edge Function `create-order` de Supabase (la llama la web),
> NO un worker. Cloudflare se queda con el webhook de pago entrante (firma HMAC) + cron.

## ✋ Lo manual tuyo
1. **Cuenta Cloudflare** (Workers, free tier sirve).
2. **Mercado Pago**: en el panel, registrar el webhook apuntando a `wh.tierramadre.workers.dev/mp`
   (eventos payment). Copiar credenciales (ACCESS_TOKEN, WEBHOOK_SECRET).
3. **Deploy**: `wrangler deploy` (te guío) + `wrangler secret put` para los secrets.

## Variables / secrets (Workers)
`MP_TOKEN` (access token server), `MP_SECRET` (HMAC), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`GHL_TOKEN`, `GHL_LOCATION_ID`, `INTERNAL_API_SECRET`, `WF_POSTVENTA_ID`.

## Flujo de pago end-to-end (detalle en 06)
Web checkout → `create-order` (Supabase) → preferencia Mercado Pago → cliente paga →
MP → `mp-webhook` (HMAC) → order=paid (Supabase) → comisión (trigger) → actualiza GHL + post-venta.

## Errores / robustez
- Idempotencia en `mp-webhook` (UPDATE condicional + UNIQUE order_id) — sin doble comisión.
- Si GHL falla tras marcar paid: reintento/outbox (no se pierde la venta).
- Observabilidad: log + alerta (Resend/Slack) si un worker falla en silencio.
