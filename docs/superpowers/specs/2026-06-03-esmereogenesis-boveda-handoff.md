# Esmereogénesis — "Bóveda" Redesign · Developer Handoff & Implementation Plan

**Date:** 2026-06-03
**Author:** Design (Kevin) + Claude
**For:** Claude Code (implementation in the `TierraMadre` repo)
**Status:** Design approved (prototype) · ready for engineering
**Type:** Re-skin + extend the existing Esmereogénesis feature into the game-like "Bóveda" direction, add a cool light mode, a product-page entry flow, and iPad/desktop responsiveness.

---

## 0. TL;DR for the implementer

The Esmereogénesis feature already exists in code (`src/pages/esmereogenesis/`, `src/components/esmereogenesis/`, `EsmereogenesisContext`). This handoff upgrades it to the approved **"Bóveda"** visual direction: an immersive, dark-cinematic, **game-like** experience where a **living emerald** grows as you "water" it, plus:

1. A **cool silver/platinum light mode** alongside the dark default (sun-icon toggle, persisted).
2. A **product-page entry**: the Esmereógenesis CTA (with a *Concepto / Precio·duración* variant) opening a **"¿Qué es Esmereogénesis?"** explainer ("ahorro con propósito, no es deuda").
3. A custom **emerald-cut** Tesoros tab icon.
4. **Responsive** layouts: mobile (390) → iPad (834) → desktop (1440).

Work **mobile-first**. Do **not** regress the existing data model, persistence, or routes — this is primarily a presentation/UX upgrade.

**Design source of truth (visual reference, for humans):** the interactive prototype in Claude Design — project "Esmereogenesis (Remix)", file `Esmereogenesis - Boveda.html`. This doc is self-contained; Claude Code should implement from this spec (it cannot open the design tool). If pixel-matching is needed, export that HTML from the design project and add it to the working directory as a reference artifact.

---

## 1. Overview & goal

**What it is.** Esmereogénesis is Tierra Mädre's *savings-with-purpose* method: instead of buying an emerald on credit, the user picks a stone and **riega** (waters) it with weekly **aportes** until it's fully funded, then **reclaims** the physical gem. Framed strictly as **"no es deuda, es ahorro con propósito."**

**Design thesis (Bóveda).** Inspiration: Forest / Finch. The emerald is a **living entity you care for**: it breathes, reacts to touch, and visibly **evolves through growth stages** as progress rises. Watering is an **animated ritual**, not a button press; reaching 100% triggers an **Eclosión** ceremony. The aesthetic is a dark, full-bleed cinematic "vault" with the gem as the glowing hero, premium type, and gold→champagne accents — plus a luminous cool-platinum light mode.

**Non-goals.** No backend/payment integration (still mock data). No change to the savings logic, plan model, or analytics events beyond what's listed in §11.

---

## 2. Tech stack & where it lives

Per `CLAUDE.md`: React 18.3 + TypeScript 5.6 · Vite 5.4 · **MUI v6** · React Router 7.9 · **Framer Motion 12**.

| Concern | Existing location (update in place unless noted) |
|---|---|
| Pages | `src/pages/esmereogenesis/EsmereogenesisHubPage.tsx`, `EsmereogenesisGardenPage.tsx` |
| Components | `src/components/esmereogenesis/*` (`LivingEmerald`, `OrganicRoots`, `ProgressGardenRing`, `EsmereoCreationSheet`, `EsmereoPlanCard`, `EsmereogenesisCTA`, `StreakIndicator`, `AporteHistoryTimeline`, `ClaimSheet`, `EsmereoEmptyState`, `GardenHero`, `BottomSheetShell`, `AbonoCinematic/`, `CompletedCelebration`, `OnboardingCoachmarks`) |
| State | `src/contexts/EsmereogenesisContext.tsx` |
| Types | `src/types/esmereogenesis.ts` |
| Theme hook | `src/hooks/useEsmereoThemeTokens.ts` |
| Design system | `src/design-system/` (barrel `index.ts`; `gradients.ts`, `motion.ts`, `glass.ts`, `accents.ts`, `ios-typography.ts`, `layout.ts`) |
| Theming (light/dark) | `ThemeContext` (existing) — wire the new cool-platinum light tokens here |
| Routes | `/esmereogenesis` (Hub), `/esmereogenesis/:planId` (Garden) in `src/App.tsx` |
| Product CTA host | `src/components/product/ProductActions.tsx` (+ `ProductDetailPage.tsx`) |

**Reuse, don't reinvent** (already in repo, per the 2026-04-28 spec):
- Cinematic phase orchestration → `src/components/vault/cinematic/useVaultCinematicSequence.ts` (model the watering ritual on this).
- Base progress ring → `src/components/gamification/ProgressRing.tsx`.
- Glow/halo → `src/components/vault/cinematic/VaultGemPointer.tsx`.
- Glass mixins → `src/design-system/mixins/liquidGlassMixins.ts`.
- Persistence pattern → `useCart.ts` (sync init from localStorage + `useEffect` persist).
- Gradients/motion tokens → `src/design-system/tokens/gradients.ts`, `motion.ts`.

> **Anti-blinking rules in `CLAUDE.md` still apply** (synchronous cache init, reserved aspect-ratio boxes, unique instance keys, preload, prefer instant swaps). The gem hero and any product imagery must follow them.

---

## 3. Design tokens

Add a Bóveda token group. Reference tokens, not raw hex, in components. Suggested additions to `src/design-system/tokens/` (or extend `esmereo` tokens / `useEsmereoThemeTokens`).

### 3.1 Color — Dark (default)

| Token | Value | Usage |
|---|---|---|
| `boveda.bg` | `#05100C` → near-black | Full-bleed screen background |
| `boveda.bgGlow` | radial `#0B5C46` @ low alpha behind gem | Vault atmosphere / light beam source |
| `emerald.gradient` | `#0B5C46 → #0E7C5A` | Gem body, primary CTA fill, ring fill |
| `emerald.ink` | `#7FE3B6` / `#CFF3E2` | Emerald text accents, kickers |
| `accent.gold` | `#D9A94B` | Streak flame, eclosión halo, "regada" % numerals (sparingly) |
| `surface.glass` | white @ 4–8% + blur | Cards / sheets (glassmorphism) |
| `surface.hairline` | white @ 8–12% | 1px card borders |
| `text.primary` | `#F4F8F6` | Serif titles, big numbers |
| `text.secondary` | `#9FB2AB` | Captions, provenance, body |

### 3.2 Color — Light ("daylight vault", **cool platinum — NOT cream**)

> ⚠️ Light mode must read **cool silver/platinum**, never warm cream/ivory. Gold shifts to a **cool champagne-platinum**.

| Token | Value | Usage |
|---|---|---|
| `bovedaLight.bg` | `#F6F8F9` | Screen background (cool off-white) |
| `bovedaLight.surface` | `#EDF1F2` | Raised cards/sheets (slightly cooler/darker than bg → real elevation) |
| `bovedaLight.hairline` | `#DCE3E5` | Card borders |
| `bovedaLight.shadow` | cool-grey, low-opacity (e.g. `rgba(40,55,60,.10)`) | Card/sheet elevation (no harsh black) |
| `bovedaLight.textPrimary` | deep cool slate `#16221E` | Titles/numbers (AA on bg) |
| `bovedaLight.textSecondary` | `#5B6B66` | Captions/body — **darkened for AA 4.5:1** (the previous light grey failed) |
| `emerald.ink` (light) | `#0B5C46` deep emerald | Accent/ink, kickers, the gem stays emerald |
| `accent.champagne` | cool champagne-platinum (e.g. `#C9CBB7`/silver) | Replaces gold in light mode |
| `bovedaLight.heroHalo` | soft cool silver-green radial | Stages the gem (see §5 hero) |

**Theming.** Dark is the default. The **sun/moon icon** (top-right of each screen) toggles light; persist the choice (`localStorage`, e.g. `esmereo-theme`). Wire through the existing `ThemeContext` + `useEsmereoThemeTokens` so every screen, sheet, status bar, scrim, and the Eclosión ceremony adapt. **AA contrast required**, no invisible text (a `transition: color` bug previously stranded text on the dark ink value — avoid blanket color transitions on theme switch).

### 3.3 Typography

| Token | Family / weight | Usage |
|---|---|---|
| `font.display` | **Playfair Display** (serif), italic for emphasis | Screen titles, gem names, big `%` and money numerals |
| `font.kicker` | sans, UPPERCASE, tracked (+0.18em) | Eyebrows: "COLECCIÓN GÉNESIS", "TU ESMERALDA", "NO ES DEUDA", "ASÍ FLORECE" |
| `font.body` | humanist sans | Body, captions, list rows |

### 3.4 Spacing / radius / elevation

- Base spacing scale (4-based): xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48.
- Card radius: **20px** (matches the refined Vitrina pass).
- Pill/quick-amount radius: full.
- Glass card: 1px hairline + soft inner glow (dark) / cool shadow (light).

### 3.5 Emerald-cut Tesoros icon (exact geometry — must match)

A landscape **emerald cut** (rectangle with 45° cut corners), thin strokes, **not** a pointed/brilliant diamond. Build as a dedicated icon component, `currentColor` stroke, used for the Tesoros tab (active + inactive) and any "tesoros/catalog" affordance.

```svg
<svg viewBox="0 0 100 76" fill="none" stroke="currentColor" stroke-width="4"
     stroke-linejoin="round" aria-hidden="true">
  <!-- outer octagon -->
  <path d="M26,6 L74,6 L94,26 L94,50 L74,70 L26,70 L6,50 L6,26 Z"/>
  <!-- step octagon -->
  <path d="M28,12 L72,12 L88,28 L88,48 L72,64 L28,64 L12,48 L12,28 Z"/>
  <!-- table octagon -->
  <path d="M35,21 L65,21 L79,35 L79,41 L65,55 L35,55 L21,41 L21,35 Z"/>
  <!-- 8 corner facets -->
  <path d="M26,6 L35,21 M74,6 L65,21 M94,26 L79,35 M94,50 L79,41
           M74,70 L65,55 M26,70 L35,55 M6,50 L21,41 M6,26 L21,35"/>
</svg>
```
Tune `stroke-width` to match the other tab icons' optical weight at ~24px.

---

## 4. The living emerald (`LivingEmerald`) — core visual

The gem is the hero on Hub, Plan, Producto, Empty, Eclosión. Update `LivingEmerald` (and `OrganicRoots`, `ProgressGardenRing`).

**Layered render (z ascending):** ambient glow / light beam → drifting mist + particles → **OrganicRoots** (taproot + curving side roots that bloom with progress, **not** a row of dots) → gem body (layered CSS gem: radial+conic gradients, specular highlight, faceting; a real product photo can drop into the circle later) → surface sheen → sparkles (progress > 50%) → **ProgressGardenRing** (emerald→gold conic arc with a gold bead marker).

**Growth stages** (drives gem brightness/saturation, particle density, root extent, and a playful badge label):

| Stage | Progress | Badge | Look |
|---|---|---|---|
| `semilla` | 0 (seeded/empty) | SEMILLA | dormant, dim, dust, no roots |
| `brote` | 1–24% | BROTE | first roots, faint glow |
| `creciendo` | 25–69% | CRECIENDO | brighter, more particles, roots spreading |
| `radiante` | 70–99% | RADIANTE | luminous, full roots, sparkles |
| `eclosión` | 100% | ✦ ECLOSIÓN | fully radiant, ascended, claim-ready |

**Props (extend existing):**
```ts
interface LivingEmeraldProps {
  imageSrc?: string;          // optional real photo; else CSS gem
  progress: number;           // 0–1
  stage: EsmereoStage;        // derived from progress
  size?: 'sm'|'md'|'lg'|'xl';
  isPulsing?: boolean;        // idle breathing
  recentAporteAt?: number;    // glow boost window after watering
  staged?: boolean;           // light-mode: render halo + pedestal/reflection (hero only)
  onPet?: () => void;         // tap-to-"pet": sparkle burst + spring scale
}
```

**Behaviors:** idle breathe (scale 1→1.02→1, ~3s loop); **tap-to-pet** → sparkle burst + springy scale; glow boost for ~30s after an aporte. In **light mode** the hero gem gets a **cool silver-green halo + a faint pedestal contact-shadow/reflection** and a clean soft light-cone (so it's staged in a showroom, not floating on white); small inline gems (plan cards) do **not** get pedestals. Respect `prefers-reduced-motion` (see §8).

---

## 5. Screens

All screens: top status row, a back affordance where relevant, the **sun/moon theme toggle** top-right, and the bottom **tab bar** (Inicio · Tesoros[emerald-cut] · 💧center · Diario/… · Más) — which becomes a **left side-nav** on desktop (§9).

### 5.1 Producto (entry) — `ProductActions` / `ProductDetailPage`
Gem hero (staged), `COLECCIÓN GÉNESIS / Tierra Mädre`, `ESMERALDA COLOMBIANA / Gota de Muzo / Muzo · Boyacá · 2,1 ct · Verde jardín`, price `$6.300.000 · Precio de la pieza · certificado CDTEC incluido`, description.
- **`VARIANTE DEL CTA` toggle:** **Concepto** (no numbers — `✦ Esmereógenesis / Hazla tuya, ahorrando con propósito`) vs **Precio · duración** (`$263.000/sem · 6 meses · sin intereses`). Toggle state persists (`localStorage`).
- The **Esmereógenesis CTA** is the premium hero option (emerald-tinted hairline + faint halo so it reads above the plain **Comprar ahora · $X**). Hint: "ⓘ Toca para conocer cómo funciona".
- Tapping the CTA opens the **context sheet** (§5.2). If a plan already exists for this item → deep-link to its Plan instead.

### 5.2 "¿Qué es Esmereogénesis?" context sheet (NEW component)
Bottom sheet (mobile) / centered modal (≥iPad). Content (copy is final):
- Kicker `¿QUÉ ES ESMEREOGÉNESIS?` · headline **"No es un crédito. *Es ahorro con propósito.*"**
- Intro: *"Esmereogénesis es una forma consciente de hacer tuya una esmeralda: en vez de pagarla a crédito, la riegas poco a poco con aportes a tu propio ritmo, hasta que cobra vida y la reclamas."*
- **NO ES DEUDA** card — 4 checkmarks: *Sin intereses · Sin cuotas que te persiguen · Sin multas si una semana no puedes regar · Tu progreso siempre es tuyo.*
- **ASÍ FLORECE** — steps **01 Elige** ("Elige tu esmeralda") · **02 Riega** ("Riégala a tu ritmo, sin presión") · **03 Reclama** ("Recláma­la cuando florezca"). *(Note: "Reclama" uses an award/medal icon — make sure the icon glyph exists in the set.)*
- Closing: *"Una relación, no una transacción — cuidas tu gema hasta que es tuya de verdad."*
- Primary **Comenzar mi Esmereogénesis** → Creation sheet (§5.3).
- Sheet has ✕, tap-outside, and swipe-down dismissal; inner scroll region.

### 5.3 Creación (`EsmereoCreationSheet`)
Header `VAS A SEMBRAR / Gota de Muzo / Meta $6.300.000 · Muzo · Boyacá`. "Aporte sugerido" coachmark. **DURACIÓN DE TU GÉNESIS** selector `3 / 6 / 9 / 12 MESES` → live **RITMO SEMANAL $X** ( = target ÷ (months×4) ) + narrative "Tu *Gota de Muzo* tomará vida en *X meses* con aportes de *$Y* por semana." Primary **Sembrar mi Esmereogénesis** → seeds plan, brief **"Sembrando…"** transition → Plan (seeded, ~3%). Footer "Sin permanencia · la piedra se reserva a tu nombre desde hoy."

### 5.4 Hub — "Tu jardín" (`EsmereogenesisHubPage`)
Greeting (`ESMEREOGÉNESIS / Tu jardín` or "Buenas noches, {name}"), the featured emerald with **growth-stage badge**, `%REGADA`, `ACUMULADO $X · META $Y`, `🔥 N semanas regando` streak, **Regar mi esmeralda** CTA + quick amounts (`$210k sugerido / $420k / $840k / Completar`) + "Próxima gota sugerida · {day}", and a **SEMANAS REGANDO** list (droplet rows). Multi-plan → an organic **jardín grid** of plan cards (`EsmereoPlanCard`, each a small `LivingEmerald` + name + % + streak). "+ Sembrar nueva Esmereogénesis".

### 5.5 Empty / "seed" state (`EsmereoEmptyState`)
Dormant gem in a soft beam, **"Tu jardín de esmeraldas espera"**, body copy, **Explorar el catálogo**, subtle **Cargar jardín de demostración**.

### 5.6 Plan / Jardín (`EsmereogenesisGardenPage`)
`TU ESMERALDA / {name}`, large `LivingEmerald` + ring, `TU PROGRESO` → big serif `%`, `$X / $Y`, **RITMO SUGERIDO $Z/semana** + streak, **Regar mi esmeralda** (+ "Aporte de $X · monto editable"), **FICHA DE LA PIEDRA** (Origen, Quilates, Color, Talla, Certificado CDTEC, Joyero), **BITÁCORA DE RIEGO · N gotas** timeline.

### 5.7 Watering ritual → §6. Eclosión → §6. Reclamada (claimed): "*{name} es tuya*", "Un asesor de Tierra Mädre te contactará…", **Volver a mi jardín**; Hub then shows the plan as **Esmeralda reclamada**.

### 5.8 Más
Ajustes + a tiny **flow map "El recorrido"** (tappable steps that jump the demo), **Reiniciar demo**, **Cargar jardín de demostración**, **Ver estado vacío**, **Explorar catálogo**.

---

## 6. Interactions & animation

Build with Framer Motion 12; reuse `useVaultCinematicSequence` for the ritual. All timings tunable.

### 6.1 Watering ritual ("Regar" → `AbonoCinematic`)
Trigger: tap **Regar mi esmeralda** (uses selected quick amount or editable amount). Optimistic: increment locally, then play sequence and persist on confirm.

| Phase | ~Time | Visual |
|---|---|---|
| anticipate | 0–0.5s | screen dims, gem centers |
| droplet | 0.5–1.5s | golden droplet falls from top |
| wash | 1.5–2.5s | splash + surface dust clears, gem brightens |
| reveal/bloom | 2.5–4.0s | facets emerge, **organic roots bloom** outward |
| progress | 4.0–6.0s | ring fills + **animated count-up** of the number |
| confirm | 6.0–7.0s | particles rise + "+$X" + springy bounce + sparkle |
| release | 7.0–7.5s | return to screen, gem visibly more alive |

**Skippable:** tap anywhere → condense to a 0.6s release (don't cut abruptly). Optional audio/haptics behind the global sound toggle (samples: gota / wash / bloom / chime). Advances money, %, and streak; updates growth stage.

### 6.2 Eclosión ceremony (reaching 100%)
Replaces the normal `confirm` when an aporte completes the plan: dark takeover → expanding **golden halo/ring** → gem **ascends + blooms** (no residual dust) → typewriter **"Tu esmeralda ha cobrado vida"** → golden **Reclamar mi esmeralda** button → Reclamada state.

### 6.3 Ambient / micro
Idle gem breathe + float; drifting mist/particles; shimmering beam (dark) / soft cone (light); glow pulse synced to streak; **tap-to-pet** sparkle; buttons spring on press; growth-stage crossfades.

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Gem | idle | scale 1→1.02→1 loop | 3s | gentle inout |
| Gem | tap | sparkle burst + spring scale | ~400ms | spring.gentle |
| Ring | aporte | arc fill + numeric count-up | ~2s | smooth |
| CTA | press | scale 0.97 spring-back | ~200ms | spring |
| Sheets | open/close | translateY in/out + scrim fade | ~300ms | smooth |
| Eclosión | 100% | halo expand + gem ascend + typewriter | ~4s | gentle |

---

## 7. Responsive behavior

Mobile-first. **Do not break the 390 layout.** Preserve navigation, ritual, Eclosión, and both themes at every size.

| Breakpoint | Layout |
|---|---|
| **Mobile (≤833 / base 390×844)** | Single column; **bottom tab bar**; sheets are **bottom sheets**; gem hero centered. (Unchanged.) |
| **iPad (834–1439 / target 834×1194)** | Generous margins; focused screens (Producto, Plan, sheets) in a centered **~640px column**; **larger cinematic gem**; **Hub & Plan two-pane** (gem beside stats/aportes); sheets become **centered modals**. |
| **Desktop (≥1440)** | **Slim left side-nav** replaces the tab bar; **full-bleed cinematic Hub as three panes** (state rail + large gem + progress/controls); Plan = gem-pane + data-pane; sheets are **centered modals**; larger gem hero; generous negative space. |

Use a single source of truth for breakpoints (MUI theme breakpoints or a `useBreakpoint` hook). The nav component should switch bottom-bar ↔ side-nav by breakpoint without duplicating route logic.

---

## 8. Accessibility

- **`prefers-reduced-motion`**: AbonoCinematic → simple 0.4s fade; disable pulses/shimmers/float; `LivingEmerald` shows final state immediately; Eclosión copy/state visible at rest.
- All buttons/toggles have descriptive `aria-label`s; the theme toggle announces target mode.
- Visible focus (emerald/cool outline) for keyboard nav; logical focus order; bottom sheets / modals **trap focus** and restore on close; ✕ reachable.
- `aria-live="polite"` on progress, streak, growth-stage, and completion changes.
- **AA contrast (4.5:1)** for all text in **both** themes — especially light-mode secondary/caption text.
- Touch targets ≥44px; quick-amount pills and tab items sized accordingly.

---

## 9. Edge cases & states

- **No plans / no storage:** Hub → empty seed state; product CTA opens Creation.
- **Existing plan for this product:** product CTA → "Continuar Esmereogénesis · X%" / deep-link to Plan (don't allow duplicate plans for the same item).
- **Claimed plan:** shows Reclamada final state; appears under "Adquiridas/Reclamadas" in Hub. No dead ends.
- **Streak broken (>1 wk no aporte):** streak resets to 0 on next aporte; **no visual regression** of the gem; informative toast "Tu racha se reinició, pero tu jardín sigue creciendo".
- **Aporte ≥ remaining:** confirmation → triggers Eclosión instead of normal ritual.
- **Animation interrupted:** condense to 0.6s release with confirmation visible.
- **localStorage full:** try/catch → sessionStorage fallback + warning toast.
- **Invalid `:planId`:** redirect to `/esmereogenesis` + toast.
- **Long strings / i18n:** kickers must **not wrap** (single-line, ellipsis if needed); CTA labels use a `nowrap` span for the main label; verify ES + EN.
- **Sheets with inner scroll inside a transformed parent:** ensure the scroll region works (this bit the prototype's capture, not real users — but verify on device).

---

## 10. Implementation plan (phased — for Claude Code)

Branch off `main` (e.g. `feature/esmereogenesis-boveda`). After **each** phase: `npm run build` must pass with no TS errors / no new console warnings; verify in `npm run dev` at `/esmereogenesis`. Use design-system tokens via the `@/design-system` barrel — **no hardcoded hex**.

**Phase 0 — Orientation.** Read the existing esmereogenesis pages/components/context/types and `useEsmereoThemeTokens`; read `useVaultCinematicSequence`, `ProgressRing`, gradients/motion tokens. Confirm current behavior at `/esmereogenesis`. *(Optional: drop the exported `Boveda.html` prototype into the repo as a visual reference.)*
*Done when:* you can list exactly which files change per phase.

**Phase 1 — Tokens, theme & icon.** Add Bóveda dark + cool-platinum light tokens (§3). Wire the **light mode** through `ThemeContext` + `useEsmereoThemeTokens` (persisted `esmereo-theme`; sun/moon toggle on every screen). Build the **emerald-cut icon** component (§3.5).
*Done when:* toggling theme recolors all surfaces/text/scrims with AA contrast and no stranded text; the Tesoros tab shows the emerald-cut icon (active + inactive).

**Phase 2 — Living emerald + growth stages.** Update `LivingEmerald` (layered gem, halo/beam, particles, **organic root tendrils**), `OrganicRoots`, `ProgressGardenRing` (emerald→gold + bead). Add `EsmereoStage` to types and a `stageForProgress()` helper; add `staged` (light hero) and `onPet`.
*Done when:* the gem breathes, pets, evolves through 5 stages, and stages the hero (halo + pedestal) in light mode.

**Phase 3 — Watering ritual.** Implement `AbonoCinematic` 7-phase sequence (§6.1) via a `useAbonoSequence` modeled on `useVaultCinematicSequence`; quick-amount selector + editable amount; count-up; skippable; reduced-motion fallback; persist + tracking.
*Done when:* tapping Regar plays the ritual and advances money/%/streak/stage; tap-to-skip condenses to release.

**Phase 4 — Screens (mobile).** Re-skin Hub, Plan, Empty, Creation to Bóveda (§5); growth-stage badges; streak flame (`StreakIndicator`); bitácora (`AporteHistoryTimeline`); tab bar with the emerald-cut icon.
*Done when:* all four screens match the spec on mobile in both themes.

**Phase 5 — Eclosión + Reclamar.** Eclosión ceremony at 100% (§6.2) → Reclamar → `ClaimSheet`/Reclamada → Volver → Hub shows "Esmeralda reclamada". No dead ends.
*Done when:* funding to 100% triggers Eclosión and the claim flow round-trips.

**Phase 6 — Product CTA + context sheet.** Update `EsmereogenesisCTA` with the **Concepto / Precio·duración** toggle (persisted) + premium styling; build the **"¿Qué es Esmereogénesis?"** sheet (§5.2) → Comenzar → Creation. Insert into `ProductActions` between primary and secondary CTAs.
*Done when:* from a product page you can flip the variant, open the explainer, and flow into creation.

**Phase 7 — Responsive (iPad + desktop).** Add iPad two-pane Hub/Plan + centered focus column + centered modals; desktop slim **left side-nav** + three-pane cinematic Hub + Plan gem/data panes (§7). Single breakpoint source; nav switches bottom-bar ↔ side-nav.
*Done when:* mobile 390 is untouched; iPad and desktop render per §7 in both themes; full journey works at all three sizes.

**Phase 8 — Light-mode polish.** Stage the hero (cool halo + pedestal + clean cone), raise card surfaces (cool tint + soft shadow), restore the premium-CTA emerald hairline/halo, darken secondary text for AA (§3.2, §5 hero).
*Done when:* light mode reads as a luminous **cool platinum** showroom — no cream, good contrast, gem staged.

**Phase 9 — QA & wiring.** i18n strings (ES/EN), tracking events (§11), reduced-motion, edge cases (§9), and the verification checklist (§12). Run `npm run build` (auto-bumps `APP_VERSION`), commit per `CLAUDE.md` git rules (include `index.html` + `public/version.json`). Auto-deploys on push to `main`.

---

## 11. Tracking (extend `TrackingContext`)

Emit via `useTrackingDispatch().track()`:
`esmereo_plan_created`, `esmereo_aporte_added` (props: amount, type suggested|free, progress, streak), `esmereo_completed`, `esmereo_claimed`, `esmereo_demo_seeded`, `esmereo_animation_skipped` (phase). **New for Bóveda:** `esmereo_cta_variant_toggled` (concepto|precio), `esmereo_context_sheet_opened`, `esmereo_theme_toggled` (light|dark), `esmereo_gem_petted`.

---

## 12. Acceptance / QA checklist

- [ ] `npm run build` passes (no TS errors, no new console warnings); imports go through `@/design-system`; no hardcoded hex.
- [ ] **Both themes** correct on every screen + sheet + the Eclosión ceremony; AA contrast; light mode is **cool platinum, not cream**; no invisible text.
- [ ] Full journey wired with no dead ends: Producto → ¿Qué es? → Creación → siembra → Plan → Regar → Eclosión → Reclamar → Hub.
- [ ] Watering ritual plays, advances money/%/streak/stage, is skippable, and respects reduced-motion.
- [ ] Growth stages (semilla→eclosión) render and the gem evolves; tap-to-pet works.
- [ ] Product CTA: Concepto/Precio·duración toggle persists; explainer opens with correct copy; flows into creation.
- [ ] Emerald-cut Tesoros icon matches §3.5 (active + inactive).
- [ ] **Responsive:** mobile 390 unchanged; iPad two-pane + centered modals; desktop left side-nav + three-pane Hub.
- [ ] Sheets: ✕ + tap-outside + swipe-down dismiss; focus trap; inner scroll works.
- [ ] Persistence survives refresh; streak-break, claimed, invalid-id, and storage-full edge cases handled.
- [ ] i18n ES/EN complete; kickers don't wrap; CTA labels nowrap.
- [ ] New + existing tracking events fire (§11).

---

## 13. Out of scope (deferred)

Real payment/backend, push reminders, social sharing, real-world-impact donations, round-up rules, multi-currency (assume COP), age/identity validation, plan cancellation, max-plan limits.

---

*Built with emerald-green love in Colombia 💚 — Bóveda direction, mobile → iPad → desktop.*
