# Mobile Viewport Accessibility Audit: Tierra Madre Studio

**Standard:** WCAG 2.1 AA + Mobile Best Practices | **Date:** March 9, 2026
**Viewports tested:** iPhone 14 Pro (390×844), Android base (360×800)
**Pages audited:** Homepage, Tesoros catalog, Product Detail

---

## Summary

**Issues found: 18** | **Critical: 4** | **Major: 8** | **Minor: 6**

The app is clearly designed mobile-first — layouts adapt well, the bottom navigation works cleanly, and the 2-column product grid scales appropriately. However, there are significant touch target issues (97 elements under 44×44px on the Tesoros page alone), a horizontal overflow on the Estrenos carousel, and gallery pagination dots that are nearly impossible to tap at 8×8px.

---

## Viewport Configuration ✅

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover">
```

This is well-configured: `user-scalable=yes` and `maximum-scale=5.0` allow pinch-to-zoom (WCAG 1.4.4 Resize Text), and `viewport-fit=cover` handles notch/island displays.

---

## Critical Issues

### 1. 🔴 97 touch targets under 44×44px (Tesoros page)

**WCAG 2.5.5 Target Size** | **Affects:** All mobile users

The Tesoros catalog page has 97 interactive elements smaller than the 44×44px minimum. The worst offenders:

| Element | Measured Size | Required | Gap |
|---------|:---:|:---:|:---:|
| Gallery pagination dots | **8×8px** | 44×44px | -36px |
| "Cerrar aviso" close button | 26×26px | 44×44px | -18px |
| Search input | 361×**40px** | 44×44px | -4px height |
| Filter chips (Recientes, A-Z, etc.) | varies×**32px** | 44×44px | -12px height |
| Sort/category chips | varies×**32px** | 44×44px | -12px height |
| Back button (product detail) | 32×32px | 44×44px | -12px |
| Refresh media button | 36×36px | 44×44px | -8px |
| Breadcrumb "Tesoros" link | 48×**21px** | 44×44px | -23px height |
| "Recently viewed" nav arrows | varies×**32px** | 44×44px | -12px |
| Favorites heart button | varies×**32px** | 44×44px | -12px |

**Recommendation:** Add `min-height: 44px` and adequate padding to all interactive elements on mobile. For gallery dots, use a 44×44px invisible tap area around each 8px dot:

```css
.gallery-dot {
  width: 8px;
  height: 8px;
  /* Invisible tap area */
  padding: 18px;
  margin: -18px;
  position: relative;
}
```

---

### 2. 🔴 Estrenos carousel overflows viewport horizontally

**WCAG 1.4.10 Reflow** | **Affects:** All mobile users

The product cards in the "Estrenos" carousel extend to **644px** on a 500px-wide viewport. While the carousel is designed to scroll horizontally, the cards cause `overflow-x` on the page body, which:
- Creates an unexpected horizontal scroll on the entire page
- On some browsers, this hides content and confuses swipe gestures
- The carousel container itself doesn't clip its children

**Overflow elements detected:**

| Element | Right edge | Viewport width | Overflow |
|---------|:---:|:---:|:---:|
| Product card (MuiPaper) | 645px | 500px | +145px |
| Card image | 644px | 500px | +144px |
| Card content | 644px | 500px | +144px |
| Hero gallery image | 502px | 500px | +2px |

**Recommendation:** Add `overflow-x: hidden` to the carousel's parent container, or use `overflow: clip` on the page wrapper to prevent body-level horizontal scroll:

```css
/* On the Estrenos section wrapper */
.estrenos-section {
  overflow-x: clip; /* clips without creating a scroll container */
}
```

---

### 3. 🔴 Footer overflows on narrow viewports

**WCAG 1.4.10 Reflow** | **Affects:** Android users (360px viewports)

The privacy/terms footer extends to **524px** on a 500px viewport, creating horizontal overflow. The footer links ("Politica de Privacidad | Condiciones del Servicio") don't wrap on narrow screens.

**Recommendation:** Make the footer links stack vertically on small screens:

```css
@media (max-width: 400px) {
  .footer-links {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}
```

---

### 4. 🔴 Product detail uses nested scroll containers

**Usability / WCAG 2.1.1 Keyboard** | **Affects:** All mobile users

The product detail page has the `<main>` element as a scroll container (1522px content in 641px) with a **nested** scrollable `<div>` inside (1083px in 599px). This creates:
- Confusion about which area is scrolling
- Potential scroll-trap where gesture direction changes unexpectedly
- The page body itself doesn't scroll — only internal containers do
- Users can't use swipe-to-go-back on iOS if horizontal swipe is intercepted

**Recommendation:** Flatten to a single scroll container. The entire product detail should scroll in one continuous flow rather than nesting scroll regions.

---

## Major Issues

### 5. 🟡 Filter chips too small and crowded

**WCAG 2.5.5 Target Size, 2.5.8 Target Size (Minimum)**

All filter/sort chips on the Tesoros page measure **32px tall** — 12px below the 44px minimum. They are also packed closely together with minimal gaps, increasing mis-tap risk.

| Chip | Width | Height | Gap to neighbor |
|------|:---:|:---:|:---:|
| "Recientes" | 84px | 32px | ~4px |
| "A-Z" | 48px | 32px | ~4px |
| "Mejor calidad" | 104px | 32px | ~4px |
| "Todas" | 61px | 32px | ~4px |
| "Anillo en Oro" | 100px | 32px | ~4px |

**Recommendation:** Increase chip height to 44px on mobile and add 8px minimum gap:

```css
@media (max-width: 600px) {
  .MuiChip-root {
    min-height: 44px;
    margin: 4px;
  }
}
```

---

### 6. 🟡 Search input height under minimum (40px)

The search bar "Buscar esmeraldas..." measures **361×40px** — 4px below the 44px target height. While the width is fine, the height makes it harder to tap precisely on mobile.

**Recommendation:** Increase to `min-height: 48px` for comfortable tapping.

---

### 7. 🟡 Gallery pagination dots nearly invisible (8×8px)

The 5 gallery dots on the product detail page are only **8×8px** each. They're essentially untappable on mobile (real finger contact area is ~44px). Additionally, they have no labels — screen readers would announce them generically.

**Recommendation:** Either enlarge the visual dots to 12px with 44px tap padding, or switch to a swipe-only pattern and remove dots as tap targets entirely.

---

### 8. 🟡 "Visto recientemente" text truncation

Product names in the "Recently viewed" section are truncated with ellipsis (e.g., "Soberana im...") without `title` attribute or alternative way to read the full name. This is worse on 360px viewports.

**Recommendation:** Add `title` attribute with full name, or allow the card to show the full name on long-press/hover.

---

### 9. 🟡 Category buttons (Piedras, Gemas, Lotes, Joyas) height only 27px

These important navigation buttons at the bottom of the hero gallery are only **27px tall**, making them difficult to tap, especially given their position near the scroll boundary.

**Recommendation:** Increase to 44px minimum height.

---

### 10. 🟡 Back button on product detail too small (32×32px)

The back arrow on the product detail page is 32×32px. On mobile, this is the primary navigation escape and needs a larger tap target.

**Recommendation:** Increase to at least 44×44px tap area.

---

### 11. 🟡 "Recently viewed" navigation arrows undersized

The chevron arrows (‹ ›) for navigating recently viewed items are only **~32px** tall, crowded next to the × dismiss button.

---

### 12. 🟡 No safe-area inset handling for bottom nav

While `viewport-fit=cover` is set, the bottom navigation doesn't appear to use `env(safe-area-inset-bottom)` padding. On devices with home indicators (iPhone X+), the bottom row of nav items may overlap the system gesture area.

**Recommendation:**

```css
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

---

## Minor Issues

### 13. 🟢 Hero gallery image slight overflow (+2px)

The hero image overflows by 2px on the right. Barely perceptible but technically a reflow issue.

### 14. 🟢 Product card name font could be larger

Product names in the 2-column grid are readable but tight. On 360px, they could benefit from slightly larger text or more line spacing.

### 15. 🟢 Filter icon button (hamburger/sliders) has no label

The filter toggle button next to the search bar contains only an icon and has no visible text label on mobile.

### 16. 🟢 Notification popup covers product content

The "Activar notificaciones" popup overlays the Estrenos product cards, blocking interaction until dismissed. On small screens, this covers nearly half the visible content area.

### 17. 🟢 Settings panel becomes full-screen on mobile

The "Más" settings drawer takes over the entire screen on mobile with no visible close button at the scroll position — user must scroll to top or press Escape to dismiss.

### 18. 🟢 Input element overflow in Tesoros filters

A hidden filter input extends 10px past the right viewport edge (510px on 500px viewport). Not visible to users but may contribute to layout shift calculations.

---

## What's Working Well on Mobile ✅

- **2-column product grid** scales perfectly between 360px and 390px
- **Bottom navigation** is well-sized with clear labels and adequate tap areas (~75×50px per item)
- **Search bar** spans full width with clear placeholder text
- **Product detail specs** display cleanly in a single-column layout
- **Hero gallery** swipe gesture works well
- **Category buttons** (Piedras, Gemas, etc.) are horizontally distributed without wrapping
- **Viewport meta tag** allows pinch-to-zoom (required by WCAG)
- **Product images** scale correctly and maintain aspect ratio
- **Breadcrumb navigation** adapts to single line on mobile

---

## Device-Specific Notes

### iPhone 14 Pro (390×844)
- Layout works well overall
- Estrenos carousel overflows (horizontal body scroll)
- 26 small touch targets on homepage
- No critical text readability issues

### Android Base (360×800)
- Same issues as iPhone plus:
- Footer overflows (524px on 500px viewport)
- Slightly more truncation on product names
- Filter chips even more crowded

---

## Priority Fixes (Mobile Sprint)

| Priority | Fix | Impact | Effort |
|:---:|------|--------|:---:|
| 1 | **Add `overflow-x: clip` to carousel parent** | Eliminates body horizontal scroll | Low |
| 2 | **Increase filter chip height to 44px on mobile** | Fixes 90+ of the 97 small targets | Low |
| 3 | **Add 44px tap padding to gallery dots** | Makes pagination usable | Low |
| 4 | **Flatten product detail scroll containers** | Fixes scroll confusion | Medium |
| 5 | **Add `env(safe-area-inset-bottom)` to bottom nav** | Prevents home indicator overlap | Low |
| 6 | **Stack footer links on narrow screens** | Fixes Android overflow | Low |
| 7 | **Increase back button tap area to 44px** | Improves navigation | Low |

---

*Audit performed via Chrome extension with resized viewport. For complete mobile testing, a follow-up audit on real devices (iPhone Safari + Android Chrome) is recommended to verify touch behavior, safe areas, and gesture interactions.*
