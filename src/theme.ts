import { createTheme } from '@mui/material/styles';

// Tierra Madre brand colors
export const brandColors = {
  emeraldGreen: '#2E7D32',
  emeraldDark: '#1B5E20',
  emeraldLight: '#4CAF50',
  gold: '#D4AF37',
  goldLight: '#F5D76E',
  darkBg: '#121212',
  darkSurface: '#1E1E1E',
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
