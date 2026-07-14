/**
 * Scroll container mixins — the canonical recipes for nested scrollers.
 *
 * The app is a fixed-viewport shell: the ONLY page scroller is
 * <main id="main-content"> (IOSLayout). Any nested scroller (side panes,
 * drawer bodies, horizontal tables) MUST use these mixins so boundary
 * gestures never chain into <main> ("scrolling a grid moves the page").
 *
 * Rules (see "Navigation UX Rules" in src/design-system/README.md):
 * - Never use bare `overflow: auto` in page code — spread these mixins.
 * - Never guess pane heights with `calc(100vh - N)` — use paneHeight().
 * - Do NOT add `touch-action` to scroll containers; the global
 *   `touch-action: manipulation` on controls is the only touch-action we set.
 */

import { appShell } from '../tokens/layout';

/** Nested vertical scroller: contained (no scroll chaining) + iOS momentum. */
export const containedScrollY = {
  overflowY: 'auto',
  minHeight: 0,
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
} as const;

/**
 * Nested horizontal scroller (tables, label previews). overscrollBehaviorX
 * also stops the browser back-swipe gesture from hijacking the pan.
 */
export const containedScrollX = {
  overflowX: 'auto',
  overscrollBehaviorX: 'contain',
  WebkitOverflowScrolling: 'touch',
} as const;

/**
 * Height of a pane inside <main>, minus local sticky chrome (e.g. a module
 * topbar). Reads the shell-published measured var — never a viewport guess.
 */
export const paneHeight = (offsetPx = 0): string =>
  offsetPx === 0
    ? `var(${appShell.mainHeightVar}, 100dvh)`
    : `calc(var(${appShell.mainHeightVar}, 100dvh) - ${offsetPx}px)`;

/**
 * Bottom clearance so content inside a full-height pane clears a floating
 * bottom bar (appShell.tabBarReserve or appShell.fotoTabBarReserve).
 */
export const bottomBarClearance = (reservePx: number): string =>
  `calc(${reservePx}px + env(safe-area-inset-bottom, 0px))`;
