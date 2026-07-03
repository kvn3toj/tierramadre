# Tierra Madre — Redesign v2 · "Una joya en calma"

Implementation reference for the **Quiet Emerald** redesign, imported from the
claude.ai/design project _"Tierra Madre design evolution"_
(`Tierra Madre Redesign v2`, 13 pages / ~20 screens).

> Source: https://claude.ai/design/p/6bfa7ffe-2938-4cf7-94df-3d971525878f

## Design language

The complete evolution of the system, **without the busy vitrine**. Grayscale
from edge to edge, editorial typography, and air. The **only saturated color in
the whole app** is the brand emerald `#00AF84`, reserved for primary actions and
moments of brand. Everything else is neutral gray.

### Color

| Token           | Value               | Use                                           |
| --------------- | ------------------- | --------------------------------------------- |
| Emerald primary | `#00AF84`           | Primary actions, active states, brand isotype |
| Emerald dark    | `#00785C`           | Hover / pressed on primary                    |
| Emerald light   | `#34C99B`           | Subtle tints, tone dots                       |
| Grayscale       | `#FFFFFF → #0D0F11` | Everything else                               |
| Dark-mode base  | `#0D0F11`           | Near-pure black; emerald stays the only color |

### Typography — three roles

| Role            | Family                     | Use                                                               |
| --------------- | -------------------------- | ----------------------------------------------------------------- |
| Serif (display) | **Cormorant** · 28–64      | Piece names, page titles ("Catálogo", "Una joya en calma")        |
| UI              | **Hanken Grotesk** · 12–18 | Body & navigation, clarity above all                              |
| Mono            | **DM Mono**                | Data & gemology — carats, prices, specs, codes (`4.20 ct · MUZO`) |

### Components (from the Style Tile)

- **Card ("Tarjeta"):** piece image on a soft neutral well → serif name →
  DM Mono spec line (`OVAL · 2.4 CT`) → mono price (`$ 4.200.000`). Hairline
  border, minimal shadow, quiet hover.
- **Buttons:** primary = solid emerald ("Añadir a cotización", "Ingresar");
  secondary = outline/ghost ("Guardar pieza"); tertiary link ("Ver ficha →").
- **State:** "No disponible" = muted gray.
- **Filter chips:** pill; active = solid dark fill, inactive = light gray.

## Screens in the deck

Customer app (mobile-first · tablet · desktop):

1. **Inicio** — discovery: hero piece + Colecciones (Muzo/Coscuez/Chivor) + Recién llegadas. Bottom tabs: Inicio · Catálogo · Tesoro · Perfil.
2. **Catálogo** — 2-col grid of pieces, tabs Todas / Muzo / Coscuez / Chivor.
3. **Búsqueda** — filters in a bottom sheet: Origen, Talla, Tono (dots), Quilates slider → "Ver N resultados".
4. **Ficha** — product detail: gallery, gemology block (mono), CTAs.
5. **Más pantallas** — Acceso (login), gestión de cotizaciones, certificado, chat con asesor.
6. **Acceso** — brand entry: emerald "Ingresar", "¿Sin cuenta? Solicitar acceso".
7. **Mis cotizaciones** — history + statuses.

Operations panel (Fotosíntesis · `/admin/fotosintesis`) — 2 home directions:

- **A · Tablero de operaciones** — thin KPI ribbon (Disponibles / Lotes abiertos / Ventas / Inventario valorado), one dominant action ("Retomar captura"), agenda "Para hoy", and the real **pipeline** (Compra → captura → cierre → catálogo → venta) as actionable cards. Zero filler.
- **B · Bitácora** — activity/log-oriented alternative.

Modes: **light + dark**. Breakpoints: **mobile · tablet · desktop**.

## Implementation status

Full rebuild of the **three `_standalone_build.html` screens** (Catálogo · Detalle ·
Cotización) to spec fidelity. Every conflict point where the mockups omit a shipped
feature ships **two A/B variants** behind a live toggle (bottom-left `A · Fiel` /
`B · Mockup`, or `?redesign=literal`): **faithful** keeps existing functionality
reskinned; **literal** matches the mockups exactly.

**Foundation**

- [x] Fonts loaded (Cormorant, Hanken Grotesk, DM Mono in `index.html`)
- [x] Tokens rewritten to the **authoritative cool `themes()` map** — `quiet-emerald.ts`
      now carries the exact light+dark hexes (distinct `--border`/`--hairline`, three-step
      emerald `accent`/`accent-strong`/`accent-pure`/`on-accent`, `qeTokens`, `qeAccent`,
      `qeShadow`); `getQuietEmerald()` returns the full set (back-compatible).
- [x] **Global theme** (`ThemeContext.tsx`) — `palette.primary` is mode-aware; the
      contained button uses `--accent-strong` (#006F52) + `--on-accent` (restores WCAG AA).
- [x] A/B variant infra — `useRedesignVariant` (provider-free store, URL + localStorage)
  - `RedesignVariantToggle`.

**Screens**

- [x] **Catálogo** — editorial Cormorant header + DM-Mono count, `Todas/Muzo/Chivor/
Coscuez` origin tabs (wired to a `procedencia` quick-filter, list-pagination-aware),
      near-square card geometry + asymmetric gutters (`VirtualGrid`), `GridCard` **A** (quiet
      hairline card, de-glassed overlays) / **B** (frameless mockup), desktop name+price
      baseline row; gold chip removed, chips retoned to qe emerald.
- [x] **Detalle** — full gem-sheet (`GemSheetParts`): FICHA header, Cormorant title + mono
      spec line, Fórmula panel, Identidad/Gema/Procedencia groups, Rareza dots + Calificación,
      Minerales/Complementos pills, Relato, trust card, price+CTA bar — mapped to real fields,
      self-hiding when absent. **A** keeps MediaGallery + certificate/provenance/cart/
      esmereogénesis; **B** = literal hero (pips + 46×46 thumbs) + "Añadir a cotización".
      All data logic (lote, admin overlay, favorites, share, provider guards) preserved.
- [x] **Cotización** — discount now emerald (not red), total gets the accent-pure dot +
      large near-black figure, Cormorant item names + mono spec + near-black price, gold fully
      removed, flat "Generar PDF" (accent-strong); emerald repointed across the document.

**Verified**

- [x] `tsc --noEmit` (frontend + api) clean; `vite build` green.
- [x] Adversarial fidelity + regression review (multi-agent) — 5 confirmed findings fixed
      (list-view origin/pagination consistency, provider add-to-cart guard on literal detail,
      bottom-bar currency-multiplier consistency, desktop card baseline row, quote spec-line
      origin segment).

**Deferred / out of scope (this pass = the 3 core screens only)**

- [ ] App shell: bottom-nav restyle + tablet/desktop top-nav switch, Acceso/`WelcomeScreen`
      conversion (still legacy — the earlier "Auth / Acceso done" claim was overstated).
- [ ] Operations panel (Fotosíntesis dashboard, direction A·Tablero) — separate track;
      already a mature `getFoto`-based subsystem, not a clean net-new build.
- [ ] Quote refinements: dedicated **WhatsApp** action button (needs a handler threaded
      through the parent) and full HeaderSection **meta-rows** (Cliente/Asesor/Fecha) — the
      header currently keeps the logo + repointed emerald.
- [ ] Global `emeraldCore` / gold retirement across the other ~60 files (unchanged;
      `#00AE7A` vs `#00AF84` is visually indistinguishable, `getFoto` admin gold untouched).
- [ ] Dark-mode QA pass in the running app; `npm run build` before commit (bumps APP_VERSION).

Use tokens via: `import { qeFont, qeTokens, getQuietEmerald, qeEmerald } from "../design-system";`
