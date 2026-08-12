import { useEffect, useState } from 'react';

/**
 * Keeps a slide-up sheet OUT OF LAYOUT while it is closed.
 *
 * Why this exists
 * ---------------
 * `IOSMoreSheet` and `IOSSettingsSheet` are `position: fixed; bottom: 0` and
 * hide themselves with `transform: translateY(100%)` + `visibility: hidden`.
 * Neither removes a box from layout, and because they also bleed 96px past the
 * bottom edge (`marginBottom: -96px`, for the spring overshoot), a *closed*
 * sheet sits a full sheet-height below the fold — measured at document
 * y 816–1524 on a 393x720 phone.
 *
 * That makes the DOCUMENT scrollable by 804px. The app shell is built on the
 * opposite invariant: `IOSLayout`'s root is `height: 100dvh; overflow: hidden`
 * and only `<main>` and the virtual grid scroll (see the header comment on
 * `ScrollRestoration`). `overflow: hidden` on <body> asserts that but does not
 * enforce it — it leaves a scroll container that touch and scroll-into-view can
 * still move.
 *
 * Once the document scrolls, every `position: fixed` element — the whole app
 * shell, the nav bar, and any open MUI Drawer/Dialog — paints that far above
 * the viewport. That is the reported catalog bug: tapping "Filtros" left the
 * document scrolled to y=666, the shell painting at -666, and nothing on
 * screen but the filter sheet's footer.
 *
 * Fixing it in CSS (`overflow` on the root) only relocates the scroll container
 * and needs `overflow: clip`, which pre-Chrome-90 devices lack — exactly the
 * old Android devices the report came from. Dropping the closed sheet out of
 * layout removes the overflow itself, on every browser.
 *
 * Usage
 * -----
 * `mounted` and `entered` are deliberately separate. Flipping `display` and
 * `transform` in the same frame gives the browser no starting style, so the
 * slide-in is skipped entirely; `entered` lags `mounted` by one committed
 * render so the enter transition has something to animate from.
 *
 * ```tsx
 * const { mounted, entered } = useSheetPresence(open);
 * <Box sx={{
 *   display: mounted ? undefined : 'none',
 *   transform: entered ? 'translateY(0)' : 'translateY(100%)',
 * }} />
 * ```
 */
export function useSheetPresence(open: boolean, exitMs = 450) {
  // Rendered at all. Stays true through the exit transition.
  const [mounted, setMounted] = useState(open);
  // Slid into place. Always false on the frame the sheet first mounts.
  const [entered, setEntered] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    setEntered(false);
    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, exitMs]);

  // Split from the effect above on purpose: this one runs only after the
  // `mounted: true` render has committed, so the closed transform has been
  // through a real layout pass before we flip it.
  useEffect(() => {
    if (!open || !mounted || entered) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open, mounted, entered]);

  return { mounted, entered };
}

export default useSheetPresence;
