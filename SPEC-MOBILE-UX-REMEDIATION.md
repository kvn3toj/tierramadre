# Spec: Mobile UX/UI Remediation — Treasure Catalog & Product Detail

**Version:** 1.1 · **Date:** 2026-07-30 · **Author:** UX audit (Claude) + Kevin
**Surfaces:** `/treasure`, `/product/:id`, filter sheet, recents panel, Menú sheet
**Status:** P0 shipped (PR #71) — see Status section below. Sections 1-9 are the
original audit, preserved as written; several of its claims were disproven
during implementation and are corrected in the Status section.

---

## Status — P0 COMPLETE (2026-07-30)

Shipped on `fix/mobile-box-model-reset` (PR #71). Verified on the **production
build** at 360/390/430: `box-sizing: border-box`, `body { margin: 0 }`,
container `margin-right` **−32px → 0px**, `scrollWidth === innerWidth`, zero
sub-11px text nodes, zero unprotected images.

| Item | Status | Commit |
|---|---|---|
| P0.1 Global baseline | ✅ shipped as a **plain CSS reset**, NOT `<CssBaseline />` | `ac36c9d` |
| P0.2 Menú sheet | ✅ real defect was a transient overshoot, not `-199px` | `74a458c` |
| P0.3 Ubicación/price | ✅ root cause found: cross-layout column collision | `3af7f0e` |
| P0.4 Typography floor | ✅ | `32b4022` |
| P0.5 Tap targets | ✅ | `32b4022` |
| — Data guards (`0.00 ct`, SpecRow) | ✅ | `55b61f7`, `9648324` |
| — Image save protection (not in this spec) | ✅ | `b1a697f` |

Regression coverage went from 0 to **40 e2e cases** (10 checks × 4 viewports).
Every assertion was negative-tested: reverting its fix makes it fail.

### Claims in this document that turned out to be WRONG

1. **§6 P0.1 "the theme is already prepared at `src/theme.ts:272`" — false, twice.**
   `src/theme.ts` is dead code (nothing imports `theme`), and mounting
   `<CssBaseline />` was the *riskiest* option, not the safest: there is no
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

- **Real-device pass** (the only unverified surface): `IOSNavigationBar`'s
  `minHeight` under a genuine `env(safe-area-inset-top)`, and the iOS
  long-press guard — Chromium strips `-webkit-touch-callout` at parse time, so
  it is unobservable from the test runner by any means.
- **P1** untouched. OQ-2 (which raw quality values are real grades) and OQ-3
  (Chivor as an Origen facet) remain product decisions.

---

## 1. Problem Statement

On mobile, the Treasure catalog — the core selling surface of the app — renders with a visibly broken layout: the product grid and toolbar sit ~40px from the left edge while clipping off the right edge, the filter button is half cut off, and text is truncated at the viewport edge. Ambassadors demo this catalog to clients from their phones, so every one of these defects is visible during a sale. Two one-line CSS root causes account for the majority of the visible damage; the rest are localized component, data-taxonomy, and accessibility defects documented below.

**Audit method:** Live drive of https://tierramadre.app/treasure in Chrome at 500×701 (Chrome's minimum window width; the production issues are *worse* at real phone widths of 360–430px because the fixed overflow is proportionally larger), with DOM/computed-style inspection, plus source tracing in the repo.

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
html { box-sizing: border-box; }
*, *::before, *::after { box-sizing: inherit; }
body { margin: 0; }
```

*Acceptance criteria:*
- [ ] `getComputedStyle(shellContainer).boxSizing === 'border-box'`; computed margin-right is `0`, not `−32px`.
- [ ] At 390px: search row, filter button, results counter, detail-page value column, CTA buttons, and recents carousel are fully inside the viewport with symmetric gutters.
- [ ] `document.body` has zero margin in browser-tab mode (not just standalone).
- [ ] Regression pass on desktop widths and on Fotosíntesis admin (which self-patched box-sizing): no double-application breakage of `[data-foto-admin]` rules.
- [ ] Verify on real iPhone Safari (390px) and Android Chrome (~412px), browser tab **and** installed PWA.

**P0.2 — Menú sheet renders on-screen**
Fix bottom-sheet anchoring for short viewports; ensure a single instance mounts.
*AC:* Given any viewport ≥ 320×568, when MENÚ opens, then the sheet header is visible, the sheet is anchored to the bottom edge, content scrolls internally, and exactly one sheet element exists in the DOM.

**P0.3 — Ubicación/price data fix**
Correct the column/field mapping (Sheets→Convex or API layer) so `ubicacion` never carries the price; add a UI guard hiding any `SpecRow` whose value is empty/undefined.
*AC:* `/product/415` shows a real location or no row; `Asesor`/`Fecha de Ingreso` rows absent when valueless; no client-facing route renders a raw price in a non-price field.

**P0.4 — Typography floor**
Raise `fontSize: 9` (three occurrences in `src/components/treasure/GridCard.tsx:262,285,308`) and 10px meta text to ≥ 11px (align with DS3 caption tokens).
*AC:* No persistent text below 11px computed size on catalog or detail; card layout does not wrap/overflow at 360px after the change.

**P0.5 — Tap targets ≥ 44px**
Filter (38px), recents (38px), clear-search (36px), fullscreen (32px), "Cerrar aviso" (26px) get ≥44px hit areas (padding/hit-slop, not necessarily larger icons).
*AC:* Every interactive element on the audited surfaces has an effective hit area ≥ 44×44px, verified via `getBoundingClientRect` sweep.

### P1 — Should-Have (trust & usability)

**P1.1 — Color facet integrity (RC-C)**
Extend `COLOR_MAP` with the live taxonomy (`Verde`, `Aguamarina`, `Azul`, …); move `Chivor` (origin) and `Cristal`/`Intenso` (quality) to their proper facets or into a curated mapping table.
*AC:* Every color chip renders a non-gray, visually distinct dot; unknown values log a warning in dev instead of silently graying out.

**P1.2 — Quality/chip-row curation (RC-D)**
Give the raw-values chip row a section label; whitelist/normalize values (drop `5,6,7,8,1/6` or map to labeled grades); add the existing `ScrollFadeEdges` affordance to every horizontally scrollable chip row (Categoría row currently hard-clips).
*AC:* No unlabeled chip section in the filter sheet; scrollable rows show a fade/peek cue at the clipped edge.

**P1.3 — Scroll restoration on back**
Catalog → product → back restores the virtual-grid offset (wire `ScrollRestoration.tsx` to `VirtualGrid`'s scroller — measured restore was `scrollY≈51`, i.e. top).
*AC:* Given a user 200+ items deep, when they open a product and navigate back, then the previously visible row is on screen within 1 viewport-height of tolerance.

**P1.4 — Card semantics & a11y**
Product cards become real links (`<a>`/router `Link` wrapping the `<article>`), keyboard-focusable with visible focus.
*AC:* Cards are tabbable, Enter opens detail, long-press/right-click offers "copy link", and each card exposes an accessible name (product title).

**P1.5 — Copy & metadata consistency**
Fix "Agregar a Seleccion" → "Agregar a Selección" (`ProductActions.tsx:78`); unify search placeholder ("Buscar esmeraldas…") with its aria-label ("Buscar productos"); subtitle "ESMERALDAS DE COLOMBIA" becomes type-aware when results include jewelry; apply the `0.00 ct` guard on every card path; hide bare/cryptic material values (`6`).
*AC:* Copy review passes on catalog + detail + sheets; no `0.00 ct` anywhere; no accent-less CTA labels.

**P1.6 — Sheet-open layout shift**
Opening filter/recents/menú sheets must not shift the background page (scrollbar compensation).
*AC:* Background pixels do not move when any sheet opens/closes (desktop with scrollbars and mobile).

**P1.7 — "Limpiar" contrast**
Raise the filter sheet's Limpiar action to ≥ 4.5:1 contrast.
*AC:* Passes WCAG AA against its actual background in dark and light themes.

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
2. **(Product)** Which of the raw quality values (`5, 6, 7, 8, 1/6, COMERCIAL…`) are real grades to keep vs. data noise to hide? Needed for P1.2.
3. **(Product)** Should `Chivor` become an "Origen" facet (it's a mine/origin, and a selling point)? Non-blocking.
4. **(Engineering)** Does mounting full `<CssBaseline />` cause regressions in Esmereogenesis/Fotosíntesis themes that assumed content-box quirks (cf. the `[data-foto-admin]` patch)? Decide CssBaseline vs. minimal CSS reset during implementation; the minimal reset is the lower-risk default.
5. **(Design)** DS3 token for the new ≥11px caption size — reuse an existing `ios-typography` step or add one?

## 9. Timeline / Phasing

- **Phase 1 (P0, ~1 short sprint):** P0.1 first — it is one mount/three CSS lines and visually fixes the majority of reported damage — then P0.2–P0.5. Ship behind the normal `main` auto-deploy with the Playwright viewport sweep added in the same PR.
- **Phase 2 (P1, next sprint):** taxonomy + a11y + restoration items; P1.1/P1.2 depend on answers to OQ-2/OQ-3.
- **Phase 3 (P2):** schedule with the DS3 convergence track.
- **Dependency note:** none of this blocks, or is blocked by, the Sheets→Convex migration — but P0.3's mapping fix should land wherever the detail endpoint currently reads (check per-endpoint, per `CLAUDE.md`).

---

*Testing caveat: audit performed at 500px (Chrome minimum window width). All measurements re-verify at 360–430px on device before sign-off — overflow magnitudes will be larger there, never smaller.*
