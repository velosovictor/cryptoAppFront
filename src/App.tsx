import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ClientAuthProvider, useClientAuth, authApi, generateOAuthNonce } from './services/datablokApi';

// Theme (local, not from external packages)
import { createAppTheme } from './theme';

// Branding configuration
import { BRANDING } from './config/branding';

// General components (from @rationalbloks/frontblok-components)
import {
  AuthView as BaseAuthView,
  ForgotPasswordView as BaseForgotPasswordView,
  ResetPasswordView as BaseResetPasswordView,
  VerifyEmailView as BaseVerifyEmailView,
  SupportView,
  ErrorBoundary,
} from '@rationalbloks/frontblok-components';

// Pre-configured auth views
const AuthView = () => (
  <BaseAuthView
    branding={BRANDING}
    authApi={authApi}
    useAuth={useClientAuth}
    generateOAuthNonce={generateOAuthNonce}
  />
);

const ForgotPasswordView = () => (
  <BaseForgotPasswordView authApi={authApi} authRoute="/auth" />
);

const ResetPasswordView = () => (
  <BaseResetPasswordView authApi={authApi} authRoute="/auth" />
);

const VerifyEmailView = () => (
  <BaseVerifyEmailView authApi={authApi} successRoute="/dashboard" errorRoute="/settings" />
);

// Template-specific views
import HomeView from './components/views/HomeView';
import DashboardView from './components/views/DashboardView';
import SettingsView from './components/views/SettingsView';
import TradesView from './components/views/TradesView';
import AssetsView from './components/views/AssetsView';
import TargetsView from './components/views/TargetsView';

// Application-specific components
import Navbar from './config/Navbar';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Create theme using the universal beautiful defaults from core
// The core theme already includes the warm beige background, professional typography, etc.
// Pass overrides here if you need app-specific customization
const theme = createAppTheme();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useClientAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// App Router Component
const AppRouter = () => {
  const { isAuthenticated } = useClientAuth();

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden' 
    }}>
      <Navbar />
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          width: '100%',
          maxWidth: '100%',
          overflow: 'auto',
          backgroundColor: 'background.default'
        }}
      >
        <Toolbar /> {/* Spacer for fixed navbar */}
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomeView />} />
          <Route path="/auth" element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthView />
          } />
          
          {/* Authentication Flow Routes (Public) */}
          <Route path="/forgot-password" element={<ForgotPasswordView />} />
          <Route path="/reset-password" element={<ResetPasswordView />} />
          <Route path="/verify-email" element={<VerifyEmailView />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardView />
            </ProtectedRoute>
          } />
          <Route path="/assets" element={
            <ProtectedRoute>
              <AssetsView />
            </ProtectedRoute>
          } />
          <Route path="/trades" element={
            <ProtectedRoute>
              <TradesView />
            </ProtectedRoute>
          } />
          <Route path="/targets" element={
            <ProtectedRoute>
              <TargetsView />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsView />
            </ProtectedRoute>
          } />
          <Route path="/support" element={
            <ProtectedRoute>
              <SupportView />
            </ProtectedRoute>
          } />
          
          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <ErrorBoundary supportEmail="support@example.com">
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
              <ClientAuthProvider>
                <AppRouter />
              </ClientAuthProvider>
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
