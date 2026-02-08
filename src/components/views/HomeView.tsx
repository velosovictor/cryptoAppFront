// ========================================================================
// HOME VIEW
// ========================================================================
// Landing page for the application.
// ========================================================================

import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Stack,
  Grid,
} from '@mui/material';
import {
  Login as LoginIcon,
  Dashboard as DashboardIcon,
  CurrencyBitcoin as CryptoIcon,
  PieChart as PieChartIcon,
  TrendingUp as TrendingIcon,
  SwapHoriz as RebalanceIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import { useClientAuth } from '../../services/datablokApi';

export default function HomeView() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useClientAuth();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box textAlign="center" mb={6}>
        <CryptoIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h2" component="h1" fontWeight={700} gutterBottom>
          CryptoPortfolio
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Smart portfolio management with target allocations and automatic rebalancing recommendations.
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {isAuthenticated ? (
          <Stack spacing={3} alignItems="center">
            <Typography variant="h5">
              Welcome back, {user?.first_name || 'Investor'}!
            </Typography>
            <Typography color="text.secondary">
              Your portfolio is waiting. Check live prices and rebalancing signals.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<DashboardIcon />}
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </Stack>
        ) : (
          <Stack spacing={3} alignItems="center">
            <Typography variant="h5">
              Get Started
            </Typography>
            <Typography color="text.secondary">
              Sign in to manage your crypto portfolio and track your investments.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/auth')}
            >
              Sign In / Register
            </Button>
          </Stack>
        )}
      </Paper>

      {/* Feature highlights */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h4" textAlign="center" fontWeight={600} mb={4}>
          Features
        </Typography>
        <Grid container spacing={3}>
          {[
            { title: 'Live Prices', desc: 'Real-time crypto prices from CoinGecko', icon: <TrendingIcon sx={{ fontSize: 32, color: '#10b981' }} /> },
            { title: 'Target Allocation', desc: 'Set your ideal portfolio distribution', icon: <PieChartIcon sx={{ fontSize: 32, color: '#8b5cf6' }} /> },
            { title: 'Smart Rebalancing', desc: 'Get buy/sell recommendations to stay on target', icon: <RebalanceIcon sx={{ fontSize: 32, color: '#f59e0b' }} /> },
            { title: 'Trade Tracking', desc: 'Record and review all your trading operations', icon: <WalletIcon sx={{ fontSize: 32, color: '#3b82f6' }} /> },
          ].map((feature) => (
            <Grid size={{ xs: 12, sm: 6 }} key={feature.title}>
              <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                {feature.icon}
                <Typography variant="h6" fontWeight={600} sx={{ mt: 1 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}
