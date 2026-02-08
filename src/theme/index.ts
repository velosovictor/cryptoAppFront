// ========================================================================
// THEME CONFIGURATION
// ========================================================================
// MUI theme with professional colors and styling.
// Customize this for your application's unique aesthetics.
//
// Features:
// - Beautiful warm beige background
// - Professional blue primary color palette
// - Consistent typography with system fonts
// - Polished component styling
// ========================================================================

import { createTheme, ThemeOptions } from '@mui/material/styles';

// ========================================================================
// COLOR PALETTE
// ========================================================================

export const palette = {
  primary: {
    main: '#0f172a',
    50: '#f1f5f9',
    100: '#e2e8f0',
    500: '#1e40af',
    600: '#1e3a8a',
    700: '#172554',
    900: '#0f172a',
  },
  secondary: {
    main: '#6b7280',
  },
  success: {
    main: '#10b981',
  },
  warning: {
    main: '#f59e0b',
  },
  error: {
    main: '#ef4444',
  },
  background: {
    default: '#f8fafc',
    paper: '#ffffff',
  },
};

// ========================================================================
// TYPOGRAPHY
// ========================================================================

export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", "Helvetica Neue", sans-serif',
  h1: {
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  h2: {
    fontWeight: 700,
    letterSpacing: '-0.4px',
  },
  h3: {
    fontWeight: 600,
    letterSpacing: '-0.3px',
  },
  h4: {
    fontWeight: 700,
    letterSpacing: '-0.2px',
  },
  h5: {
    fontWeight: 600,
    letterSpacing: '-0.1px',
  },
  h6: {
    fontWeight: 600,
    letterSpacing: '-0.08px',
  },
};

// ========================================================================
// COMPONENT OVERRIDES
// ========================================================================

export const components: ThemeOptions['components'] = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: '8px',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid #f3f4f6',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 600,
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      select: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", "Helvetica Neue", sans-serif',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiInputBase-input': {
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", "Helvetica Neue", sans-serif',
        },
      },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      root: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", "Helvetica Neue", sans-serif',
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", "Helvetica Neue", sans-serif',
      },
    },
  },
};

// ========================================================================
// NAVBAR GRADIENT CONFIGURATION
// ========================================================================

export const navbarGradient = {
  start: '#0f172a',
  end: '#1e293b',
};

// ========================================================================
// THEME FACTORY FUNCTION
// ========================================================================

export interface AppThemeOptions {
  paletteOverrides?: Partial<typeof palette>;
  typographyOverrides?: Partial<typeof typography>;
  componentsOverrides?: ThemeOptions['components'];
  borderRadius?: number;
}

export function createAppTheme(options: AppThemeOptions = {}) {
  const {
    paletteOverrides = {},
    typographyOverrides = {},
    componentsOverrides = {},
    borderRadius = 12,
  } = options;

  return createTheme({
    palette: {
      ...palette,
      ...paletteOverrides,
    },
    typography: {
      ...typography,
      ...typographyOverrides,
    },
    shape: {
      borderRadius,
    },
    components: {
      ...components,
      ...componentsOverrides,
    },
  });
}

// ========================================================================
// DEFAULT THEME EXPORT
// ========================================================================

export const theme = createAppTheme();

export default theme;
