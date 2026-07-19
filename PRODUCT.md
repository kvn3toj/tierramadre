# Product

## Register

product

## Users

Two distinct groups, one interface:

- **Asesores** (sales ambassadors) on an iPhone, in front of a client, showing emerald stones and building a quotation in seconds. Mobile-first, high-pressure, must never fumble.
- **The Tierra Madre team** on desktop, running inventory (Fotosíntesis/Atelier), analytics, and fulfillment. Data-dense, workflow-driven.

Both need the interface to disappear so the emeralds — and the sale — stay the focus.

## Product Purpose

Colombian Emeralds Catalog & Sales Platform ("Esmeraldas con ADN de Paz"). The core loop: **find a stone → show it beautifully → quote it → follow up.** Everything else — admin, analytics, fulfillment, ambassador management — is supporting cast to that loop.

Success looks like: an asesor closing a quotation on-site without the app getting in the way, and the back-office team running inventory/sales without fighting inconsistent UI across five different visual languages that accumulated pre-DS3.

## Brand Personality

**Una joya en calma** — a jewel at calm. Three words: gallery-quiet, editorially confident, never busy.

The governing metaphor is **la vitrina**: every screen is a museum vitrine. The emerald (or the primary action) is the only saturated thing in view, resting in a quiet neutral well. Chrome whispers; the stone speaks. Calm is a feature — no flicker, no scroll fights, no layout jumps, no color noise.

## Anti-references

Named explicitly by the project's own design system doc as the prior visual language ("v1 Emerald iOS") being retired:

- Silver/metallic chrome
- Emerald color used as a gradient fill on buttons
- Glass cards as a default content surface (glassmorphism-as-content, not chrome)
- `#00AE7A` (bright emerald) used as body/link text color
- Spring-bounce motion in product UI (springs are reserved for the isolated cinematic scope only)
- SF Pro as the brand typographic voice
- A second saturated hue anywhere in the UI competing with the emerald (a stray purple stat tile was the flagship example that triggered the DS3 migration)
- Generic SaaS clichés: hero-metric tiles, identical card grids, side-stripe borders as accents, gradient text

## Design Principles

1. **One system, theme is data, not a fork.** Exactly one canonical component set (`src/design-system/`); "Quiet Emerald," "Foto," and "Atelier" are theme presets (token objects) passed into the same components, never separate component libraries.
2. **One saturated color: the emerald.** Everything else is a cool, green-tinted grayscale. A second saturated hue on screen is either a semantic status color doing real work, or a bug.
3. **Borders-first depth, not shadows.** Structure comes from hairline borders and surface steps (`bg → surface → well`). One editorial shadow exists, reserved for true floating layers (sheets, popovers, the lightbox) — cards at rest carry no shadow.
4. **One scroller per view, heights are measured, never guessed.** Every nested scroller is deliberate and contained; magic-number height offsets are bugs.
5. **Calm is a feature.** Anti-blinking is motion law (synchronous cache init, geometry-matched skeletons, no layout jumps); no spring/bounce; reduced-motion is a hard gate, not an afterthought.

## Accessibility & Inclusion

WCAG 2.2 AA floor, explicitly specified by the project's design system:

- Contrast per the documented token contrast contract; the `subtle` text token sits below AA by design and may never carry body copy, interactive labels, or actionable information.
- Full keyboard path: tab order matches visual order; skip-link to main content.
- Icon-only buttons always carry `aria-label`; form fields are always labeled.
- Live regions announce async results.
- `prefers-reduced-motion` and `prefers-color-scheme` both honored; manual theme override persists.
- Meaningful `alt` text on product photography (not generic "image").
- Correct `lang` attributes per locale (ES/EN).
- Touch targets ≥ 44×44px with ≥ 8px gaps between adjacent targets.
