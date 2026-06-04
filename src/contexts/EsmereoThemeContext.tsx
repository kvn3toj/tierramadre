import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STORAGE_KEYS } from "../constants/storage-keys";

/**
 * EsmereoThemeContext — the Bóveda feature's OWN light/dark theme, independent
 * of the global app theme (ThemeContext). Dark is the default "vault"; light is
 * the cool brushed-platinum showroom. Persisted under its own key so toggling it
 * never changes the rest of the app, and vice-versa.
 *
 * The value here is just state; the `.bov-root` wrapper consumes `mode` and sets
 * `data-theme={mode}`, which drives all the CSS variables in boveda.css.
 */

export type EsmereoThemeMode = "light" | "dark";

interface EsmereoThemeContextValue {
  mode: EsmereoThemeMode;
  toggle: () => void;
  setMode: (mode: EsmereoThemeMode) => void;
}

const EsmereoThemeContext = createContext<EsmereoThemeContextValue | null>(
  null,
);

function readStoredMode(): EsmereoThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ESMEREO_THEME);
    return stored === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function EsmereoThemeProvider({ children }: { children: ReactNode }) {
  // Synchronous init from localStorage (no flash; matches the anti-blink rule).
  const [mode, setModeState] = useState<EsmereoThemeMode>(() =>
    readStoredMode(),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ESMEREO_THEME, mode);
    } catch {
      /* private mode / quota — non-fatal, theme just won't persist */
    }
  }, [mode]);

  const setMode = useCallback(
    (next: EsmereoThemeMode) => setModeState(next),
    [],
  );
  const toggle = useCallback(
    () => setModeState((m) => (m === "dark" ? "light" : "dark")),
    [],
  );

  const value = useMemo<EsmereoThemeContextValue>(
    () => ({ mode, toggle, setMode }),
    [mode, toggle, setMode],
  );

  return (
    <EsmereoThemeContext.Provider value={value}>
      {children}
    </EsmereoThemeContext.Provider>
  );
}

export function useEsmereoTheme(): EsmereoThemeContextValue {
  const ctx = useContext(EsmereoThemeContext);
  if (!ctx) {
    throw new Error(
      "useEsmereoTheme must be used within an EsmereoThemeProvider",
    );
  }
  return ctx;
}
