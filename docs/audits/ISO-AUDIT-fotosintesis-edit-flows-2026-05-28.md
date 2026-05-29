# ISO 9241-110:2020 Audit — Fotosíntesis Admin: Heuristics, Edit Tools & Edit-After-Publish/Lote

## Audit Information

- **Flow**: Fotosíntesis admin edit experience — editing items, lots, published products, and sales **after** capture/close/publish
- **Surfaces**: `/admin/fotosintesis/*` (capture, lote resumen, ventas, sub-lotes, directorio) + the linked `/admin/products` catalog editor
- **Version / date**: working tree on `main` @ 2026-05-28 (commit `8089924`)
- **Auditor**: Claude (ISO 9241-110:2020 skill v1.0) + multi-agent orchestration (61 sub-agents: 4 architecture mappers → 7 principle evaluators → 42 adversarial verifiers)
- **Materials reviewed**: source only — `convex/{lots,lotItems,products,sales,subLotes}.ts`, `convex/_lib/publishedGroups.ts`, `convex/schema.ts`, and `src/pages/admin/Fotosintesis/**` + `src/pages/admin/ProductManagement/**`. No live interaction (admin auth + locked browser).
- **Evidence discipline**: every finding was re-checked against the actual file:line. 50 candidate findings → **42 confirmed**, **8 rejected as stale/wrong**. The 2 candidate "Critical" findings were both downgraded to **Major** on verification (the integrity break is reconstructable from the audit trail, so not strictly irrecoverable). **Zero task-blocking (Critical) defects survived.**

---

## Score Summary

| Principle                       | Score  | Level       | Weight | Weighted    |
| ------------------------------- | ------ | ----------- | ------ | ----------- |
| 1. Task Suitability             | 72/100 | PARTIAL     | 20%    | 14.4        |
| 2. Self-Descriptiveness         | 70/100 | PARTIAL     | 18%    | 12.6        |
| 3. Conformity with Expectations | 58/100 | DEFICIENT   | 15%    | 8.7         |
| 4. Learnability                 | 68/100 | PARTIAL     | 12%    | 8.2         |
| 5. Controllability              | 55/100 | DEFICIENT   | 15%    | 8.3         |
| 6. Error Tolerance              | 65/100 | DEFICIENT\* | 15%    | 9.8         |
| 7. User Engagement              | 76/100 | PARTIAL     | 5%     | 3.8         |
| **GLOBAL SCORE**                |        |             |        | **~66/100** |

\* P6 sits at the DEFICIENT/PARTIAL boundary; the edit primitives themselves are exemplary, but a few state-transition gaps pull it down.

**Rating**: CONDITIONAL (60–74)
**Release gate**: FAIL (threshold 90/100) — none of these are showstoppers for daily internal use, but the data-integrity items (C2, C7) and lost-work items (C4) should be addressed before this is the canonical edit surface.

> **Scoring note:** Per-principle scores are the evaluators' conservative figures, adjusted upward where adversarial verification rejected findings (most affecting P4, where 3 of the harshest learnability complaints were false — see "Rejected by Verification"). Weighted to ~65.7, presented as ~66.

---

## ⭐ The Core Answer: How You Edit After Publish / Close

This is the practical map the audit set out to produce. Edit capability is **per-entity and per-state**, and it is split across two admin worlds that share the same underlying `productInventory` row.

### Lot lifecycle: `abierto → cerrado → publicado` (+ `cancelado`)

| What you want to edit                                                                                                                                                        |    `abierto`     |   `cerrado`   |        `publicado`         | How / where                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------: | :-----------: | :------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lot header** (costoTotalCOP, provider, fechaRecepción, mina, treatment, factura, notas)                                                                                    | ✅ EditLotDrawer | ❌ **frozen** |       ❌ **frozen**        | `lots.update` hard-throws unless `abierto` (`lots.ts:168`). EditLotDrawer is mounted **only** in CapturaLotePage and its launcher is disabled when not `abierto` (`CapturaLotePage.tsx:2415`). **No reopen/escape path exists anywhere.** ← the real hard gap |
| **Lot display/grouping** (hero photo, "Mostrar como lote")                                                                                                                   |        ✅        |      ✅       |             ✅             | `lots.setLoteDisplay` is state-agnostic (blocks only `cancelado`); surfaced on LoteResumenPage "Guardar cambios"                                                                                                                                              |
| **Item gem/joya/bruto fields** (nombre, peso, color, calidad, talla, medidas, type-specific, prices incl. público/embajador/consciente, `mostrarEnCatalogo`, preponderancia) |        ✅        |      ✅       |             ✅             | **`LoteResumenPage` → "Editar ítem" → EditItemDrawer**, mounted `editable` for all estados (`LoteResumenPage.tsx:609-637, 887-890`). Server `lotItems.updateGemaFields`/`updatePreponderancia` deliberately have **no estado guard** (`lotItems.ts:412`)      |
| **Item photo / certificate**                                                                                                                                                 |        ✅        |      ✅       |             ✅             | Same drawer; `lotItems.updateMedia` is explicitly state-agnostic (`lotItems.ts:665`)                                                                                                                                                                          |
| **Item removal**                                                                                                                                                             |        ✅        |  ⚠️ allowed   |         ⚠️ allowed         | `lotItems.remove` has no estado guard (`lotItems.ts:760`) — but breaks the 100% preponderance invariant silently and writes no audit row (see C7)                                                                                                             |
| **A few catalog-legacy fields** (colección, caja, ubicación)                                                                                                                 |        —         |       —       | edit via `/admin/products` | These are the **only** fields not in EditItemDrawer; ProductManagement `EditDrawer` owns them via `products.saveEdit`                                                                                                                                         |
| **Reopen / un-publish a lot**                                                                                                                                                |        —         |      ❌       |             ❌             | No mutation exists. `lots.cancel` works only on `abierto`; its own comment admits closed/published lots "need their own undo flow" that was never built (`lots.ts:266`)                                                                                       |

### Sale lifecycle: `confirmada/reservada → cancelada`

| What you want to edit                   |          confirmada/reservada          |           cancelada           | How / where                                                                                                                                               |
| --------------------------------------- | :------------------------------------: | :---------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Precio acordado / total / descuento** |            ✅ inline pencil            |          ❌ blocked           | `sales.updatePrice` (guards `cancelada`); VentaDetailPage EditableMetaValue                                                                               |
| **Carnet / Certificado URL**            |     ⚠️ mutation exists, **no UI**      | ⚠️ mutation exists, **no UI** | `sales.setCarnetUrl`/`setCertificadoUrl` have no estado guard but are called **only** during sale creation. VentaDetailPage shows them read-only (see C6) |
| **Items / client / forma de pago**      |                   ❌                   |              ❌               | Not editable post-creation by design — the reversal is `sales.cancel` (restores stock) + re-create                                                        |
| **Cancel**                              | ✅ CancelVentaDialog (reason required) |          idempotent           | `sales.cancel`; no un-cancel exists                                                                                                                       |

**Bottom line in one sentence:** _After a lot is closed/published you can still fix almost everything about an individual stone in place (EditItemDrawer from the lote resumen page) and you can edit the published catalog row from `/admin/products` — but the **lot's own header data is permanently frozen with no reopen path**, and the two item-editors don't know about each other or share a lock._

---

## Edit-Tools Inventory

| Tool                             | File                                                   | Edits                                                                                                             | Guards                                                                                                                | Persists via                                                         | Undo / Cancel                                                                        |
| -------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **EditItemDrawer**               | `Fotosintesis/components/EditItemDrawer.tsx` (969L)    | Full gema/joya/bruto/insumo sub-form + prices + `mostrarEnCatalogo` + preponderancia + foto + certificado; delete | `editable` prop toggles full vs media-only; server `updateGemaFields`/`updateMedia`/`remove` have **no estado guard** | `lotItems.updateGemaFields` / `updateMedia` → `products.pushToSheet` | 2-step inline delete confirm; **no dirty-guard on close**; no post-save undo         |
| **EditLotDrawer**                | `Fotosintesis/components/EditLotDrawer.tsx` (751L)     | 14 lot-header fields                                                                                              | `editable = estado==='abierto'`; inputs HTML-`disabled` otherwise; server `lots.update` throws unless `abierto`       | `lots.update` → `lots._pushToSheet`                                  | Cancel closes; **no dirty-guard**; misleading "reabrirlo" subtitle (C1)              |
| **EditableMetaValue**            | `Fotosintesis/components/EditableMetaValue.tsx` (282L) | Inline single value (costo, unidades, preponderancia, sale precio)                                                | `disabled` prop; client min/max/finite validation w/ `role="alert"`; server re-validates                              | per-field mutation                                                   | Enter commits, Esc restores prior value (exemplary)                                  |
| **ProductManagement EditDrawer** | `ProductManagement/EditDrawer.tsx` (1964L)             | 13 catalog fields incl. `estado` (colección/caja/ubicación/precioCOP/…)                                           | **5-min soft lock** (claimLock/releaseLock) + `hasChanges`; **no estado-transition guard**                            | `products.saveEdit` → `products.pushToSheet`                         | Save blocked while locked-by-other / saving; **backdrop click discards** dirty edits |
| **InlineEditCell**               | `ProductManagement/InlineEditCell.tsx` (125L)          | One cell (precioCOP, estado) in the inventory table                                                               | parse returns `null` on bad input (clears); save errors caught upstream                                               | `products.saveEdit`                                                  | Esc cancels                                                                          |
| **SubLoteDrawer / SubLoteCard**  | `Fotosintesis/components/SubLote*.tsx`                 | Sub-lote meta + membership; archive/reactivate                                                                    | archive toggle fires **instantly**, no confirm (C12)                                                                  | `subLotes.*`                                                         | —                                                                                    |

**Cross-cutting tool observations:**

- **Only ProductManagement EditDrawer participates in the soft-lock.** EditItemDrawer, InlineEditCell, and EditableMetaValue carry no lock — two admins (or the same admin in two tabs) can edit the _same_ `productInventory` row through different surfaces and silently clobber each other (C3).
- **The full audit trail exists** (`productEdits` with before/after, rendered read-only in `HistorialCard`) but **nothing reads it back** — no revert/undo mutation anywhere (C5).
- **Pre-commit cancel is uniformly excellent**; **post-commit reversibility is uniformly absent**.

---

## Top Canonical Issues (deduplicated)

The 42 confirmed findings collapse into **12 root issues** (many surfaced under several principles, which is itself a signal of priority).

| #       | Issue                                                                                                                                                                                                                                   | Severity | Effort                 | Principles | Tier                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------- | ---------- | ------------------------------- |
| **C1**  | Lot header permanently frozen after close + EditLotDrawer subtitle promises a `reabrirlo` (reopen) action that **does not exist**                                                                                                       | Major    | XS (copy) / M (reopen) | 3,4,5,6,7  | P0 copy / P1 reopen             |
| **C2**  | ProductManagement EditDrawer flips **VENDIDA→DISPONIBLE** silently, bypassing the BR-6 sale-integrity check, no guard/confirm                                                                                                           | Major    | M                      | 3,5,6      | **P0**                          |
| **C3**  | Two uncoordinated editors on the same `productInventory` row; **lock only on one side**, disjoint field sets, no cross-link                                                                                                             | Major    | M–L                    | 1,3,6,7    | **P0** (lock) / P2 (cross-link) |
| **C4**  | No dirty-state guard / no autosave on the 3 multi-field drawers — close/backdrop/Esc **silently discards** in-progress work                                                                                                             | Major    | M                      | 3,5        | **P1**                          |
| **C5**  | No undo/revert for committed edits despite a complete before/after audit trail                                                                                                                                                          | Minor    | L                      | 5          | P2                              |
| **C6**  | Carnet/Certificate **re-upload is a dead-end** on VentaDetailPage — mutations exist, no UI entry point                                                                                                                                  | Major    | M                      | 1,3,4,6,7  | **P1**                          |
| **C7**  | Deleting an item from a closed/published lot breaks the BR-2 100% invariant **silently** and writes **no audit row**                                                                                                                    | Major    | S                      | 5,6        | **P1**                          |
| **C8**  | Sale-cancel toast over-promises "stock restaurado"; no restored-vs-skipped count; page handler lacks its own try/catch                                                                                                                  | Minor    | S                      | 5,6        | P1                              |
| **C9**  | EditItemDrawer subtitle is estado-blind; its closed-lot teaching copy is **dead** (only caller passes `editable=true`); nothing says the item is live in the catalog                                                                    | Minor    | S                      | 2,3,4      | P1                              |
| **C10** | Raw server error strings surfaced verbatim (cause, no remedy); two different strings for the same "not abierto" condition                                                                                                               | Minor    | S                      | 2,6        | P2                              |
| **C11** | Route `/close` used for `cerrado` **and** `publicado` (URL contradicts the heading "Gestionar lote"); raw lowercase `estado` enum in the ticket header                                                                                  | Minor    | S                      | 2          | P2                              |
| **C12** | Polish: bare-text loading (no skeletons); disabled buttons lack "why" tooltips; inconsistent destructive-action confirms (sub-lote archive fires instantly); `retryPush` only retries the latest audit row; no deep-link sale→item-edit | Minor    | XS–M                   | 2,3,5,6,7  | P2                              |

---

## Findings by Principle

> IDs map to the canonical issues above where applicable. Severity shown is the **verified (adjusted)** severity.

### Principle 1 — Task Suitability — 72/100 (PARTIAL)

**Strengths**

- Every drawer pre-fills from the canonical record — **zero data re-entry** on the happy path (EditItemDrawer hydrates the matching sub-form; EditLotDrawer re-seeds all 14 fields on open).
- Edits are **diff-only** — only changed fields are sent/audited/pushed (`EditDrawer.tsx:213-258`, `updateGemaFields` diff logic).
- Item-level editing is deliberately frictionless after close/publish (no estado guard on `updateGemaFields`/`updateMedia`).
- Sale-price correction is a 1–2-step inline interaction (pencil → type → Enter).
- Drawers show only relevant fields per surface and per item type.

**Findings**

- **HLZ-101 (Minor, P1)** — _Carnet/Certificate replacement on a completed sale is a UI dead-end_ → see **C6**. `VentaDetailPage.tsx:375-388` renders read-only `DocumentRow` links; `setCarnetUrl/setCertificadoUrl` exist but are never called from the detail view.
- **HLZ-102 (Major, P1)** — _Correcting any lot-header field after close requires aborting & re-entering the whole lot_ → see **C1**. `lots.ts:168-169` throws; EditLotDrawer not mounted on LoteResumenPage.
- **HLZ-103 (Minor, P2)** — _Editing all fields of a published item spans two disjoint surfaces with no cross-link_ → see **C3**. EditItemDrawer owns most fields; EditDrawer uniquely owns colección/caja/ubicación.
- **HLZ-104 (Minor, P2)** — _No deep-link from a sold item back to its edit surface_ → see **C12**. `VentaDetailPage.tsx:495-505` shows itemId as plain text though `loteId` is in scope.

### Principle 2 — Self-Descriptiveness — 70/100 (PARTIAL)

**Strengths**

- Icon-only controls are consistently labeled (`aria-label="Cerrar"`, inline editor aria labels).
- Loading / not-found / empty / error states are visually & semantically differentiated (`role="alert"`, distinct copy).
- Inline numeric edits give plain-language errors in a `role="alert"` live region ("Número inválido", "Mínimo {min}").
- The close/publish step has a strong `ValidationCard` summary with `role="status"` and OK/Revisar badges.
- The atelier EditDrawer's `LockBanner` names the holder and a live "expira en N min" counter.
- Footers teach the keyboard model with `KbdKey` hints ("Esc cierra · ⌘↵ guarda").

**Findings**

- **HLZ-201 (Minor, P1)** — _EditItemDrawer subtitle never says the lot is closed/published_ → **C9**. `EditItemDrawer.tsx:535-537` keys subtitle only on `editable`; `lotEstado` is never threaded in.
- **HLZ-202 (Major, P1)** — _No reachable surface explains lot-header fields are permanently frozen; the only hint is the unreachable "reabrirlo" subtitle_ → **C1**.
- **HLZ-203 (Minor, P2)** — _Route `/close` used for both cerrado & publicado — URL contradicts the "Gestionar lote" heading_ → **C11**.
- **HLZ-204 (Minor, P2)** — _Lot estado rendered as raw lowercase enum with no legend_ (`LoteResumenPage.tsx:361`) → **C11**.
- **HLZ-205 (Minor, P1)** — _Raw, inconsistent server error strings surface to the operator (cause without solution); two different strings for "not abierto"_ → **C10**.
- **HLZ-206 (Minor, P2)** — _Disabled "Editar" lot button gives no reason; publish pill has no explanatory label_ → **C12**.
- **HLZ-207 (Minor, P2)** — _Delete-item confirm doesn't state its consequences_ (orphans the row, drops from lot, breaks BR-2) → relates to **C7**.
- **HLZ-208 (Minor, P2)** — _Carnet/Certificate "Pendiente" state offers no recovery affordance or explanation_ → **C6**.

### Principle 3 — Conformity with User Expectations — 58/100 (DEFICIENT)

**Strengths**

- Sale cancellation is correctly **double-confirmed** with a required free-text reason (`CancelVentaDialog`).
- Item deletion uses an explicit two-step inline confirm.
- Inline editors follow keyboard conventions (Enter commits, Esc cancels).
- Domain vocabulary is consistent and correct (lote, gema/joya/bruto, preponderancia, precioEmbajador…).
- Standard right-anchored MUI Drawer semantics with accessible 44×44 close affordances.

**Findings**

- **HLZ-301 (Minor, P1)** — _EditItemDrawer's closed-lot copy says only photo/cert editable, but every field actually is_ → **C9** (the false-branch copy is misleading and unreachable).
- **HLZ-302 (Minor, P1)** — _EditLotDrawer promises a `reabrirlo` path that doesn't exist_ → **C1**.
- **HLZ-303 (Major, P0)** — _EditDrawer lets an admin set a sold item back to DISPONIBLE with no warning, bypassing sale integrity_ → **C2**. `EditDrawer.tsx:689-697` free `EstadoRadio`; `products.saveEdit` has no transition guard; contrast `sales.cancel`.
- **HLZ-304 (Major, P1)** — _No drawer warns about unsaved edits on close/back — work is silently discarded_ → **C4**. EditDrawer even shows "N cambios sin guardar" yet discards on backdrop click.
- **HLZ-305 (Minor, P2)** — _Inconsistent destructive-action treatment: sub-lote archive fires instantly while item-delete & sale-cancel double-confirm_ → **C12**.
- **HLZ-306 (Minor, P1)** — _Two parallel published-item editors with different overlapping field sets / inconsistent element order_ → **C3**.
- **HLZ-307 (Minor, P2)** — _Completed-sale detail has no affordance to replace a failed carnet/certificate_ → **C6**.

### Principle 4 — Learnability — 68/100 (PARTIAL)

**Strengths**

- A genuine, discoverable hotkey system (`useFotosintesisHotkeys`: ⌘K/N/V/D) plus a global `?` shortcut-help overlay (`FotosintesisGuideFab`, mounted in `FotosintesisLayout`).
- A 9-step onboarding tour + AI copilot tab exists (`FotosintesisGuideFab`).
- Drawers teach their keyboard model in-context (`KbdKey` footers).
- Inline pencils are self-revealing; `EstadoRadio` options carry human-readable descriptions.
- LoteResumenPage explains the consequences of cerrar/publicar inline before commit.
- CapturaLotePage exposes a dedicated `ShortcutTable`.

**Findings**

- **HLZ-401 (Minor, P0)** — _EditLotDrawer promises a `reabrir` capability that doesn't exist — actively teaches a false mental model_ → **C1** (cheapest correct fix is the copy change).
- **HLZ-402 (Minor, P1)** — _EditItemDrawer's closed-lot subtitle is dead copy — its only caller always passes `editable=true`_ → **C9**.
- **HLZ-403 (Minor, P1)** — _No tooltip/help explaining why lot-header fields render but won't save after close_ → **C1/C12**.
- **HLZ-404 (Minor, P1)** — _Carnet/Certificate re-upload is a hidden dead-end — nothing teaches the recovery path_ → **C6**.
- **HLZ-405 (Minor, P2)** — _Inline "Editar ítem"/price affordances lack on-hover tooltips clarifying scope & irreversibility_ → **C12**.

### Principle 5 — Controllability — 55/100 (DEFICIENT)

**Strengths**

- In-progress (pre-commit) edits can always be abandoned cleanly (`EditableMetaValue.cancel()` restores prior value).
- Sale cancellation is a deliberate, source-reversible destructive action with a confirmation gate.
- Item deletion uses a two-step in-place confirm.
- A full per-item audit trail exists and is surfaced read-only.
- One-way transitions are guarded **server-side**, not just client-side.

**Findings**

- **HLZ-501 (Minor, P1)** — _No undo for the last N committed edits on any surface_ → **C5**. `HistorialCard` is read-only; no revert mutation exists.
- **HLZ-502 (Minor, P1)** — _Lot header permanently frozen with no reopen affordance — irrecoverable step with a misleading prompt_ → **C1**.
- **HLZ-503 (Major, P0)** — _EditDrawer can flip VENDIDA→DISPONIBLE silently — integrity break with no warning_ → **C2**.
- **HLZ-504 (Major, P1)** — _No dirty-state warning and no autosave on any multi-field drawer_ → **C4**.
- **HLZ-505 (Minor, P2)** — _Sale cancellation is irreversible (no un-cancel) and the success toast over-promises full stock restoration_ → **C8**.
- **HLZ-506 (Major, P1)** — _Deleting an item from a closed/published lot is destructive, writes no audit row, and silently breaks the preponderance invariant_ → **C7**.

### Principle 6 — Error Tolerance — 65/100 (DEFICIENT/PARTIAL)

**Strengths**

- `EditableMetaValue` is an exemplary error-tolerant primitive (client validate-before-commit; on server throw it restores and shows the error inline, preserving the typed value).
- ProductManagement save preserves form data on failure (toast + keeps edit buffer).
- `CancelVentaDialog` wraps `onConfirm` in try/catch, shows inline error, keeps the dialog open with the typed reason.
- BR-2 preponderance overflow is re-validated server-side against live siblings on every relevant mutation.
- `sales.cancel` is defensively correct (only restores items still VENDIDA; writes the real prior estado).
- Optimistic model is safe by construction (sync mirror patch + fire-and-forget push; failure sets `syncStatus:"error"` with a retry dot).
- EditDrawer has a real 5-minute soft-lock concurrency story.

**Findings**

- **HLZ-601 (Major, P1)** — _No lot-reopen path, yet guidance points to a non-existent "reabrirlo"_ → **C1**.
- **HLZ-602 (Minor, P1)** — _Sale-cancel success toast over-promises "stock restaurado" even when items were silently skipped_ → **C8**.
- **HLZ-603 (Minor, P2)** — _`handleConfirmCancel` has no own try/catch_ — the error IS surfaced by `CancelVentaDialog`'s inline alert, but the page's success path is fragile → **C8** (severity tempered by the dialog's own catch).
- **HLZ-604 (Major, P0)** — _Two uncoordinated edit paths can clobber each other & bypass sale integrity; lock wired only into EditDrawer_ → **C3 + C2**.
- **HLZ-605 (Minor, P2)** — _`retryPush` only retries the latest audit row_ — earlier failed edit's audit row can stay "failed" (mitigated: the visible retry dot is driven by the mirror's single `syncStatus`, not by audit rows) → **C12**.
- **HLZ-606 (Major, P1)** — _Deleting an item from a closed/published lot breaks BR-2 silently with no audit row_ → **C7**.
- **HLZ-607 (Minor, P2)** — _No UI to re-upload carnet/certificate — a failed Drive upload is a permanent dead-end_ → **C6**.

### Principle 7 — User Engagement — 76/100 (PARTIAL)

**Strengths**

- Rich, specific success feedback ("Ítem #N actualizado · K campos").
- Graceful no-op handling avoids false success ("Sin cambios para guardar").
- Perceived response is effectively instant (synchronous mirror patch + reactive UI).
- First-class keyboard affordances across surfaces.
- Both subsystems source from the single design-system barrel.
- Error feedback is captured inline (`role="alert"`) rather than swallowed.
- Cancel/escape paths are well-mannered (close blocked during in-flight save).

**Findings**

- **HLZ-701 (Minor, P1)** — _EditLotDrawer dead-end promises a "reabrirlo" path_ → **C1**.
- **HLZ-702 (Major, P1)** — _No re-upload affordance for carnet/certificate — DocumentRow is a dead "Pendiente" label_ → **C6**.
- **HLZ-703 (Minor, P2)** — _Loading states are bare centered text, not skeletons_ (violates the project's own anti-blink density rule; EditDrawer renders a blank panel while loading) → **C12**.
- **HLZ-704 (Minor, P2)** — _Same row edited through two visually distinct drawers (atelier vs Fotosíntesis) with no cross-reference_ → **C3**.
- **HLZ-705 (Minor, P2)** — _EditLotDrawer renders editable-looking inputs in a read-only state with no banner_ (mitigated: inputs are genuinely HTML-`disabled`, and the launcher button is disabled, so it's effectively dead code) → **C1/C12**.

---

## Rejected by Verification (8 — kept for transparency)

The adversarial pass dropped 8 candidate findings as **factually wrong or stale**. These are worth recording because they were plausible-sounding:

1. **"EditLotDrawer renders inputs as editable on closed lots then no-ops on save"** — _wrong_: inputs are genuinely `disabled={!editable}`, exactly the recommended state.
2. **"InlineEditCell silently swallows parse/validation errors"** — _wrong_: `parse` returns `null` (intentional clear), and save failures are caught upstream in `handleInlineEdit`.
3. **"Sync-error dot conveys 'error' but not the cause"** — _wrong_: missed `SyncMeta` (`EditDrawer.tsx:1154-1192`) which shows `Error: <syncError text>`.
4. **"The post-publish product-edit path (/admin/products) is completely undiscoverable"** — _wrong_: the public price (and most fields) are editable in-place from the lot screen via "Editar ítem" → EditItemDrawer in any estado. **(This corrected the audit's own initial mental model.)**
5. **"No onboarding/coachmarks for any edit flow"** — _wrong_: `FotosintesisGuideFab` is a mounted 9-step tour + `?` help + AI copilot.
6. **"Hotkey discoverability doesn't extend into edit context"** — _wrong_: the global `?` (Shift+/) overlay enumerates every shortcut as `KbdKey` chips.
7. **"EditLotDrawer invites input that is silently discarded on a frozen lot"** — _wrong_: native `disabled` controls reject all typing.
8. **"InlineEditCell silently discards the edit when parse throws"** — _structurally present but harmless_: the only consumer's `parse` never throws.

**Takeaway:** the genuine gaps cluster on **state-transition control, cross-surface coordination, and post-commit reversibility** — not on labeling, discoverability, or validation, which are mostly strong.

---

## Improvement Plan

### Executive Summary

- Global score: **~66/100** (CONDITIONAL · release gate FAIL @ 90)
- Critical: **0** · Major: **11** · Minor: **31** (after verification)
- Largest gaps: **P5 Controllability (55)** and **P3 Conformity (58)** — both pulled down by the same root causes (frozen lot, VENDIDA flip, no dirty-guard, no undo).
- Estimated total effort to clear P0+P1: **~M+M+M+S+M+S+S ≈ 1.5–2 sprints** for one engineer.

### P0 — Before this becomes the canonical edit surface

| ID        | Issue                                                                                                                                                                                | Principle | Effort | Impact                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ | ---------------------------------------------------------------- |
| C2        | Guard `products.saveEdit`: reject VENDIDA→DISPONIBLE while a non-cancelled sale references the item (or require explicit override + audit reason); gate `EstadoRadio` with a confirm | 3,5,6     | M      | Prevents silent sale-integrity break / phantom re-sellable stock |
| C3 (lock) | Wire the existing soft-lock into EditItemDrawer + InlineEditCell, or share a per-`itemId` lock across both subsystems                                                                | 1,3,6     | M      | Stops the two editors from clobbering each other                 |
| C1 (copy) | Fix the dishonest `reabrirlo` subtitle in `EditLotDrawer.tsx:311` — state the truth ("datos contables fijos tras el cierre")                                                         | 3,4,6,7   | XS     | Removes a false mental model taught on 4 principles              |

### P1 — Next sprint

| ID          | Issue                                                                                                                                                                                                             | Principle | Effort | Impact                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | --------------------------------------------------------- |
| C4          | Add a `useDirtyGuard(hasChanges)` to all 3 drawers (intercept close/backdrop/Esc; `beforeunload`)                                                                                                                 | 3,5       | M      | Stops silent loss of 13–20-field edits                    |
| C6          | Add "Reemplazar/Subir" file-input to carnet & certificate `DocumentRow` on VentaDetailPage → existing `setCarnetUrl/setCertificadoUrl`                                                                            | 1,3,4,6,7 | M      | Converts a permanent dead-end into a 1-step recovery      |
| C7          | On `lotItems.remove`: write a `productEdits` audit row; on a non-`abierto` lot, warn (or flag) that preponderance no longer sums to 100%                                                                          | 5,6       | S      | Restores traceability + invariant integrity               |
| C1 (reopen) | Add a guarded `lots.reopen` mutation (admin-only, audit-logged, re-fans `costoBaseCOP`, blocked once any item VENDIDA) **or** a read-only "Datos del lote" panel on LoteResumenPage with an explicit escape hatch | 1,3,5,6   | M      | Gives the only real way to fix a miskeyed `costoTotalCOP` |
| C8          | `sales.cancel` returns `{restored, skipped}`; tailor the toast; wrap `handleConfirmCancel` in its own try/catch                                                                                                   | 5,6       | S      | Honest feedback; robust error path                        |
| C9          | Thread `lotEstado` into EditItemDrawer; estado-aware banner ("Lote publicado · este ítem está en el catálogo — los cambios se reflejan al instante")                                                              | 2,3,4     | S      | Tells the operator the scope/consequence of the edit      |

### P2 — Backlog / continuous improvement

| ID              | Issue                                                                                                                                                       | Principle | Effort |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| C3 (cross-link) | "Editar en catálogo" link in EditItemDrawer (→ `/admin/products?search={itemId}`) and "Editar datos Fotosíntesis" in EditDrawer for rows with `loteId`      | 1,3,7     | S      |
| C5              | `products.revertEdit({auditId})` + `lotItems.revert` re-applying `before` values; "Deshacer" on the latest HistorialCard row + transient snackbar           | 5         | L      |
| C10             | Client-side error-message map keyed on known server strings (append remedy); standardize the two `lots.ts` "not abierto" strings                            | 2,6       | S      |
| C11             | Rename route `/close` → `/manage` (redirect legacy); map `estado` to a human label + capability hint via shared formatter                                   | 2         | S      |
| C12             | Skeleton loaders; "why disabled" tooltips; two-click confirm on sub-lote archive; `retryPush` re-pushes all non-synced audit rows; deep-link sale→item edit | 2,3,5,6,7 | XS–M   |

### Principles ranked by gap

1. **P5 Controllability (55)** — frozen lot, VENDIDA flip, no dirty-guard, no undo, no un-cancel.
2. **P3 Conformity (58)** — same root causes seen as "behaves unexpectedly" + destructive-action inconsistency.
3. **P6 Error Tolerance (65)** — strong primitives undermined by transition gaps (BR-2 break, toast over-promise).
4. **P4 Learnability (68)** / **P2 Self-Descriptiveness (70)** — mostly the misleading copy + missing estado context.
5. **P1 Task Suitability (72)** / **P7 Engagement (76)** — solid; carnet dead-end + dual-surface are the main drags.

### Follow-up metrics

- **Re-audit** after P0+P1 land (target: lift global to ≥75, P5 ≥70).
- **Proxy metrics to monitor**: count of `productEdits` where `estado` reverses from VENDIDA (should be ~0 after C2); support tickets about "no puedo corregir el costo del lote" (C1); orphaned `productInventory` rows with `loteId=undefined` (C7).

---

## Methodology & Limitations

- **Analysis type**: expert heuristic review of source code (no live user study, no running app — admin auth + locked browser).
- **Standard**: ISO 9241-110:2020 — Ergonomics of human-system interaction — Part 110: Interaction principles.
- **Process**: 4 architecture mappers (one per subsystem) → 7 per-principle evaluators grounded in the combined map → 1 adversarial verifier per finding (default-skeptical, re-reading the cited file:line). 50 candidates → 42 confirmed / 8 rejected. Two "Critical" claims downgraded to Major.
- **Limitations**: scores are heuristic, not measured (no time-on-task/abandonment data). A few cited line numbers drift by ±a handful of lines as the working tree evolves; the cited _behaviors_ were verified current as of commit `8089924`. Live breakpoint/interaction QA (360/768/1280/1920) was not performed and could surface additional P7 items.
