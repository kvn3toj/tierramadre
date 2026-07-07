# Quiet Emerald Migration — Phase 0 + Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift the entire app onto the Quiet Emerald palette via a low-risk token shim (Phase 0), then migrate the four app-shell surfaces — header, More sheet, filter sheet, settings sheet, invitation entry — to their approved Quiet Emerald treatments (Phase 1).

**Architecture:** Phase 0 rewrites the _definitions_ of the legacy tokens (`emeraldCore`, `goldAccent`, `glass*`, and the gold hexes embedded in `gradients`/`shadows`/`charts`) so all ~135 consumer files change palette at once with no per-file edits — gold is remapped to a cool graphite neutral, glass is flattened, emerald is nudged to the QE emerald. Phase 1 then does the real `getQuietEmerald(mode)` refactors + visual polish on the shell surfaces the shim only coarsely covered.

**Tech Stack:** React 18 + TypeScript 5.6, Vite 5.4, MUI v6, Framer Motion, Vitest (unit), the Quiet Emerald token module at `src/design-system/tokens/quiet-emerald.ts` (re-exported via `src/design-system/index.ts`).

## Global Constraints

- **Design source of truth:** `docs/superpowers/specs/2026-07-07-quiet-emerald-migration-design.md`. Decisions D1–D7 there are binding.
- **D6 — no gold anywhere:** every `goldAccent` value and every embedded gold hex (`#D4AF37`, `#E5C866`, `#F5E6A3`, `#FDF8E8`, `#B8941F`, `#8F7318`, `#665210`, and rgb `212, 175, 55`, plus medal `#FFD700`) must resolve to a neutral graphite or emerald. Target neutral ramp = `qeGray` (`#8C928F`/`#9AA09D`/`#C9CECB`/`#EBEDEC`/`#5C6360`/`#3A403E`/`#272C2B`).
- **No glass:** every `GlassEffect` must end with `backdropFilter: 'none'` and a solid/hairline surface.
- **D5 — invitation is dark-only:** `InvitationPage` uses `qeDark` / `qeAccent.dark` / `qeFont` constants directly; it must NOT call `getQuietEmerald(mode)`.
- **In-app surfaces are mode-aware:** header, More sheet, filter sheet, settings sheet read the current mode (`useTheme()` / `useThemeMode()`) and resolve colors via `getQuietEmerald(mode)`.
- **QE emerald values (verbatim):** light `{accent #00785C, strong #006F52, pure #00AF84, on #FFFFFF}`; dark `{accent #34C99B, strong #00AF84, pure #34C99B, on #06140E}`. Dark surfaces `{base #0E1110, surface #15191A, surfaceRaised #1B1F1F, border #272C2B, hairline #222726, text #EAEDEB, textMuted #9AA09D, subtle #6B726F}`.
- **Fonts:** `qeFont.serif` (Cormorant) for titles, `qeFont.ui` (Hanken Grotesk) for body/nav, `qeFont.mono` (DM Mono) for overlines/specs/prices.
- **Verify commands:** `npm run lint` (== `tsc --noEmit` for app + api), `npm run test:unit` (Vitest), `npm run build` (full typecheck + Vite build), `npm run dev` (app at http://localhost:3000; toggle light/dark via the settings sheet for screenshot QA).
- **Commit style:** end every commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Work on the current branch `design/quiet-emerald-migration`.
- **Scope guard:** introduce NO new `goldAccent` / `glass*` imports in any file.

---

## File Structure

**Phase 0 — token definitions (shim):**

- Modify `src/design-system/tokens/colors.ts` — repoint `goldAccent`, nudge `emeraldCore`, de-gold `qualityTiers.sublime.accent` + `priceTiers.collection.accent`.
- Modify `src/design-system/tokens/accents.ts` — `priceTiers.premium.color` off gold.
- Modify `src/design-system/tokens/charts.ts` — de-gold the `gold` chart series.
- Modify `src/design-system/tokens/gradients.ts` — de-gold `goldGradients` + gold stops in `sublime`/spectrum gradients.
- Modify `src/design-system/tokens/shadows.ts` — de-gold `goldShadows` + `GOLD` rgb const.
- Modify `src/design-system/tokens/glass.ts` — flatten every `GlassEffect`.
- Create `tests/quietEmeraldShim.test.ts` — regression guard that gold is gone and glass is flat.

**Phase 1 — shell surfaces:**

- Modify `src/components/ios/IOSLayout.tsx` — drop header gradient washes.
- Modify `src/components/ios/IOSNavigationBar.tsx` — flat editorial header + mono overline subtitle.
- Modify `src/components/ios/IOSMoreSheet.tsx` — grouped-list, single emerald accent, flat sheet.
- Modify `src/components/ios/MoreSheetSearch.tsx` — de-gold the two filter chips.
- Modify `src/components/ios/IOSFilterSheet.tsx` — emeraldCore/surfaces → QE.
- Modify `src/components/ios/IOSSettingsSheet.tsx` — flatten the backdrop, confirm QE surfaces.
- Modify `src/pages/InvitationPage.tsx` — retire the vault, apply the "whisper" treatment (dark-only).

---

## PHASE 0 — Foundation & Token Shim

### Task 1: Repoint `goldAccent` and nudge `emeraldCore` in colors.ts

**Files:**

- Modify: `src/design-system/tokens/colors.ts:12-41`, `:75-84` (sublime accent), `:219-241` (priceTiers)

**Interfaces:**

- Produces: `emeraldCore` (unchanged key shape: `primary/light/lighter/lightest/dark/darker/darkest/vibrant/essence/textAccessible`) now emitting QE emerald values; `goldAccent` (unchanged keys `primary/light/lighter/lightest/dark/darker/darkest`) now emitting `qeGray` graphite values. Downstream `emeraldAlpha`/`goldAlpha` (which read `emeraldCore.primary`/`goldAccent.primary`) automatically follow.

- [ ] **Step 1: Repoint `emeraldCore`** — replace the object body at `colors.ts:12-27` with QE emerald values (keys preserved):

```ts
export const emeraldCore = {
  primary: '#00AF84', // QE accent-pure
  light: '#34C99B', // QE dark-mode accent / light tint
  lighter: '#6FDFBE', // derived lighter
  lightest: '#E6F7F1', // unchanged mist (still reads fine on light)
  dark: '#00785C', // QE light-mode accent
  darker: '#006F52', // QE accent-strong
  darkest: '#00583F', // derived deepest
  vibrant: '#34C99B', // was φ-lighter → QE bright emerald
  essence: '#006F52', // was φ-darker → QE strong
  textAccessible: '#0B6E4F', // keep — already WCAG AA on white
} as const;
```

- [ ] **Step 2: Repoint `goldAccent` to graphite** — replace `colors.ts:33-41` (keys preserved, values become neutral `qeGray`):

```ts
export const goldAccent = {
  primary: '#8C928F', // qeGray 500 — refined graphite replaces gold
  light: '#9AA09D', // qeGray 400
  lighter: '#C9CECB', // qeGray 300
  lightest: '#EBEDEC', // qeGray 150
  dark: '#5C6360', // qeGray 600
  darker: '#3A403E', // qeGray 700
  darkest: '#272C2B', // qeGray 800
} as const;
```

- [ ] **Step 3: De-gold the two embedded gold accents.** At `colors.ts:79` change `accent: '#D4AF37',` (inside `qualityTiers.sublime`) to `accent: '#00AF84',`. At `colors.ts:239` change `accent: goldAccent.primary,` (inside `priceTiers.collection`) to `accent: emeraldCore.dark,`.

- [ ] **Step 4: Typecheck**

Run: `npm run lint`
Expected: PASS (no type errors — key shapes unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/design-system/tokens/colors.ts
git commit -m "feat(qe): repoint emeraldCore to QE emerald and goldAccent to graphite

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: De-gold accents, charts, gradients, shadows

**Files:**

- Modify: `src/design-system/tokens/accents.ts:64`, `:72-76`
- Modify: `src/design-system/tokens/charts.ts:129-135`
- Modify: `src/design-system/tokens/gradients.ts:31-39`, `:54`, `:103`, `:105`, `:120-122`
- Modify: `src/design-system/tokens/shadows.ts:25`, `:158`

**Interfaces:**

- Consumes: `emeraldCore`, `goldAccent` from Task 1 (now non-gold).
- Produces: `accentColors.priceTiers.premium.color`, `medalColors`, `chartColors.gold`, `goldGradients`, `goldShadows` — all now graphite/emerald; same key shapes.

- [ ] **Step 1: `accents.ts` price tier + medals.** At `accents.ts:64` change `premium: { color: goldAccent.primary, label: 'Premium' },` to `premium: { color: emeraldCore.dark, label: 'Premium' },`. Replace `medalColors` (`accents.ts:72-76`) with graphite tiers:

```ts
export const medalColors = {
  gold: '#8C928F', // graphite (was #FFD700)
  silver: '#C9CECB', // light graphite
  bronze: '#5C6360', // deep graphite
} as const;
```

- [ ] **Step 2: `charts.ts` gold series.** In the `gold` series block (`charts.ts:129-135`) replace every gold hex (`#D4AF37` and its companions) with graphite so it stays visually distinct from the emerald line. Set `line`/`point`/`pointHover` to `#8C928F`, and any gradient-end to `#5C6360`. (Read the exact block first; keep all keys, swap only the hex string values.)

- [ ] **Step 3: `gradients.ts` gold gradients + gold stops.** Replace the `goldGradients` object bodies (`gradients.ts:31-39`) so each `linear-gradient` uses graphite stops instead of gold, e.g. `medium: 'linear-gradient(135deg, #9AA09D 0%, #8C928F 100%)'`, `deep: 'linear-gradient(135deg, #8C928F 0%, #5C6360 100%)'`, `intense: 'linear-gradient(135deg, #5C6360 0%, #272C2B 100%)'`. Then swap the gold stops inside `sublime` (`:54`), `goldSpectrum`/`sublimeSpectrum` (`:103`,`:105`), and the `secondary`/`secondaryHover` button gradients (`:120-122`) from `#D4AF37`/`#B8941F`/`#E5C866`/`#F5E6A3`/`#8F7318` to the corresponding `qeGray` graphite hexes. (Read each line, replace only the gold hex literals.)

- [ ] **Step 4: `shadows.ts` gold.** At `shadows.ts:25` change `const GOLD = '212, 175, 55';` to `const GOLD = '140, 146, 143';` (graphite rgb). At `shadows.ts:158` change the hardcoded `rgba(212, 175, 55, ...)` values in the `gold` shadow to `rgba(140, 146, 143, ...)`.

- [ ] **Step 5: Typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design-system/tokens/accents.ts src/design-system/tokens/charts.ts src/design-system/tokens/gradients.ts src/design-system/tokens/shadows.ts
git commit -m "feat(qe): de-gold price tiers, charts, gradients, shadows

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Flatten the glass tokens

**Files:**

- Modify: `src/design-system/tokens/glass.ts:24-158` (all four variant maps)

**Interfaces:**

- Produces: `glassLight`, `glassDark`, `glassEmerald`, `glassGold` — each entry keeps the `GlassEffect` shape but with `backdropFilter: 'none'`, `WebkitBackdropFilter: 'none'`, solid `background`, hairline `border`, softened `boxShadow`. `applyGlass` is unchanged.

- [ ] **Step 1: Flatten `glassLight`** — replace `glass.ts:24-57` so each variant drops blur and uses a solid QE-light surface + hairline. Example for `default` (apply the same pattern to `frosted`/`ultraThin`/`regular`):

```ts
  default: {
    background: '#FFFFFF',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: '1px solid #E4E7E5',
    boxShadow: '0 18px 40px -24px rgba(13,30,24,0.30)',
  },
```

- [ ] **Step 2: Flatten `glassDark`** — replace `glass.ts:63-96` with solid QE-dark surfaces (`background: '#15191A'`, `border: '1px solid #272C2B'`, `boxShadow: '0 20px 46px -26px rgba(0,0,0,0.8)'`, `backdropFilter/WebkitBackdropFilter: 'none'`) across all four variants.

- [ ] **Step 3: Flatten `glassEmerald`** — replace `glass.ts:102-127` with solid faint-emerald tints and no blur, e.g. `background: 'rgba(0,175,132,0.08)'`, `border: '1px solid rgba(0,175,132,0.20)'`, `backdropFilter/WebkitBackdropFilter: 'none'`, keep a soft `boxShadow`.

- [ ] **Step 4: Flatten `glassGold` (now graphite)** — replace `glass.ts:133-158` with graphite tints and no blur, e.g. `background: 'rgba(140,146,143,0.08)'`, `border: '1px solid rgba(140,146,143,0.20)'`, `backdropFilter/WebkitBackdropFilter: 'none'`.

- [ ] **Step 5: Typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design-system/tokens/glass.ts
git commit -m "feat(qe): flatten glassmorphism tokens (no backdrop blur)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Regression guard test + visual sweep

**Files:**

- Create: `tests/quietEmeraldShim.test.ts`

**Interfaces:**

- Consumes: the token exports from Tasks 1–3 via the barrel `src/design-system`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  emeraldCore,
  goldAccent,
  glassLight,
  glassDark,
  glassEmerald,
  glassGold,
} from '../src/design-system';

const GOLD_HEXES = [
  '#D4AF37',
  '#E5C866',
  '#F5E6A3',
  '#FDF8E8',
  '#B8941F',
  '#8F7318',
  '#665210',
  '#FFD700',
];

describe('Quiet Emerald shim', () => {
  it('drops every gold hex from goldAccent', () => {
    const values = Object.values(goldAccent).map((v) => v.toUpperCase());
    for (const g of GOLD_HEXES) expect(values).not.toContain(g);
  });

  it('keeps emeraldCore on the QE emerald', () => {
    expect(emeraldCore.primary.toUpperCase()).toBe('#00AF84');
  });

  it('flattens every glass variant (no backdrop blur)', () => {
    const all = [glassLight, glassDark, glassEmerald, glassGold];
    for (const map of all) {
      for (const effect of Object.values(map)) {
        expect(effect.backdropFilter).toBe('none');
        expect(effect.WebkitBackdropFilter).toBe('none');
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it passes** (Tasks 1–3 already made it true)

Run: `npm run test:unit -- quietEmeraldShim`
Expected: PASS (3 tests). If any FAIL, a gold hex or blur survived — fix the offending token file, then re-run.

- [ ] **Step 3: Full build**

Run: `npm run build`
Expected: PASS (clean typecheck + Vite build).

- [ ] **Step 4: Visual sweep (manual QA — the Phase 0 acceptance gate)**

Run: `npm run dev`. Open http://localhost:3000. In BOTH light and dark (toggle via the settings sheet), spot-check the highest-risk former-gold-on-emerald surfaces and confirm nothing is illegible:

- Home `WelcomeCard` + `QuickActions`
- A gamification badge (`LevelBadge` / `StreakBadge` / `AchievementToast`)
- Valuation page (`ValuationPage`, `AuctionRecordsCard`)
- Analytics charts (`admin/analytics` — confirm the former gold series is still distinct from emerald)

If any element is unreadable (graphite-on-dark or emerald-on-emerald with no contrast), record it and adjust the specific shim value (e.g. lighten a graphite for dark surfaces). Note anything deferred to its per-area phase.

- [ ] **Step 5: Commit**

```bash
git add tests/quietEmeraldShim.test.ts
git commit -m "test(qe): guard gold-removal and glass-flattening in the token shim

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## PHASE 1 — App Shell Surfaces

### Task 5: Flat editorial header — drop the gradient washes (IOSLayout)

**Files:**

- Modify: `src/components/ios/IOSLayout.tsx:47-55` (gradient consts), `:91`, `:102` (page configs)

**Interfaces:**

- Produces: `/treasure` and `/home` page configs no longer pass a gradient `backgroundColor` to `IOSNavigationBar`, so the nav renders its flat surface.

- [ ] **Step 1: Remove the gradient wash from the two page configs.** At `IOSLayout.tsx:91` (the `/treasure` config) and `:102` (the `/home` config), delete the line:

```ts
    backgroundColor: isLight ? LIGHT_HEADER_GRADIENT : DARK_HEADER_GRADIENT,
```

(Leave the rest of each config intact. With `backgroundColor` now `undefined`, `IOSNavigationBar` falls through to its flat-surface branch — made unconditional in Task 6.)

- [ ] **Step 2: Delete the now-unused gradient constants** at `IOSLayout.tsx:47-55` (`DARK_HEADER_GRADIENT` and `LIGHT_HEADER_GRADIENT`).

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: PASS (no remaining references to the deleted consts — grep `HEADER_GRADIENT` returns nothing).

- [ ] **Step 4: Commit**

```bash
git add src/components/ios/IOSLayout.tsx
git commit -m "feat(qe): drop emerald header gradient washes on home/treasure

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Flat editorial header — flatten the nav bar + mono overline (IOSNavigationBar)

**Files:**

- Modify: `src/components/ios/IOSNavigationBar.tsx:70-95` (`liquidGlassStyles`), `:119-145` (header Box sx), `:266-277` (subtitle Typography)

**Interfaces:**

- Consumes: still receives an optional `backgroundColor` prop (now only set by non-shell pages); the flat path is the default.

- [ ] **Step 1: Make the header flat by default.** Replace the body of `liquidGlassStyles` (`IOSNavigationBar.tsx:70-95`) so it always resolves to a solid surface with no blur (an explicit `backgroundColor` from a caller still wins):

```tsx
const liquidGlassStyles = useMemo(() => {
  if (backgroundColor) {
    const isGradient = backgroundColor.includes('gradient');
    return {
      ...(isGradient ? { background: backgroundColor } : { backgroundColor }),
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    };
  }
  // Quiet Emerald: flat editorial header — solid surface, no blur.
  return {
    backgroundColor: 'var(--surface-primary)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  };
}, [backgroundColor]);
```

- [ ] **Step 2: Ensure a hairline bottom border.** In the header `<Box component="header">` sx (`IOSNavigationBar.tsx:119-145`), the `borderBottom` already falls back to `'0.5px solid var(--border-default)'` when there is no `backgroundColor`. Leave that line as-is (it now applies on every shell page). No change needed unless a gradient page remains.

- [ ] **Step 3: Convert the subtitle to a mono overline.** Replace the large-mode subtitle Typography sx (`IOSNavigationBar.tsx:266-277`) with the Quiet Emerald overline treatment:

```tsx
{
  subtitle && (
    <Typography
      variant="body2"
      sx={{
        fontFamily: qeFont.mono,
        fontSize: '0.6875rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        marginTop: spacing.xxs,
      }}
    >
      {subtitle}
    </Typography>
  );
}
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run lint`
Expected: PASS. (`qeFont` is already imported at `IOSNavigationBar.tsx:17`.)

- [ ] **Step 5: Visual QA**

Run: `npm run dev`. On `/treasure` and `/home`, in light and dark: confirm the header is flat (no green wash, no blur), the title is the Cormorant serif, and the subtitle is an uppercase mono overline sitting on a 0.5px hairline border. Compare against the approved "A · Flat" mockup.

- [ ] **Step 6: Commit**

```bash
git add src/components/ios/IOSNavigationBar.tsx
git commit -m "feat(qe): flat editorial nav header with mono overline subtitle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Grouped-list More sheet — flat sheet + QE accessor (IOSMoreSheet)

**Files:**

- Modify: `src/components/ios/IOSMoreSheet.tsx:55-69` (imports), `:293` (theme hook), `:324-360` (sheet + specular styles)

**Interfaces:**

- Produces: a `qe` object (`const qe = getQuietEmerald(mode)`) available to the row/section render in Task 8; flattened `sheetStyles` (solid `qe.surface`, hairline top border, no blur, no specular).

- [ ] **Step 1: Import the QE accessor.** In the design-system import block (`IOSMoreSheet.tsx:55-69`), add `getQuietEmerald` and `qeFont` to the named imports (keep the existing ones for now; unused legacy imports get removed in Task 8):

```tsx
import {
  brand,
  radius,
  iosTypographyScale,
  emeraldCore,
  accentColors,
  cssTransition,
  blurValues,
  primitiveColors,
  primitiveSpacing as spacing,
  easingCurves,
  durations,
  zIndex,
  goldAccent,
  getQuietEmerald,
  qeFont,
} from '../../design-system';
```

- [ ] **Step 2: Resolve QE tokens from the current mode.** `mode` is already available (`IOSMoreSheet.tsx:293` — `const { mode, toggleTheme } = useTheme();`). Immediately after that line add:

```tsx
const qe = getQuietEmerald(mode);
```

- [ ] **Step 3: Flatten the sheet container.** Replace `sheetStyles` (`IOSMoreSheet.tsx:325-342`) so it is always a solid QE surface with a hairline top edge and no blur:

```tsx
const sheetStyles = useMemo(
  () => ({
    backgroundColor: qe.surface,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    borderTop: `1px solid ${qe.hairline}`,
    boxShadow: qe.shadow,
  }),
  [qe.surface, qe.hairline, qe.shadow],
);
```

- [ ] **Step 4: Remove the header specular.** Replace `headerSpecularStyles` (`IOSMoreSheet.tsx:345-360`) with an empty style object (the grabber/title stand on their own now):

```tsx
const headerSpecularStyles = useMemo(() => ({}), []);
```

- [ ] **Step 5: Typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ios/IOSMoreSheet.tsx
git commit -m "feat(qe): flat QE surface for the More sheet shell

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Grouped-list More sheet — rows, sections, role chip (IOSMoreSheet)

**Files:**

- Modify: `src/components/ios/IOSMoreSheet.tsx:274-278` (ROLE_COLORS), `:428-556` (renderToolRow), `:886-902` (section render)

**Interfaces:**

- Consumes: `qe`, `qeFont` from Task 7.
- Produces: the approved "B · Grouped list" layout — one bordered container per section, hairline dividers between rows, small emerald-accented icon chips, single accent color, mono section overlines.

- [ ] **Step 1: De-color the role map.** Replace `ROLE_COLORS` (`IOSMoreSheet.tsx:274-278`) so no role uses gold; roles stay distinguishable via emerald + neutral:

```tsx
const ROLE_COLORS: Record<string, string> = {
  Admin: '#8C928F', // graphite
  Embajador: emeraldCore.dark, // QE light-mode accent
  Asesor: emeraldCore.primary, // QE emerald
};
```

- [ ] **Step 2: Rewrite `renderToolRow` as a flat grouped row.** Replace the row `sx` block (`IOSMoreSheet.tsx:444-483`) — drop the per-tool gradient/border/specular; the row is now a transparent list item (the group container in Step 4 supplies the border). Replace with:

```tsx
        sx={{
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
          padding: spacing.md,
          background: "transparent",
          cursor: "pointer",
          transition: `background-color ${durations.liquidFast} ${easingCurves.liquidInOut}`,
          "&:hover": { backgroundColor: qe.well },
          "&:active": { backgroundColor: qe.well },
        }}
```

- [ ] **Step 3: Neutralize the icon chip + chevron.** Replace the icon container `sx` (`IOSMoreSheet.tsx:487-497`) so every icon sits in the same small emerald-tinted chip regardless of `tool.color`:

```tsx
          sx={{
            width: "36px",
            height: "36px",
            borderRadius: radius.sm,
            backgroundColor: qe.well,
            color: qe.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
```

Then set the icon size + color (`IOSMoreSheet.tsx:499-501`): `<Icon sx={{ fontSize: '20px', color: qe.accent }} />`. And recolor the chevron (`IOSMoreSheet.tsx:551`): `<Box sx={{ color: qe.subtle, fontSize: "20px" }}>`. Recolor the badge `Chip` (`IOSMoreSheet.tsx:528-535`) to the accent: `backgroundColor: qe.well, color: qe.accent, border: '1px solid ' + qe.border`.

- [ ] **Step 4: Wrap each section's rows in a bordered group with dividers.** Replace the section map opening (`IOSMoreSheet.tsx:886-902` and the surrounding `.map`) so each section renders a mono overline followed by ONE rounded container holding its rows, with hairline dividers between them:

```tsx
{
  menuSections.map((section) => (
    <Box key={section.id} sx={{ mb: spacing.md }}>
      <Typography
        sx={{
          fontFamily: qeFont.mono,
          fontSize: '0.6rem',
          fontWeight: 500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: qe.subtle,
          mb: 1,
          display: 'block',
          px: spacing.xs,
        }}
      >
        {section.title}
      </Typography>
      <Box
        sx={{
          backgroundColor: qe.surface,
          border: `1px solid ${qe.border}`,
          borderRadius: radius.md,
          overflow: 'hidden',
          '& > *:not(:first-of-type)': {
            borderTop: `1px solid ${qe.hairline}`,
          },
        }}
      >
        {section.tools.map((tool) => renderToolRow(tool))}
      </Box>
    </Box>
  ));
}
```

(Confirm the inner property name for a section's tools by reading the `MenuSection` interface near `IOSMoreSheet.tsx:90`; if it is not `tools`, use the actual field. Keep whatever the existing map used.)

- [ ] **Step 5: Serif the sheet title.** Find the "Más" sheet title Typography (search the file for the title text/render near the grabber) and set `fontFamily: qeFont.serif` to match the mockup. If the row `borderRadius: radius.lg` reference at the old row level is now unused, leave imports; unused-token cleanup happens in the final phase.

- [ ] **Step 6: Typecheck + build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 7: Visual QA**

Run: `npm run dev`. Open the More sheet (tap "Más") in light and dark, as a staff/admin user so all three sections show. Confirm: grouped containers with hairline dividers, uniform emerald icon chips (no per-tool colors, no gold), mono section overlines, serif title, emerald role chip. Compare against the approved "B · Grouped list" mockup.

- [ ] **Step 8: Commit**

```bash
git add src/components/ios/IOSMoreSheet.tsx
git commit -m "feat(qe): grouped-list More sheet with single emerald accent

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: De-gold the More sheet search chips (MoreSheetSearch)

**Files:**

- Modify: `src/components/ios/MoreSheetSearch.tsx:39-44` (imports), `:332-336`, `:349-353` (chips)

**Interfaces:**

- Consumes: `primitiveColors.emerald` (already imported/used for other chips).

- [ ] **Step 1: Drop the gold import.** Remove `import { goldAccent } from '../../design-system/tokens/colors';` (`MoreSheetSearch.tsx:39`).

- [ ] **Step 2: Point both chips at emerald.** At `MoreSheetSearch.tsx:332-336` (Joyería chip) and `:349-353` (Premium chip), replace the two `goldAccent.primary` / `goldAccent.dark` arguments to `getFilterChipSx(...)` with the emerald equivalents already used elsewhere in the file — use `primitiveColors.emerald[500]` and `primitiveColors.emerald[700]` (match whatever emerald steps the file's other chips pass; read them first to stay consistent).

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: PASS (no remaining `goldAccent` reference — grep returns nothing in this file).

- [ ] **Step 4: Commit**

```bash
git add src/components/ios/MoreSheetSearch.tsx
git commit -m "feat(qe): de-gold the More sheet filter chips

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Filter sheet → Quiet Emerald (IOSFilterSheet)

**Files:**

- Modify: `src/components/ios/IOSFilterSheet.tsx:31-40` (imports), `:126` (mode), and the emeraldCore/surfaces usages at `:145-147`, `:157-165`, `:260`, `:270-284`, `:299-302`, `:604`, `:610`, `:651`

**Interfaces:**

- Consumes: `useThemeMode` (already imported, `IOSFilterSheet.tsx:21`, used at `:126`).

- [ ] **Step 1: Import the QE accessor.** Add `getQuietEmerald` to the `'../../design-system'` import group (`IOSFilterSheet.tsx:37-40`). Immediately after `const { mode } = useThemeMode();` (`:126`) add `const qe = getQuietEmerald(mode);`.

- [ ] **Step 2: Swap emerald accents.** Replace every `emeraldCore.primary` in this file (`:145,147,158,162,163,165,260,300,301,299,604,610,651`) with `qe.accent`, and any `alpha(emeraldCore.primary, x)` with `alpha(qe.accent, x)`. Replace the container surfaces (`:270-284`) `surfacesLight.background.primary`/`surfacesDark.background.secondary` with `qe.surface`, and the border `surfacesLight.border.light`/`surfacesDark.border.light` with `qe.border`. Replace the chip fallback backgrounds (`:159-161`) `surfacesLight.background.secondary`/`surfacesDark.background.tertiary` with `qe.well`.

- [ ] **Step 3: Remove now-unused legacy imports.** If `emeraldCore`, `surfacesLight`, `surfacesDark` are no longer referenced, drop them from the `'../../design-system/tokens/colors'` import (`:31-36`); keep `semanticColors` (still used at `:604`).

- [ ] **Step 4: Typecheck + build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Visual QA**

Run: `npm run dev`. On `/treasure`, open the filter panel in light and dark: active chips/rows use QE emerald, the panel surface + border are QE neutrals, no legacy tint.

- [ ] **Step 6: Commit**

```bash
git add src/components/ios/IOSFilterSheet.tsx
git commit -m "feat(qe): migrate filter sheet to Quiet Emerald tokens

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Settings sheet — flatten the backdrop (IOSSettingsSheet)

**Files:**

- Modify: `src/components/ios/IOSSettingsSheet.tsx:153-161` (Backdrop)

**Interfaces:**

- The sheet surface already reads `var(--surface-secondary)` (fed by `ThemeContext` from QE) — no color change needed.

- [ ] **Step 1: Remove the backdrop blur** for consistency with the flat language. In the `Backdrop` sx (`IOSSettingsSheet.tsx:153-161`), delete the line `backdropFilter: \`blur(${blurValues.md})\`,`leaving the dim`backgroundColor: blackAlpha(0.4)`.

- [ ] **Step 2: Drop the now-unused `blurValues` import** from `IOSSettingsSheet.tsx:16` if nothing else in the file uses it (grep `blurValues` in the file first).

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Visual QA**

Run: `npm run dev`. Open the settings sheet in light and dark: the sheet is a flat QE surface over a plain dim scrim (no blur); theme/language/currency controls unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/ios/IOSSettingsSheet.tsx
git commit -m "feat(qe): flatten settings sheet backdrop

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Invitation entry — retire the vault, apply "whisper" (InvitationPage)

**Files:**

- Modify: `src/pages/InvitationPage.tsx:33-45` (imports), `:51-68` (vault tokens), `:84-104` (button), `:152-173` (background), `:195-201` (card), `:268-295` (PIN box), `:303-313` (digit)

**Interfaces:**

- Dark-only (D5): resolve QE via direct constants, NOT `getQuietEmerald(mode)`.

- [ ] **Step 1: Import QE dark constants.** In the design-system import block (`InvitationPage.tsx:33-45`) add `qeDark`, `qeAccent`, `qeFont` (keep `emeraldAlpha`, `whiteAlpha`, `blackAlpha`, `cssTransition`, `fontWeights`, `primitiveColors`, `zIndex`; you may drop `blurValues`, `emeraldShadows`, `legacyTypography`, `emeraldCore` once unused after this task).

- [ ] **Step 2: Rebuild the `vault` object on QE-dark.** Replace `InvitationPage.tsx:51-68` — same keys (so the rest of the file keeps compiling), QE values, no glow color needed as a heavy shadow:

```tsx
const vault = {
  bg: qeDark.base, // #0E1110 flat
  card: qeDark.surface, // #15191A solid (no translucency)
  cardBorder: qeDark.border, // #272C2B hairline
  surface: qeDark.surfaceRaised, // #1B1F1F
  text: qeDark.text, // #EAEDEB
  textMuted: qeDark.textMuted, // #9AA09D
  textDim: qeDark.subtle, // #6B726F
  emerald: qeAccent.dark.accent, // #34C99B
  emeraldGlow: 'none',
  error: primitiveColors.system.red.dark,
  errorDim: 'rgba(255, 69, 58, 0.12)',
  warning: primitiveColors.system.orange.dark,
  warningDim: 'rgba(255, 159, 10, 0.12)',
  serif: qeFont.serif,
  mono: qeFont.mono,
  system: qeFont.ui,
} as const;
```

- [ ] **Step 3: Make the CTA a solid emerald button.** Replace `emeraldBtnSx` (`InvitationPage.tsx:84-104`):

```tsx
const emeraldBtnSx = {
  py: 1.5,
  borderRadius: '14px',
  fontSize: '0.95rem',
  fontWeight: fontWeights.semibold,
  fontFamily: vault.system,
  textTransform: 'none' as const,
  background: qeAccent.dark.strong, // #00AF84 solid, no gradient
  color: qeAccent.dark.on, // #06140E
  border: 'none',
  boxShadow: 'none',
  '&:hover': { background: qeAccent.dark.accent },
  '&:disabled': {
    background: emeraldAlpha(0.15),
    color: whiteAlpha(0.3),
    boxShadow: 'none',
  },
};
```

- [ ] **Step 4: Reduce the background to a single faint halo.** Replace the PageShell `::before`/`::after` (`InvitationPage.tsx:152-173`) — keep ONE faint emerald halo, delete the grid (`::after`) entirely:

```tsx
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${emeraldAlpha(0.06)} 0%, transparent 60%)`,
          pointerEvents: 'none',
        },
```

- [ ] **Step 5: Flatten the card.** Replace the GlassCard blur/shadow block (`InvitationPage.tsx:195-201`) with a flat solid card:

```tsx
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        boxShadow: '0 20px 46px -26px rgba(0,0,0,0.8)', // qeShadow.dark value (qeDark has no shadow key)
```

(Also ensure the card's `backgroundColor` uses `vault.card` (now solid `#15191A`) and `border: 1px solid ${vault.cardBorder}` — update those props on the same card element if they still reference the translucent values.)

- [ ] **Step 6: Neutralize the PIN boxes until filled.** Replace the digit box `sx` (`InvitationPage.tsx:270-295`) so empty/active boxes are neutral hairline, filled boxes turn emerald, no glow, no pulse:

```tsx
              sx={{
                width: { xs: 52, sm: 58 },
                height: { xs: 62, sm: 68 },
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: filled ? emeraldAlpha(0.10) : vault.surface,
                border: '1.5px solid',
                borderColor: filled
                  ? qeAccent.dark.strong
                  : active
                  ? vault.textDim
                  : vault.cardBorder,
                boxShadow: 'none',
                transition: cssTransition.fast,
              }}
```

- [ ] **Step 7: Keep the digit mono, recolor to emerald accent.** In the digit Typography (`InvitationPage.tsx:303-313`) leave `fontFamily: vault.mono` and set `color: vault.emerald` (now `#34C99B`). No other change.

- [ ] **Step 8: Typecheck + build**

Run: `npm run lint && npm run build`
Expected: PASS. Grep the file for `blurValues`, `emeraldShadows`, `legacyTypography` and remove any now-unused imports flagged by the typecheck.

- [ ] **Step 9: Visual QA**

Run: `npm run dev`. Visit an invite route (e.g. `/invite/TEST` — the PIN state renders even before validation). Confirm: flat near-black background with one faint emerald halo (no grid, no glass card blur), neutral PIN boxes that fill emerald as you type, a solid emerald CTA, serif heading + mono digits. Compare against the approved "B · Whisper" mockup. Confirm it renders identically regardless of the app's light/dark setting (it is forced dark).

- [ ] **Step 10: Commit**

```bash
git add src/pages/InvitationPage.tsx
git commit -m "feat(qe): retire invitation vault for the quiet 'whisper' entry

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (both phases)

- [ ] `npm run lint` — clean.
- [ ] `npm run test:unit` — all green, including `quietEmeraldShim`.
- [ ] `npm run build` — clean production build.
- [ ] Grep guard: `grep -rn "goldAccent\|glassGold\|HEADER_GRADIENT" src/components/ios src/pages/InvitationPage.tsx` returns nothing.
- [ ] Screenshot QA of the four shell surfaces (header, More sheet, filter sheet, settings sheet) in light + dark, plus the invitation PIN screen, all matching their approved mockups.

## Notes / deviations from the spec

- The spec anticipated adding a `qeChart` categorical palette in Phase 0. Discovery: a dedicated `src/design-system/tokens/charts.ts` already exists (`chartColors`/`chartTokens`/`chartBadge`), so Phase 0 de-golds it in place (Task 2, Step 2) instead of adding a new export — simpler and avoids a redundant API. Analytics chart refactors onto these tokens remain in the later admin phase.
- Gold maps to a cool **graphite** (`qeGray`) rather than emerald, so former "premium/secondary" signals stay distinct from the single emerald accent instead of becoming a competing green. Per-area phases can promote specific spots to emerald where that reads better.
