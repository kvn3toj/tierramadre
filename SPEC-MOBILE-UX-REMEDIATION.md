# Spec: Mobile UX/UI Remediation — Treasure Catalog & Product Detail

**Version:** 1.3 · **Date:** 2026-07-30 · **Author:** UX audit (Claude) + Kevin
**Surfaces:** `/treasure`, `/product/:id`, filter sheet, recents panel, Menú sheet,
Embajadores catalog (added in v1.2)
**Status:** P0 shipped (PR #71) and confirmed on a real iPhone — see Status and
Real-Device Pass sections below. Sections 1-9 are the original audit, preserved
as written; several of its claims were disproven during implementation and are
corrected in the Status section. v1.2 added the Embajadores findings (§Real-Device
Pass) and requirements P0.6, P1.8, P1.9. v1.3: P0.6 shipped and verified on
device (`minmax(0, 1fr)` fix, prices intact at 402px, custody field removed
from the ubicación slot); retracts v1.2's "canonical quality ladder" conclusion
and reopens OQ-2 pending the calidad-column scan; notes the lot-code prefixes
(P1.9) were a contributing cause of the P0.6 overflow, not just cosmetic.

---

## Status — P0 COMPLETE (2026-07-30)

Shipped on `fix/mobile-box-model-reset` (PR #71). Verified on the **production
build** at 360/390/430: `box-sizing: border-box`, `body { margin: 0 }`,
container `margin-right` **−32px → 0px**, `scrollWidth === innerWidth`, zero
sub-11px text nodes, zero unprotected images.

| Item                                       | Status                                                     | Commit               |
| ------------------------------------------ | ---------------------------------------------------------- | -------------------- |
| P0.1 Global baseline                       | ✅ shipped as a **plain CSS reset**, NOT `<CssBaseline />` | `ac36c9d`            |
| P0.2 Menú sheet                            | ✅ real defect was a transient overshoot, not `-199px`     | `74a458c`            |
| P0.3 Ubicación/price                       | ✅ root cause found: cross-layout column collision         | `3af7f0e`            |
| P0.4 Typography floor                      | ✅                                                         | `32b4022`            |
| P0.5 Tap targets                           | ✅                                                         | `32b4022`            |
| — Data guards (`0.00 ct`, SpecRow)         | ✅                                                         | `55b61f7`, `9648324` |
| — Image save protection (not in this spec) | ✅                                                         | `b1a697f`            |

Regression coverage went from 0 to **60 e2e cases**: 14 checks × 4 phone
viewports, plus a 4-case `desktop regression @ 1280×800` block (box-model reset,
two overflow routes, and the `[data-foto-admin]` coexistence check).
Every assertion is negative-tested: reverting its fix makes it fail — and fails
only its own case.

### Claims in this document that turned out to be WRONG

1. **§6 P0.1 "the theme is already prepared at `src/theme.ts:272`" — false, twice.**
   `src/theme.ts` is dead code (nothing imports `theme`), and mounting
   `<CssBaseline />` was the _riskiest_ option, not the safest: there is no
   `StyledEngineProvider injectFirst`, so emotion injects after
   `css-variables.css` and its `body` rule wins — carrying
   `theme.typography.body1` and silently reflowing every non-`<Typography>`
   text node from SF Pro Text/17px to Libre Franklin/16px. The plain CSS reset
   was correct because a universal selector has zero specificity and is
   therefore order-independent. Confirmed on the production build.

2. **§2 RC-E `top: -199px` does not reproduce.** Measured minimum is 73.8 on a
   701px viewport (resting position 105.2). The real defect is a **transient
   ~31.4px overshoot** at ~100ms: the enter curve's control point exceeds 1, so
   `translateY` goes negative and a `bottom: 0` sheet lifts off the bottom edge,
   exposing the scrim for ~200ms. The "second stacked instance" is the
   **`IOSSettingsSheet` parked off-screen** at `translateY(100%)` with
   `visibility: hidden` — normal, not a duplicate mount.

3. **§6 P1.2 the `ScrollFadeEdges` claim is false.** The filter sheet's
   Categoría row already uses it (`FilterContent.tsx:515`). Dropped.

4. **§2 RC-D understated the `0.00 ct` scope.** It was missing in ~28 places,
   not ~9 — including GridCard's own live branch and, worse, `getPesoDisplay`
   in `useCotizacion.ts`, which put "0.00 ct" on the **quotation document
   handed to clients**.

5. **§8 OQ-1 answered — and the premise was wrong.** The price-in-Ubicación is
   NOT a data-entry error. It is a **cross-layout column collision**: SOT v3 /
   Fotosíntesis inserts `precioembajadorcop` + `precioconscientecop` at indices
   12–13, shifting everything down by two, so the legacy positional fallback
   `getByIndex(12)` returns a **price**. Scanned read-only: the legacy book has
   320 non-empty `ubicación` values, **all text, zero price-shaped**.

### Discovered while implementing — not in this spec

- **Provenance fields that are never filled cannot answer provenance
  questions.** Ruling on the `FINA COMERCIAL` rows should have been trivial:
  check whether they share an entry date or an advisor, and a single
  data-entry session settles it as a typo beyond reasonable doubt. Neither test
  could run — **`fecha ingreso` is empty on every one of those rows** and
  `proveedor` is empty throughout the column (`asesor` is set on only 4 of 10).
  So a 10-row question that the data should have closed in seconds now needs a
  human judgement call. That is a live argument for making `fecha ingreso` and
  `proveedor` **required at capture in Fotosíntesis** — every unfilled
  provenance cell is a future question the books will not be able to answer.
  Out of scope here; belongs to the Fotosíntesis capture flow.
- **Production silently reads the LEGACY spreadsheet.** All four
  `*SPREADSHEET_ID` vars exist in Vercel but are set to **empty strings**, so
  `cleanEnvId('')` is falsy and `constants.js` falls back. The SOT v3 cutover
  was started but never completed. **The `ubicacion` fix above must land before
  those vars are filled**, or every row's Ubicación would render a price.
- **Image save protection was inert.** The `img, video` guard in `theme.ts` was
  dead twice over, so every catalog, detail and vitrina photo was drag- and
  long-press-saveable. Now global.
- **A dead CSS selector:** `nav[aria-label='Primary navigation']` in
  `css-variables.css` never matches — the live label is localized
  (`Navegación principal`).

### Still open

- **iOS long-press guard** — the one remaining real-device check: long-press a
  product photo in Safari and confirm no "Save Image" sheet (Chromium strips
  `-webkit-touch-callout` at parse time, so it is unobservable from the test
  runner by any means). The rest of the real-device pass is done — see below.
- **P1** largely unblocked. ~~OQ-2 is answered by the Embajadores quality
  ladder~~ — retracted; the scan replaced that guess with data (see §8 OQ-2).
  P1.2 now waits only on the 10-row `FINA COMERCIAL` ruling. OQ-3 (Chivor as an
  Origen facet) remains a product decision, and now has a real home: the
  ambassador detail's Origen cell reads `procedencia`.

---

## Real-Device Pass — v1.2 (2026-07-30, iPhone Safari, Vercel preview)

Verified from Kevin's iPhone screenshots of the PR #71 preview
(`ojgames.vercel.app`), light and dark themes.

**Confirmed fixed on device:** symmetric 16px gutters on `/treasure`; filter
button fully visible; "477 esmeraldas en total" complete; card titles truncate
with ellipsis ("Guardianas Geme…") instead of clipping; detail-page spec rows
fully inside the viewport ("Esmeralda natural", "Gema Facetada", "9 unidades");
weight label formatted ("0.09 CT · REDONDA", no `0.00 ct`); notch/safe-area
rendering correct on the header; light/dark parity.

**New findings (Embajadores catalog — a surface outside the original audit):**

1. **Prices clipped at the right viewport edge** on the Embajadores → Joyas
   list: "$ 56…", "$ 29…", "$ 28…" cut mid-number, and a stray "16" (the
   `ViewAllTreasuresFAB` counter) clipped at the edge. Component internals are
   _correct_ — `ProductListCard.tsx` already has `minWidth: 0` on the info
   block and `flexShrink: 0` on the price — so the overflow is in a page-level
   container on this route (Embajadores is a full-width scope exempt from the
   shell's `--maxw` container per `IOSLayout.tsx:217`, so it owns its width and
   missed the shell fix). Diagnose live with the same overflow sweep
   (`el.getBoundingClientRect().right > innerWidth`) on
   `AsesorProfilePage.tsx` / `CategoryDetailView.tsx` wrappers. → **P0.6**
2. **`ubicacion` carries role values here** — rows show "EMBAJADOR" / "ASESOR"
   in the position `ProductListCard.tsx` renders `item.ubicacion`. More
   evidence of the cross-layout column collision (same family as the P0.3
   price leak); the ambassadors data path needs the same layout-aware read. →
   folded into **P0.6 AC**
3. **"EMBAJADO…" truncates in the tab bar** — the Embajadores label does not
   fit at 390px. → **P1.8**
4. **Lot codes in display names** — "L:II-JA Anna", "L:A-104 Aria" prefix
   client-visible names with internal lot identifiers. → **P1.9**
5. **~~Canonical quality ladder surfaced~~ — RETRACTED in v1.3.** The Joyas
   chip row shows `Comercial Estándar … Fina Sublime` and v1.2 concluded this
   was the canonical taxonomy. The **Gemas** row falsified that: it shows
   **both `COMERCIAL FINA` and `FINA COMERCIAL` as separate chips** (a
   transposition living as two distinct data values), contains `Morralla Fina`
   (absent from the "ladder"), and lacks `Comercial Estándar`/`Comercial
Superior`. The chips are **data-derived uniques per category, not a curated
   ladder** — there is no canonical taxonomy to normalize to yet. The casing
   tell: `Morralla Fina` renders Title Case beside ALL-CAPS neighbours inside
   one control, so mixed casing is in the source data, not a `textTransform`.
   **OQ-2 is reopened** pending a read-only scan of the `calidad` column
   across all three books (distinct values × counts, per book and per
   category, with near-duplicates flagged under case-fold + word-sort
   normalization). The scan decides P1.2's shape: a few transposed rows →
   source fix + thin mapping table; a split through the inventory → app-side
   normalization layer + separate data-cleanup task.
6. **Minor:** stacked double back control on the Galería/Ficha detail header
   (top-bar ← plus in-card ‹); "Plata - comercial" casing breaks the ladder's
   Title Case. → **P1.9**

---

## 1. Problem Statement

On mobile, the Treasure catalog — the core selling surface of the app — renders with a visibly broken layout: the product grid and toolbar sit ~40px from the left edge while clipping off the right edge, the filter button is half cut off, and text is truncated at the viewport edge. Ambassadors demo this catalog to clients from their phones, so every one of these defects is visible during a sale. Two one-line CSS root causes account for the majority of the visible damage; the rest are localized component, data-taxonomy, and accessibility defects documented below.

**Audit method:** Live drive of https://tierramadre.app/treasure in Chrome at 500×701 (Chrome's minimum window width; the production issues are _worse_ at real phone widths of 360–430px because the fixed overflow is proportionally larger), with DOM/computed-style inspection, plus source tracing in the repo.

---

## 2. Root Causes (traced to source)

### RC-A — Global `box-sizing: border-box` reset never applies ⚠️ highest impact

- `src/theme.ts:272` defines `MuiCssBaseline.styleOverrides`, **but `<CssBaseline />` is never mounted anywhere in the app** (only reference in the codebase is the theme definition itself). MUI's baseline — which supplies `box-sizing: border-box` inheritance and `body { margin: 0 }` — therefore never runs.
- Consequence, measured live: the app-shell content container in `src/components/ios/IOSLayout.tsx` (~line 458):

  ```tsx
  <Box sx={{ maxWidth: 'var(--maxw)', mx: 'auto', width: '100%',
             px: { xs: 2, sm: 3, md: 4 } }}>
  ```

  computes as `box-sizing: content-box`, so its outer width = `100% + 32px` (xs padding × 2). The over-constrained `margin-right: auto` then resolves to **−32px** (verified: computed `margin: 0px -32px 0px 0px` on `.css-1r9tdc4`).

- Visible damage (all measured): search-bar row spans `8px → 509px` in a 500px viewport; filter button half-clipped; "477 esmeraldas en total" truncated; detail-page value column ("Joya", "DISPONIBLE", …) flush/clipped right; green CTA with 40px left / ~9px right margins; recents carousel first card starting off-screen left and "Limpiar" clipped right.
- Note: `src/design-system/tokens/css-variables.css:443-453` already documents and patches this exact bug class — but only scoped to `[data-foto-admin]` inputs. The comment is the smoking gun that the global reset is known to be missing.

### RC-B — `body { margin: 0 }` only exists inside the standalone-PWA media query

- `src/design-system/tokens/css-variables.css`: the base `body` rule (line ~256) sets safe-area padding, typography, overscroll — but **not `margin: 0`**. The reset at line ~353 lives inside the standalone/display-mode block, so any browser-tab session keeps the UA default **8px body margin**: content shifted 8px right and down, black band below the tab bar, `bodyScrollW` (484) ≠ `innerWidth` (500).

### RC-C — Color taxonomy drift

- `src/utils/formatting.ts:121` `COLOR_MAP` knows only `Verde Vivido / Verde Muzo / Verde Limón / Verde Menta / Verde Natural`. Live inventory colors are `Verde, Aguamarina, Azul, Chivor, Cristal, Intenso` → every filter dot falls back to gray `#6B7280` (verified: all six dots render `rgb(107,114,128)`). The color filter communicates nothing, and `Chivor` (an origin) and `Cristal/Intenso` (qualities) are mis-filed as colors.

### RC-D — Dirty inventory data propagates raw into the UI

- `Ubicación` on `/product/415` renders **"150820"** — the price value (`$150.820`) leaked into the ubicación column (Sheets → Convex mapping or source-data entry). `src/pages/treasure/ProductDetail/components/AdditionalInfo.tsx:54` renders `product.ubicacion` verbatim.
- Empty `Asesor` / `Fecha de Ingreso` rows render as blank rows (`SpecRow` has no empty-value guard).
- Filter sheet shows an **unlabeled chip row** of raw quality values: `5 6 7 8 1/6 COMERCIAL COMERCIAL ES…` — data-derived uniques with no curation, no section header, clipped at the right edge.
- Cards show `Gema · 0.00 ct` (guard exists in `GridCard.tsx:72` but not in the search/quick-access card path), a bare `6` as a material line, and mixed title casing (`Andromeda - C010` with internal SKU vs `Choker derretido`).

### RC-E — Menú sheet positioning failure

- Opening **MENÚ** at 500×701 produced a fixed sheet at `top: −199px` (header clipped above the viewport) with a **second stacked instance** translated to `398→993px`, leaving the bottom ~45% of the screen as black void (measured `maxHeight: 595.85px` = 85vh, `scrollHeight: 1490`). The bottom-sheet anchor math (`--app-main-height` / transform origin) breaks at short viewports and/or double-mount.

---

## 3. Goals

1. **Zero horizontal overflow** on every audited surface at 360–430px widths: `document.documentElement.scrollWidth === window.innerWidth`, and no interactive control clipped by the viewport edge.
2. **Symmetric gutters**: left and right content edges within 1px of each other on catalog, detail, sheets, and carousels.
3. **Legibility & reachability floor**: no persistent UI text under 11px; all tap targets ≥ 44×44px (WCAG 2.5.8 / iOS HIG).
4. **The color filter communicates color**: every chip dot renders a distinct, correct swatch; non-color values leave the Color facet.
5. **No raw/broken data visible to a client**: no price-in-Ubicación, no `0.00 ct`, no blank spec rows, no unlabeled chip sections, in any client-facing view.

## 4. Non-Goals

- **DS3 "Quiet Emerald" migration acceleration** — this spec fixes defects; component-by-component DS3 convergence continues on its own track (per `DESIGN-SYSTEM-V3.md`).
- **Desktop layout changes** — desktop renders acceptably; only shared-root fixes (RC-A/RC-B) may touch it, and must be regression-checked there.
- **Redesign of the sticky header** beyond a collapse-on-scroll behavior — no new visual design work in v1.
- **Full Sheets→Convex data cleanup** — v1 adds UI guards + fixes the ubicación mapping; a full inventory-data hygiene pass is a separate initiative.
- **New features** (sorting options, wishlists, etc.) — remediation only.

---

## 5. User Stories

- As an **ambassador demoing on a phone**, I want the catalog grid, toolbar, and filter button fully visible and aligned so that the product presentation looks professional in front of a client.
- As an **ambassador**, I want to filter by color using chips whose dots actually show each color so that I can find stones matching a client's request without reading every label.
- As a **client browsing a shared catalog link**, I want product pages free of internal codes, zero-carat labels, and misplaced data so that I trust the product information.
- As an **ambassador returning from a product page**, I want the list restored to where I left it so that I don't re-scroll through hundreds of items.
- As a **staff admin on a phone**, I want the Menú sheet to open fully on screen so that I can reach Invitar/Solicitudes/Cuentas while away from my desk.
- As a **user with reduced dexterity or larger fingers**, I want the filter, recents, and clear-search buttons big enough to tap reliably so that I don't mis-tap during a client session.

---

## 6. Requirements

### P0 — Must-Have (blocks the "looks broken" perception)

**P0.1 — Mount the global baseline (fixes RC-A + RC-B in one change)**
Mount `<CssBaseline />` (theme is already prepared at `src/theme.ts:272`) at the app root in `src/main.tsx` / `AppShellProviders`, **or** add to `css-variables.css`:

```css
html {
  box-sizing: border-box;
}
*,
*::before,
*::after {
  box-sizing: inherit;
}
body {
  margin: 0;
}
```

_Acceptance criteria:_ (a box is ticked only when something **verifies** it —
a negative-tested e2e case, a read-only data scan, or a device screenshot.
Shipped ≠ verified.)

- [x] `getComputedStyle(shellContainer).boxSizing === 'border-box'`; computed margin-right is `0`, not `−32px`. — e2e _"the box-model reset is in effect"_ + _"gutters are symmetric"_ (asserts `marginRight === '0px'`), 4 viewports.
- [x] At 390px: search row, filter button, results counter, detail-page value column, CTA buttons, and recents carousel are fully inside the viewport with symmetric gutters. — e2e overflow sweep (no element escapes) + gutter symmetry ≤1px; filter button and "477 esmeraldas" confirmed on iPhone.
- [x] `document.body` has zero margin in browser-tab mode (not just standalone). — e2e asserts `bodyMargin === '0px'`, `bodyX === 0`, `bodyWidth === innerWidth`, running in a real browser tab.
- [x] Regression pass on **desktop widths** — added 2026-07-30: a
      `desktop regression @ 1280×800` block asserting the box-model reset holds
      and `/treasure` + `/product/401` have no horizontal overflow there.
      Negative-tested. (Was unticked in v1.4: the suite genuinely had no
      desktop viewport, contrary to what v1.3 claimed.)
- [x] No double-application breakage of the `[data-foto-admin]` rules —
      e2e _"the foto-admin box-sizing patch survives the global reset"_.
      ⓘ **The first version of this test was vacuous and was rewritten.** It
      asserted `min-width: 0px` on a plain block child — but that is the CSS
      _initial_ value, so it passed with the scoped rule deleted. `min-width:
auto` only bites on **grid/flex items**, which is precisely the case the
      rule's own comment describes ("width:100% + padding overflows the grid
      cell"). The fixture now places the fields in a 120px `1fr` grid track —
      `minmax(auto, 1fr)` floored by an `<input>`'s ~20-character intrinsic
      min-content, the same mechanism as P0.6 one layer down. Deleting the rule
      now fails the test with `Expected "0px" / Received "auto"`.
      ⓘ Worth knowing: the global reset made the rule's `box-sizing` half
      **redundant** — inputs inherit `border-box` anyway. Its load-bearing
      remainder is `min-width: 0`. "Double application" is harmless because
      both declare the same value.
- [ ] The **real** `/admin/fotosintesis` route is not swept — **and will not be
      under this spec (decided 2026-07-30).** It cannot be driven under
      `VITE_TEST_MODE`: `CopilotPanel.tsx:43` imports `useQuery` straight from
      `convex/react` instead of `convex-safe` (which `vite.config.ts` aliases to
      the in-memory stub), so the page fires a live
      `fotosintesisAi:workspaceSnapshot` query, the server errors, and the error
      boundary replaces the whole layout before `[data-foto-admin]` mounts.
      Routing that import through `convex-safe` would unlock it, but Copilot is
      out of scope here — this is a mobile-UX remediation spec, and that change
      belongs to whoever owns Fotosíntesis. **Not queued. Do not treat this box
      as pending work.** The CSS contract it would have covered is already
      verified by the fixture-based case above.

  The last bullet was four claims in one box. Split, so each can be true or false on its own:

- [x] Real iPhone Safari (390px), **browser tab** — PR #71 preview screenshots, light and dark.
- [ ] Real iPhone Safari, **installed PWA (standalone)**. ⚠️ Not a formality: RC-B's entire history is that the `body` rules differ between tab and standalone (`margin: 0` lived _only_ inside the standalone media query). "Works in a Safari tab" does not transfer here — this is the mode the original bug hid in.
- [ ] Android Chrome (~412px), browser tab **and** installed PWA.
- [ ] iOS long-press guard — no "Save Image" sheet on a product photo. Unobservable from any test runner: Chromium strips `-webkit-touch-callout` at parse time.

**P0.2 — Menú sheet renders on-screen** (`74a458c`)
Fix bottom-sheet anchoring for short viewports; ensure a single instance mounts.
_AC — the original was four claims in one sentence; split:_

- [x] Anchored to the bottom edge, no scrim band beneath it — e2e _"the menu sheet never exposes the scrim at the bottom edge"_, 4 viewports, negative-tested.
- [x] "Exactly one sheet element in the DOM" — **satisfied by refutation**: the supposed duplicate was `IOSSettingsSheet` parked at `translateY(100%)` with `visibility: hidden`. There was never a double mount, so there was nothing to fix.
- [ ] Sheet header visible at ≥ 320×568. Not asserted; the suite's smallest viewport is 360×800, so 320-wide is untested.
- [ ] Content scrolls internally. Not asserted.
- [x] _(beyond AC)_ Closes on Escape — e2e _"the menu sheet closes on Escape"_.

**P0.3 — Ubicación/price data fix** (`3af7f0e`, `55b61f7`, `9648324`)
Correct the column/field mapping (Sheets→Convex or API layer) so `ubicacion` never carries the price; add a UI guard hiding any `SpecRow` whose value is empty/undefined.
_AC:_

- [x] No client-facing route renders a raw price in a non-price field — the positional fallback `getByIndex(12)` that returned a price is gone; read-only scans of all three books find **zero** price-shaped values in `ubicación` (domain is ASESOR · OFI.CALI · OFI.BOGOTA · EMBAJADOR · RETORNADO).
- [x] `Asesor` / `Fecha de Ingreso` rows absent when valueless — `SpecRow` empty guard shipped.
- [ ] `/product/415` shows a real location or no row. **Unverifiable as written:** item 415 does not exist in the legacy book, which is what production actually reads. The claim is covered in general by the first box.
- ⓘ Independent corroboration from the Fotosíntesis stream (2026-07-30): 136 Convex rows carried a numeric `ubicacion`; after their pull, 0. Same defect seen from the other end of the pipeline.

**P0.4 — Typography floor** (`32b4022`)
Raise `fontSize: 9` (three occurrences in `src/components/treasure/GridCard.tsx:262,285,308`) and 10px meta text to ≥ 11px (align with DS3 caption tokens).
_AC:_

- [x] No persistent text below 11px on the **catalog** — e2e _"no persistent text renders below the 11px floor"_, 4 viewports.
- [x] Card layout does not wrap/overflow at 360px after the change — e2e overflow sweep at 360.
- [ ] …on **detail**. The 11px sweep navigates to `/treasure` only; `/product/:id` is not swept for text size.

**P0.5 — Tap targets ≥ 44px** (`32b4022`)
Filter (38px), recents (38px), clear-search (36px), fullscreen (32px), "Cerrar aviso" (26px) get ≥44px hit areas (padding/hit-slop, not necessarily larger icons).
_AC:_

- [x] Catalog controls have an effective hit area ≥ 44×44 — e2e _"catalog controls have a 44px tap area"_ via `getBoundingClientRect` sweep, 4 viewports.
- [ ] "Every interactive element on the audited surfaces" — the sweep covers `/treasure`; detail, sheets and the recents panel are not swept.

**P0.6 — Embajadores catalog overflow (added v1.2 · ✅ SHIPPED & device-verified v1.3)**
Verified on iPhone at 402px: long prices (`$ 1.718.495`, `$ 1.950.269`) fully
inside the card via `minmax(0, 1fr)`; custody/role values no longer render in
the ubicación slot. Note: the `L:`-prefixed lot codes were a _contributing
cause_ of this overflow (long unbreakable names), which raises P1.9 from
cosmetic to preventive.
**Root cause (measured; supersedes the v1.2 guess struck below).**
`CategoryDetailView`'s grid used bare `1fr` tracks. `1fr` is `minmax(auto, 1fr)`,
and the `auto` minimum floors the track at the item's **min-content** width —
which, because `ProductListCard`'s title is `white-space: nowrap`, is the _full
untruncated_ name. At 390px: 20 padding + 64 thumb + 12 gap + ~250 title + 12
gap + ~97 price = a **455.3px card inside a 358px container**. `<main>` pins
`overflow-x: hidden` (`IOSLayout.tsx:444`), so the excess was clipped in silence
while `documentElement.scrollWidth` stayed equal to `innerWidth` throughout.
Fix: `minmax(0, 1fr)`. `ProductListCard`'s internals were never at fault and are
unchanged.

> **Struck — v1.2 guessed three mechanisms, all wrong.**
> ~~the defect is in the route's own container (full-width scope, exempt from
> the shell fix)~~ — `isFullWidthScope` covers only fotosíntesis, atelier,
> bóveda and esmereogénesis; `/ambassadors/*` always had the `--maxw` container.
> ~~the treasures-FAB counter clips~~ — `ViewAllTreasuresFAB` has no counter and
> does not mount on this view. ~~the ambassadors data path needs the
> layout-aware column read~~ — the `ubicacion` data was correct; it is a
> custody field that simply must not be shown to clients.
> _Acceptance criteria:_

- [x] At 360–430px, every `ProductListCard` **including its price** renders
      fully inside the viewport — e2e on `/ambassadors/:slug/c/joyas`, 4
      viewports, negative-tested; confirmed on iPhone at 402px with
      `$ 1.718.495` and `$ 1.950.269` intact.
      ⓘ AC corrected: the assertion is `mainScrollWidth <= mainClientWidth`,
      **not** `scrollWidth === innerWidth` — the latter is blind to this whole
      class of bug because `<main>` clips rather than scrolls. The
      `ViewAllTreasuresFAB` clause is dropped: it never mounts on this view.
- [x] The list row's secondary line never shows role values ("EMBAJADOR",
      "ASESOR") in the ubicación slot — e2e _"the ambassador catalog never
      leaks the custody field"_; field removed from the client-facing card.
- [x] Embajadores category list added to the e2e viewport sweep (the sweep only
      protects surfaces it visits — this screen proved that). Routes now live in
      a named list; the product-detail route was added alongside.
- [x] _(added v1.3)_ The detail view's **Origen** shows the mine, not custody —
      it read `ubicacion` and told clients "Origen: OFI.CALI". Now reads
      `procedencia`. e2e _"the ambassador detail shows the MINE as Origen"_.

### P1 — Should-Have (trust & usability)

**P1.1 — Color facet integrity (RC-C)**
Extend `COLOR_MAP` with the live taxonomy (`Verde`, `Aguamarina`, `Azul`, …); move `Chivor` (origin) and `Cristal`/`Intenso` (quality) to their proper facets or into a curated mapping table.
_AC:_ Every color chip renders a non-gray, visually distinct dot; unknown values log a warning in dev instead of silently graying out.

**P1.2 — Quality/chip-row curation (RC-D) — scan DONE; now blocked on a 16-row ruling**
Give the raw-values chip row a section label plus a normalization layer.

**The scan is no longer the blocker — it ran (2026-07-30, read-only, all three
books) and settled the shape.** The casing split runs through every book and
every derived category — 619 rows across 7 collision groups, with legacy holding
both spellings _inside the same book_ (`Comercial Fina` ×72 beside
`COMERCIAL FINA` ×25). So this is inconsistent data entry, not a migration
artifact: **P1.2 ships an app-side normalization layer AND source cleanup
becomes its own task.** Both branches, not either.

The layer must be an **explicit alias table**, never an algorithm. Case-fold +
word-sort was the proposed mechanism and it fails in both directions: it
_under_-collapses compounding (`Comercial Superfina` vs `COMERCIAL SÚPER FINA`,
37 rows) and abbreviation (`C. Super Fina`, `C. Estándar`), while
_over_-collapsing `FINA COMERCIAL` into `COMERCIAL FINA` — see below.

Scope of the alias table: 4 casing collapses · 3 compounding/abbreviation
entries · 5 off-ladder values to map-or-hide (`Extrafina` 8, `Variada` 6,
`Tierra Madre` 2, `1/6` 2) · and `Plata - comercial` (28) moved out of the
quality facet entirely — it is a **material**, not a grade.

**REMAINING BLOCKER — a business ruling on 10 rows.** Is `FINA COMERCIAL` a
distinct grade or a misspelling of `COMERCIAL FINA`? The only artifact that ever
called them distinct was SOT v3's `Calidades` tab, whose factor column was
deliberately deleted on 2026-07-30 once it was proven unwired (see OQ-2).

_(Correction: earlier notes said "16 rows". That pooled the three books and
double-counted the same stones — items 323, 324, 339, 376, 377 and 442 each
appear in more than one. In SOT v3 it is **10 rows**.)_

**What the data says (read-only, SOT v3, 2026-07-30) — leans misspelling, does
not prove it:**

|                     | FINA COMERCIAL      | COMERCIAL FINA    |
| ------------------- | ------------------- | ----------------- |
| rows                | 10                  | 114               |
| costo/ct median     | **321.782**         | **415.597**       |
| costo/ct p25–p75    | 122.727 – 1.600.011 | 166.143 – 594.884 |
| ct per unit, median | 4,4                 | 0,7               |
| lots (`cant > 1`)   | 7 of 10 (70%)       | 35 of 114 (31%)   |

The deleted table rated `FINA COMERCIAL` 0.45 against `COMERCIAL FINA`'s 0.30,
so a real grade distinction should show ~50% **higher** cost per carat.
Observed is the opposite — a lower median inside an overlapping range. Nobody
ever priced these as a superior grade. What actually separates them is _shape_,
not quality: disproportionately lots, ~6× larger per unit, and four named
`Baguette`/`lote de gemas` — a bulk-parcel entry context.

**Caveat that keeps this a lean and not a verdict:** only 6 of the 10 rows carry
both a cost and a weight. And the two tests that would have settled it are
impossible — `fecha ingreso` is **empty on every one of these rows**, and
`proveedor` is empty throughout (`asesor` is set on only 4, all
`Isa la Negra Vikinga Warrior Portocarrero`). So a "single data-entry session"
cannot be confirmed or ruled out from the books.

_AC:_

- [ ] No unlabeled chip section in the filter sheet.
- [ ] No two chips differing **only by casing** render as separate filters.
      Casing-only is safe unconditionally.

  > ⛔ **Implementer: do not extend this to word order.** The v1.2 wording read
  > "casing **or word order**", which sounds harmless and is not: word-sort
  > collapses `FINA COMERCIAL` into `COMERCIAL FINA` automatically, and that is
  > precisely what the evidence now leans **against**. The shape signal — 70%
  > lots vs 31%, ~6× larger per unit, four rows named `Baguette` / `lote de
gemas` — suggests two real populations wearing transposed names, not one
  > name misspelled. Shipping the collapse in good faith would silently fuse
  > them with no way to tell afterwards which rows were which.
  >
  > Until Kevin rules, `FINA COMERCIAL` stays an **explicit exception**: never
  > auto-merged, rendered as its own chip. The ruling is no longer a research
  > blocker — it is a 30-second call with the distribution table above in view —
  > but it must happen _before_ any merge logic ships, not after.

- [ ] `Plata - comercial` no longer appears in the quality facet.
- [ ] Unknown values log a dev warning instead of rendering raw.

**P1.3 — Scroll restoration on back**
Catalog → product → back restores the virtual-grid offset (wire `ScrollRestoration.tsx` to `VirtualGrid`'s scroller — measured restore was `scrollY≈51`, i.e. top).
_AC:_ Given a user 200+ items deep, when they open a product and navigate back, then the previously visible row is on screen within 1 viewport-height of tolerance.

**P1.4 — Card semantics & a11y**
Product cards become real links (`<a>`/router `Link` wrapping the `<article>`), keyboard-focusable with visible focus.
_AC:_ Cards are tabbable, Enter opens detail, long-press/right-click offers "copy link", and each card exposes an accessible name (product title).

**P1.5 — Copy & metadata consistency**
Fix "Agregar a Seleccion" → "Agregar a Selección" (`ProductActions.tsx:78`); unify search placeholder ("Buscar esmeraldas…") with its aria-label ("Buscar productos"); subtitle "ESMERALDAS DE COLOMBIA" becomes type-aware when results include jewelry; apply the `0.00 ct` guard on every card path; hide bare/cryptic material values (`6`).
_AC:_ Copy review passes on catalog + detail + sheets; no `0.00 ct` anywhere; no accent-less CTA labels.

**P1.6 — Sheet-open layout shift**
Opening filter/recents/menú sheets must not shift the background page (scrollbar compensation).
_AC:_ Background pixels do not move when any sheet opens/closes (desktop with scrollbars and mobile).

**P1.7 — "Limpiar" contrast**
Raise the filter sheet's Limpiar action to ≥ 4.5:1 contrast.
_AC:_ Passes WCAG AA against its actual background in dark and light themes.

**P1.8 — Tab-bar label fit (added v1.2)**
"EMBAJADORES" truncates to "EMBAJADO…" at 390px. Shorten the label (e.g.
"Socios" / "Aliados" — copy decision), or tighten letter-spacing/size so all
four labels fit at 360px without truncation.
_AC:_ No truncated label in the tab bar at 360–430px in es/pt locales.

**P1.9 — Client-facing name & casing hygiene (added v1.2)**
Strip the internal lot prefix (`L:II-JA `, `L:A-104 `) from display names in
client-visible views — keep it as a secondary SKU line or admin-only detail.
Normalize quality-ladder casing ("Plata - comercial" → Title Case). Remove the
redundant second back control on the Galería/Ficha detail header.
_AC:_ No `L:`-prefixed display name in ambassador/client views; one back
affordance per screen; ladder labels share one casing.

### P2 — Future Considerations

- **Collapse-on-scroll header**: title row condenses after scroll so ≥ 72% of viewport shows products (currently ~28% is chrome before the tab bar).
- **`scrollbar-gutter: stable`** on the main scroller for desktop polish.
- **Inventory data hygiene initiative**: normalize casing, taxonomy (F2 vs C. SUPERIOR vs C. ESTÁNDAR), and remove SKUs from display names at the source; this spec's UI guards are the stopgap.
- **Currency labeling**: display `COP` (and the CurrencyContext multiplier state) explicitly next to prices — pricing-sensitive, needs product owner sign-off first.

---

## 7. Success Metrics

**Leading (verify at release, then weekly ×4):**

- Horizontal-overflow check: `scrollWidth === innerWidth` on 6 audited routes at 360/390/412/430px → **0 failures** (automatable as a Playwright viewport sweep in `npm run test:e2e`).
- Gutter symmetry ≤ 1px; tap-target sweep ≥ 44px → **0 violations**.
- Lighthouse a11y score on `/treasure` mobile: **≥ 95** (baseline: run pre-fix for comparison).

**Lagging (30–60 days):**

- Ambassador-reported layout complaints (WhatsApp/feedback channel): **zero new reports** after release.
- Product-detail views per session from mobile (existing `product-views` tracking): expect **+10%** as clipped filter/search become reliably usable — treat as directional, not a hard target.

---

## 8. Open Questions

1. **(Data/owner)** Is the `ubicacion` = price leak a one-off row error in Sheets or a systematic column shift? Blocking for P0.3 — needs a scan across the inventory table.
2. **(Data → Product)** Which quality values are real grades vs. noise? **v1.2 claimed this was answered by the Embajadores "ladder" — retracted in v1.3** (the Gemas category exposes a different value set; chips are per-category data uniques, not a curated taxonomy). **Scan COMPLETE (2026-07-30, read-only, all three books) — answered, except one ruling.**
   - **The taxonomy is not curated anywhere in the app.** 25 / 14 / 19 distinct values per book; the casing split spans all three and both spellings coexist _inside_ legacy (`Comercial Fina` ×72 beside `COMERCIAL FINA` ×25). 619 rows across 7 collision groups. → P1.2 ships a normalization layer **and** source cleanup becomes its own task.
   - **The `5, 6, 7, 8` premise was wrong.** Zero bare `5–8` exist in `calidad` in any book. They live in `Cant.`, `Talla`, and (SOT v3 only) `nivelRareza` / `calificacion`. Only `1/6` (2 rows) is genuine junk in `calidad`. ⚠️ Which means §2 RC-D's chip row `5 6 7 8 1/6 COMERCIAL…` was reading a field mixture **not yet identified** — one unresolved thread, worth a grep of the filter's chip source.
   - **`SOT v3 → Calidades` is not a source of truth.** It declared 19 grades with price factors, but nothing read it: 0 code references, 0 formulas in Inventario (of 665 formula cells), 0 of 11.307 data-validation rules, 0 named ranges, 0 cross-tab formulas. Live pricing is a flat `costoBaseCOP × 2.6` for **every** grade — verified numerically across two different grades. The tab even contradicted production on its own markup (declared 3, live 2.6). **Its `Factor precio` column and `Markup base` row were deleted on 2026-07-30**; the 19 grade names remain as vocabulary. `scripts/auto-fill-factor-calidad.mjs`, the last artifact able to resurrect grade-based pricing (with a _third_, conflicting factor set), was deleted the same day.
   - **Still open:** the `FINA COMERCIAL` (10 rows) vs `COMERCIAL FINA` ruling — see P1.2. Business call; the data leans misspelling but cannot prove it.

3. **(Product)** Should `Chivor` become an "Origen" facet (it's a mine/origin, and a selling point)? Non-blocking.
4. **(Engineering)** Does mounting full `<CssBaseline />` cause regressions in Esmereogenesis/Fotosíntesis themes that assumed content-box quirks (cf. the `[data-foto-admin]` patch)? Decide CssBaseline vs. minimal CSS reset during implementation; the minimal reset is the lower-risk default.
5. **(Design)** DS3 token for the new ≥11px caption size — reuse an existing `ios-typography` step or add one?

## 9. Timeline / Phasing

- **Phase 1 (P0, ~1 short sprint):** P0.1 first — it is one mount/three CSS lines and visually fixes the majority of reported damage — then P0.2–P0.5. Ship behind the normal `main` auto-deploy with the Playwright viewport sweep added in the same PR.
- **Phase 2 (P1, next sprint):** taxonomy + a11y + restoration items; P1.1/P1.2 depend on answers to OQ-2/OQ-3.
- **Phase 3 (P2):** schedule with the DS3 convergence track.
- **Dependency note:** none of this blocks, or is blocked by, the Sheets→Convex migration — but P0.3's mapping fix should land wherever the detail endpoint currently reads (check per-endpoint, per `CLAUDE.md`).

---

_Testing caveat: audit performed at 500px (Chrome minimum window width). All measurements re-verify at 360–430px on device before sign-off — overflow magnitudes will be larger there, never smaller._
