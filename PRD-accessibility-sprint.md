# PRD: WCAG 2.1 AA Accessibility Sprint

**Author:** CoomUnity Team | **Date:** March 9, 2026 | **Status:** Draft
**Priority:** P0 | **Estimated effort:** 1–2 week sprint

---

## Problem Statement

Tierra Madre Studio currently has **23 WCAG 2.1 AA violations** identified in a March 2026 audit, including 5 critical issues that make core flows unusable for keyboard-only and screen-reader users. The Tesoros catalog — the app's primary value surface — has 9+ unlabeled form inputs and zero visible focus indicators, which means an assistive-technology user cannot browse, filter, or view products. Fixing the 5 critical issues in a single sprint will bring the app to a baseline level of accessibility and establish patterns the team can follow for remaining issues.

---

## Goals

1. **Eliminate all 5 critical WCAG violations** so that every core flow (login, browse catalog, view product, navigate) is operable via keyboard and screen reader
2. **Establish a reusable focus-visible style** applied globally, so new components inherit accessible focus by default
3. **Create an `aria-label` convention** for the codebase so future filter/input components are labeled consistently
4. **Reduce total critical+major issues from 15 to ≤5** if sprint capacity allows

---

## Non-Goals

- **Full WCAG 2.1 AA compliance** — the 8 minor issues (decorative icon `aria-hidden`, heading hierarchy, ambassador banners) are deferred to a follow-up sprint
- **WCAG 2.1 AAA compliance** — AAA targets (e.g., 7:1 contrast) are not in scope
- **Automated accessibility CI pipeline** — tooling like axe-core in CI is a future consideration, not this sprint
- **Assistive technology QA** — a full VoiceOver/NVDA/TalkBack test pass is recommended after this sprint but not gating
- **Redesigning the filter bar** — we're adding labels to existing inputs, not changing the visual design

---

## User Stories

### Keyboard-only user
- **As a keyboard-only user**, I want to see a visible focus ring on every interactive element so that I know where I am on the page
- **As a keyboard-only user**, I want to activate product cards with Enter/Space so that I can browse the catalog without a mouse

### Screen reader user
- **As a screen reader user**, I want every filter input to announce its purpose so that I can search and filter the emerald catalog
- **As a screen reader user**, I want icon-only buttons to have accessible names so that I know what they do
- **As a screen reader user**, I want gallery images to describe what I'm looking at (product name + view) instead of reading filenames like "IMG_5076.HEIC"

### Low-vision user
- **As a low-vision user**, I want all text to meet 4.5:1 contrast ratios so that I can read labels, links, and prices

---

## Requirements

### P0 — Must-Have (Critical fixes, this sprint)

| # | Requirement | Acceptance Criteria | WCAG | Files Affected |
|---|------------|-------------------|------|---------------|
| 1 | **Add `aria-label` to all filter inputs** on the Tesoros page | Every `<input>`, `<select>`, and custom filter control has an `aria-label` or associated `<label>`. Axe scan returns 0 "form elements must have labels" violations on `/treasure`. | 3.3.2 | `TreasureFilters`, search bar component, price/weight range inputs |
| 2 | **Add global `:focus-visible` style** | All focusable elements (`a`, `button`, `input`, `select`, `[tabindex="0"]`) show a 2px emerald-green outline when focused via keyboard. Mouse clicks do NOT trigger the ring. | 2.4.7 | Global CSS / MUI theme `components` override |
| 3 | **Fix "VER TODO" link contrast** | Text color meets ≥ 4.5:1 ratio against its background. Suggested fix: change `rgb(51,193,148)` to `#0e7a5a` or darker. | 1.4.3 | Homepage "Estrenos" section, likely a shared `SectionHeader` or inline style |
| 4 | **Add accessible names to all icon-only buttons** | Every `<button>` or `[role="button"]` that contains only an SVG/icon has an `aria-label`. Specifically: refresh media button on product detail, notification bell on homepage. | 4.1.2 | `ProductDetail` (refresh button), notification prompt component |
| 5 | **Fix "Limpiar" filter button contrast** | Text meets ≥ 4.5:1 ratio. Measured current ratio is below threshold on dark background. | 1.4.3 | Tesoros filter bar |

### P1 — Nice-to-Have (Major fixes, if sprint capacity allows)

| # | Requirement | Acceptance Criteria | WCAG |
|---|------------|-------------------|------|
| 6 | **Improve product image alt text** | Main gallery image alt = `"{Product Name}, view {n} of {total}"`. Thumbnails follow same pattern. No filename-based alt text remains. | 1.1.1 |
| 7 | **Add `aria-label` to video elements** | All `<video>` elements have `aria-label="Video de {product name}"`. | 1.1.1 |
| 8 | **Ensure 44×44px minimum touch targets** | Bottom nav buttons, filter chips, and carousel dots all have ≥ 44×44px clickable area (padding counts). | 2.5.5 |
| 9 | **Make product cards keyboard-navigable** | Cards are focusable (`tabindex="0"` or wrapped in `<a>`), activatable with Enter, and announce product name + key details. | 2.1.1 |
| 10 | **Make carousel dots keyboard-navigable** | Dots are focusable, arrow keys navigate between them, and `aria-selected` reflects the active dot. | 2.1.1 |
| 11 | **Add `aria-label` to range slider** | "Multiplicador de precio" slider has explicit `aria-label` and announces its current value. | 3.3.2 |
| 12 | **Add accessible name to notification bell** | Notification prompt button has `aria-label="Activar notificaciones"`. | 4.1.2 |
| 13 | **Fix price chip contrast** | Active filter chips (e.g., `$68K - $22.1M`) meet ≥ 4.5:1 ratio. | 1.4.3 |

### P2 — Future Considerations (Minor, next sprint)

| # | Requirement | WCAG |
|---|------------|------|
| 14 | Add `aria-hidden="true"` to all 30+ decorative Lucide icons | 1.1.1 |
| 15 | Add visually-hidden H1 to homepage | 1.3.1 |
| 16 | Fix product detail heading hierarchy (product name should be H1) | 1.3.1 |
| 17 | Link error messages to inputs with `aria-describedby` | 3.3.1 |
| 18 | Return focus to trigger on filter dropdown close | 2.4.3 |
| 19 | Add `role="img"` + `aria-label` to ambassador banner background images | 1.1.1 |
| 20 | Wrap `DeviceIcon` component outputs with `aria-hidden="true"` | 4.1.2 |
| 21 | Announce toggle switch states more clearly | 4.1.2 |

---

## Success Metrics

### Leading indicators (measurable immediately after sprint)

| Metric | Current | Target | How to Measure |
|--------|---------|--------|---------------|
| Critical WCAG violations | 5 | **0** | Axe DevTools scan on all 4 key pages |
| Major WCAG violations | 10 | **≤ 5** | Axe DevTools scan |
| Unlabeled form inputs | 9+ | **0** | `document.querySelectorAll('input:not([aria-label])')` |
| Elements with visible focus ring | ~0% | **100%** | Manual keyboard tab-through on each page |

### Lagging indicators (track over following month)

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Accessibility-related bug reports | 0 new reports | Feedback system (`/api/feedback`) |
| Lighthouse Accessibility score | ≥ 90 | Chrome DevTools Lighthouse audit |

---

## Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| Should the `:focus-visible` ring color match the emerald brand (`#33C194`) or use a higher-contrast blue? | **Design** | Open |
| Do we want to add `prefers-reduced-motion` support in this sprint or defer? | **Engineering** | Open |
| Should product image alt text be auto-generated from Sheet data (name + type + color) or manually curated? | **Product** | Open |
| Are there any ambassador-facing views we should audit separately? | **Product** | Open |

---

## Timeline & Phasing

### Sprint scope (Week 1–2)
- **Days 1–2:** P0 items #1–2 (form labels + focus ring) — highest impact, unblocks keyboard navigation
- **Days 3–4:** P0 items #3–5 (contrast fixes + button names) — quick wins
- **Days 5–8:** P1 items #6–13 as capacity allows — prioritize image alt text and touch targets
- **Day 9–10:** Manual QA pass with keyboard-only navigation through all 4 key pages

### Dependencies
- None — all fixes are frontend-only CSS/JSX changes with no API or backend impact
- No design assets needed — fixes use existing design system tokens

### Follow-up sprint
- P2 items (minor issues)
- axe-core integration into CI pipeline
- Full VoiceOver + TalkBack QA pass

---

## Implementation Notes

### Global focus ring (recommended approach)

```typescript
// In MUI theme createTheme() → components
MuiButtonBase: {
  styleOverrides: {
    root: {
      '&:focus-visible': {
        outline: '2px solid #33C194',
        outlineOffset: '2px',
      },
    },
  },
},
// Plus a global CSS rule for non-MUI elements:
// *:focus-visible { outline: 2px solid #33C194; outline-offset: 2px; }
```

### Form label pattern (recommended approach)

```tsx
// For MUI TextField / Input components:
<TextField
  placeholder="Buscar..."
  inputProps={{ 'aria-label': 'Buscar esmeraldas por nombre' }}
/>

// For custom filter selects:
<Select aria-label="Filtrar por categoría">
```

### Image alt text pattern

```tsx
// In ProgressiveImage or gallery component:
alt={`${productName}, vista ${index + 1} de ${total}`}
// e.g., "Soberana Imperial, vista 1 de 5"
```

---

*Based on the WCAG 2.1 AA accessibility audit performed March 9, 2026 on Tierra Madre Studio (localhost:3000). Full audit report: `accessibility-audit.md`*
