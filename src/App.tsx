import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import { ClientAuthProvider, useClientAuth, authApi, generateOAuthNonce } from './services/datablokApi';
import { ProtectedRoute } from '@rationalbloks/frontblok-auth';

// Theme (from @rationalbloks/frontblok-components)
import { createAppTheme } from '@rationalbloks/frontblok-components';

// Branding configuration
import { BRANDING } from './config/branding';

// General components (from @rationalbloks/frontblok-components)
import {
  AuthView as BaseAuthView,
  ForgotPasswordView as BaseForgotPasswordView,
  ResetPasswordView as BaseResetPasswordView,
  VerifyEmailView as BaseVerifyEmailView,
  SettingsView as BaseSettingsView,
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

// Pre-configured settings view
const SettingsView = () => (
  <BaseSettingsView authApi={authApi} useAuth={useClientAuth} />
);

// Template-specific views
import HomeView from './components/views/HomeView';
import DashboardView from './components/views/DashboardView';
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
            <ProtectedRoute useAuth={useClientAuth}>
              <DashboardView />
            </ProtectedRoute>
          } />
          <Route path="/assets" element={
            <ProtectedRoute useAuth={useClientAuth}>
              <AssetsView />
            </ProtectedRoute>
          } />
          <Route path="/trades" element={
            <ProtectedRoute useAuth={useClientAuth}>
              <TradesView />
            </ProtectedRoute>
          } />
          <Route path="/targets" element={
            <ProtectedRoute useAuth={useClientAuth}>
              <TargetsView />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute useAuth={useClientAuth}>
              <SettingsView />
            </ProtectedRoute>
          } />
          <Route path="/support" element={
            <ProtectedRoute useAuth={useClientAuth}>
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

function App() {
  return (
    <ErrorBoundary supportEmail="support@example.com">
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
    </ErrorBoundary>
  );
}

export default App;
