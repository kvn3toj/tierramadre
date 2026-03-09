# Design System Audit Report — Tierra Madre Studio

**Date:** March 7, 2026
**Scope:** All files in `src/pages/`, `src/components/`, `src/contexts/`, `src/hooks/`
**Version:** Post-Audit v2 (z-index, typography, shadows, transitions already fixed)

---

## Executive Summary

After the initial audit that connected ~90+ files to the design system (z-index, fontWeights, fontFamily, shadows, transitions), a second deep scan reveals **~300+ remaining hardcoded values** across the codebase. The biggest offenders are hex colors, rgba values, borderRadius, and fontSize literals.

### Severity Breakdown

| Priority | Category | Count | Impact |
|----------|----------|-------|--------|
| P0 | Hardcoded hex colors (#fff, #000, surface/text colors) | ~105 | Theme inconsistency, dark mode breaks |
| P0 | Hardcoded rgba() not using alpha utilities | ~75 | Theme inconsistency |
| P1 | Hardcoded borderRadius px values | ~70 | Visual inconsistency |
| P1 | Hardcoded fontWeight numbers (still remaining) | ~80 | Minor, but violates single-source-of-truth |
| P2 | Hardcoded fontSize rem/px strings | ~50 | Scale drift |
| P2 | Hardcoded lineHeight/letterSpacing | ~50 | Typography drift |
| P3 | Hardcoded boxShadow strings | ~12 | Shadow inconsistency |
| P3 | Hardcoded transitions | ~5 | Motion inconsistency |

---

## P0 — Critical (Theme/Dark Mode Impact)

### Hardcoded Hex Colors

These break dark mode theming because they don't respond to theme context.

**Worst offenders:**

| File | Count | Examples |
|------|-------|---------|
| `pages/collection/CollectionPage.tsx` | 25+ | `#fff`, `#000`, `#D4A017`, `#B8941F` |
| `pages/admin/ActivityPage.tsx` | 20+ | `#666`, surface colors |
| `pages/ambassadors/profile/components/CollectionProductDialog.tsx` | 20+ | Colors, fontSizes |
| `components/treasure/certification/EthicalTab.tsx` | 16 | `#F9FAFB`, `#2C2C2E`, `#E5E7EB`, `#3C3C3E` |
| `components/treasure/certification/ColombianOriginTab.tsx` | 4 | Same surface/border pattern |
| `components/media/DriveUrlInput.tsx` | 3 | `#fff`, `rgba(0,0,0,...)` |
| `components/media/MediaUploadZone.tsx` | 4 | `#9CA3AF`, `#6B7280` |
| `components/media/DriveFolderInfo.tsx` | 3 | `#fff`, `#f5f5f5`, `#ccc` |
| `components/home/sections/InstagramSection.tsx` | 2 | `#fff` |
| `components/auth/WelcomeScreen.tsx` | 3 | `#0d1a14`, `#050505`, `#000` |
| `components/cotizacion/constants.ts` | 2 | `#FFFFFF`, `#FAFAFA` |
| `components/cotizacion/quotation-preview/TotalsSection.tsx` | 1 | `#E5E7EB` |
| `components/treasure/RecentlyViewedCarousel.tsx` | 1 | `#ef4444` |
| `components/comparison/AttributeCard.tsx` | 1 | `#999` |

**Recommended tokens:**

| Hardcoded | Token Replacement |
|-----------|-------------------|
| `#fff`, `#FFFFFF` | `surfacesLight.background.primary` or CSS `var(--surface-primary)` |
| `#000` | `surfacesLight.text.primary` or `surfacesDark.background.primary` |
| `#F9FAFB` | `surfacesLight.background.secondary` |
| `#2C2C2E` | `surfacesDark.background.secondary` |
| `#E5E7EB` | `surfacesLight.border.light` |
| `#3C3C3E` | `surfacesDark.border.default` |
| `#9CA3AF` | `surfacesLight.text.tertiary` |
| `#6B7280` | `surfacesLight.text.secondary` |
| `#ef4444` | `semanticColors.error.main` |
| `#D4A017`, `#B8941F` | `goldAccent.primary`, `goldAccent.dark` |

### Hardcoded rgba() Values

Should use `whiteAlpha()`, `blackAlpha()`, `emeraldAlpha()`, `goldAlpha()`.

**Top files:**

| File | Count | Examples |
|------|-------|---------|
| `components/shared/CollectionSplashScreen.tsx` | 5 | `rgba(80,200,120,0.35)`, `rgba(255,255,255,0.95/0.85/0.1/0.5)` |
| `components/ios/IOSMoreSheet.tsx` | 4 | `rgba(0,0,0,0.3/0.4)`, `rgba(52,199,89,0.08)`, `rgba(46,125,50,0.08)` |
| `components/pwa/NotificationPermission.tsx` | 5 | `rgba(0,0,0,0.85/0.3)`, `rgba(255,255,255,0.1/0.5/0.4)` |
| `components/product/GalleryPreview.tsx` | 3 | `rgba(0,0,0,0.7/0.1/0.6)` |
| `components/analytics/FrictionInsights.tsx` | 6 | Uses MUI `alpha('#000',...)` instead of `blackAlpha()` |
| `hooks/useLiquidGlass.ts` | 7 | `rgba(30,41,59,0.95)`, `rgba(255,255,255,0.1)`, `rgba(0,0,0,0.1)` — repeated 3x |

**Fix pattern:**
```typescript
// Before
rgba(0, 0, 0, 0.6)           →  blackAlpha(0.6)
rgba(255, 255, 255, 0.5)     →  whiteAlpha(0.5)
rgba(0, 174, 122, 0.3)       →  emeraldAlpha(0.3)
rgba(80, 200, 120, 0.35)     →  emeraldAlpha(0.35)  // approximate
alpha('#000', 0.2)           →  blackAlpha(0.2)
```

---

## P1 — High Priority (Visual Consistency)

### Hardcoded borderRadius

| File | Count | Values Found |
|------|-------|-------------|
| `pages/InvitationPage.tsx` | 15+ | `'14px'`, `'12px'`, `'20px'`, `'50%'`, `'10px'` |
| `components/treasure/FilterContent.tsx` | 5 | `'20px'`, `'24px'`, `'16px'` |
| `components/invitation/InvitationGenerator.tsx` | 20+ | `'20px'`, `'10px'`, `'12px'`, `'14px'` |
| `components/treasure/browser/MobileSearchBar.tsx` | 1 | `'16px'` |
| `components/analytics/HealthScoreHero.tsx` | 1 | `'9999px'` |
| `components/shared/MediaPreview.tsx` | 1 | `'8px'` |

**Token mapping:**
```
'50%' or '9999px'  →  radius.full
'24px'             →  radius['3xl']
'20px'             →  radius['2xl']
'16px'             →  radius.xl
'12px'             →  radius.lg
'8px'              →  radius.md
'6px'              →  radius.sm
'4px'              →  radius.xs
'14px'             →  No exact token — use radius.lg (12px) or radius.xl (16px)
'10px'             →  No exact token — use radius.lg (12px) closest
```

> **Note:** `14px` and `10px` have no exact tokens. Consider adding `radius.mlg: '0.625rem'` (10px) if used frequently, or round to nearest token.

### Remaining Hardcoded fontWeight Numbers

~80 instances across components still use numeric values (500, 600, 700) instead of tokens. These were found in files not touched by the first audit wave.

**Top files:** `analytics/FrictionInsights.tsx` (19 instances), certification tabs, meditation components, various home sections.

---

## P2 — Medium Priority (Scale Drift)

### Hardcoded fontSize Strings

~50 instances of literal `'0.75rem'`, `'0.8rem'`, `'0.85rem'`, `'0.875rem'`, `'0.6rem'` instead of `fontSizes` tokens.

**Top files:** `CollectionProductDialog.tsx` (7+), `CotizacionCard.tsx` (5+), `ActivityPage.tsx`.

**Token mapping:**
```
'0.6rem'    →  No exact match (9.6px). Closest: fontSizes.xs (11px)
'0.75rem'   →  fontSizes.xs (12px = 0.75rem) ✓
'0.8rem'    →  No exact match. Closest: fontSizes.xs
'0.85rem'   →  No exact match. Closest: fontSizes.sm (13px = 0.8125rem)
'0.875rem'  →  No exact match. Between sm and base
```

> **Note:** Several commonly-used sizes don't have exact tokens. Consider whether the design system's type scale needs a `fontSizes.2xs` for very small text.

### Hardcoded lineHeight and letterSpacing

~50 combined instances. Mostly in `InvitationPage.tsx` (7+ lineHeights), `CollectionProductDialog.tsx`, and receipt/cotizacion components (10+ letterSpacing).

---

## P3 — Low Priority (Polish)

### Hardcoded boxShadow Strings

12+ instances in `pwa/InstallButton.tsx`, `pwa/UpdatePrompt.tsx`, `pwa/NotificationPermission.tsx`, `ios/IOSCard.tsx`, `ios/IOSTabBar.tsx`, `meditation/GuidedMeditation.tsx`, `meditation/VisualMeditation.tsx`, `cotizacion/CotizacionGenerator.tsx`.

### Hardcoded Transitions

5 instances in `CollectionProductDialog.tsx`, `CotizacionProductsPage.tsx`.

### Hardcoded Gradients

Custom gradients in `InstagramSection.tsx` (Instagram brand), `MeditationModal.tsx`, `ChakraMeditation.tsx`, `CollectionSplashScreen.tsx`, `WelcomeScreen.tsx`. Some are legitimately custom (Instagram brand gradient), others could use `emeraldGradients` or `backgroundGradients`.

---

## Contexts & Hooks (Post-First-Audit Residuals)

| File | Issues | Details |
|------|--------|---------|
| `contexts/NotificationContext.tsx` | 3 | Hardcoded `padding: '4px 12px'` (×2), `borderRadius: 2` (MUI scale) |
| `contexts/ThemeContext.tsx` | 1 | `borderRadius: 31/2` magic number calculation |
| `contexts/GlobalLoadingContext.tsx` | 1 | `height: 2` hardcoded |
| `contexts/NetworkStatusContext.tsx` | 2 | `borderRadius: 0`, `fontSize: '0.8125rem'` |
| `hooks/useLiquidGlass.ts` | 7 | `rgba(30,41,59,0.95)` repeated 3× across 3 functions, plus border rgba values |

**All other contexts (7) and hooks (58):** Clean — no design violations.

---

## Recommendations

### Immediate Actions
1. **Fix certification tabs** (ColombianOriginTab, EthicalTab, GemologicalTab) — they have the most systematic pattern of hardcoded surface/border colors that should be theme-aware tokens.
2. **Fix useLiquidGlass.ts** — consolidate the 3 duplicate fallback objects into a shared constant using design tokens.
3. **Fix CollectionSplashScreen.tsx** — 5 hardcoded rgba values.

### Design System Gaps to Address
1. **Missing radius tokens:** `10px` and `14px` are used frequently but have no exact token. Consider adding `radius.mlg` or accepting rounding.
2. **Missing fontSize tokens:** Very small sizes (`0.6rem`, `0.8rem`) don't map cleanly. Consider adding `fontSizes.2xs`.
3. **Instagram gradient:** This is a brand-specific external gradient — acceptable as hardcoded, but could be added to `accentColors` or a social gradients token.

### Process Improvements
1. Add ESLint rule to flag hardcoded hex colors in `.tsx` files.
2. Add ESLint rule to flag numeric `fontWeight` values (should use tokens).
3. Consider a `no-magic-numbers` rule for `zIndex`, `borderRadius` in `sx` props.

---

*Generated by design system audit — Tierra Madre Studio v2.0*
