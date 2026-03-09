/**
 * Theme Context - Dark/Light Mode Support
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { brandColors, iosSpacing, iosBorderRadius } from '../theme';
import { STORAGE_KEYS } from '../constants/storage-keys';
import {
  surfacesLight, surfacesDark, fontFamilies, cssTransition,
  whiteAlpha, defaultShadows, cardShadows,
  iosLabels,
} from '../design-system';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
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
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Check localStorage first for user preference
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }

    // Fall back to system preference (iOS HIG: respect user's system settings)
    return getSystemPreference();
  });

  // Listen for system theme changes (iOS HIG: dynamic theme switching)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only follow system preference if user hasn't set a manual preference
      const hasManualPreference = localStorage.getItem(STORAGE_KEYS.THEME);
      if (!hasManualPreference) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, mode);

    // Set data-theme attribute for CSS cascade
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);

    // Update CSS variables from design system tokens (single source of truth)
    if (mode === 'dark') {
      root.style.setProperty('--surface-primary', brandColors.darkBg);
      root.style.setProperty('--surface-primary-rgb', '0, 0, 0');
      root.style.setProperty('--surface-secondary', brandColors.darkSurface);
      root.style.setProperty('--surface-secondary-rgb', '28, 28, 30');
      root.style.setProperty('--surface-tertiary', brandColors.darkElevated);
      root.style.setProperty('--surface-tertiary-rgb', '10, 14, 19');
      root.style.setProperty('--text-primary', iosLabels.primary.dark);
      root.style.setProperty('--text-secondary', iosLabels.secondary.dark);
      root.style.setProperty('--text-tertiary', iosLabels.tertiary.dark);
      root.style.setProperty('--text-quaternary', iosLabels.quaternary.dark);
      root.style.setProperty('--border-default', whiteAlpha(0.1));
    } else {
      root.style.setProperty('--surface-primary', surfacesLight.background.secondary);
      root.style.setProperty('--surface-primary-rgb', '250, 250, 250');
      root.style.setProperty('--surface-secondary', surfacesLight.background.primary);
      root.style.setProperty('--surface-secondary-rgb', '255, 255, 255');
      root.style.setProperty('--surface-tertiary', surfacesLight.background.tertiary);
      root.style.setProperty('--surface-tertiary-rgb', '242, 242, 247');
      root.style.setProperty('--text-primary', iosLabels.primary.light);
      root.style.setProperty('--text-secondary', iosLabels.secondary.light);
      root.style.setProperty('--text-tertiary', iosLabels.tertiary.light);
      root.style.setProperty('--text-quaternary', iosLabels.quaternary.light);
      root.style.setProperty('--border-default', surfacesLight.border.light);
    }
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: brandColors.emeraldGreen,
        light: brandColors.emeraldLight,
        dark: brandColors.emeraldDark,
      },
      secondary: {
        main: brandColors.gold,
        light: brandColors.goldLight,
      },
      background: {
        default: mode === 'dark' ? brandColors.darkBg : surfacesLight.background.secondary,
        paper: mode === 'dark' ? brandColors.darkSurface : surfacesLight.background.primary,
      },
      text: {
        primary: mode === 'dark' ? iosLabels.primary.dark : iosLabels.primary.light,
        secondary: mode === 'dark' ? iosLabels.secondary.dark : iosLabels.secondary.light,
        disabled: mode === 'dark' ? iosLabels.tertiary.dark : iosLabels.tertiary.light,
      },
      divider: mode === 'dark' ? whiteAlpha(0.1) : surfacesLight.border.light,
    },
    typography: {
      fontFamily: fontFamilies.system,
    },
    shape: {
      borderRadius: iosBorderRadius.sm,
    },
    spacing: iosSpacing.xs,
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: iosBorderRadius.md,
            backgroundColor: mode === 'dark' ? brandColors.darkSurface : surfacesLight.background.primary,
            backgroundImage: 'none',
            boxShadow: mode === 'dark' ? cardShadows.resting : defaultShadows.sm,
            border: `1px solid ${mode === 'dark' ? whiteAlpha(0.1) : surfacesLight.border.light}`,
            transition: cssTransition.default,
            '&:hover': {
              boxShadow: mode === 'dark' ? cardShadows.hover : defaultShadows.md,
              borderColor: mode === 'dark' ? whiteAlpha(0.15) : surfacesLight.border.default,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: iosBorderRadius.xs,
            backgroundColor: mode === 'dark' ? surfacesLight.border.light : surfacesDark.text.primary,
            color: mode === 'dark' ? surfacesDark.text.primary : surfacesLight.background.primary,
            boxShadow: defaultShadows.md,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          track: {
            borderRadius: 31 / 2,
            opacity: 1,
            backgroundColor: mode === 'dark' ? iosLabels.quaternary.dark : surfacesLight.text.disabled,
          },
        },
      },
    },
  }), [mode]);

  const contextValue = useMemo(() => ({ mode, toggleTheme, setTheme }), [mode, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
