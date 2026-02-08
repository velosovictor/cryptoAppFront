// ============================================================================
// BRANDING CONFIGURATION
// ============================================================================
// Minimal configuration for app branding.
// Used by general components to display app-specific content.
//
// Single source of truth for branding, used everywhere.
// 
// CUSTOMIZE THIS FILE for your application.
// ============================================================================

export const BRANDING = {
  // App name displayed in auth pages, navbar, etc.
  appName: 'CryptoPortfolio',
  
  // Short tagline for auth page
  tagline: 'Smart Crypto Portfolio Management',
  
  // Logo letter (for the icon box)
  logoLetter: 'C',
  
  // Primary gradient for buttons and logo
  primaryGradient: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
  primaryGradientHover: 'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)',
  
  // Shadow color for logo
  logoShadow: '0 4px 20px rgba(15, 23, 42, 0.4)',
  
  // Post-login redirect
  dashboardRoute: '/dashboard',
  
  // Success messages
  messages: {
    loginSuccess: 'Login successful! Welcome back to your portfolio.',
    registerSuccess: 'Account created! Start building your portfolio.',
    googleNewUser: 'Welcome! Your account has been created successfully.',
  },
  
  // Security badge text
  securityBadge: 'Secure Portfolio Access',
} as const;

export type Branding = typeof BRANDING;
