import { createTheme } from '@mui/material/styles';

// Tierra Madre brand colors - Based on logo green #00AE7A
export const brandColors = {
  // Primary emerald palette (from logo)
  emeraldGreen: '#00AE7A',      // Logo green - primary
  emeraldDark: '#008A61',       // Darker for hover/pressed states
  emeraldLight: '#00C98C',      // Lighter variant
  emeraldDeep: '#006B4D',       // Deep for contrast

  // Accent colors
  gold: '#D4AF37',
  goldLight: '#F5D76E',

  // Dark theme surfaces
  darkBg: '#121212',
  darkSurface: '#1E1E1E',
  darkElevated: '#252525',

  // Light colors
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
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
      default: brandColors.darkBg,
      paper: brandColors.darkSurface,
    },
  },
  typography: {
    fontFamily: '"Libre Baskerville", Georgia, serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 400,
    },
    h6: {
      fontWeight: 400,
    },
    body1: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    body2: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    button: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});
