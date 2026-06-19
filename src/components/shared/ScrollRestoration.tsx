/**
 * ScrollRestoration
 *
 * The app shell uses a fixed viewport where only <main id="main-content">
 * scrolls (not the document), so React Router's built-in <ScrollRestoration>
 * (which manages window scroll, and only in data-router mode) does not apply.
 * This component restores the <main> scroll position the way a browser would:
 *
 *  - Back / forward (POP): return to the exact offset the user left.
 *  - New navigation (PUSH / REPLACE): start at the top.
 *
 * Positions are saved continuously (throttled) keyed by the history entry, so
 * the latest offset is always available when the user navigates back. The
 * virtualized grid manages its own internal scroller separately (see
 * VirtualGrid); this covers list view and every other long page.
 */

import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  getMainScrollContainer,
  addMainScrollListener,
} from '../../utils/mainScroll';
import {
  saveScrollPos,
  readScrollPos,
  restoreScrollWhenReady,
} from '../../utils/scrollMemory';

export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Key the saved offset by the unique history entry id so two visits to the
  // same URL (e.g. opened twice) don't share a position.
  const routeKey = `route:${location.key}`;
  const activeKeyRef = useRef(routeKey);

  // Continuously persist the current page's scroll offset (rAF-throttled) so
  // the freshest value is stored before any navigation away.
  useLayoutEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const el = getMainScrollContainer();
        if (el) saveScrollPos(activeKeyRef.current, el.scrollTop);
        ticking = false;
      });
    };
    const removeScroll = addMainScrollListener(onScroll, { passive: true });

    // Save once more on pagehide so a reload mid-session restores correctly.
    const onPageHide = () => {
      const el = getMainScrollContainer();
      if (el) saveScrollPos(activeKeyRef.current, el.scrollTop);
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      removeScroll();
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  // On every route change, restore (POP) or reset to top (PUSH/REPLACE).
  useLayoutEffect(() => {
    activeKeyRef.current = routeKey;

    if (navigationType === 'POP') {
      const target = readScrollPos(routeKey);
      if (target && target > 0) {
        return restoreScrollWhenReady(getMainScrollContainer, target);
      }
    }

    // New navigation with no saved offset → land at the top instantly
    // (bypasses the shell's CSS smooth-scroll so there's no visible jump).
    const el = getMainScrollContainer();
    if (el) el.scrollTop = 0;
  }, [routeKey, navigationType]);

  return null;
}
