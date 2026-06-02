import { useEffect, useRef } from "react";

/**
 * useOverlayBackButton
 *
 * Makes a hardware / browser Back press close an in-flow overlay instead of
 * leaving the route entirely. On open it pushes a throwaway history entry that
 * keeps the SAME URL (so React Router's location never changes); the matching
 * `popstate` then closes the overlay rather than navigating away. Closing the
 * overlay from the UI retracts that entry so the back stack stays clean.
 *
 * The app uses <BrowserRouter>, so React Router's `useBlocker` is unavailable;
 * this is the framework-agnostic equivalent built on the History API.
 *
 * Concurrency: a single module-level stack tracks every open overlay, so a
 * Back press always closes the most-recently-opened one (LIFO) and retracting
 * one overlay's entry never disturbs another's. Resilient to React 18
 * StrictMode's double-invoked effects (dev only) via the retraction counter.
 *
 * @param isOpen  whether the overlay is currently open
 * @param onClose closes the overlay — the SAME handler the UI dismiss uses.
 *                Keep it stable (e.g. `useCallback`) so the effect keys only on
 *                `isOpen` and never pushes a duplicate entry.
 *
 * @example
 * const [open, setOpen] = useState(false);
 * useOverlayBackButton(open, useCallback(() => setOpen(false), []));
 */

// --- module-level overlay back-stack -------------------------------------
// One passive popstate listener for the app lifetime; the stack decides which
// overlay a Back press closes. `pendingRetractions` swallows the popstate that
// our OWN history.back() produces when an overlay is dismissed from the UI.
const overlayStack: symbol[] = [];
const closers = new Map<symbol, () => void>();
let listenerAttached = false;
let pendingRetractions = 0;

function handlePopState(): void {
  if (pendingRetractions > 0) {
    // This pop is the echo of a UI-initiated retraction — consume it.
    pendingRetractions -= 1;
    return;
  }
  const top = overlayStack.pop();
  if (!top) return;
  const close = closers.get(top);
  closers.delete(top);
  // The browser already popped our synthetic entry — do NOT call back() here.
  close?.();
}

function ensureListener(): void {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  window.addEventListener("popstate", handlePopState);
}

export function useOverlayBackButton(
  isOpen: boolean,
  onClose: () => void,
): void {
  // Latest onClose without re-running the effect on its identity change.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const id = Symbol("overlay");
    ensureListener();
    closers.set(id, () => onCloseRef.current());
    overlayStack.push(id);
    // Same-URL push: a new history entry without a location change.
    window.history.pushState({ __overlayBack: true }, "");

    return () => {
      const idx = overlayStack.indexOf(id);
      if (idx === -1) {
        // Already closed by a Back press (popstate consumed our entry).
        closers.delete(id);
        return;
      }
      // Closed from the UI (or unmounted) while our entry is still live:
      // retract it once and ignore the resulting popstate echo.
      overlayStack.splice(idx, 1);
      closers.delete(id);
      pendingRetractions += 1;
      window.history.back();
    };
  }, [isOpen]);
}
