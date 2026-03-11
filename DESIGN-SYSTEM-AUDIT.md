# Design System Audit Report — Tierra Madre Studio

**Date:** March 11, 2026 (v3 — full architecture + adoption audit)
**Scope:** Token architecture, component completeness, codebase-wide adoption
**System:** Emerald iOS — iOS HIG + Colombian emerald brand identity

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Token files** | 23 files across primitives, semantic, and composite layers |
| **DS components** | 7 (Button, Card, Container, Stack, VStack, HStack, ThemeProvider) |
| **Codebase files scanned** | 250 (189 components + 61 pages) |
| **DS adoption rate** | 65% of files import from `@/design-system` |
| **Hardcoded violations** | ~1,022 (478 color + 411 spacing + 83 z-index + 50 shadow) |
| **Component completeness** | 94% average |
| **Overall score** | **78 / 100** |

The token architecture is mature and mathematically grounded (golden ratio, Fibonacci, iOS HIG). Core components are well-built at 94% completeness. The main gap is **adoption** — 35% of component files bypass design tokens with hardcoded values.

---

## 1. Token Architecture

### Three-tier hierarchy (well-structured)

```
primitives/     → Raw values (colors, spacing, motion, shadows, typography, geometry)
semantic/       → Purpose-driven (brand, surface, text, interactive, document)
composite/      → Feature tokens (glass, gradients, charts, liquid-glass, overlays)
legacy-compat   → Migration path for old consumers
```

Golden ratio (φ = 1.618) is embedded throughout spacing, typography, and container proportions. The 8pt grid aligns with iOS standards. Sacred geometry tokens (emerald cut angles, Fibonacci sequences) are unique and brand-aligned.

### Structural issues

**1. Dual motion systems** — `primitives/motion.ts` defines CSS easing curves and keyframes while `tokens/motion.ts` defines Framer Motion spring configs. Both export to the barrel but the boundary isn't documented.

**2. Dual shadow systems** — `primitives/shadows.ts` provides light/dark elevation scales. `tokens/shadows.ts` adds emerald-tinted, gold-tinted, semantic, card, and specular shadows. Developers don't know which to reach for.

**3. PHI redefined in three places** — `primitives/geometry.ts`, `tokens/spacing.ts`, and `tokens/brand.ts` all define the golden ratio independently instead of importing from a single source.

**4. Font family conflict** — `primitives/typography.ts` uses SF Pro Display/Text. `tokens/brand.ts` uses Cormorant Garamond / Montserrat. No documented canonical choice.

**5. Gradient duplication** — `semantic/brand.ts` defines `brandGradients` while `tokens/gradients.ts` defines `emeraldGradients` with overlapping but slightly different values.

---

## 2. Naming Consistency

| Category | Convention | Consistent? |
|----------|-----------|-------------|
| Colors | `category[shade]` (emerald[500]) | ✅ Yes |
| Spacing | `xs`/`sm`/`md`/`lg`/`xl` scale | ✅ Yes |
| Typography | iOS text style names (headline, body, callout) | ✅ Yes |
| Shadows | `{context}Shadows.{size}` | ⚠️ Mixed paths (`card.resting` vs `cardShadows.resting`) |
| Motion | `easing.{name}` / `spring.{name}` | ⚠️ Split across two files |
| Opacity | Semantic names (whisper, subtle, glass, solid) | ✅ Yes |
| Z-Index | Semantic names (nav, modal, toast) | ✅ Yes |
| Radius | `xs`/`sm`/`md`/`lg`/`xl`/`full` | ✅ Yes |

---

## 3. Token Coverage

| Category | Tokens Defined | Hardcoded Values Found | Adoption |
|----------|---------------|----------------------|----------|
| Colors | 200+ values | 269 hex + 209 rgba = **478** | 🔴 ~58% |
| Spacing | 30+ scale values | **411** px-based dimensions | 🔴 ~52% |
| Shadows | 60+ presets | **50** inline box-shadows | 🟡 ~75% |
| Z-Index | 12 semantic levels | **83** hardcoded integers | 🟡 ~70% |
| Typography | 11 iOS styles + custom | Hardcoded font-size/weight in many files | 🟡 ~65% |
| Border Radius | 7 scale values | Scattered `borderRadius: '10px'` etc. | 🟡 ~70% |

---

## 4. Component Completeness

| Component | States | Variants | A11y | Tokens | Score |
|-----------|--------|----------|------|--------|-------|
| **Button** | ✅ rest/hover/active/disabled/loading | ✅ 4 (primary, secondary, tertiary, danger) | ⚠️ missing icon-only ARIA | ✅ 100% | **95** |
| **Card** | ✅ rest/hover/active/focus | ✅ 3 (elevated, outlined, filled) | ⚠️ missing aria-label, disabled | ✅ 100% | **90** |
| **Container** | N/A (layout) | ✅ 4 max-widths | ✅ semantic | ✅ 100% | **95** |
| **Stack / VStack / HStack** | N/A (layout) | ✅ direction, wrap, align, justify | ✅ semantic | ✅ 100% | **100** |
| **ThemeProvider** | ✅ light/dark/system | ✅ manual + auto | ✅ prefers-color-scheme | ✅ 100% | **95** |
| **Color Utils** | N/A (utility) | ✅ 11 alpha fns + iOS tokens | ✅ WCAG AA/AAA | ✅ 100% | **98** |
| **Liquid Glass Mixins** | ✅ resting/hover/active | ✅ elevation tiers, accent colors | ✅ reduced-motion, fallbacks | ✅ 100% | **100** |

---

## 5. Top 10 Worst-Offending Files

| # | File | Hex | RGBA | Pixels | Total |
|---|------|-----|------|--------|-------|
| 1 | `templates/MasterclassTemplates.tsx` | 13 | 6 | 74 | **93** |
| 2 | `templates/CatalogCoverTemplate.tsx` | 8 | 6 | 48 | **62** |
| 3 | `invitation/InvitationGenerator.tsx` | — | — | 57 | **57+** |
| 4 | `ambassador/AsesorCard.tsx` | 10 | 8 | 36 | **54** |
| 5 | `treasure/FilterContent.tsx` | — | — | 52 | **52+** |
| 6 | `feedback/steps/CaptureStep.tsx` | — | — | 52 | **52+** |
| 7 | `feedback/FeedbackWizard.tsx` | — | — | 45 | **45+** |
| 8 | `pages/collection/CollectionPage.tsx` | 25+ | — | — | **25+** |
| 9 | `ambassador/AmbassadorDirectory.tsx` | 23 | — | — | **23+** |
| 10 | `templates/DynamicBusinessTemplates.tsx` | 7 | 13 | — | **20+** |

### Common violation patterns

```
rgba(255,255,255,0.8)  →  whiteAlpha(0.8)
rgba(0,0,0,0.5)        →  blackAlpha(0.5)
#E1306C (Instagram)    →  accentColors.social.instagram
fontSize: '14px'       →  fontSizes.sm
borderRadius: '10px'   →  radius.md (nearest: 8px) or radius.lg (12px)
zIndex: 1000           →  zIndex.float
boxShadow: '0 2px...'  →  cardShadows.resting / defaultShadows.sm
```

---

## 6. Design System Token Gaps

| Gap | Used Values | Nearest Token | Recommendation |
|-----|-------------|---------------|----------------|
| `borderRadius: '10px'` | Frequent | `radius.md` (8px) or `radius.lg` (12px) | Add `radius.mlg: 10px` |
| `borderRadius: '14px'` | Occasional | `radius.lg` (12px) or `radius.xl` (16px) | Round to nearest |
| `fontSize: '0.6rem'` (9.6px) | Rare | `fontSizes.xs` (11px) | Add `fontSizes.2xs` if needed |
| `fontSize: '0.8rem'` (12.8px) | Occasional | `fontSizes.sm` (13px) | Round to `fontSizes.sm` |
| `fontSize: '0.875rem'` (14px) | Frequent | Between `sm` and `base` | Add `fontSizes.md` at 14px |

---

## 7. Priority Actions

### P0 — Structural consolidation

1. **Unify motion tokens.** Document the boundary: `primitives/motion.ts` = CSS-only, `tokens/motion.ts` = Framer Motion. Or merge into a single file with `css` and `framer` namespaces.

2. **Unify shadow tokens.** Merge `primitives/shadows.ts` and `tokens/shadows.ts`. Keep semantic grouping but eliminate two-file ambiguity.

3. **Single PHI source.** Import from `primitives/geometry.ts` everywhere. Remove redefinitions in `spacing.ts` and `brand.ts`.

### P1 — Adoption enforcement

4. **Add ESLint rules** to flag hardcoded hex colors, `rgba()`, numeric `fontWeight`, and pixel-based spacing in `.tsx` files.

5. **Migrate top 10 offending files.** Start with templates (93+ violations each) and ambassador components.

6. **Fix `useLiquidGlass.ts`** — 7 hardcoded rgba values repeated 3× across functions. Consolidate to shared constant using tokens.

### P2 — Component gaps

7. **Card:** Add disabled state (opacity + non-interactive) and `aria-label` prop for interactive variant.

8. **Button:** Add explicit focus-visible ring token. Add ARIA handling for icon-only usage.

9. **Fill token gaps:** Add `radius.mlg` (10px), `fontSizes.md` (14px), `fontSizes.2xs` (10px) if codebase usage justifies them.

10. **Document font family strategy:** When to use SF Pro (UI), Playfair Display (product names), Cormorant Garamond (certificates), Montserrat (body alternative).

### P3 — Missing component families

The system has 3 component families. Consider adding:

- **Input / TextField** — form elements with consistent states
- **Badge / Chip** — status indicators using `qualityTiers` and `priceTiers`
- **Dialog / Sheet** — modals and bottom sheets with glass effects
- **Toast / Notification** — feedback with `semanticColors`
- **Skeleton / Loading** — loading states with shimmer animation tokens

---

## 8. What's Working Well

- **Mathematical harmony:** Golden ratio, Fibonacci, sacred geometry give the system a distinctive feel beyond typical token sets.
- **iOS alignment:** Touch targets (44px), 8pt grid, SF Pro typography, HIG semantic colors.
- **Liquid Glass:** iOS 26-style glassmorphism with performance tiers, reduced-motion support, and browser fallbacks.
- **Color utilities:** `whiteAlpha()`, `blackAlpha()`, `emeraldAlpha()` with documented WCAG contrast ratios (7:1 secondary, 21:1 primary).
- **ThemeProvider:** System preference detection, localStorage persistence, SSR safety.
- **Type safety:** Full TypeScript interfaces for all token groups.

---

## 9. Contexts & Hooks Residuals

| File | Issues | Details |
|------|--------|---------|
| `contexts/NotificationContext.tsx` | 3 | Hardcoded `padding: '4px 12px'`, `borderRadius: 2` |
| `contexts/ThemeContext.tsx` | 1 | `borderRadius: 31/2` magic number |
| `contexts/GlobalLoadingContext.tsx` | 1 | `height: 2` hardcoded |
| `contexts/NetworkStatusContext.tsx` | 2 | `borderRadius: 0`, `fontSize: '0.8125rem'` |
| `hooks/useLiquidGlass.ts` | 7 | `rgba(30,41,59,0.95)` repeated 3× |

All other contexts (7) and hooks (58): Clean.

---

*Generated by design system audit v3 — Tierra Madre Studio*
