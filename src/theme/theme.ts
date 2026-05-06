'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: '#88C9A1',
      light: '#B5E2C5',
      dark: '#5DA77A',
      contrastText: '#1F2D24',
    },
    secondary: {
      main: '#FFF1A8',
      light: '#FFF8C7',
      dark: '#E6D070',
      contrastText: '#3A3416',
    },
    background: {
      default: '#FAFBE9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2E3A2E',
      secondary: '#4F5D4F',
    },
    divider: '#E0E8DC',
    success: {
      main: '#5DA77A',
      light: '#88C9A1',
      dark: '#3F7A57',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#E6D070',
      light: '#FFF1A8',
      dark: '#A88E2E',
      contrastText: '#3A3416',
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
