# Tierra Madre — Design System v3 "Quiet Emerald"

**Foundations, Navigation Architecture & UX Heuristics**
Version 3.0 · 2026-07-17 · Supersedes `DESIGN-SYSTEM.md` (v1 "Emerald iOS") as the product-wide source of truth.

> **La vitrina.** Every screen is a museum vitrine: the emerald is the only
> saturated thing in view, resting in a quiet neutral well. Chrome whispers;
> the stone speaks. Every rule below exists to protect that moment.

---

## 0. Intent

**Who:** An asesor on an iPhone in front of a client, showing stones and building a quotation in seconds — and the Tierra Madre team on desktop running inventory, analytics and fulfillment. Both need the interface to disappear.

**What they must do:** Find a stone → show it beautifully → quote it → follow up. Everything else is supporting cast.

**How it must feel:** *Una joya en calma.* Gallery-quiet, editorially confident, never busy. Calm is a feature: no flicker, no scroll fights, no layout jumps, no color noise.

### The one decision that fixes everything else

The codebase currently carries **five visual languages** (Emerald iOS v1, Quiet Emerald v2, Atelier, Foto, Vault Cinema) plus a legacy-compat layer, ~1,022 hardcoded values bypassing tokens, and duplicate/orphan components (three button implementations, four card implementations, several bottom bars). v3's founding rule ends this:

### ONE system. Theme is data, not a fork.

**There is exactly one DS3 component set.** Every page, tool, sheet, and modal renders from it. A screen may not hand-roll a button, a card, a sheet, a tab bar, a field. "Quiet Emerald", "Foto", and "Atelier" are **theme presets** — token objects (`getQuietEmerald`, `getFoto`, `getAtelier`) passed *into* the same components — never separate component libraries. The unified `TabBar` proves the pattern: one component, two theme adapters (storefront + Foto), zero forks. That pattern is now law for every component (see the [Unified Component System addendum](DESIGN-SYSTEM-V3-ADDENDUM.md)).

1. **Quiet Emerald is the default theme** for all client + provider surfaces. Foto themes `/admin/fotosintesis/*`; Atelier themes `/admin/products*`. All three drive the *same* components.
2. **No orphans.** Every duplicate component (IOSButton/DS Button/atelier button → **Button**; IOSCard/GlassCard/Card → **Card**; the two bottom bars → **TabBar**; every ad-hoc sheet → **Sheet**) collapses to one canonical component. The addendum's consolidation map is the schedule.
3. **No hardcoding.** No hex, rgba, px-spacing, z-index integer, or inline `box-shadow` in any page/tool/modal — everything is a token or a component prop. Lint enforces (§11).
4. **v1 "Emerald iOS" is deprecated on sight:** silver metallics, emerald gradients on buttons, glass cards as default surface, `#00AE7A` as a text/link color, spring-bounce in product UI, SF Pro as brand voice.
5. **Vault Cinema** is the one sanctioned exception — an isolated cinematic scope (`/boveda-secreta`) that may break these rules deliberately. It still consumes DS3 components where it can.

---

## 1. Color Foundations

### 1.1 The rule

**One saturated color in the entire product: the emerald.** Everything else is a cool, green-tinted grayscale. If a screen contains a second saturated hue, it is either a semantic status color doing real work, or a bug.

### 1.2 Token map (authoritative — from `tokens/quiet-emerald.ts`)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--tm-bg` | `#F7F8F8` | `#0E1110` | App background (the gallery wall) |
| `--tm-surface` | `#FFFFFF` | `#15191A` | Card / raised surface |
| `--tm-well` | `#F1F2F2` | `#1B1F1F` | Image well behind a piece — the vitrine floor |
| `--tm-border` | `#E4E7E5` | `#272C2B` | 1px component borders |
| `--tm-hairline` | `#EBEDEC` | `#222726` | 1px row dividers / section rules |
| `--tm-text` | `#14181A` | `#EAEDEB` | Primary text |
| `--tm-muted` | `#5C6360` | `#9AA09D` | Secondary text |
| `--tm-subtle` | `#8C928F` | `#6B726F` | Captions, placeholders, mono labels |
| `--tm-accent` | `#00785C` | `#34C99B` | Emerald: links, labels, active state |
| `--tm-accent-strong` | `#006F52` | `#00AF84` | Emerald: primary button fill (AA on `--tm-on-accent`) |
| `--tm-accent-pure` | `#00AF84` | `#34C99B` | Brightest emerald: dots, trust indicators ONLY |
| `--tm-on-accent` | `#FFFFFF` | `#06140E` | Text/icon on accent-strong |
| `--tm-danger` | `#B3403A` | `#E5736C` | Destructive / error (desaturated in dark) |
| `--tm-warning` | `#8A5F1B` | `#D9A94E` | Warning (earth-toned, never orange neon) |
| `--tm-success` | `--tm-accent` | `--tm-accent` | Success IS the emerald — no second green |

### 1.3 Usage heuristics

- **Text hierarchy uses all four levels** (`text` → `muted` → `subtle` → disabled at 45% of text). A screen using only two levels has flat hierarchy — redesign it.
- **`accent-pure` is jewelry, not paint.** Allowed: live dots, trust badges, the logo, selected-state ticks. Banned: fills, large areas, body text.
- **Emerald never becomes a background** larger than a chip/badge. Large emerald areas compete with the stones.
- **Semantic colors are desaturated in dark mode** and always paired with an icon or label — color is never the only indicator (WCAG 1.4.1).
- **No new hex values in feature code.** Every color traces to a `--tm-*` variable or `getQuietEmerald(mode)`. ESLint enforces (see §11).

### 1.4 Contrast contract (computed & verified 2026-07-17)

| Pair | Ratio | Grade |
|---|---|---|
| text / bg (light) | 16.8:1 | AAA |
| muted / bg (light) | 5.8:1 | AA |
| subtle / bg (light) | 3.0:1 | **below AA — decorative only** |
| accent / bg (light) | 5.1:1 | AA |
| on-accent / accent-strong | 6.2:1 | AA |
| danger / bg (light) | 5.3:1 | AA |
| warning / bg (light) | 5.3:1 | AA |
| text / bg (dark) | 16.1:1 | AAA |
| muted / bg (dark) | 7.1:1 | AAA |
| accent / bg (dark) | 9.0:1 | AAA |

`subtle` sits below AA by design (placeholder/caption texture). Hard rule: it may never carry body copy, interactive labels, or any information required to act — that content belongs to `muted` or above.

---

## 2. Typography

Three families, three jobs. No fourth family in product UI.

| Role | Family | Job |
|---|---|---|
| **Serif** | Cormorant (→ Cormorant Garamond → Georgia) | Editorial display: piece names, page titles, heroes |
| **UI** | Hanken Grotesk (→ system sans) | Everything functional: body, nav, buttons, forms |
| **Mono** | DM Mono (→ SF Mono) | Gemology & data: carats, prices, codes, specs — always `tabular-nums` |

### 2.1 Scale (rem, 16px base)

| Token | Size / line | Family & weight | Use |
|---|---|---|---|
| `display` | clamp(2.25rem–3.5rem) / 1.05 | Serif 500, −0.01em | Page heroes |
| `title-1` | 1.75rem / 1.15 | Serif 500 | Page titles |
| `title-2` | 1.375rem / 1.2 | Serif 500 | Section titles, piece names on cards |
| `headline` | 1.0625rem / 1.3 | UI 600 | Emphasized rows, sheet titles |
| `body` | 1.0625rem / 1.55 | UI 400 | Default copy (≥17px on mobile — never smaller) |
| `callout` | 0.9375rem / 1.5 | UI 400 | Secondary copy |
| `footnote` | 0.8125rem / 1.45 | UI 400 | Metadata |
| `overline` | 0.6875rem / 1.4 | Mono 500, +0.14em, uppercase | Section labels, eyebrows |
| `spec` | 0.6875rem / 1.4 | Mono 400, +0.05em | Gemology lines: `2.34 ct · Muzo · Vivid Green` |
| `data` | inherit / — | Mono 500, tabular-nums | Prices and quantities, any size |

### 2.2 Rules

- Serif is a **display voice, never a paragraph voice**. If it wraps past 3 lines, it should have been `body`.
- Prices/carats always `data` (mono, tabular) so columns and tickers never jitter.
- Line length ≤ 70ch; body line-height 1.5–1.6.
- PDF/certificates keep their own document serif set (Cormorant + Playfair) — documents are not product UI.

---

## 3. Space, Shape, Depth

### 3.1 Spacing — 4px base, 8pt rhythm

`4 · 8 · 12 · 16 (standard padding) · 20 · 24 · 32 · 48 · 64`
Edge padding: 16px phone · 24px tablet · 32px desktop. No off-scale values in feature code.

### 3.2 Radius

`5px` image wells & thumbnails · `8px` inputs/buttons · `12px` cards · `18px` sheets & modals · `999px` pills. Small elements never get large radii.

### 3.3 Depth strategy: **borders-first** (the v3 depth decision)

- Structure comes from `--tm-border` / `--tm-hairline` and *surface steps* (`bg → surface → well`), not from shadows.
- **One editorial shadow exists** — `--tm-shadow` (`0 18px 40px -24px rgba(13,30,24,0.30)`) — reserved for true floating layers: sheets, popovers, drag previews, the lightbox. Cards at rest have **no shadow**.
- Glass (`backdrop-filter`) is demoted to exactly two places: the top nav bar and the tab bar, at high opacity (≥ 0.85 light / 0.75 dark) so text always passes AA. Glass cards as content surfaces are deprecated.
- Inputs sit **inset**: `--tm-well` background, `--tm-border` border — "type here" without heavy chrome.
- Dark mode leans harder on borders; the shadow dims to near-invisible by design.

Squint test: blurred, a v3 screen shows hierarchy but not a single loud line.

---

## 4. Motion Language

One system (replaces the dual `primitives/motion.ts` + `tokens/motion.ts` split — see §11).

| Token | Value | Use |
|---|---|---|
| `--tm-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Everything entering/moving (confident decel) |
| `--tm-ease-exit` | `cubic-bezier(0.55, 0, 1, 0.45)` | Elements leaving |
| `--tm-fast` | 160ms | Hover, press, toggles, chips |
| `--tm-base` | 240ms | Dropdowns, accordions, nav transitions |
| `--tm-slow` | 420ms | Sheets, modals, page-level choreography |

### Rules

1. **No spring/bounce in product UI.** Springs live only in Esmereogénesis/Vault cinematic scopes.
2. Animate **only `transform` and `opacity`**. Never width/height/top/left on interactive paths.
3. Hover feedback = color/opacity/hairline change — never scale that shifts layout.
4. **`prefers-reduced-motion` is a hard gate**: transitions collapse to ≤ 0.01ms, scroll-behavior becomes `auto`, cinematics show final frame.
5. **Anti-blinking is motion law** (from `CLAUDE.md`, promoted to foundations): synchronous cache initialization, `aspect-ratio` reserved image space, unique instance keys, gallery preloading, instant image swaps over fades, `#t=0.001` poster hack for iOS video.
6. Every async surface has a skeleton that matches final layout geometry — content may never jump when data lands (CLS ≈ 0).

---

## 5. App Shell & Navigation Architecture

### 5.1 The shell contract (already sound — now law everywhere)

```
body { overflow: hidden }                    ← the page NEVER scrolls
<IOSLayout>
  <NavBar/TopChrome>          (one per route family — never two)
  <main id="main-content">    ← THE one page scroller
  <TabBar / module bar>       (bottom, fixed, reserved via token)
</IOSLayout>
```

- `<main>`'s **measured** height is published as `--app-main-height` (ResizeObserver). All pane heights derive from it via `paneHeight(offset)`. Raw `100vh` is banned; `calc(100vh − N)` is a bug by definition.
- Bottom-fixed elements clear the tab bar via `bottomBarClearance(appShell.tabBarReserve)` — the reserve lives in **one** token, never as a `95px`/`80px` literal.
- Viewport units: `dvh` (with `@supports` `vh` fallback) — the `--vh` JS hack is retired (§5.4 kills its last consumer).
- Right-pinned fixed chrome consumes `--copilot-rail-width`.
- Every `position: fixed` element takes z from the semantic scale (`sticky 500 · fixed 900 · nav 999 · float 1000 · sheet 1100 · panel 1200 · overlay 1400 · toast 2000 · modal 9999`). No integer literals.

### 5.2 Route families & chrome matrix

| Family | Routes | Top chrome | Bottom chrome | Theme |
|---|---|---|---|---|
| **Client** | `/home /treasure /product /grupo /ambassadors /cuentas/* /mi-perfil` | Shell NavBar | Global TabBar | Quiet Emerald |
| **Fotosíntesis** | `/admin/fotosintesis/*` | FotoTopbar (shell nav suppressed) | FotoTabBar | Foto (scoped) |
| **Atelier** | `/admin/products*` | Module topbar | — | Atelier (scoped) |
| **Provider** | `/provider/*` | Shell NavBar | Global TabBar | Quiet Emerald |
| **Cinematic** | `/boveda-secreta /esmereogenesis` | Own | Own | Scoped, exempt |

**One top chrome per route family** — shell nav bar OR module topbar, never both. A new module must register in this matrix before it ships.

### 5.3 Wayfinding rules

1. **Every screen declares itself**: a `PageConfig` entry (title, mode, back affordance). No anonymous screens; the fallback config is a lint error, not a feature.
2. **Back is sacred and predictable**: the back button always pops to the screen the user actually came from (history back), falling back to the family root (`/treasure`, `/admin/fotosintesis`) on deep links. It never reshuffles state, never loses scroll (§6), never exits to a different family unannounced.
3. **Titles follow depth**: `large` nav mode for family roots (editorial serif title), `compact` for descendants. Detail screens title with the *piece name*, not the section name.
4. **Tab bar = places, sheet = actions.** The tab bar navigates between top-level places and never mutates data. Verbs (upload, quote, settings) live in sheets and per-screen actions. The active tab is always visually unambiguous (`accent` icon + label).
5. **Desktop (≥1180px)**: tab bar hides; the same place-structure renders as top navigation + breadcrumbs on ≥2-level admin screens. Same information architecture, different projection — never a second IA.
6. **Deep links always land safely**: every route renders standalone with correct chrome, title, and back-to-root affordance (client shares `/p/:itemId` links constantly).

### 5.4 Scroll foundations (the ten laws)

1. **One scroller per view.** `<main id="main-content">` scrolls; nothing else scrolls unless it is a deliberate nested scroller.
2. **Every nested scroller is contained**: spread `containedScrollY` / `containedScrollX` (`overscroll-behavior: contain` + momentum). Bare `overflow: auto` in feature code is a lint error. Boundary gestures must never chain into `<main>`.
3. **Heights are measured, never guessed.** `paneHeight()` / `--app-main-height` only. **This kills the catalog bug:** `VirtualGrid`'s `HEADER_OFFSET = 280` and `minHeight: 600` are replaced by measuring the grid container's top (`getBoundingClientRect().top` within the already-present ResizeObserver) → `height = mainHeight − top − tabBarReserve`, floored at ~280px. The grid then ends exactly above the tab bar and the catalog collapses back to a single effective scroller — the "two scrollbars fighting" feel dies with it.
4. **Scroll position is memory.** Back/forward restores the *actual scrolled element*'s offset (main, or the virtual grid via `scrollMemory` keyed by route + filters). New forward navigation resets to top. A user returning from a product always lands on the row they left.
5. **Sticky/fixed chrome never eats content**: every sticky header's height is a token consumed by the content below it; last rows always clear bottom bars via `bottomBarClearance`.
6. **Sheets size in `dvh`** (`max-height: 85dvh` + `@supports` fallback), scroll internally with containment, and their last row is always reachable above the home indicator (`env(safe-area-inset-bottom)`).
7. **`scroll-behavior: smooth` lives on `html` only**, gated by reduced-motion. Never on `*`, never on nested scrollers (it fights programmatic restoration).
8. **No `touch-action` on scroll containers.** The global `touch-action: manipulation` on controls is the only touch-action the app sets.
9. **Horizontal scrollers** (spec tables, thumbnail strips) use `containedScrollX` — which also stops the browser back-swipe hijack — and show affordance (peeking item or fade) at both ends.
10. **Scroll performance:** virtualize lists > 50 items; no scroll-linked JS effects on the main thread beyond passive listeners; header shrink effects use `transform` driven by passive scroll observation only.

### 5.5 Overlays & sheets

- One overlay open at a time per layer class; a sheet opening from a sheet replaces, never stacks visually.
- Backdrop: `rgba(20,24,26,0.5)`, click/swipe-down dismisses; focus is trapped and returned to the invoker on close (WCAG 2.4.3).
- Sheets enter with `translateY` at `--tm-slow`/`--tm-ease`, exit at `--tm-base`/`--tm-ease-exit`.
- Destructive actions never live at a sheet's bottom edge (fat-finger zone above the home indicator).

---

## 6. Interaction States & Feedback

### 6.1 The states matrix (every interactive element, no exceptions)

| State | Treatment |
|---|---|
| rest | Token surface, `cursor: pointer` on web |
| hover (desktop only) | Surface step or hairline emphasis, 160ms |
| active/press | Opacity 0.85 or well-darken — never layout-shifting scale |
| focus-visible | 2px `--tm-accent` ring, 2px offset — keyboard-only, never suppressed |
| disabled | 45% opacity + `not-allowed`; still AA-readable as "present but off" |
| loading | Button: inline spinner replaces label, width locked, `disabled` while pending |
| selected | `accent` tick/border — plus a non-color cue (icon/weight) |

### 6.2 Data states (every async view ships all four)

**loading** (geometry-matched skeleton, shimmer ≥ 1.2s cycle) · **empty** (one serif line + one action — an invitation, not an apology) · **error** (plain-language cause + retry, near the failure, never a bare toast) · **content**.

### 6.3 Touch & input

- Touch targets ≥ 44×44px (40px pointer-precision on desktop) with ≥ 8px gaps between adjacent targets.
- Primary per-screen action: exactly one `accent-strong` filled button. Everything else is tinted/plain/outlined.
- Async mutations: optimistic where safe (favorites), confirmed-with-progress where not (quotations, uploads). Every write gives feedback within 100ms — even if it's just the pressed state.
- Toasts confirm, never instruct; anything requiring a decision is a dialog/sheet.

---

## 7. Accessibility Foundations (WCAG 2.2 AA floor)

- Contrast per §1.4; `subtle` never on interactive text.
- Full keyboard path: tab order = visual order; skip-link to `#main-content` (already shipped — keep).
- Icon-only buttons always `aria-label`-ed; form fields always labeled (floating labels count only if always visible on value).
- Live regions announce async results (quotation saved, upload complete).
- `prefers-reduced-motion` + `prefers-color-scheme` both honored; manual theme override persists.
- Images of stones get meaningful alt (`"Esmeralda Venus, 2.3ct, corte esmeralda"`), not `"image"`.
- Language attributes correct per locale (ES/EN) so screen readers switch voices.

---

## 8. Per-Screen Heuristic Checklist

Before any screen ships, it passes:

1. **Vitrine test** — is the emerald (stone/CTA) the only saturated element?
2. **One-scroller test** — DevTools: exactly one scrolling element unless a contained nested scroller is deliberate?
3. **Return test** — navigate in, go back: same scroll position, no reload flash?
4. **Squint test** — hierarchy visible blurred; nothing shouting?
5. **States test** — loading/empty/error/content all reachable and designed?
6. **Thumb test** — bottom 20% free of destructive actions; all targets ≥ 44px; last row clears the tab bar?
7. **Token test** — zero hex/px/z literals in the diff?
8. **Reduced-motion pass** — feature fully usable with animations off?
9. **375px pass** — no horizontal scroll, body ≥ 17px, iPhone SE height survives?
10. **Chrome test** — exactly one top chrome and one bottom chrome from the §5.2 matrix?

---

## 9. Foundation Files (code contract)

```
src/design-system/
├── index.ts                     ← the only import path (unchanged rule)
├── tokens/quiet-emerald.ts      ← §1–§4 values (already authoritative)
├── tokens/layout.ts             ← appShell, zIndex, radius, breakpoints
├── mixins/scrollMixins.ts       ← containedScrollY/X, paneHeight, bottomBarClearance
├── tokens/css-variables-v3.css  ← NEW: --tm-* runtime variables, both modes
└── v3.ts                        ← NEW: ds3 composite — one object, whole system
```

`v3.ts` exports `ds3` + `getDS3(mode)` so feature code needs exactly one import. New feature code imports **only** from the barrel; reaching into `legacy-compat` is lint-blocked.

---

## 10. Migration Plan

**Phase 0 — Foundations land (this delivery).** `css-variables-v3.css` + `v3.ts` added to the barrel; spec adopted; no visual regressions (additive).

**Phase 1 — Shell & scroll (highest user pain, ~days).** VirtualGrid measured height (§5.4.3); sweep remaining `vh`/magic offsets (`floatingButtonOffset`, `comparisonBarOffset`, `quickActionsOffset` become derived); verify sheets on iPhone SE + Pro Max.

**Phase 2 — Navigation coherence.** PageConfig registry completed for every route (§5.3.1); back-behavior unified; desktop breadcrumb projection for admin.

**Phase 3 — Surface migration, worst-first.** The audit's top-10 offender files (templates, AsesorCard, FilterContent…) restyled to v3 tokens; glass cards → borders-first surfaces; ESLint rules (§11) turned on as errors for migrated directories, warnings elsewhere.

**Phase 4 — Retirement.** `legacy-compat.ts` consumers reach zero; silver/gradient/spring v1 tokens deleted; `DESIGN-SYSTEM.md` archived.

---

## 11. Enforcement (so v3 doesn't become v1)

ESLint (or a lint script) blocks in `src/**` feature code: hex colors & `rgba()` literals · px spacing outside the scale · `zIndex:` integer literals · bare `overflow: 'auto'` · `100vh` / `calc(100vh` · `scroll-behavior` outside theme.ts · imports from `tokens/legacy-compat`. CI runs the §8 checklist as PR template. New tokens require a documented role in this file — a value used twice is a candidate, three times is a token.

---

*DS v3 — designed against the live audit of 2026-07-17 (`DESIGN-SYSTEM-AUDIT.md`, `SCROLL-UIUX-AUDIT-2026-07-08.md`). Rules 5.1–5.4 codify and extend the shell architecture already proven in Fotosíntesis/Atelier to the whole product.*
