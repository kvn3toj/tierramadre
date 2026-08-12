# DS v3 — The Unified Component System

**Addendum to `DESIGN-SYSTEM-V3.md`** · 2026-07-17
Covers: the complete component catalog, the orphan→canonical consolidation map, the unified navigation (contained TabBar), the anti-generic craft signature, and the screen-coverage matrix.

> **One rule above all:** there is ONE DS3 component set. Every screen, tool,
> sheet, and modal renders from it. Theme (Quiet Emerald · Foto · Atelier) is a
> token object passed *into* a component — never a second copy of the component.
> The `TabBar` shipped with this addendum is the reference implementation.

---

## A. Why this addendum exists

The question was fair: *does DS3 have all components from all screens, with all menus?* Honest answer for the foundations doc alone: **no — it defined tokens, navigation architecture, and rules, but not the component library.** Meanwhile the codebase carries the opposite problem — *too many* components: three buttons, four cards, two bottom bars, five sheet implementations, ~1,022 hardcoded style values across ~250 files.

So the goal is not "add more components." It is **converge to one of each**, complete enough that no screen ever needs to hand-roll UI again. This addendum is that catalog and the map to get there.

---

## B. The component catalog (the whole set)

Every component below is **themeable** (takes DS3 tokens for the active scope) and lives under `src/design-system/`, exported from the single barrel `@/design-system`. Nothing in `pages/` or feature `components/` may reimplement any of these.

Legend — **Status:** ✅ exists, canonical · 🟡 exists, needs consolidation (multiple copies) · 🔴 missing, to build.

### B1 · Layout & shell
| Component | Status | Replaces / notes |
|---|---|---|
| `AppShell` (IOSLayout) | ✅ | The fixed-viewport shell, single `<main>` scroller, publishes `--app-main-height` |
| `Container` | ✅ | Max-width wrapper (4 widths) |
| `Stack` / `VStack` / `HStack` | ✅ | Fl: direction/wrap/align/justify |
| `Grid` | 🟡 | Catalog uses bespoke `VirtualGrid`; promote a `Grid` + `VirtualGrid` pair with the asymmetric-gap token |
| `Section` | 🔴 | Editorial section = mono eyebrow-on-hairline + serif title + body (kills ad-hoc `SectionHeader` variants) |
| `PaneScroller` | 🟡 | Canonical contained nested scroller (wraps `containedScrollY`); bans bare `overflow:auto` |
| `SafeArea` | 🔴 | Insets helper for fixed chrome |

### B2 · Navigation
| Component | Status | Replaces / notes |
|---|---|---|
| **`TabBar`** | ✅ *(this delivery)* | **Unifies `IOSTabBar` + `FotoTabBar`** — contained, one geometry, slot-config + theme adapter. See §D |
| `NavBar` / `TopBar` (IOSNavigationBar) | 🟡 | large/compact modes; back button; one per route family |
| `BackButton` | 🟡 | Canonical history-back with family-root fallback (Nav rule 5.3.2) |
| `Breadcrumbs` | ✅ | Exists (`shared/Breadcrumbs`); adopt for desktop admin depth |
| `SideNav` / `Rail` | 🟡 | `EsmereoSideNav` + `CopilotRail` → one rail primitive |
| `SegmentedControl` | 🔴 | The `Piedras · Gemas · Lotes · Joyas` and `Contado…` pills — currently bespoke per screen; **one component** |
| `Tabs` (in-page) | 🟡 | `TabPanel` exists; wrap a full `Tabs` |
| `RouteMenu` / `MoreSheet` | 🟡 | `IOSMoreSheet` + `FotoRouteMenu` share one grouped-menu primitive fed by a nav registry |

### B3 · Actions
| Component | Status | Replaces / notes |
|---|---|---|
| `Button` | 🟡 | **`IOSButton` + DS `Button` + atelier buttons → one.** Variants: primary · tinted · plain · outlined · danger; sizes sm/md/lg; loading state |
| `IconButton` | 🟡 | One, with required `aria-label` |
| `FAB` | 🟡 | `GlobalSearchFAB` → generalized floating action |
| `Chip` / `FilterChip` | 🟡 | Filter chips (44px), quality/price tier chips → one `Chip` with `selected` |

### B4 · Forms
| Component | Status | Replaces / notes |
|---|---|---|
| `TextField` | 🟡 | `IOSTextField` canonical; floating label, clear, validation, left-icon |
| `Textarea` | 🟡 | Multiline variant of `TextField` |
| `Select` | 🔴 | Custom (native `<select>` is unstylable — DS3 §"Controls"); trigger + popover |
| `SearchField` / `Combobox` | 🟡 | `MoreSheetSearch` logic → one field |
| `Checkbox` · `Radio` · `Switch` | 🟡 | Consolidate the scattered MUI-wrapped instances |
| `RangeSlider` | 🟡 | `LogRangeSlider` canonical (price/carat) |
| `DatePicker` | 🔴 | Custom calendar popover (native date input unstylable) |
| `FilePicker` / `Dropzone` | ✅ | `IOSFilePicker` |
| `Field` (label + help + error) | 🔴 | Wrapper enforcing `label[for]` + error placement |

### B5 · Data display
| Component | Status | Replaces / notes |
|---|---|---|
| `Card` | 🟡 | **`IOSCard` + `GlassCard` + DS `Card` + foto cards → one.** Borders-first; `elevated`/`outlined`/`well` |
| `PieceCard` (vitrine card) | 🟡 | The product card — image well + serif name + mono spec/price + `nº` index (§E) |
| `MetricCard` / `StatBox` | 🟡 | `MetricCard` + `StatBox` + `StatItem` → one |
| `Table` / `DataRow` | 🟡 | Fotosíntesis rows, receipts, cotización lists → one `Table`/`Row` |
| `Badge` / `StatusBadge` | 🟡 | quality/price/status tiers → one, icon+label (never color-only) |
| `Avatar` | 🟡 | Ambassador/user photos |
| `Thumbnail` / `ProgressiveImage` | ✅ | The image well + retry/LQIP (anti-blink law) |
| `Ledger` | 🔴 | **Signature** gemology spec block — mono, tabular, hairline-ruled (§E) |
| `Charts` (Area/Donut/Bar/Radar/Sparkline/Funnel/Heatmap) | ✅ | Analytics set exists; align palettes to `dataviz` |

### B6 · Feedback & status
| Component | Status | Replaces / notes |
|---|---|---|
| `Toast` / `Notification` | 🟡 | `NotificationContext` → tokenized toast (confirms, never asks) |
| `Skeleton` | 🔴 | Geometry-matched loaders (CLS≈0 law) — one primitive |
| `Progress` (linear + circular) | ✅ | `IOSProgress` |
| `EmptyState` | 🔴 | The "Aún no hay…" screens (visible in the shot) — serif line + one action |
| `ErrorState` | 🔴 | Cause + retry, near the failure |
| `Banner` | 🟡 | `InvitationBanner` → generic dismissible banner |
| `ConfirmDialog` | ✅ | Exists; route destructive actions through it |
| `LiveRegion` | ✅ | a11y announcements |

### B7 · Overlays
| Component | Status | Replaces / notes |
|---|---|---|
| `Sheet` / `BottomSheet` | 🟡 | **`BottomSheetShell` + `IOSMoreSheet` + `IOSSettingsSheet` + `IOSFilterSheet` + esmereo sheets → one** `Sheet` (85dvh, contained, safe-area) |
| `Modal` / `Dialog` | 🟡 | Cotización/comparison modals → one |
| `Drawer` | 🟡 | `FotoRouteMenu` drawer primitive |
| `Popover` | 🔴 | Anchored menus, `Select`/`DatePicker` foundation |
| `Lightbox` / `Gallery` | 🟡 | Product gallery → one, with anti-blink preload |
| `Tooltip` | 🔴 | Desktop-only hints |

### B8 · Brand & document (scoped)
| Component | Status | Notes |
|---|---|---|
| `Splash` | ✅ | `SplashScreen` / `CollectionSplashScreen` |
| `Logo` / `BrandElements` | ✅ | |
| `VaultCinema` | ✅ | Cinematic scope — sanctioned rule-breaker |
| `Certificate` / PDF templates | ✅ | Document scope (own serif set — not product UI) |

**Totals: ~62 canonical components — ✅ 18 · 🟡 30 (consolidate) · 🔴 14 (build).** The work is mostly *convergence*, not net-new.

---

## C. Consolidation map (orphan → canonical)

The concrete "no orphans" schedule. Each row: the duplicates today → the one component they become. Migration is directory-by-directory; the old file becomes a thin re-export, then is deleted.

| Canonical | Absorbs (delete after migration) |
|---|---|
| `Button` | `components/ios/core/IOSButton`, `design-system/components/Button`, atelier/foto inline buttons, `disabledButton` |
| `Card` | `components/ios/core/IOSCard`, `components/shared/GlassCard`, `design-system/components/Card`, inline foto/atelier cards |
| `TabBar` | `components/ios/IOSTabBar`, `pages/admin/Fotosintesis/components/FotoTabBar` |
| `Sheet` | `BottomSheetShell`, `IOSMoreSheet`, `IOSSettingsSheet`, `IOSFilterSheet`, `EsmereoCreationSheet`, `ClaimSheet`, `EsmereoExplainerSheet` |
| `TextField` | `IOSTextField` + ~40 inline MUI `TextField` styles |
| `Badge` | quality/price/status tier renderers scattered across `treasure`, `ambassador`, `cotizacion` |
| `RouteMenu` | `IOSMoreSheet` groups + `FotoRouteMenu` (shared registry `adminNavMap` + a new `userNavMap`) |
| `SegmentedControl` | the `Piedras/Gemas/Lotes/Joyas` bar, `Contado…` toggles, origin tabs, redesign toggle |
| `Toast` | `NotificationContext` inline styles |
| tokens | the ~478 color + ~411 spacing + ~83 z-index + ~50 shadow literals → `--tm-*` / `ds3` |

Order of attack = the audit's worst offenders first (`templates/*`, `AsesorCard`, `FilterContent`, `feedback/*`), because they concentrate the most hardcoding per file.

---

## D. Navigation unification — the contained TabBar

**Files shipped** (type-checked, `tsc --strict` clean):
- `TabBar.tsx` → `src/design-system/components/TabBar/TabBar.tsx` (pure DS component; re-export from the barrel). Imports `zIndex` from `../../tokens/layout`.
- `tabBarConfig.ts` → `src/components/navigation/tabBarConfig.ts` (app-layer wiring: slot sets + theme adapters; references app icons/routes, so it sits outside the DS layer and feeds config into `<TabBar>`).

### D1 · The fix you identified
FotoTabBar looks right on desktop and the storefront bar stretches because of exactly one difference:

```
// FotoTabBar inner pill (good):        // old IOSTabBar inner pill (stretched):
maxWidth: 520, marginX: 'auto'          // (neither) → spans edge-to-edge
```

`TabBar` bakes `maxWidth` (default **520px**) + `marginX: 'auto'` into the inner pill. On a phone the pill is full-width-minus-padding; on desktop it caps and centers — a floating pill, never a stretched bar. The oversized left-anchored "INICIO" fill disappears too, because slots are strict `flex: 1` equal widths and the active indicator fills exactly one slot.

### D2 · One component, two (three) wirings
- **Storefront:** `STOREFRONT_SLOTS` + `storefrontTabTheme(mode)` → `Inicio · Tesoros · Embajadores · Cuentas · Menú`. *(Cuentas is promoted from the "Más" sheet to a top-level place so the storefront bar has the same 4-places-+-Menú cadence as Foto. It's one line in `tabBarConfig.ts` if you want a different 4th place or to keep 3+Menú.)*
- **Fotosíntesis:** `FOTO_SLOTS` + `fotoTabTheme(mode)` → unchanged `Inicio · Lotes · Ventas · Directorio · Menú` — the bar you already love, now the same component.
- **Provider:** `PROVIDER_SLOTS` — direct places, no orphan code path.

`AppShell` picks the wiring by route family (the §5.2 matrix) and renders **one** `<TabBar>`. `IOSTabBar` and `FotoTabBar` are deleted.

### D3 · Behavior contract (preserved + unified)
Portal to `<body>` (PWA-safe) · safe-area bottom inset · rail-aware `right` · reduced-motion · haptics · badges · `role=nav` + `aria-current` + `aria-haspopup/expanded` on the action slot · exactly one slot lit (exact-match roots never bleed onto children).

### D4 · Motion reconciliation
The sliding indicator uses a **calm tween** (`--tm-ease`, 240ms), not a spring — honoring DS3 §4 "no springs in product UI." Foto's old spring was near-critically-damped (damping 32) so there's no visible difference except the removal of any overshoot. The bar feels identical; the rulebook stays consistent.

---

## E. Anti-generic craft — the signature system

The brief: *don't look like common AI design.* Generic AI UI has tells — fully-rounded friendly pills, perfectly symmetric card grids, uniform drop shadows, centered-hero-plus-three-cards, gradient accents, emoji-ish icons. v3's foundations already kill most (borders-first, one shadow, no gradients, editorial serif). What remained generic was the **navigation pill** and the **evenness** of everything. Two named signatures fix it — both drawn from the actual product, so they're un-swappable.

### E1 · "El bisel" — the emerald step-cut
Colombian emeralds are *step-cut* (the emerald cut): a rectangular table with chamfered corners. That octagonal table is the single most recognizable thing about the product. DS3 turns it into a corner treatment applied deliberately in five places you can point to:

1. **The active TabBar indicator** — an octagonal emerald-table clip (chamfer 9px, `clip-path`), not a rounded pill. This alone de-genericizes the whole app's most-seen element. *(Shipped: `beveled` prop, on by default.)*
2. **Image wells** — the `PieceCard` well chamfers its top-right corner, so every stone sits in an emerald-shaped frame.
3. **Selection ticks & trust dots** — `accent-pure` rendered as a tiny emerald-cut lozenge, not a circle.
4. **Hero / brand-moment primary buttons** — the **full emerald-cut (octagon)**: all four corners chamfered so the button reads as an emerald table, not a rounded pill. Reserve it for the *one* brand CTA per view (Cotizar, Cerrar lote, Registrar venta); secondary/ghost buttons stay soft-radius.
5. **Section eyebrows** — the mono overline anchored to a hairline with a small chamfer notch instead of a plain bar.

Discipline: the bevel lives on **filled or image-masked** elements (clip-path erases borders). Bordered cards keep soft radii — the signature is a guest, not wallpaper. Token: `--tm-bevel: 9px`.

### E2 · The editorial devices (kill the evenness)
- **The numbered vitrine.** Pieces carry a mono index — `nº 001` — reading as a collection catalog, not an e-commerce grid.
- **Asymmetric catalog gaps** (already speced: 18px row / 12px col phone; 30/24 wide). Named, kept — evenness is an AI tell.
- **The Ledger.** Gemology facts render as a ruled mono ledger (`2.34 ct · Muzo · Vivid`), tabular, hairline-separated — gem-lab paperwork, not feature bullets.
- **Eyebrow-on-the-rule.** Section labels sit *on* the hairline (mono, tracked, uppercase), not floating above a title — an editorial move, not a dashboard header.
- **Serif as the only display voice.** Titles are Cormorant; the UI never shouts in bold sans. Calm is the anti-generic.

### E3 · The swap test (from the interface-design mandate)
For each of the five signature placements: swap it for the generic default (rounded pill, circle dot, plain bar) and the screen must feel *measurably* less like Tierra Madre. If a placement fails that test, it isn't carrying the signature and should be strengthened or removed. This is the acceptance bar for "doesn't look like AI."

---

## F. Screen-coverage matrix (the "all screens / all menus" answer)

Every route family maps onto the catalog — proof the set is complete, not the literal 44 screens. If a screen needs something outside this matrix, that's a missing canonical component (a 🔴), not a license to hand-roll.

| Family / surface | Components it composes from |
|---|---|
| **Home** (`/home`) | AppShell · NavBar · SegmentedControl · Section · PieceCard · Card · Banner · TabBar |
| **Catalog** (`/treasure`) | AppShell · NavBar · SearchField · FilterChip · SegmentedControl · Grid/VirtualGrid · PieceCard · FilterSheet · TabBar |
| **Product** (`/product/:id`) | NavBar+Back · Lightbox/Gallery · Ledger · Badge · Button · Sheet · Table |
| **Ambassadors** (`/ambassadors`) | NavBar · Avatar · Card · Badge · Button · TabBar |
| **Cuentas / Cotizaciones / Recibos** | NavBar · Table/Row · Field/TextField · Select · Button · Modal · Toast |
| **Provider** | NavBar · Table · Field · Button · TabBar(provider) · Toast |
| **Fotosíntesis** | FotoTopbar · Table/Row · Badge(status) · Sheet · FAB · **TabBar(foto)** · RouteMenu · Rail |
| **Atelier** (`/admin/products`) | Module topbar · Table · Field · Badge · Sheet |
| **Analytics** | NavBar · MetricCard · Charts · Table · EmptyState |
| **Menus** | RouteMenu (user `Menú` + foto `Menú`) · SettingsSheet(→Sheet) · Drawer |
| **Vault / Esmereogénesis** | VaultCinema · Sheet · Button *(scoped exception)* |

Menus specifically: the user **Menú** (today `IOSMoreSheet`: Herramientas → Invitación/Solicitudes/Cuentas, Ventas → Bóveda/Esmereogénesis/Generador, Descubrir, Admin → Fotosíntesis/Atelier/Analytics, Perfil, Ajustes, Feedback) and the Fotosíntesis **Menú** (`FotoRouteMenu`: the role-gated `adminNavMap` groups Inventario/Ventas/Analítica/Directorio/Cuentas/Perfil/Sistema + shortcuts + status legend) both become **one `RouteMenu`** fed by a nav registry — user entries from a new `userNavMap`, admin from the existing `adminNavMap`.

---

## G. Enforcement (so "one system" stays one)

1. **Single import surface.** Everything comes from `@/design-system`. A lint rule blocks importing component internals or `tokens/legacy-compat` from `pages/**` and feature `components/**`.
2. **No hardcode.** Block hex, `rgba(`, px-spacing off the scale, `zIndex:` integers, inline `boxShadow`, `100vh`/`calc(100vh`, bare `overflow:'auto'` in feature code (warnings during migration, errors per-directory once migrated).
3. **No re-implementation.** A PR that adds a `styled` button/card/sheet/tab bar outside `src/design-system/` fails review — point it at the canonical component.
4. **Theme is a prop, never a fork.** New surface for a new scope? Add a token preset (like `getFoto`), not a component copy.
5. **A value used 3× is a token; a pattern used 2× is a component.** New canonical entries get a row in §B before they ship.

---

## H. Sequenced plan

1. **Land the primitives** (this delivery): `TabBar` + `tabBarConfig`, tokens (`v3.ts`, `css-variables-v3.css`), spec. Additive — no regressions.
2. **Swap the bar:** `AppShell` renders one `<TabBar>` by family; delete `IOSTabBar`/`FotoTabBar`. Fix `VirtualGrid` measured height (DS3 §5.4.3) in the same pass — the highest-pain scroll bug.
3. **Consolidate the 🟡 heavy-hitters:** `Button` → `Card` → `Sheet` → `TextField` → `Badge`. Each: build canonical, re-export old, migrate imports, delete old.
4. **Build the 🔴 gaps:** `Section`, `SegmentedControl`, `Select`, `EmptyState`, `ErrorState`, `Skeleton`, `Ledger`, `Popover`.
5. **Turn lint to error** per migrated directory; retire `legacy-compat`; archive `DESIGN-SYSTEM.md`.

*One DS3. Same components everywhere. No orphans, no hardcoding.*
