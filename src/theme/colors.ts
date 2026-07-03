// Raw palette hex values, framework-free. The MUI theme (theme.ts) builds its
// palette from these, and provider-less surfaces (src/app/global-error.tsx,
// which replaces the whole document and cannot read the ThemeProvider) import
// them directly — one source of truth for the brand colors.
export const colors = {
  primary: '#88C9A1',
  primaryLight: '#B5E2C5',
  primaryDark: '#5DA77A',
  primaryContrastText: '#1F2D24',
  secondary: '#FFF1A8',
  secondaryLight: '#FFF8C7',
  secondaryDark: '#E6D070',
  secondaryContrastText: '#3A3416',
  backgroundDefault: '#FAFBE9',
  textPrimary: '#2E3A2E',
  textSecondary: '#4F5D4F',
  divider: '#E0E8DC',
  successDark: '#3F7A57',
  warningDark: '#A88E2E',
  white: '#FFFFFF',
} as const;
