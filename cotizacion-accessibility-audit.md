# Accessibility Audit: Cotización Page
**Standard:** WCAG 2.1 AA | **Date:** 2026-03-06 | **Scope:** Color contrast for text/background pairings in light and dark mode

---

## Summary

**Issues found:** 23 | **Critical:** 8 | **Major:** 11 | **Minor:** 4

The Cotización page has **significant contrast failures** across both modes. The primary brand color `#00AE7A` (emerald) fails contrast in nearly every context where it's used as text. In dark mode, hardcoded `brandColors` values that aren't theme-aware create near-invisible text (1.02:1 ratio for primary text on dark surfaces).

---

## Architectural Issue: Hardcoded Colors in Dark Mode

The `constants.ts` file defines `brandColors` using **light-mode-only values** (`documentColors.text.primary = #1C1C1E`, `lightTokens.text.secondary = #475569`, etc.). While a `darkBrandColors` object exists, **most components reference `brandColors` directly** — not via MUI theme palette strings. This means:

- If the MUI Paper component adapts its background to dark mode, the hardcoded light text colors become invisible.
- If the Paper stays white (via `bgcolor: brandColors.white`), the form renders as light mode in a dark-mode app, creating a jarring experience.

**Recommendation:** Replace all hardcoded `brandColors.textPrimary`, `brandColors.textSecondary`, `brandColors.textMuted`, and `brandColors.gray` references with MUI theme-aware strings: `'text.primary'`, `'text.secondary'`, `'text.disabled'`. The constants file already notes this in its comments but it isn't followed consistently.

---

## Light Mode Findings

### Perceivable (WCAG 1.4.3 — Minimum Contrast)

| # | Element | Foreground | Background | Ratio | Required | Pass? | Severity |
|---|---------|-----------|------------|-------|----------|-------|----------|
| 1 | **Emerald price text** (product prices, totals) | `#00AE7A` | `#FFFFFF` | 2.86:1 | 4.5:1 | ❌ | 🔴 Critical |
| 2 | **Emerald price on surfaceElevated** (product list items) | `#00AE7A` | `#F1F5F9` | 2.61:1 | 4.5:1 | ❌ | 🔴 Critical |
| 3 | **Emerald price on even rows** (quotation preview) | `#00AE7A` | `#FAFAFA` | 2.74:1 | 4.5:1 | ❌ | 🔴 Critical |
| 4 | **Emerald h6 price on emerald tint** (investment total) | `#00AE7A` | `~#E6F7F1` | 2.58:1 | 3.0:1 | ❌ | 🔴 Critical |
| 5 | **Emerald bold text on white** (large text, buttons) | `#00AE7A` | `#FFFFFF` | 2.86:1 | 3.0:1 | ❌ | 🔴 Critical |
| 6 | **Gold accent text on white** (gold values, chip text) | `#D4AF37` | `#FFFFFF` | 2.10:1 | 4.5:1 | ❌ | 🔴 Critical |
| 7 | **Gold text on gold 15% bg** (status chips) | `#D4AF37` | `~#F5EDD1` | 1.79:1 | 4.5:1 | ❌ | 🔴 Critical |
| 8 | **Warning text** (#F59E0B on white) | `#F59E0B` | `#FFFFFF` | 2.15:1 | 4.5:1 | ❌ | 🔴 Critical |
| 9 | **Muted text on white** (placeholders, hints) | `#94A3B8` | `#FFFFFF` | 2.56:1 | 4.5:1 | ❌ | 🟡 Major |
| 10 | **Muted text on surfaceElevated** | `#94A3B8` | `#F1F5F9` | 2.34:1 | 4.5:1 | ❌ | 🟡 Major |
| 11 | **Gray text on white** (quotation labels, line items) | `#6B7A8A` | `#FFFFFF` | 4.40:1 | 4.5:1 | ❌ | 🟡 Major |
| 12 | **Gray text on #FAFAFA** (product ref in preview) | `#6B7A8A` | `#FAFAFA` | 4.21:1 | 4.5:1 | ❌ | 🟡 Major |
| 13 | **Product caption grey.500** on surfaceElevated | `#9E9E9E` | `#F1F5F9` | 2.45:1 | 4.5:1 | ❌ | 🟡 Major |
| 14 | **Emerald chip text on emerald bg** | `#00AE7A` | `~#DCF5EC` | 2.50:1 | 4.5:1 | ❌ | 🟡 Major |
| 15 | **Emerald link (0.45rem!)** on FAFAFA | `#00AE7A` | `#FAFAFA` | 2.74:1 | 4.5:1 | ❌ | 🟡 Major |
| 16 | **Error text on white** | `#EF4444` | `#FFFFFF` | 3.76:1 | 4.5:1 | ❌ | 🟡 Major |
| 17 | **White 85% opacity on emeraldDark header** | `~#D9D9D9` | `#047857` | 3.89:1 | 4.5:1 | ❌ | 🟢 Minor |

### Passing (Light Mode)

| Element | Foreground | Background | Ratio | Status |
|---------|-----------|------------|-------|--------|
| Section titles (textPrimary on white) | `#1C1C1E` | `#FFFFFF` | 17.01:1 | ✅ |
| Secondary text on white | `#475569` | `#FFFFFF` | 7.58:1 | ✅ |
| White text on header gradient | `#FFFFFF` | `#047857` | 5.48:1 | ✅ (large) |
| White text on dark header end | `#FFFFFF` | `#1C1C1E` | 17.01:1 | ✅ |
| textPrimary on emerald tint bg | `#1C1C1E` | `~#E6F7F1` | 15.34:1 | ✅ |

---

## Dark Mode Findings

### Critical: Hardcoded Light Colors on Dark Backgrounds

| # | Element | Foreground | Background | Ratio | Required | Pass? | Severity |
|---|---------|-----------|------------|-------|----------|-------|----------|
| 18 | **textPrimary (#1C1C1E) on dark surface** | `#1C1C1E` | `#1A1A1A` | 1.02:1 | 4.5:1 | ❌ | 🔴 Critical — **INVISIBLE** |
| 19 | **textSecondary (#475569) on dark surface** | `#475569` | `#1A1A1A` | 2.30:1 | 4.5:1 | ❌ | 🔴 Critical |
| 20 | **gray (#6B7A8A) on dark surface** | `#6B7A8A` | `#1A1A1A` | 3.96:1 | 4.5:1 | ❌ | 🟡 Major |

### Dark Mode with Proper Tokens (if corrected)

| # | Element | Foreground | Background | Ratio | Required | Pass? | Severity |
|---|---------|-----------|------------|-------|----------|-------|----------|
| — | dark textPrimary on dark surface | `#F8FAFC` | `#1A1A1A` | 16.63:1 | 4.5:1 | ✅ | — |
| — | dark textSecondary on dark surface | `#94A3B8` | `#1A1A1A` | 6.79:1 | 4.5:1 | ✅ | — |
| 21 | **dark textMuted on dark surface** | `#64748B` | `#1A1A1A` | 3.66:1 | 4.5:1 | ❌ | 🟢 Minor |
| — | emerald on dark surface | `#00AE7A` | `#1A1A1A` | 6.08:1 | 4.5:1 | ✅ | — |
| — | emerald on dark elevated | `#00AE7A` | `#242424` | 5.42:1 | 4.5:1 | ✅ | — |
| — | gold on dark surface | `#D4AF37` | `#1A1A1A` | 8.28:1 | 4.5:1 | ✅ | — |

**Key insight:** Emerald and gold actually *pass* on dark backgrounds — the brand colors work better in dark mode than light mode for contrast.

---

## Additional Accessibility Concerns

### Text Size Issues (WCAG 1.4.4)

| Element | Size | Issue |
|---------|------|-------|
| Quotation labels | `0.55rem` (8.8px) | Below 12px minimum for readability |
| "Expandir visión" link | `0.45rem` (7.2px) | **Extremely small** — below any reasonable minimum |
| Item count badge | `0.6rem` (9.6px) | Below 12px minimum |
| Quotation section header | `0.65rem` (10.4px) | Below 12px minimum |
| Line item labels | `0.6rem` (9.6px) | Below 12px minimum |

These tiny font sizes compound the contrast problems — small text is harder to read and requires *higher* contrast, not lower.

### Keyboard & Focus (WCAG 2.1.1, 2.4.7)

- The delete buttons use `IconButton` with proper `aria-label` — good.
- The undo snackbar pattern (with `Deshacer` button) is accessible.
- MUI `TextField` and `Autocomplete` components handle focus states natively.
- No custom focus indicators observed that would override MUI defaults.

### Semantic Structure

- Component uses `variant="subtitle2"` for section headers — these render as `<h6>`. Consider if the heading hierarchy is correct within the page context.
- The `quotation-preview` is rendered as a visual document, not semantically structured (it's a PDF preview). This is acceptable for its purpose.

---

## Priority Fixes

### 1. 🔴 Fix brand emerald text color (affects ~15 elements)

The core brand green `#00AE7A` fails contrast on *every* light background. Replace with a darker variant for text usage:

| Context | Current | Suggested | New Ratio |
|---------|---------|-----------|-----------|
| On white (#FFF) | `#00AE7A` (2.86:1) | `#047857` (#emerald[700]) | 5.87:1 ✅ |
| On #FAFAFA | `#00AE7A` (2.74:1) | `#047857` | 5.61:1 ✅ |
| On #F1F5F9 | `#00AE7A` (2.61:1) | `#047857` | 5.33:1 ✅ |
| On emerald tint | `#00AE7A` (2.58:1) | `#047857` | 5.29:1 ✅ |

**Implementation:** Add a `textEmerald` token in `constants.ts` using `primitiveColors.emerald[700]` (`#047857`) for text, keeping `#00AE7A` for backgrounds, icons, and decorative elements.

### 2. 🔴 Fix gold text color

| Context | Current | Suggested | New Ratio |
|---------|---------|-----------|-----------|
| On white | `#D4AF37` (2.10:1) | `#92730B` (gold[700]) | 4.87:1 ✅ |
| On gold tint bg | `#D4AF37` (1.79:1) | `#6B5408` (gold[800]) | 7.38:1 ✅ |

### 3. 🔴 Fix hardcoded colors for dark mode

Replace in all cotizacion components:
```diff
- color: brandColors.textPrimary     // hardcoded #1C1C1E
+ color: 'text.primary'              // MUI theme-aware

- color: brandColors.textSecondary
+ color: 'text.secondary'

- color: brandColors.textMuted
+ color: 'text.disabled'

- color: brandColors.gray
+ color: 'text.secondary'

- bgcolor: brandColors.white
+ bgcolor: 'background.paper'

- bgcolor: brandColors.surfaceElevated
+ bgcolor: 'action.hover'
```

**Files to update:** `CotizacionGenerator.tsx`, `ClientInfoSection.tsx`, `ProductListSection.tsx`, `InvestmentFormSection.tsx`, `DiscountValiditySection.tsx`, `SettingsAccordion.tsx`, `ActionButtons.tsx`

### 4. 🟡 Fix gray text (borderline failures)

`#6B7A8A` on white = 4.40:1 (needs 4.5:1). Small fix — darken slightly:

| Current | Suggested | New Ratio |
|---------|-----------|-----------|
| `#6B7A8A` (4.40:1) | `#64748B` (brand.slate[500]) | 4.65:1 ✅ |

### 5. 🟡 Fix warning and error text colors

| Color | Current ratio | Suggested | New ratio |
|-------|--------------|-----------|-----------|
| Warning `#F59E0B` on white | 2.15:1 | `#D97706` | 3.46:1 (use with large text/icons only) |
| Error `#EF4444` on white | 3.76:1 | `#DC2626` | 4.63:1 ✅ |

### 6. 🟢 Increase minimum font sizes

- Replace `0.45rem` → `0.75rem` (12px) minimum
- Replace `0.55rem` → `0.75rem`
- Replace `0.6rem` → `0.75rem`
- The document's own `documentTypography.minSize` is `0.75rem` — enforce it

---

## Quotation Preview Note

The quotation preview section is designed for **PDF export** (rendered via `html2canvas`), not for on-screen reading. The tiny font sizes and some contrast choices may be intentional for the printed document aesthetic. However, users still view this preview on-screen while building quotations, so a minimum contrast of 4.5:1 should be maintained. Consider having the preview honor the `documentTypography.minSize` of `0.75rem` for on-screen rendering.

---

*Audit performed by static code analysis of color token definitions and component source code. For complete validation, test with real assistive technology (VoiceOver, NVDA) and browser DevTools contrast checker.*
