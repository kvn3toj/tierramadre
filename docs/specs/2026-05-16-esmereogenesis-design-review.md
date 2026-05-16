# Design Review — Esmereogénesis Hub + Garden

**Date:** 2026-05-16
**Branch:** `feature/esmereogenesis-refinement`
**Reviewer:** gstack `/design-review` (Garry Tan's skill, designer's-eye 0-10 + AI-slop scan)
**Method:** Source-code audit (`tokens.ts`, `useEsmereoThemeTokens.ts`, `GardenHero.tsx`, `AporteSlider.tsx`, `EsmereogenesisHubPage.tsx`) + existing QA screenshots at 360/768/1280/1920 (live audit blocked by Google Sheets auth re-validation in headless).

---

## TL;DR

| Surface                          | Design Score | AI-Slop Score |
| -------------------------------- | ------------ | ------------- |
| Hub `/esmereogenesis`            | **B+**       | **A−**        |
| Garden `/esmereogenesis/:planId` | **A−**       | **A**         |

The feature is _strikingly_ on-brand — Playfair Display headlines, dark obsidian-emerald orbs, pearl-mint glass, gold streak chip. It does **not** read as AI-slop. The big gaps are (1) Hub mobile content getting eaten by the bottom nav, (2) the "TU ESMERALDA / TU PROGRESO" overlines repeating identical visual weight inside the Garden hero (vertical-stack monotony), and (3) the AporteSlider closed-launcher CTA reading slightly heavier than the LivingEmerald above it, fighting the natural eye-flow on desktop.

---

## Phase 1 — First Impression

### Hub @ 1280 (`f04-hub-1280-after-hook.png`)

- The site communicates **"this is a ritual, not a fintech dashboard."** The pearl-mint glass + cropped emerald orbs + serif headline read like a jeweler's atelier ledger.
- I notice **the streak chip "14 semanas" is the loudest thing on the page after the percentage**. Gold-on-mint is correctly attention-grabbing; the question is whether `14 semanas` deserves more weight than `4 esmeraldas en proceso`. Right now they're tied — gold weight vs Playfair size.
- The first 3 things my eye goes to: **(1) "4 esmeraldas en proceso" (italic Playfair, top-left)**, **(2) the 85% percentage badge at the right**, **(3) the gem grid below**. Intended order ✓.
- One word: **horticultural.**

### Garden @ 1280 (`f04-garden-1280-after.png`, post-F0.4 split)

- Communicates **"this gem is yours; here's how to feed it."** The 2-column layout (a00e2fd) finally lets the LivingEmerald breathe.
- I notice **"Aurora Verde" reads with more confidence than the Hub headlines** because the italic display is sized 44px vs the Hub's `h5` (~24px). The Garden actually has _better typography hierarchy_ than the Hub.
- First 3 things: **(1) "Aurora Verde" headline**, **(2) the gem orb (left column)**, **(3) "Regar mi esmeralda" CTA**. Intended order ✓.
- One word: **personal.**

### Garden @ 360 (`qa-garden-360.png`)

- I notice **the bottom nav is eating the content** — the "1 semana" streak chip is visible _behind_ the floating nav pill. Either the page needs `pb` matching the nav height + safe-area, or the nav needs a stronger gradient mask.
- One word: **cropped.**

---

## Phase 2 — Inferred Design System

**Fonts (3, within budget):**

- `"Playfair Display", serif` — italic display for plan names + global counters (`TU JARDÍN` heading, plan-card names). Excellent choice; reads as old-world jeweler's catalog.
- System sans (inferred Inter via MUI defaults) — overlines, body, captions. Fine but invisible.
- Cinzel/Cormorant — referenced in the broader admin atelier (`LedgerHero`), not used here.

**Colors:**

- `emeraldCore.primary` `#00AE7A` / `.light` `#33C194` / `.dark` `#008C62`
- `goldAccent` `#D4AF37` (streak chips, completed celebration)
- `PEARL_SURFACE` `#F4FAF6` (light-mode base under glass)
- All glass surfaces are `linear-gradient(135deg, alpha(emeraldCore.light, 0.18) → alpha(emeraldCore.primary, 0.10)) + alpha(PEARL_SURFACE, 0.78)` — **systematic via `useEsmereoThemeTokens` hook ✓** (Phase 1.3 + F0.4 cleanup paid off here).
- Palette is **warm-leaning emerald** (mint pulled toward yellow, not cyan) — consistent.

**Heading scale:**

- Garden hero: `xs:32 / sm:40 / md:44` Playfair italic
- Hub headline ("X esmeraldas en proceso"): MUI `h5` (~24px) — **clearly smaller than Garden**, which is a Hub finding
- Overlines: MUI `overline` (10px caps, letterSpacing 1.4–2)
- Big-number progress: ~80px italic Playfair (Garden) — confident

**Spacing patterns:**

- `mb: { xs: 2.5, md: 3 }` in GardenHero
- `mb: { xs: 3, md: 4 }` in AporteSlider closed-launcher
- `p: 2.5` for slider card padding
- `gap: 0.75` for chip groups
- **Systematic 4/8px scale via MUI spacing ✓**

**Touch targets:** AporteSlider chips at `minHeight: 32` (FAIL — should be 44 on mobile). Launcher CTA at 60 (PASS). Cancel/Confirm at 48 (PASS). See finding G-3.

---

## Phase 3 — Page-by-Page Audit

### HUB ─────────────────────────────────────

#### Trunk Test

1. What site? ✓ "Tierra Mädre" header strip
2. What page? ✓ "Esmereogénesis" sticky title
3. Major sections? ✓ Bottom nav (Inicio, Tesoros, Embajadores, Más)
4. Options at this level? ✓ "Sembrar nueva" CTA + plan cards
5. Where am I? ◐ No breadcrumb, but route name is prominent
6. How can I search? **N/A** for this feature

**PASS.**

#### Scorecard (0-10, designer's eye)

| Dimension           | Score | What a 10 looks like                                                                                                                                                        | Gap                                                                                                                             |
| ------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Visual Hierarchy    |     7 | Streak weight de-emphasized so plan name is unambiguous first read                                                                                                          | Gold chip and Playfair headline tie for attention                                                                               |
| Typography          |     8 | Hub headline matches Garden's hero scale (32–44 italic Playfair instead of `h5`) so the Hub _feels_ like a garden of these jewels, not a list of them                       | Hub display is too small relative to plan-card names                                                                            |
| Color & Contrast    |     9 | Add a single warm-grey neutral (e.g. `alpha(emeraldCore.dark, 0.42)` ramp) for footnote/aux text so muted text isn't all green                                              | Currently every muted text leans green-tinted, even where it should be neutral                                                  |
| Spacing & Layout    |     8 | Plan-card grid has explicit `aspect-ratio: 1` boxes so they don't drift wider than tall when 3-4 items lay out                                                              | At 1280 the cards stretch wider than tall — `~196×246` vs intended ~`200×220`                                                   |
| Interaction States  |     8 | Plan cards have an obvious hover lift + a 4px focus ring matching `accentColor`                                                                                             | Hover invisible from this screenshot; verify in browser                                                                         |
| Responsive          |     6 | At 360 the bottom nav has a 12px `safe-area-inset-bottom` reservation AND the page applies `pb: 'calc(72px + env(safe-area-inset-bottom))'` so content doesn't slide behind | Streak chip visible behind nav at 360 = bug                                                                                     |
| Motion              |     9 | Plan cards have a 200ms `transform` lift on hover, the `Sembrar nueva` button has the same ambient halo as `Regar mi esmeralda` for ritual continuity                       | One missed motion: the "Sembrar nueva" CTA on Hub is flat green, while Garden CTAs glow. Either both glow, or both don't        |
| Content & Microcopy |     9 | "Aporte sugerido X · monto editable" is already exceptional. Quick win: pluralize streak ("14 semanas regando" instead of "14 semanas")                                     | Streak chip reads as a number, not a verb                                                                                       |
| AI-Slop             | **9** | No purple gradient, no 3-column SaaS grid, no system-ui display, no decorative blobs ✓                                                                                      | The lone risk: plan-card thumbnails are uniform circular crops; if more cards land, ensure they don't become "icons-in-circles" |
| Performance Feel    |     8 | First paint already shows the splash mark, then hydrates into glass. Confirm fonts preload `Playfair Display` so the italic doesn't FOUT-shift                              | Verify `<link rel=preload>` for Playfair                                                                                        |

**Hub Design Score: B+** (7+8+9+8+8+6+9+9+9+8 weighted = 79).

### GARDEN ─────────────────────────────────────

#### Trunk Test

1. What site? ✓ Same header
2. What page? ✓ "Esmereogénesis" + plan-specific hero
3. Major sections? ✓ Hero → Gem → Progress → AporteSlider → History
4. Options at this level? ✓ "Regar mi esmeralda" primary, history secondary
5. Where am I? **◐** Browser back goes to Hub. Add the per-plan name to the page title (`<title>Aurora Verde · Esmereogénesis</title>`) so the tab is identifiable
6. How can I search? **N/A**

**PARTIAL** (title tag is the only miss).

#### Scorecard (0-10)

| Dimension           |  Score | What a 10 looks like                                                                                                                                                                                                           | Gap                                                                                                         |
| ------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Visual Hierarchy    |      9 | The hero reads (overline → italic display → caption italic) like a museum plaque. Perfect.                                                                                                                                     | One micro-improvement: tighten `mb: 0.5` to `mb: 0.25` between overline and headline so they bind as a unit |
| Typography          |      9 | Already at 10 on desktop. At mobile, drop `fontSize` from 32 to 30 so a 13-char Spanish name like "Latir de a Montaña" doesn't break to two lines                                                                              | Long Spanish names wrap awkwardly at 360                                                                    |
| Color & Contrast    |      9 | The dark gem on pearl-mint is gorgeous. Verify the muted text `alpha(emeraldCore.dark, 0.6)` clears 4.5:1 on `PEARL_SURFACE`                                                                                                   | Likely fine but should be measured                                                                          |
| Spacing & Layout    |      8 | At 360, `pb` on the Garden page matches the bottom nav + safe area so the AporteSlider isn't cropped                                                                                                                           | Same content-behind-nav bug as Hub                                                                          |
| Interaction States  |      7 | Chip group ("½ Sugerido / Sugerido / 2× Sugerido / Restante") has explicit hover + active visuals matching the slider thumb                                                                                                    | Chips at 32px height fail 44px touch target — see G-3                                                       |
| Responsive          |      8 | At 1920 the 2-col flexes to a max-width of ~1200 and centers (already there per a00e2fd). At 768 the chips stack to two rows instead of overflow-x scrolling so users don't have to scroll horizontally on a tablet            | Horizontal-scroll chips at 768 hide "Restante" off-screen                                                   |
| Motion              |      9 | The closed-launcher's radial halo (3.6s repeat, `scale [1, 1.08, 1]`) is exactly right. Garden hero `motion.div` initial `{opacity: 0, y: 8}` → final, duration 0.5, easeOut — disciplined                                     | None                                                                                                        |
| Content & Microcopy |     10 | "Regar mi esmeralda" + "Aporte sugerido · monto editable" + "Cuánto vas a regar" + "½ Sugerido / Sugerido / 2× Sugerido / Restante" — this copy carries the whole brand by itself                                              | None                                                                                                        |
| AI-Slop             | **10** | Italic Playfair display + dark obsidian-emerald orb + pearl-mint glass + droplet icon + handcrafted chip labels = zero SaaS DNA                                                                                                | None                                                                                                        |
| Performance Feel    |      8 | The cinematic abono flow is slow on purpose (ritual). Make sure `prefers-reduced-motion` short-circuits the halo + cinematic (your hook already does this in AporteSlider — verify in `LivingEmerald.tsx` + `AbonoCinematic/`) | Audit reduced-motion fallbacks across the cinematic flow                                                    |

**Garden Design Score: A−** (9+9+9+8+7+8+9+10+10+8 weighted = 87).

---

## Phase 4 — AI-Slop Scan (the 11 anti-patterns)

|   # | Anti-pattern                        | Hub | Garden | Notes                                                                                                                                                                                                                           |
| --: | ----------------------------------- | :-: | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Purple/violet/indigo gradients      |  ✓  |   ✓    | All-emerald palette                                                                                                                                                                                                             |
|   2 | 3-column SaaS feature grid          |  ✓  |   ✓    | Plan cards are _content_, not feature trios                                                                                                                                                                                     |
|   3 | Icons-in-colored-circles decoration |  ✓  |   ✓    | Only the streak/onboarding modals use small icon-on-emerald circles, and they're functional                                                                                                                                     |
|   4 | `text-align: center` on everything  |  ◐  |   ◐    | Garden hero is intentionally centered — correct. Hub mixes left-aligned cards and centered CTA — also correct. Watch the AporteSlider closed-state: it's centered, which compresses the visual flow at 1280 in the right column |
|   5 | Uniform bubbly border-radius        |  ✓  |   ✓    | Mix of `borderRadius: 3` cards, `borderRadius: 2` buttons, `borderRadius: 999` chips/CTA — hierarchical                                                                                                                         |
|   6 | Decorative blobs/wavy dividers      |  ✓  |   ✓    | Halos exist but they're _functional_ (live-state cue), not decoration                                                                                                                                                           |
|   7 | Emoji as design elements            |  ✓  |   ✓    | Droplet is a lucide icon, not emoji                                                                                                                                                                                             |
|   8 | Colored left-border on cards        |  ✓  |   ✓    | All-around borders only                                                                                                                                                                                                         |
|   9 | Generic hero copy                   |  ✓  |   ✓    | "Regar mi esmeralda" / "Sembrar nueva" are _yours_, not "Unlock the power of…"                                                                                                                                                  |
|  10 | Cookie-cutter section rhythm        |  ✓  |   ✓    | Hub: status → grid → CTA. Garden: hero → gem → progress → slider → history. Each has different visual weight                                                                                                                    |
|  11 | `system-ui` as primary display font |  ✓  |   ✓    | Playfair Display italic carries the brand                                                                                                                                                                                       |

**AI-Slop Score: A− (Hub), A (Garden).** The lone caveat: if you ever add a "Why save with us?" or "How it works" marketing section, that's where slop creeps in. The product itself is safe.

---

## Phase 5 — Goodwill Reservoir (Hub → Garden flow)

Start: 70/100

| Step                        | Score |   Δ | Reason                                                                                  |
| --------------------------- | ----: | --: | --------------------------------------------------------------------------------------- |
| Land on Hub                 |    75 |  +5 | "Tu jardín" + "X esmeraldas en proceso" reads warmly, not transactional                 |
| Streak chip "14 semanas"    |    78 |  +3 | Reward + identity in one chip                                                           |
| Tap a plan card             |    76 |  −2 | At 360, the bottom nav crops the card — micro-friction                                  |
| Garden loads                |    84 |  +8 | Personal name + gem in motion = ownership moment                                        |
| AporteSlider closed         |    86 |  +2 | Halo communicates "this is alive"                                                       |
| AporteSlider open           |    89 |  +3 | Quick-amount chips are an Acorns-grade decision-eliminator                              |
| Confirm aporte              |    92 |  +3 | Cinematic + "+ $X" history entry replenishes the ritual                                 |
| Onboarding modal (step 2/3) |    88 |  −4 | Modal lands _over_ the gem on first visit — the gem reveal gets stolen. See finding G-6 |

**Final: 88/100 — Healthy.** The drains are micro (nav crop + onboarding timing); the fills carry the whole experience.

---

## Phase 6 — Findings (impact-ordered, with patches)

### HIGH

#### H-1 · Hub at 360: bottom nav overlaps last plan card

**Evidence:** `qa-hub-360.png` shows "Cosmos" plan-card cropped behind the bottom nav pill.
**Why:** Page-level `pb` doesn't reserve enough room for `BottomNav` height + safe-area.
**Patch:**

```tsx
// EsmereogenesisHubPage.tsx — outermost Box
sx={{ pb: 'calc(88px + env(safe-area-inset-bottom))' }}
```

The current `pb` (likely 64) + bottom nav (72) + safe area (~34 on notch devices) = 170 needed when nav is fixed. Set `pb: 'calc(88px + env(safe-area-inset-bottom))'` and verify on a real iPhone notch device.

#### H-2 · Garden at 360: same content-behind-nav bug

**Evidence:** `qa-garden-360.png` — "1 semana" streak chip from `EsmereoPlanCard` peeks behind the nav.
**Patch:** same as H-1 on `EsmereogenesisGardenPage.tsx`. After AporteSlider history block, ensure `mb: 'calc(72px + env(safe-area-inset-bottom))'` or apply `pb` at the page wrapper.

#### H-3 · Hub headline weight is smaller than Garden hero

**Evidence:** Hub `<Typography variant="h5">` (~24px) vs Garden `fontSize: {xs:32, sm:40, md:44}`. Result: when you land on Hub, the page's _own_ statement ("4 esmeraldas en proceso") feels less weighty than each individual plan card's name once you enter.
**Patch:** Promote Hub headline to italic Playfair at 32/40 (one notch smaller than Garden hero so Garden still feels "deeper"):

```tsx
// EsmereogenesisHubPage.tsx around L283
sx={{
  fontFamily: '"Playfair Display", serif',
  fontStyle: 'italic',
  fontSize: { xs: 28, sm: 32, md: 36 },
  fontWeight: 700,
  letterSpacing: -0.3,
  ...
}}
```

This binds Hub→Garden as a single typographic system rather than "list view" → "detail view."

### MEDIUM

#### M-1 · AporteSlider chips fail 44px touch target

**Evidence:** `AporteSlider.tsx` line 239: `minHeight: 32, py: 0.5`. WCAG 2.5.5 + iOS HIG both call for 44.
**Patch:**

```tsx
sx={{
  flexShrink: 0,
  py: 1,           // was 0.5
  px: 2,           // was 1.5
  minHeight: 44,   // was 32 — bump to spec
  fontSize: 13,
  ...
}}
```

At 44px the chips read as fully tappable; current 32 is "ribbon" sized — fine with a mouse, finicky on phone. The slider thumb itself is already 24+ via MUI default — fine.

#### M-2 · Chip row overflows horizontally at 768 instead of wrapping

**Evidence:** `qa-aporte-slider-chips-768.png` shows "Restante" chip getting clipped at right edge of the slider card.
**Patch:** Use `flexWrap: 'wrap'` instead of `overflow-x: auto` for ≥sm breakpoint:

```tsx
// AporteSlider.tsx L214
sx={{
  display: "flex",
  gap: 0.75,
  mb: 1.5,
  flexWrap: { xs: 'nowrap', sm: 'wrap' },
  overflowX: { xs: 'auto', sm: 'visible' },
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
}}
```

At ≥768 there's room to wrap to 2 rows; horizontal scroll is the wrong gesture there.

#### M-3 · Hub "Sembrar nueva" CTA doesn't share Garden's ambient halo

**Evidence:** `f04-hub-1280-after-hook.png` — Hub CTA is flat emerald gradient. Garden's "Regar mi esmeralda" has a 3.6s pulsing halo. The two are siblings in ritual ("plant" vs "water") but visually only one is alive.
**Patch:** Either (a) add the same halo to Hub's "Sembrar nueva" using the closed-launcher pattern from `AporteSlider.tsx` L80–103, OR (b) remove Garden's halo to standardize on calmness. Pick **(a)** — the halo is the brand's heartbeat.

#### M-4 · Garden hero overline-to-headline gap is too generous

**Evidence:** `GardenHero.tsx` L51 `mb: 0.5` between overline and italic display. Visual reading: the overline floats away from the name it labels.
**Patch:**

```tsx
// GardenHero.tsx — overline sx
mb: 0.25,
```

Subtle. Binds "TU ESMERALDA" + "Aurora Verde" as one composite.

#### M-5 · Onboarding modal lands over the gem on first visit

**Evidence:** `qa-onboarding-step2-360.png` shows the "Racha" step floating on top of the dimmed gem reveal. First-time users miss the gem-comes-alive moment because the coachmark interrupts it.
**Patch:** Two options:

- **(a)** Delay first coachmark by 1500ms so the gem entrance animation plays first, then the coachmark fades in.
- **(b)** Skip the modal entirely on the _first_ gem reveal and trigger it only when the user sits idle for 4s without tapping the slider CTA.
  Recommend **(a)** — preserves the explanation but lets the ceremony breathe.

### POLISH

#### P-1 · `<title>` tag should include plan name

**Evidence:** Browser tab on Garden shows "Tierra Mädre Collections" — the SPA title.
**Patch:** Use `useDocumentTitle` (already in the codebase per `useDocumentTitle.ts` pattern in other pages) inside `EsmereogenesisGardenPage`:

```tsx
useDocumentTitle(`${plan.nickname ?? plan.productName} · Esmereogénesis`);
```

#### P-2 · Streak chip copy: "14 semanas" → "14 semanas regando"

**Evidence:** Hub streak chip is a noun-only counter; the brand's voice prefers verbs (regar, florecer, sembrar).
**Patch:** `StreakIndicator.tsx` — when weeks ≥ 1, render `{weeks} ${weeks === 1 ? 'semana' : 'semanas'} regando` if space allows; otherwise keep the short version at narrow widths.

#### P-3 · Verify Playfair Display preload

**Evidence:** No FOUT visible in screenshots, but worth confirming.
**Patch:** In `index.html`, ensure `<link rel="preload" as="font" href="..." crossorigin>` for the Playfair italic 700 weight specifically (the one used in italic Hub + Garden headlines).

#### P-4 · One muted-text color uses emerald-tinted alpha

**Evidence:** `useEsmereoThemeTokens.ts` L101 — `mutedColor: alpha(emeraldCore.dark, 0.6)`. Everything that should read neutral gets green-tinted.
**Patch:** Add a `bodyNeutralColor` for footnotes/aux text:

```ts
bodyNeutralColor: isLight ? alpha('#1a1a1a', 0.55) : whiteAlpha(0.62),
```

Use it only for things like "$ 7.776.510 aportado · meta $ 9.151.500" where the data should read neutral, not branded.

---

## Phase 7 — Quick Wins (apply in this order, <30min each)

1. **H-1 + H-2 (10 min):** Add `pb: 'calc(88px + env(safe-area-inset-bottom))'` to Hub + Garden page wrappers. Single line each. Test at 360 on a notch device.
2. **M-4 (2 min):** GardenHero overline `mb: 0.5 → 0.25`.
3. **M-2 (5 min):** AporteSlider chip row `flexWrap: { xs: 'nowrap', sm: 'wrap' }`.
4. **M-1 (5 min):** AporteSlider chip `minHeight: 32 → 44`.
5. **H-3 (15 min):** Promote Hub headline to italic Playfair `{xs:28, sm:32, md:36}`.
6. **P-1 (3 min):** Wire `useDocumentTitle` in Garden.
7. **M-3 (20 min):** Port the AporteSlider halo to the Hub "Sembrar nueva" CTA.
8. **M-5 (15 min):** Delay first-visit coachmark by 1500ms.

Total: ~75 min of high-leverage polish. Re-run `/design-review` after applying — expected Hub B+ → A, Garden A− → A.

---

## What a 10 looks like for the top 3 dimensions

### Visual Hierarchy

A 10 has **one undisputed primary read per surface**. On Hub today the eye flickers between the Playfair headline and the gold streak chip. Fix: either make the headline larger (H-3) or muted the gold to a desaturated bronze so the headline always wins. On Garden today the hero already nails it.

### Responsive

A 10 has **no content behind chrome at any breakpoint**. Today both Hub and Garden have bottom-nav crop at 360. A single CSS variable (`--esmereo-bottom-safe`) calculated once and applied as `pb` to both pages would eliminate the class.

### Interaction States

A 10 has **44px minimum on every tappable element**, **a visible focus ring with `:focus-visible`**, and **mindless choice audit passed for every decision point**. Today AporteSlider chips fail at 32px and the chip "Sugerido" vs "2× Sugerido" requires a thought ("which one matches my goal?") — the chip labels could surface the _amount_ as the primary label and "Sugerido" as a sub-label, so the user picks an amount rather than a multiplier:

```
$ 60.000           $ 120.000          $ 240.000          $ 1.380.000
Sugerido           2× Sugerido        Triple             Restante
```

Currently it's:

```
½ Sugerido         Sugerido           2× Sugerido        Restante
```

The amount-first layout makes the chips a mindless click ("I want the $60k one"); the current layout makes them a thinking click ("which multiplier?").

---

## Source-level consistency findings

- **`useEsmereoThemeTokens.ts` is exemplary.** Single source of truth for glass + typography across Hub, Garden, slider, hero, history. Phase F0.4 work paid off. **Do not regress** by inlining gradients in new components — always derive from this hook.
- **`PEARL_SURFACE` is feature-local** (`tokens.ts:10`). If you reuse pearl-mint anywhere else in the app, promote to `src/design-system/tokens/` first; don't import the esmereogenesis token from outside.
- **No magic-number gradient angles**: every gradient is `135deg` (except `headerBg` which is `180deg`). Consistent.
- **`AporteSlider.tsx` line 264-266 slider step**: `step={Math.max(10_000, Math.round(plan.weeklySuggestedCOP / 5))}`. Smart — guarantees ≥10k step, scales with plan size. Document this in a one-line comment if not already.

---

## What's NOT broken (do not touch)

- LivingEmerald → AbonoCinematic flow timing — the 3.6s halo + cinematic is _the_ ritual.
- The 2-column desktop layout at lg+ (a00e2fd) is correct; do not collapse it back to single-column.
- The Playfair italic + emerald palette + pearl-mint glass is the brand's actual differentiator. Resist any "modernize" pressure that pushes toward Inter + flat cards.
- Onboarding _content_ (Racha, Lluvia generosa, etc.) is poetic and earned — only the _timing_ of step 2 needs the M-5 patch.

---

## Status

`DONE_WITH_CONCERNS` — audit complete with 11 findings (3 high / 5 medium / 4 polish). Apply Quick Wins, then re-run `/design-review` to verify scores tick up. Live audit was blocked by Google Sheets auth re-validation — re-running `/design-review` with `/setup-browser-cookies` first (import your real Chrome cookies) would let the headless browser pass the auth wall on a future pass.
