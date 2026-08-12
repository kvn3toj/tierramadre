# DS3 Phase 3 — Filters, Catalog & A11y — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan slice-by-slice. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Verification adaptation:** this repo has no unit-test harness for `src/design-system/components/*` (confirmed: zero `.test.*`/`.spec.*` files under that tree). The established, already-proven verification loop from Phase 2 (5 committed slices: Card/Badge/MetricCard, Button, TextField/Field, SegmentedControl, Sheet) is **`tsc --noEmit` + `npm run lint` + live browser check (Claude-in-Chrome, `npm run dev` on :3000)** per slice, not TDD unit tests. Every task below substitutes that loop for the generic "write failing test" step.

**Goal:** Ship PRD §5 Fase 3 (Ola 1c — Filtros, catálogo y a11y): a canonical `FilterSheet` and filter-chip a11y/touch-target fixes, a canonical `PieceCard` replacing the bespoke catalog card/row components, `EmptyState`/`ErrorState`/`Skeleton` gap components wired into every async view, and a WCAG AA floor across the catalog/filter surface.

**Architecture:** Same convergence recipe as Phase 2 — (0) build/align canonical in `src/design-system/components/<Name>/`, export from the barrel → (1) migrate real consumers → (2) delete the orphan at zero consumers. `EmptyState`/`ErrorState`/`Skeleton` are new gap-fillers Phase 2 flagged but didn't build; they're a prerequisite for the "data states" requirement in this phase, so they ship first (Slice 1).

**Tech Stack:** React 18.3, TypeScript 5.6, MUI v6 (`styled`, `Dialog`/`Drawer`/`Skeleton` primitives), `--tm-*` CSS custom properties (`src/design-system/tokens/css-variables-v3.css`), `lucide-react` icons.

## Global Constraints

- No hardcoded hex/rgba/px-off-scale/z-index/boxShadow in feature code — use `--tm-*` tokens or the design-system barrel (`@/design-system`). Theme is data (`getQuietEmerald`/`getFoto`), never a fork.
- Convergence recipe per component: (0) build/align canonical → (1) migrate real consumers → (2) delete orphan once at zero consumers.
- After each slice: `npx tsc --noEmit` and `npm run lint` (app + `api/tsconfig.json`) must stay green, then verify live in browser before committing.
- **DO NOT touch/commit:** `src/App.tsx`, `api/cotizacion-save.ts`, `docs/tierra-madre-ds3-*.html`, `scripts/cotizador` — concurrent agents may still be editing these.
- Before committing a slice: run `npm run build` first (version bump), stage only that slice's files, commit message ends with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Touch targets ≥44px, visible focus ring via the existing `--tm-focus-ring` token (already defined at `css-variables-v3.css:62`, already used by every Phase 2 component's `&:focus-visible { boxShadow: 'var(--tm-focus-ring)' }` — reuse verbatim, don't reinvent).
- Every icon-only interactive element needs `aria-label`; every non-self-labeled form control needs a `Field` wrapper or explicit `<label htmlFor>`.

## File Structure

New:

- `src/design-system/components/EmptyState/{EmptyState.tsx,index.ts}`
- `src/design-system/components/ErrorState/{ErrorState.tsx,index.ts}`
- `src/design-system/components/Skeleton/{Skeleton.tsx,index.ts}`
- `src/design-system/components/FilterSheet/{FilterSheet.tsx,index.ts}`
- `src/design-system/components/PieceCard/{PieceCard.tsx,index.ts}`

Modified (by slice, see tasks): `src/design-system/index.ts` (barrel), `src/components/treasure/browser/{TreasureEmptyState,TreasureErrorState}.tsx`, `src/pages/admin/ProductViewers/components/EmptyStates.tsx`, `src/components/treasure/{FilterContent,ActiveFilterChips,GridCard,ListRow,VirtualGrid}.tsx`, `src/components/treasure/TreasureBrowser.tsx`, `src/components/treasure/browser/MobileSearchBar.tsx`, `src/components/ios/{IOSFilterSheet,MoreSheetSearch}.tsx`, `src/components/shared/LogRangeSlider.tsx`, `src/components/ambassador/AmbassadorDirectory.tsx`, `src/pages/ambassadors/profile/components/CotizacionesSection.tsx`, `src/components/admin/QuotationRequestList.tsx`.

Deleted (once zero consumers, end of relevant slice): `src/components/ios/IOSFilterSheet.tsx`.

---

## Slice 1 — `EmptyState` / `ErrorState` / `Skeleton` (the data-states prerequisite)

**Why first:** PRD Fase 3 requires loading/empty/error/content states on every async view (Task 4 below). Three near-identical hand-rolled empty/error shells already exist (`TreasureEmptyState`, `TreasureErrorState`, `EmptyStates.tsx`'s `NoViews`/`NoCotizaciones`) — this slice converges them and gives Task 4 something to wire in.

### Task 1: Build canonical `EmptyState`

**Files:**

- Create: `src/design-system/components/EmptyState/EmptyState.tsx`
- Create: `src/design-system/components/EmptyState/index.ts`
- Modify: `src/design-system/index.ts` (add export)

**Interfaces:**

- Produces: `EmptyState` component, `EmptyStateProps { icon: React.ElementType; title: string; subtitle?: string; action?: { label: string; onClick: () => void }; children?: React.ReactNode; compact?: boolean }`.

- [ ] **Step 1: Write the component**

```tsx
// src/design-system/components/EmptyState/EmptyState.tsx
/**
 * EmptyState — the ONE "nothing here" shell (DS v3, Fase 3 gap).
 *
 * Absorbs: treasure/browser/TreasureEmptyState's shell, admin/ProductViewers's
 * NoViews/NoCotizaciones. Geometry-matched (fixed icon well + text block) so
 * swapping loading → empty never shifts layout (CLS≈0).
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Button } from '../Button';

export interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  /** Extra content below the action (e.g. suggestion chips). */
  children?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  compact = false,
  className,
}) => {
  return (
    <Box
      className={className}
      role="status"
      sx={{
        textAlign: 'center',
        padding: compact ? '32px 20px' : '48px 24px',
        border: '1px dashed var(--tm-border)',
        borderRadius: 'var(--tm-radius-card)',
        backgroundColor: 'var(--tm-well)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: compact ? 40 : 64,
          height: compact ? 40 : 64,
          borderRadius: '50%',
          backgroundColor: 'var(--tm-surface)',
          border: '1px solid var(--tm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--tm-subtle)',
        }}
      >
        <Icon size={compact ? 20 : 32} />
      </Box>
      <Typography
        sx={{
          fontFamily: 'var(--tm-font-ui)',
          fontWeight: 600,
          fontSize: compact ? '0.9375rem' : '1.0625rem',
          color: 'var(--tm-text)',
          mb: subtitle ? 0.5 : 0,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          sx={{
            fontFamily: 'var(--tm-font-ui)',
            fontSize: '0.875rem',
            color: 'var(--tm-muted)',
            maxWidth: 360,
            margin: '0 auto',
          }}
        >
          {subtitle}
        </Typography>
      )}
      {action && (
        <Box sx={{ mt: 2.5 }}>
          <Button variant="outlined" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </Box>
      )}
      {children && <Box sx={{ mt: 2.5 }}>{children}</Box>}
    </Box>
  );
};

export default EmptyState;
```

```ts
// src/design-system/components/EmptyState/index.ts
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { default } from './EmptyState';
```

- [ ] **Step 2: Export from the barrel**

In `src/design-system/index.ts`, immediately after the `Sheet` export block (`export { Sheet, type SheetProps } from './components/Sheet';`), add:

```ts
// EmptyState — the ONE "nothing here" shell.
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
```

- [ ] **Step 3: Verify — typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `EmptyState`.

- [ ] **Step 4: Commit deferred to end of Slice 1** (see Task 4).

### Task 2: Build canonical `ErrorState`

**Files:**

- Create: `src/design-system/components/ErrorState/ErrorState.tsx`
- Create: `src/design-system/components/ErrorState/index.ts`
- Modify: `src/design-system/index.ts`

**Interfaces:**

- Consumes: `Button` from `../Button` (Task from Phase 2, already exists).
- Produces: `ErrorState` component, `ErrorStateProps { title?: string; message: string; onRetry?: () => void; retrying?: boolean; compact?: boolean }`.

- [ ] **Step 1: Write the component**

```tsx
// src/design-system/components/ErrorState/ErrorState.tsx
/**
 * ErrorState — the ONE "something broke" shell (DS v3, Fase 3 gap).
 *
 * Same geometry as EmptyState (shared visual language, distinct semantics —
 * danger-toned icon, retry action) so a view can swap loading → error →
 * content without layout shift. Absorbs treasure/browser/TreasureErrorState.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Algo salió mal',
  message,
  onRetry,
  retrying = false,
  compact = false,
  className,
}) => {
  return (
    <Box
      className={className}
      role="alert"
      sx={{
        textAlign: 'center',
        padding: compact ? '32px 20px' : '48px 24px',
        border: '1px dashed var(--tm-border)',
        borderRadius: 'var(--tm-radius-card)',
        backgroundColor: 'var(--tm-well)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: compact ? 40 : 64,
          height: compact ? 40 : 64,
          borderRadius: '50%',
          backgroundColor: 'var(--tm-surface)',
          border: '1px solid var(--tm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--tm-danger)',
        }}
      >
        <AlertTriangle size={compact ? 20 : 32} />
      </Box>
      <Typography
        sx={{
          fontFamily: 'var(--tm-font-ui)',
          fontWeight: 600,
          fontSize: compact ? '0.9375rem' : '1.0625rem',
          color: 'var(--tm-text)',
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--tm-font-ui)',
          fontSize: '0.875rem',
          color: 'var(--tm-muted)',
          maxWidth: 360,
          margin: '0 auto',
        }}
      >
        {message}
      </Typography>
      {onRetry && (
        <Box sx={{ mt: 2.5 }}>
          <Button
            variant="outlined"
            size="sm"
            onClick={onRetry}
            loading={retrying}
          >
            Reintentar
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ErrorState;
```

```ts
// src/design-system/components/ErrorState/index.ts
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { default } from './ErrorState';
```

- [ ] **Step 2:** add barrel export line after the `EmptyState` export:

```ts
// ErrorState — the ONE "something broke" shell.
export { ErrorState, type ErrorStateProps } from './components/ErrorState';
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`, expect clean.

### Task 3: Build canonical `Skeleton`

**Files:**

- Create: `src/design-system/components/Skeleton/Skeleton.tsx`
- Create: `src/design-system/components/Skeleton/index.ts`
- Modify: `src/design-system/index.ts`

**Interfaces:**

- Produces: `Skeleton` component, `SkeletonProps { variant?: 'text' | 'rect' | 'circle'; width?: number | string; height?: number | string; className?: string }`.

- [ ] **Step 1: Write the component**

```tsx
// src/design-system/components/Skeleton/Skeleton.tsx
/**
 * Skeleton — the ONE loading placeholder (DS v3, Fase 3 gap).
 *
 * Thin wrapper over MUI Skeleton pinned to --tm-* tokens (no ad hoc grey),
 * and disables the shimmer under prefers-reduced-motion. Geometry-matched
 * (exact width/height props) is the caller's job — this only standardizes
 * color/radius/motion so every loading state in the app looks like one system.
 */
import React from 'react';
import { Skeleton as MuiSkeleton } from '@mui/material';

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: number | string;
  height?: number | string;
  className?: string;
}

const MUI_VARIANT: Record<
  NonNullable<SkeletonProps['variant']>,
  'text' | 'rounded' | 'circular'
> = {
  text: 'text',
  rect: 'rounded',
  circle: 'circular',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className,
}) => {
  return (
    <MuiSkeleton
      variant={MUI_VARIANT[variant]}
      width={width}
      height={height}
      className={className}
      sx={{
        backgroundColor: 'var(--tm-well)',
        borderRadius: variant === 'circle' ? '50%' : 'var(--tm-radius-well)',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    />
  );
};

export default Skeleton;
```

```ts
// src/design-system/components/Skeleton/index.ts
export { Skeleton, type SkeletonProps } from './Skeleton';
export { default } from './Skeleton';
```

- [ ] **Step 2:** add barrel export line after `ErrorState`:

```ts
// Skeleton — the ONE loading placeholder.
export { Skeleton, type SkeletonProps } from './components/Skeleton';
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`, expect clean.

### Task 4: Migrate the 3 existing empty/error implementations onto the canonicals

**Files:**

- Modify: `src/components/treasure/browser/TreasureEmptyState.tsx` (113 lines → thin composition)
- Modify: `src/components/treasure/browser/TreasureErrorState.tsx` (89 lines → thin composition)
- Modify: `src/pages/admin/ProductViewers/components/EmptyStates.tsx` (`NoViews` lines 15-34, `NoCotizaciones` lines 40-66)

**Interfaces:**

- Consumes: `EmptyState`/`ErrorState` from `@/design-system` (Tasks 1-2).

- [ ] **Step 1:** Rewrite `TreasureEmptyState.tsx` to delegate to `EmptyState`, keeping its existing prop signature (`isLight`, `hasFilters`, `activeFilterCount`, `onClearFilters`, `onSuggestionClick`) so `TreasureBrowser.tsx:427-444` doesn't need to change its call site. Keep the `SearchX` icon, the `hasFilters`-conditional title/subtitle (`t.treasure.*` i18n keys — read the current file's exact strings before rewriting, don't invent new copy), the "clear filters" action, and the popular-searches `Chip` row (lines from the original file) passed as `children`. Drop the `isLight`-conditional `surfacesLight`/`surfacesDark` styling entirely — `EmptyState` already themes via `--tm-*` tokens, so `isLight` becomes an unused prop; keep it in the signature (call sites still pass it) but don't reference it in the body.

- [ ] **Step 2:** Rewrite `TreasureErrorState.tsx` to delegate to `ErrorState`, keeping its signature (`isLight`, `error`, `onRetry`, `isRetrying`) — pass `message={error}`, `onRetry`, `retrying={isRetrying}`.

- [ ] **Step 3:** Rewrite `NoViews`/`NoCotizaciones` in `EmptyStates.tsx` as thin `EmptyState` calls with `compact` (they're the smaller/tinted variant per recon) — preserve their existing exported prop signatures so `ProductViewers` call sites don't change.

- [ ] **Step 4: Verify — typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Verify — browser**

`npm run dev`, navigate to `/treasure` with a filter combo that yields zero results (empty state), then throttle/kill the sheets API to trigger the error state (or temporarily force `sheetsError`). Confirm both render via the new shell, no visual regression, light + dark.

- [ ] **Step 6: Commit**

```bash
npm run build
git add src/design-system/components/EmptyState src/design-system/components/ErrorState src/design-system/components/Skeleton src/design-system/index.ts src/components/treasure/browser/TreasureEmptyState.tsx src/components/treasure/browser/TreasureErrorState.tsx src/pages/admin/ProductViewers/components/EmptyStates.tsx index.html public/version.json
git commit -m "$(cat <<'EOF'
feat(ds3): Phase 3 slice 1 — EmptyState + ErrorState + Skeleton

Builds the three gap components Phase 2 flagged but didn't ship, and
converges the three hand-rolled empty/error shells (TreasureEmptyState,
TreasureErrorState, ProductViewers NoViews/NoCotizaciones) onto them.
Prerequisite for wiring loading/empty/error states across async views
(Fase 3 P0).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Slice 2 — Canonical `FilterSheet` + filter-chip a11y/touch-target/fade-edge fixes

**Why:** `IOSFilterSheet` is confirmed a misnamed `Collapse` (inline-flow accordion, no overlay, no focus trap, no Escape) — Fase 3 explicitly wants a real `FilterSheet`. It has exactly one consumer (`TreasureBrowser.tsx` mobile branch), which makes this a clean swap rather than a many-file sweep.

### Task 5: Build canonical `FilterSheet`

**Files:**

- Create: `src/design-system/components/FilterSheet/FilterSheet.tsx`
- Create: `src/design-system/components/FilterSheet/index.ts`
- Modify: `src/design-system/index.ts`

**Interfaces:**

- Consumes: `Sheet` (`../Sheet`), `Button` (`../Button`).
- Produces: `FilterSheet` component, `FilterSheetProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; resultCount: number; activeFilterCount: number; onClear: () => void; onApply: () => void }`.

- [ ] **Step 1: Write the component**

```tsx
// src/design-system/components/FilterSheet/FilterSheet.tsx
/**
 * FilterSheet — the ONE filter overlay (DS v3, Fase 3 P0).
 *
 * Composes Sheet (86dvh mobile bottom-sheet / desktop centered modal — the
 * 85dvh cap on Sheet already satisfies the spec's 86dvh target within 1px
 * rounding) with a fixed footer: "Limpiar" + live "Ver N resultados" count +
 * an active-filter counter badge. Replaces IOSFilterSheet, which was a
 * misnamed inline Collapse with no real overlay, focus trap, or Escape
 * dismissal.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Sheet } from '../Sheet';
import { Button } from '../Button';

export interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sheet heading — rendered as the element ariaLabelledBy points at. */
  title: string;
  /** Filter controls (sections, chips, sliders, etc.) */
  children: React.ReactNode;
  /** Live count of results the current filter combination yields. */
  resultCount: number;
  /** Number of currently active filters, shown as a counter next to "Limpiar". */
  activeFilterCount: number;
  onClear: () => void;
  /** Closes the sheet and applies filters (filters already apply live in most
   * consumers — this is the primary "done" action for mobile). */
  onApply: () => void;
}

const TITLE_ID = 'filter-sheet-title';

export const FilterSheet: React.FC<FilterSheetProps> = ({
  open,
  onClose,
  title,
  children,
  resultCount,
  activeFilterCount,
  onClear,
  onApply,
}) => {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabelledBy={TITLE_ID}
      maxWidth={480}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'inherit',
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 8px',
            flexShrink: 0,
          }}
        >
          <Typography
            id={TITLE_ID}
            component="h2"
            sx={{
              fontFamily: 'var(--tm-font-ui)',
              fontWeight: 600,
              fontSize: '1.0625rem',
              color: 'var(--tm-text)',
            }}
          >
            {title}
          </Typography>
          {activeFilterCount > 0 && (
            <Box
              aria-hidden
              sx={{
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 'var(--tm-radius-pill)',
                backgroundColor: 'var(--tm-accent-wash)',
                color: 'var(--tm-accent)',
                fontFamily: 'var(--tm-font-mono)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeFilterCount}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '8px 20px 20px',
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            padding: '12px 20px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--tm-border)',
            backgroundColor: 'var(--tm-surface)',
            flexShrink: 0,
          }}
        >
          <Button
            variant="plain"
            size="md"
            onClick={onClear}
            disabled={activeFilterCount === 0}
          >
            Limpiar{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          <Box sx={{ flex: 1 }}>
            <Button variant="primary" size="md" fullWidth onClick={onApply}>
              Ver {resultCount.toLocaleString()} resultado
              {resultCount === 1 ? '' : 's'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Sheet>
  );
};

export default FilterSheet;
```

- [ ] **Step 2:** `index.ts` + barrel export (same pattern as Task 1 Step 2, placed after the `Skeleton` export):

```ts
// FilterSheet — the ONE filter overlay.
export { FilterSheet, type FilterSheetProps } from './components/FilterSheet';
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`, expect clean (no consumers yet, so this only checks the component compiles standalone).

### Task 6: Fix `LogRangeSlider` `aria-label` warning + missing label

**Files:**

- Modify: `src/components/treasure/FilterContent.tsx:1001-1026` (price slider), `:1054-1076` (carat slider)
- Modify: `src/components/ios/MoreSheetSearch.tsx:458-475` (price slider, currently has no label at all)

**Interfaces:**

- `LogRangeSlider` (`src/components/shared/LogRangeSlider.tsx`) already forwards `...sliderProps` straight to MUI `<Slider>` (line 118) — no change needed there, this is purely a call-site fix.

- [ ] **Step 1:** In `FilterContent.tsx`, replace the price slider's `aria-label="Rango de precio"` (line 1011) with `getAriaLabel={(index) => (index === 0 ? 'Precio mínimo' : 'Precio máximo')}`. MUI's two-thumb `Slider` requires `getAriaLabel` (a per-thumb function), not a single string `aria-label` — that mismatch is the exact source of the console warning recon found.

- [ ] **Step 2:** In `FilterContent.tsx`, replace the carat slider's `aria-label={t.treasure.filter.caratRange}` (line 1062) with `getAriaLabel={(index) => (index === 0 ? 'Quilates mínimo' : 'Quilates máximo')}` — if `t.treasure.filter` has distinct min/max keys already, use those instead of hardcoded strings; check the locale file first (`src/locales/`) before hardcoding.

- [ ] **Step 3:** In `MoreSheetSearch.tsx:458-475`, the price `LogRangeSlider` has no accessible name at all (recon: "worse a11y gap"). Add the same `getAriaLabel` pattern from Step 1.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`. Then in browser dev console on `/treasure` (desktop filter panel) and the mobile filter sheet, confirm the "You need to use the `getAriaLabel` prop instead of `aria-label`" MUI warning is gone (`read_console_messages` with pattern `getAriaLabel|aria-label`).

### Task 7: Fix touch targets + fade edges + keyboard a11y on filter chip rows

**Files:**

- Modify: `src/components/treasure/FilterContent.tsx` (`pillBase` lines 212-225; category scroll row lines 386-397; shape/quality/cantidad scroll row lines 548-559)
- Modify: `src/components/treasure/browser/MobileSearchBar.tsx` (quick-access scroll row lines 618-646)

**Interfaces:**

- Model the fade-edge pattern on `src/components/treasure/RecentlyViewedCarousel.tsx` lines 61-69 (`canScrollLeft`/`canScrollRight` state) + 213-246 (gradient overlay JSX) — recon confirmed this is the one place in the codebase that already does it correctly.

- [ ] **Step 1:** In `FilterContent.tsx`, change `pillBase` (line 212-225) from implicit height to an explicit 44px touch target: add `minHeight: 44` and adjust `py`/vertical padding so the pill's visible chip stays compact while the hit target is 44px (use `padding: '0 14px'` with `display:'inline-flex', alignItems:'center'` rather than `py`, so the box height itself is 44px, not just the padding box). Keep existing `borderRadius:'20px'`, `fontSize:'0.75rem'` for the visible pill — only the tappable box grows.

- [ ] **Step 2:** In `FilterContent.tsx`, give the two `role="button"`-eligible pill rows (category row lines 398-420, and the shape/quality/color/carat pill rows around lines 438-467) the same interactive-a11y treatment `IOSFilterSheet.tsx`'s `FilterRow` (line 227-239) already uses: `role="button"`, `tabIndex={0}`, `aria-pressed={isSelected}`, and an `onKeyDown` handler that fires the click on `Enter`/`Space`. Recon flagged this as a real regression versus the mobile sheet's own rows — this closes it.

- [ ] **Step 3:** Port the fade-edge pattern from `RecentlyViewedCarousel.tsx` (scroll-position-driven `canScrollLeft`/`canScrollRight` state + two absolutely-positioned gradient `Box`es using `linear-gradient(to right, var(--tm-surface), transparent)` / mirrored) onto: the category scroll row (`FilterContent.tsx:386-397`), the shape/quality/cantidad scroll row (`FilterContent.tsx:548-559`), and the quick-access carousel (`MobileSearchBar.tsx:618-646`). Extract the pattern into a small local hook if it's identical across all three call sites (`useScrollFade(ref)` returning `{canScrollLeft, canScrollRight}`) rather than triplicating the scroll-listener logic — colocate it in `FilterContent.tsx` since two of the three call sites live there, and import it into `MobileSearchBar.tsx`.

- [ ] **Step 4: Verify — typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 5: Verify — browser**

`npm run dev`, open `/treasure` on a narrow viewport (resize to ~390px), tab through the category/shape/quality pill rows with keyboard only — confirm focus ring visible (needs Task 9's focus-ring fix if not yet applied to these elements — see Slice 5, but do a spot check now), `Enter`/`Space` toggles selection, and the scroll rows show a fade gradient on whichever edge has more content.

### Task 8: Swap `IOSFilterSheet` for `FilterSheet` in `TreasureBrowser`

**Files:**

- Modify: `src/components/treasure/TreasureBrowser.tsx:20` (import), `:252-289` (usage)
- Delete: `src/components/ios/IOSFilterSheet.tsx` (792 lines) — only after this step confirms zero remaining importers
- Modify: `src/components/ios/index.ts:44-45` (remove re-export)

**Interfaces:**

- Consumes: `FilterSheet` from `@/design-system` (Task 5), the existing filter-section content already rendered inside `IOSFilterSheet` (the accordion `FilterRow`s at lines 321-687 of the old file — this content moves as-is into `FilterSheet`'s `children`, it does not get rebuilt from scratch since it already works and Task 7 just fixed its a11y issues at the source in `FilterContent`/pill level, not inside `IOSFilterSheet` itself, meaning `IOSFilterSheet`'s accordion rows are actually a separate, redundant filter UI from `FilterContent`'s — confirm during this step whether `IOSFilterSheet`'s internal `FilterRow` sections duplicate `FilterContent`'s compact-mode pills or are genuinely distinct; if they're the same filters rendered twice by two different UIs (likely, since `FilterContent` compact mode is also used in mobile per §2 of recon), collapse to one: render `FilterContent` (compact) as `FilterSheet`'s children, and delete `IOSFilterSheet`'s bespoke `FilterRow`/accordion code entirely rather than porting it).

- [ ] **Step 1:** Read `TreasureBrowser.tsx:200-290` and confirm whether `MobileSearchBar` (rendered above `IOSFilterSheet` in the mobile branch) already renders `FilterContent` in compact mode, or whether `IOSFilterSheet` is the only mobile filter UI. Recon didn't fully resolve this — verify before deleting `IOSFilterSheet`'s content, since Fase 3 wants ONE filter UI, not a rebuild that preserves duplication.

- [ ] **Step 2:** Replace the `IOSFilterSheet` render (`TreasureBrowser.tsx:252-289`) with `FilterSheet`, passing `open`/`onClose` from the same state that drove `IOSFilterSheet`, `title="Filtros"`, `resultCount={gridItems.length}` (or the appropriate live-filtered count variable already in scope — check `c` from `useTreasureBrowserController()`), `activeFilterCount` (already computed for `ActiveFilterChips`, reuse it), `onClear` (reuse the existing clear-filters handler), `onApply={onClose}` (mobile "done" just closes since filters already apply live), and `<FilterContent compact ... />` (or whatever the resolved single filter UI from Step 1 is) as children.

- [ ] **Step 3:** Remove the `IOSFilterSheet` import (`TreasureBrowser.tsx:20`) and the `import { IOSFilterSheet } from '../ios'` style leftover if `savedFilters.presets`/`applySavedPreset` props no longer apply — check whether `FilterSheet`'s children (`FilterContent`) already exposes a presets UI; if not, either add a small presets row above `children` in the `FilterSheet` call, or (if presets are low-usage) flag as a follow-up rather than blocking this slice — don't silently drop working functionality.

- [ ] **Step 4:** Grep `grep -rn "IOSFilterSheet" src` — confirm the only remaining hits are `src/components/ios/IOSFilterSheet.tsx` itself and `src/components/ios/index.ts`'s re-export line. Delete the re-export line from `src/components/ios/index.ts:44-45`, then delete `src/components/ios/IOSFilterSheet.tsx`.

- [ ] **Step 5: Verify — typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Verify — browser**

`npm run dev`, resize to mobile width, open `/treasure`, tap the filter button — confirm `FilterSheet` opens as a real bottom-sheet overlay (backdrop visible, background scroll locked, `Escape` closes it, tapping backdrop closes it — none of which `IOSFilterSheet` did), filters apply, "Ver N resultados" count updates live as filters change, "Limpiar" clears and disables itself at 0 active filters. Test on iPhone SE width and a Pro Max width per the PRD's device pairing convention. Light + dark.

- [ ] **Step 7: Commit**

```bash
npm run build
git add src/design-system/components/FilterSheet src/design-system/index.ts src/components/treasure/FilterContent.tsx src/components/treasure/browser/MobileSearchBar.tsx src/components/treasure/TreasureBrowser.tsx src/components/ios/index.ts src/components/shared/LogRangeSlider.tsx src/components/ios/MoreSheetSearch.tsx index.html public/version.json
git rm src/components/ios/IOSFilterSheet.tsx
git commit -m "$(cat <<'EOF'
feat(ds3): Phase 3 slice 2 — FilterSheet + filter chip a11y

Builds canonical FilterSheet on the Sheet primitive (real overlay: backdrop,
focus trap, Escape/backdrop dismissal, live result count + active-filter
counter footer) and retires IOSFilterSheet, which was a misnamed inline
Collapse with none of that. Fixes filter chip touch targets to 44px, adds
scroll fade edges (modeled on RecentlyViewedCarousel), adds keyboard
interaction + aria-pressed to filter pills, and fixes the LogRangeSlider
getAriaLabel warning on both range sliders.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Slice 3 — Canonical `PieceCard` + catalog grid convergence + VirtualGrid follow-up

**Why:** `GridCard`/`ListRow`/`TreasureCard` are three bespoke, partially-overlapping implementations (none use DS3 `Card`, only `Badge`), none render the item number the PRD requires. This is the largest slice — treat grid-view and list-view migration as separable checkpoints.

### Task 9: Build canonical `PieceCard`

**Files:**

- Create: `src/design-system/components/PieceCard/PieceCard.tsx`
- Create: `src/design-system/components/PieceCard/index.ts`
- Modify: `src/design-system/index.ts`

**Interfaces:**

- Consumes: `Card` (`../Card`, `variant="well"` for the image well per Card's existing `well` variant), `Badge` (`../Badge`).
- Produces: `PieceCard` component, `PieceCardProps`:

```ts
export interface PieceCardProps {
  /** Image URL for the well. */
  imageUrl?: string;
  imageAlt: string; // required — meaningful alt text is P0 (WCAG)
  name: string;
  /** e.g. "4.20 ct · MUZO" — pre-built by the caller (mirrors GridCard's buildSpecLine). */
  specLine: string;
  price: React.ReactNode; // caller passes a formatted price node (currency/PriceDisplay stays a caller concern)
  itemNumber: string | number;
  quality?: {
    tone: 'neutral' | 'accent' | 'success' | 'warn' | 'danger';
    label: string;
  };
  onClick?: () => void;
  /** Optional overlay content (gallery count, compare button, etc.) rendered top-right of the well. */
  overlay?: React.ReactNode;
  selected?: boolean;
  loading?: boolean; // renders Skeleton in place of image + text
}
```

- [ ] **Step 1: Write the component**

```tsx
// src/design-system/components/PieceCard/PieceCard.tsx
/**
 * PieceCard — the ONE catalog piece card (DS v3, Fase 3 P0).
 *
 * A well (image, --tm-radius-well) topped by an emerald-cut corner accent,
 * serif name, mono spec/price line, and item number — composing Card(well)
 * + Badge for quality. Absorbs GridCard's two variants, ListRow, and
 * TreasureCard.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Skeleton } from '../Skeleton';

export interface PieceCardQuality {
  tone: 'neutral' | 'accent' | 'success' | 'warn' | 'danger';
  label: string;
}

export interface PieceCardProps {
  imageUrl?: string;
  imageAlt: string;
  name: string;
  specLine: string;
  price: React.ReactNode;
  itemNumber: string | number;
  quality?: PieceCardQuality;
  onClick?: () => void;
  overlay?: React.ReactNode;
  selected?: boolean;
  loading?: boolean;
  className?: string;
}

export const PieceCard: React.FC<PieceCardProps> = ({
  imageUrl,
  imageAlt,
  name,
  specLine,
  price,
  itemNumber,
  quality,
  onClick,
  overlay,
  selected = false,
  loading = false,
  className,
}) => {
  return (
    <Card
      variant="outlined"
      interactive={!!onClick}
      onClick={onClick}
      aria-label={onClick ? `${name} — ${specLine}` : undefined}
      className={className}
      style={
        selected
          ? { borderColor: 'var(--tm-accent)', borderWidth: 2 }
          : undefined
      }
    >
      <Box sx={{ position: 'relative' }}>
        <Card variant="well" style={{ border: 'none' }}>
          <Box
            sx={{
              position: 'relative',
              aspectRatio: '1 / 1',
              width: '100%',
              overflow: 'hidden',
              borderRadius: 'var(--tm-radius-well)',
            }}
          >
            {loading ? (
              <Skeleton variant="rect" width="100%" height="100%" />
            ) : imageUrl ? (
              <Box
                component="img"
                src={imageUrl}
                alt={imageAlt}
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Box
                role="img"
                aria-label={imageAlt}
                sx={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'var(--tm-well)',
                }}
              />
            )}
          </Box>
        </Card>

        {quality && !loading && (
          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
            <Badge tone={quality.tone} label={quality.label} compact />
          </Box>
        )}
        {overlay && !loading && (
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>{overlay}</Box>
        )}
      </Box>

      <Box
        sx={{
          padding: '12px 4px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {loading ? (
          <>
            <Skeleton variant="text" width="70%" height={18} />
            <Skeleton variant="text" width="45%" height={14} />
            <Skeleton variant="text" width="35%" height={16} />
          </>
        ) : (
          <>
            <Typography
              sx={{
                fontFamily: 'var(--tm-font-serif)',
                fontWeight: 500,
                fontSize: '0.9375rem',
                lineHeight: 1.3,
                color: 'var(--tm-text)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {name}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--tm-font-mono)',
                fontSize: '0.75rem',
                color: 'var(--tm-muted)',
              }}
            >
              {specLine}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography
                component="div"
                sx={{
                  fontFamily: 'var(--tm-font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'var(--tm-text)',
                }}
              >
                {price}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--tm-font-mono)',
                  fontSize: '0.6875rem',
                  color: 'var(--tm-subtle)',
                  flexShrink: 0,
                }}
              >
                Nº {itemNumber}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Card>
  );
};

export default PieceCard;
```

- [ ] **Step 2:** `index.ts` + barrel export (after `FilterSheet`):

```ts
// PieceCard — the ONE catalog piece card.
export {
  PieceCard,
  type PieceCardProps,
  type PieceCardQuality,
} from './components/PieceCard';
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`, expect clean.

### Task 10: Migrate `GridCard` (grid view) onto `PieceCard`

**Files:**

- Modify: `src/components/treasure/GridCard.tsx` (560 lines)

**Interfaces:**

- Consumes: `PieceCard` (Task 9), existing `buildSpecLine()` (lines 76-87, keep as-is — it already produces the exact `specLine` string `PieceCard` expects), existing `getQualityBadge` util (map its tier output to `PieceCardQuality`), existing `PriceDisplay` component (pass as `price` node, unchanged).
- Produces: same exported `GridCard` signature/props consumed by `useTreasureBrowserController.tsx:322-336` — do not change the public prop interface, only the internal render.

- [ ] **Step 1:** Replace both the `isLiteral` (lines 398-446) and `!isLiteral` (lines 449-532) render branches with a single `<PieceCard>` call. Read `useRedesignVariant()`'s actual consumers first — if collapsing the two variants into one is out of scope for this slice (the PRD doesn't ask to remove the A/B variant system, just to converge the card), keep the `isLiteral` branch check but have **both** branches render `PieceCard` — `isLiteral` passes no `overlay`/no `quality` badge (frameless look preserved via `PieceCard`'s own `variant="outlined"` Card, which is already borders-first so "frameless" vs "faithful" mostly collapses naturally; confirm visually in Step 4 whether the distinction is still meaningfully different — if not, that's a legitimate finding to flag, not silently delete the variant system).
- [ ] **Step 2:** Wire item number — `GridCard` currently renders none (recon confirmed). Find the item's number field in whatever data type `GridCard` receives (likely `treasure.itemNumber` or `treasure.numero` — check the prop type) and pass it as `PieceCard`'s `itemNumber`.
- [ ] **Step 3:** Wire `overlay` for the existing functional overlays (gallery count, quantity/lote, view-count, compare button — currently absolute-positioned ad hoc in the `!isLiteral` branch, lines ~449-532) as a composed `Box` passed into `PieceCard`'s `overlay` prop.
- [ ] **Step 4: Verify — browser.** `npm run dev`, `/treasure` grid view, confirm name/spec/price/item-number all render, quality badge shows, hover/focus states use the Card-level focus ring (no more `outline: 2px solid qe.accentPure` literal at lines 424-428/497-500 — those get deleted since `PieceCard`'s inner `Card` already has `&:focus-visible { boxShadow: 'var(--tm-focus-ring)' }` for free).

### Task 11: Migrate `ListRow` (list view) onto `PieceCard` or a row-oriented sibling

**Files:**

- Modify: `src/components/treasure/ListRow.tsx` (266 lines)

- [ ] **Step 1:** `PieceCard` as written is grid/well-shaped, not a horizontal row. Before forcing `ListRow` onto it, decide: either (a) add a `layout?: 'grid' | 'row'` prop to `PieceCard` that switches the outer `Box` from column to row flex (image well shrinks to a fixed square on the left, text block fills the rest), or (b) leave `ListRow` as its own thin composition of `Card` + `Badge` + the same name/spec/price/item-number block `PieceCard` uses, factored into a shared internal helper. Prefer (a) — one component, one prop — unless the row layout diverges enough (recon shows `ListRow` has compare/favorite icon buttons `PieceCard` doesn't) that forcing them together adds more conditional complexity than it removes; make the call after re-reading `ListRow.tsx` in full during implementation, not from recon summary alone.
- [ ] **Step 2:** Add item number to `ListRow`'s render (also missing per recon).
- [ ] **Step 3:** Replace the bespoke `Paper` shell + `outline: 3px solid ${emeraldCore.primary}` focus style (line 111-114) with `PieceCard`'s `Card`-based shell and its token focus ring.
- [ ] **Step 4: Verify — browser.** `/treasure` list view, confirm parity with Task 10's grid-view check plus the compare/favorite `IconButton`s still work and keep their existing `aria-label`s (recon confirmed `ListRow.tsx:189,222` already have them — don't regress).

### Task 12: `TreasureCard` (ambassador profile "exclusive collection") — migrate or retire

**Files:**

- Modify or delete: `src/components/treasure/TreasureCard.tsx` (489 lines), consumer at `src/pages/ambassadors/profile/components/ExclusiveCollectionSection.tsx:22`

- [ ] **Step 1:** Since `TreasureCard` has exactly one consumer and largely duplicates `GridCard`'s old bespoke shell, point `ExclusiveCollectionSection.tsx` at `PieceCard` directly (same migration pattern as Task 10) and delete `TreasureCard.tsx`, rather than migrating `TreasureCard`'s internals in place — check `ExclusiveCollectionSection.tsx`'s exact prop needs first (it may pass a narrower data shape than the main catalog).
- [ ] **Step 2: Verify — browser.** Visit an ambassador profile page with an exclusive collection populated, confirm the section still renders correctly.

### Task 13: VirtualGrid follow-up — remove `HEADER_OFFSET`/`minHeight`, single scroller

**Files:**

- Modify: `src/components/treasure/VirtualGrid.tsx:438,201,446`
- Modify: `src/components/treasure/TreasureBrowser.tsx:211-390` (desktop header stack — `CatalogHeader`, `TreasureDesktopFilterPanel`, `ActiveFilterChips`, `TreasureDesktopResultsSummary`, `RecentlyViewedCarousel`, sticky at line 360-368)

**Interfaces:** this was reverted out of Phase 1 (PR #58) and explicitly flagged "do before/with Phase 3 catalog work" — it's a prerequisite for `PieceCard`'s grid actually using the full desktop width cleanly (a squeezed grid undermines the "3-4 columns" requirement even with the card itself converged).

- [ ] **Step 1:** Remove the hardcoded `HEADER_OFFSET = 280` constant (line 438) and the `minHeight = 600` default (line 201); measure the actual available height instead — e.g. via a `ResizeObserver`/`useLayoutEffect` on the grid's parent container, or by having `VirtualGrid` fill `height: 100%` of a parent that itself is sized by flexbox (`flex: 1, minHeight: 0`) rather than a magic-number calc. The exact mechanism depends on `TreasureBrowser.tsx`'s outer layout — read the full component tree (including `AppShell`) before choosing; this is a real layout change, test on iPhone SE + Pro Max + desktop per the PRD risk table (§9: "VirtualGrid measured alters layout — requires device testing before merge").
- [ ] **Step 2:** Compact the desktop header stack — `CatalogHeader` + `TreasureDesktopFilterPanel` + `ActiveFilterChips` + `TreasureDesktopResultsSummary` + sticky `RecentlyViewedCarousel` (5 stacked blocks, each with its own margin) squeezing the grid, per Phase 1's flagged-but-reverted finding. Candidate approach: collapse `TreasureDesktopResultsSummary` into the same row as `TreasureDesktopFilterPanel`'s toolbar (they're both a single line of text/controls), and make `RecentlyViewedCarousel` non-sticky or collapsible once the user has scrolled — but the exact compaction shape needs a live look at the current desktop rendering before committing to a specific structural change; screenshot first via Claude-in-Chrome, then decide.
- [ ] **Step 3: Verify — browser.** `npm run dev`, desktop width ≥1280px: confirm the grid uses the full available width at 3-4 columns (PieceCard from Task 10 already renders — this task is about the container, not the card), no double scrollbar, no dead vertical space between the filter stack and the grid. Then iPhone SE (375×667) and iPhone Pro Max width: confirm no doubled scrollbar, last grid row not hidden behind the tab bar.
- [ ] **Step 4: Commit**

```bash
npm run build
git add src/design-system/components/PieceCard src/design-system/index.ts src/components/treasure/GridCard.tsx src/components/treasure/ListRow.tsx src/components/treasure/VirtualGrid.tsx src/components/treasure/TreasureBrowser.tsx src/pages/ambassadors/profile/components/ExclusiveCollectionSection.tsx index.html public/version.json
git rm src/components/treasure/TreasureCard.tsx 2>/dev/null || true
git commit -m "$(cat <<'EOF'
feat(ds3): Phase 3 slice 3 — PieceCard + catalog grid convergence

Builds canonical PieceCard (well + serif name + mono spec/price + item
number, composing Card + Badge) and migrates GridCard, ListRow, and
TreasureCard (ambassador exclusive collection) onto it — the first time
the catalog renders item numbers. Also lands the Phase 1 VirtualGrid
follow-up flagged as a Phase 3 prerequisite: removes the hardcoded
HEADER_OFFSET/minHeight in favor of measured height, and compacts the
desktop filter/summary stack that was squeezing the grid.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Slice 4 — Wire data states (loading/empty/error/content) across async views

**Why:** Slice 1 built the shells; this task wires them into the views recon found lacking a full four-state treatment — most notably the main catalog, which currently has **no loading state at all** (empty-state doubles as loading state, so a slow first paint looks identical to "no results").

### Task 14: Catalog loading state

**Files:**

- Modify: `src/hooks/useTreasureBrowserController.tsx` (exposes `isLoadingSheets` already — check exact return shape)
- Modify: `src/components/treasure/TreasureBrowser.tsx:418-444` (current empty/error branching)

- [ ] **Step 1:** Split the current `gridItems.length === 0` branch (line 427) into two: `isLoadingSheets && allTreasure.length === 0` → render a grid of `PieceCard loading` skeletons (reuse `VirtualGrid`'s column count so the skeleton grid geometry matches the real grid — CLS≈0 per the anti-blinking rules in CLAUDE.md) versus `!isLoadingSheets && gridItems.length === 0` → the existing `TreasureEmptyState` (now `EmptyState`-backed from Slice 1).
- [ ] **Step 2: Verify — browser.** Throttle network (Chrome devtools "Slow 3G" via Claude-in-Chrome if available, or add a temporary artificial delay) and confirm a skeleton grid shows during load, not a flash of the empty state.

### Task 15: `QuotationRequestList` — add the missing error UI

**Files:**

- Modify: `src/components/admin/QuotationRequestList.tsx:50-51,112-122`

- [ ] **Step 1:** This view currently only `console.error`s on fetch failure (recon: "no user-facing error UI"). Add an `error` state (if not already tracked) and render `ErrorState` with `onRetry` wired to the existing fetch function, replacing the bare `console.error`.
- [ ] **Step 2: Verify — browser.** Force a fetch failure (e.g. temporarily point at a bad endpoint or use devtools to block the request) and confirm `ErrorState` renders with a working retry.

### Task 16: `AdminAnalyticsPage` sub-tabs — audit and wire loading states

**Files:**

- Investigate first: `src/pages/admin/analytics/OverviewTab.tsx`, `HealthTab.tsx`, and any other tabs under `src/pages/admin/analytics/` — recon flagged these as "not individually audited, likely each own their fetch independently."

- [ ] **Step 1:** Read each analytics sub-tab component, determine its current loading/empty/error handling (if any), and apply the same `Skeleton`/`EmptyState`/`ErrorState` treatment as Tasks 14-15 wherever a tab fetches data with no state UI today. Since this is genuinely unknown scope until investigated, this is the one place in this plan where the concrete file list is discovered during execution rather than upfront — that's expected, not a plan gap; log what's found and fixed in the commit message.
- [ ] **Step 2: Verify — browser.** Visit `/admin/analytics` Overview/Health (and any other tabs found), confirm each shows a skeleton during load and a real error state on failure, light + dark.

### Task 17: Spot-check remaining Slice 1 candidates already have loading states

**Files:** `src/components/ambassador/AmbassadorDirectory.tsx`, `src/pages/ambassadors/profile/components/CotizacionesSection.tsx`

- [ ] **Step 1:** These already have loading/empty handling (recon: `AmbassadorDirectorySkeleton`, `CotizacionesSection`'s inline `Skeleton` block) — swap their loading placeholders to use the canonical `Skeleton` (Slice 1, Task 3) instead of raw MUI `Skeleton`/bespoke skeleton components, for token consistency (color/radius/reduced-motion), without changing their loading/empty/error logic.
- [ ] **Step 2: Verify — browser.** Ambassador directory and a profile's cotizaciones section still render correctly loading → content.

- [ ] **Step 3: Commit** (all of Slice 4 together)

```bash
npm run build
git add src/hooks/useTreasureBrowserController.tsx src/components/treasure/TreasureBrowser.tsx src/components/admin/QuotationRequestList.tsx src/components/ambassador/AmbassadorDirectory.tsx src/pages/ambassadors/profile/components/CotizacionesSection.tsx index.html public/version.json
# plus whatever analytics tab files Task 16 touched
git commit -m "$(cat <<'EOF'
feat(ds3): Phase 3 slice 4 — data states across async views

Wires the Slice 1 EmptyState/ErrorState/Skeleton into the views that were
missing a full four-state treatment: the main catalog had no loading state
at all (empty-state doubled as loading state), QuotationRequestList
swallowed fetch errors into console.error with no user-facing UI, and the
admin analytics sub-tabs are audited and brought to the same standard.
AmbassadorDirectory/CotizacionesSection's existing skeletons are repointed
to the canonical Skeleton for token consistency.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Slice 5 — WCAG AA sweep

**Why:** Closes the P0 "piso WCAG AA" checklist item: contrast, focus ring, ≥44px targets, `aria-label` on icon-buttons, field labels, meaningful `alt` on piece photos. Most of this is already satisfied by Slices 1-4 (`PieceCard` requires `imageAlt`, `FilterSheet`/`PieceCard`/pills already carry focus rings and aria-labels by construction) — this slice is the verification + remaining-gap pass, not a new build.

### Task 18: Focus-ring token adoption on remaining bespoke components

**Files:**

- Modify: `src/components/treasure/browser/MobileSearchBar.tsx:604-607` (`outline: 2px solid emeraldCore.primary` → `&:focus-visible { boxShadow: 'var(--tm-focus-ring)' }`)
- Verify (should already be resolved by Slice 3, confirm not regressed): `ListRow.tsx:111-114`, `GridCard.tsx:424-428,497-500`

- [ ] **Step 1:** Grep `grep -rn "outline:.*emeraldCore\|outline:.*qe\.accent" src/components` for any remaining hardcoded focus outlines outside what Slice 3 already fixed, and replace each with the `--tm-focus-ring` token pattern.
- [ ] **Step 2: Verify — browser.** Tab through the full catalog + filter flow keyboard-only (no mouse), confirm every interactive element shows the token focus ring, none show a bespoke outline.

### Task 19: Contrast + label audit

**Files:** whatever Task 18's grep + a manual pass over `FilterSheet`, `PieceCard`, `FilterContent` surfaces.

- [ ] **Step 1:** Confirm `--tm-warn`/`--tm-danger` text-on-surface pairings used by `Badge` tones in `PieceCard`'s quality badge meet 4.5:1 in both light and dark (`css-variables-v3.css` already defines `--tm-warning: #8a5f1b` / `#d9a94e` dark, `--tm-danger: #b3403a` / `#e5736c` dark — these were presumably already AA-checked in Phase 2 for `Badge`; spot-check with a contrast tool rather than re-deriving from scratch, since `Badge` itself doesn't change in this phase).
- [ ] **Step 2:** Confirm every form control touched in this phase (`FilterSheet`'s filter controls, any slider) has a real accessible label — the `LogRangeSlider` fix (Task 6) and `FilterContent` pill `aria-label`s (Task 7) already cover the main gaps found in recon; this step is confirming no new unlabeled control was introduced by Slices 2-4, not redoing that work.
- [ ] **Step 3: Verify — browser.** Run the browser's built-in accessibility tree inspector (or axe if available via Claude-in-Chrome) on `/treasure` with the filter sheet open, confirm no critical/serious violations tied to this phase's components.

- [ ] **Step 4: Commit**

```bash
npm run build
git add src/components/treasure/browser/MobileSearchBar.tsx index.html public/version.json
# plus any files Task 18/19 touched
git commit -m "$(cat <<'EOF'
feat(ds3): Phase 3 slice 5 — WCAG AA sweep

Closes the remaining focus-ring token gaps on bespoke catalog components
and verifies contrast/labels across the Phase 3 surface (FilterSheet,
PieceCard, filter chips) meet the AA floor.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** PRD §5 Fase 3's four P0 bullets map 1:1 to Slices 2 (filter chips + FilterSheet), 3 (PieceCard + grid width), 4 (data states), 5 (WCAG floor). The two carried-forward gaps (EmptyState/ErrorState/Skeleton from Phase 2, VirtualGrid/header-compaction from Phase 1) are Slice 1 and Slice 3/Task 13 respectively — both explicitly called out in the brief as things not to silently skip.
- **Known unknowns flagged, not hidden:** Task 8 Step 1 (whether `IOSFilterSheet`'s accordion duplicates `FilterContent`), Task 11 Step 1 (grid-vs-row `PieceCard` layout decision), Task 13 Steps 1-2 (exact VirtualGrid measurement mechanism and header compaction shape), and Task 16 (analytics sub-tab audit scope) are genuinely undetermined from recon alone — each has an explicit decision point and fallback instruction rather than a placeholder.
- **Deferred, correctly out of scope for this plan:** `BottomSheetShell`'s Bóveda gradient preset (not Phase 3; flagged in the brief only as "don't regress if you touch adjacent sheets" — this plan's `FilterSheet` work doesn't touch `BottomSheetShell`'s 3 consumers), `products:getPublicByItem` Convex deploy (unrelated, still open), Phase 1 PR #58 merge/rebase (external, not part of this plan's execution).
