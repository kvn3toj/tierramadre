# Quiet Emerald Migration — Design Spec

**Date:** 2026-07-07
**Status:** Approved for planning
**Author:** Design/brainstorm session (Kevin + Claude)

## 1. Purpose

Migrate the entire Tierra Madre app from its two legacy visual layers — the
`emeraldCore` / `goldAccent` brand palette and the `glass*` glassmorphism tokens
— onto the **Quiet Emerald** design system (`src/design-system/tokens/quiet-emerald.ts`,
re-exported through the barrel `src/design-system/index.ts`).

Quiet Emerald is a calmer, editorial system: one saturated accent (emerald),
a green-tinted grayscale ramp, three typefaces (Cormorant serif / Hanken Grotesk
UI / DM Mono), flat surfaces with hairline borders, and **no gold and no glass**.

Several surfaces already run on it — the bottom tab bar (`IOSTabBar`), the
redesigned catalog (`GridCard`, `ListRow`, `CatalogHeader`, `ActiveFilterChips`),
the product detail `GemSheetParts`, cotización print components, `WelcomeScreen`,
`PublicProductView`, and the whole MUI theme (`ThemeContext`). This spec covers
migrating **everything that remains**.

## 2. Scope

**In scope:** every file importing `emeraldCore`, `goldAccent`, or the `glass*`
tokens — approximately **135 files** (emeraldCore), **60 files** (goldAccent,
overlapping), **6 files** (glass). Full inventory lives in the phase tables below.

**Out of scope:** already-migrated surfaces (listed above); the Fotosíntesis
admin section's own chrome only insofar as it uses legacy tokens (it's included in
the admin phase, but its layout/`FotoTabBar` structure is unchanged); backend/API;
the `esmereogenesis` 3D/canvas internals (only its token usage migrates).

## 3. Approved decisions

| #   | Decision                              | Choice                                                                                                                                                                                                                                                  |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Header (`IOSNavigationBar`) treatment | **Flat editorial** — solid `qe.base`, 1px hairline border, Cormorant serif title, DM Mono overline subtitle. No blur, no gradient. Drop the `IOSLayout` emerald gradient washes.                                                                        |
| D2  | Bottom tab bar                        | **No change** — already Quiet Emerald.                                                                                                                                                                                                                  |
| D3  | More sheet (`IOSMoreSheet`)           | **Grouped list** — iOS-Settings-style grouped containers, hairline dividers between rows, small icon chips, single emerald accent. Drop per-tool color coding and glass.                                                                                |
| D4  | Invitation entry (`InvitationPage`)   | **Whisper of ceremony** — flat `qe.base`, retire the glass card / grid / heavy glow; keep ONE faint emerald halo behind the crown and a soft emerald fill on entered PIN digits.                                                                        |
| D5  | Invitation theming                    | **Dark-only**, matching `WelcomeScreen` (both are pre-auth ceremony screens; a link-arriving guest has no stored theme preference).                                                                                                                     |
| D6  | Gold's fate                           | **Drop gold entirely.** Every `goldAccent` usage maps to emerald or neutral grayscale. One accent across the whole app.                                                                                                                                 |
| D7  | Migration mechanics                   | **Token shim first, then per-area cleanup.** Phase 0 repoints the legacy token internals at Quiet Emerald values so all ~135 files shift palette at once with near-zero risk; later phases do proper `getQuietEmerald(mode)` refactors + visual polish. |

Header/More/Invite treatments were chosen from high-fidelity mockups (real catalog
photos + real fonts + real hex values) reviewed in the visual companion.

## 4. Architecture & strategy

### 4.1 The token shim (Phase 0) — the enabling move

Instead of editing 135 files before anything looks different, Phase 0 rewrites the
**definitions** of the legacy tokens to emit Quiet Emerald values while preserving
their exact export shape (same keys, same types). Consumers keep importing
`emeraldCore.primary` etc.; the pixels change underneath them.

- **`emeraldCore`** (`tokens/colors.ts`): repoint the ramp to the QE emerald scale
  (`qeEmerald` + `qeAccent`). Values are already near-identical (`#00AE7A` →
  `#00AF84`), so this is a gentle nudge, not a jump. Keep every key
  (`primary/light/lighter/lightest/dark/darker/darkest/vibrant/essence/textAccessible`).
- **`goldAccent`** (`tokens/colors.ts`): repoint **all** keys to emerald/neutral
  equivalents so gold visually disappears app-wide (D6). `priceTiers.premium`
  (`accents.ts`) and `medalColors` re-map to an emerald/neutral tier scale.
- **`glass*`** (`tokens/glass.ts`): flatten every `GlassEffect` — `backdropFilter:
'none'`, `background` → the mode-appropriate `qe.surface`, `border` → `qe.hairline`,
  soften `boxShadow` to the QE editorial shadow.

**Semantic gaps the shim must fill** (things legacy tokens provided that raw QE
doesn't yet expose):

- **Price tiers** (`accents.ts priceTiers`): minimum/base/ideal/premium. Re-express
  as an emerald-weighted neutral→emerald scale (premium = strongest emerald, not gold).
- **Role colors** (`IOSMoreSheet ROLE_COLORS`, `types/ambassador.ts`): collapse to
  emerald + neutral variants.
- **Chart/analytics palette**: analytics components (`HorizontalBarChart`,
  `RadarChart`, `FunnelVisualization`, `EngagementHeatmap`, `ProgressBar`, etc.)
  need a **categorical** palette that QE's single-accent system doesn't provide.
  Phase 0 adds a `qeChart` categorical ramp (emerald-anchored, green-tinted
  neutrals + a few restrained hues) to `quiet-emerald.ts` and re-exports it. Charts
  keep working through the shim until their phase refactors them onto `qeChart`.
- **Status colors** (success/warning/error/info): keep semantic status hues as-is
  (they are not "brand" color and must stay legible); only ensure they read against
  QE surfaces.

**Risk the shim introduces:** places that used gold _for contrast against emerald_
(e.g. a gold CTA on an emerald card) become emerald-on-emerald. The shim makes them
visually flat but possibly low-contrast. This is acceptable temporarily and is
exactly what each per-area cleanup phase fixes with proper hierarchy. Phase 0's
verification must screenshot the highest-traffic gold-on-emerald spots
(gamification, WelcomeCard, valuation) and confirm nothing becomes illegible; if
any do, add a neutral fallback in the shim.

### 4.2 Per-area cleanup phases

After Phase 0, each phase takes one area and does the _real_ migration for its files:
replace shim-routed legacy imports with `const qe = getQuietEmerald(mode)` +
`qeFont` / `qeRadius` / `qeType`, apply the approved shell treatments, remove now-dead
glass/gradient code, and visually QA the area in light and dark. Phases are ordered
by visibility and independence; each is independently shippable and reversible.

### 4.3 Mode awareness

In-app surfaces are **mode-aware** via `getQuietEmerald(mode)` (mode from
`useThemeMode`). Pre-auth ceremony screens (`WelcomeScreen`, `InvitationPage`) are
**dark-only** and use `qeDark` / `qeAccent.dark` directly (D5).

### 4.4 End state / cleanup

Final phase deletes `glass.ts`, removes the gold branch from `accents.ts`, drops the
legacy `emeraldCore`/`goldAccent` re-exports from the barrel once no consumer imports
them, and migrates the last legacy references inside `ThemeContext` (the
`MuiTooltip`/`MuiSwitch` overrides using `surfacesLight/Dark`, `iosLabels`). The shim
is removed only when its importer count hits zero.

## 5. Phase breakdown

Each phase = one implementation plan. File lists are the migration targets (grep of
current legacy-token importers; already-migrated files excluded).

### Phase 0 — Foundation & shim (enabling, ship first)

- Extend `quiet-emerald.ts`: add `qeChart` categorical palette, price-tier scale,
  role-color map, and any missing semantic exports; re-export via barrel.
- Rewrite `tokens/colors.ts` (`emeraldCore`, `goldAccent`), `tokens/accents.ts`
  (`priceTiers`, `medalColors`), `tokens/glass.ts` to emit QE values.
- Verify: full-app screenshot sweep (light + dark), focus on gold-on-emerald hotspots.
- **Outcome:** whole app shifts to the Quiet Emerald palette with gold gone and glass
  flattened, near-zero code churn in feature files.

### Phase 1 — App shell (the 4 designed surfaces)

- `IOSNavigationBar.tsx` + `IOSLayout.tsx` (header gradients) → D1 flat editorial.
- `IOSMoreSheet.tsx` + `MoreSheetSearch.tsx` → D3 grouped list; drop gold role chips.
- `IOSFilterSheet.tsx`, `IOSSettingsSheet` → follow grouped/flat language.
- `InvitationPage.tsx` → D4 whisper (dark-only, D5).

### Phase 2 — Home & landing

`home/sections/*` (WelcomeCard, HeroGallery, GallerySection, OracleSection,
ProductsSection, ValuationSection, VideoSection, MeditationSection, Footer),
`home/navigation/QuickActions.tsx`, `data/homeContent.ts`, `shared/SplashScreen.tsx`.

### Phase 3 — Treasure & product periphery

Legacy treasure files not yet migrated: `EmeraldCard`, `TreasureCard`, `FilterContent`,
`RecentlyViewedCarousel`, `SavedFiltersDropdown`, `browser/*` (DesktopFilterToolbar,
MobileSearchBar, TreasureDesktopResultsSummary, TreasureEmptyState, TreasureErrorState),
`certification/*`; `product/*` (AddToTreasureModal, GalleryPreview); `ProductDetail/components/*`
(AdditionalInfo, CertificateSection, LotePriceBreakdown); `comparison/*` (12 files).

### Phase 4 — Ambassadors, profile, accounts, guest

`ambassador/*`, `ambassadors/profile/*` (large — ~18 files), `mi-perfil/*`,
`accounts/AccountsHub`, `guest/MemberBenefitsTeaser`.

### Phase 5 — Admin & staff tooling

`admin/analytics/*` + chart components (onto `qeChart`), `admin/ProductViewers/*`,
`admin/Fotosintesis/*`, `admin/ActivityPage`, `admin/UserViewsPage`,
`admin/CotizacionProductsPage`, `admin/FeedbackDashboard`; `requests/*`,
`staff/requests/*`; `cart/*` + `CartPage`; provider quotation components.

### Phase 6 — Valuation, esmereogénesis, gamification, feedback

`valuation/*` (glass-heavy: ValuationPage, AuctionRecordsCard, OriginComparisonTable,
TimeRangeSlider), `esmereogenesis/*` (AbonoCinematic, ClaimSheet, BottomSheetShell,
OnboardingCoachmarks), `gamification/*` (was gold-heavy — AchievementToast(Animated),
LevelBadge, StreakBadge, ProgressRing(Animated)), `feedback/*` + steps.

### Phase 7 — Shared primitives & final cleanup

`shared/*` (Breadcrumbs, ConfirmDialog, SectionHeader, LoadingFallback, ScrollToTop,
ChunkErrorBoundary), `pwa/UpdateToast`, `contexts/GlobalLoadingContext`,
`design-system/components/Button/Button.tsx`, `templates/DynamicBusinessTemplates`,
`price-simulator/ProductSelector`, `DesignSystemPage`, `config/vault.ts`,
`utils/formatting.ts`, `types/ambassador.ts`, `hooks/usePriceCalculation.ts`.
Then: delete `glass.ts`, remove gold from `accents.ts`, migrate `ThemeContext` legacy
overrides, drop barrel re-exports + the shim once importer count is zero.

## 6. Error handling & edge cases

- **Contrast regressions** from gold→emerald: caught by per-phase light/dark
  screenshot QA; fixed with hierarchy (surface elevation, weight, size) not new hues.
- **Charts** must never lose category distinguishability — `qeChart` needs enough
  distinct steps; verify on the busiest analytics view (FunnelVisualization + heatmap).
- **Guest invite in an unknown theme**: forced dark (D5) sidesteps preference gaps.
- **Print/PDF cotización surfaces** stay light via static `qeTokens.light.*` — do not
  make them mode-aware.
- **Screenshot-protection / liquid-glass contexts**: removing glass must not break
  `ScreenProtectionContext` / `LiquidGlassContext` behavior — verify overlays still
  render above content once backgrounds go solid.

## 7. Testing / verification

- **Per phase:** typecheck + build clean; light+dark screenshot diff of every touched
  surface; run the app and drive the real flow for that area (not just tests).
- **Phase 0 specifically:** app-wide visual sweep proving the palette shifted and
  gold is gone, with no illegible gold-on-emerald casualties.
- **Regression guard:** no new `goldAccent` / `glass*` imports introduced; track the
  shim's importer count trending to zero across phases.
- Existing unit tests (`tests/*`) must stay green; add none unless a token util gains
  logic worth testing (e.g. `qeChart` selection).

## 8. Open questions

None blocking. Per-phase treatment details (beyond the 4 designed shell surfaces) are
decided within each phase's own plan, following the flat-editorial Quiet Emerald
language established here.
