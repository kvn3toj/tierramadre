# Scroll & UI/UX Foundations Audit — Tierra Madre

**Date:** 2026-07-08 · **Branch:** `feat/anima-bot-create-bridge`
**Scope:** Scroll behaviour on the client catalog and the menu/option sheets, plus the design-system foundations that drive them.

---

## TL;DR

The app uses a **fixed-viewport shell**: only `<main id="main-content">` scrolls, everything else is pinned. That is a sound pattern, but three things around it were inconsistent and produced the scroll bugs you saw:

1. **Bottom sheets ("More" / Settings) used `85vh`** — on iOS Safari `vh` includes the address bar, so the sheet was taller than the visible screen and its bottom rows (Settings, Feedback, the price-multiplier slider) sat below the fold where scrolling couldn't reach them. **Fixed → `85dvh`.**
2. **The catalog grid scrolls _inside_ the page that also scrolls** (a nested scroller), with no scroll-containment, so at the top/bottom of the grid the gesture "leaked" into the shell — the "two scrollbars fighting" feel. **Fixed → `overscroll-behavior: contain` on the real scroller.**
3. **Global `* { scroll-behavior: smooth }`** forced animated scrolling on _every_ nested scroller and fought programmatic jumps (scroll restoration literally had a comment about bypassing it). **Fixed → scoped to the document root, with reduced-motion respected.**

All four edited files pass `tsc --noEmit` cleanly.

---

## What was changed (applied)

| File                                      | Change                                                                                                      | Why                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/components/ios/IOSMoreSheet.tsx`     | `maxHeight: 85vh` → `85dvh` (+ `@supports` fallback), added `overscroll-behavior: contain` + touch momentum | Bottom menu options were unreachable on iOS; sheet drags leaked to the page     |
| `src/components/ios/IOSSettingsSheet.tsx` | Same `85dvh` swap + touch momentum (it already had `overscroll: contain`)                                   | Same cutoff on the settings sheet                                               |
| `src/components/treasure/VirtualGrid.tsx` | Added `overscroll-behavior: contain` + touch momentum to react-window's scroll element (`& > div`)          | Stops the catalog grid's scroll from chaining into the shell                    |
| `src/theme.ts`                            | Moved `scroll-behavior: smooth` off the `*` selector onto `html`, added `prefers-reduced-motion` guard      | Global smooth-scroll on every element caused jank and fought scroll restoration |

These are all low-risk CSS-in-JS changes. No component logic or types changed.

---

## Root-cause detail

### The catalog (client) nested-scroll architecture

`IOSLayout` makes `<main>` the single scroller (`flex:1; min-height:0; overflow-y:auto; height:100dvh`). Good. But on the catalog, `VirtualGrid` mounts a **second** scroller with a hard-coded height:

```
height: calc(var(--vh) * 100 - 280px)   // HEADER_OFFSET = 280
minHeight: 600
```

Two problems remain here that I did **not** blind-fix because they change layout and need your eyes on a device:

- **`HEADER_OFFSET = 280` is a guess.** The real chrome above the grid (nav bar + origin tabs + search bar + optional recently-viewed carousel + safe areas) is not a constant 280px, so the grid's bottom rarely lands exactly above the tab bar — leaving either a dead gap or a row tucked behind the tab bar that forces the _outer_ main to scroll too. That outer/inner mismatch is the second half of the double-scroll feel.
- **`minHeight: 600` over-clamps small phones.** On an iPhone SE (~667px tall) the computed height is ~370px but it's forced back up to 600px, guaranteeing overflow and a second scrollbar.

**Recommended fix (needs device testing):** replace the magic offset + clamp with a _measured_ height. `VirtualGrid` already measures its container width via `ResizeObserver`; extend that to read the container's `getBoundingClientRect().top` and set `height = visualViewport.height − top − tabBarReserve`, floored at ~280px rather than 600. That deletes the 280 constant, fixes the small-screen clamp, and makes the grid end exactly above the tab bar so the shell no longer needs to scroll on the catalog — collapsing it back to a single effective scroller. I scoped this out but held off applying it blind because the interacting reservations (`main` has its own `padding-bottom: 95px`, and the grid adds a spacer row) need to be reconciled visually to avoid a double gap.

### The menu sheets

`position: fixed; bottom: 0; max-height: 85vh; overflow-y: auto` with a sticky header. The mechanics were right; the unit was wrong. `dvh` tracks the _visible_ viewport, so the sheet now always fits and its internal scroll reaches the last row. The shell already used `100dvh`, so this also makes the sheets consistent with the shell.

---

## Design-system foundations review

**Strengths:** single canonical shell scroller; `100dvh` with a `@supports` fallback in `IOSLayout`; a real `useViewportHeight` hook; 44px touch targets enforced on `MuiButton` and on the filter chips (`height: 44`); scroll-restoration and back-to-top wired to the correct scroll element per view.

**Foundations issues found:**

1. **Viewport-unit inconsistency (the core theme).** Three different height systems coexisted: `100dvh` (shell), `85vh` (sheets), and a JS `--vh` custom-property hack with a magic offset (catalog). Standardize on native `dvh`/`svh`/`lvh` (with a `vh` `@supports` fallback) and retire the `--vh` resize-listener hack where `dvh` is supported. Two of the three are now aligned; the catalog is the remaining one.
2. **`* { scroll-behavior: smooth }`** — an anti-pattern (perf cost on every scroll container, fights programmatic scroll). Now scoped to `html`. Consider auditing any code that assumed instant scrolling on nested elements.
3. **Magic numbers for layout reservations** (`HEADER_OFFSET = 280`, `minHeight: 600`, `95px` tab-bar reserve repeated in several files). These should live as named tokens in the design system (e.g. `layout.tabBarHeight`, `layout.navBarHeight`) and be measured or referenced, not duplicated as literals that drift apart.
4. **Reduced motion** is respected in the shell and sheets but was undercut by the global smooth-scroll; now consistent.

---

## Suggested next steps

1. Rebuild and test the two sheets on a real iOS device (or Safari responsive mode, iPhone SE + a Pro Max) — confirm the price-multiplier slider and Feedback row are reachable.
2. Decide on the catalog measured-height refactor above; I can implement it as a follow-up once you can eyeball it, since it's the one change that alters layout.
3. Promote the tab-bar / nav-bar reservations to design-system layout tokens so the catalog and shell stop guessing at each other's heights.

_Per your CLAUDE.md workflow, run `npm run build` before committing so the version files update._

---

**Update:** the foundations issues above (viewport-unit inconsistency, magic
layout-reservation numbers, scroll containment) were codified into shell
tokens/mixins and applied across Fotosíntesis and Atelier. See "Navigation
UX Rules" in [`src/design-system/README.md`](src/design-system/README.md)
for the resulting rules and the tokens/mixins that enforce them. The
catalog `VirtualGrid` `HEADER_OFFSET = 280` issue above is the same bug
class but remains open — out of scope for that pass.
