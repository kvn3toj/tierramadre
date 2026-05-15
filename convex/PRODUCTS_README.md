# Atelier Inventory — Convex Setup

The admin product-management panel at `/admin/products` reads and writes through Convex. Convex mirrors the `Inventario` Google Sheet and pushes admin edits back to it.

## What's in this directory

```
convex/
├── schema.ts            — productInventory + productEdits + productLocks tables
├── products.ts          — queries, mutations, sync action
├── crons.ts             — schedules pullFromSheet every 5 minutes
└── _generated/          — Convex codegen, do not edit
```

And on the Vercel side:

```
api/
└── admin-product-update.ts   — the gateway Convex calls to write to Sheets
```

## Required environment variables

### On the Convex deployment (`npx convex env set ...`)

| Var | Value |
|---|---|
| `APP_URL` | Base URL of the Vercel deployment, e.g. `https://tierra-madre-studio.vercel.app` |
| `ADMIN_SYNC_TOKEN` | A long random string. Must match the same value on Vercel below. |

```bash
npx convex env set APP_URL https://tierra-madre-studio.vercel.app
npx convex env set ADMIN_SYNC_TOKEN $(openssl rand -hex 32)
```

### On Vercel (`vercel env add`)

| Var | Value |
|---|---|
| `ADMIN_SYNC_TOKEN` | Same value as above. Auths Convex → Vercel calls. |

```bash
vercel env add ADMIN_SYNC_TOKEN production
# paste the same value used for Convex
```

The Google service account credentials (`GOOGLE_SERVICE_ACCOUNT_KEY`, `VITE_GOOGLE_SHEETS_ID`) are already configured for the existing endpoints — no change needed.

## First-time deployment

```bash
# 1. Push schema + functions to Convex
npx convex deploy

# 2. Push the new API endpoint to Vercel (or just push to main)
git push origin main

# 3. Open /admin/products and click "Sincronizar desde la hoja"
#    The first pull seeds the productInventory table from Sheets.
```

The cron in `crons.ts` will keep the mirror fresh every 5 minutes after that.

## Edit flow

```
[Admin types in drawer] → [Save click]
   ↓
[Convex mutation `products.saveEdit`]
   - patches productInventory row, sets syncStatus = "pending"
   - inserts a productEdits audit row
   - schedules `products.pushToSheet` action
   ↓                                         (UI updates instantly — optimistic)
[`products.pushToSheet` action]
   - POSTs to /api/admin-product-update with x-admin-sync-token
   ↓
[Vercel /api/admin-product-update]
   - validates token
   - reads existing row (preserves untouched columns)
   - writes merged row via sheets.spreadsheets.values.update
   ↓
[Convex action receives 200]
   - calls _markPushed → syncStatus = "synced", lastPushedAt = now
   - audit row status → "saved"
```

If the Sheets push fails, the row stays at `syncStatus: "pending"` (or "error" with the message) and the audit row is `failed`. The next periodic pull will not clobber it.

## Conflict handling

`pullFromSheet` only overwrites mirror fields when `syncStatus === "synced"`. Local edits in flight (pending or errored) are preserved. The row's `rowIndex` is always re-pinned from the sheet, so re-orderings of the sheet don't break subsequent pushes.

If a row's column-A item-id no longer matches what we have for that `rowIndex` (e.g., a row was inserted in the sheet between cron runs), `admin-product-update` returns 409 with a "resync required" message. The UI surfaces this as an error pip on the row and the user can hit Resync.

## Manual operations

```bash
# One-off pull (without waiting for cron)
npx convex run products:pullFromSheet

# Inspect mirror
npx convex run products:list '{}' | jq '.[0]'

# Inspect sync stats
npx convex run products:syncStats '{}'

# Inspect edit history for an item
npx convex run products:editHistory '{"itemId":"32"}'
```
