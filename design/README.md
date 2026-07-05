# Handoff: Tierra Mädre — “Quiet Emerald” redesign

## Overview
Tierra Mädre is an iOS app for a Colombian emerald house — a sales tool advisors use to browse loose stones, open a gem’s full technical sheet, and assemble a client quote. This handoff covers the **redesign of the three core screens** (Catálogo, Detalle de producto, Cotización) plus their tablet/desktop responsive behavior, moving the app from its current look (**“Emerald iOS”** — green + gold, glassmorphism, depth) to a new visual system called **“Quiet Emerald.”**

The idea of Quiet Emerald in one line: **one brand green, full grayscale everywhere else, quiet luxury — the only saturated color in the product is the emerald itself.** The old system’s gold, glass blur, colored shadows, and heavy depth are removed. Type does the luxury work (a Cormorant display serif), and the stone photography carries all the color.

## About the design files
The files bundled here are **design references built in HTML** — prototypes that show the intended look and behavior. They are **not** production code to copy line-for-line, and they are not a real iOS/React codebase. They use a small in-house rendering runtime (`support.js`, the `<x-dc>` / `<dc-import>` / `<sc-for>` tags) purely so the mockups render in a browser.

Your task: **recreate these screens in Tierra Mädre’s actual codebase, using its existing environment and patterns.** If the app is SwiftUI/UIKit, build them there; if it’s React Native or another stack, use that. If no environment exists yet, pick the most appropriate framework for an iOS-first product and implement there. Treat the HTML/CSS values below as the exact design spec (this is a hi-fi handoff), but implement with the platform’s native components, layout system, and design-token mechanism.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and radii are final and specified exactly below. Recreate the UI pixel-accurately using the codebase’s own libraries. Where a value is given (hex, px, weight), match it. Reference screens are drawn at a **375 pt logical iPhone width** (390–393 pt devices are fine — the layout is fluid with fixed 16 px side gutters).

---

## Design language: what changes vs. the current app

| Aspect | Current — “Emerald iOS” | New — “Quiet Emerald” |
|---|---|---|
| Accent | Bright green **+ gold** as a second accent | **One** brand green; **no gold anywhere** |
| Everything non-accent | Cool blue-grays, tinted | **True neutral grays** (warm-neutral, near-zero chroma) |
| Surfaces | Glassmorphism — translucent panels, `backdrop-blur`, glass borders | **Flat opaque surfaces**, hairline borders, no blur |
| Depth | Colored/green drop shadows, layered cards | **Minimal shadow**; structure via 1 px hairlines |
| Display type | Sans (SF-style) | **Cormorant** serif for titles/prices-as-display |
| Product image | Rounded, framed, shadowed | Near-square, small 4–6 px radius, image is the only color |
| Feel | Techy, glossy, “fintech” | Editorial, gallery, quiet-luxury |

Keep the green **restrained**: it appears only on primary actions, the active nav/filter state, brand marks, and verification/trust moments. Do not tint neutral surfaces green.

---

## Design tokens

Implement these as semantic tokens (SwiftUI `Color` set, CSS custom properties, or your token system). There are **two themes** in the new system — Light and Dark — plus the retired current-app tokens for reference during migration.

### New — Quiet Emerald · Light (default)
```
--bg            #F7F8F8   app background
--surface       #FFFFFF   cards, sheets
--surface-2     #F1F2F2   image wells, chips-fill, inset panels
--border        #E4E7E5   1px component borders, thumb outline
--hairline      #EBEDEC   1px row dividers / section rules
--text          #14181A   primary text
--muted         #5C6360   secondary text, body copy
--subtle        #8C928F   captions, mono labels, placeholder
--accent        #00785C   brand green — labels, links, active state
--accent-strong #006F52   primary button fill
--on-accent     #FFFFFF   text on accent
--accent-pure   #00AF84   brightest green — dots / trust indicators only
--shadow        0 18px 40px -24px rgba(13,30,24,0.30)   (used very sparingly)
```

### New — Quiet Emerald · Dark
```
--bg            #0E1110
--surface       #15191A
--surface-2     #1B1F1F
--border        #272C2B
--hairline      #222726
--text          #EAEDEB
--muted         #9AA09D
--subtle        #6B726F
--accent        #34C99B
--accent-strong #00AF84
--on-accent     #06140E
--accent-pure   #34C99B
--shadow        0 20px 46px -26px rgba(0,0,0,0.8)
```

### Grayscale ramp (reference — Light)
`#FFFFFF · #F6F7F7 · #EBEDEC · #E4E7E5 · #C9CECB · #9AA09D · #5C6360 · #3A403E · #14181A`

### Retired — “Emerald iOS” (current app, for migration mapping only — do NOT ship)
Light accent `#00AE7A`, gold `#B8941F` / `rgba(212,175,55,0.14)`, glass `rgba(255,255,255,0.72)` + `blur(9px)`, blue-tinted grays (`#F2F2F7`, `#D6DCE2`, subtle `#6B7A8A`). **Removed in the new system**: gold tokens, all `glass*` tokens, colored shadows. When you find these in the codebase, retire them.

---

## Typography

Three families. Load Cormorant + Hanken Grotesk + DM Mono (Google Fonts) or map to the nearest platform equivalents.

| Role | Family | Usage | Sizes seen | Weight | Notes |
|---|---|---|---|---|---|
| Display / serif | **Cormorant** | Screen titles, product names, big prices, quote total | 16–64 px | 500 | letter-spacing ~ -0.5→0.2 px; line-height 0.9–1.05 |
| UI / body | **Hanken Grotesk** | Nav, body copy, buttons, prices, values | 9–18 px | 300–700 | default 400/500; buttons 600 |
| Mono / data | **DM Mono** | Gemology data, ct/mine specs, codes, ALL-CAPS eyebrows | 8.5–13 px | 400–500 | letter-spacing 0.05–0.16em, often `text-transform:uppercase` |

Type scale used across the screens (px): mono eyebrows **8.5–10**, captions **9–11**, body **12–13**, UI titles **17**, section serif **24–30**, screen serif **30**, board serif **40–64**. Minimum readable size on device is ~9 px mono for data labels — don’t go smaller.

Recurring pattern: a **mono ALL-CAPS eyebrow** in `--subtle` or `--accent` sits above a **Cormorant** heading. Data rows pair a mono uppercase key (`--subtle`) left with a Hanken value (`--text`, weight 500) right.

---

## Screens

All three phone screens share the shell: fixed **header**, scrolling **content**, fixed **bottom bar**. Side gutters are **16 px**. Respect `safe-area-inset-bottom` on the bottom bar (`padding-bottom: calc(14px + safe-area)`).

### 1. Catálogo (product grid)
**Purpose:** advisor browses available stones and taps one to open its sheet.

**Layout (top → bottom):**
- **Header** (`14px 16px 10px`): left = logo symbol (17×17) + `TIERRA MÄDRE` wordmark (11 px, weight 600, letter-spacing .26em). Right = search icon + hamburger, both 16 px stroke icons in `--muted`.
- **Title block** (`2px 16px 12px`): `Catálogo` in Cormorant 30 px / weight 500, and under it a mono caption `48 PIEZAS · ESMERALDAS DE COLOMBIA` (10 px, `--subtle`, letter-spacing .08em).
- **Filter tabs** (`0 16px 14px`, row, gap 18): `Todas` (active) / `Muzo` / `Chivor` / `Coscuez`. Active = `--accent`, weight 600, with a `1.5px solid --accent` bottom border; inactive = `--muted`.
- **Product grid** (`0 16px`): **2 columns**, `gap: 18px 12px`. Each card:
  - Image well: full width, `aspect-ratio: 1 / 1.06`, `background: --surface-2`, `border-radius: 4px`, `overflow:hidden`. Image is `object-fit:cover` then **scaled up** (`transform: scale(1.9–3.0)` with a per-stone `transform-origin`) so the gem fills the frame. No border, no shadow.
  - Name: Cormorant 16 px / 500, `margin-top: 9px`.
  - Spec: mono 9.5 px, `--subtle`, letter-spacing .05em (e.g. `4.20 ct · MUZO`).
  - Price: Hanken 12.5 px / 500, `--text`.
- **Bottom tab bar** (`9px 8px`, `border-top: 1px solid --hairline`, bg `--bg`): 4 equal columns, each an outline icon (19 px) over a 9 px label. Active tab (**Catálogo**) icon+label in `--accent` weight 600; others `--subtle` weight 400. Tabs: Catálogo, Cotizar, Bóveda, Perfil.

**Sample data (4 shown; catalog is 48):** Tayrona 4.20 ct MUZO $14,500 · Reflejo de Muzo 3.05 ct MUZO $9,800 · Cronos 2.14 ct CHIVOR $5,600 · Origen Eterno 2.68 ct CHIVOR $7,300.

### 2. Detalle de producto (gem sheet)
**Purpose:** full technical + provenance sheet for one stone; primary action adds it to the quote.

**Layout:**
- **Header** (`12px 16px 10px`, space-between): back chevron (18 px) · centered mono code `FICHA · TM-0184` (9.5 px, `--subtle`, letter-spacing .12em) · right = share + heart icons (17 px, `--muted`).
- **Scroll body** (hidden scrollbars):
  - **Hero image**: `margin:0 16px`, height **196 px**, `--surface-2` bg, `border-radius:6px`, cover+scaled gem. Bottom-center **progress pips**: 4 bars, active one `14px` wide in `--accent`, rest `5px` in `--border`.
  - **Thumbnail row** (`10px 16px 0`, gap 8): four 46×46 thumbs, radius 4, the selected one bordered `1px --accent`, others `1px --border`.
  - **Title** (`16px 16px 0`): `Tayrona` Cormorant 30 / 500; below, mono `4.20 CT · TALLA ESMERALDA · MUZO` (10 px, `--subtle`).
  - **“Fórmula Tierra Madre” panel** (`14px 16px 0`, `padding 12/14`, `--surface-2`, radius 8): mono eyebrow `FÓRMULA TIERRA MADRE` (8.5 px, `--subtle`) + a Cormorant **italic** line 17 px (`Muzo · 380 M de años · luz verde viva`).
  - **Spec groups**: three titled groups (`Identidad`, `Gema`, `Procedencia`). Each group: mono uppercase title in `--accent` (9 px, letter-spacing .14em), then rows. Each row: `border-top: 1px --hairline`, `padding: 8px 0`, left mono-uppercase key in `--subtle` (10 px), right value in `--text` 12.5 px / 500. (Full field list in the Content section.)
  - **Two stat cards** (`18px 16px 0`, gap 10, each `--surface-2` radius 8): (a) **Rareza** — mono eyebrow + a row of 5 dots (9 px, filled `--accent` for level, empty = transparent w/ `--border` ring) + caption `Nivel 4 · Excepcional`; (b) **Calificación** — Cormorant `9.2` 30 px with ` / 10` in `--subtle` 14 px + caption `Gemología TM`.
  - **Minerales asociados** & **Complementos**: each a mono `--accent` eyebrow + wrapping **pill chips** (`padding 5/11`, `border-radius 999px`, `1px --border`, text 11 px `--muted`). Minerales: Calcita, Pirita, Cuarzo, Albita. Complementos: Estuche de cedro, Certificado físico, Caja de viaje.
  - **Relato**: mono `--accent` eyebrow + body 12.5 px / line-height 1.6 / `--muted`, `text-wrap:pretty`.
  - **Trust card** (`--hairline` border, radius 8): dot (`--accent-pure`) + `Trazabilidad ADN de Paz · Verificado` (11 px `--accent` 600); divider; `Certificado TM-CGL · 2026` + mono subline, and a `Ver →` link in `--accent`.
- **Bottom bar** (`border-top: 1px --hairline`): left price block — `$14,500` (18 px / 600) over mono `COP 58.700.000` (9 px `--subtle`); right **primary button** filling remaining width, height **46 px**, radius 8, `--accent-strong` fill, `--on-accent` text 13 px / 600: **“Añadir a cotización”**.

### 3. Cotización (quote summary)
**Purpose:** review the assembled quote and export it.

**Layout:**
- **Header**: back chevron + `Cotización` Cormorant 24 / 500; right mono quote id `TM-2451`.
- **Meta rows** (`margin 0 16px`): Cliente / Asesor / Fecha — each `border-top:1px --hairline`, `padding 8px 0`, mono-uppercase key `--subtle` left, value 12.5 px / 500 right. (Sofía Restrepo · Camila Vélez · 30 jun 2026.)
- **Piezas** section: mono uppercase label, then line items. Each item: 42×42 thumb (radius 4) · name (Cormorant 16) + mono spec · right price (12.5 / 600) + qty (`× 1`, 9 px `--subtle`). Items: Tayrona $14,500, Cronos $5,600.
- **Totals block** (`border-top:1px --border`): Subtotal `$20,100` (`--text`); Descuento `− $1,000` (`--accent`); then a hairline divider and **Total** row — uppercase `TOTAL` label left, right a `7px` `--accent-pure` dot + `$19,100` Cormorant-adjacent 23 px / 600. Mono footnote right-aligned: `VÁLIDA 15 DÍAS · COP 77.300.000`.
- **Bottom bar** (2 buttons, gap 10): primary **Generar PDF** (flex-1, 46 px, `--accent-strong`, `--on-accent`, 13 / 600); secondary **WhatsApp** (auto width, `1px --border`, `--text`, 13 / 500).

### 4. Responsive — one structure, every screen
The catalog is **mobile-first and scales** to tablet and desktop with the same hierarchy: hairline grid, gem photo as the only color, nav moving from a **bottom bar (phone)** to a **top bar (tablet/desktop)**.
- **Tablet (~834 pt):** top nav bar (logo + wordmark left; Catálogo/Bóveda/Cotizaciones/Clientes; search + avatar right, all separated by a `1px --hairline`). Title `Catálogo` Cormorant 40. Grid = **3 columns**, `gap: 30px 24px`.
- **Desktop (~1440 px):** same top bar and title; grid = **4 columns**, same gaps. Card name+price share a baseline row (name Cormorant 19, price 13), spec mono below.
- Card image `aspect-ratio: 1 / 1.04` at these widths (vs `1 / 1.06` on phone). Grid template is literally `repeat(N, 1fr)`.

---

## Components (reusable)

- **Primary button** — height 46 (42 in style-tile), radius 8, fill `--accent-strong`, text `--on-accent` 13 / 600, centered. Full-width or flex-1.
- **Secondary button** — same metrics, `background:transparent`, `1px --border`, text `--text` 13 / 500.
- **Text link** — `--accent`, 13 / 600, optional trailing `→` (arrow icon 13 px stroke 1.8).
- **Pill chip** — `padding 5px 11px`, `border-radius 999px`, `1px --border`, text 11 `--muted`. Non-interactive metadata.
- **Filter tab** — inline text; active adds `1.5px solid --accent` underline + `--accent`/600; inactive `--muted`.
- **Data row** — flex space-between, `border-top:1px --hairline`, `8px 0`; mono-uppercase key `--subtle` / value `--text` 500.
- **Product card** — image well (`--surface-2`, radius 4–5, cover+scaled image) + serif name + mono spec + price. No border/shadow on the card itself.
- **Bottom tab bar (phone)** — `1px --hairline` top, 4 equal columns, 19 px outline icon + 9 px label; active `--accent`/600, inactive `--subtle`/400.
- **Stat card** — `--surface-2`, radius 8, `padding ~11/12`; mono eyebrow + content.
- **Section eyebrow** — mono uppercase, letter-spacing .14em, `--accent` (section) or `--subtle` (meta), sits above content.
- **Rarity dots** — 5 × 9 px circles; filled = `--accent`, empty = transparent with `1px --border` ring.
- **Progress pips** — active `14×3` `--accent`, inactive `5×3` `--border`, radius 2.
- **Phone status bar** (mock only): 9:41, Dynamic-Island pill, signal/wifi/battery — from the real OS on device; ignore for implementation.

**Icons:** simple line icons, stroke 1.5–1.6, `round` caps/joins, `currentColor`. Search (circle + handle), hamburger (3 lines), back chevron, share (tray + up arrow), heart, home, document, vault/square, person, right-arrow. Use the codebase’s existing icon set (SF Symbols equivalents: `magnifyingglass`, `line.3.horizontal`, `chevron.left`, `square.and.arrow.up`, `heart`, `house`, `doc.text`, `square.grid.2x2`/`lock`, `person`, `arrow.right`).

---

## Interactions & behavior

- **Catalog → Detail:** tapping a product card pushes the gem sheet. Filter tabs (Todas/Muzo/Chivor/Coscuez) filter the grid by mine; only one active.
- **Detail:** thumbnail row + hero pips = image carousel (tap/swipe changes the hero image and the active pip/thumb border). Heart = save to Bóveda (toggles). Share = OS share sheet. **“Añadir a cotización”** appends the stone to the active quote and (typically) confirms + updates the Cotizar tab badge/total. `Ver →` on the trust card opens the certificate.
- **Quote:** **Generar PDF** exports the quote; **WhatsApp** shares it via the WhatsApp share flow. Quote is `VÁLIDA 15 DÍAS` from creation.
- **Nav:** bottom tab bar switches Catálogo/Cotizar/Bóveda/Perfil (phone); top nav on tablet/desktop.
- **Motion:** keep it quiet — standard iOS push/pop and sheet transitions, ~200–300 ms ease. No parallax, no bounce, no glass-blur animation. Pressed state on buttons: slight opacity/scale, no color shift beyond the fill.
- **States to design/build:** loading (skeletons in `--surface-2` for image wells + shimmer-free placeholder rows), empty (no results after filter), and the “No disponible” state for a sold/unavailable stone (shown as `--subtle` text, action disabled).

## State management
- **Catalog:** `activeFilter` (mine), product list + pagination (48 items), per-card image transform config (zoom + origin) is content metadata, not UI state.
- **Detail:** `selectedImageIndex` (hero/thumbs/pips), `isSaved` (heart), current gem object.
- **Quote:** `quoteItems[]` (id, qty), derived `subtotal`, `discount`, `total`, `quoteId`, `client`, `advisor`, `date`, `validityDays = 15`. Adding from Detail mutates this shared quote.
- **Global:** `theme` (light/dark, follows system), `activeTab`.
- **Data fetching:** catalog list, single gem detail (specs, minerals, provenance, certificate ref), and quote CRUD come from the backend; the values in the mocks are representative sample data.

---

## Content / copy (exact strings)

- Brand: `TIERRA MÄDRE` · tagline `Esmeraldas con ADN de Paz` · `ESMERALDAS DE COLOMBIA`.
- Catalog caption: `48 PIEZAS · ESMERALDAS DE COLOMBIA`. Filters: `Todas`, `Muzo`, `Chivor`, `Coscuez`. Tabs: `Catálogo`, `Cotizar`, `Bóveda`, `Perfil`.
- Detail — code `FICHA · TM-0184`; Fórmula line `Muzo · 380 M de años · luz verde viva`; groups **Identidad** (Pieza: Esmeralda natural / Categoría: Gema suelta / Colección: Latido de la Tierra / Cantidad: 1 unidad), **Gema** (Peso 4.20 ct / Color Verde Muzo intenso / Calidad VS · Jardín leve / Talla Esmeralda · rectangular / Tipo Muzo / Subtipo Gota de aceite / Medidas 10.4 × 8.2 × 5.6 mm), **Procedencia** (Origen Muzo, Boyacá / Mina La Pita / País Colombia). Rareza `Nivel 4 · Excepcional`; Calificación `9.2 / 10 · Gemología TM`. Minerales: Calcita, Pirita, Cuarzo, Albita. Complementos: Estuche de cedro, Certificado físico, Caja de viaje. Relato (full paragraph in `DetailNew.dc.html`). Trust: `Trazabilidad ADN de Paz · Verificado`, `Certificado TM-CGL · 2026`, `Gemología · Cadena de custodia`, `Ver →`. Price `$14,500` / `COP 58.700.000`. CTA `Añadir a cotización`.
- Quote — id `TM-2451`; Cliente `Sofía Restrepo`, Asesor `Camila Vélez`, Fecha `30 jun 2026`; Subtotal `$20,100`, Descuento `− $1,000`, Total `$19,100`; `VÁLIDA 15 DÍAS · COP 77.300.000`; buttons `Generar PDF`, `WhatsApp`.

---

## Assets
In `assets/`:
- `logo-symbol.png` — Tierra Mädre mark (used at 17–30 px).
- `emeralds/` — stone photography: `tayrona.png`, `reflejo.png`, `cronos.png`, `origen.png`, `aria.png`, `gratitud.png`, `latido.jpg`, plus `ring-1.png`, `ring-2.png`.

**Important on images:** each stone photo is displayed `object-fit:cover` and then **scaled up** with a per-image `transform: scale(z)` + `transform-origin` so the gem is centered and fills the frame. Those per-image values are content metadata — carry them over (see the `raw` arrays in `CatalogNew.dc.html` / `CatalogWide.dc.html`), or, better, **pre-crop the production images** so no runtime transform is needed. In production these are real product shots from the catalog CMS.

Fonts (Google Fonts): **Cormorant**, **Hanken Grotesk**, **DM Mono**. Bundle them or map to nearest platform faces.

---

## Files in this bundle
Design references (open any in a browser to view; they render via `support.js`):
- `Tierra Madre Design Evolution.dc.html` — the master board: current vs. new, all three screens in light + dark, responsive, and the style tile. **Start here.**
- `CatalogNew.dc.html` — new Catálogo (phone).
- `DetailNew.dc.html` — new Detalle de producto (phone).
- `QuoteNew.dc.html` — new Cotización (phone).
- `CatalogWide.dc.html` — responsive catalog (tablet 3-col / desktop 4-col).
- `StyleTile.dc.html` — palette, type scale, buttons, product card (light + dark).
- `Phone.dc.html` — iPhone frame + the full **theme token map** for all four themes (`themes()` — authoritative token source).
- `assets/` — logo + emerald photography.
- `support.js` — the runtime that renders the `.dc.html` prototypes (reference only; not for production).

The `themes()` method in `Phone.dc.html` and the token tables above are the single source of truth for color. Everything else follows the per-screen specs here.
