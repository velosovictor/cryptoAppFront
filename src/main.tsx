// ========================================================================
// APP ENTRY POINT
// ========================================================================
// Uses createAppRoot from @rationalbloks/frontblok-auth
// Styling is local to this application
// ========================================================================

import { createAppRoot } from '@rationalbloks/frontblok-auth';
import './styles/globals.css';
import App from './App';

// Bootstrap the app with auth configuration
createAppRoot(App, {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
});
