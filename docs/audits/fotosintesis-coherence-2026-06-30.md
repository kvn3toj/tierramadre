# Fotosíntesis ⇄ Convex ⇄ Sheets ⇄ Treasure Browser — Coherence Audit

**Date:** 2026-06-30
**Scope:** E2E coherence of the Fotosíntesis admin (Convex), the Google Sheets
SOTs, and the customer Treasure Browser / product page. Driven by: the product
page UI had been stale for months and did not surface the rich emerald data
captured in the Fotosíntesis pipeline.
**Deployment:** `wonderful-tortoise-984.convex.cloud` (production).

---

## Architecture (verified)

Five layers feed the catalog:

- **Google Sheets (4):** legacy live catalog `1mghR6…` (read directly by the
  customer catalog via `/api/get-treasure-sheets`), Fotosíntesis SOT v2 `18w0Dc…`
  (Proveedores/Lotes/Clientes/Ventas/Sublotes/Inventario), Feedback `1Nl2gx…`,
  App-data `1DuOhu…` (invitations/views/prefs).
- **Convex** (`wonderful-tortoise-984`, 18 tables): mirrors the Fotosíntesis Sheet,
  owns the `mostrarEnCatalogo` publish flag, and serves the published catalog.
- **Google Drive:** product media (`products/` folders), served via `/api/serve-drive-image`.
- **localStorage:** client cache (thumbnails, sheets catalog).
- **`esmereo-mock`:** gamification simulator (not a real data layer).

**Customer catalog data path:** Convex `productInventory` →
`products.publishedCatalog` projection → `useFotosintesisCatalog.PublishedRow` →
`mapRowToTreasureItem` → `TreasureItem` → cards + product detail. Legacy items
arrive separately from `/api/get-treasure-sheets` (the legacy Sheet). Two
projection/bridge "death points" decide what a customer can see.

---

## The core gap (fixed)

`publishedCatalog` projected ~20 fields; the Fotosíntesis admin captures ~45.
Customer-relevant emerald data was captured in Sheets + Convex but **stripped
before reaching the UI**. Fixed 2026-06-30 by widening the projection + bridge +
type + UI across all four layers.

### Field matrix (per-item unless noted)

| Field                                            | Sheet  | Convex  | publishedCatalog  | bridge→TreasureItem | product page                     |
| ------------------------------------------------ | ------ | ------- | ----------------- | ------------------- | -------------------------------- |
| nombre/peso/color/calidad/cantidad/talla/medidas | ✅     | ✅      | ✅                | ✅                  | ✅ (pre-existing)                |
| precioEmbajadorCOP (→ public precioCOP)          | M      | ✅      | ✅                | ✅                  | ✅ (pre-existing)                |
| certificadoUrl                                   | AM     | ✅      | ✅                | ✅                  | ✅ (pre-existing)                |
| **tipoEsmeralda**                                | AF     | ✅      | ✅ **(new)**      | ✅ **(new)**        | ✅ spec "Tipo"                   |
| **nivelRareza**                                  | AD     | ✅      | ✅ **(new)**      | ✅ **(new)**        | ✅ spec "Rareza"                 |
| **calificacion**                                 | AE     | ✅      | ✅ **(new)**      | ✅ **(new)**        | ✅ spec "Calificación"           |
| **procedencia**                                  | Z      | ✅      | ✅ **(un-gated)** | ✅ **(new)**        | ✅ Características "Origen"      |
| **mina** (lot)                                   | Lots Q | ✅ lots | ✅ **(lot join)** | ✅ **(new)**        | ✅ Características "Origen/Mina" |
| **tratamiento** (lot)                            | Lots P | ✅ lots | ✅ **(lot join)** | ✅ **(new)**        | ✅ Características "Tratamiento" |
| **tipoJoya / tecnicaJoya**                       | AH/AI  | ✅      | ✅ **(new)**      | ✅ **(new)**        | ✅ Características (joyas)       |
| **minerales / complementos**                     | AJ/AK  | ✅      | ✅ **(new)**      | ✅ **(new)**        | ✅ Características (joyas)       |
| **observacion** (→ description)                  | AA     | ✅      | ✅ **(new)**      | ✅ **(new)**        | ✅ evocative copy                |
| costoBaseCOP (L) / precioConscienteCOP (N)       | ✅     | ✅      | ❌ policy         | ❌                  | ❌ internal                      |
| loteId / preponderancia / syncStatus             | X/U    | ✅      | ❌                | admin-only          | admin "Trazabilidad"             |

All new fields are **absent-safe**: legacy (non-Fotosíntesis) items leave them
unset, so spec rows / the Características section self-hide. `procedencia` was
moved from the admin-only ProvenanceSection (now "Trazabilidad": lote +
preponderancia + sync) into the public CharacteristicsSection.

---

## Findings

### 🔴 Real-connection / correctness

1. **Split-brain Convex/Sheets gate (HARDENED).** Backend
   `isConvexEnabled = DATA_SOURCE==="convex" && CONVEX_URL`
   (`api/_lib/convex-client.js`) vs frontend `convexReady = !!VITE_CONVEX_URL`
   (`src/lib/convex-safe.ts`). Invitations / product-views write Convex **XOR**
   Sheets; the frontend reads them from Convex (`useMyInvitations`,
   `CurrencyContext`). Confirmed: Convex IS the prod backend (`DATA_SOURCE=convex`
   set in Vercel), so it was not firing — but it could silently diverge. **Fix:**
   the gate now fires on `CONVEX_URL` presence (matching the frontend), with
   `DATA_SOURCE="sheets"` as an explicit kill-switch + a cold-start divergence
   warning; both vars documented in `.env.example`. **Action for operator:**
   ensure `CONVEX_URL` is set everywhere `VITE_CONVEX_URL` is.
2. **`_debug` leak (FIXED).** `/api/get-treasure-sheets` shipped header labels +
   row-1 cell values to every client. Now gated behind `?debug=1` AND
   non-production.
3. **`certifications` save was a silent no-op (MADE HONEST).**
   `useTreasureBrowserController.handleSaveCertifications` only logged. There is
   no backend (no Convex mutation, no Sheets column). Now logs at WARN with a
   "NOT persisted" marker + a `TODO(cert-persistence)`. (The public certificate
   _link_ `certificateUrl` is a separate, working field.)

### 🟠 Coherence

4. **Stale column-letter comments (FIXED).** `products.ts` / `useFotosintesisCatalog.ts`
   described prices as columns N/O/L; authoritative layout
   (`api/_lib/fotosintesis-inventory-columns.js`) is L=costoBaseCOP,
   M=precioEmbajadorCOP, N=precioConscienteCOP. Comments corrected.
5. **Sheet→Convex pull coverage (VERIFIED OK).** All newly-surfaced item fields
   are already in the `INVENTORY` WRITABLE allowlist (`convex/_lib/sheetPullMaps.ts`),
   and `tratamiento`/`mina` in the `LOTS` map — so out-of-band Sheet edits
   propagate. No change needed.
6. **Three sources of truth, no cross-validation (UNCHANGED, documented).** A
   legacy-Sheet item and a Fotosíntesis item sharing an `item` number silently
   drop the Convex one (sheets wins in `useTreasure`). Numbering discipline lives
   in the spreadsheets.

### 🟡 Drift (documented, NOT changed this pass)

- Dead `materials` Convex table (zero writers/readers).
- Unused `fotosintesisAi.listMyThreads` query (no caller).
- Deprecated `precioPotencialCOP`; APP-ONLY `precioCOP` (no Sheets column).
- `convex/crons.ts` does **not** contain the `DISABLE_CRONS` flag the
  2026-06-15 cost-audit doc claims was applied — doc/code drift.
- `wandering-parrot-148` slug in 4 one-shot scripts' usage comments (prod is
  `wonderful-tortoise-984`) — copy-paste hazard.
- `CLAUDE.md` stale: `fix:inventory` script doesn't exist; function count drifted.
- Alphabetical (not natural-sort) Drive thumbnail hero selection.
- No server-side authorization on public Convex functions (role gate is
  client-side + route-guard only).

---

## Deploy / sync checklist (operator)

Backend changes do nothing until deployed (per project rules, git/deploy stays
with the operator):

1. `npx convex deploy` — regenerates `convex/_generated` + deploys the widened
   `publishedCatalog` / `publishedGroups`.
2. Push to `main` → Vercel auto-deploy (frontend + API).
3. Confirm `CONVEX_URL` is set wherever `VITE_CONVEX_URL` is (the hardened gate).
4. Spot-check a published item and a lote bundle on the product page; spot-check a
   legacy item (new section should self-hide).
