import { useEffect } from "react";

/**
 * Per-handoff §6: register the four global Fotosíntesis shortcuts as plain
 * keydown handlers — no new dependency. Each handler runs only when the user
 * isn't typing into an input, textarea, or contenteditable surface.
 *
 * Keys are matched as letter codes ("k", "n", "v", "d") with metaKey on macOS
 * or ctrlKey elsewhere; preventDefault is called so the browser's native chord
 * (⌘N → new window) doesn't fire.
 */
export interface FotosintesisHotkeyHandlers {
  onSpotlight?: () => void;
  onNewLot?: () => void;
  onNewSale?: () => void;
  onOpenDirectory?: () => void;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
};

export function useFotosintesisHotkeys(
  handlers: FotosintesisHotkeyHandlers,
): void {
  useEffect(() => {
    const { onSpotlight, onNewLot, onNewSale, onOpenDirectory } = handlers;

    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();

      if (key === "k") {
        if (onSpotlight) {
          e.preventDefault();
          onSpotlight();
        }
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (key === "n" && onNewLot) {
        e.preventDefault();
        onNewLot();
      } else if (key === "v" && onNewSale) {
        e.preventDefault();
        onNewSale();
      } else if (key === "d" && onOpenDirectory) {
        e.preventDefault();
        onOpenDirectory();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlers]);
}
