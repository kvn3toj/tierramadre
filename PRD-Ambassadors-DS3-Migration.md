# PRD — Ambassadors → DS3 "Quiet Emerald" Migration

**Status:** draft for review
**Scope:** every ambassador surface — the directory (`/ambassadors`), the profile (`/ambassadors/:slug`), and the product screen (`/ambassadors/:slug/product/:itemId`) — plus `/mi-perfil`.
**Baseline:** `feat/ds3-catalog-polish` (the catalog is already migrated: vitrine surfaces, Auction Catalogue type, filigree cut marks).

---

## 1. Why

The catalog and the ambassador screens no longer look like the same product. The catalog renders from DS3 tokens and canonical components; the ambassador tree is still on the retired "Emerald iOS v1" language and hand-rolls almost everything.

Concretely, of ~40 ambassador components: **5 files import a canonical component, and exactly 1 file touches a Quiet Emerald token.** Everything else builds on legacy tokens (`emeraldCore`, `goldAccent`, `surfacesLight/Dark`, `brand`, `lightTokens/darkTokens`, `fontFamilies`) and raw MUI.

The three differences a user actually feels:

1. **No surface step.** Ambassador cards are `#FFFFFF` on `#FFFFFF`. The catalog is `--tm-surface #FAFDFC` resting on `--tm-bg #E6EAE8`. Nothing reads as a lit object.
2. **Shadows instead of borders.** ~20 resting-card `boxShadow` literals plus hover `translateY`/`scale`. DS3 is borders-first: a resting card has a 1px hairline and no shadow.
3. **Inverted typography.** Prices, carats, ratings and counts are set in **serif**; piece names on the detail screens are set in **sans 700**. DS3 is the exact opposite — serif (EB Garamond) is the display voice for piece names, and every number is Data (Libre Franklin + `tabular-nums`).

## 2. Non-goals

- No data-layer changes. `useAsesores`, `/api/get-asesores`, Convex `ambassadors.ts` stay as they are.
- No new features. Overrides, favorites, exclusive collection and quotes keep their current behaviour.
- Not a visual redesign of the _brand_ — this is a migration onto the existing system. Where the plan does change structure (§6) it is because the current structure is broken, not for taste.

## 3. Open decisions (need a call before Slice 6)

| #   | Decision                                                                                                                                                                                                                                                                          | Recommendation                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The profile is a **6-view state machine** in one route (`museum` / `category` / `favoriteDetail` / `productDetail` / `edit` / `manageFavorites`), and only `productDetail` is URL-backed. Browser-back exits the profile entirely from any sub-view. Give each view a real route? | **Yes.** Back is sacred. This is the one structural change worth doing; without it deep links and back stay broken.                                        |
| D2  | `FavoriteDetailView` (297 lines) and `AmbassadorProductDetail` (598 lines) are **two implementations of the same screen**. Collapse?                                                                                                                                              | **Yes** — route `favoriteDetail` through `AmbassadorProductDetail`. Removes a whole duplicate surface.                                                     |
| D3  | Favorites are **circular** thumbnails; the vitrine uses square 5px wells everywhere else.                                                                                                                                                                                         | **Square them.** Circles are the last v1 artifact on the profile. Cosmetic but visible.                                                                    |
| D4  | Delete the ~2,140 lines of unreachable code, or keep for reference?                                                                                                                                                                                                               | **Delete.** It is only reachable through barrels and holds the worst violations in the tree (incl. a full blue/amber `COLOR_PRESETS` palette). Git has it. |

## 4. Target contract

These screens are done when they satisfy the same contract as the catalog:

- **Tokens only** — `getQuietEmerald(mode)` / `var(--tm-*)` / `qeFont` / `qeType`. No `emeraldCore`, `goldAccent`, `surfacesLight/Dark`, `brand`, `lightTokens/darkTokens`, `fontFamilies`, `semanticColors`, `accentColors`. No hex/rgba/zIndex literals.
- **One saturated colour.** `--tm-accent` for text/links/borders, `--tm-accent-strong` for the one filled button per screen. `--tm-accent-pure` is jewellery only — dots, ticks, trust badges — never a fill, border, or body/link text.
- **Borders-first.** Resting cards: 1px `--tm-border`, zero shadow. Hover emphasises the border or steps the surface; it never translates, scales, or adds a shadow. One `--tm-shadow`, floating layers only.
- **Typography.** Piece names/titles → `qeFont.serif` (EB Garamond) at `title-1`/`title-2`. Everything functional → `qeFont.ui` (Libre Franklin). Every number a user compares → `qeType.data` (sans 500 + `tabular-nums`). Nothing below `overline` (0.6875rem). Body ≥ 1.0625rem.
- **Canonical components** — `Card`, `PieceCard`, `Button`, `Badge`, `TextField`/`Field`, `SegmentedControl`, `Sheet`, `EmptyState`, `ErrorState`, `Skeleton`, `MetricCard`. Nothing hand-rolled that the system already provides.
- **Glass only in top nav + tab bar.** No `backdropFilter` as content chrome.
- **A11y** — targets ≥44×44 with ≥8px gaps; token focus ring; semantic colour never alone; all four data states (loading / empty / error / content); `prefers-reduced-motion` honoured.

## 5. Current state — measured

| Signal                                                        | Value                                                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Live ambassador files                                         | 14 (+ `/mi-perfil` 6)                                                                  |
| Dead/unreachable files                                        | 6 (~2,140 LOC)                                                                         |
| ESLint (`src/pages/ambassadors`, `src/components/ambassador`) | **172 problems, all warnings** — 171 `no-restricted-syntax`, 1 `no-restricted-imports` |
| Canonical components in use                                   | `PieceCard`, `Badge` (1 file), `Skeleton` (2), `MetricCard` (1)                        |
| QE token usage                                                | 1 file (`CotizacionCard`, `qeFont.mono`)                                               |

**Lint sees roughly a third of the debt.** It catches hex/rgba/zIndex literals but not legacy-token _identifiers_ imported via the barrel, hand-rolled components, resting shadows, serif-for-numbers, sub-44px targets, or the broken scroll contract. Do not treat a clean lint as done.

## 6. Plan — sequenced slices

Each slice is independently shippable and independently verifiable. Order matters: 0–3 are broad/mechanical and make 4–7 much smaller.

### Slice 0 — Delete the dead surface

Remove `components/ambassador/AmbassadorProfile.tsx` (850), `AmbassadorCard.tsx` (465), `styles.ts` (67), `ProfileEditor.tsx` + `profile-editor/**` (~420), `profile/components/ProductFilters.tsx` (239), and their barrel exports.
**Verify:** `tsc` + build clean; no import resolves to a deleted file.
**Risk:** none — no consumer outside barrels.

### Slice 1 — Token sweep (the big one)

Across all 14 live files, replace every legacy token with DS3. This is mostly mechanical and delivers most of the visual win:

- `surfacesLight/Dark` → `var(--tm-surface)` / `var(--tm-bg)` / `var(--tm-well)`
- `emeraldCore.primary` → `--tm-accent` (text/border) or `--tm-accent-strong` (fills)
- `goldAccent.primary` → `--tm-muted` where it carries information, `--tm-subtle` only where decorative
- `fontFamilies.display` → `qeFont.serif`; `fontFamilies.system` → `qeFont.ui`
- `brand.*`, `lightTokens/darkTokens`, `accentColors`, `semanticColors` → tokens (`--tm-danger`, `--tm-warning`)
- Fix `CollectionProductDialog.tsx:22` deep import → barrel
- Normalise radii to the scale (well 5 / control 8 / card 12 / sheet 18)
  **Verify:** lint warnings drop from 172 → near 0; side-by-side light+dark against the catalog.

### Slice 2 — Depth & motion

Delete all resting-card shadows and the hover `translateY`/`scale` that accompanies them; delete avatar glows, gradient accent stripes, the `::before` gradient hairlines and the vignette; swap bespoke `outline` focus for `var(--tm-focus-ring)`; remove all 12 content-chrome `backdropFilter`s (scrims become solid `var(--tm-scrim)`); replace ad-hoc `0.3s ease` with `--tm-base`/`--tm-ease`.
**Verify:** squint test — hierarchy from border weight and surface steps, no loud lines; reduced-motion honoured.

### Slice 3 — Typography inversion

Piece names/titles → serif `title-1`/`title-2`; **all** prices, carats, ratings, counts, stat values → `qeType.data`; raise every sub-0.6875rem size to `overline`; body copy to ≥1.0625rem; apply the One-Line-Name rule (single line + ellipsis + `title`).
**Verify:** no serif digits anywhere; price columns align; no text below the scale floor.

### Slice 4 — Badges, buttons, fields

12 MUI `Chip` → `Badge` (fixes colour-alone meaning, WCAG 1.4.1); ~10 `IconButton`/MUI `Button` → DS3 `Button` **at ≥44×44**; 5 raw `TextField` → DS3 `TextField`/`Field` with inline error states; quality filter chips → `SegmentedControl`.
**Verify:** keyboard path; every target ≥44 with ≥8px gaps; error states inline, not toast-only.

### Slice 5 — Containers & data states

`AsesorCard`, `CategoryGrid` tiles, `ProductListCard`, `CotizacionCard` → `Card` / `PieceCard variant="well"` (the same primitive the catalog renders); 3-up stats → `MetricCard`; all loading → geometry-matched DS3 `Skeleton`; all empty/error → `EmptyState`/`ErrorState`; add the missing gallery error state in `AmbassadorProductDetail`; migrate `ExclusiveCollectionSection` off the removed MUI v6 `Grid item` API.
**Verify:** CLS ≈ 0 on load; all four data states reachable per view.

### Slice 6 — Sheets (needs D1/D2)

`CollectionProductDialog` (656), `CotizacionPreviewDialog`, `EditProductOverrideDialog` → canonical `Sheet` (85dvh mobile bottom sheet, safe-area, drag handle, focus trap + return, backdrop/Esc dismissal, `--tm-slow` in / `--tm-base` out).
**Verify:** focus returns to invoker; Esc + backdrop dismiss; safe-area on device.

### Slice 7 — Structural

Retarget the scroll contract to `#main-content` (`AsesorProfilePage:321` and `ViewAllTreasuresFAB`'s `window.scrollY` listener are inert — the FAB's hide-on-scroll has never worked); add `containedScrollX` to the 5 bare `overflowX:'auto'` strips; give each profile view a route (**D1**); collapse `FavoriteDetailView` into `AmbassadorProductDetail` (**D2**); move the floating back pill into `PageConfig`; drop the page-level `maxWidth` caps that fight `--maxw`; wire the dead CTA `onClick` in `AmbassadorProductDetail`; add a keyboard reorder path to `ManageFavoritesView`; move destructive 20×20 buttons out of the fat-finger cluster; square the favorite thumbs (**D3**).
**Verify:** browser-back pops one view at a time; deep links land; FAB hides on scroll.

### Slice 8 — Lock it in

Add `src/pages/ambassadors/**` and `src/components/ambassador/**` to the error-escalation block in `eslint.config.js` (currently only `src/components/treasure/browser/**`), so the tree can't regress.
**Verify:** `npm run lint:ds3` errors on a deliberate violation in these dirs.

## 7. Top 10 highest-impact fixes

If only part of this ships, do these, in order:

1. Kill legacy token imports across the 14 live files (fixes surfaces, borders, dark mode; clears ~171 lint warnings).
2. Stop using `emeraldCore.primary` (= `accent-pure`) as text/fill/border — it fails AA at ~2.4:1, **including on prices**.
3. Delete every resting-card shadow + the hover translate/scale.
4. Fix the typography inversion (serif names, Data numbers).
5. 12 `Chip` → `Badge` (colour-alone meaning is a WCAG failure today).
6. 4 modals → `Sheet` (biggest mobile-feel gap).
7. Purge the 12 content-chrome `backdropFilter`s.
8. Touch targets — `ManageFavoritesView`'s **20×20 destructive** buttons are the worst offenders.
9. Repair the scroll contract.
10. Delete the dead code, then adopt `PieceCard`/`Card` for what remains.

## 8. Risks

- **Slice 1 is broad.** It touches every live file; review as one diff per file, verify light _and_ dark, and lean on the screenshots.
- **D1 changes URLs.** Existing shared profile links must keep working — keep `/ambassadors/:slug` and `/ambassadors/:slug/product/:itemId` exactly as they are; new routes are additive for the other four views.
- **`accentuate` is imported from `CollectionPage`** into `CollectionProductDialog`. Moving it to `utils/` touches the public `/c/:folder` collection page — verify that route too.
- **`/mi-perfil` shares components** with the profile; it is in scope for Slices 1–5 and must be re-verified even though it is not in the URL list above.

## 9. Definition of done

- `npm run lint:ds3` clean at **error** level for both ambassador directories.
- `npm run lint` (tsc) clean.
- No `emeraldCore` / `goldAccent` / `surfacesLight` / `surfacesDark` / `brand` / `lightTokens` / `darkTokens` / `fontFamilies` import remains under `src/pages/ambassadors` or `src/components/ambassador`.
- Directory, profile, and product screens verified live in light + dark at 375 / 768 / 1440.
- Back button and deep links behave on the profile.
- Screenshots: catalog card beside ambassador card — same surface step, same border, same type roles.
