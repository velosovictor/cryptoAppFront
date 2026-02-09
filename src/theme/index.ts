// ========================================================================
// THEME CONFIGURATION
// ========================================================================
// Re-exports the universal theme factory from @rationalbloks/frontblok-components.
// Local overrides (navbarGradient, custom palette) stay here.
//
// The core theme (palette, typography, component overrides) now lives in
// the package and can be updated via npm update.
// ========================================================================

// Re-export the package theme factory and defaults
export { 
  createAppTheme, 
  defaultPalette as palette,
  defaultTypography as typography,
  defaultComponents as components,
  defaultNavbarGradient as navbarGradient,
} from '@rationalbloks/frontblok-components';
export type { AppThemeOptions } from '@rationalbloks/frontblok-components';

// ========================================================================
// DEFAULT THEME EXPORT
// ========================================================================

import { createAppTheme } from '@rationalbloks/frontblok-components';

export const theme = createAppTheme();
export default theme;
