import { useEffect } from "react";

/**
 * ⌘J / Ctrl+J toggles the Copilot rail. Chosen over ⌘K to avoid clashing with
 * the existing Spotlight hotkey (`useFotosintesisHotkeys`). `preventDefault`
 * suppresses the browser's native Ctrl+J (downloads on Firefox/Chrome).
 *
 * Allowed even while typing — a meta chord won't be produced by normal text
 * entry, and toggling the companion mid-thought is intentional.
 */
export function useCopilotRailHotkeys(toggle: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== "j") return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);
}
