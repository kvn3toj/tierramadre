# Fotosíntesis admin — UI/UX audit
**Date:** 2026-05-26 · **Audited surface:** `/admin/fotosintesis` (HomePage, LotesPage, CapturaLotePage with the new Insumo flow), `/lots/new`, `/lots/:id` · **Auditor:** UI/UX Pro Max heuristics + ISO 9241-110 + WCAG 2.1 AA + Nielsen heuristics.

## 0 · TL;DR

The new Insumo capture flow is *functionally* clean — typed sub-form, semantic radios, single-unit auto 100% preponderancia, hidden-by-default toggle, keyboard shortcut (`0`), and consistent visual language with the other tile types. There are no blocking issues for shipping.

Where there *is* a lot of room to grow is **space distribution**. Every Fotosíntesis screen is currently centered in a column that's narrower than ~840 px even on a 1280 px / iPad-landscape viewport, so the operator wastes ~30 – 50 % of horizontal pixels on each screen. Because these pages will primarily be used on desktop and iPad (not phones), the form factor should drive a **denser, side-by-side, two-column work layout**, not a single centered column. The Insumo flow is where this hurts most (item types, sub-form, preview, history all queue vertically when they could share the viewport).

The audit below is split into:
- §1 — Insumo registration flow (UX heuristics, micro-fixes)
- §2 — Space distribution & layout (per-screen recommendations with concrete `sx` patches)
- §3 — Accessibility & polish notes that apply across the board
- §4 — Prioritized backlog

---

## 1 · Insumo registration flow

### 1.1 What works (keep)

| What | Why it works |
|------|-------------|
| Pure-supplies lote via "Antes de empezar" intro with provider `tipo: insumos`, costo total + unidades. Lote ID preview (`B-001`) updates the moment a Bóveda is picked. | Recognition over recall (Nielsen #6). The operator sees the lote ID forming as they fill the cabecera — strong feedback on system status (ISO 9241-110 "self-descriptiveness"). |
| Tile grid `Tipo de ítem` includes the new `Insumo` tile (Wrench icon, key 0). All 10 subtypes share the same affordance, layout, key-hint, and active-dot pattern. | Consistency and standards (Nielsen #4). Operators don't have to learn a new pattern for Insumo. |
| Keyboard `0` shortcut, plus visible `Tecla N` hint on every tile. | Flexibility and efficiency of use (Nielsen #7). Expert operators can fly. |
| `InsumoFields` mirrors the BrutoFields/GemaFields layout: name → category tiles → cantidad / preponderancia row → optional Costo. | Internal consistency. Cognitive switching cost between item types is near-zero. |
| `Lote de un solo ítem` callout copies nombre + 100% preponderancia from the lote header when unidades = 1. | Conformity with user expectations (ISO 9241-110). Avoids retyping the same data the operator already entered one screen ago. |
| `Reserva oculta` toggle is **on by default for Insumos** — they don't leak to the public catalog. | Error prevention (Nielsen #5). A consumable supply never accidentally appears next to gems. |
| `EditItemDrawer` shows the Insumo sub-form (not a gema). | Round-trip integrity — what you saved is what you re-open. |
| Live cost calc: `Preponderancia 100 → = $ 150.000` rendered inline next to the field. | Visibility of system status (Nielsen #1) — the operator sees the cost share resolve as a real COP number, not just a percentage. |

### 1.2 Friction & micro-improvements

**1.2.1 The "single-supplies-lote" constraint is implicit and only discoverable by experimenting.**
A lote enforces that item preponderancias sum to 100%, so mixing one insumo into a gem lote forces the operator to mentally subtract the insumo's % from the gems. There is no UI hint when this is happening.

> **Fix.** When a lote is created with provider `tipo: gemas` (or `joyas`), and the operator selects the Insumo tile, render a small inline warning *under* the tile grid:
> "Este lote es de gemas. Si añadís un insumo, restará su preponderancia del costo de las gemas. Para insumos puros, creá un lote con proveedor de tipo *insumos*."
> Severity: low; Effort: small (~15 LOC inside `CapturaLotePage`, just gate on `provider.tipo` + `selectedSubtipo === 'insumo'`).

**1.2.2 `Certificado` and `Foto del ítem` fields render for Insumos with no visible scoping.**
A magnifier or pinzas won't have a GIA certificate. Showing the field invites the operator to wonder "do I need this?" — that's friction (Nielsen #8 — aesthetic and minimalist design).

> **Fix.** In `CapturaLotePage`, gate the `Certificado` block on `fieldKind !== 'insumo'`. Keep `Foto del ítem` (a quick photo of the new tool is fine) but rename label to `Foto (opcional)` for insumos. Severity: low; Effort: tiny.

**1.2.3 `Categoría` tiles have empty 4th column on wide layouts.**
With 6 categories on a 3-column grid you get 2 rows of 3 — fine on iPad portrait, but on iPad landscape and desktop the same 6 tiles look slightly orphaned because the surrounding form is so narrow. See §2 for the broader fix.

**1.2.4 Costo (COP) — label says "opcional, costo de compra".**
Two slightly redundant adverbs. Once we set `optional="opcional, costo de compra"` and the FieldLabel adds the optional pill, the rendered label reads `COSTO (COP) opcional, costo de compra`. The second clause is the helpful one; "opcional" is already conveyed by the pill style.

> **Fix.** `<FieldLabel optional="costo de compra">Costo (COP)</FieldLabel>` — the pill style already communicates "optional". Severity: trivial.

**1.2.5 Save shortcut `⌘/Ctrl+Enter` isn't surfaced for Insumo.**
The shortcut works (it's at the page level), but the button label and `ShortcutTable` don't show it for the insumo state. Operators won't try it unless they know it exists.

> **Fix.** Show `Guardar y siguiente ⌘↵` as the button label when keyboard focus is in the form (or always, with a small subtle hint). Severity: low; Effort: small.

**1.2.6 The "Lote de un solo ítem" callout color and density compete with the FieldLabel above.**
The callout is the second visual heavyweight on the screen after the tile grid, and it sits *between* the tile selection and the Nombre field. It interrupts the read-down flow. Operators will tend to skip-read it after the second use.

> **Fix.** After first use (track in `localStorage`), collapse it into a single-line muted hint above the Nombre field: `ℹ︎ Heredando 100% del lote · cambiar`. Click reveals the original block. Severity: low; Effort: medium.

**1.2.7 Empty/active state for the tile grid is good but the *unselected* tiles have an ambiguous hover-active visual.**
Reading `InsumoFields.tsx` lines 144 – 161 / 341 – 354: both `CategoriaPicker` and `TypeSelector` use `background: foto.accent.soft` on hover. The hover background is the same as the active background. On a tile group that's visually scanned at speed, this creates a brief flicker of "wait, is that the selected one?".

> **Fix.** Make hover and active two distinct steps:
> ```ts
> background: isActive
>   ? foto.accent.soft
>   : 'transparent',
> '&:hover': {
>   background: isActive ? foto.accent.soft : foto.surfaces.inset,
> },
> ```
> Severity: medium (affects every tile group, not just Insumo). Effort: trivial.

### 1.3 Live-flow trace (what I walked)

1. `/admin/fotosintesis/lots/new` → "Antes de empezar" intro renders. Lote ID preview updates to `B-001` the moment `Bogotá` is selected. ✅
2. Proveedor combobox loads 1 result — `Edwin Mauricio Ruiz · CC 80179071 · gemas`. ⚠️ No filter chips to pre-narrow by provider type. (See §1.2.1.)
3. Costo total = 150.000 → inline calc renders `$ 150.000`. ✅
4. Unidades declaradas → 1 → "Empezar captura" activates → navigates to `/lots/B-001`. ✅
5. Capture page TicketHeader renders the lote summary (B-001 · Edwin Mauricio · 26 may · $ 150.000 · — · Contado · transferencia) with a 0/100 preponderancia bar. ✅
6. Tile grid shows 10 subtypes, default `Gema` active. Click "Insumo" tile (key 0) → active state moves cleanly. ✅
7. `InsumoFields` renders below: Nombre del insumo (placeholder "Ej. Lupa triplete 10x"), Categoría tiles, Cantidad placeholder `1`, Preponderancia `100` already filled (✅ auto-100 because unidades=1), Costo (COP) blank, Foto del ítem dropzone, Certificado file input ⚠️ (see §1.2.2), Observación, Reserva oculta ON ✅.
8. Type "Lupa triplete 10x", pick `Óptica` → both tile and field reflect.
9. "Guardar y siguiente" is now active. (I stopped before saving to avoid polluting the dataset.)

The flow is mechanically correct. The friction is mostly cosmetic / scoping (see §1.2 items above).

---

## 2 · Space distribution — the bigger opportunity

> **User intent (confirmed):** Fotosíntesis admin pages are desktop-first / iPad-first, not phone-first. The screens should reward the available real estate, not pretend they're on a 390 px viewport.

### 2.1 Current state (what's wrong)

I measured the rendered viewport at 1316 × 905 (a typical iPad-landscape / small-desktop window). Across every Fotosíntesis admin page the content sits in a column **roughly 720 – 880 px wide**, centered, with **~220 – 300 px of dead margin on each side**. That is ~35 – 45 % wasted horizontal pixels.

Reading the source confirms it:

| Screen | Hard-coded width | Source |
|--------|------------------|--------|
| `NewLotIntro` ("Antes de empezar") | `maxWidth: 720` | `CapturaLotePage.tsx:589` |
| Captura de lote (item form) | Same shell, `~880px` effective | `CapturaLotePage.tsx` |
| LotesPage list rows | Single-column list, low density | `LotesPage.tsx` |
| HomePage greeting + stats | `~1000 px` 2-col grid (best of the bunch) | `HomePage.tsx` |
| LoteResumenPage | Same narrow shell | `LoteResumenPage.tsx` |

Additionally, **the public-facing bottom nav (`INICIO / TESOROS / EMBAJADORES / MÁS`) is still rendered on every admin page.** It's a "pill" floating tab bar designed for the catalog PWA. On an admin tool used by operators sitting at a Mac or iPad, it:
- eats ~80 px of vertical space at the bottom;
- competes with the form's own action row (`Cancelar ítem` / `Guardar y siguiente` / `Cerrar lote`);
- offers navigation the operator never uses inside Fotosíntesis (Tesoros / Embajadores are public surfaces, not admin destinations).

### 2.2 Where the space should go (the redesign target)

Following **Swiss Modernism 2.0** and the **Data-Dense Dashboard** patterns from the ui-ux-pro-max library:

> A 12-column grid, `gap: 1rem`, `--card-min-width: 280px`, `--sidebar-width: 240px`, `--header-height: 56px`. Content uses the full viewport up to a sensible cap (~1440 px). Side margins scale fluidly.

Concrete targets, per breakpoint:

| Breakpoint | Container max-width | Layout |
|------------|---------------------|--------|
| `< 900px` (phone, small iPad portrait) | 100 vw with 16 px padding | Single column — today's behavior, keep it |
| `≥ 900px` (iPad portrait) | `min(100vw - 32px, 960px)` | Two-column work area (form + side rail) |
| `≥ 1200px` (iPad landscape, laptops) | `min(100vw - 48px, 1280px)` | Three zones: nav-rail (240 px) + form (flex) + side rail (320 px) |
| `≥ 1600px` (external monitor) | `1440 px` cap | Same as 1200, with extra breathing room |

### 2.3 Per-screen recommendations

#### 2.3.1 NewLotIntro ("Antes de empezar")

**Now:** Single 720 px column. All 8 fields stack. Costo / fecha pair-up on `sm`. Submit button right-aligned inside the card.

**Better (iPad+):** Two columns side-by-side:

```
┌────────────────────────────┬───────────────────────────┐
│  Datos del lote            │  Pago                     │
│  Bóveda  ▢ ▢ ▢ ▢          │  Forma de pago tabs       │
│  Proveedor  [search]       │  Método (sub-segment)     │
│  Fecha · Costo · Unidades  │  Crédito subform / hint   │
│  Renombre · Peso           │                           │
│  Tratamiento · Mina        │  Observaciones (textarea) │
│                            │  ┌────────────────────┐   │
│                            │  │  Empezar captura → │   │
│                            │  └────────────────────┘   │
└────────────────────────────┴───────────────────────────┘
```

Concrete change to the wrapper at `CapturaLotePage.tsx:586 – 593`:

```tsx
<Box sx={{
  maxWidth: { xs: '100%', md: 1080, xl: 1280 },
  marginX: 'auto',
  paddingX: { xs: 2, sm: 3, md: 4 },
  paddingY: { xs: 3, md: 5 },
}}>
  ...
  <Box component="form" onSubmit={onSubmit} sx={{
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
    gap: { xs: 2, md: 3 },
  }}>
    <Box sx={{ display: 'grid', gap: 2 }}>{/* Datos del lote */}</Box>
    <Box sx={{ display: 'grid', gap: 2 }}>{/* Pago + observaciones + CTA */}</Box>
  </Box>
</Box>
```

Submit button stays in the right column, anchored under "Observaciones". On `< md` it falls back to today's stack.

#### 2.3.2 Captura de lote — the item form

**Now:** Single column, 880 px-ish, with the type tile grid on top, then the sub-form, then photo / certificado / observación, then the action row, then below the fold (off-screen) is the item bandeja.

**Better (iPad landscape +):** Three regions side-by-side once you're past 1100 px:

```
┌────────────────┬─────────────────────────┬─────────────────┐
│  Tipo de ítem  │  Sub-form (Gema/Insumo) │  Bandeja        │
│  (sticky col,  │  (flex column, scroll   │  Ítems guardados│
│   240px,       │   independent)          │  · 8 cards      │
│   keyboard 1–9)│  · Nombre               │  · Drag to edit │
│   ▢ Piedra      │  · Categoría tiles      │  · Live PRE     │
│   ▢ Gema  ●    │  · Cantidad/Preponderancia│ · ProgressRing │
│   ▢ Lote        │  · Costo                │                 │
│   …             │  · Foto / Cert / Obs    │                 │
│   ▢ Insumo      │  · Reserva oculta       │                 │
│   ▢ Otros       │  ─────────────────       │                 │
│                 │  [Cancelar · Guardar]   │                 │
└────────────────┴─────────────────────────┴─────────────────┘
```

The header (TicketHeader + Preponderancia bar) becomes a *sticky* row at the top, so the operator never loses the running cost / preponderancia total while scrolling the sub-form.

Two LOC-level fixes that buy a lot:

```tsx
// CapturaLotePage outer container
<Box sx={{
  maxWidth: { xs: '100%', md: 1080, lg: 1320, xl: 1440 },
  marginX: 'auto',
  paddingX: { xs: 2, sm: 3, md: 4 },
}}>

// Inside the captura "card"
<Box sx={{
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    md: '220px 1fr',          // sidebar of tipo tiles + form
    lg: '220px 1fr 320px',    // + side bandeja
  },
  gap: { xs: 2, md: 3 },
  alignItems: 'start',
}}>
  <TypeSelector ... sx={{ position: 'sticky', top: FOTO_TOPBAR_HEIGHT + 16 }} />
  <FormColumn ... />
  <BandejaColumn ... /> {/* only renders ≥ lg */}
</Box>
```

This reuses the existing `TypeSelector` and item bandeja components — no new components needed, just a different parent grid.

Also: at `lg+` lay out the tile grid **vertically** as a single column (one tile per row, full-width labels) instead of 3 × n. That makes the sub-form the visual hero, gives the tiles plenty of room for their `Tecla 1…0` hints, and adds breathing room between tiles.

#### 2.3.3 Categoría tiles in `InsumoFields`

**Now:** 3-column grid at `sm+` with 6 options → 2 rows. The right edge of the row often has a near-empty 4th cell-feel because the form column is wide enough to fit 6 across.

**Better:** Once the form column is ~700 – 900 px (the new `lg` layout), bump category tiles to a 6-across single row:

```tsx
// InsumoFields.tsx ~line 128
gridTemplateColumns: {
  xs: 'repeat(2, minmax(0, 1fr))',
  sm: 'repeat(3, minmax(0, 1fr))',
  md: 'repeat(6, minmax(0, 1fr))',
},
```

Same change pattern applies to the lote-type tile grid in `TypeSelector` (line 322 – 330) — let it grow to `repeat(5, …)` at `md` and `repeat(10, …)` at `xl` if the operator wants every type visible at once. The icon + label + key hint are already compact enough.

#### 2.3.4 LotesPage list

**Now:** Single-column list, each row ~64 px tall, mostly white space on the right. Useful info per row: ID, status, name, provider, mina. 13 lots → 13 rows = lots of scrolling.

**Better (≥ md):** Dense data table with sortable columns and a sticky filter bar:

| ID | Estado | Renombre | Proveedor | Mina | Operador | Recibido | Costo | Ítems | Pre. | Acciones |
|----|--------|----------|-----------|------|----------|----------|-------|-------|------|----------|

Row height 36 – 40 px. Status uses a colored dot + label, not a full pill. Mona-spaced ID and costo for tabular numerals. Click row → drawer-style detail; double-click → full page.

If a table is too much engineering for now, the cheapest mid-step is a **2-column card grid** on `md+`:

```tsx
gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }
```

with each card showing 2 – 3 secondary fields (provider, mina, recibido, costo). That doubles density immediately with no schema change.

#### 2.3.5 HomePage (Inicio)

**Now:** Already 2-col greeting + 4 stat cards, then a "Continúa con B-001" callout, then 3 action cards. Best of the lot, but still bottoms out at ~1000 px.

**Better:** Bump container to 1200 – 1280 px max-width and switch the stats from inline to a **dashboard KPI strip** (4 cards in a row, each ~280 px), with a sparkline per KPI. The "Continúa con B-001" callout sits as a "next action" panel on the right side at `lg+`, freeing the wide horizontal band for the KPI strip and recent activity feed.

#### 2.3.6 The mobile bottom nav on admin pages

Single most impactful change for the operator experience: **hide the public PWA bottom nav inside `/admin/fotosintesis/*` on `md+`.**

```tsx
// FotosintesisLayout or wherever the layout decides which nav to show
const showPublicNav = useMediaQuery(theme.breakpoints.down('md'));
{showPublicNav && <PublicBottomNav />}
{!showPublicNav && <FotoTopbar />}  // admin uses the topbar only
```

On phone-sized viewports, keep the bottom nav (operators sometimes do a quick check on phone). On desktop / iPad landscape, the top breadcrumb (`Fotosíntesis / Captura de lote`) is sufficient — and recovers ~80 px of vertical space for actual work.

#### 2.3.7 TicketHeader (the lote summary on the captura page)

**Now:** Single horizontal row of 5 meta values + a long thin preponderancia bar below.

**Better:** Make this row **sticky** (`position: sticky; top: 0`) with a subtle backdrop blur, so when the operator scrolls deep into the sub-form (e.g., to upload photos / write observation), they never lose sight of the lote's costo total and remaining preponderancia. Pair it with the `PreponderanceRing` as a circular indicator on the right edge — much more readable than a thin bar for "how full is the lote".

---

## 3 · Cross-cutting accessibility & polish

| Item | Severity | Where | Fix |
|------|----------|-------|-----|
| `cursor-pointer` on hoverable tiles | Already correct — `cursor: 'pointer'` is set on `Box component="label"`. ✅ | — | — |
| Focus rings on tile group | The hidden radios get default-but-invisible focus. Click focus is fine; **keyboard tab focus is not visible** on the tile itself. | `TypeSelector.tsx`, `CategoriaPicker.tsx` | Add `'&:focus-within': { outline: \`2px solid ${foto.accent.primary}\`, outlineOffset: 2 }` to the label `Box`. |
| Color contrast on `foto.ink.tertiary` for tile sub-labels (`Tecla 7`, `pinzas, alicates`) | Renders at ~`#94A3B8` on `#F5F5F5`. That's ~3.3:1 — fails WCAG AA 4.5:1 for body text. | All tile groups | Bump `foto.ink.tertiary` to a darker token (`#475569` slate-600) or only use it for the sub-label when the tile is active. |
| Touch target — tile height ~56 px. ✅ Meets 44 × 44. | — | — | — |
| `aria-live` on Preponderancia bar | The bar updates silently when an item is saved — screen-reader users miss it. | `PreponderanceRing` | Wrap value in `<span aria-live="polite">{value}/100</span>`. |
| `Reserva oculta` toggle label | Today reads "Reserva oculta" + body copy. Screen readers don't get the body context attached to the switch. | Captura form | `aria-describedby={helperId}` on the Switch, with the helper text receiving the id. |
| Empty Directorio page (I navigated to `/directorio` and got a blank screen) | High — looks broken | `App.tsx` routing | Either remove the route or render a placeholder; this is a *trust* issue. |
| Public bottom nav overlapping the in-form action row | High on iPad portrait | Layout | See §2.3.6. |
| `Choose File` native button on Certificado | Looks unstyled against the rest of the form. | Captura form | Wrap in a `<label>` styled like the photo dropzone, hide the native input. |
| Reduced-motion compliance | Most transitions are `120ms ease`; safe. ✅ | — | — |
| `prefers-color-scheme: dark` | Admin pages always render `getFoto('light')` regardless of OS. Operators working at night get a bright screen. | Foto theme | Pass `useTheme().palette.mode` instead of hardcoding `'light'`. |

---

## 4 · Prioritized backlog

### Now (this week — high-impact, low effort)

1. **Bump every admin container `maxWidth` to ≥ 1080 px on `md+`, ≥ 1280 px on `lg+`.** — Single config change in `CapturaLotePage`, `LotesPage`, `HomePage`, `LoteResumenPage`. Instant 30 – 40 % more usable space.
2. **Hide the public PWA bottom nav on `/admin/fotosintesis/*` at `md+`.** — One `useMediaQuery` + conditional render.
3. **Distinguish hover ≠ active in tile groups** (§1.2.7). — Two-line `sx` change.
4. **Gate `Certificado` field on `fieldKind !== 'insumo'`** (§1.2.2). — Single conditional.
5. **Fix `foto.ink.tertiary` contrast** (§3 table). — Token-level change.
6. **Fix the broken Directorio page** or remove the link.

### Next (the layout redesign — 1 sprint)

7. **NewLotIntro → 2-column work area** (`Datos del lote` | `Pago + observaciones + CTA`) — §2.3.1.
8. **Captura de lote → 3-zone layout** (tipo rail | sub-form | bandeja) — §2.3.2.
9. **TicketHeader sticky + PreponderanceRing on the right** — §2.3.7.
10. **InsumoFields category tiles → 6-across on `md+`** — §2.3.3.

### Later (when there's appetite)

11. **LotesPage → data-table or 3-col card grid** — §2.3.4.
12. **HomePage → KPI strip with sparklines + activity feed on the right** — §2.3.5.
13. **Mid-flow lote-mismatch hint** when inserting Insumo into a gem lote (§1.2.1).
14. **Dark-mode support** across admin pages (§3 table).
15. **First-use vs. nth-use collapse for "Lote de un solo ítem" callout** (§1.2.6).

---

## 5 · Why this matters (one-line case)

Operators using Fotosíntesis on iPad and desktop right now read top-to-bottom through a ~720 px-wide column with no way to keep the lote summary, the item bandeja, and the active sub-form all visible at once. Every save round-trips them through ~3 screens worth of scroll. Re-laying the page as a 3-zone work area on `lg+` viewports compresses that round-trip into a single field-of-view — fewer scroll events, less cognitive load, and a tool that feels worthy of the work the team does inside it.

---

*Audited by Claude using the [ui-ux-pro-max](file:///var/folders/56/99rpf4bx32jffm131bq74mv80000gn/T/claude-hostloop-plugins/56139c039208d1cf/skills/ui-ux-pro-max) skill, against Nielsen's 10 heuristics, ISO 9241-110:2020, WCAG 2.1 AA, and the project's own `CLAUDE.md` conventions.*
