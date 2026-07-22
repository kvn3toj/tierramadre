# DS3 Enforcement (ESLint Guardrails) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up ESLint from scratch and turn on the DS3 §11 guardrails so the Quiet Emerald system stops decaying back to v1 — blocking hex/`rgba()` literals, `100vh`, `zIndex:` integer literals, and legacy token imports in feature code.

**Architecture:** The project currently has **no ESLint** (`npm run lint` is only `tsc --noEmit`). We add ESLint 9 flat config (`eslint.config.js`) with `typescript-eslint`, containing **only** the DS3 custom `no-restricted-syntax` / `no-restricted-imports` rules — not the full recommended rule set, to avoid drowning the migration in unrelated noise. Rules ship as **warnings globally** and **errors for already-migrated directories** (the "warning during migration → error per migrated directory" contract from PRD §7). A new `lint:ds3` script runs them; the existing `lint` (tsc) is untouched.

**Tech Stack:** ESLint 9 (flat config, ESM), `typescript-eslint` v8, `globals`. React 18.3 + TypeScript 5.6 + Vite 5.4, `"type": "module"`, npm.

## Global Constraints

- **Additive, zero runtime impact.** This plan touches only dev tooling and config. No `src/**` runtime code changes except test fixtures under `eslint-fixtures/`.
- **Never break the existing `lint` script.** `"lint": "tsc --noEmit && tsc --noEmit -p api/tsconfig.json"` stays exactly as-is. DS3 linting is a separate `lint:ds3` script.
- **Warnings globally, errors only where already clean.** Turning any rule to `error` globally would fail instantly (133 `emeraldCore`, 48 hex, 24 `100vh` files exist today). Migrated dirs escalate to `error`; everywhere else is `warn`.
- **Flat config only** (`eslint.config.js`), ESM syntax (`export default`), because `package.json` has `"type": "module"`.
- **Design-system source is exempt from the hex ban.** `src/design-system/**` legitimately defines hex tokens; the ban targets feature code (`src/components/**`, `src/pages/**`, `src/contexts/**`).
- **Selectors are esquery** against the `@typescript-eslint/parser` AST. Regex selectors use the `raw`/`value` node fields.

---

### Task 1: Install ESLint and a minimal flat config that runs clean

**Files:**

- Modify: `package.json` (devDependencies + `lint:ds3` script)
- Create: `eslint.config.js`
- Create: `eslint-fixtures/clean.tsx` (a known-good file the linter must pass)

**Interfaces:**

- Produces: an `eslint.config.js` default-exporting a flat-config array `config`, and an `npm run lint:ds3` script that runs `eslint "src/**/*.{ts,tsx}"`. Later tasks push rule objects into the `rules` block of the feature-code config entry.

- [ ] **Step 1: Install the toolchain**

Run:

```bash
npm install -D eslint@^9 typescript-eslint@^8 globals@^15
```

Expected: packages added to `devDependencies`, no peer-dependency errors.

- [ ] **Step 2: Write the known-good fixture (the "passing test")**

Create `eslint-fixtures/clean.tsx`:

```tsx
import { getQuietEmerald } from '../src/design-system';

export function Clean() {
  const qe = getQuietEmerald('light');
  return { color: qe.accent, zIndexToken: 'var(--tm-z-base)' };
}
```

- [ ] **Step 3: Write the minimal flat config**

Create `eslint.config.js`:

```js
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'convex/_generated/**',
      '**/*.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'eslint-fixtures/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    // DS3 guardrails only — added in later tasks. Intentionally NOT extending
    // recommended: this config exists to enforce Quiet Emerald, not to lint
    // the whole codebase.
    rules: {},
  },
);
```

- [ ] **Step 4: Add the `lint:ds3` script**

In `package.json` `scripts`, add after the existing `"lint"` line:

```json
"lint:ds3": "eslint \"src/**/*.{ts,tsx}\" \"eslint-fixtures/**/*.{ts,tsx}\"",
```

- [ ] **Step 5: Run it — expect a clean pass (empty ruleset)**

Run: `npm run lint:ds3`
Expected: exit 0, no output. Confirms ESLint parses TS/TSX and the config loads.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json eslint.config.js eslint-fixtures/clean.tsx
git commit -m "chore(ds3): stand up ESLint 9 flat config (guardrail rules follow)"
```

---

### Task 2: Ban raw hex and rgba() color literals in feature code

**Files:**

- Modify: `eslint.config.js` (add rule to the feature-code entry)
- Create: `eslint-fixtures/bad-hex.tsx`

**Interfaces:**

- Consumes: the `config` array and `lint:ds3` script from Task 1.
- Produces: a `no-restricted-syntax` rule flagging string literals containing 6-digit hex or `rgba(`/`rgb(`.

- [ ] **Step 1: Write the failing fixture**

Create `eslint-fixtures/bad-hex.tsx`:

```tsx
export const bad = {
  a: '#00AF84',
  b: 'rgba(0,0,0,0.06)',
};
```

- [ ] **Step 2: Add the rule**

In `eslint.config.js`, replace `rules: {}` in the feature-code entry with:

```js
rules: {
  'no-restricted-syntax': [
    'warn',
    {
      selector: "Literal[value=/#[0-9a-fA-F]{6}\\b/]",
      message:
        'DS3: no hex color literals in feature code. Use getQuietEmerald(mode) tokens or var(--tm-*).',
    },
    {
      selector: "Literal[value=/rgba?\\(/]",
      message:
        'DS3: no rgba()/rgb() literals. Use alpha(qe.token, n) from @mui/material/styles with a DS3 token.',
    },
  ],
},
```

- [ ] **Step 3: Run — expect warnings on the bad fixture, none on clean**

Run: `npm run lint:ds3`
Expected: 2 warnings, both in `eslint-fixtures/bad-hex.tsx` (`#00AF84`, `rgba(...)`), zero in `clean.tsx`. Exit 0 (warnings don't fail).

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js eslint-fixtures/bad-hex.tsx
git commit -m "chore(ds3): eslint rule — ban hex/rgba color literals (warn)"
```

---

### Task 3: Ban `100vh` / `calc(100vh` magic viewport offsets

**Files:**

- Modify: `eslint.config.js`
- Create: `eslint-fixtures/bad-vh.tsx`

**Interfaces:**

- Consumes: the rule array from Task 2.
- Produces: two additional `no-restricted-syntax` entries covering both plain string literals and template-string chunks.

- [ ] **Step 1: Write the failing fixture**

Create `eslint-fixtures/bad-vh.tsx`:

```tsx
export const bad = {
  a: '100vh',
  b: `calc(100vh - 64px)`,
};
```

- [ ] **Step 2: Add the rules**

In `eslint.config.js`, append these two objects to the `no-restricted-syntax` array (after the rgba entry):

```js
{
  selector: "Literal[value=/100vh|100dvh/]",
  message:
    'DS3: no 100vh/100dvh magic offsets. Use a measured height (ResizeObserver / the shell layout tokens) — heights are measured, never guessed.',
},
{
  selector: "TemplateElement[value.raw=/100vh|calc\\(100vh/]",
  message:
    'DS3: no calc(100vh ...) in template strings. Measure the height instead.',
},
```

- [ ] **Step 3: Run — expect 2 new warnings on the vh fixture**

Run: `npm run lint:ds3`
Expected: warnings now include `eslint-fixtures/bad-vh.tsx` line 2 (`100vh`) and line 3 (`calc(100vh`). `clean.tsx` still zero.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js eslint-fixtures/bad-vh.tsx
git commit -m "chore(ds3): eslint rule — ban 100vh/calc(100vh) offsets (warn)"
```

---

### Task 4: Ban `zIndex:` integer literals (must use the z-index scale)

**Files:**

- Modify: `eslint.config.js`
- Create: `eslint-fixtures/bad-zindex.tsx`

**Interfaces:**

- Consumes: the rule array from Task 3.
- Produces: a `no-restricted-syntax` entry matching numeric literals assigned to a `zIndex` property.

- [ ] **Step 1: Write the failing fixture**

Create `eslint-fixtures/bad-zindex.tsx`:

```tsx
export const bad = { zIndex: 1300 };
export const ok = { zIndex: 'var(--tm-z-modal)' };
```

- [ ] **Step 2: Add the rule**

Append to the `no-restricted-syntax` array:

```js
{
  selector: "Property[key.name='zIndex'] > Literal[raw=/^-?[0-9]+$/]",
  message:
    'DS3: no raw zIndex integers. Use the zIndex scale from @/design-system (zIndex.base/modal/...).',
},
```

- [ ] **Step 3: Run — expect 1 warning (the `1300`), none on the token form**

Run: `npm run lint:ds3`
Expected: one new warning at `eslint-fixtures/bad-zindex.tsx` line 1; the `'var(--tm-z-modal)'` string on line 2 is NOT flagged (matches `raw=/^-?[0-9]+$/` only for the integer).

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js eslint-fixtures/bad-zindex.tsx
git commit -m "chore(ds3): eslint rule — ban raw zIndex integers (warn)"
```

---

### Task 5: Ban legacy-compat and deep design-system internal imports in feature code

**Files:**

- Modify: `eslint.config.js`
- Create: `eslint-fixtures/bad-import.tsx`

**Interfaces:**

- Consumes: the feature-code config entry from Task 1.
- Produces: a `no-restricted-imports` rule with `patterns` for `tokens/legacy-compat` and deep `design-system/*` reach-arounds. Note: `tokens/colors` (source of `emeraldCore`) is added here as a **warn** so the Fase-2 migration plan can drive it to zero, but is NOT yet an error.

- [ ] **Step 1: Write the failing fixture**

Create `eslint-fixtures/bad-import.tsx`:

```tsx
// @ts-nocheck
import { brand } from '../src/design-system/tokens/legacy-compat';
import { emeraldCore } from '../src/design-system/tokens/colors';
export const x = [brand, emeraldCore];
```

- [ ] **Step 2: Add the rule to the feature-code entry**

In `eslint.config.js`, inside the same feature-code config object, add a sibling key to `no-restricted-syntax`:

```js
'no-restricted-imports': [
  'warn',
  {
    patterns: [
      {
        group: ['**/design-system/tokens/legacy-compat', '**/tokens/legacy-compat'],
        message:
          'DS3: legacy-compat is retired. Import DS3 tokens from @/design-system.',
      },
      {
        group: ['**/design-system/tokens/colors'],
        message:
          'DS3: emeraldCore/goldAccent are legacy named exports. Use getQuietEmerald(mode) from @/design-system (see the Fase-2 migration plan).',
      },
    ],
  },
],
```

- [ ] **Step 3: Run — expect 2 import warnings**

Run: `npm run lint:ds3`
Expected: warnings on both import lines of `bad-import.tsx`. `clean.tsx` (imports from `../src/design-system`) still zero.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js eslint-fixtures/bad-import.tsx
git commit -m "chore(ds3): eslint rule — warn on legacy-compat/tokens/colors imports"
```

---

### Task 6: Escalate the guardrails to ERROR for already-migrated directories

**Files:**

- Modify: `eslint.config.js` (add a second, higher-severity config entry scoped to clean dirs)
- Create: `eslint-fixtures/migrated/error-hex.tsx`

**Interfaces:**

- Consumes: all rules defined in Tasks 2–5.
- Produces: a flat-config entry that redeclares the same rules at `error` for a curated `files` allowlist of directories already free of DS3 debt. This is the PRD §7 "error por directorio migrado" mechanism.

- [ ] **Step 1: Confirm which directories are already clean**

Run:

```bash
for d in src/design-system src/components/treasure/browser; do
  echo "== $d =="; grep -rlnE "#[0-9A-Fa-f]{6}|rgba?\(|100vh|emeraldCore" "$d" --include='*.tsx' | grep -v '/tokens/' || echo "clean"
done
```

Expected: `src/components/treasure/browser` reports `clean` (migrated this session). `src/design-system` will list token files — that's why the escalation allowlist targets feature dirs, not design-system source.

- [ ] **Step 2: Write a fixture that must ERROR under the escalation**

Create `eslint-fixtures/migrated/error-hex.tsx`:

```tsx
export const bad = { color: '#00AF84' };
```

- [ ] **Step 3: Add the escalation config entry**

In `eslint.config.js`, add a new object to the exported array **after** the feature-code entry:

```js
{
  // Directories already migrated to DS3: the same guardrails, but as ERRORS.
  // Add a directory here the moment it reaches zero DS3 debt (see Fase-2 plan).
  files: [
    'src/components/treasure/browser/**/*.{ts,tsx}',
    'eslint-fixtures/migrated/**/*.{ts,tsx}',
  ],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: { ...globals.browser },
  },
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "Literal[value=/#[0-9a-fA-F]{6}\\b/]",
        message: 'DS3: no hex color literals. Use getQuietEmerald(mode) tokens.',
      },
      {
        selector: "Literal[value=/rgba?\\(/]",
        message: 'DS3: no rgba()/rgb() literals. Use alpha(qe.token, n).',
      },
      {
        selector: "Literal[value=/100vh|100dvh/]",
        message: 'DS3: no 100vh/100dvh offsets. Measure the height.',
      },
      {
        selector: "TemplateElement[value.raw=/100vh|calc\\(100vh/]",
        message: 'DS3: no calc(100vh ...) in template strings.',
      },
      {
        selector: "Property[key.name='zIndex'] > Literal[raw=/^-?[0-9]+$/]",
        message: 'DS3: no raw zIndex integers. Use the zIndex scale.',
      },
    ],
  },
},
```

- [ ] **Step 4: Run — expect an ERROR (non-zero exit) from the migrated fixture**

Run: `npm run lint:ds3`
Expected: `eslint-fixtures/migrated/error-hex.tsx` reports an **error**; `npm run lint:ds3` exits non-zero. Feature-code fixtures still report as warnings (exit would be non-zero now due to the error — that is correct).

- [ ] **Step 5: Verify the real migrated dir is still clean under error severity**

Run: `npx eslint "src/components/treasure/browser/**/*.{ts,tsx}"`
Expected: exit 0 (the browser dir was migrated this session; it must survive its own error-level rules). If anything flags, fix that file before continuing — it is a real regression.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js eslint-fixtures/migrated/error-hex.tsx
git commit -m "chore(ds3): escalate guardrails to error for migrated dirs (treasure/browser)"
```

---

### Task 7: Document the ruleset and wire it into the contributor workflow

**Files:**

- Modify: `DESIGN-SYSTEM-V3.md` (§11 — mark enforcement as live, link the config)
- Modify: `package.json` (fold `lint:ds3` into a combined check)

**Interfaces:**

- Consumes: the working `lint:ds3` script.
- Produces: a `lint:all` script and a short §11 status note. No new rules.

- [ ] **Step 1: Add a combined check script**

In `package.json` `scripts`, add:

```json
"lint:all": "npm run lint && npm run lint:ds3",
```

- [ ] **Step 2: Run the combined check**

Run: `npm run lint:all`
Expected: `tsc` passes; `lint:ds3` prints the current warning inventory (the outstanding debt: ~48 hex, ~24 vh, ~133 legacy import files) and exits non-zero only if a _migrated_ dir regressed. Record the warning counts in the commit body.

- [ ] **Step 3: Update §11 of the spec**

In `DESIGN-SYSTEM-V3.md`, at the end of §11, append:

```markdown
**Status (2026-07-21):** enforcement is live via `eslint.config.js` (`npm run lint:ds3`). Rules run as warnings across `src/**` and as errors for migrated directories (currently `src/components/treasure/browser`). Add a directory to the error-escalation block the moment it reaches zero DS3 debt — see `docs/superpowers/plans/2026-07-21-ds3-fase2-color-token-migration.md`.
```

- [ ] **Step 4: Commit**

```bash
git add package.json DESIGN-SYSTEM-V3.md
git commit -m "docs(ds3): mark §11 enforcement live; add lint:all combined check"
```

---

## Self-Review

- **Spec coverage (§11 / PRD §7):** hex ✅(T2) · rgba ✅(T2) · 100vh/calc ✅(T3) · zIndex integers ✅(T4) · legacy-compat import ✅(T5) · one import surface (tokens/colors warn) ✅(T5) · warning→error per migrated dir ✅(T6) · workflow/docs ✅(T7). Not covered by lint (deliberately, hard to statically detect): "no re-implemented styled button/card/sheet outside design-system" and "overflow:'auto' bare" — these remain PR-review checks noted in §7; flagging them reliably needs a custom rule beyond this plan's scope. Called out here so it is not mistaken for done.
- **Placeholder scan:** every rule ships with a concrete esquery selector and a fixture; no TBDs.
- **Type/name consistency:** `lint:ds3`, `lint:all`, and the `eslint.config.js` default export are referenced consistently across tasks; the escalation entry reuses the exact selectors from T2–T4.
- **Known selector limitation:** the hex rule matches string `Literal`s only; a hex built by template interpolation (`` `#${x}` ``) is not caught. Acceptable — such patterns are vanishingly rare and caught in review.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-ds3-enforcement-eslint.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute in this session with checkpoints.

Which approach?
