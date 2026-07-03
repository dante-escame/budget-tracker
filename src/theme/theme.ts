'use client';

import { createTheme } from '@mui/material/styles';

import { colors } from '@/theme/colors';

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: colors.primaryContrastText,
    },
    secondary: {
      main: colors.secondary,
      light: colors.secondaryLight,
      dark: colors.secondaryDark,
      contrastText: colors.secondaryContrastText,
    },
    background: {
      default: colors.backgroundDefault,
      paper: colors.white,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.divider,
    success: {
      main: colors.primaryDark,
      light: colors.primary,
      dark: colors.successDark,
      contrastText: colors.white,
    },
    warning: {
      main: colors.secondaryDark,
      light: colors.secondary,
      dark: colors.warningDark,
      contrastText: colors.secondaryContrastText,
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'var(--font-inter), "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 600, lineHeight: 1.2 },
    h2: { fontWeight: 600, lineHeight: 1.2 },
    h3: { fontWeight: 600, lineHeight: 1.25 },
    h4: { fontWeight: 600, lineHeight: 1.3 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(46, 58, 46, 0.06), 0 4px 12px rgba(46, 58, 46, 0.04)',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
  },
});

export default theme;
