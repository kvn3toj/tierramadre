---
name: Tierra Madre — Quiet Emerald (DS3)
description: The one design system for Tierra Madre's Colombian emerald catalog and sales platform — theme is data, never a fork.
colors:
  bg-gallery-wall: '#F7F8F8'
  bg-gallery-wall-dark: '#0E1110'
  surface-raised: '#FFFFFF'
  surface-raised-dark: '#15191A'
  well-vitrine-floor: '#F1F2F2'
  well-vitrine-floor-dark: '#1B1F1F'
  border-hairline: '#E4E7E5'
  border-hairline-dark: '#272C2B'
  divider: '#EBEDEC'
  divider-dark: '#222726'
  text-primary: '#14181A'
  text-primary-dark: '#EAEDEB'
  text-muted: '#5C6360'
  text-muted-dark: '#9AA09D'
  text-subtle: '#8C928F'
  text-subtle-dark: '#6B726F'
  emerald-accent: '#00785C'
  emerald-accent-dark: '#34C99B'
  emerald-accent-strong: '#006F52'
  emerald-accent-strong-dark: '#00AF84'
  emerald-pure: '#00AF84'
  emerald-pure-dark: '#34C99B'
  on-accent: '#FFFFFF'
  on-accent-dark: '#06140E'
  danger: '#B3403A'
  danger-dark: '#E5736C'
  warning: '#8A5F1B'
  warning-dark: '#D9A94E'
typography:
  display:
    fontFamily: 'Cormorant Garamond, Cormorant, Georgia, serif'
    fontSize: 'clamp(2.25rem, 5vw, 3.5rem)'
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: '-0.01em'
  title-1:
    fontFamily: 'Cormorant Garamond, Cormorant, Georgia, serif'
    fontSize: '1.75rem'
    fontWeight: 500
    lineHeight: 1.15
  title-2:
    fontFamily: 'Cormorant Garamond, Cormorant, Georgia, serif'
    fontSize: '1.375rem'
    fontWeight: 500
    lineHeight: 1.2
  headline:
    fontFamily: 'Hanken Grotesk, system-ui, sans-serif'
    fontSize: '1.0625rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'Hanken Grotesk, system-ui, sans-serif'
    fontSize: '1.0625rem'
    fontWeight: 400
    lineHeight: 1.55
  footnote:
    fontFamily: 'Hanken Grotesk, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.45
  overline:
    fontFamily: 'DM Mono, SF Mono, monospace'
    fontSize: '0.6875rem'
    fontWeight: 500
    letterSpacing: '0.14em'
    lineHeight: 1.4
  data:
    fontFamily: 'DM Mono, SF Mono, monospace'
    fontWeight: 500
    fontVariationSettings: 'tabular-nums'
rounded:
  well: '5px'
  control: '8px'
  card: '12px'
  sheet: '18px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  standard: '16px'
  lg: '20px'
  xl: '24px'
  xxl: '32px'
  xxxl: '48px'
  huge: '64px'
components:
  button-primary:
    backgroundColor: '{colors.emerald-accent-strong}'
    textColor: '{colors.on-accent}'
    rounded: '{rounded.control}'
    padding: '12px 20px'
  button-tinted:
    backgroundColor: '{colors.well-vitrine-floor}'
    textColor: '{colors.emerald-accent}'
    rounded: '{rounded.control}'
    padding: '12px 20px'
  button-outlined:
    backgroundColor: 'transparent'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.control}'
    padding: '12px 20px'
  card-outlined:
    backgroundColor: '{colors.surface-raised}'
    rounded: '{rounded.card}'
    padding: '16px'
  badge:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.text-muted}'
    rounded: '{rounded.pill}'
    height: '22px'
    padding: '0 10px'
---

# Design System: Tierra Madre — Quiet Emerald (DS3)

## 1. Overview

**Creative North Star: "La Vitrina"**

Every screen is a museum vitrine. The emerald — or, on a given screen, the one primary action — is the only saturated thing in view, resting in a quiet neutral well. Chrome whispers; the stone speaks. Quiet Emerald is gallery-quiet and editorially confident, never busy: an asesor showing a client a stone on an iPhone, and the Tierra Madre team running inventory on desktop, both need the interface to disappear so the emerald and the sale stay the focus. Calm is a feature, not an aesthetic afterthought — no flicker, no scroll fights, no layout jumps, no color noise.

The system explicitly rejects its own predecessor, "Emerald iOS v1": silver metallics, emerald-gradient buttons, glass cards as a default content surface, bright emerald (`#00AE7A`) used as body/link text, spring-bounce motion in product UI, and SF Pro as the typographic voice. It also rejects generic SaaS visual clichés — hero-metric tiles, identical card grids, side-stripe accent borders, gradient text — none of which belong in a vitrine.

**Key Characteristics:**

- One saturated hue in the entire product — the emerald. Everything else is a cool, green-tinted grayscale.
- Depth is borders-first: hairlines and surface steps, not drop shadows. One editorial shadow exists, reserved for true floating layers.
- Theme is data, never a fork: "Quiet Emerald," "Foto," and "Atelier" are token presets passed into one canonical component set, not separate component libraries.
- Serif (Cormorant) is a display voice for piece names and titles; sans (Hanken Grotesk) carries every functional surface; mono (DM Mono) is reserved for gemology and money — carats, prices, item numbers — always tabular.

## 2. Colors

A cool, green-tinted neutral scale carrying almost the entire surface, with the emerald appearing only where it does real work: accents, primary actions, trust indicators.

### Primary

- **Emerald Accent** (`#00785C` light / `#34C99B` dark): links, labels, active state, the one recurring saturated color in the product.
- **Emerald Accent Strong** (`#006F52` light / `#00AF84` dark): primary button fill — the one `accent-strong` filled button per screen.
- **Emerald Pure** (`#00AF84` light / `#34C99B` dark): the brightest step, reserved for jewelry, not paint — live status dots, trust badges, the logo, a selected-state tick. Never a fill, never body text, never a large area.

### Neutral

- **Gallery Wall** (`#F7F8F8` light / `#0E1110` dark): app background.
- **Surface** (`#FFFFFF` light / `#15191A` dark): cards and raised chrome.
- **Vitrine Floor** (`#F1F2F2` light / `#1B1F1F` dark): the image well behind a piece — the one surface a stone photograph sits on.
- **Hairline Border** (`#E4E7E5` light / `#272C2B` dark): 1px component borders.
- **Divider** (`#EBEDEC` light / `#222726` dark): 1px row/section rules, one step quieter than a border.
- **Text Primary / Muted / Subtle** (`#14181A` / `#5C6360` / `#8C928F` light; `#EAEDEB` / `#9AA09D` / `#6B726F` dark): the four-level text hierarchy (a fourth, disabled, sits at 45% opacity of primary). A screen using only two levels has flat hierarchy.

### Semantic

- **Danger** (`#B3403A` light / `#E5736C` dark) and **Warning** (`#8A5F1B` light / `#D9A94E` dark): desaturated, earth-toned — never neon red or orange. Always paired with an icon or label; color alone never carries the meaning.
- **Success** is the emerald accent itself — there is no second green in the system.

### Named Rules

**The One Voice Rule.** One saturated color exists in the entire product. If a screen shows a second saturated hue, it's either a semantic status color doing real work, or a bug — the purple stat tile that triggered this migration was the latter.

**The Jewelry-Not-Paint Rule.** `emerald-pure`, the brightest step, is reserved for dots, ticks, and trust badges. It is never a background larger than a chip. Large emerald fields compete with the actual stones.

## 3. Typography

**Display Font:** Cormorant Garamond (fallback: Cormorant, Georgia, serif)
**Body Font:** Hanken Grotesk (fallback: system sans-serif)
**Label/Mono Font:** DM Mono (fallback: SF Mono, monospace)

**Character:** An editorial serif for the pieces themselves — names, titles, anything the eye should linger on — paired with a plain functional sans for everything the hand operates, and a tabular mono for anything measured in carats or pesos. Three families, three jobs, no fourth.

### Hierarchy

- **Display** (serif 500, `clamp(2.25rem, 5vw, 3.5rem)`, line-height 1.05): page heroes.
- **Title 1** (serif 500, 1.75rem, line-height 1.15): page titles.
- **Title 2** (serif 500, 1.375rem, line-height 1.2): section titles, piece names on cards.
- **Headline** (sans 600, 1.0625rem, line-height 1.3): emphasized rows, sheet titles.
- **Body** (sans 400, 1.0625rem, line-height 1.55): default copy — 17px minimum on mobile, never smaller. Cap line length at 65-75ch.
- **Footnote** (sans 400, 0.8125rem, line-height 1.45): metadata.
- **Overline** (mono 500, 0.6875rem, +0.14em, uppercase, line-height 1.4): section labels, eyebrows.
- **Data** (mono 500, tabular-nums, any size): prices, carats, quantities, item numbers — so columns and tickers never jitter.

### Named Rules

**The Display-Voice Rule.** Serif is a display voice, never a paragraph voice. If it wraps past 3 lines, it should have been Body.

**The Tabular-Nums Rule.** Any number a user compares against another number — a price, a weight, an item count — renders in Data (mono, tabular). Proportional-width digits in a price column is a bug, not a style choice.

## 4. Elevation

Depth is borders-first, not shadow-first. Structure comes from hairline borders and surface steps (`bg → surface → well`) — cards at rest carry no shadow at all. Exactly one editorial shadow exists in the whole system, reserved for true floating layers: sheets, popovers, drag previews, the lightbox. Dark mode leans harder on borders still; the one shadow dims to near-invisible by design.

### Shadow Vocabulary

- **Editorial Shadow** (`box-shadow: 0 18px 40px -24px rgba(13,30,24,0.30)`): the single shadow in the system. Sheets, modals, popovers, drag previews only — never a resting card.

### Named Rules

**The Borders-First Rule.** A card, list row, or tile at rest has a 1px hairline border and no shadow. Hover emphasizes the border or steps the surface one level (`surface → well`); it never adds a shadow that wasn't there before, and it never translates the element.

**The Squint Test.** Blurred, a Quiet Emerald screen shows hierarchy through border weight and surface steps, but not a single loud line.

## 5. Components

Every component in the product renders from exactly one canonical set (`src/design-system/components/`); theme is a prop, never a fork. The set currently covers Button, Card, Badge, MetricCard, TextField/Field, SegmentedControl, Sheet, EmptyState, ErrorState, Skeleton, FilterSheet, and PieceCard.

### Buttons

- **Shape:** 8px radius (`--tm-radius-control`), or the full step-cut octagon bevel — reserved for exactly one brand CTA per screen (Cotizar, Cerrar lote, Registrar venta).
- **Primary:** solid `--tm-accent-strong` fill, `--tm-on-accent` text, no border, no gradient. Exactly one per screen.
- **Tinted / Plain / Outlined / Danger:** the other four variants — tinted for secondary emphasis, plain for the quietest action, outlined for borders-first neutral actions, danger for destructive ones. None of the five ever uses a gradient or a metallic fill.
- **Hover / Focus:** hover is opacity or background-tint only, 160ms, never a layout-shifting scale. Focus-visible is the token ring — `box-shadow: var(--tm-focus-ring)` — 2px accent, 2px offset, keyboard-only, never suppressed.

### Badges

- **Style:** a pill (999px radius), always icon-or-dot **plus** a visible label — color is never the only indicator (WCAG 1.4.1). The dot on `accent`/`success` tones renders as a tiny emerald step-cut lozenge, not a circle — the one deliberate "bisel" signature outside the primary CTA.
- **Tones:** neutral, accent, success (= accent, no second green), warn, danger — all desaturated, all AA-checked against the surface they sit on.

### Cards / Containers

- **Corner Style:** 12px (`--tm-radius-card`) for cards; 5px (`--tm-radius-well`) for image wells; 18px (`--tm-radius-sheet`) for sheets and modals.
- **Background:** `--tm-surface` for the card; `--tm-well` for an inset image or content well.
- **Shadow Strategy:** none at rest (see Elevation). `elevated` variant carries the one editorial shadow, reserved for genuine floating layers.
- **Border:** 1px `--tm-border` on the `outlined` variant (the default); none on `elevated`; 1px `--tm-border` plus `--tm-well` background on `well`.
- **Internal Padding:** 16px standard, 12px compact.

### Inputs / Fields

- **Style:** inset — `--tm-well` background, `--tm-border` border. "Type here" without heavy chrome.
- **Focus:** the token focus ring, same as every other interactive element.
- **Error / Disabled:** error state uses `--tm-danger` border plus an inline message, never color alone; disabled sits at 45% opacity, `not-allowed` cursor, still AA-readable as "present but off."

### Overlays (Sheet / FilterSheet)

- **Style:** desktop renders a centered modal (capped width); mobile renders a bottom sheet, `max-height: 85dvh`, safe-area aware, drag handle unless suppressed.
- **Dismissal:** backdrop click and Escape both dismiss (unless an action is in-flight); focus is trapped and returned to the invoker on close.
- **Motion:** enters at 420ms/confident-decel, exits at 240ms/accelerate — never a spring.

### Data States (Skeleton / EmptyState / ErrorState)

- **Skeleton:** geometry-matched to the real content so the swap is CLS≈0; `--tm-well` fill, respects `prefers-reduced-motion`.
- **EmptyState:** one icon well, one line of copy, one action — an invitation, not an apology.
- **ErrorState:** same shell as EmptyState with a danger-toned icon, plain-language cause, and a retry action near the failure — never a bare toast.

## 6. Do's and Don'ts

### Do:

- **Do** keep exactly one saturated color — the emerald — on any given screen; everything else is neutral.
- **Do** use borders-first depth: 1px hairlines and surface steps, no shadow on resting cards.
- **Do** render prices, carats, and item counts in the Data (mono, tabular) type role.
- **Do** pair every semantic color (danger/warning) with an icon or label, never color alone.
- **Do** use the token focus ring (`var(--tm-focus-ring)`) on every interactive element, never a bespoke `outline`.
- **Do** ship all four data states — loading, empty, error, content — on every async view.
- **Do** touch targets ≥44×44px with ≥8px gaps.

### Don't:

- **Don't** use a second saturated hue anywhere on screen (the stray purple stat tile is the canonical example of what this rule exists to prevent).
- **Don't** put a gradient fill on a button, or gradient text anywhere — emphasis comes from weight or size, never `background-clip: text`.
- **Don't** use silver/metallic chrome or `#00AE7A` as body/link text — both are retired "Emerald iOS v1" artifacts.
- **Don't** use glassmorphism as a default content surface — glass is demoted to exactly two places (top nav, tab bar) at high opacity.
- **Don't** use spring/bounce motion in product UI — springs are exempt only in the isolated Vault Cinema / Esmereogénesis scope.
- **Don't** use `border-left`/`border-right` as a colored accent stripe on a card or list row — use a full border, a background tint, or a leading icon instead.
- **Don't** hand-roll a button, card, sheet, tab bar, or field outside `src/design-system/` — every screen renders from the one canonical set.
- **Don't** guess a layout height with a magic-number offset (`HEADER_OFFSET = 280`, `100vh - N`) — measure it.
