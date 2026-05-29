# GHL Commerce Integration (Áreas 2 & 4) — Convex + Vercel

The GoHighLevel funnel's data + payment backend, built on **this repo's existing
Convex + Vercel infra** instead of the spec's greenfield Supabase + Cloudflare
(no Docker, no new accounts). Satisfies the golden path in `GHL/06-FLUJOS-CONEXION.md`.

> Status: **code-complete and mock-tested** (47 vitest cases; Convex + Vercel tsc
> clean). Live GHL/Mercado Pago wiring is the go-live checklist below — no secrets
> were committed.

## Flow

```
GHL bot ──Bearer GHL_API_SECRET──▶ POST /api/ghl-search-products ──▶ Convex ghl.searchProducts (productInventory)
web/bot ──Bearer GHL_API_SECRET──▶ POST /api/ghl-create-order ────▶ Convex ghl.createOrder (≤2M gate, sale=reservada)
                                                                 └─▶ Mercado Pago preference (external_reference=saleId)
Mercado Pago ──HMAC──▶ POST /api/mp-webhook ──▶ fetchPayment ──▶ Convex ghl.markOrderPaid (idempotent → confirmada,
                                                                  client total++, commission once)
                                              └─▶ GHL: upsert contact + total, tag cliente-pago-confirmado, post-sale workflow
Convex crons: ambassador-scoring (00:00 Bogotá) · abandoned-cart (18:00 Bogotá)
```

## Pieces

| File                                                                                                    | Role                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `convex/schema.ts`                                                                                      | +GHL fields on `clients`/`sales`; new `ambassadors`, `commissions`                                                                |
| `convex/ghl.ts`                                                                                         | searchProducts, createOrder, markOrderPaid, setMpPreference, flagGhlSyncPending, linkGhlContact, getClientByPhone, nudgeAbandoned |
| `convex/ambassadors.ts`, `convex/commissions.ts`                                                        | referral + commission ledger                                                                                                      |
| `convex/crons.ts`                                                                                       | ambassador-scoring (daily) + abandoned-cart (18:00 Bogotá)                                                                        |
| `convex/_lib/{productSearch,commission,applyPayment}.ts`                                                | pure, unit-tested logic                                                                                                           |
| `api/ghl-search-products.ts`, `api/ghl-create-order.ts`, `api/mp-webhook.ts`, `api/ghl-sync-contact.ts` | HTTP surface                                                                                                                      |
| `api/_lib/{bearer,mp-signature,ghl-client,mp-preference,mpWebhookLogic}.ts`                             | auth + external clients                                                                                                           |

Idempotency: `markOrderPaid` only flips `reservada → confirmada`; the commission insert
is guarded by `commissions.by_saleId` (emulates `UNIQUE(order_id)`), so a replayed MP
webhook never double-pays. `lead_score` stays GHL-owned (we never write it).

## Environment variables (set in Vercel + Convex dashboards — not committed)

| Var                                | Where  | Notes                                                                   |
| ---------------------------------- | ------ | ----------------------------------------------------------------------- |
| `GHL_API_SECRET`                   | Vercel | Bearer the GHL bot/workflows send (`internal_api_secret` Custom Value). |
| `GHL_TOKEN`                        | Vercel | `pit-…` Private Integration Token.                                      |
| `GHL_LOCATION_ID`                  | Vercel | `t3tOZBrR05jUoLqnDn4I`.                                                 |
| `WF_POSTVENTA_ID`                  | Vercel | Post-sale workflow id (from GHL UI).                                    |
| `MP_ACCESS_TOKEN`                  | Vercel | Mercado Pago server access token (`APP_USR-…`).                         |
| `MP_WEBHOOK_SECRET`                | Vercel | Per-app webhook signing secret (≠ access token).                        |
| `CONVEX_URL`, `DATA_SOURCE=convex` | Vercel | Already used by other endpoints; gates the Convex client.               |
| `APP_URL`                          | Vercel | Public origin for `web_link` + MP `notification_url`/`back_urls`.       |

## Go-live checklist (when credentials are ready)

1. Set the Vercel env vars above; deploy (push to `main` auto-deploys).
2. GHL → Custom Values: `internal_api_secret` = `GHL_API_SECRET`. Point the bot's
   API tool at `POST {APP_URL}/api/ghl-search-products`. Build the post-sale workflow,
   copy its id → `WF_POSTVENTA_ID`.
3. Mercado Pago → register webhook `{APP_URL}/api/mp-webhook` (event: payment); copy
   the signing secret → `MP_WEBHOOK_SECRET`.
4. Seed `ambassadors` (Convex `ambassadors.create`) for referral attribution.
5. Smoke: `ghl-search-products` → `ghl-create-order` → simulate payment → confirm
   `sales.estado="confirmada"`, one `commissions` row, GHL tag `cliente-pago-confirmado`.
   Replay the webhook → still one commission (idempotency).

## Deferred (second wave)

Online-sale → Ventas Sheet mirror; `pendingGhlSync` retry cron; `hot-lead-detector`,
`auto-event-invite`, `send-promo`; ambassador level-up policy; `events`/`promotions`/
`testimonials` tables; optional GHL→Convex inbound bridge.
