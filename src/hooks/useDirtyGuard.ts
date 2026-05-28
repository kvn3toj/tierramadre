import { useCallback, useEffect, useState } from "react";

/**
 * Guards a multi-field drawer/dialog against silently discarding in-progress
 * edits. The three Fotosíntesis/atelier editors close on backdrop click, Esc,
 * the header X, and the footer Cancelar — all of which threw away unsaved work
 * (the atelier drawer even showed an "N cambios sin guardar" counter then
 * discarded it). This hook routes every close path through a confirm prompt
 * when `dirty`, and adds a `beforeunload` guard for tab-close/refresh.
 * (ISO-audit C4.)
 *
 * Usage: wire `guardedClose` to the MUI Dialog/Drawer `onClose` (it accepts the
 * `(event, reason)` MUI passes, so Esc + backdrop are covered), `requestClose`
 * to the header X and footer Cancelar buttons, and render a ConfirmDialog with
 * `confirmOpen` / `confirmDiscard` / `cancelDiscard`. Pass `enabled: !saving` so
 * an in-flight save never gets a discard prompt.
 */
export function useDirtyGuard({
  dirty,
  onClose,
  enabled = true,
}: {
  dirty: boolean;
  onClose: () => void;
  enabled?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const guardedClose = useCallback(
    (_event?: unknown, _reason?: "backdropClick" | "escapeKeyDown") => {
      if (enabled && dirty) {
        setConfirmOpen(true);
        return;
      }
      onClose();
    },
    [enabled, dirty, onClose],
  );

  const requestClose = useCallback(() => guardedClose(), [guardedClose]);

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    onClose();
  }, [onClose]);

  const cancelDiscard = useCallback(() => setConfirmOpen(false), []);

  useEffect(() => {
    if (!enabled || !dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled, dirty]);

  return {
    guardedClose,
    requestClose,
    confirmOpen,
    confirmDiscard,
    cancelDiscard,
  };
}
