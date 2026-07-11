/**
 * scrollMemory — persist scroll positions (and related view state) across
 * in-app SPA navigations so returning to a list lands the user exactly where
 * they left off.
 *
 * Backed by sessionStorage: positions survive a page reload within the same
 * tab but reset when the tab closes — the right lifetime for "where was I
 * scrolled" state. All access is wrapped in try/catch because sessionStorage
 * throws in private-mode / quota / sandboxed contexts.
 */

const PREFIX = 'tm:sm:';

function setItem(key: string, value: number): void {
  try {
    if (!Number.isFinite(value) || value <= 0) {
      sessionStorage.removeItem(PREFIX + key);
    } else {
      sessionStorage.setItem(PREFIX + key, String(Math.round(value)));
    }
  } catch {
    /* sessionStorage unavailable — silently skip */
  }
}

function getItem(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Persist a scroll offset (px) for the given key. Zero/negative clears it. */
export function saveScrollPos(key: string, top: number): void {
  setItem('pos:' + key, top);
}

/** Read a previously saved scroll offset, or null if none. */
export function readScrollPos(key: string): number | null {
  return getItem('pos:' + key);
}

/** Persist how many "pages" of items were loaded (for Load-More lists). */
export function saveLoadedPages(key: string, pages: number): void {
  setItem('pages:' + key, pages);
}

/** Read a previously saved loaded-page count, or null if none. */
export function readLoadedPages(key: string): number | null {
  return getItem('pages:' + key);
}

/**
 * Restore a scroll offset on an element that may still be growing (lazy data,
 * virtualization measuring widths, images reserving height). Retries on
 * animation frames until the element is tall enough to honor `target`.
 *
 * Two exit conditions besides "reached target":
 * - `maxWaitMs` elapses (catches slow network fetches — a fixed frame count
 *   like "30 frames" silently gives up after ~0.5s, well under how long a
 *   cold Sheets/Drive fetch can take, which is what left users scrolled to
 *   the top after a back-navigation on a slow connection).
 * - The height stops changing for several consecutive checks (`stableFrames`)
 *   — the list has genuinely finished loading shorter than the saved offset
 *   (e.g. filters now match fewer items), so waiting out the full timeout
 *   would only delay landing at the best available position.
 *
 * Returns a cleanup function to cancel pending frames.
 */
export function restoreScrollWhenReady(
  getElement: () => HTMLElement | null,
  target: number,
  maxWaitMs = 4000,
  stableFrames = 10,
): () => void {
  if (!Number.isFinite(target) || target <= 0) return () => {};

  const now = () =>
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  const startedAt = now();
  let frame = 0;
  let cancelled = false;
  let lastMaxScroll = -1;
  let unchangedStreak = 0;

  const attempt = () => {
    if (cancelled) return;
    const el = getElement();
    if (el) {
      const maxScroll = el.scrollHeight - el.clientHeight;
      const reachedTarget = maxScroll >= target - 1;
      unchangedStreak = maxScroll === lastMaxScroll ? unchangedStreak + 1 : 0;
      lastMaxScroll = maxScroll;

      const timedOut = now() - startedAt >= maxWaitMs;
      const settled = unchangedStreak >= stableFrames;

      if (reachedTarget || timedOut || settled) {
        el.scrollTop = Math.min(target, Math.max(0, maxScroll));
        return;
      }
    }
    frame = requestAnimationFrame(attempt);
  };

  frame = requestAnimationFrame(attempt);
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}
