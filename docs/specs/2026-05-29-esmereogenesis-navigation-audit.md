# Esmereogénesis — Flow & Navigation Map Audit

**Branch:** `feature/esmereogenesis-refinement`
**Date:** 2026-05-29
**Method:** First-hand read of every nav-critical file + 5-dimension multi-agent map (routes/guards/deep-link · entry points · in-flow overlays · back/exit/focus · context state machine), each candidate issue adversarially re-verified against source. 62 nodes / 81 edges discovered; 20 issues confirmed, 10 refuted.

---

## 1. The navigation map

```
                                 ┌─────────────────────────────┐
   (app-wide auth gate)          │   THE REST OF THE APP       │
   WelcomeScreen ──login──▶      │  Home · Treasure · Product  │
                                 └─────────────────────────────┘
                                    │            ▲          │
   ┌── deep-link /esmereogenesis ───┘            │          │ NO persistent
   │   /:planId (localStorage only)              │          │ nav links INTO
   │                                             │          │ the Hub (⚠ HIGH)
   │                              ProductDetailPage          │
   │                                   │  renders            │
   │                                   ▼                     │
   │                          ┌──────────────────┐           │
   │                          │ EsmereogenesisCTA│           │
   │                          │ (state-aware)    │           │
   │                          └──────────────────┘           │
   │                          no plan│   │ active/completed   │
   │                                 ▼   │ plan for item      │
   │                        ┌─────────────┐ │                 │
   │                        │CreationSheet│ │  deep-link      │
   │                        │(BottomSheet)│ │  to that plan   │
   │                        └─────────────┘ │                 │
   │                          createPlan│   │                 │
   │                          (80ms push)▼   ▼                 │
   │                       ╔══════════════════════╗            │
   └──────────────────────▶║  GARDEN              ║◀───────────┘
                           ║  /esmereogenesis/    ║   plan card (push)
        back chevron       ║  :planId             ║◀──────────┐
        navigate(          ║                      ║           │
        "/esmereogenesis") ║  state-driven:       ║           │
        ── PUSH, hardcoded  ║  • garden-active     ║           │
        (⚠ 5 findings) ──┐ ║    └▶ AporteSlider   ║           │
                         │ ║       (in-place)     ║           │
                         │ ║       └▶ Cinematic   ║           │
                         │ ║          (raw fixed  ║           │
                         │ ║           Box ⚠ a11y)║           │
                         │ ║          └▶ undo snak║           │
                         │ ║  • garden-completed  ║           │
                         │ ║    └▶ ClaimSheet     ║           │
                         │ ║  overlays: delete-   ║           │
                         │ ║   confirm, coachmarks║           │
                         │ ║   (auto @1500ms 1st  ║           │
                         │ ║    visit only)       ║           │
                         │ ╚══════════════════════╝           │
                         │      │ delete (replace)            │
                         ▼      ▼ bad planId (replace)         │
                  ╔══════════════════════╗                    │
                  ║  HUB /esmereogenesis ║────plan card (push)─┘
                  ║                      ║
                  ║  hasPlans?           ║──"Sembrar nueva"──▶ /treasure
                  ║  • false→ EmptyState ║──"Explorar catál."▶ /treasure
                  ║    └▶ seedDemo (stay)║                    (⚠ no in-Hub
                  ║  • true → plan-list  ║                     create)
                  ║    (active+adquiridas)║
                  ║  Settings menu:      ║
                  ║   sounds·haptics·    ║
                  ║   "Ver explicación"· ║
                  ║   reset-confirm      ║
                  ║                      ║
                  ║  back: navigate(-1)  ║──history?──▶ ProductDetail / prev
                  ║  else /home          ║──no history─▶ /home
                  ╚══════════════════════╝   (history-AWARE — good)
```

**Two routes, both unguarded** (Suspense-only, behind the app-wide login gate — App.tsx:395-410). The flow is overwhelmingly **state-driven**: a single localStorage-backed `EsmereogenesisContext` (mounted app-wide in `AppShellProviders`) decides empty-vs-list, active-vs-completed, and onboarding-seen. There is no server backing — plans live only in `localStorage` (`tierra-madre-esmereo-plans`).

**Plan lifecycle (state machine):** `createPlan → empty → addAporte → growing → (target hit) completed → claimPlan → claimed`. The Garden swaps `AporteSlider` for `CompletedCelebration/ClaimSheet` once `isCompleted`.

---

## 2. Confirmed findings (deduped to root causes)

### 🔴 HIGH

**H1 — The Hub has no entry point from any persistent navigation surface.**
`/esmereogenesis` is reachable only from _inside_ the flow (Garden back chevron, not-found/delete redirects) or by deep-linking a specific Garden via the product-page CTA. A full-src grep of `IOSTabBar`, `IOSMoreSheet`, `MoreSheetSearch`, `IOSSettingsSheet`, Home, and menus returns **zero** links to the feature. A user who closes the tab can only get back by re-finding the product. _Fix:_ add an `IOSMoreSheet` entry + `IOSTabBar` secondaryRoute for `/esmereogenesis` (mirror the Bóveda/vault entry), optionally a Home affordance.

### 🟠 MEDIUM

**M1 — Garden back chevron is hardcoded `navigate("/esmereogenesis")` (PUSH).** _(root cause of 5 confirmed findings: #7/#8/#9/#13/#20)_ It ignores real history, so:

- product-detail arrivals (CTA → active/completed plan, or post-create seed) are silently teleported to the Hub instead of back to the product;
- it PUSHes a duplicate Hub entry → for Hub-origin users the stack becomes `[Hub, Garden, Hub]`, and a subsequent browser/OS Back bounces **back into the Garden** (A↔A loop);
- the originating product ends up buried two entries deep after create.
  _Fix:_ mirror the Hub's own pattern — `window.history.length > 1 ? navigate(-1) : navigate("/esmereogenesis", { replace:true })`.

**M2 — In-flow overlays don't intercept hardware/browser Back.** _(root cause of #5/#17)_ None of the five overlays (cinematic, AporteSlider-open, ClaimSheet, delete-confirm, coachmarks) push a history entry, so pressing system Back **exits the whole Garden route** instead of closing the top overlay. Worst during the ~7.5s cinematic. (App uses `BrowserRouter`, so `useBlocker` is unavailable without a data-router migration.) _Fix:_ on overlay open, `pushState` a synthetic entry + a `popstate` listener that closes only the topmost overlay and consumes the event.

**M3 — AbonoCinematic is a raw `position:fixed` Box, not a Modal — broken keyboard/focus a11y.** _(root cause of #3/#4/#16)_ `role="dialog"` but: no `aria-modal`, no Esc handler, no focus trap, no focus-in on open, no focus restore on close. Its only dismiss is **tap-to-skip on the backdrop** — and the center stage (`onClick stopPropagation`, line 286) **swallows taps on the gem / % / eclosión message**, the most natural targets. For ~7.5s a keyboard user has no reachable skip. _Fix:_ render through MUI `Modal` (Portal + focus trap + restore + Esc→onClose), and remove the center-stage `stopPropagation` (it isolates no interactive children).

**M4 — Deep-linked Garden URLs are localStorage-only and dead-end with a misleading message.** Plans are read solely from `localStorage` (no fetch/Convex); a link opened on another device / in incognito / after a clear resolves to `undefined` → toast **"Esa Esmereogénesis no existe"** + silent `replace` to Hub — indistinguishable from a genuinely deleted plan. _Fix:_ branch the copy (e.g. "Esta Esmereogénesis vive solo en el dispositivo donde la creaste") or route to an explainer instead of a silent redirect.

**M5 — BottomSheetShell shows a drag handle and docstring promises "swipe behaviour", but it's a plain MUI `Drawer` (no swipe-to-close).** The 44×4 pill handle is a pure affordance lie — dragging it does nothing; only backdrop/Esc/X dismiss. _Fix:_ either `SwipeableDrawer` / a Framer `drag="y"` threshold that calls `onClose`, or drop the handle.

**M6 — Empty-state "Cargar jardín de demostración" is a silent no-op when treasure images haven't resolved.** `seedDemo` returns `[]` (filters on `imagen && precioCOP>0 && estado==="DISPONIBLE"`) with no notify/spinner/disabled state → button looks broken on a cold catalog. _Fix:_ notify "Aún cargando el catálogo…" on empty result, or disable until `treasureReady`.

### 🟡 LOW

- **L1 — No `*`/404 route** inside `AppContent`'s `<Routes>` — a 2-segment path like `/esmereogenesis/abc/extra` matches neither route and renders a blank content area (the persistent tab bar still allows recovery). _Fix:_ add a catch-all `<Navigate to="/home" replace />` or a `NotFound`.
- **L2 — Garden not-found redirect runs in an effect after a null-render frame** (commits one `null` frame before navigating). Lookup is synchronous, so use a render-phase guard: `if (planId && !plan) return <Navigate to="/esmereogenesis" replace />`.
- **L3 — No focus management on Hub↔Garden transitions.** `RouteScrollReset` resets scroll only; focus falls to `<body>`, no SR announcement. _Fix:_ focus `#main-content` (already `tabIndex={0}`) or the page `<h1>` after scroll reset.
- **L4 — Onboarding explainer never auto-shows for Hub-first users** — the 1500ms auto-open is wired to the Garden route only; Hub-only users must find it under Settings → "Ver explicación".
- **L5 — ClaimSheet blocks backdrop/Esc/X during its 600ms submit with no visible lock cue** (`handleClose` early-returns while `submitting`). _Fix:_ `hideCloseButton` + `aria-busy` while submitting.
- **L6 — Product CTA locks into continue/view once any plan exists for an item** — no "start another plan for this item" path (relevant only if multiple plans per item is desired; currently a product decision, not a defect).

---

## 3. Refuted — checked and cleared (scoping wins)

These were hypothesized but **disproven against source**, so they need no work:

1. **Provider scope is safe** — `EsmereogenesisProvider` wraps the whole `BrowserRouter` tree; deep-links always have context. The "provider narrower than routes" bug does **not** exist.
2. **No double-toast** on the not-found redirect — `notify` is memoized/stable.
3. **80ms create→navigate `setTimeout`** is a cosmetic timing hack, not a navigation defect.
4. **No unsaved-aporte data loss** of consequence — the open AporteSlider holds only cheap local UI state, no committed work, so the absence of a leave-guard is acceptable.
5. **Garden → app exit exists** — the Hub's history-aware back already provides the route back to the app; the Garden isn't a true dead-end.
6. **Older duplicate plans stay reachable** via the Hub even though the CTA deep-links the newest.
7. **Suspense fallback** being the generic spinner is cosmetic, not a nav break.
8. **Coachmarks don't loop** — `ESMEREO_ONBOARDING_SEEN` is persisted on dismiss; Hub re-open is intentional/manual.
9. **Dead `seeded` state / `empty`≈`growing`** is type hygiene, not a navigation problem.

---

## 4. Suggested priority order

1. **H1** (Hub entry point) — the only thing that makes the whole feature discoverable/returnable.
2. **M1** (Garden back history-awareness) — one-line fix, resolves 5 findings and the A↔A bounce.
3. **M3 + M2** (cinematic Modal + overlay back-intercept) — biggest a11y/UX gap; M3's Modal migration partially addresses M2 for that overlay.
4. **M4, M5, M6** — copy/affordance honesty + cold-catalog feedback.
5. **L1–L6** — polish.
