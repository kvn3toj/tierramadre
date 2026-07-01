/**
 * Theme Context - Dark/Light Mode Support
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from "@mui/material/styles";
import { brandColors, iosSpacing, iosBorderRadius } from "../theme";
import { STORAGE_KEYS } from "../constants/storage-keys";
import {
  surfacesLight,
  surfacesDark,
  cssTransition,
  whiteAlpha,
  defaultShadows,
  iosLabels,
  qeEmerald,
  qeFont,
  qeGray,
  getQuietEmerald,
} from "../design-system";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

// Alias for compatibility
export const useThemeMode = useTheme;

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Detect system color scheme preference
 * Returns 'dark' or 'light' based on OS/browser settings
 */
const getSystemPreference = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Check localStorage first for user preference
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === "light" || saved === "dark") {
      return saved;
    }

    // Fall back to system preference (iOS HIG: respect user's system settings)
    return getSystemPreference();
  });

  // Listen for system theme changes (iOS HIG: dynamic theme switching)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only follow system preference if user hasn't set a manual preference
      const hasManualPreference = localStorage.getItem(STORAGE_KEYS.THEME);
      if (!hasManualPreference) {
        setMode(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, mode);

    // Set data-theme attribute for CSS cascade
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);

    // Update CSS variables from design system tokens (single source of truth)
    if (mode === "dark") {
      root.style.setProperty("--surface-primary", brandColors.darkBg);
      root.style.setProperty("--surface-primary-rgb", "0, 0, 0");
      root.style.setProperty("--surface-secondary", brandColors.darkSurface);
      root.style.setProperty("--surface-secondary-rgb", "28, 28, 30");
      root.style.setProperty("--surface-tertiary", brandColors.darkElevated);
      root.style.setProperty("--surface-tertiary-rgb", "10, 14, 19");
      root.style.setProperty("--text-primary", iosLabels.primary.dark);
      root.style.setProperty("--text-secondary", iosLabels.secondary.dark);
      root.style.setProperty("--text-tertiary", iosLabels.tertiary.dark);
      root.style.setProperty("--text-quaternary", iosLabels.quaternary.dark);
      root.style.setProperty("--border-default", whiteAlpha(0.1));
    } else {
      root.style.setProperty(
        "--surface-primary",
        surfacesLight.background.secondary,
      );
      root.style.setProperty("--surface-primary-rgb", "250, 250, 250");
      root.style.setProperty(
        "--surface-secondary",
        surfacesLight.background.primary,
      );
      root.style.setProperty("--surface-secondary-rgb", "255, 255, 255");
      root.style.setProperty(
        "--surface-tertiary",
        surfacesLight.background.tertiary,
      );
      root.style.setProperty("--surface-tertiary-rgb", "242, 242, 247");
      root.style.setProperty("--text-primary", iosLabels.primary.light);
      root.style.setProperty("--text-secondary", iosLabels.secondary.light);
      root.style.setProperty("--text-tertiary", iosLabels.tertiary.light);
      root.style.setProperty("--text-quaternary", iosLabels.quaternary.light);
      root.style.setProperty("--border-default", surfacesLight.border.light);
    }
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  const theme = useMemo(() => {
    const qe = getQuietEmerald(mode);
    const isDark = mode === "dark";
    return createTheme({
      palette: {
        mode,
        // Quiet Emerald: emerald is the ONLY saturated color in the system.
        // Mode-aware three-step emerald (handoff themes()):
        //   main = --accent (links / active), dark = --accent-strong (button fill),
        //   light = --accent-pure (dots / trust), contrastText = --on-accent.
        primary: {
          main: qe.accent,
          light: qe.accentPure,
          dark: qe.accentStrong,
          contrastText: qe.onAccent,
        },
        secondary: {
          // No gold. "Secondary" reads as neutral ink so nothing competes with emerald.
          main: isDark ? qeGray[300] : qeGray[700],
          light: isDark ? qeGray[200] : qeGray[500],
        },
        background: {
          default: qe.base,
          paper: qe.surface,
        },
        text: {
          primary: qe.text,
          secondary: qe.textMuted,
          disabled: qe.textFaint,
        },
        divider: qe.border,
      },
      typography: {
        // Hanken Grotesk for everything functional; Cormorant for editorial titles.
        fontFamily: qeFont.ui,
        h1: {
          fontFamily: qeFont.serif,
          fontWeight: 500,
          letterSpacing: "-0.01em",
        },
        h2: {
          fontFamily: qeFont.serif,
          fontWeight: 500,
          letterSpacing: "-0.01em",
        },
        h3: {
          fontFamily: qeFont.serif,
          fontWeight: 500,
          letterSpacing: "-0.005em",
        },
        h4: { fontFamily: qeFont.serif, fontWeight: 500 },
        button: {
          textTransform: "none",
          fontWeight: 500,
          fontFamily: qeFont.ui,
        },
        overline: {
          fontFamily: qeFont.mono,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        },
      },
      shape: {
        borderRadius: 12,
      },
      spacing: iosSpacing.xs,
      components: {
        MuiButtonBase: {
          styleOverrides: {
            root: {
              "&:focus-visible": {
                outline: `2px solid ${qeEmerald.primary}`,
                outlineOffset: "2px",
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: "none",
              borderRadius: 10,
              fontWeight: 500,
              fontFamily: qeFont.ui,
              boxShadow: "none",
            },
            containedPrimary: {
              // --accent-strong fill + --on-accent text (WCAG-AA in both modes).
              backgroundColor: qe.accentStrong,
              color: qe.onAccent,
              boxShadow: "none",
              "&:hover": {
                backgroundColor: isDark ? qeEmerald.light : qeEmerald.dark,
                boxShadow: "none",
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 14,
              backgroundColor: qe.surface,
              backgroundImage: "none",
              boxShadow: isDark
                ? "0 1px 2px rgba(0,0,0,0.4)"
                : "0 1px 2px rgba(0,0,0,0.04)",
              border: `1px solid ${qe.border}`,
              transition: cssTransition.default,
              "&:hover": {
                boxShadow: isDark
                  ? "0 10px 30px rgba(0,0,0,0.5)"
                  : "0 10px 30px rgba(0,0,0,0.08)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.16)",
              },
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              borderRadius: iosBorderRadius.xs,
              backgroundColor:
                mode === "dark"
                  ? surfacesLight.border.light
                  : surfacesDark.text.primary,
              color:
                mode === "dark"
                  ? surfacesDark.text.primary
                  : surfacesLight.background.primary,
              boxShadow: defaultShadows.md,
            },
          },
        },
        MuiSwitch: {
          styleOverrides: {
            track: {
              borderRadius: 31 / 2,
              opacity: 1,
              backgroundColor:
                mode === "dark"
                  ? iosLabels.quaternary.dark
                  : surfacesLight.text.disabled,
            },
          },
        },
      },
    });
  }, [mode]);

  const contextValue = useMemo(
    () => ({ mode, toggleTheme, setTheme }),
    [mode, toggleTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
