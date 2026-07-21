# DS3 Fase 2 — Color Token Migration (emeraldCore/goldAccent → Quiet Emerald) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the legacy `emeraldCore` and `goldAccent` named color exports (imported by ~133 feature files) in favor of the mode-aware `getQuietEmerald(mode)` token set, worst-first by directory, so the "theme is data, one import surface" contract of DS3 holds and Phase 4 retirement becomes unblockable.

**Architecture:** `emeraldCore`/`goldAccent` already hold the correct Quiet Emerald hex values, so this is a **token-convergence refactor, not a recolor** — the pixels barely change. The one real subtlety: `emeraldCore.*` is a single fixed hex (mode-agnostic), while `getQuietEmerald(mode).*` is mode-aware. Each consumer therefore gains a `const qe = getQuietEmerald(mode)` derivation (mode from `useThemeMode()` or an existing `isLight` prop) and swaps each `emeraldCore.X` for its mapped `qe` token per the table below. Migration proceeds one directory per task, hotspots first; each cleaned directory is immediately escalated to `error` in the DS3 ESLint config.

**Tech Stack:** React 18.3 + TypeScript 5.6, MUI v6 `sx`, `getQuietEmerald` / `qeFont` / `alpha` from `@mui/material/styles`. Verification via `tsc --noEmit`, `grep`, and the dev server (`npm run dev`, localhost:3000).

## Global Constraints

- **Prerequisite:** the DS3 ESLint config from `docs/superpowers/plans/2026-07-21-ds3-enforcement-eslint.md` must exist (this plan escalates directories to `error` in it). If it does not, do that plan first.
- **Zero visual regression is the bar.** `emeraldCore.X` and its `qe` mapping resolve to the same hex in the same mode. Any _intended_ change (accent-pure → accent on a chip, per Jewelry-Not-Paint) is called out explicitly per file, never silent.
- **Mode-aware, never fixed, when a component renders in both themes.** Derive `qe` from the component's real mode. Only use a fixed `qeAccent.light.*` / `qeAccent.dark.*` constant when the value is consumed outside React render (e.g. a static chart palette) where no mode is available — and say so in a comment.
- **One import surface.** New imports come from `@/design-system` (the barrel: `getQuietEmerald`, `qeFont`, `alpha`), never from `design-system/tokens/colors`.
- **The mapping table (below) is the complete transformation spec.** Every `emeraldCore.*` / `goldAccent.*` has exactly one target. Do not invent new tokens.
- **Jewelry-Not-Paint rule:** `emeraldCore.primary` (#00AF84 = accent-pure) is legitimate only for dots/ticks/trust badges. When it is a fill, border, or text color on an interactive control, migrate it to `qe.accent` (not `qe.accentPure`) — this is a deliberate, correct color shift, and must be noted in the commit.
- **Commit per directory.** Each task is one directory, independently reviewable.

## The Mapping Table (authoritative)

`const qe = getQuietEmerald(mode)` in scope. Left = legacy token, right = replacement.

| Legacy                 | Meaning                    | Replacement              | Notes                                                                        |
| ---------------------- | -------------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `emeraldCore.primary`  | #00AF84 accent-pure        | `qe.accentPure`          | If used as a fill/border/text on a control → `qe.accent` (Jewelry-Not-Paint) |
| `emeraldCore.dark`     | #00785C light accent       | `qe.accent`              | The everyday link/label/active emerald                                       |
| `emeraldCore.light`    | #34C99B dark accent / tint | `qe.accent`              | mode-aware `qe.accent` already resolves to #34C99B in dark                   |
| `emeraldCore.lighter`  | #6FDFBE                    | `alpha(qe.accent, 0.4)`  | soft tint                                                                    |
| `emeraldCore.lightest` | #E6F7F1 mist               | `alpha(qe.accent, 0.08)` | tint background                                                              |
| `emeraldCore.darker`   | #006F52 accent-strong      | `qe.accentStrong`        | primary-button fill                                                          |
| `emeraldCore.darkest`  | #00583F                    | `qe.accentStrong`        | no deeper token; strong is the floor                                         |
| `emeraldCore.vibrant`  | #34C99B                    | `qe.accentPure`          | bright moment                                                                |
| `emeraldCore.essence`  | #006F52                    | `qe.accentStrong`        | —                                                                            |
| `goldAccent.primary`   | #8C928F graphite           | `qe.subtle`              | neutral, not gold                                                            |
| `goldAccent.light`     | #9AA09D                    | `qe.muted`               | (dark-muted value)                                                           |
| `goldAccent.lighter`   | #C9CECB                    | `qe.border`              | hairline-ish                                                                 |
| `goldAccent.lightest`  | #EBEDEC                    | `qe.hairline`            | divider                                                                      |
| `goldAccent.dark`      | #5C6360                    | `qe.muted`               | secondary text                                                               |
| `goldAccent.darker`    | #3A403E                    | `qe.text`                | near-ink                                                                     |
| `goldAccent.darkest`   | #272C2B                    | `qe.border`              | dark border                                                                  |

**`alpha(emeraldCore.X, n)` → `alpha(<mapped token>, n)`** — keep the same `n`.

## Migration Recipe (apply to every file)

1. **Find the mode.** Search the file for `useThemeMode`, `mode`, `isLight`, `theme.palette.mode`, or an `isLight`/`mode` prop.
   - Has `mode`: use it.
   - Has `isLight` (bool): `const qe = getQuietEmerald(isLight ? 'light' : 'dark');`
   - Has neither but is a React component: add `const { mode } = useThemeMode();` (import from `../…/contexts/ThemeContext`) then `const qe = getQuietEmerald(mode);`.
   - Not a component (static module): use fixed `qeAccent.light.accent` etc. from `@/design-system` and add a comment `// static context: no theme mode available`.
2. **Swap the import.** Remove `emeraldCore`/`goldAccent` from the `tokens/colors` import; add `getQuietEmerald` (and `alpha` if tints are used) to the `@/design-system` import.
3. **Replace each usage** per the mapping table.
4. **Verify** the file typechecks and renders unchanged.

### Refinements learned from the pilot (Task 1 — components/comparison)

- **JnP hover rule.** When you JnP-shift an interactive fill from accent-pure to `qe.accent`, set its hover to `qe.accentStrong` (the darker "primary-button fill" step). Otherwise base==hover and the control stops darkening on hover. Any `&:hover` that previously used `emeraldCore.dark`/`.primary` on a JnP-shifted control becomes `qe.accentStrong`, not `qe.accent`.
- **Flat-gray caution.** A flat, mode-agnostic gray (`#666`, `#999`) mapped to `qe.muted` SHIFTS in light mode (`#999` -> `#5C6360`). Only map a flat gray to `qe.muted`/`qe.subtle` when the original already approximates the goldAccent step for that role; otherwise keep a fixed neutral (`qeGray[...]`) or flag it. Do not call such a swap "value-preserving."
- **Escalation = full de-hardcode.** Escalating a directory to ERROR requires ALL hex/rgba gone, not just emeraldCore/goldAccent. Expect to also convert `#fff`/`#000`/shadows -> `whiteAlpha`/`blackAlpha`, and semantic literals (`#ef4444`) -> the matching `*Alpha`/semantic token. Verify each such swap is byte-exact against the token definition (e.g. `semanticColors.error.main` IS `#EF4444`).
- **tokens/colors imports remain until Task 6.** Files may still import `surfacesLight`/`surfacesDark`/`semanticColors` from `tokens/colors` after this pass (warn-level). Step-3 acceptance is only "no `emeraldCore`/`goldAccent`"; full `tokens/colors` retirement is Task 6.
- **Do the live visual check** (Recipe step 4) at least once per directory pass. Code-only verification proved insufficient for confidence on the larger dirs.

## Worked Example (the pattern for every file)

`src/components/home/sections/GallerySection.tsx` — before:

```tsx
import { emeraldCore } from '../../../design-system/tokens/colors';
// ...
<Box
  sx={{ color: emeraldCore.dark, borderColor: alpha(emeraldCore.primary, 0.2) }}
/>;
```

After:

```tsx
import { getQuietEmerald } from '../../../design-system';
import { alpha } from '@mui/material/styles';
import { useThemeMode } from '../../../contexts/ThemeContext';
// inside the component:
const { mode } = useThemeMode();
const qe = getQuietEmerald(mode);
// ...
// emeraldCore.primary here was a decorative border tint, not a trust dot →
// migrate to qe.accent per Jewelry-Not-Paint.
<Box sx={{ color: qe.accent, borderColor: alpha(qe.accent, 0.2) }} />;
```

---

### Task 1: Prove the recipe on one directory — `components/comparison` (10 files)

**Files:**

- Modify: every `.tsx` in `src/components/comparison/` importing `emeraldCore`/`goldAccent` (enumerated in Step 1)
- Modify: `eslint.config.js` (escalate this dir to error)

**Interfaces:**

- Consumes: `getQuietEmerald(mode)` from `@/design-system` (existing).
- Produces: a fully-migrated `components/comparison` dir with zero `tokens/colors` imports, and the ESLint escalation pattern extended to cover it.

- [ ] **Step 1: Baseline — list the exact files and count**

Run:

```bash
grep -rln "emeraldCore\|goldAccent" src/components/comparison --include='*.tsx'
grep -rc "emeraldCore\|goldAccent" src/components/comparison --include='*.tsx' | grep -v ':0'
```

Expected: ~10 files with their per-file reference counts. Record this list.

- [ ] **Step 2: Migrate each listed file per the Recipe + Mapping Table**

For each file: find the mode, swap the import, replace usages. Apply the Jewelry-Not-Paint note wherever `emeraldCore.primary` is a fill/border/text on a control.

- [ ] **Step 3: Verify no legacy tokens remain in the directory**

Run: `grep -rn "emeraldCore\|goldAccent" src/components/comparison --include='*.tsx'`
Expected: **no output** (zero matches).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `src/components/comparison` (pre-existing `api/` errors, if any, are unrelated).

- [ ] **Step 5: Visual check**

Run `npm run dev` (if not already running), open the comparison surface (add two catalog items → open the comparison bar/modal at localhost:3000/treasure). Confirm emerald accents, borders, and neutral text look identical to before in **both** light and dark (toggle via the theme control or `localStorage['tierra-madre-theme']`).

- [ ] **Step 6: Escalate the directory to error in the DS3 lint config**

In `eslint.config.js`, add to the migrated-dirs `files` array (the error-severity entry):

```js
'src/components/comparison/**/*.{ts,tsx}',
```

Run: `npx eslint "src/components/comparison/**/*.{ts,tsx}"`
Expected: exit 0 (the dir is now clean and survives error-level rules).

- [ ] **Step 7: Commit**

```bash
git add src/components/comparison eslint.config.js
git commit -m "refactor(ds3): migrate components/comparison off emeraldCore/goldAccent → qe tokens"
```

---

### Task 2: `pages/ambassadors/profile/components` (13 files — largest hotspot)

**Files:**

- Modify: every `.tsx` in `src/pages/ambassadors/profile/components/` importing the legacy tokens
- Modify: `eslint.config.js`

**Interfaces:**

- Consumes: `getQuietEmerald(mode)`.
- Produces: the ambassador-profile component dir migrated and escalated to error.

- [ ] **Step 1: Baseline**

Run: `grep -rln "emeraldCore\|goldAccent" src/pages/ambassadors/profile/components --include='*.tsx'`
Expected: ~13 files. Record the list.

- [ ] **Step 2: Migrate each file** per the Recipe + Mapping Table.

- [ ] **Step 3: Verify zero legacy tokens**

Run: `grep -rn "emeraldCore\|goldAccent" src/pages/ambassadors/profile/components --include='*.tsx'`
Expected: no output.

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → no new errors in this path.

- [ ] **Step 5: Visual check** — open an ambassador profile route; verify accents/neutrals unchanged in light + dark.

- [ ] **Step 6: Escalate** — add `'src/pages/ambassadors/profile/components/**/*.{ts,tsx}'` to the error-dirs `files` array; run `npx eslint` on that glob → exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ambassadors/profile/components eslint.config.js
git commit -m "refactor(ds3): migrate ambassador profile components → qe tokens"
```

---

### Task 3: `components/home/sections` (8 files)

**Files:**

- Modify: legacy-token `.tsx` files in `src/components/home/sections/`
- Modify: `eslint.config.js`

- [ ] **Step 1: Baseline** — `grep -rln "emeraldCore\|goldAccent" src/components/home/sections --include='*.tsx'` (~8 files).
- [ ] **Step 2: Migrate** per Recipe + Mapping Table. Home sections are marketing-ish surfaces — watch for `emeraldCore.primary` used as large decorative fields; those violate Jewelry-Not-Paint and should become `qe.accent` or a neutral, noted in the commit.
- [ ] **Step 3: Verify zero** — `grep -rn "emeraldCore\|goldAccent" src/components/home/sections --include='*.tsx'` → no output.
- [ ] **Step 4: Typecheck** — `npx tsc --noEmit`.
- [ ] **Step 5: Visual** — open localhost:3000/home; scroll every section, light + dark.
- [ ] **Step 6: Escalate** — add `'src/components/home/sections/**/*.{ts,tsx}'`; `npx eslint` glob → exit 0.
- [ ] **Step 7: Commit** — `git commit -m "refactor(ds3): migrate home sections → qe tokens"`

---

### Task 4: Remaining 5-file hotspots — one commit each

**Files (each its own commit):**

- `src/components/treasure/**` (the non-browser treasure files, ~5)
- `src/components/shared/**` (~5)
- `src/components/gamification/**` (~5)
- `src/components/feedback/steps/**` (~5)
- `src/components/analytics/**` (~5)
- `src/pages/admin/Fotosintesis/components/**` (~5)

**Interfaces:** identical recipe; each dir escalated to error on completion.

For **each** directory above, run this five-step cycle (commit between directories):

- [ ] **Step A: Baseline** — `grep -rln "emeraldCore\|goldAccent" <dir> --include='*.tsx'`.
- [ ] **Step B: Migrate** per Recipe + Mapping Table.
- [ ] **Step C: Verify zero** — `grep -rn "emeraldCore\|goldAccent" <dir> --include='*.tsx'` → no output; then `npx tsc --noEmit`.
- [ ] **Step D: Visual + escalate** — open the matching route (Fotosíntesis admin, feedback flow, analytics dashboard, gamification surface, a shared component in situ); confirm light + dark; add `'<dir>/**/*.{ts,tsx}'` to the eslint error-dirs; `npx eslint` glob → exit 0.
- [ ] **Step E: Commit** — `git commit -m "refactor(ds3): migrate <dir> → qe tokens"`.

> Note for `components/treasure/**`: the `browser/` subdir is already migrated and already at error severity — do not re-touch it; this task covers only the remaining sibling files (e.g. `FilterContent`, `ListRow`, chips) that still import `emeraldCore`.

---

### Task 5: The long tail — 4-file and smaller dirs, batched

**Files:**

- Modify: all remaining `.tsx` importing `emeraldCore`/`goldAccent` after Tasks 1–4 (staff/requests, mi-perfil, admin/analytics, contexts, and scattered singles)
- Modify: `eslint.config.js`

**Interfaces:**

- Produces: **zero** feature files importing `tokens/colors` for `emeraldCore`/`goldAccent`.

- [ ] **Step 1: Enumerate what's left**

Run:

```bash
grep -rln "emeraldCore\|goldAccent" src --include='*.tsx' | grep -v '/design-system/'
grep -rln "emeraldCore\|goldAccent" src --include='*.tsx' | grep -v '/design-system/' | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn
```

Expected: the residual ~40–56 files grouped by directory. Record.

- [ ] **Step 2: Migrate directory by directory** (densest first) per the Recipe + Mapping Table, committing per directory with `git commit -m "refactor(ds3): migrate <dir> → qe tokens"`. Escalate each to the eslint error-dirs array as it clears.

- [ ] **Step 3: Global verify — zero feature consumers remain**

Run: `grep -rln "emeraldCore\|goldAccent" src --include='*.tsx' | grep -v '/design-system/'`
Expected: **no output**. (Only `src/design-system/**` may still reference them internally.)

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → clean (modulo pre-existing `api/` errors).

- [ ] **Step 5: Commit any final stragglers**

```bash
git add -A src
git commit -m "refactor(ds3): migrate remaining feature files off emeraldCore/goldAccent"
```

---

### Task 6: Promote the `tokens/colors` import ban to error and retire the exports

**Files:**

- Modify: `eslint.config.js` (flip the `tokens/colors` import rule to error for feature code)
- Modify: `src/design-system/tokens/colors.ts` (deprecate or delete the legacy exports)
- Modify: `src/design-system/index.ts` (drop the `emeraldCore` re-export if nothing internal needs it)

**Interfaces:**

- Consumes: a codebase where no feature file imports the legacy tokens (Task 5, Step 3).
- Produces: the legacy exports either deleted or marked `@deprecated` and blocked from feature code by lint — the precondition for Phase 4 retirement.

- [ ] **Step 1: Confirm design-system-internal usage only**

Run: `grep -rln "emeraldCore\|goldAccent" src --include='*.ts' --include='*.tsx'`
Expected: matches only under `src/design-system/**` (definitions + any internal use).

- [ ] **Step 2: Escalate the import rule to error for feature code**

In `eslint.config.js`, move the `**/design-system/tokens/colors` pattern out of the global `warn` `no-restricted-imports` into an error-severity entry scoped to `files: ['src/components/**', 'src/pages/**', 'src/contexts/**']`. Keep `src/design-system/**` exempt.

- [ ] **Step 3: Run the full DS3 lint — expect zero errors**

Run: `npm run lint:ds3`
Expected: no **errors** from the `tokens/colors` rule (all feature consumers migrated). Warnings for other rules (hex, etc.) may remain — that's other plans' scope.

- [ ] **Step 4: Deprecate or delete the legacy exports**

If `src/design-system/**` no longer uses them internally, delete `emeraldCore` and `goldAccent` from `tokens/colors.ts` and their barrel re-exports. If internal code still uses them, add `/** @deprecated DS3: use getQuietEmerald(mode). */` above each and leave a tracking note. Run `npx tsc --noEmit` after either path.

- [ ] **Step 5: Update the migration status doc**

In `DS3-MIGRATION-PRD.md` §6, append under the `tokens` row: `emeraldCore/goldAccent retired from feature code (2026-07-…); getQuietEmerald(mode) is the sole accent/neutral source.`

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js src/design-system DS3-MIGRATION-PRD.md
git commit -m "refactor(ds3): retire emeraldCore/goldAccent from feature code; lint blocks re-entry"
```

---

## Self-Review

- **Spec coverage (PRD Fase 2 / §6 consolidation map — tokens row):** every hotspot from the "orden de ataque" (comparison, ambassador, home, treasure siblings, feedback, admin) has a task ✅; the long tail is enumerated and batched (T5) ✅; the exports are retired and re-entry blocked (T6) ✅. Spacing/z-index literal convergence (also part of §6's "~411 spacing + ~83 z-index") is **out of scope for this plan** — it is color-token only; those are handled by the enforcement plan's warnings plus a future spacing plan. Flagged so it is not assumed done.
- **Placeholder scan:** no TBDs. The Mapping Table + Recipe + Worked Example are the complete transformation spec; per-directory file lists are generated by the exact `grep` in each task's baseline step (more reliable than hardcoding names that drift).
- **Type/name consistency:** `getQuietEmerald(mode)` returns the `QESurfaces` shape whose fields (`accent`, `accentStrong`, `accentPure`, `muted`, `subtle`, `border`, `hairline`, `text`) are exactly the mapping-table targets — verified against `src/design-system/tokens/quiet-emerald.ts`.
- **Ordering:** Task 1 (comparison) deliberately proves the recipe on a mid-size dir before the 13-file ambassador dir; ESLint escalation per task means a regression in a cleaned dir fails CI immediately.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-ds3-fase2-color-token-migration.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per directory task, review between tasks, fast iteration. Well suited here: each directory is independent and mechanical.
2. **Inline Execution** — execute in this session with checkpoints.

Which approach?
