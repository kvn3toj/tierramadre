/**
 * Theme Context - Dark/Light Mode Support
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { brandColors, iosSpacing, iosBorderRadius } from '../theme';
import { STORAGE_KEYS } from '../constants/storage-keys';

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

    // Update CSS variables with RGB values for liquid glass
    if (mode === 'dark') {
      root.style.setProperty('--surface-primary', brandColors.darkBg);
      root.style.setProperty('--surface-primary-rgb', '0, 0, 0');
      root.style.setProperty('--surface-secondary', brandColors.darkSurface);
      root.style.setProperty('--surface-secondary-rgb', '28, 28, 30');
      root.style.setProperty('--surface-tertiary', brandColors.darkElevated);
      root.style.setProperty('--surface-tertiary-rgb', '10, 14, 19');
      root.style.setProperty('--text-primary', '#FFFFFF');
      root.style.setProperty('--text-secondary', '#A1A1A6');
      root.style.setProperty('--text-tertiary', '#6E6E73');
      root.style.setProperty('--text-quaternary', '#48484A');
      root.style.setProperty('--border-default', 'rgba(255, 255, 255, 0.1)');
    } else {
      root.style.setProperty('--surface-primary', '#FAFAFA');
      root.style.setProperty('--surface-primary-rgb', '250, 250, 250');
      root.style.setProperty('--surface-secondary', '#FFFFFF');
      root.style.setProperty('--surface-secondary-rgb', '255, 255, 255');
      root.style.setProperty('--surface-tertiary', '#F2F2F7');
      root.style.setProperty('--surface-tertiary-rgb', '242, 242, 247');
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#6B7280');
      root.style.setProperty('--text-tertiary', '#9CA3AF');
      root.style.setProperty('--text-quaternary', '#D1D5DB');
      root.style.setProperty('--border-default', '#E5E7EB');
    }
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const theme = createTheme({
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
        default: mode === 'dark' ? brandColors.darkBg : '#FAFAFA',
        paper: mode === 'dark' ? brandColors.darkSurface : '#FFFFFF',
      },
      text: {
        primary: mode === 'dark' ? '#FFFFFF' : '#111827',
        secondary: mode === 'dark' ? '#A1A1A6' : '#6B7280',
        disabled: mode === 'dark' ? '#6E6E73' : '#9CA3AF',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif',
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
            backgroundColor: mode === 'dark' ? brandColors.darkSurface : '#FFFFFF',
            backgroundImage: 'none',
            boxShadow: mode === 'dark'
              ? '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)'
              : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
            border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: mode === 'dark'
                ? '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)'
                : '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
              borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : '#D1D5DB',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: iosBorderRadius.xs,
            backgroundColor: mode === 'dark' ? '#E5E7EB' : '#1F2937',
            color: mode === 'dark' ? '#1F2937' : '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          track: {
            borderRadius: 31 / 2,
            opacity: 1,
            backgroundColor: mode === 'dark' ? '#48484A' : '#D1D5DB',
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
