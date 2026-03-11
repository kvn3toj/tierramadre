# Accessibility Audit: Tierra Madre Studio

**Standard:** WCAG 2.1 AA | **Date:** March 9, 2026
**URL:** http://localhost:3000 | **Tool:** Manual + automated code audit

---

## Summary

**Issues found: 23** | **Critical: 5** | **Major: 10** | **Minor: 8**

The Tierra Madre app has a solid accessibility foundation — it includes a skip-navigation link, proper landmark regions, a `lang="es"` attribute, descriptive `aria-label` attributes on key interactive elements, and well-structured ARIA regions for carousels and galleries. However, there are notable gaps in color contrast, form labeling, icon accessibility, and keyboard focus visibility that need attention.

---

## Perceivable (WCAG 1.x)

| # | Issue | WCAG Criterion | Severity | Location | Recommendation |
|---|-------|---------------|----------|----------|----------------|
| 1 | **"VER TODO" link fails contrast** — green text (`rgb(51,193,148)`) on white background yields **2.28:1** ratio (requires 4.5:1) | 1.4.3 Contrast (Minimum) | 🔴 Critical | Homepage — "Estrenos" section | Darken the green to at least `#1a7a5c` or use a darker background |
| 2 | **"Limpiar" filter button fails contrast** — red/coral text on dark background, small text with insufficient ratio | 1.4.3 Contrast (Minimum) | 🔴 Critical | Tesoros — filter bar | Use a bolder color or increase font weight/size |
| 3 | **Price range chip text** (`$68K - $22.1M`) — green text on dark background at small size, ratio is borderline | 1.4.3 Contrast (Minimum) | 🟡 Major | Tesoros — active filter chips | Increase text brightness or size |
| 4 | **Product images use filename as alt text** — e.g., `alt="IMG_5076.HEIC"` instead of a meaningful description | 1.1.1 Non-text Content | 🟡 Major | Product Detail — main gallery image | Use the product name + descriptive text (e.g., "Soberana Imperial emerald ring, front view") |
| 5 | **Thumbnail images use generic alt** — `alt="Thumbnail 1"`, `alt="Thumbnail 2"` | 1.1.1 Non-text Content | 🟡 Major | Product Detail — thumbnail strip | Use "Soberana Imperial, view 2 of 5" pattern |
| 6 | **Video elements lack `aria-label` and captions** — `<video>` in MediaPreview has no accessible name or `<track>` element | 1.2.2 Captions, 1.1.1 Non-text Content | 🟡 Major | MediaPreview component | Add `aria-label="Video de [product name]"` and consider adding subtitle tracks |
| 7 | **Decorative icons (Lucide) missing `aria-hidden="true"`** — MapPin, Star, Eye, Play, User, ShoppingBag, etc. used alongside text but not hidden from screen readers | 1.1.1 Non-text Content | 🟢 Minor | TreasureCard, AmbassadorProfile, GalleryPreview, StatBox (30+ instances) | Add `aria-hidden="true"` to all decorative icons that appear next to visible text |
| 8 | **"ESENCIA Y PODER" subtitle** — low contrast emerald green on dark gradient background | 1.4.3 Contrast (Minimum) | 🟢 Minor | Login page | Increase subtitle brightness |

---

## Operable (WCAG 2.x)

| # | Issue | WCAG Criterion | Severity | Location | Recommendation |
|---|-------|---------------|----------|----------|----------------|
| 9 | **No visible focus indicators on most interactive elements** — buttons, links, and cards show `outline: none` or transparent outlines when focused via keyboard | 2.4.7 Focus Visible | 🔴 Critical | App-wide | Add a visible focus ring (e.g., `outline: 2px solid #33C194; outline-offset: 2px`) to all focusable elements, or use `:focus-visible` for keyboard-only styling |
| 10 | **Small touch targets** — several icon buttons and nav items are under 44×44px (measured: 28×28, 32×32, 36×40) | 2.5.5 Target Size | 🟡 Major | Bottom nav icons, filter chips, gallery dots | Ensure all interactive elements have at least 44×44px touch area (use padding if needed) |
| 11 | **Carousel dots lack keyboard interaction** — gallery pagination dots are not keyboard-navigable | 2.1.1 Keyboard | 🟡 Major | Homepage — hero gallery | Make dots focusable with `tabindex="0"` and add `role="tab"` + `aria-selected` pattern, or use arrow keys |
| 12 | **Product cards not keyboard-activatable** — cards use click handlers but no `role="link"` or `tabindex` for keyboard users | 2.1.1 Keyboard | 🟡 Major | Tesoros — product grid | Wrap cards in `<a>` tags or add `role="link"` + `tabindex="0"` + Enter key handler |
| 13 | **Filter dropdowns trap focus** — opening a filter dropdown doesn't return focus on close | 2.4.3 Focus Order | 🟢 Minor | Tesoros — filter bar | Return focus to the trigger button when dropdown closes |

---

## Understandable (WCAG 3.x)

| # | Issue | WCAG Criterion | Severity | Location | Recommendation |
|---|-------|---------------|----------|----------|----------------|
| 14 | **9+ form inputs without labels** — search input and multiple filter inputs have no `<label>`, `aria-label`, or `aria-labelledby` | 3.3.2 Labels or Instructions | 🔴 Critical | Tesoros — search bar and all filter inputs | Add `aria-label` to each input (e.g., `aria-label="Buscar esmeraldas"`) |
| 15 | **Range slider labeled only by placeholder** — the "Multiplicador de precio" range input relies solely on nearby text | 3.3.2 Labels or Instructions | 🟡 Major | Settings dialog | Add explicit `aria-label="Multiplicador de precio"` or use `<label for="">` |
| 16 | **Toggle switches lack state announcement** — checkboxes for "Modo Oscuro", "Moneda", "Compartir Precios" don't announce current state clearly | 4.1.2 Name, Role, Value | 🟢 Minor | Settings/Theme dialogs | Ensure `aria-checked` reflects current state and label includes context |
| 17 | **Error messages not linked to inputs** — validation errors (e.g., "Error validando usuario") appear as alerts but aren't programmatically tied to the input that caused them | 3.3.1 Error Identification | 🟢 Minor | Login page | Use `aria-describedby` to link error messages to relevant controls |

---

## Robust (WCAG 4.x)

| # | Issue | WCAG Criterion | Severity | Location | Recommendation |
|---|-------|---------------|----------|----------|----------------|
| 18 | **Buttons without accessible names** — 1 button on product detail page contains only an SVG icon (refresh) with no text or `aria-label` | 4.1.2 Name, Role, Value | 🔴 Critical | Product Detail — refresh media button | Add `aria-label="Recargar imágenes"` |
| 19 | **Notification bell button has no accessible name** — contains only an icon | 4.1.2 Name, Role, Value | 🟡 Major | Homepage — notification prompt | Add `aria-label="Activar notificaciones"` |
| 20 | **Missing H1 on homepage** — heading hierarchy starts at H2 ("Estrenos"), skipping H1 | 1.3.1 Info and Relationships | 🟢 Minor | Homepage | Add a visually-hidden H1 (e.g., "Catálogo de Esmeraldas Tierra Madre") |
| 21 | **Product detail uses H1 for "Galería" instead of product name** — the product name "Soberana Imperial" has no heading level | 1.3.1 Info and Relationships | 🟢 Minor | Product Detail | Make the product name the H1; use "Galería" as a visual label only |
| 22 | **DeviceIcon component returns bare SVGs** — Smartphone, Tablet, Monitor icons rendered without `aria-hidden` | 4.1.2 Name, Role, Value | 🟢 Minor | Admin — Analytics views | Wrap icons with `aria-hidden="true"` since labels are adjacent |
| 23 | **Ambassador banner uses CSS background-image** — no alternative text for meaningful banner images | 1.1.1 Non-text Content | 🟢 Minor | Ambassador Profile | If the banner conveys meaning, use `role="img"` with `aria-label` |

---

## What's Working Well ✅

The audit found several strong accessibility practices already in place:

- **Skip navigation link** — `"Saltar al contenido principal"` is present and links to `#main-content`
- **Language attribute** — `<html lang="es">` is correctly set
- **Landmark regions** — `<main>`, `<nav>`, `<header>`, `<footer>` are all present
- **ARIA regions on carousels** — the product carousel includes `"Carrusel de nuevos productos. Usa las flechas izquierda y derecha para navegar."` which is excellent
- **Product cards as `<article>` elements** — with full descriptive text (e.g., `"Corazon de Fuego, 0.56 quilates"`)
- **Social links have `aria-label`** — WhatsApp, Instagram, Sitio web all labeled
- **Hero gallery images have descriptive alt text** — e.g., `"Equipo Tierra Madre contemplando la cordillera colombiana"`
- **Live regions present** — `role="status"` and `role="alert"` are used for notifications
- **Bottom navigation clearly labeled** — each tab has visible text + icon
- **Dialog elements use proper `role="dialog"`** — with heading and close buttons

---

## Priority Fixes

### 1. 🔴 Add `aria-label` to all filter inputs (Critical — affects all screen reader users)
The Tesoros page has 9+ unlabeled inputs. This is the highest-impact fix.

### 2. 🔴 Add visible focus indicators (Critical — blocks keyboard-only users entirely)
Without focus rings, sighted keyboard users cannot navigate the app at all. Add a global `:focus-visible` style.

### 3. 🔴 Fix "VER TODO" contrast ratio (Critical — text is unreadable for low-vision users)
The green-on-white ratio of 2.28:1 is less than half the 4.5:1 requirement.

### 4. 🔴 Add accessible names to icon-only buttons (Critical — invisible to screen readers)
The refresh button on product detail and notification bell have no names.

### 5. 🟡 Improve product image alt text (Major — gallery context lost for blind users)
Replace filename-based alt (`IMG_5076.HEIC`) with descriptive text using the product name.

### 6. 🟡 Add `aria-hidden="true"` to decorative icons (Major — screen reader noise)
This is a bulk fix affecting 30+ Lucide icon instances across the app.

### 7. 🟡 Ensure 44×44px minimum touch targets (Major — mobile usability)
Bottom nav icons, filter chips, and carousel dots should all meet the minimum.

---

## Suggested Global CSS Fix for Focus Visibility

```css
/* Add to your global styles or MUI theme */
*:focus-visible {
  outline: 2px solid #33C194 !important;
  outline-offset: 2px !important;
}
```

---

*Audit performed via Chrome extension live testing + static code analysis of 15+ component files. For complete WCAG 2.1 AA compliance, a follow-up audit with VoiceOver/NVDA and Axe DevTools is recommended.*
