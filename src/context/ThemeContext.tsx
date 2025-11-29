import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, alpha } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { brandColors, iosSpacing, iosBorderRadius, iosAnimations } from '../theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeContextProvider');
  }
  return context;
};

// Create theme based on mode
const createAppTheme = (mode: ThemeMode) => {
  const isLight = mode === 'light';

  return createTheme({
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
        default: isLight ? '#FAFAFA' : '#000000',
        paper: isLight ? '#FFFFFF' : '#1C1C1E',
      },
      text: {
        primary: isLight ? '#111827' : '#FFFFFF',
        secondary: isLight ? '#6B7280' : alpha('#FFFFFF', 0.7),
        disabled: isLight ? '#9CA3AF' : alpha('#FFFFFF', 0.4),
      },
      divider: isLight ? '#E5E7EB' : alpha('#FFFFFF', 0.12),
      action: {
        active: brandColors.emeraldGreen,
        hover: alpha(brandColors.emeraldGreen, 0.08),
        selected: alpha(brandColors.emeraldGreen, 0.12),
        disabled: alpha(isLight ? '#000000' : '#FFFFFF', 0.26),
        disabledBackground: alpha(isLight ? '#000000' : '#FFFFFF', 0.12),
      },
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif',
      h1: {
        fontSize: '2.125rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
        fontFamily: '"Libre Baskerville", Georgia, serif',
      },
      h2: {
        fontSize: '1.75rem',
        fontWeight: 700,
        lineHeight: 1.25,
        letterSpacing: '-0.02em',
        fontFamily: '"Libre Baskerville", Georgia, serif',
      },
      h3: {
        fontSize: '1.375rem',
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
        fontFamily: '"Libre Baskerville", Georgia, serif',
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.35,
        letterSpacing: '-0.01em',
      },
      h5: {
        fontSize: '1.0625rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontSize: '0.9375rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
      },
      body1: {
        fontSize: '1.0625rem',
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '-0.01em',
      },
      body2: {
        fontSize: '0.9375rem',
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
      },
      button: {
        fontSize: '1.0625rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
        textTransform: 'none' as const,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.35,
        letterSpacing: '0',
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 400,
        lineHeight: 1.3,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
      },
    },
    shape: {
      borderRadius: iosBorderRadius.sm,
    },
    spacing: iosSpacing.xs,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            scrollBehavior: 'smooth',
            WebkitTapHighlightColor: 'transparent',
          },
          body: {
            overscrollBehavior: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: iosBorderRadius.sm,
            minHeight: iosSpacing.xxxl,
            padding: `${iosSpacing.sm}px ${iosSpacing.md}px`,
            transition: iosAnimations.transition,
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: iosBorderRadius.md,
            backgroundColor: isLight ? '#FFFFFF' : '#1C1C1E',
            backgroundImage: 'none',
            boxShadow: isLight
              ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)'
              : '0 1px 3px rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #E5E7EB' : 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: isLight
                ? '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)'
                : '0 8px 24px rgba(0,0,0,0.4)',
              borderColor: isLight ? '#D1D5DB' : 'transparent',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: iosBorderRadius.md,
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: iosBorderRadius.sm,
              transition: iosAnimations.transition,
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderWidth: 2,
                },
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: iosBorderRadius.full,
            height: 32,
            transition: iosAnimations.transition,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            padding: iosSpacing.sm,
            transition: iosAnimations.transition,
            '&:active': {
              transform: 'scale(0.9)',
            },
          },
          sizeMedium: {
            width: iosSpacing.xxxl,
            height: iosSpacing.xxxl,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: iosBorderRadius.xs,
            backgroundColor: '#1F2937',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '0.8125rem',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: iosBorderRadius.md,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: iosSpacing.xxxl,
            transition: iosAnimations.transition,
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: iosSpacing.xxxl,
            transition: iosAnimations.transition,
            '&:active': {
              transform: 'scale(0.99)',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
          },
          paperAnchorBottom: {
            borderTopLeftRadius: iosBorderRadius.xl,
            borderTopRightRadius: iosBorderRadius.xl,
          },
        },
      },
    },
  });
};

interface ThemeContextProviderProps {
  children: ReactNode;
}

export const ThemeContextProvider = ({ children }: ThemeContextProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('tierra-madre-theme');
    return (saved as ThemeMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('tierra-madre-theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  const theme = createAppTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
