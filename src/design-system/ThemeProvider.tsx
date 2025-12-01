import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { tokens } from './tokens';
import type { Tokens } from './tokens';
import './tokens/css-variables.css';

/**
 * Theme Mode
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Theme Context Value
 */
interface ThemeContextValue {
  /** Current theme mode */
  mode: ThemeMode;

  /** Toggle between light and dark mode */
  toggleTheme: () => void;

  /** Set specific theme mode */
  setTheme: (mode: ThemeMode) => void;

  /** Design tokens */
  tokens: Tokens;

  /** Whether system preference is being used */
  isSystemPreference: boolean;

  /** Use system color scheme preference */
  useSystemPreference: () => void;
}

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Theme Provider Props
 */
interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme mode (defaults to system preference) */
  defaultMode?: ThemeMode;
  /** Storage key for persisting theme preference */
  storageKey?: string;
}

/**
 * Local Storage Key
 */
const DEFAULT_STORAGE_KEY = 'tierra-madre-theme';

/**
 * Get System Theme Preference
 */
function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return mediaQuery.matches ? 'dark' : 'light';
}

/**
 * Get Stored Theme
 */
function getStoredTheme(storageKey: string): ThemeMode | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }

  return null;
}

/**
 * Store Theme
 */
function storeTheme(storageKey: string, mode: ThemeMode): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(storageKey, mode);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
}

/**
 * Clear Stored Theme
 */
function clearStoredTheme(storageKey: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to clear theme from localStorage:', error);
  }
}

/**
 * Apply Theme to Document
 */
function applyTheme(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;

  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.style.colorScheme = mode;
}

/**
 * Theme Provider Component
 *
 * Provides theme context to all child components.
 * Automatically detects system theme preference and syncs with localStorage.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode,
  storageKey = DEFAULT_STORAGE_KEY,
}) => {
  // Check if using system preference (no manual override)
  const [isSystemPreference, setIsSystemPreference] = useState(true);

  // Initialize theme mode
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Priority: stored theme > defaultMode > system theme
    const stored = getStoredTheme(storageKey);
    if (stored) {
      setIsSystemPreference(false);
      return stored;
    }

    if (defaultMode) {
      setIsSystemPreference(false);
      return defaultMode;
    }

    return getSystemTheme();
  });

  // Apply theme on mount and when mode changes
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Listen for system theme changes (only if using system preference)
  useEffect(() => {
    if (!isSystemPreference) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newMode = e.matches ? 'dark' : 'light';
      setMode(newMode);
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [isSystemPreference]);

  /**
   * Toggle Theme
   */
  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    storeTheme(storageKey, newMode);
    setIsSystemPreference(false);
  };

  /**
   * Set Specific Theme
   */
  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    storeTheme(storageKey, newMode);
    setIsSystemPreference(false);
  };

  /**
   * Use System Preference
   */
  const useSystemPreference = () => {
    clearStoredTheme(storageKey);
    setIsSystemPreference(true);
    setMode(getSystemTheme());
  };

  const value: ThemeContextValue = {
    mode,
    toggleTheme,
    setTheme,
    tokens,
    isSystemPreference,
    useSystemPreference,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Use Theme Hook
 *
 * Access theme context in any component.
 *
 * @example
 * const { mode, toggleTheme, tokens } = useTheme();
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * With Theme HOC
 *
 * Inject theme props into a component.
 *
 * @example
 * export default withTheme(MyComponent);
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P & { theme: ThemeContextValue }>
): React.FC<P> {
  return (props: P) => {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
}
